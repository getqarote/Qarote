import {
  APIErrorCode,
  Client,
  ClientErrorCode,
  isNotionClientError,
  LogLevel,
} from "@notionhq/client";
import type { User } from "@prisma/client";

import { logger } from "@/core/logger";
import { retryWithBackoff } from "@/core/retry";

import { Sentry, setSentryContext } from "@/services/sentry";

import { isProduction, notionConfig, serverConfig } from "@/config";

import type {
  CreateNotionUserParams,
  DataSourceIdResult,
  NotionPageProperties,
  NotionPageResult,
  NotionServiceResult,
} from "./notion.interfaces";
import {
  NotionDatabaseResponseSchema,
  NotionPageResponseSchema,
} from "./notion.interfaces";

class NotionService {
  private client: Client;
  private cachedDataSourceId: string | null = null;

  constructor() {
    this.client = new Client({
      auth: notionConfig.apiKey,
      logLevel: isProduction() ? LogLevel.DEBUG : LogLevel.INFO,
      notionVersion: "2025-09-03",
    });
  }

  /**
   * Check if Notion sync is enabled for the current environment
   * Only syncs in production and when explicitly enabled via env var
   */
  private isSyncEnabled(): boolean {
    return notionConfig.syncEnabled && isProduction();
  }

  /**
   * Get data source ID from database ID
   * According to Notion API 2025-09-03 migration guide:
   * - A database can have multiple data sources
   * - For single-source databases (most common), there will be one data source
   * - We cache the data source ID to avoid repeated API calls
   */
  private async getDataSourceId(): Promise<DataSourceIdResult> {
    // Return cached value if available
    if (this.cachedDataSourceId) {
      return {
        success: true,
        dataSourceId: this.cachedDataSourceId,
      };
    }

    try {
      setSentryContext("notion_operation", {
        operation: "get_data_source_id",
        databaseId: notionConfig.databaseId,
      });

      // Get database to retrieve data sources
      const rawResponse = await retryWithBackoff(
        () =>
          this.client.request({
            method: "get",
            path: `databases/${notionConfig.databaseId}`,
          }),
        {
          maxRetries: 3,
          retryDelayMs: 1_000,
          timeoutMs: 10_000,
        },
        "notion"
      );

      // Validate response with Zod schema
      let response;
      try {
        response = NotionDatabaseResponseSchema.parse(rawResponse);
      } catch (validationError) {
        logger.error(
          { error: validationError, rawResponse },
          "Failed to validate Notion database response"
        );
        return {
          success: false,
          error: "Invalid response format from Notion API",
        };
      }

      const dataSources = response.data_sources;

      if (!dataSources || dataSources.length === 0) {
        return {
          success: false,
          error: "No data sources found for the database",
        };
      }

      // For single-source databases, use the first (and only) data source
      // For multi-source databases, use the first one (you may want to allow selection)
      const dataSourceId = dataSources[0].id;
      this.cachedDataSourceId = dataSourceId;

      logger.info(
        {
          databaseId: notionConfig.databaseId,
          dataSourceId,
          dataSourceCount: dataSources.length,
        },
        "Retrieved data source ID from database"
      );

      return {
        success: true,
        dataSourceId,
      };
    } catch (error: unknown) {
      return this.handleNotionError(error, "get_data_source_id", {
        databaseId: notionConfig.databaseId,
      });
    }
  }

  /**
   * Handle Notion API errors with proper type checking
   */
  private handleNotionError(
    error: unknown,
    operation: string,
    context: Record<string, unknown> = {}
  ): NotionServiceResult & { success: false } {
    this.logNotionError(error, operation, context);

    if (isNotionClientError(error)) {
      const errorCode = error.code;
      const errorMessage = error.message || "Unknown error";

      switch (errorCode) {
        case ClientErrorCode.RequestTimeout:
          return {
            success: false,
            error: "Request to Notion API timed out. Please try again.",
          };
        case APIErrorCode.ObjectNotFound:
          return {
            success: false,
            error:
              "Notion database not found. Please check NOTION_DATABASE_ID.",
          };
        case APIErrorCode.Unauthorized:
          return {
            success: false,
            error: "Notion API key is invalid or unauthorized.",
          };
        case APIErrorCode.RestrictedResource:
          return {
            success: false,
            error:
              "Notion database access is restricted. Please share the database with your integration.",
          };
        case APIErrorCode.InvalidRequest:
        case APIErrorCode.ValidationError:
        case ClientErrorCode.ResponseError:
          return {
            success: false,
            error: `Notion API error: ${errorMessage}`,
          };
        case APIErrorCode.InvalidRequestURL:
          return {
            success: false,
            error: "Invalid Notion API request URL.",
          };
        case APIErrorCode.InvalidJSON:
          return {
            success: false,
            error: "Invalid JSON in Notion API request.",
          };
        case APIErrorCode.ConflictError:
          return {
            success: false,
            error:
              "Conflict error in Notion API. The resource may have been modified.",
          };
        case APIErrorCode.RateLimited:
          return {
            success: false,
            error: "Notion API rate limit exceeded. Please try again later.",
          };
        case APIErrorCode.InternalServerError:
          return {
            success: false,
            error: "Notion API internal server error. Please try again later.",
          };
        case APIErrorCode.ServiceUnavailable:
          return {
            success: false,
            error:
              "Notion API service is temporarily unavailable. Please try again later.",
          };
        default:
          // Handle any other Notion error codes
          return {
            success: false,
            error: `Notion API error (${errorCode}): ${errorMessage}`,
          };
      }
    }

    // Handle non-Notion errors
    if (error instanceof Error) {
      return {
        success: false,
        error: error.message || "Failed to complete Notion operation",
      };
    }

    return {
      success: false,
      error: "Unknown error occurred while communicating with Notion API",
    };
  }

