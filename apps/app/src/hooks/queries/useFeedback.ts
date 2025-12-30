import { trpc } from "@/lib/trpc/client";

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
