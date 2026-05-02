import { authRouter } from "./routers/auth/index";
import { discordRouter } from "./routers/discord";
import { featureGateRouter } from "./routers/feature-gate";
import { feedbackRouter } from "./routers/feedback";
import { organizationRouter } from "./routers/organization/index";
import { paymentRouter } from "./routers/payment/index";
import { licenseRouter } from "./routers/portal/license";
import { publicRouter } from "./routers/public/index";
import { rabbitmqRouter } from "./routers/rabbitmq";
import { selfhostedLicenseRouter } from "./routers/selfhosted-license";
import { selfhostedSmtpRouter } from "./routers/selfhosted-smtp";
import { ssoRouter } from "./routers/sso";
import { userRouter } from "./routers/user";
import { workspaceRouter } from "./routers/workspace/index";
import { router } from "./trpc";

/**
 * CE root router — Community Edition routes only.
 * EE routes (alerts, topology, data export) are composed in
 * src/ee/trpc/router.ts which the server bootstrap imports instead.
 */
export const appRouter = router({
  auth: authRouter,
  user: userRouter,
  workspace: workspaceRouter,
  organization: organizationRouter,
  feedback: feedbackRouter,
  featureGate: featureGateRouter,
  license: licenseRouter,
  payment: paymentRouter,
  rabbitmq: rabbitmqRouter,
  discord: discordRouter,
  selfhostedLicense: selfhostedLicenseRouter,
  selfhostedSmtp: selfhostedSmtpRouter,
  sso: ssoRouter,
  public: publicRouter,
});

/**
 * Export AppRouter type. In production the server uses the EE router
 * (src/ee/trpc/router.ts) which extends this type with EE routes.
 */
export type AppRouter = typeof appRouter;