  /**
   * Create a user page in Notion database
   * Updated for Notion API 2025-09-03: uses data_source_id instead of database_id
   */
  async createUser(params: CreateNotionUserParams): Promise<NotionPageResult> {
    // Skip sync if disabled (e.g., in staging)
    if (!this.isSyncEnabled()) {
      logger.debug(
        {
          environment: serverConfig.nodeEnv,
          syncEnabled: notionConfig.syncEnabled,
        },
        "Notion sync disabled for this environment"
      );
      return {
        success: true,
        // Return early without creating in Notion
      };
    }

    try {
      setSentryContext("notion_operation", {
        operation: "create_user",
        userId: params.userId,
        email: params.email,
      });

      // Get data source ID first (required for API 2025-09-03)
      const dataSourceResult = await this.getDataSourceId();
      if (!dataSourceResult.success || !dataSourceResult.dataSourceId) {
        return {
          success: false,
          error:
            dataSourceResult.error ||
            "Failed to retrieve data source ID from database",
        };
      }

      const rawResponse = await retryWithBackoff(
        () =>
          this.client.request({
            method: "post",
            path: "pages",
            body: {
              parent: {
                type: "data_source_id",
                data_source_id: dataSourceResult.dataSourceId,
              },
              properties: {
                // Assuming the database has these properties:
                // - Name (title): Full name
                // - Email (email): User email
                // - First Name (rich_text): First name
                // - Last Name (rich_text): Last name
                // - User ID (rich_text): Internal user ID
                // - Email Verified (checkbox): Verification status
                // - Role (select): User role
                // - Created At (date): Registration date
                // - Workspace ID (rich_text): Optional workspace ID
                Name: {
                  title: [
                    {
                      text: {
                        content: `${params.firstName} ${params.lastName}`,
                      },
                    },
                  ],
                },
                Email: {
                  email: params.email,
                },
                "First Name": {
                  rich_text: [
                    {
                      text: {
                        content: params.firstName,
                      },
                    },
                  ],
                },
                "Last Name": {
                  rich_text: [
                    {
                      text: {
                        content: params.lastName,
                      },
                    },
                  ],
                },
                "User ID": {
                  rich_text: [
                    {
                      text: {
                        content: params.userId,
                      },
                    },
                  ],
                },
                "Email Verified": {
                  checkbox: params.emailVerified,
                },
                Role: {
                  select: {
                    name: params.role || "USER",
                  },
                },
                "Created At": {
                  date: {
                    start: params.createdAt.toISOString(),
                  },
                },
                ...(params.workspaceId && {
                  "Workspace ID": {
                    rich_text: [
                      {
                        text: {
                          content: params.workspaceId,
                        },
                      },
                    ],
                  },
                }),
              },
            },
          }),
        {
          maxRetries: 3,
          retryDelayMs: 1_000,
          timeoutMs: 10_000,
        },
        "notion"
      );

      // Validate response with Zod schema
      let response;
      try {
        response = NotionPageResponseSchema.parse(rawResponse);
      } catch (validationError) {
        logger.error(
          { error: validationError, rawResponse },
          "Failed to validate Notion page creation response"
        );
        return {
          success: false,
          error: "Invalid response format from Notion API",
        };
      }

      logger.info(
        {
          userId: params.userId,
          notionPageId: response.id,
          dataSourceId: dataSourceResult.dataSourceId,
        },
        "User created in Notion successfully"
      );

      return {
        success: true,
        notionPageId: response.id,
      };
    } catch (error: unknown) {
      return this.handleNotionError(error, "create_user", {
        userId: params.userId,
        email: params.email,
      });
    }
  }

