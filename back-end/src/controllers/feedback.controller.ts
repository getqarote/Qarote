import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import prisma from "../core/prisma";
import { authenticate, authorize, SafeUser } from "../core/auth";
import { UserRole } from "@prisma/client";

const feedbackController = new Hono();

// Validation schemas
const submitFeedbackSchema = z.object({
  type: z.enum(["BUG", "FEATURE", "GENERAL", "IMPROVEMENT"]),
  category: z.enum([
    "UI_UX",
    "PERFORMANCE",
    "SECURITY",
    "FUNCTIONALITY",
    "DOCUMENTATION",
    "OTHER",
  ]),
  title: z.string().min(5).max(100),
  description: z.string().min(10).max(1000),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
  email: z.string().email().optional(),
  metadata: z
    .object({
      url: z.string(),
      userAgent: z.string(),
      viewport: z.string(),
      timestamp: z.string(),
    })
    .optional(),
});

const updateFeedbackSchema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]).optional(),
  response: z.string().max(2000).optional(),
});

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
      console.error("Error submitting feedback:", error);
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
      console.error("Error fetching feedback:", error);
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
      console.error("Error fetching feedback:", error);
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
      console.error("Error updating feedback:", error);
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
        byType: byType.reduce((acc, item) => {
          acc[item.type] = item._count.type;
          return acc;
        }, {} as Record<string, number>),
        byStatus: byStatus.reduce((acc, item) => {
          acc[item.status] = item._count.status;
          return acc;
        }, {} as Record<string, number>),
        byPriority: byPriority.reduce((acc, item) => {
          acc[item.priority] = item._count.priority;
          return acc;
        }, {} as Record<string, number>),
      };

      return c.json({ stats });
    } catch (error) {
      console.error("Error fetching feedback stats:", error);
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
      console.error("Error deleting feedback:", error);
      return c.json({ error: "Failed to delete feedback" }, 500);
    }
  }
);

export default feedbackController;
