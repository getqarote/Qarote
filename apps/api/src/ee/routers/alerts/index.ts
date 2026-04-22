import { router } from "@/trpc/trpc";

import { rulesRouter } from "./rules";
import { slackRouter } from "./slack";
import { webhookRouter } from "./webhook";

/**
 * Alerts router
 * Combines all alert-related routers
 */
export const alertsRouter = router({
  rules: rulesRouter,
  webhook: webhookRouter,
  slack: slackRouter,
});
