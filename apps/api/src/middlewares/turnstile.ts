import { createMiddleware } from "hono/factory";

import {
  turnstileEnabled,
  verifyTurnstileToken,
} from "@/services/turnstile/turnstile.service";

// Mounted on the broad `/api/auth/**` route, so it sees every auth request.
// We narrow enforcement to the sign-in endpoint here rather than via a more
// specific Hono route — combining `app.on("POST", "/api/auth/sign-in/email")`
// with `app.on(["POST","GET"], "/api/auth/**")` causes the trie router to
// drop the wildcard's GET branch, breaking session checks.
const isTurnstileEnforced = (path: string, method: string): boolean =>
  method === "POST" && path === "/api/auth/sign-in/email";

export const turnstileMiddleware = createMiddleware(async (c, next) => {
  if (!turnstileEnabled) return next();
  if (!isTurnstileEnforced(new URL(c.req.url).pathname, c.req.method)) {
    return next();
  }

  const token = c.req.header("X-Turnstile-Token");
  if (!token) {
    return c.json(
      { error: "CAPTCHA required", message: "CAPTCHA required" },
      400
    );
  }

  const ok = await verifyTurnstileToken(
    token,
    c.req.header("CF-Connecting-IP")
  );
  if (!ok) {
    return c.json(
      {
        error: "CAPTCHA verification failed",
        message: "CAPTCHA verification failed",
      },
      403
    );
  }

  return next();
});
