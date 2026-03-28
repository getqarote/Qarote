import { router } from "@/trpc/trpc";

import { managementRouter } from "./management";
import { membersRouter } from "./members";
import { orgPlanRouter } from "./plan";

/**
 * Organization router
 * Combines all organization-related routers
 */
export const organizationRouter = router({
  management: managementRouter,
  members: membersRouter,
  plan: orgPlanRouter,
});
