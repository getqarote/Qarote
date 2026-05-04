/**
 * Single component that renders any blocked feature gate (capability,
 * license, or plan). See ADR-002.
 *
 * Accepts a wire-shape `GateErrorPayload` (from `readGateError`) plus an
 * optional `serverContext` carrying the capability snapshot — used to
 * render the broker version line and the "Last checked X ago" + Re-check
 * footer when the block is capability-related.
 *
 * The rendered card replaces the gated panel — it is not a banner.
 */

import { useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

import {
  ArrowRight,
  Check,
  Copy,
  ExternalLink,
  Loader2,
  Lock,
  RefreshCw,
  ShieldAlert,
  Zap,
} from "lucide-react";

import { copyToClipboard } from "@/lib/clipboard";
import type {
  BlockedBy,
  FeatureKey,
  GateErrorPayload,
  Remediation,
  UpgradeInfo,
} from "@/lib/feature-gate/types";
import { getUpgradePath } from "@/lib/featureFlags";
import { formatRelativeAgo } from "@/lib/formatRelativeAgo";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * Server-scoped data the card uses to enrich a capability block. PR-A
 * shipped the `getCapabilities` query and `recheckCapabilities` mutation;
 * the page is responsible for plumbing them through.
 */
interface FeatureGateServerContext {
  /** RabbitMQ version, e.g. "3.12.10". */
  version: string | null;
  /** Product flavour, e.g. "RabbitMQ" or "Tanzu RabbitMQ". */
  productName: string | null;
  /** ISO timestamp of the last successful refresh. */
  capabilitiesAt: string | null;
  /** Trigger a manual re-check; the page is rate-limited server-side. */
  onRecheck: () => void;
  /** True while the recheck mutation is in flight. */
  isRechecking: boolean;
}

interface FeatureGateCardProps {
  payload: GateErrorPayload;
  /**
   * Optional override for the upgrade CTA destination. Defaults to the
   * payload's `upgrade.ctaUrl`, falling back to the deployment-aware
   * upgrade path when neither is set.
   */
  upgradeUrl?: string;
  /**
   * Server context for capability blocks — surfaces the broker version
   * and "Last checked X ago" + Re-check footer. Pages that aren't
   * server-scoped (license/plan blocks) should omit this.
   */
  serverContext?: FeatureGateServerContext;
}

/**
 * Static map from a feature key to the in-app route that surfaces it.
 * The fallback CTA navigates here; features without a UI route fall
 * through to a no-op (the alternative is informational only).
 *
 * Keep in sync with `apps/app/src/App.tsx` route definitions.
 */
const FEATURE_PATHS: Partial<Record<FeatureKey, string>> = {
  message_tracing: "/messages",
  message_spy: "/queues",
  incident_diagnosis: "/diagnosis",
};

const TITLE_KEYS: Record<BlockedBy, string> = {
  license: "title.license",
  plan: "title.plan",
  capability: "title.capability",
};

const ICON: Record<BlockedBy, typeof Lock> = {
  license: Lock,
  plan: Zap,
  capability: ShieldAlert,
};

/**
 * URL is "external" when it has a scheme or starts with `//`. We open
 * those in a new tab and avoid `react-router`'s `navigate(to)` which
 * treats absolute URLs as relative paths and corrupts history.
 */
function isExternalUrl(url: string): boolean {
  return /^([a-z][a-z0-9+.-]*:|\/\/)/i.test(url);
}

export function FeatureGateCard({
  payload,
  upgradeUrl,
  serverContext,
}: FeatureGateCardProps) {
  const { t } = useTranslation("gate");
  const navigate = useNavigate();
  const Icon = ICON[payload.blockedBy];
  const titleId = useId();
  const titleRef = useRef<HTMLHeadingElement>(null);

  // Move focus onto the title when the card mounts so screen readers
  // announce the new context. `tabIndex={-1}` makes the heading focusable
  // programmatically without entering the natural tab order.
  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  const reason = t(payload.reasonKey, payload.reasonParams);
  const title = t(TITLE_KEYS[payload.blockedBy]);
  const upgradeHref = resolveUpgradeHref(payload.upgrade, upgradeUrl);

  const handleUpgrade = () => {
    if (!upgradeHref) return;
    if (isExternalUrl(upgradeHref)) {
      // External upgrade URL (marketing page, billing portal): open in a
      // new tab so the user keeps the dashboard context.
      window.open(upgradeHref, "_blank", "noopener,noreferrer");
      return;
    }
    navigate(upgradeHref);
  };

  // Fallback CTA destination — null means the feature has no in-app
  // route, in which case we render the button disabled rather than
  // remove it (the gate-result said an alternative exists; surfacing
  // the name is still useful even when we can't navigate).
  const fallbackPath = payload.fallback
    ? (FEATURE_PATHS[payload.fallback.feature] ?? null)
    : null;
  const handleFallback = () => {
    if (fallbackPath) navigate(fallbackPath);
  };

  // Show the broker info + recheck footer only for capability blocks
  // backed by real server context. License/plan blocks aren't
  // server-scoped — the footer would be misleading.
  const showServerFooter =
    payload.blockedBy === "capability" && serverContext !== undefined;

  return (
    <Card
      role="region"
      aria-labelledby={titleId}
      className="my-8 mx-auto max-w-xl border-dashed"
    >
      <CardHeader>
        <CardTitle
          id={titleId}
          ref={titleRef}
          tabIndex={-1}
          className="flex items-center gap-2 text-lg outline-none"
        >
          <Icon
            className="h-5 w-5 shrink-0 text-muted-foreground"
            aria-hidden
          />
          <span>{title}</span>
        </CardTitle>
        <CardDescription>{reason}</CardDescription>
      </CardHeader>

      {payload.remediation ? (
        <CardContent>
          <RemediationBlock remediation={payload.remediation} />
        </CardContent>
      ) : null}

      <CardFooter className="flex flex-col gap-3 pt-0 items-stretch">
        <div className="flex flex-wrap gap-2">
          {upgradeHref && payload.upgrade ? (
            <Button
              onClick={handleUpgrade}
              type="button"
              className="bg-gradient-button hover:bg-gradient-button-hover text-white"
            >
              {t(payload.upgrade.ctaKey)}
              {isExternalUrl(upgradeHref) ? (
                <ExternalLink className="ml-1 h-4 w-4" aria-hidden />
              ) : (
                <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
              )}
            </Button>
          ) : null}

          {payload.fallback ? (
            <Button
              variant="outline"
              type="button"
              onClick={handleFallback}
              disabled={!fallbackPath}
              title={fallbackPath ? undefined : t("fallback.unavailable")}
            >
              {t("fallback.tryAlternative", {
                alternative: t(`features.${payload.fallback.feature}`, {
                  defaultValue: payload.fallback.feature,
                }),
              })}
            </Button>
          ) : null}
        </div>

        {showServerFooter ? <ServerFooter ctx={serverContext} /> : null}
      </CardFooter>
    </Card>
  );
}

function RemediationBlock({ remediation }: { remediation: Remediation }) {
  const { t } = useTranslation("gate");
  const [copied, setCopied] = useState(false);
  const commands = remediation.commands ?? [];
  const hasCommands = commands.length > 0;

  const handleCopy = async () => {
    const ok = await copyToClipboard(commands.join("\n"));
    if (!ok) return;
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-2">
      {hasCommands ? (
        <>
          <p className="text-sm text-muted-foreground">
            {t("remediation.runOnBroker")}
          </p>
          <div className="relative">
            <pre className="overflow-x-auto rounded-md bg-muted p-3 pr-10 text-xs">
              <code>{commands.join("\n")}</code>
            </pre>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              aria-label={t("remediation.copy")}
              className="absolute right-1 top-1 h-7 w-7 p-0"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5" aria-hidden />
              ) : (
                <Copy className="h-3.5 w-3.5" aria-hidden />
              )}
            </Button>
          </div>
        </>
      ) : null}
      {remediation.docsUrl ? (
        <a
          href={remediation.docsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          {t(remediation.ctaKey)}
          <ExternalLink className="h-3 w-3" aria-hidden />
        </a>
      ) : null}
    </div>
  );
}

