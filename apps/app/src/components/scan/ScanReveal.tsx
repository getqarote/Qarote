import { type ReactNode, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

import { usePostHog } from "@posthog/react";
import {
  AlertTriangle,
  Bell,
  BellRing,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Lightbulb,
  Route,
  Settings,
  Sparkles,
} from "lucide-react";

import { RabbitMQAlertSeverity } from "@/lib/api/alertTypes";

import { getSeverityColor } from "@/components/alerts/alertUtils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { CountUp } from "./CountUp";
import { ScanRevealExplainDrawer } from "./ScanRevealExplainDrawer";

const INITIAL_FINDINGS_SHOWN = 3;

// Ordered severity → numeric weight for picking the "most critical" finding
// to name verbatim in the verdict line and AI hero.
const SEVERITY_WEIGHT: Record<RabbitMQAlertSeverity, number> = {
  [RabbitMQAlertSeverity.CRITICAL]: 4,
  [RabbitMQAlertSeverity.HIGH]: 3,
  [RabbitMQAlertSeverity.MEDIUM]: 2,
  [RabbitMQAlertSeverity.LOW]: 1,
  [RabbitMQAlertSeverity.INFO]: 0,
};

interface Finding {
  id: string;
  ruleKey: string;
  severity: RabbitMQAlertSeverity;
  resourceType: string;
  resourceName: string;
  vhost?: string | null;
  detectedAt: string | Date;
  resolvedAt?: string | Date | null;
  isExplainDemoTarget?: boolean;
}

interface ScanRevealProps {
  nodeCount: number;
  version?: string;
  findings: Finding[];
  isLimitedScan: boolean;
  /** Cluster fingerprint — discovered during the topology phase. Optional so a
   *  topology-skipped scan still renders without exploding (counts hide). */
  exchangeCount?: number;
  queueCount?: number;
  bindingCount?: number;
  vhostCount?: number;
  /** When set, auto-opens the explain drawer for the matching finding (deep-link). */
  defaultExplainFindingId?: string | null;
}

export function ScanReveal({
  nodeCount,
  version,
  findings,
  isLimitedScan,
  exchangeCount,
  queueCount,
  bindingCount,
  vhostCount,
  defaultExplainFindingId,
}: ScanRevealProps) {
  const { t } = useTranslation(["scan", "alerts"]);
  const navigate = useNavigate();
  const posthog = usePostHog();
  const [showAll, setShowAll] = useState(false);
  const [explainFinding, setExplainFinding] = useState<Finding | null>(() => {
    if (!defaultExplainFindingId) return null;
    return findings.find((f) => f.id === defaultExplainFindingId) ?? null;
  });

  const unresolvedFindings = findings.filter((f) => !f.resolvedAt);
  const visibleFindings = showAll
    ? unresolvedFindings
    : unresolvedFindings.slice(0, INITIAL_FINDINGS_SHOWN);
  const hasMore = unresolvedFindings.length > INITIAL_FINDINGS_SHOWN;

  // When scan was limited AND clean, suppress the "well-configured" claim —
  // we can't know the cluster is well-configured if we only checked part of it.
  const isCleanFull = unresolvedFindings.length === 0 && !isLimitedScan;
  const isCleanPartial = unresolvedFindings.length === 0 && isLimitedScan;

  // Most critical finding — drives both the verdict line and the AI hero copy.
  const primaryFinding = useMemo(() => {
    if (unresolvedFindings.length === 0) return null;
    return [...unresolvedFindings].sort(
      (a, b) =>
        (SEVERITY_WEIGHT[b.severity] ?? 0) - (SEVERITY_WEIGHT[a.severity] ?? 0)
    )[0];
  }, [unresolvedFindings]);

  // Verdict sentence — replaces the static H1 with a fact-grounded summary.
  const verdictLine = (() => {
    if (isCleanFull) {
      // Fall back to the generic banner when we don't yet know the queue
      // count (topology may have been skipped or failed to load).
      if (queueCount === undefined || queueCount === 0) {
        return t("reveal.wellConfigured");
      }
      return t("reveal.verdict.clean", {
        count: queueCount,
        queues: queueCount,
      });
    }
    if (isCleanPartial) return t("reveal.verdict.cleanPartial");
    if (!primaryFinding) return null;
    const rule = t(`alerts:ruleLabels.${primaryFinding.ruleKey}`, {
      defaultValue: primaryFinding.ruleKey,
    });
    const resource = `${primaryFinding.resourceType}/${primaryFinding.resourceName}`;
    if (unresolvedFindings.length === 1) {
      return t("reveal.verdict.single", { rule, resource });
    }
    return t("reveal.verdict.withPrimary", {
      count: unresolvedFindings.length,
      rule,
      resource,
    });
  })();

  const hasFingerprint =
    (exchangeCount ?? 0) > 0 ||
    (queueCount ?? 0) > 0 ||
    (bindingCount ?? 0) > 0 ||
    (vhostCount ?? 0) > 0 ||
    nodeCount > 0 ||
    !!version;

  // ── Choreography: three beats, 800ms total ──────────────────────────────
  // Each section uses the same fade-up animation with a stagger delay so the
  // reveal lands in distinct, readable chunks rather than appearing all at once.
  const beatClass =
    "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3 motion-safe:duration-400 motion-safe:fill-mode-backwards";

  return (
    <div className="flex flex-col items-center w-full max-w-2xl mx-auto px-4">
      {/* ── BEAT 1 (0ms) — fingerprint + verdict ────────────────────────── */}
      <div className={`text-center space-y-3 mb-8 ${beatClass}`}>
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-100 dark:bg-green-950 mb-1 motion-safe:animate-in motion-safe:zoom-in-75 motion-safe:duration-500">
          <CheckCircle2 className="h-7 w-7 text-green-600 dark:text-green-400" />
        </div>

        {/* Fingerprint strip — count-up numbers ground the verdict in real data */}
        {hasFingerprint && (
          <p className="text-xs text-muted-foreground tabular-nums flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
            <FingerprintRow
              exchangeCount={exchangeCount}
              queueCount={queueCount}
              bindingCount={bindingCount}
              vhostCount={vhostCount}
              nodeCount={nodeCount}
              version={version}
              t={t}
            />
          </p>
        )}

        {/* Verdict H1 — fact-grounded, names a real resource when possible */}
        {verdictLine && (
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight leading-snug max-w-xl mx-auto">
            {verdictLine}
          </h1>
        )}

        {isLimitedScan && (
          <Badge variant="outline" className="text-xs">
            {t("reveal.limitedScanBadge")}
          </Badge>
        )}
      </div>

      {/* ── BEAT 2 (+300ms) — AI hero + findings list ───────────────────── */}
      {unresolvedFindings.length > 0 && (
        <div
          className={`w-full space-y-5 mb-8 [animation-delay:300ms] ${beatClass}`}
        >
          {/* AI Explain hero strip — full-width, primary CTA inside */}
          {primaryFinding && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
              <Sparkles className="h-5 w-5 text-primary shrink-0" aria-hidden />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">
                  {t("reveal.aiHero.titleWithName", {
                    resource: primaryFinding.resourceName,
                  })}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t("reveal.aiHero.subtitle")}
                </p>
              </div>
              <Button
                size="sm"
                className="shrink-0 gap-1.5"
                onClick={() => {
                  posthog?.capture("scan_ai_explain_demo_clicked", {
                    rule_key: primaryFinding.ruleKey,
                    severity: primaryFinding.severity,
                    placement: "hero",
                  });
                  setExplainFinding(primaryFinding);
                }}
              >
                <Sparkles className="h-3.5 w-3.5" />
                {t("reveal.aiHero.cta")}
              </Button>
            </div>
          )}

          {/* Findings list */}
          <div>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-0.5 mb-2">
              {t("reveal.findings")}
            </h2>
            <div className="rounded-lg border border-border overflow-hidden divide-y divide-border">
              {visibleFindings.map((finding) => {
                const { dot, badge } = getSeverityColor(finding.severity);
                return (
                  <div
                    key={finding.id}
                    className="flex items-start gap-3 px-4 py-3 hover:bg-muted/30 transition-colors"
                  >
                    <span
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dot}`}
                    />
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-xs font-medium px-1.5 py-0.5 rounded ${badge}`}
                        >
                          {t(
                            `alerts:rules.severity.${finding.severity.toLowerCase()}`,
                            { defaultValue: finding.severity }
                          )}
                        </span>
                        <span className="text-xs text-muted-foreground truncate">
                          {t(`alerts:ruleLabels.${finding.ruleKey}`, {
                            defaultValue: finding.ruleKey,
                          })}
                        </span>
                      </div>
                      <p className="text-sm font-medium truncate">
                        {finding.resourceType}/{finding.resourceName}
                        {finding.vhost && finding.vhost !== "/" && (
                          <span className="text-muted-foreground ml-1">
                            ({finding.vhost})
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
            {hasMore && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs text-muted-foreground gap-1 mt-2"
                onClick={() => setShowAll((v) => !v)}
              >
                {showAll ? (
                  <>
                    <ChevronUp className="h-3.5 w-3.5" />
                    {t("reveal.collapse")}
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3.5 w-3.5" />
                    {t("reveal.showAll", { count: unresolvedFindings.length })}
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Clean-state banner (replaces findings + hero when no issues) */}
      {(isCleanFull || isCleanPartial) && (
        <div className={`w-full mb-8 [animation-delay:300ms] ${beatClass}`}>
          <div
            className={`w-full rounded-lg border px-6 py-5 text-center ${
              isCleanFull
                ? "border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/30"
                : "border-border bg-muted/30"
            }`}
          >
            <p
              className={`text-sm font-medium ${
                isCleanFull
                  ? "text-green-700 dark:text-green-300"
                  : "text-muted-foreground"
              }`}
            >
              {isCleanFull
                ? t("reveal.wellConfigured")
                : t("reveal.cleanPartial")}
            </p>
          </div>
        </div>
      )}

      {/* ── BEAT 3 (+600ms) — timeline + CTAs ───────────────────────────── */}
      <div className={`w-full [animation-delay:600ms] ${beatClass}`}>
        {/* Timeline — temporal sequence replaces parallel promise cards */}
        <div className="mb-8">
          <ol className="grid grid-cols-1 sm:grid-cols-3 gap-0 sm:gap-0 relative">
            <TimelineStep
              icon={
                <Clock className="h-3.5 w-3.5 text-amber-500" aria-hidden />
              }
              label={t("reveal.timeline.tomorrowLabel")}
              title={t("reveal.timeline.tomorrowTitle")}
              desc={t("reveal.timeline.tomorrowDesc", {
                count: queueCount ?? 0,
                queues: queueCount ?? 0,
              })}
              position="first"
            />
            <TimelineStep
              icon={
                <Bell
                  className="h-3.5 w-3.5 text-green-500 dark:text-green-400"
                  aria-hidden
                />
              }
              label={t("reveal.timeline.incidentLabel")}
              title={t("reveal.timeline.incidentTitle")}
              desc={t("reveal.timeline.incidentDesc")}
              position="middle"
            />
            <TimelineStep
              icon={
                <Route
                  className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400"
                  aria-hidden
                />
              }
              label={t("reveal.timeline.continuousLabel")}
              title={t("reveal.timeline.continuousTitle")}
              desc={t("reveal.timeline.continuousDesc")}
              position="last"
            />
          </ol>
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 w-full justify-center flex-wrap">
          {unresolvedFindings.length > 0 ? (
            <>
              <Button
                size="lg"
                className="gap-2"
                onClick={() => {
                  posthog?.capture("scan_findings_explored", {
                    findings_count: unresolvedFindings.length,
                  });
                  navigate("/alerts", { replace: true });
                }}
              >
                <AlertTriangle className="h-4 w-4" />
                {t("reveal.exploreFindings")}
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="gap-2"
                onClick={() => {
                  posthog?.capture("scan_notifications_configured", {
                    findings_count: unresolvedFindings.length,
                  });
                  navigate("/alerts?openNotificationSettings=true", {
                    replace: true,
                  });
                }}
              >
                <BellRing className="h-4 w-4" />
                {t("reveal.configureNotifications")}
              </Button>
            </>
          ) : (
            <Button
              size="lg"
              variant="outline"
              className="gap-2"
              onClick={() => {
                posthog?.capture("scan_alerts_configured", {
                  findings_count: 0,
                });
                navigate("/alerts", { replace: true });
              }}
            >
              <Settings className="h-4 w-4" />
              {t("reveal.configureAlerts")}
            </Button>
          )}
          <Button
            size="lg"
            variant={unresolvedFindings.length > 0 ? "ghost" : "default"}
            onClick={() => {
              posthog?.capture("scan_dashboard_continued", {
                findings_count: unresolvedFindings.length,
                had_findings: unresolvedFindings.length > 0,
              });
              navigate("/", { replace: true });
            }}
          >
            {t("reveal.continueDashboard")}
          </Button>
        </div>

        {/* Publisher best practices — post-CTA educational footer. Below
            the primary actions so it reads as supplementary context, not
            an alternative path. Plain paragraph (no list) until a second
            tip lands — single-item <ul> is a11y noise. */}
        <p className="mt-8 text-xs text-muted-foreground flex items-start gap-2">
          <Lightbulb
            className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5"
            aria-hidden
          />
          <span>
            <span className="font-medium text-foreground">
              {t("reveal.bestPractices.messageIdTitle")}
            </span>{" "}
            {t("reveal.bestPractices.messageIdDesc")}
          </span>
        </p>
      </div>

      <ScanRevealExplainDrawer
        finding={explainFinding}
        isDemo={explainFinding?.isExplainDemoTarget}
        onClose={() => setExplainFinding(null)}
      />
    </div>
  );
}

// ── FingerprintRow — count-up integers separated by middots ───────────────
// Extracted so the JSX above stays readable. Each non-zero count renders as
// `<CountUp> + label-from-i18n` so the animation lives at the integer only.
function FingerprintRow({
  exchangeCount,
  queueCount,
  bindingCount,
  vhostCount,
  nodeCount,
  version,
  t,
}: {
  exchangeCount?: number;
  queueCount?: number;
  bindingCount?: number;
  vhostCount?: number;
  nodeCount: number;
  version?: string;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  const items: { count: number; key: string }[] = [];
  if (exchangeCount !== undefined && exchangeCount > 0)
    items.push({ count: exchangeCount, key: "exchanges" });
  if (queueCount !== undefined && queueCount > 0)
    items.push({ count: queueCount, key: "queues" });
  if (bindingCount !== undefined && bindingCount > 0)
    items.push({ count: bindingCount, key: "bindings" });
  if (vhostCount !== undefined && vhostCount > 0)
    items.push({ count: vhostCount, key: "vhosts" });
  if (nodeCount > 0) items.push({ count: nodeCount, key: "nodes" });

  return (
    <>
      {items.map((item, idx) => {
        // Pull the singular/plural template for this count, then replace
        // the literal "{{count}}" with a CountUp component so only the
        // integer animates — labels remain stable text.
        const label = t(`reveal.fingerprint.${item.key}`, {
          count: item.count,
        });
        const [before, after] = label.split(String(item.count));
        return (
          <span key={item.key} className="inline-flex items-center gap-2">
            {idx > 0 && <span aria-hidden>·</span>}
            <span>
              {before}
              <CountUp to={item.count} />
              {after}
            </span>
          </span>
        );
      })}
      {version && (
        <span className="inline-flex items-center gap-2">
          {items.length > 0 && <span aria-hidden>·</span>}
          <span>{t("reveal.fingerprint.version", { version })}</span>
        </span>
      )}
    </>
  );
}

// ── TimelineStep — single node in the 3-step temporal sequence ────────────
function TimelineStep({
  icon,
  label,
  title,
  desc,
  position,
}: {
  icon: ReactNode;
  label: string;
  title: string;
  desc: string;
  position: "first" | "middle" | "last";
}) {
  return (
    <li className="relative flex flex-col items-start sm:items-center sm:text-center px-4 py-3 sm:py-4">
      {/* Connector line — drawn between steps on >= sm screens */}
      {position !== "last" && (
        <span
          aria-hidden
          className="hidden sm:block absolute top-[1.6rem] left-1/2 w-full h-px bg-border"
        />
      )}
      <span className="relative z-10 flex h-6 w-6 items-center justify-center rounded-full bg-background border border-border shrink-0 mb-1.5">
        {icon}
      </span>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
        {label}
      </p>
      <p className="text-sm font-medium mt-0.5">{title}</p>
      <p className="text-xs text-muted-foreground mt-0.5 max-w-[22ch]">
        {desc}
      </p>
    </li>
  );
}
