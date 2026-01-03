import { UserRole } from "@prisma/client";
import { TRPCError } from "@trpc/server";

import {
  FeedbackIdSchema,
  GetAllFeedbackQuerySchema,
  GetFeedbackStatsQuerySchema,
  submitFeedbackSchema,
  UpdateFeedbackWithIdSchema,
} from "@/schemas/feedback";

import { FeedbackMapper } from "@/mappers/feedback";

import { authorize, rateLimitedProcedure, router } from "@/trpc/trpc";

/**
 * Feedback router
 * Handles feedback submission and management
 */
export const feedbackRouter = router({
  /**
   * Submit feedback (authenticated users)
   */
  submit: rateLimitedProcedure
    .input(submitFeedbackSchema)
    .mutation(async ({ input, ctx }) => {
      const user = ctx.user;
      const data = input;

      try {
        const feedback = await ctx.prisma.feedback.create({
          data: {
            type: data.type,
            category: data.category,
            title: data.title,
            description: data.description,
            priority: data.priority,
            email: data.email || user.email,
            metadata: data.metadata,
            userId: user.id,
            workspaceId: user.workspaceId,
          },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
            workspace: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });

        return {
          message: "Feedback submitted successfully",
          feedback: FeedbackMapper.toApiResponse(feedback),
        };
      } catch (error) {
        ctx.logger.error({ error }, "Error submitting feedback");
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to submit feedback",
        });
      }
    }),

  /**
   * Get all feedback (admin only)
   */
  getAll: authorize([UserRole.ADMIN])
    .input(GetAllFeedbackQuerySchema)
    .query(async ({ input, ctx }) => {
      const { page, limit, status, type, priority, workspaceId } = input;

      try {
        const skip = (page - 1) * limit;

        // Build filter conditions
        const where: Record<string, unknown> = {};
        if (status) where.status = status;
        if (type) where.type = type;
        if (priority) where.priority = priority;
        if (workspaceId) where.workspaceId = workspaceId;

        const [feedback, total] = await Promise.all([
          ctx.prisma.feedback.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  firstName: true,
                  lastName: true,
                },
              },
              workspace: {
                select: {
                  id: true,
                  name: true,
                },
              },
              respondedBy: {
                select: {
                  id: true,
                  email: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          }),
          ctx.prisma.feedback.count({ where }),
        ]);

        return {
          feedback: FeedbackMapper.toApiResponseArray(feedback),
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
        };
      } catch (error) {
        ctx.logger.error({ error }, "Error fetching feedback");
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch feedback",
        });
      }
    }),

  /**
   * Get feedback by ID (admin only)
   */
  getById: authorize([UserRole.ADMIN])
    .input(FeedbackIdSchema)
    .query(async ({ input, ctx }) => {
      const { id } = input;

      try {
        const feedback = await ctx.prisma.feedback.findUnique({
          where: { id },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
            workspace: {
              select: {
                id: true,
                name: true,
              },
            },
            respondedBy: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        });

        if (!feedback) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Feedback not found",
          });
        }

        return { feedback: FeedbackMapper.toApiResponse(feedback) };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        ctx.logger.error({ error }, "Error fetching feedback");
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch feedback",
        });
      }
    }),

  /**
   * Update feedback (admin only)
   */
  update: authorize([UserRole.ADMIN])
    .input(UpdateFeedbackWithIdSchema)
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;

      try {
        const updateData: Record<string, unknown> = {};

        if (data.status !== undefined) {
          updateData.status = data.status;
        }

        if (data.response !== undefined) {
          updateData.response = data.response;
          updateData.respondedById = ctx.user.id;
          updateData.respondedAt = new Date();
        }

        const feedback = await ctx.prisma.feedback.update({
          where: { id },
          data: updateData,
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
            workspace: {
              select: {
                id: true,
                name: true,
              },
            },
            respondedBy: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        });

        return { feedback: FeedbackMapper.toApiResponse(feedback) };
      } catch (error) {
        ctx.logger.error({ error }, "Error updating feedback");
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update feedback",
        });
      }
    }),

  /**
   * Delete feedback (admin only)
   */
  delete: authorize([UserRole.ADMIN])
    .input(FeedbackIdSchema)
    .mutation(async ({ input, ctx }) => {
      const { id } = input;

      try {
        await ctx.prisma.feedback.delete({
          where: { id },
        });

        return { message: "Feedback deleted successfully" };
      } catch (error) {
        ctx.logger.error({ error }, "Error deleting feedback");
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete feedback",
        });
      }
    }),

  /**
   * Get feedback statistics
   */
  getStats: authorize([UserRole.ADMIN])
    .input(GetFeedbackStatsQuerySchema)
    .query(async ({ input, ctx }) => {
      const { workspaceId } = input;

      try {
        const where = workspaceId ? { workspaceId } : {};

        const [total, open, inProgress, resolved, closed] = await Promise.all([
          ctx.prisma.feedback.count({ where }),
          ctx.prisma.feedback.count({ where: { ...where, status: "OPEN" } }),
          ctx.prisma.feedback.count({
            where: { ...where, status: "IN_PROGRESS" },
          }),
          ctx.prisma.feedback.count({
            where: { ...where, status: "RESOLVED" },
          }),
          ctx.prisma.feedback.count({ where: { ...where, status: "CLOSED" } }),
        ]);

        return {
          total,
          open,
          inProgress,
          resolved,
          closed,
        };
      } catch (error) {
        ctx.logger.error({ error }, "Error getting feedback stats");
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get feedback stats",
        });
      }
    }),
});