  /**
   * Update a user page in Notion database
   */
  async updateUser(
    notionPageId: string,
    updates: Partial<CreateNotionUserParams>
  ): Promise<NotionServiceResult> {
    // Skip sync if disabled (e.g., in staging)
    if (!this.isSyncEnabled()) {
      logger.debug(
        {
          environment: serverConfig.nodeEnv,
          syncEnabled: notionConfig.syncEnabled,
        },
        "Notion sync disabled, skipping update"
      );
      return {
        success: true,
      };
    }

    try {
      setSentryContext("notion_operation", {
        operation: "update_user",
        notionPageId,
      });

      const properties: NotionPageProperties = {};

      if (updates.firstName !== undefined || updates.lastName !== undefined) {
        const firstName = updates.firstName || "";
        const lastName = updates.lastName || "";
        properties.Name = {
          title: [
            {
              text: {
                content: `${firstName} ${lastName}`,
              },
            },
          ],
        };
      }

      if (updates.firstName !== undefined) {
        properties["First Name"] = {
          rich_text: [
            {
              text: {
                content: updates.firstName,
              },
            },
          ],
        };
      }

      if (updates.lastName !== undefined) {
        properties["Last Name"] = {
          rich_text: [
            {
              text: {
                content: updates.lastName,
              },
            },
          ],
        };
      }

      if (updates.emailVerified !== undefined) {
        properties["Email Verified"] = {
          checkbox: updates.emailVerified,
        };
      }

      if (updates.role !== undefined) {
        properties.Role = {
          select: {
            name: updates.role,
          },
        };
      }

      if (updates.workspaceId !== undefined) {
        properties["Workspace ID"] = {
          rich_text: [
            {
              text: {
                content: updates.workspaceId || "",
              },
            },
          ],
        };
      }

      await retryWithBackoff(
        () =>
          this.client.pages.update({
            page_id: notionPageId,
            properties,
          }),
        {
          maxRetries: 3,
          retryDelayMs: 1_000,
          timeoutMs: 10_000,
        },
        "notion"
      );

      logger.info(
        {
          notionPageId,
        },
        "User updated in Notion successfully"
      );

      return {
        success: true,
      };
    } catch (error: unknown) {
      return this.handleNotionError(error, "update_user", {
        notionPageId,
      });
    }
  }

  /**
   * Find a user page in Notion by User ID
   * Updated for Notion API 2025-09-03: uses data_source_id instead of database_id
   */
  async findUserByUserId(userId: string): Promise<NotionPageResult> {
    try {
      setSentryContext("notion_operation", {
        operation: "find_user",
        userId,
      });

      // Get data source ID first (required for API 2025-09-03)
      const dataSourceResult = await this.getDataSourceId();
      if (!dataSourceResult.success || !dataSourceResult.dataSourceId) {
        return {
          success: false,
          error:
            dataSourceResult.error ||
            "Failed to retrieve data source ID from database",
        };
      }

      // Extract to local variable for TypeScript narrowing in callback
      const dataSourceId = dataSourceResult.dataSourceId;

      const response = await retryWithBackoff(
        () =>
          this.client.dataSources.query({
            data_source_id: dataSourceId,
            filter: {
              property: "User ID",
              rich_text: {
                equals: userId,
              },
            },
          }),
        {
          maxRetries: 3,
          retryDelayMs: 1_000,
          timeoutMs: 10_000,
        },
        "notion"
      );

      if (response.results.length === 0) {
        return {
          success: false,
          error: "User not found in Notion",
        };
      }

      const page = response.results[0];
      return {
        success: true,
        notionPageId: page.id,
      };
    } catch (error: unknown) {
      const errorResult = this.handleNotionError(error, "find_user", {
        userId,
      });

      // If it's ObjectNotFound, return a more specific message for user lookup
      if (
        isNotionClientError(error) &&
        error.code === APIErrorCode.ObjectNotFound
      ) {
        return {
          success: false,
          error: "User not found in Notion",
        };
      }

      return errorResult;
    }
  }

  /**
   * Create or update a user in Notion
   */
  async syncUser(user: User): Promise<NotionPageResult> {
    // Skip sync if disabled (e.g., in staging)
    if (!this.isSyncEnabled()) {
      logger.debug(
        {
          environment: serverConfig.nodeEnv,
          syncEnabled: notionConfig.syncEnabled,
          userId: user.id,
        },
        "Notion sync disabled, skipping sync"
      );
      return {
        success: true,
      };
    }

    try {
      // First, try to find existing user
      const findResult = await this.findUserByUserId(user.id);

      const userParams: CreateNotionUserParams = {
        userId: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        role: user.role,
        workspaceId: user.workspaceId,
      };

      if (findResult.success && findResult.notionPageId) {
        // Update existing user
        const updateResult = await this.updateUser(
          findResult.notionPageId,
          userParams
        );
        return {
          success: updateResult.success,
          notionPageId: findResult.notionPageId,
          error: updateResult.error,
        };
      } else {
        // Create new user
        return await this.createUser(userParams);
      }
    } catch (error: unknown) {
      return this.handleNotionError(error, "sync_user", {
        userId: user.id,
      });
    }
  }

  /**
   * Log and capture Notion errors in Sentry
   */
  private logNotionError(
    error: unknown,
    operation: string,
    context: Record<string, unknown> = {}
  ): void {
    logger.error(
      { error, ...context },
      `Notion operation failed: ${operation}`
    );

    Sentry.withScope((scope) => {
      scope.setTag("component", "notion");
      scope.setTag("operation", operation);
      scope.setContext("notion_operation", {
        operation,
        ...context,
      });
      Sentry.captureException(error);
    });
  }
}

export const notionService = new NotionService();
