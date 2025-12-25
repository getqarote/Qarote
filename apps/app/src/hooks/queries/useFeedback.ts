import { trpc } from "@/lib/trpc/client";

import { useAuth } from "@/contexts/AuthContextDefinition";

/**
 * Feedback-related hooks
 * Handles feedback submission and management
 */

// Submit feedback
export const useSubmitFeedback = () => {
  const utils = trpc.useUtils();

  return trpc.feedback.submit.useMutation({
    onSuccess: () => {
      // Invalidate feedback list and stats
      utils.feedback.getAll.invalidate();
      utils.feedback.getStats.invalidate();
    },
  });
};

// Get all feedback (admin only)
export const useFeedback = (filters?: {
  page?: number;
  limit?: number;
  status?: string;
  type?: string;
  priority?: string;
  workspaceId?: string;
}) => {
  const { isAuthenticated } = useAuth();

  return trpc.feedback.getAll.useQuery(
    {
      page: filters?.page || 1,
      limit: filters?.limit || 20,
      status: filters?.status,
      type: filters?.type,
      priority: filters?.priority,
      workspaceId: filters?.workspaceId,
    },
    {
      enabled: isAuthenticated,
      staleTime: 30000, // 30 seconds
    }
  );
};

// Get feedback by ID
export const useFeedbackById = (id: string | null) => {
  const { isAuthenticated } = useAuth();

  return trpc.feedback.getById.useQuery(
    { id: id || "" },
    {
      enabled: !!id && isAuthenticated,
      staleTime: 30000, // 30 seconds
    }
  );
};

// Update feedback
export const useUpdateFeedback = () => {
  const utils = trpc.useUtils();

  return trpc.feedback.update.useMutation({
    onSuccess: () => {
      // Invalidate feedback list, specific feedback, and stats
      utils.feedback.getAll.invalidate();
      utils.feedback.getById.invalidate();
      utils.feedback.getStats.invalidate();
    },
  });
};

// Delete feedback
export const useDeleteFeedback = () => {
  const utils = trpc.useUtils();

  return trpc.feedback.delete.useMutation({
    onSuccess: () => {
      // Invalidate feedback list and stats
      utils.feedback.getAll.invalidate();
      utils.feedback.getStats.invalidate();
    },
  });
};

// Get feedback statistics
export const useFeedbackStats = (workspaceId?: string) => {
  const { isAuthenticated } = useAuth();

  return trpc.feedback.getStats.useQuery(
    { workspaceId },
    {
      enabled: isAuthenticated,
      staleTime: 30000, // 30 seconds
    }
  );
};
