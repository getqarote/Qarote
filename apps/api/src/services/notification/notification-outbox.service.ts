/**
 * Notification Outbox Service
 *
 * Closes dual-write hazards on every cross-channel transactional notification
 * (email, Slack, user webhooks). The handler writes the outbox row inside
 * the same transaction as the surrounding business state (subscription,
 * license, alert); a singleton drain delivers asynchronously per channel.
 *
 * Idempotency: every enqueue carries an `idempotencyKey` prefixed by
 * `<channel>:` so the same business event can fan out to multiple channels
 * without colliding. The unique constraint turns webhook retries / cycle
 * restarts into enqueue-time no-ops.
 *
 * Retry: failed sends bump `attempts`, set `nextAttemptAt` with channel-
 * appropriate backoff (email tolerates long, webhook short, Slack respects
 * Retry-After). After MAX_ATTEMPTS the row transitions to FAILED — a loud
 * error log is the trigger for ops alerting.
 */

import {
  BrokenCircuitError,
  circuitBreaker,
  CircuitBreakerPolicy,
  ConsecutiveBreaker,
  handleAll,
} from "cockatiel";

import { logger } from "@/core/logger";
import { prisma } from "@/core/prisma";

import { AuthEmailService } from "@/services/email/auth-email.service";
import { BillingEmailService } from "@/services/email/billing-email.service";
import { LicenseEmailService } from "@/services/email/license-email.service";
import { passwordResetEmailService } from "@/services/email/password-reset-email.service";
import { Sentry, trackMetricCount } from "@/services/sentry";

import { ghcrConfig } from "@/config";

import { Prisma, UserPlan } from "@/generated/prisma/client";

const MAX_ATTEMPTS = 10;

/**
 * Per-channel backoff. Email tolerates long delays (SMTP queue is the
 * baseline). Webhook 5xx clears fast — short backoff keeps recovery quick.
 * Slack is approximate here; the dispatcher honors Retry-After when the
 * upstream provides it (not yet wired — first Slack consumer will add it).
 */
const BACKOFF_PROFILES = {
  email: { baseMs: 60_000, capMs: 60 * 60_000 }, // 1m → 1h
  webhook: { baseMs: 5_000, capMs: 10 * 60_000 }, // 5s → 10m
  slack: { baseMs: 5_000, capMs: 10 * 60_000 }, // 5s → 10m (Retry-After overrides)
} as const;

type NotificationChannel = keyof typeof BACKOFF_PROFILES;

/**
 * Per-channel circuit breakers wrapped around the dispatcher. When a
 * downstream (SMTP / Slack webhook / user webhook) is down, after 5
 * consecutive failures the breaker opens and subsequent rows in the same
 * drain cycle fail-fast (~1ms) instead of each waiting their full timeout.
 * The drain marks them retrying with backoff; the breaker auto-recovers
 * via half-open after a 30s cooldown.
 *
 * Single-process singleton (the drain runs on one worker via advisory
 * lock), so the rolling window state is local to the worker process.
 */
const CIRCUIT_FAILURES_TO_OPEN = 5;
const CIRCUIT_HALF_OPEN_AFTER_MS = 30_000;
function makeBreaker(): CircuitBreakerPolicy {
  return circuitBreaker(handleAll, {
    halfOpenAfter: CIRCUIT_HALF_OPEN_AFTER_MS,
    breaker: new ConsecutiveBreaker(CIRCUIT_FAILURES_TO_OPEN),
  });
}
const channelBreakers: Record<NotificationChannel, CircuitBreakerPolicy> = {
  email: makeBreaker(),
  slack: makeBreaker(),
  webhook: makeBreaker(),
};

/**
 * Discriminated union of every notification kind the system can enqueue.
 * `payload` mirrors the underlying delivery method's params minus the
 * target (kept on the row's `target` column). Date fields pass through
 * JSON.stringify as ISO strings and are re-hydrated by the dispatcher.
 *
 * To add a Slack or webhook variant: add a new `{ channel: "slack" | ... }`
 * arm here and a matching `case` in `dispatchNotification`.
 */
