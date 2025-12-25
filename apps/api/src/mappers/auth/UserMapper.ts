/**
 * Mapper for transforming Prisma User to API response format
 * Converts Date objects to ISO strings for JSON serialization
 */

type PrismaUserWithDates = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  workspaceId: string | null;
  isActive: boolean;
  emailVerified: boolean;
  lastLogin: Date | null;
  createdAt: Date;
  updatedAt: Date;
  pendingEmail?: string | null;
  // Allow additional properties that may be present in Prisma select results
  [key: string]: unknown;
};

type SubscriptionData = {
  plan: string;
  status: string;
} | null;

type WorkspaceData = {
  id: string;
} | null;

export type UserApiResponse = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  workspaceId: string | null;
  isActive: boolean;
  emailVerified: boolean;
  lastLogin: string | null;
  createdAt: string;
  updatedAt: string;
  pendingEmail?: string | null;
  subscription?: SubscriptionData;
  workspace?: WorkspaceData;
};

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
      response.subscription = (user.subscription as SubscriptionData) ?? null;
    }

    // Include workspace if present (can be null)
    if ("workspace" in user) {
      response.workspace = (user.workspace as WorkspaceData) ?? null;
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
