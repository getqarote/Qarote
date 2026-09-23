/**
 * New-signup internal notification.
 *
 * Single home for the "should Qarote email itself about this account, and with
 * what" policy. Every path that creates a User calls this one function, so the
 * privacy invariant below is stated once rather than at each call site.
 *
 * Delivery goes through the notification outbox, so a Resend hiccup retries
 * instead of silently dropping the ping, and the unique idempotency key makes
 * a double call a no-op.
 *
 * PII: the payload deliberately carries no `referrer` / `landingPage` — the
 * two free-text fields that amount to a browsing trail. It does still carry
 * `referralSource`, `discoveryQuery` and the UTM set, because naming *where* a
 * signup came from is the whole point of the ping; `acquisitionChannel` alone
 * ("organic" / "paid" / "direct") is not actionable.
 *
 * That trade has a cost worth stating: a row that exhausts its retries stays
 * FAILED indefinitely (the outbox keeps those as the "never reached" audit
 * trail) and holds no FK to User, so `deleteAccount` does not clear it.
 */

import { logger } from "@/core/logger";

import { CoreEmailService } from "@/services/email/core-email.service";

import { internalNotificationConfig } from "@/config";
import { isCloudMode } from "@/config/deployment";

import {
  enqueueNotification,
  type SignupMethod,
} from "./notification-outbox.service";

interface NewSignupNotificationInput {
  userId: string;
  email: string;
  name?: string | null;
  signupMethod: SignupMethod;
  referralSource?: string | null;
  discoveryQuery?: string | null;
  acquisitionChannel?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  /** Invitation paths only — who invited them, and into what. */
  invitedByEmail?: string | null;
  invitedToName?: string | null;
}

/** Drops nullish/blank values and trims what it keeps. */
const clean = (value?: string | null): string | undefined =>
  value?.trim() || undefined;

/**
 * Enqueue the internal ping for a freshly created account.
 *
 * Never throws and never rejects: callers are fire-and-forget one-liners on
 * the signup happy path, and an ops ping must not be able to fail a
 * registration. Returns whether a row was enqueued — false means "deliberately
 * skipped" or "already queued", never an unreported error.
 *
 * Called post-commit: a crash between the user INSERT and this call loses one
 * internal ping, which is an acceptable trade for keeping the signup paths
 * free of extra transaction plumbing (same posture as the verification email).
 */
export async function notifyInternalNewSignup(
  input: NewSignupNotificationInput
): Promise<boolean> {
  const skip = (reason: string): boolean => {
    logger.info(
      { userId: input.userId, signupMethod: input.signupMethod, reason },
      "Internal new-signup notification skipped"
    );
    return false;
  };

  try {
    // Self-hosted instances must never phone home, whatever the env says.
    if (!isCloudMode()) return skip("self-hosted deployment");

    const recipient = internalNotificationConfig.recipient;
    if (!recipient) return skip("INTERNAL_NOTIFICATION_EMAIL not configured");

    // Skip when email is off entirely: otherwise the outbox accumulates rows
    // no drain can deliver, drowning the real ops signal. Best-effort only —
    // this reads a per-process cache, so a config change made in another
    // process is not visible here until that process reloads.
    const effectiveEmail = await CoreEmailService.loadEffectiveConfig();
    if (!effectiveEmail.enabled) return skip("email delivery disabled");

    const enqueued = await enqueueNotification({
      channel: "email",
      template: "internal_new_signup",
      target: recipient,
      idempotencyKey: `email:internal_new_signup:${input.userId}`,
      payload: {
        signupEmail: input.email,
        signupName: clean(input.name),
        userId: input.userId,
        signupMethod: input.signupMethod,
        referralSource: clean(input.referralSource),
        discoveryQuery: clean(input.discoveryQuery),
        acquisitionChannel: clean(input.acquisitionChannel),
        utmSource: clean(input.utmSource),
        utmMedium: clean(input.utmMedium),
        utmCampaign: clean(input.utmCampaign),
        invitedByEmail: clean(input.invitedByEmail),
        invitedToName: clean(input.invitedToName),
      },
    });

    logger.info(
      { userId: input.userId, signupMethod: input.signupMethod },
      enqueued
        ? "Internal new-signup notification enqueued"
        : "Internal new-signup notification already queued"
    );

    return enqueued;
  } catch (error) {
    // Swallowed on purpose: five call sites, none of which should carry a
    // .catch() for a notification that is not worth failing a signup over.
    logger.warn(
      { error, userId: input.userId, signupMethod: input.signupMethod },
      "Failed to enqueue internal new-signup notification"
    );
    return false;
  }
}