type OutboxJob =
  | {
      channel: "email";
      template: "upgrade_confirmation";
      payload: {
        userName: string;
        workspaceName: string;
        plan: UserPlan;
        billingInterval: "monthly" | "yearly";
        locale?: string;
      };
    }
  | {
      channel: "email";
      template: "license_delivery";
      payload: {
        userName?: string;
        licenseKey: string;
        tier: UserPlan;
        expiresAt: string;
        locale?: string;
      };
    }
  | {
      channel: "email";
      template: "license_renewal";
      payload: {
        userName?: string;
        licenseKey: string;
        tier: UserPlan;
        previousExpiresAt: string;
        newExpiresAt: string;
        locale?: string;
      };
    }
  | {
      channel: "email";
      template: "license_expired";
      payload: {
        userName?: string;
        licenseKey: string;
        tier: UserPlan;
        expiredAt: string;
        renewalUrl: string;
        locale?: string;
      };
    }
  | {
      channel: "email";
      template: "license_payment_failed";
      payload: {
        userName?: string;
        licenseKey: string;
        tier: UserPlan;
        gracePeriodDays: number;
        isInGracePeriod: boolean;
        willDeactivate: boolean;
        locale?: string;
      };
    }
  | {
      channel: "email";
      template: "license_cancellation";
      payload: {
        userName?: string;
        licenseKey: string;
        tier: UserPlan;
        expiresAt: string;
        gracePeriodDays: number;
        locale?: string;
      };
    }
  | {
      channel: "email";
      template: "payment_confirmation";
      payload: {
        userName: string;
        amount: number;
        currency: string;
        paymentMethod: string;
        locale?: string;
      };
    }
  | {
      channel: "email";
      template: "payment_failed";
      payload: {
        userName: string;
        amount: number;
        failureReason: string;
        locale?: string;
      };
    }
  | {
      channel: "email";
      template: "trial_ending";
      payload: {
        name: string;
        workspaceName: string;
        plan: UserPlan;
        trialEndDate: string;
        currentUsage?: { servers: number };
        locale?: string;
      };
    }
  | {
      channel: "email";
      template: "payment_action_required";
      payload: {
        name: string;
        workspaceName: string;
        plan: UserPlan;
        invoiceUrl: string;
        amount: string;
        currency: string;
        locale?: string;
      };
    }
  | {
      channel: "email";
      template: "verification";
      payload: {
        userName?: string;
        verificationToken: string;
        type: "SIGNUP" | "EMAIL_CHANGE";
        sourceApp?: "app" | "portal";
        locale?: string;
      };
    }
  | {
      channel: "email";
      template: "password_reset";
      payload: {
        userName?: string;
        resetToken: string;
        tokenExpiresAt: string;
        locale?: string;
      };
    }
  | {
      channel: "email";
      template: "workspace_invitation";
      payload: {
        inviterName: string;
        inviterEmail: string;
        workspaceName: string;
        invitationToken: string;
        plan: UserPlan;
        locale?: string;
      };
    }
  | {
      channel: "email";
      template: "org_invitation";
      payload: {
        inviterName: string;
        inviterEmail: string;
        orgName: string;
        invitationToken: string;
        locale?: string;
      };
    }
  | {
      channel: "email";
      template: "auth_welcome";
      payload: {
        name: string;
        workspaceName?: string;
        plan: UserPlan;
        trialDaysRemaining?: number;
        trialEndDate?: string;
        locale?: string;
      };
    }
    }
    };

type EnqueueArgs = OutboxJob & {
  target: string;
  /**
   * Stable key derived from the source event. MUST be prefixed with the
   * channel (`email:checkout_session:abc:upgrade_confirmation`) so that
   * fanning out the same business event across channels does not collide.
   */
  idempotencyKey: string;
};

interface NotificationSendResult {
  success: boolean;
  error?: string | null;
  retryAfterMs?: number;
}

type DrainStats = { sent: number; failed: number; retrying: number };

