/**
 * Mapper for transforming Prisma User to API response format
 * Converts Date objects to ISO strings for JSON serialization
 */

import type { PrismaUserWithDates, UserApiResponse } from "./auth.interfaces";

/**
 * Mapper for transforming Prisma User to API response format
 */
export class UserMapper {
  /**
   * Map a single Prisma User to UserApiResponse
   * Converts Date objects to ISO strings for JSON serialization
   */
  static toApiResponse(user: PrismaUserWithDates): UserApiResponse {
    const response: UserApiResponse = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      workspaceId: user.workspaceId,
      isActive: user.isActive,
      emailVerified: user.emailVerified,
      lastLogin: user.lastLogin?.toISOString() ?? null,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };

    // Include pendingEmail if present
    if ("pendingEmail" in user) {
      response.pendingEmail = user.pendingEmail ?? null;
    }

    // Include subscription if present (can be null)
    if ("subscription" in user) {
      response.subscription =
        (user.subscription as UserApiResponse["subscription"]) ?? null;
    }

    // Include workspace if present (can be null)
    if ("workspace" in user) {
      response.workspace =
        (user.workspace as UserApiResponse["workspace"]) ?? null;
    }

    return response;
  }

  /**
   * Map an array of Prisma User to UserApiResponse[]
   */
  static toApiResponseArray(users: PrismaUserWithDates[]): UserApiResponse[] {
    return users.map(this.toApiResponse);
  }
}
