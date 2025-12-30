/**
 * Feedback API Response Types
 *
 * Types for feedback-related API responses with proper date serialization.
 */

export type PrismaFeedbackWithDates = {
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