type OutboxDbClient = Pick<
  Prisma.TransactionClient,
  "notificationOutbox" | "$executeRawUnsafe"
>;

/**
 * Postgres LISTEN/NOTIFY channel name.
 *
 * The drain worker LISTENs on this channel; every successful enqueue
 * NOTIFYs it inside the same transaction so the drain wakes up as soon
 * as the row is visible. The polling interval on the cron stays as a
 * safety net (NOTIFY is best-effort — lost on LISTEN connection drops).
 */
export const NOTIFICATION_OUTBOX_CHANNEL = "notification_outbox_new";

/**
 * Enqueue an outbox row. Pass a Prisma transaction client (the `tx` from
 * `prisma.$transaction(async (tx) => ...)`) when the caller is inside a
 * transaction so the row is committed atomically with the surrounding
 * business state — that's the whole point of the pattern.
 *
 * Returns true if enqueued, false if a row with the same idempotencyKey
 * already exists.
 */
export async function enqueueNotification(
  args: EnqueueArgs,
  client: OutboxDbClient = prisma
): Promise<boolean> {
  if (!args.idempotencyKey.startsWith(`${args.channel}:`)) {
    // Fail fast: a key that omits the channel prefix is a future collision
    // waiting to happen as soon as another channel emits the same event.
    throw new Error(
      `idempotencyKey must be prefixed with channel "${args.channel}:" — got "${args.idempotencyKey}"`
    );
  }
  try {
    // Explicit JSON round-trip normalizes Date instances (e.g.
    // DigestData.generatedAt) to ISO strings before persisting, so we
    // don't depend on Prisma's serializer. The dispatcher rehydrates
    // known Date fields per template.
    const normalizedPayload = JSON.parse(
      JSON.stringify(args.payload)
    ) as Prisma.InputJsonValue;
    await client.notificationOutbox.create({
      data: {
        channel: args.channel,
        template: args.template,
        target: args.target,
        payload: normalizedPayload,
        idempotencyKey: args.idempotencyKey,
      },
    });
    // Wake the drain immediately. NOTIFY is delivered post-COMMIT so the
    // drain's SELECT will see the row. Best-effort — if no LISTENer is
    // connected the polling interval is the fallback.
    await client.$executeRawUnsafe(`NOTIFY ${NOTIFICATION_OUTBOX_CHANNEL}`);
    return true;
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      logger.debug(
        {
          idempotencyKey: args.idempotencyKey,
          channel: args.channel,
          template: args.template,
        },
        "NotificationOutbox: enqueue collision (P2002) — already queued"
      );
      return false;
    }
    throw error;
  }
}

/**
 * Drain a batch of pending outbox rows.
 *
 * Concurrency: the drain runs on a worker that holds a pg advisory lock
 * (license-monitor today), so only one drainer is active at a time across
 * replicas. Within a single worker, drainBatch is serialized by the cron's
 * isDraining guard.
 *
 * Fairness: rows are interleaved by channel via per-channel sub-queries so
 * a slow SMTP cycle does not starve fast Slack/webhook deliveries.
 */
export async function drainNotificationOutbox(limit = 50): Promise<DrainStats> {
  const now = new Date();
  const channels = Object.keys(BACKOFF_PROFILES) as NotificationChannel[];
  const perChannelLimit = Math.max(1, Math.ceil(limit / channels.length));
  const rowGroups = await Promise.all(
    channels.map((channel) =>
      prisma.notificationOutbox.findMany({
        where: {
          status: "PENDING",
          nextAttemptAt: { lte: now },
          channel,
        },
        orderBy: { createdAt: "asc" },
        take: perChannelLimit,
      })
    )
  );
  // Round-robin merge across channels so we (a) preserve per-channel
  // createdAt ordering, (b) interleave channels to give each fairness even
  // when one is backlogged, and (c) honor the global `limit` instead of
  // overshooting it (perChannelLimit * channels.length can be > limit when
  // ceil rounds up).
  const rows: (typeof rowGroups)[number] = [];
  const cursors = channels.map(() => 0);
  let exhausted = false;
  while (rows.length < limit && !exhausted) {
    exhausted = true;
    for (let i = 0; i < rowGroups.length; i++) {
      if (cursors[i] < rowGroups[i].length) {
        rows.push(rowGroups[i][cursors[i]]);
        cursors[i]++;
        exhausted = false;
        if (rows.length === limit) break;
      }
    }
  }

  const stats: DrainStats = { sent: 0, failed: 0, retrying: 0 };
  for (const row of rows) {
    const result = await processOutboxRow(row);
    if (result === "sent") stats.sent++;
    else if (result === "failed") stats.failed++;
    else stats.retrying++;
  }
  return stats;
}

