import { router } from "@/trpc/trpc";

import { emailRouter } from "./email";
import { invitationRouter } from "./invitation";
import { passwordRouter } from "./password";
import { registrationRouter } from "./registration";
import { sessionRouter } from "./session";
import { verificationRouter } from "./verification";

/**
 * Auth router
 * Combines all authentication-related routers.
 * Note: Login, Google OAuth, and SSO are now handled by better-auth directly.
 * SSO admin config is exposed via the top-level sso router.
 */
export const authRouter = router({
  session: sessionRouter,
  registration: registrationRouter,
  password: passwordRouter,
  verification: verificationRouter,
  email: emailRouter,
  invitation: invitationRouter,
});
