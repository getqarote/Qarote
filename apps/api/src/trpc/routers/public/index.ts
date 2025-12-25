import { router } from "@/trpc/trpc";

import { publicInvitationRouter } from "./invitation";

/**
 * Public router
 * Handles public endpoints that don't require authentication
 */
export const publicRouter = router({
  invitation: publicInvitationRouter,
});
