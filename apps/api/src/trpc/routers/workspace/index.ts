import { router } from "@/trpc/trpc";

import { coreRouter } from "./core";
import { invitationRouter } from "./invitation";
import { managementRouter } from "./management";

import { dataRouter } from "@/ee/routers/workspace/data";

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