async function processOutboxRow(row: {
  id: string;
  channel: string;
  template: string;
  target: string;
  payload: unknown;
  attempts: number;
}): Promise<"sent" | "failed" | "retrying"> {
  const channel = row.channel as NotificationChannel;
  const breaker = channelBreakers[channel];

  let result: NotificationSendResult;
  try {
    if (breaker) {
      // Run the dispatch through the channel breaker. If the breaker is
      // OPEN we throw immediately; the row is bumped to retry without
      // touching the broken downstream.
      result = await breaker.execute(async () => {
        const dispatchResult = await dispatchNotification(
          channel,
          row.template,
          row.target,
          row.payload as OutboxJob["payload"]
        );
        // Cockatiel only counts thrown errors as failures. Translate a
        // success=false result into a throw so the breaker observes it.
        if (!dispatchResult.success) {
          throw new Error(dispatchResult.error ?? "send failed");
        }
        return dispatchResult;
      });
    } else {
      result = await dispatchNotification(
        channel,
        row.template,
        row.target,
        row.payload as OutboxJob["payload"]
      );
    }
  } catch (error) {
    if (error instanceof BrokenCircuitError) {
      result = {
        success: false,
        error: `circuit_open:${channel}`,
      };
    } else {
      result = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  if (result.success) {
    await prisma.notificationOutbox.update({
      where: { id: row.id },
      data: { status: "SENT", sentAt: new Date(), lastError: null },
    });
    return "sent";
  }

  const attempts = row.attempts + 1;
  const exhausted = attempts >= MAX_ATTEMPTS;
  // Strip token-shaped strings from error messages before persisting — email SDK
  // errors can include request body excerpts that contain credentials.
  if (result.error) {
    result = {
      ...result,
      error: result.error
        .replace(/ghp_[A-Za-z0-9]{36,}/g, "[REDACTED]")
        .replace(/github_pat_[A-Za-z0-9_]{36,}/g, "[REDACTED]")
        .replace(/gho_[A-Za-z0-9]{36,}/g, "[REDACTED]")
        .replace(/ghu_[A-Za-z0-9]{36,}/g, "[REDACTED]")
        .replace(/ghs_[A-Za-z0-9]{36,}/g, "[REDACTED]")
        .replace(/ghr_[A-Za-z0-9]{36,}/g, "[REDACTED]")
        .replace(/[A-Za-z0-9_-]{64,}/g, "[REDACTED]"),
    };
  }
  const profile =
    BACKOFF_PROFILES[row.channel as NotificationChannel] ??
    BACKOFF_PROFILES.email;
  // Provider-supplied Retry-After overrides our computed backoff.
  const computedBackoff = Math.min(
    profile.capMs,
    profile.baseMs * 2 ** (attempts - 1)
  );
  const backoffMs = result.retryAfterMs ?? computedBackoff;
  const jitter = Math.floor(Math.random() * 1_000);
  await prisma.notificationOutbox.update({
    where: { id: row.id },
    data: {
      attempts,
      status: exhausted ? "FAILED" : "PENDING",
      nextAttemptAt: new Date(Date.now() + backoffMs + jitter),
      lastError: result.error ?? null,
    },
  });
  if (exhausted) {
    // Loud failure: a transactional notification never reached the
    // recipient after MAX_ATTEMPTS. Tagged Sentry capture so ops can
    // configure an alert on `component:notification-outbox` (any
    // FAILED row) and a metric so dashboards see the rate over time.
    // The outbox row stays as the audit trail; no silent loss.
    logger.error(
      {
        outboxId: row.id,
        channel: row.channel,
        template: row.template,
        target: row.target,
        attempts,
        error: result.error,
      },
      "NotificationOutbox: row exhausted retries — FAILED, recipient never notified"
    );
    trackMetricCount("notification_outbox.failed", 1, {
      tags: {
        channel: row.channel,
        template: row.template,
      },
    });
    Sentry.withScope((scope) => {
      scope.setTag("component", "notification-outbox");
      scope.setTag("notification_channel", row.channel);
      scope.setTag("notification_template", row.template);
      scope.setLevel("error");
      scope.setContext("notification_outbox", {
        outboxId: row.id,
        channel: row.channel,
        template: row.template,
        attempts,
        lastError: result.error,
      });
      Sentry.captureException(
        new Error(
          `NotificationOutbox FAILED after ${attempts} attempts: ${row.channel}/${row.template}`
        )
      );
    });
    return "failed";
  }
  logger.warn(
    {
      outboxId: row.id,
      channel: row.channel,
      template: row.template,
      attempts,
      backoffMs,
      error: result.error,
    },
    "NotificationOutbox: send failed — will retry"
  );
  return "retrying";
}


async function dispatchNotification(
  channel: NotificationChannel,
  template: string,
  target: string,
  payload: OutboxJob["payload"]
): Promise<NotificationSendResult> {
  switch (channel) {
    case "email":
      return dispatchEmail(template, target, payload);
    case "slack":
      return dispatchSlack(template, target, payload);
    case "webhook":
      // No webhook templates yet — kept so adding one is a local change.
      // Log the unexpected attempt so a future enqueue that targets this
      // channel without a dispatcher surfaces in logs (template + target
      // included for triage).
      logger.warn(
        { channel: "webhook", template, target },
        "NotificationOutbox: webhook dispatch attempted with no implementation"
      );
      return {
        success: false,
        error: `no dispatcher implemented for channel "${channel}"`,
      };
  }
}

async function dispatchSlack(
  template: string,
  _target: string,
  _payload: OutboxJob["payload"]
): Promise<NotificationSendResult> {
  logger.error({ template }, "NotificationOutbox: unknown slack template — cannot dispatch");
  return { success: false, error: `unknown slack template: ${template}` };
}


async function dispatchEmail(
  template: string,
  target: string,
  payload: OutboxJob["payload"]
): Promise<NotificationSendResult> {
  switch (template) {
    case "upgrade_confirmation": {
      const p = payload as Extract<
        OutboxJob,
        { template: "upgrade_confirmation" }
      >["payload"];
      return BillingEmailService.sendUpgradeConfirmationEmail({
        to: target,
        userName: p.userName,
        workspaceName: p.workspaceName,
        plan: p.plan,
        billingInterval: p.billingInterval,
        locale: p.locale,
      });
    }
    case "license_delivery": {
      const p = payload as Extract<
        OutboxJob,
        { template: "license_delivery" }
      >["payload"];
      // Inject GHCR credentials at dispatch time — NOT stored in outbox payload.
      // Credentials rotate annually; persisting them in JSONB would make them
      // stale post-rotation. DO NOT log robotToken.
      const { robotUsername, robotToken } = ghcrConfig;
      const ghcrLoginCommand =
        robotUsername && robotToken
          ? `echo "${robotToken}" | docker login ghcr.io -u ${robotUsername} --password-stdin`
          : undefined;
      return LicenseEmailService.sendLicenseDeliveryEmail({
        to: target,
        userName: p.userName,
        licenseKey: p.licenseKey,
        tier: p.tier,
        expiresAt: new Date(p.expiresAt),
        locale: p.locale,
        ghcrLoginCommand,
      });
    }
    case "license_renewal": {
      const p = payload as Extract<
        OutboxJob,
        { template: "license_renewal" }
      >["payload"];
      return LicenseEmailService.sendLicenseRenewalEmail({
        to: target,
        userName: p.userName,
        licenseKey: p.licenseKey,
        tier: p.tier,
        previousExpiresAt: new Date(p.previousExpiresAt),
        newExpiresAt: new Date(p.newExpiresAt),
        locale: p.locale,
      });
    }
    case "license_expired": {
      const p = payload as Extract<
        OutboxJob,
        { template: "license_expired" }
      >["payload"];
      return LicenseEmailService.sendLicenseExpiredEmail({
        to: target,
        userName: p.userName,
        licenseKey: p.licenseKey,
        tier: p.tier,
        expiredAt: new Date(p.expiredAt),
        renewalUrl: p.renewalUrl,
        locale: p.locale,
      });
    }
    case "license_payment_failed": {
      const p = payload as Extract<
        OutboxJob,
        { template: "license_payment_failed" }
      >["payload"];
      return LicenseEmailService.sendLicensePaymentFailedEmail({
        to: target,
        userName: p.userName,
        licenseKey: p.licenseKey,
        tier: p.tier,
        gracePeriodDays: p.gracePeriodDays,
        isInGracePeriod: p.isInGracePeriod,
        willDeactivate: p.willDeactivate,
        locale: p.locale,
      });
    }
    case "license_cancellation": {
      const p = payload as Extract<
        OutboxJob,
        { template: "license_cancellation" }
      >["payload"];
      return LicenseEmailService.sendLicenseCancellationEmail({
        to: target,
        userName: p.userName,
        licenseKey: p.licenseKey,
        tier: p.tier,
        expiresAt: new Date(p.expiresAt),
        gracePeriodDays: p.gracePeriodDays,
        locale: p.locale,
      });
    }
    case "verification": {
      const p = payload as Extract<
        OutboxJob,
        { template: "verification" }
      >["payload"];
      return AuthEmailService.sendVerificationEmail({
        to: target,
        userName: p.userName,
        verificationToken: p.verificationToken,
        type: p.type,
        sourceApp: p.sourceApp,
        locale: p.locale,
      });
    }
    case "password_reset": {
      const p = payload as Extract<
        OutboxJob,
        { template: "password_reset" }
      >["payload"];
      // The legacy service returns void instead of EmailResult and rejects
      // on failure. Wrap so the dispatcher contract holds.
      try {
        await passwordResetEmailService.sendPasswordResetEmail(
          target,
          p.resetToken,
          new Date(p.tokenExpiresAt),
          p.userName,
          p.locale ?? "en"
        );
        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }
    case "workspace_invitation": {
      const p = payload as Extract<
        OutboxJob,
        { template: "workspace_invitation" }
      >["payload"];
      return AuthEmailService.sendInvitationEmail({
        to: target,
        inviterName: p.inviterName,
        inviterEmail: p.inviterEmail,
        workspaceName: p.workspaceName,
        invitationToken: p.invitationToken,
        plan: p.plan,
        locale: p.locale,
      });
    }
    case "org_invitation": {
      const p = payload as Extract<
        OutboxJob,
        { template: "org_invitation" }
      >["payload"];
      return AuthEmailService.sendOrgInvitationEmail({
        to: target,
        inviterName: p.inviterName,
        inviterEmail: p.inviterEmail,
        orgName: p.orgName,
        invitationToken: p.invitationToken,
        locale: p.locale,
      });
    }
    case "auth_welcome": {
      const p = payload as Extract<
        OutboxJob,
        { template: "auth_welcome" }
      >["payload"];
      return AuthEmailService.sendWelcomeEmail({
        to: target,
        name: p.name,
        workspaceName: p.workspaceName,
        plan: p.plan,
        trialDaysRemaining: p.trialDaysRemaining,
        trialEndDate: p.trialEndDate,
        locale: p.locale,
      });
    }
    default:
      logger.error(
        { template },
        "NotificationOutbox: unknown email template — cannot dispatch"
      );
      return { success: false, error: `unknown email template: ${template}` };
  }
}
