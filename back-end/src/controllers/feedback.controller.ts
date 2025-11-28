import { zValidator } from "@hono/zod-validator";
import { UserRole } from "@prisma/client";
import { Hono } from "hono";

import { authenticate, authorize, SafeUser } from "@/core/auth";
import { logger } from "@/core/logger";
import { prisma } from "@/core/prisma";

import { submitFeedbackSchema, updateFeedbackSchema } from "@/schemas/feedback";

const feedbackController = new Hono();

// Submit feedback (authenticated users)
feedbackController.post(
  "/",
  authenticate,
  zValidator("json", submitFeedbackSchema),
  async (c) => {
    try {
      const user = c.get("user") as SafeUser;
      const data = c.req.valid("json");

      const feedback = await prisma.feedback.create({
        data: {
          type: data.type,
          category: data.category,
          title: data.title,
          description: data.description,
          priority: data.priority,
          email: data.email || user?.email,
          metadata: data.metadata,
          userId: user?.id,
          workspaceId: user?.workspaceId,
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

      return c.json({
        message: "Feedback submitted successfully",
        feedback,
      });
    } catch (error) {
      logger.error({ error }, "Error submitting feedback");
      return c.json({ error: "Failed to submit feedback" }, 500);
    }
  }
);

// Get all feedback (admin only)
feedbackController.get(
  "/",
  authenticate,
  authorize([UserRole.ADMIN]),
  async (c) => {
    try {
      const url = new URL(c.req.url);
      const page = parseInt(url.searchParams.get("page") || "1");
      const limit = parseInt(url.searchParams.get("limit") || "20");
      const status = url.searchParams.get("status");
      const type = url.searchParams.get("type");
      const priority = url.searchParams.get("priority");
      const workspaceId = url.searchParams.get("workspaceId");

      const skip = (page - 1) * limit;

      // Build filter conditions
      const where: Record<string, unknown> = {};
      if (status) where.status = status;
      if (type) where.type = type;
      if (priority) where.priority = priority;
      if (workspaceId) where.workspaceId = workspaceId;

      const [feedback, total] = await Promise.all([
        prisma.feedback.findMany({
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
        prisma.feedback.count({ where }),
      ]);

      return c.json({
        feedback,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      logger.error({ error }, "Error fetching feedback");
      return c.json({ error: "Failed to fetch feedback" }, 500);
    }
  }
);

// Get feedback by ID (admin only)
feedbackController.get(
  "/:id",
  authenticate,
  authorize([UserRole.ADMIN]),
  async (c) => {
    try {
      const id = c.req.param("id");

      const feedback = await prisma.feedback.findUnique({
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
        return c.json({ error: "Feedback not found" }, 404);
      }

      return c.json({ feedback });
    } catch (error) {
      logger.error({ error }, "Error fetching feedback");
      return c.json({ error: "Failed to fetch feedback" }, 500);
    }
  }
);

// Update feedback (admin only)
feedbackController.put(
  "/:id",
  authenticate,
  authorize([UserRole.ADMIN]),
  zValidator("json", updateFeedbackSchema),
  async (c) => {
    try {
      const id = c.req.param("id");
      const user = c.get("user") as SafeUser;
      const data = c.req.valid("json");

      const existingFeedback = await prisma.feedback.findUnique({
        where: { id },
      });

      if (!existingFeedback) {
        return c.json({ error: "Feedback not found" }, 404);
      }

      const updateData: Record<string, unknown> = {};

      if (data.status) {
        updateData.status = data.status;
      }

      if (data.response) {
        updateData.response = data.response;
        updateData.respondedById = user.id;
        updateData.respondedAt = new Date();
      }

      const feedback = await prisma.feedback.update({
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

      return c.json({
        message: "Feedback updated successfully",
        feedback,
      });
    } catch (error) {
      logger.error({ error }, "Error updating feedback");
      return c.json({ error: "Failed to update feedback" }, 500);
    }
  }
);

// Get feedback stats (admin only)
feedbackController.get(
  "/stats/summary",
  authenticate,
  authorize([UserRole.ADMIN]),
  async (c) => {
    try {
      const url = new URL(c.req.url);
      const workspaceId = url.searchParams.get("workspaceId");

      const where: Record<string, unknown> = {};
      if (workspaceId) where.workspaceId = workspaceId;

      const [total, byType, byStatus, byPriority] = await Promise.all([
        prisma.feedback.count({ where }),
        prisma.feedback.groupBy({
          by: ["type"],
          where,
          _count: { type: true },
        }),
        prisma.feedback.groupBy({
          by: ["status"],
          where,
          _count: { status: true },
        }),
        prisma.feedback.groupBy({
          by: ["priority"],
          where,
          _count: { priority: true },
        }),
      ]);

      // Convert arrays to objects for easier frontend consumption
      const stats = {
        total,
        byType: byType.reduce(
          (acc, item) => {
            acc[item.type] = item._count.type;
            return acc;
          },
          {} as Record<string, number>
        ),
        byStatus: byStatus.reduce(
          (acc, item) => {
            acc[item.status] = item._count.status;
            return acc;
          },
          {} as Record<string, number>
        ),
        byPriority: byPriority.reduce(
          (acc, item) => {
            acc[item.priority] = item._count.priority;
            return acc;
          },
          {} as Record<string, number>
        ),
      };

      return c.json({ stats });
    } catch (error) {
      logger.error({ error }, "Error fetching feedback stats");
      return c.json({ error: "Failed to fetch feedback stats" }, 500);
    }
  }
);

// Delete feedback (admin only)
feedbackController.delete(
  "/:id",
  authenticate,
  authorize([UserRole.ADMIN]),
  async (c) => {
    try {
      const id = c.req.param("id");

      const existingFeedback = await prisma.feedback.findUnique({
        where: { id },
      });

      if (!existingFeedback) {
        return c.json({ error: "Feedback not found" }, 404);
      }

      await prisma.feedback.delete({
        where: { id },
      });

      return c.json({ message: "Feedback deleted successfully" });
    } catch (error) {
      logger.error({ error }, "Error deleting feedback");
      return c.json({ error: "Failed to delete feedback" }, 500);
    }
  }
);

export default feedbackController;
