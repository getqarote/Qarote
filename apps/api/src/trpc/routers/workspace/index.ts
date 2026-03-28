import { router } from "@/trpc/trpc";

import { coreRouter } from "./core";
import { dataRouter } from "./data";
import { invitationRouter } from "./invitation";
import { managementRouter } from "./management";

/**
 * Workspace router
 * Combines all workspace-related routers
 */
export const workspaceRouter = router({
  core: coreRouter,
  management: managementRouter,
  invitation: invitationRouter,
  data: dataRouter,
});
