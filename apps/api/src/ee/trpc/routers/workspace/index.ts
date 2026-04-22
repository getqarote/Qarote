import { coreRouter } from "@/trpc/routers/workspace/core";
import { invitationRouter } from "@/trpc/routers/workspace/invitation";
import { managementRouter } from "@/trpc/routers/workspace/management";
import { router } from "@/trpc/trpc";

import { dataRouter } from "@/ee/routers/workspace/data";

/**
 * EE workspace router — extends the CE workspace router with the data-export
 * feature. Used by the EE router assembly (src/ee/trpc/router.ts).
 */
export const workspaceRouter = router({
  core: coreRouter,
  management: managementRouter,
  invitation: invitationRouter,
  data: dataRouter,
});
