import { alertsRouter } from "./routers/alerts/index";
import { authRouter } from "./routers/auth/index";
import { discordRouter } from "./routers/discord";
import { feedbackRouter } from "./routers/feedback";
import { paymentRouter } from "./routers/payment/index";
import { licenseRouter } from "./routers/portal/license";
import { publicRouter } from "./routers/public/index";
import { rabbitmqRouter } from "./routers/rabbitmq";
import { userRouter } from "./routers/user";
import { workspaceRouter } from "./routers/workspace/index";
import { router } from "./trpc";

/**
 * Root router
 * Combine all routers here
 */
export const appRouter = router({
  auth: authRouter,
  user: userRouter,
  workspace: workspaceRouter,
  alerts: alertsRouter,
  feedback: feedbackRouter,
  license: licenseRouter,
  payment: paymentRouter,
  rabbitmq: rabbitmqRouter,
  discord: discordRouter,
  public: publicRouter,
});

/**
 * Export AppRouter type for frontend type inference
 */
export type AppRouter = typeof appRouter;
