import { router } from "@/trpc/trpc";

import { emailRouter } from "./email";
import { googleRouter } from "./google";
import { invitationRouter } from "./invitation";
import { passwordRouter } from "./password";
import { registrationRouter } from "./registration";
import { sessionRouter } from "./session";
import { ssoRouter } from "./sso";
import { verificationRouter } from "./verification";

/**
 * Auth router
 * Combines all authentication-related routers
 */
export const authRouter = router({
  session: sessionRouter,
  registration: registrationRouter,
  password: passwordRouter,
  verification: verificationRouter,
  email: emailRouter,
  google: googleRouter,
  invitation: invitationRouter,
  sso: ssoRouter,
});
