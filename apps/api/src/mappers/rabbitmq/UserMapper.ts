import type { UserResponse } from "@/types/api";
import type { RabbitMQUser } from "@/types/rabbitmq";

/**
 * Mapper for transforming RabbitMQUser to UserResponse
 * Only includes fields actually used by the web
 */
export class UserMapper {
  /**
   * Map a single RabbitMQUser to UserResponse
   */
  static toApiResponse(
    user: RabbitMQUser,
    accessibleVhosts?: string[]
  ): UserResponse {
    // Convert tags from string to string[] if needed
    const tags =
      typeof user.tags === "string"
        ? user.tags.split(",").filter((tag) => tag.trim().length > 0)
        : user.tags;

    return {
      name: user.name,
      tags: tags as string[] | undefined,
      password_hash: user.password_hash, // Only for existence check
      limits: user.limits,
      accessibleVhosts,
    };
  }

  /**
   * Map an array of RabbitMQUser to UserResponse[]
   */
  static toApiResponseArray(
    users: RabbitMQUser[],
    accessibleVhostsMap?: Map<string, string[]>
  ): UserResponse[] {
    return users.map((user) => {
      const vhosts = accessibleVhostsMap?.get(user.name);
      return this.toApiResponse(user, vhosts);
    });
  }
}
