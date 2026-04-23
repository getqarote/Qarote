import { router } from "@/trpc/trpc";

import { coreRouter } from "./core";
import { dataRouter } from "./data.ce";
import { invitationRouter } from "./invitation";
import { managementRouter } from "./management";

/**
 * CE workspace router — no EE imports.
 * The EE workspace router (src/ee/trpc/routers/workspace/index.ts) extends
 * this with the real data-export router and is used by the EE assembly.
 */
export const workspaceRouter = router({
  core: coreRouter,
  management: managementRouter,
  invitation: invitationRouter,
  data: dataRouter,
});
