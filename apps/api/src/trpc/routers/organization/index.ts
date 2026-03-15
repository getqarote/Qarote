import { router } from "@/trpc/trpc";

import { managementRouter } from "./management";
import { membersRouter } from "./members";

/**
 * Organization router
 * Combines all organization-related routers
 */
export const organizationRouter = router({
  management: managementRouter,
  members: membersRouter,
});
