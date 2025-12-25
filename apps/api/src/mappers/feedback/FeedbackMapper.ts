/**
 * Mapper for transforming Prisma Feedback to API response format
 * Converts Date objects to ISO strings for JSON serialization
 */

type PrismaFeedbackWithDates = {
  id: string;
  type: string;
  category: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  email: string | null;
  metadata: unknown;
  userId: string | null;
  workspaceId: string | null;
  response: string | null;
  respondedById: string | null;
  respondedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  user?: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
  workspace?: {
    id: string;
    name: string;
  } | null;
  respondedBy?: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
};

export type FeedbackApiResponse = {
  id: string;
  type: string;
  category: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  email: string | null;
  metadata: unknown;
  userId: string | null;
  workspaceId: string | null;
  response: string | null;
  respondedById: string | null;
  respondedAt: string | null;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
  workspace?: {
    id: string;
    name: string;
  } | null;
  respondedBy?: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
};

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
