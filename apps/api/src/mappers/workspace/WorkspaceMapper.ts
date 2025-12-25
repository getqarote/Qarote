/**
 * Mapper for transforming Prisma Workspace to API response format
 * Converts Date objects to ISO strings for JSON serialization
 */

type PrismaWorkspaceWithDates = {
  id: string;
  name: string;
  contactEmail: string | null;
  logoUrl: string | null;
  ownerId: string | null;
  tags: unknown;
  emailNotificationsEnabled: boolean;
  notificationSeverities: unknown;
  browserNotificationsEnabled: boolean;
  browserNotificationSeverities: unknown;
  notificationServerIds: unknown;
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    members: number;
    servers: number;
  };
  // Allow additional properties that may be present in Prisma select results
  [key: string]: unknown;
};

export type WorkspaceApiResponse = {
  id: string;
  name: string;
  contactEmail: string | null;
  logoUrl: string | null;
  ownerId: string | null;
  tags: unknown;
  emailNotificationsEnabled: boolean;
  notificationSeverities: unknown;
  browserNotificationsEnabled: boolean;
  browserNotificationSeverities: unknown;
  notificationServerIds: unknown;
  createdAt: string;
  updatedAt: string;
  _count?: {
    members: number;
    servers: number;
  };
  // Allow additional properties that may be added by controllers
  [key: string]: unknown;
};

/**
 * Mapper for transforming Prisma Workspace to API response format
 */
export class WorkspaceMapper {
  /**
   * Map a single Prisma Workspace to WorkspaceApiResponse
   * Converts Date objects to ISO strings for JSON serialization
   */
  static toApiResponse(
    workspace: PrismaWorkspaceWithDates
  ): WorkspaceApiResponse {
    const response: WorkspaceApiResponse = {
      id: workspace.id,
      name: workspace.name,
      contactEmail: workspace.contactEmail,
      logoUrl: workspace.logoUrl,
      ownerId: workspace.ownerId,
      tags: workspace.tags,
      emailNotificationsEnabled: workspace.emailNotificationsEnabled,
      notificationSeverities: workspace.notificationSeverities,
      browserNotificationsEnabled: workspace.browserNotificationsEnabled,
      browserNotificationSeverities: workspace.browserNotificationSeverities,
      notificationServerIds: workspace.notificationServerIds,
      createdAt: workspace.createdAt.toISOString(),
      updatedAt: workspace.updatedAt.toISOString(),
    };

    // Include _count if present
    if (workspace._count) {
      response._count = workspace._count;
    }

    // Include any additional properties (e.g., isOwner, userRole added by controllers)
    Object.keys(workspace).forEach((key) => {
      if (
        ![
          "id",
          "name",
          "contactEmail",
          "logoUrl",
          "ownerId",
          "tags",
          "emailNotificationsEnabled",
          "notificationSeverities",
          "browserNotificationsEnabled",
          "browserNotificationSeverities",
          "notificationServerIds",
          "createdAt",
          "updatedAt",
          "_count",
        ].includes(key)
      ) {
        response[key] = workspace[key];
      }
    });

    return response;
  }

  /**
   * Map an array of Prisma Workspace to WorkspaceApiResponse[]
   */
  static toApiResponseArray(
    workspaces: PrismaWorkspaceWithDates[]
  ): WorkspaceApiResponse[] {
    return workspaces.map(this.toApiResponse);
  }
}
