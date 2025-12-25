import { router } from "@/trpc/trpc";

import { coreRouter } from "./core";
import { dataRouter } from "./data";
import { invitationRouter } from "./invitation";
import { managementRouter } from "./management";
import { planRouter } from "./plan";

/**
 * Workspace router
 * Combines all workspace-related routers
 */
export const workspaceRouter = router({
  core: coreRouter,
  management: managementRouter,
  plan: planRouter,
  invitation: invitationRouter,
  data: dataRouter,
});
