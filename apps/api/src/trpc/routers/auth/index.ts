import { router } from "@/trpc/trpc";

import { emailRouter } from "./email";
import { invitationRouter } from "./invitation";
import { passwordRouter } from "./password";
import { registrationRouter } from "./registration";
import { sessionRouter } from "./session";
import { ssoRouter } from "./sso";
import { verificationRouter } from "./verification";

/**
 * Auth router
 * Combines all authentication-related routers.
 * Note: Login and Google OAuth are now handled by better-auth directly.
 */
export const authRouter = router({
  session: sessionRouter,
  registration: registrationRouter,
  password: passwordRouter,
  verification: verificationRouter,
  email: emailRouter,
  invitation: invitationRouter,
  sso: ssoRouter,
});