/**
 * Server-side rate limit on `recheckCapabilities` — keep in sync with
 * `apps/api/src/trpc/routers/rabbitmq/server.ts:RECHECK_COOLDOWN_MS`.
 * The UI computes the same window so the button is disabled (with a
 * countdown) instead of letting the user click and get a 429.
 */
const RECHECK_COOLDOWN_MS = 60_000;

/**
 * Footer that surfaces broker version + last-checked timestamp + Re-check
 * button for capability blocks. Re-rendering the relative time on every
 * 30 s interval keeps the "X minutes ago" copy fresh without forcing the
 * caller to manage a timer.
 */
function ServerFooter({ ctx }: { ctx: FeatureGateServerContext }) {
  const { t } = useTranslation("gate");
  const [, forceTick] = useState(0);

  // Re-render every 30 s so "Last checked X ago" stays accurate. The
  // same tick also drives the cooldown countdown — bumped to 1 s while
  // a cooldown is active so the displayed remaining-seconds is fresh.
  const cooldownRemainingMs = capabilitiesAtToCooldownMs(ctx.capabilitiesAt);
  const inCooldown = cooldownRemainingMs > 0;
  useEffect(() => {
    const interval = inCooldown ? 1_000 : 30_000;
    const id = setInterval(() => forceTick((n) => n + 1), interval);
    return () => clearInterval(id);
  }, [inCooldown]);

  const versionLine = formatVersionLine(ctx.version, ctx.productName);
  const lastChecked = ctx.capabilitiesAt
    ? formatRelativeAgo(ctx.capabilitiesAt, t("checkedJustNow"))
    : null;

  const cooldownSecs = Math.ceil(cooldownRemainingMs / 1000);
  const recheckDisabled = ctx.isRechecking || inCooldown;
  const recheckLabel =
    inCooldown && !ctx.isRechecking
      ? t("capability.recheckIn", { seconds: cooldownSecs })
      : t("capability.recheck");

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-xs text-muted-foreground">
      <div className="flex flex-col gap-0.5">
        {versionLine ? <span>{versionLine}</span> : null}
        {lastChecked ? (
          // Live region scoped to the relative-time line — SR users
          // hear updates here without re-announcing the whole footer.
          <span aria-live="polite" aria-atomic="true">
            {t("lastChecked", { relative: lastChecked })}
          </span>
        ) : null}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={ctx.onRecheck}
        disabled={recheckDisabled}
      >
        {ctx.isRechecking ? (
          <Loader2 className="mr-1 h-3 w-3 animate-spin" aria-hidden />
        ) : (
          <RefreshCw className="mr-1 h-3 w-3" aria-hidden />
        )}
        {recheckLabel}
      </Button>
    </div>
  );
}

/**
 * How many ms remain on the recheck cooldown. Returns 0 when the
 * cooldown has elapsed (or no recheck has ever run).
 */
function capabilitiesAtToCooldownMs(capabilitiesAt: string | null): number {
  if (!capabilitiesAt) return 0;
  const elapsed = Date.now() - new Date(capabilitiesAt).getTime();
  return Math.max(0, RECHECK_COOLDOWN_MS - elapsed);
}

function formatVersionLine(
  version: string | null,
  productName: string | null
): string | null {
  if (!version && !productName) return null;
  if (!version) return productName;
  if (!productName) return version;
  // Most users see "RabbitMQ 3.12.10" — productName ?? "RabbitMQ" wins
  // visual real estate; version follows.
  return `${productName} ${version}`;
}

function resolveUpgradeHref(
  upgrade: UpgradeInfo | undefined,
  override: string | undefined
): string | null {
  if (override) return override;
  if (upgrade?.ctaUrl) return upgrade.ctaUrl;
  return getUpgradePath();
}
