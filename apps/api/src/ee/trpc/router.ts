import { authRouter } from "@/trpc/routers/auth/index";
import { discordRouter } from "@/trpc/routers/discord";
import { feedbackRouter } from "@/trpc/routers/feedback";
import { organizationRouter } from "@/trpc/routers/organization/index";
import { paymentRouter } from "@/trpc/routers/payment/index";
import { licenseRouter } from "@/trpc/routers/portal/license";
import { publicRouter } from "@/trpc/routers/public/index";
import { rabbitmqRouter } from "@/trpc/routers/rabbitmq";
import { selfhostedLicenseRouter } from "@/trpc/routers/selfhosted-license";
import { selfhostedSmtpRouter } from "@/trpc/routers/selfhosted-smtp";
import { ssoRouter } from "@/trpc/routers/sso";
import { userRouter } from "@/trpc/routers/user";
import { workspaceRouter } from "@/trpc/routers/workspace/index";
import { router } from "@/trpc/trpc";

import { alertsRouter } from "@/ee/routers/alerts/index";

/**
 * EE root router — assembles all CE routes plus Enterprise Edition routes.
 * The server bootstrap imports this so that all EE features are available
 * at runtime. The CE router (src/trpc/router.ts) contains no EE imports
 * and is used as the public-mirror reference type.
 */
export const appRouter = router({
  auth: authRouter,
  user: userRouter,
  workspace: workspaceRouter,
  organization: organizationRouter,
  alerts: alertsRouter,
  feedback: feedbackRouter,
  license: licenseRouter,
  payment: paymentRouter,
  rabbitmq: rabbitmqRouter,
  discord: discordRouter,
  selfhostedLicense: selfhostedLicenseRouter,
  selfhostedSmtp: selfhostedSmtpRouter,
  sso: ssoRouter,
  public: publicRouter,
});
