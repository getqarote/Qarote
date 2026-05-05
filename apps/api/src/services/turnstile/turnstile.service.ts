import { logger } from "@/core/logger";

const SECRET = process.env.TURNSTILE_SECRET_KEY;
const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export const turnstileEnabled = Boolean(SECRET);

export async function verifyTurnstileToken(
  token: string,
  remoteIp?: string
): Promise<boolean> {
  if (!SECRET) return true;
  try {
    const res = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret: SECRET,
        response: token,
        remoteip: remoteIp,
      }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      logger.warn(
        { status: res.status },
        "Turnstile returned non-2xx — failing closed"
      );
      return false;
    }
    const data = (await res.json()) as { success: boolean };
    return data.success === true;
  } catch (err) {
    if (err instanceof SyntaxError) {
      logger.error(
        { error: err },
        "Turnstile response body malformed — failing closed"
      );
      return false;
    }
    // Network failure, DNS, or AbortSignal timeout — fail open so a Cloudflare
    // outage does not block legitimate users. Policy: availability > bot risk.
    logger.warn(
      { error: err },
      "Turnstile verification request failed — failing open"
    );
    return true;
  }
}
