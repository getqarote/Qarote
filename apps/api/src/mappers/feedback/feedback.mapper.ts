/**
 * Mapper for transforming Prisma Feedback to API response format
 * Converts Date objects to ISO strings for JSON serialization
 */

import type {
  FeedbackApiResponse,
  PrismaFeedbackWithDates,
} from "./feedback.interfaces";

/**
 * Mapper for transforming Prisma Feedback to API response format
 */
export class FeedbackMapper {
  /**
   * Map a single Prisma Feedback to FeedbackApiResponse
   * Converts Date objects to ISO strings for JSON serialization
   */
  static toApiResponse(feedback: PrismaFeedbackWithDates): FeedbackApiResponse {
    return {
      id: feedback.id,
      type: feedback.type,
      category: feedback.category,
      title: feedback.title,
      description: feedback.description,
      priority: feedback.priority,
      status: feedback.status,
      email: feedback.email,
      metadata: feedback.metadata,
      userId: feedback.userId,
      workspaceId: feedback.workspaceId,
      response: feedback.response,
      respondedById: feedback.respondedById,
      respondedAt: feedback.respondedAt?.toISOString() ?? null,
      createdAt: feedback.createdAt.toISOString(),
      updatedAt: feedback.updatedAt.toISOString(),
      user: feedback.user ?? null,
      workspace: feedback.workspace ?? null,
      respondedBy: feedback.respondedBy ?? null,
    };
  }

  /**
   * Map an array of Prisma Feedback to FeedbackApiResponse[]
   */
  static toApiResponseArray(
    feedbacks: PrismaFeedbackWithDates[]
  ): FeedbackApiResponse[] {
    return feedbacks.map(this.toApiResponse);
  }
}
