import { z } from "zod/v4";

/**
 * Notion Integration Types and Schemas
 *
 * This file contains Zod schemas for runtime validation.
 * TypeScript types are inferred from the schemas to avoid duplication.
 */

/**
 * Parameters for creating a user in Notion
 */
export interface CreateNotionUserParams {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  emailVerified: boolean;
  createdAt: Date;
  role?: string;
  workspaceId?: string | null;
}

/**
 * Generic result type for Notion service operations
 */
export interface NotionServiceResult {
  success: boolean;
  error?: string;
}

/**
 * Result type for operations that return a Notion page ID
 */
export interface NotionPageResult extends NotionServiceResult {
  notionPageId?: string;
}

/**
 * Result type for retrieving data source ID
 */
export interface DataSourceIdResult extends NotionServiceResult {
  dataSourceId?: string;
}

/**
 * Zod Schemas for runtime validation
 */

/**
 * Schema for Notion data source
 */
export const NotionDataSourceSchema = z.object({
  id: z.string(),
  name: z.string(),
});

/**
 * Schema for Notion database API response
 */
export const NotionDatabaseResponseSchema = z.object({
  data_sources: z.array(NotionDataSourceSchema),
});

/**
 * Schema for Notion page creation API response
 */
export const NotionPageResponseSchema = z.object({
  id: z.string(),
});

/**
 * TypeScript types inferred from Zod schemas
 */
export type NotionDataSource = z.infer<typeof NotionDataSourceSchema>;
export type NotionDatabaseResponse = z.infer<
  typeof NotionDatabaseResponseSchema
>;
export type NotionPageResponse = z.infer<typeof NotionPageResponseSchema>;
