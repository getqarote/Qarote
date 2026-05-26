import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { usePostHog } from "@posthog/react";
import DOMPurify from "dompurify";
import {
  AlertCircle,
  ChevronRight,
  ExternalLink,
  Loader2,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  X,
} from "lucide-react";
import { marked } from "marked";
import { Line, LineChart, ResponsiveContainer, Tooltip } from "recharts";

import { findingKey } from "@/lib/findingKey";
import { formatRelativeAgo } from "@/lib/formatRelativeAgo";

import { ExplanationActions } from "@/components/llm/ExplanationActions";
import { QuotaExceededCard } from "@/components/llm/QuotaExceededCard";
import { QuotaProgressPill } from "@/components/llm/QuotaProgressPill";
import { ScanLogStream } from "@/components/scan/ScanLogStream";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

import { useStreamingExplain } from "@/hooks/ui/useStreamingExplain";
import { useUser } from "@/hooks/ui/useUser";
import { useWorkspace } from "@/hooks/ui/useWorkspace";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";

import { UserPlan } from "@/types/plans";

import type { DiagnosisRuleType } from "./DiagnosisRuleBadge";
import { DiagnosisRuleBadge } from "./DiagnosisRuleBadge";
import { RecommendationText } from "./RecommendationText";
import { formatCitationLabel, RULE_CITATIONS } from "./ruleCitations";

interface TimelinePoint {
  timestamp: string;
  messages: number;
  consumerCount: number;
  publishRate: number;
  consumeRate: number;
}

interface DiagnosisCardProps {
  rule: DiagnosisRuleType;
  severity: string;
  /**
   * Discriminator for queue-scoped vs broker-scoped findings.
   * Mirrors `IncidentDiagnosis.scope` on the backend (`apps/api/src/
   * ee/services/incident/incident.interfaces.ts`). Replaces the old
   * `queueName === "#cluster"` sentinel: a queue named exactly
   * `#cluster` in vhost `/` was a real (if bounded) collision risk.
   */
  scope: "queue" | "broker";
  queueName: string;
  vhost: string;
  description: string;
  recommendation: string;
  timeline: TimelinePoint[];
  detectedAt: string;
  /** Set when another rule's firing is the documented cause. */
  supersededBy?: DiagnosisRuleType;
  /** ISO-8601 — set after the dedup pass observes the finding. */
  firstSeenAt?: string;
  /**
   * UUID of the persisted IncidentDiagnosisRecord. When present, the LLM
   * explain request sends only this ID and the server builds the prompt
   * itself. When absent (dryRun / first cycle), the explain button is hidden.
   */
  findingId?: string;
  /** When true, opens the explain panel immediately on mount (deep-link). */
  defaultExplainOpen?: boolean;
}

const SEVERITY_BADGE: Record<string, string> = {
  CRITICAL: "bg-destructive text-destructive-foreground",
  HIGH: "bg-orange-500 text-white",
  MEDIUM: "bg-yellow-500 text-black",
  LOW: "bg-muted text-muted-foreground border border-border",
  INFO: "bg-blue-500/10 text-blue-700 border border-blue-500/20 dark:text-blue-400",
};

const DOMPURIFY_CONFIG: Parameters<typeof DOMPurify.sanitize>[1] = {
  ALLOWED_TAGS: [
    "p",
    "strong",
    "em",
    "ul",
    "ol",
    "li",
    "code",
    "pre",
    "blockquote",
    "h3",
  ],
  ALLOWED_ATTR: [],
};

function renderMarkdown(text: string): string {
  return DOMPurify.sanitize(
    marked.parse(text, { async: false }),
    DOMPURIFY_CONFIG
  );
}

export function DiagnosisCard({
  rule,
  severity,
  scope,
  queueName,
  vhost,
  description,
  recommendation,
  timeline,
  detectedAt,
  supersededBy,
  firstSeenAt,
  findingId,
  defaultExplainOpen = false,
}: DiagnosisCardProps) {
  const { t } = useTranslation("diagnosis");
  const posthog = usePostHog();
  const { userPlan } = useUser();
  const { workspace } = useWorkspace();
  const { hasFeature } = useFeatureFlags();
  const [feedbackVote, setFeedbackVote] = useState<"up" | "down" | null>(null);
  const [explainOpen, setExplainOpen] = useState(defaultExplainOpen);
  const [explainVote, setExplainVote] = useState<"up" | "down" | null>(null);
  const {
    text,
    isStreaming,
    steps,
    error,
    explanationId,
    quotaExceeded,
    quotaStatus,
    stream,
    reset,
  } = useStreamingExplain();
  // At most one step is in-flight at a time (the hook marks priors done on
  // each new step), so the first not-done step is the active one.
  const activeStep = steps.find((s) => !s.done);

  // Explain is only available when the finding has been persisted (findingId
  // present), the user is on a paid plan, AND the AI Explain feature is
  // licensed. The feature check (defense-in-depth, matching the backend
  // license gate in llm.router) is what keeps the premium AI layer EE-only
  // now that diagnosis detection itself is free (CE/EE split). First-cycle
  // findings (no id yet) show the button once the next poll persists the id.
  const canExplain =
    !!findingId &&
    (userPlan === UserPlan.DEVELOPER || userPlan === UserPlan.ENTERPRISE) &&
    hasFeature("ai_explain_inline");

  const workspaceId = workspace?.id;

  const startExplainStream = (regenerate = false) => {
    // canExplain guards entitlement: a deep link from a free user must not
    // trigger a stream that the server would reject with 403.
    if (!workspaceId || !findingId || !canExplain) return;
    reset();
    // Clear the prior session's vote so the thumbs UI is interactive again
    // for the fresh explanation.
    setExplainVote(null);
    void stream({
      workspaceId,
      feature: "explain_finding",
      findingId,
      regenerate,
    });
  };

  useEffect(() => {
    if (!explainOpen || !workspaceId || !findingId || !canExplain) return;
    startExplainStream();
    return () => reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [explainOpen, workspaceId, findingId, canExplain]);

  const handleExplainClick = () => {
    if (posthog && !explainOpen) {
      posthog.capture("llm_explain_requested", {
        feature: "explain_finding",
        ruleId: rule,
        severity,
        scope,
        queueName,
        vhost,
      });
    }
    if (explainOpen) {
      // Closing the panel: cancel any in-flight stream so the user isn't
      // billed for tokens they will never see, and so a late chunk cannot
      // re-open the panel via state updates.
      reset();
      setExplainVote(null);
    }
    setExplainOpen((v) => !v);
  };

  const handleExplainVote = (vote: "up" | "down") => {
    if (explainVote !== null) return;
    setExplainVote(vote);
    if (posthog) {
      posthog.capture("ai_explain_rated", {
        feature: "explain_finding",
        vote,
        ruleId: rule,
        severity,
        queueName,
        vhost,
      });
    }
  };

  const badgeClass =
    SEVERITY_BADGE[severity] ?? "bg-muted text-muted-foreground";

  // Use the shared findingKey helper so the panel id matches the list-level
  // React key — both prefer the persisted UUID and fall back to a
  // fully-qualified composite (scope+vhost+rule+queueName+detectedAt) when
  // findingId is still pending on first cycle. Prefix with "explain-panel-" so
  // the DOM id is unambiguous across all uses of findingKey.
  const panelId = `explain-panel-${findingKey({ id: findingId, rule, scope, queueName, vhost, detectedAt })}`;

  // Broker-scoped findings (alarms, flow-control, channel leak) carry
  // empty queueName/vhost on the wire. The discriminator is the
  // backend's `scope` field; consumers MUST gate on it instead of
  // inspecting queueName for a sentinel.
  const isClusterScoped = scope === "broker";

  // Citation derived from the static rule -> URL map (mirrors the
  // backend allowlist). `undefined` for new rules not yet wired here.
  const citationUrl = RULE_CITATIONS[rule] as string | undefined;

  const chartData = timeline.map((p) => ({
    t: new Date(p.timestamp).getTime(),
    messages: p.messages,
    consumers: p.consumerCount,
  }));

  const sendFeedback = (vote: "up" | "down") => {
    if (feedbackVote !== null) return; // one vote per card
    setFeedbackVote(vote);
    if (posthog) {
      posthog.capture("diagnosis_feedback", {
        ruleId: rule,
        vote,
        severity,
        queueName,
        vhost,
      });
    }
  };

  // Cards superseded by another rule's firing are visually subordinate
  // — operators still see them (recovery verification), but the eye
  // lands on the cause first.
  const containerClass = supersededBy
    ? "rounded-lg border border-border bg-card overflow-hidden opacity-70"
    : "rounded-lg border border-border bg-card overflow-hidden";

  return (
    <div className={containerClass}>
      <div className="flex items-start gap-3 px-4 py-3 bg-muted/20 border-b border-border">
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <DiagnosisRuleBadge rule={rule} />
            <span
              className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-sm ${badgeClass}`}
            >
              {t(`severity.${severity.toLowerCase()}`)}
            </span>
            {/* Rule ID surfaced as a muted monospace tag — operators
                grep their runbooks for these; the rules-sourcing plan
                explicitly calls this out as a quality-of-life feature. */}
            <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono rounded-sm bg-muted/60 text-muted-foreground">
              {rule}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatRelativeAgo(detectedAt, t("justNow"))}
            </span>
            {firstSeenAt &&
              // Render "open since" only when the finding has been
              // observed long enough ago that the relative-time
              // string carries information. The reviewer flagged the
              // previous strict-equality check as always-true (server
              // and client clocks generate distinct ISO strings even
              // for "just inserted" rows). 60-second threshold is the
              // minimum useful duration — anything below renders as
              // "just now" and matches detectedAt anyway.
              Date.now() - new Date(firstSeenAt).getTime() >= 60_000 && (
                <span className="text-xs text-muted-foreground">
                  <span aria-hidden="true">·</span> {t("card.openSince")}{" "}
                  {formatRelativeAgo(firstSeenAt, t("justNow"))}
                </span>
              )}
          </div>
          <p className="text-sm font-medium text-foreground truncate">
            {isClusterScoped ? (
              t("clusterScope")
            ) : (
              <>
                {queueName}
                {vhost !== "/" && (
                  <span className="ml-1 text-xs font-normal text-muted-foreground">
                    ({vhost})
                  </span>
                )}
              </>
            )}
          </p>
        </div>
        {/* Broker-scoped findings (#cluster sentinel) point at the
            whole cluster, not a queue — don't render a "View queue"
            link that would 404. */}
        {!isClusterScoped && (
          <Link
            to={`/queues/${encodeURIComponent(queueName)}?vhost=${encodeURIComponent(vhost || "/")}`}
            className="text-xs text-primary hover:underline shrink-0"
          >
            {t("card.viewQueue")}
          </Link>
        )}
      </div>

      <div className="px-4 py-3 space-y-3">
        <p className="text-sm text-foreground">{description}</p>
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">
            {t("card.recommendation")}:
          </span>{" "}
          <RecommendationText text={recommendation} />
        </p>

        {/* "Why this diagnosis?" — Radix Collapsible disclosure with
            citation link. Hidden by default to avoid pushing the
            recommendation below the fold on mobile (rules-sourcing
            plan UX requirement). */}
        {/* Context expansion zone — citation and AI explain share the same job */}
        <div className="flex items-start gap-3 flex-wrap">
          {citationUrl && (
            <Collapsible className="flex-1">
              <CollapsibleTrigger className="group inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <ChevronRight className="h-3 w-3 transition-transform group-data-[state=open]:rotate-90" />
                {t("card.whyThisDiagnosis")}
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 pl-4 border-l-2 border-border text-xs space-y-1">
                <p className="text-muted-foreground">
                  {t("card.citationIntro")}
                </p>
                <a
                  href={citationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  {formatCitationLabel(citationUrl)}
                  <ExternalLink
                    className="h-3 w-3"
                    aria-label={t("card.opensInNewTab")}
                  />
                </a>
              </CollapsibleContent>
            </Collapsible>
          )}
          {canExplain && (
            <button
              type="button"
              onClick={handleExplainClick}
              // Stay clickable while streaming so the user can close/cancel
              // the panel mid-stream. Only block while the panel is closed
              // and a stream is somehow still in flight (defensive).
              disabled={isStreaming && !explainOpen}
              aria-expanded={explainOpen}
              aria-controls={panelId}
              aria-label={`${t("card.explain")} ${rule}`}
              className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs rounded-sm border transition-colors ${
                explainOpen
                  ? "bg-primary/20 border-primary/40 text-primary"
                  : "bg-primary/10 border-primary/30 text-primary hover:bg-primary/20 hover:border-primary/40"
              } disabled:opacity-50`}
            >
              {isStreaming ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : explainOpen ? (
                <X className="h-3 w-3" />
              ) : (
                <Sparkles className="h-3 w-3" />
              )}
              {t("card.explain")}
            </button>
          )}
        </div>

        {/* Streaming LLM explanation panel — canExplain gate prevents
            non-entitled users from seeing the panel via deep links. */}
        {explainOpen && canExplain && (
          <div
            id={panelId}
            className="rounded-md border border-border bg-muted/30 px-4 py-3"
          >
            <div className="flex items-center justify-between gap-3 mb-2">
              {workspaceId && (
                <QuotaProgressPill
                  quota={quotaStatus}
                  workspaceId={workspaceId}
                  feature="explain_finding"
                />
              )}
              <ExplanationActions
                explanationId={explanationId}
                content={text}
                disabled={isStreaming || !!quotaExceeded}
                feature="explain_finding"
                onRegenerate={() => startExplainStream(true)}
              />
            </div>
            {quotaExceeded ? (
              <QuotaExceededCard
                quota={quotaExceeded}
                feature="explain_finding"
                billingHref="/settings/subscription"
                llmSettingsHref="/settings/llm"
              />
            ) : error && !text ? (
              <div className="space-y-2">
                <p
                  className="flex items-center gap-1.5 text-xs text-destructive"
                  role="alert"
                >
                  <AlertCircle
                    className="h-3.5 w-3.5 shrink-0"
                    aria-hidden="true"
                  />
                  {t("card.explainError")}
                </p>
                <button
                  type="button"
                  onClick={() => startExplainStream()}
                  className="inline-flex items-center gap-1.5 px-2 py-1 text-xs rounded-sm border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
                >
                  {t("card.retry")}
                </button>
              </div>
            ) : !text && isStreaming ? (
              <ScanLogStream
                announce={false}
                entries={steps
                  .filter((s) => s.done)
                  .map((s) => ({ id: s.id, text: t(s.i18nKey), done: true }))}
                activeText={
                  activeStep ? t(activeStep.i18nKey) : t("card.explaining")
                }
              />
            ) : text ? (
              <>
                <div
                  className="text-sm text-foreground leading-relaxed [&_p]:mb-2 [&_p:last-child]:mb-0 [&_strong]:font-semibold [&_code]:font-mono [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_ul]:list-disc [&_ul]:pl-4 [&_ul]:space-y-1 [&_li]:text-sm [&_h3]:font-semibold [&_h3]:mt-3 [&_h3]:mb-1"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(text) }}
                />
                {/* ai_explain_rated — one vote per explain session, resets on close */}
                <div className="flex items-center gap-2 mt-3 pt-2 border-t border-border/40">
                  <span className="text-xs text-muted-foreground">
                    {t("card.explainHelpful")}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleExplainVote("up")}
                    disabled={explainVote !== null}
                    aria-label={t("card.helpfulYes")}
                    className={`inline-flex h-5 w-5 items-center justify-center rounded-sm border transition-colors ${
                      explainVote === "up"
                        ? "bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400"
                        : "border-border text-muted-foreground hover:text-foreground disabled:opacity-50"
                    }`}
                  >
                    <ThumbsUp className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExplainVote("down")}
                    disabled={explainVote !== null}
                    aria-label={t("card.helpfulNo")}
                    className={`inline-flex h-5 w-5 items-center justify-center rounded-sm border transition-colors ${
                      explainVote === "down"
                        ? "bg-destructive/10 border-destructive/30 text-destructive"
                        : "border-border text-muted-foreground hover:text-foreground disabled:opacity-50"
                    }`}
                  >
                    <ThumbsDown className="h-3 w-3" />
                  </button>
                </div>
              </>
            ) : null}
          </div>
        )}

        {supersededBy && (
          <p className="text-xs text-muted-foreground italic">
            {t("card.causedBy")}:{" "}
            <span className="font-mono not-italic">{supersededBy}</span>
          </p>
        )}

        {/* Feedback thumbs — one vote per card */}
        <div className="flex items-center gap-2 pt-1">
          <span className="text-xs text-muted-foreground">
            {t("card.helpfulPrompt")}
          </span>
          <button
            type="button"
            onClick={() => sendFeedback("up")}
            disabled={feedbackVote !== null}
            aria-label={t("card.helpfulYes")}
            title={t("card.helpfulYes")}
            className={`inline-flex h-6 w-6 items-center justify-center rounded-sm border transition-colors ${
              feedbackVote === "up"
                ? "bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400"
                : "border-border text-muted-foreground hover:text-foreground disabled:opacity-50"
            }`}
          >
            <ThumbsUp className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={() => sendFeedback("down")}
            disabled={feedbackVote !== null}
            aria-label={t("card.helpfulNo")}
            title={t("card.helpfulNo")}
            className={`inline-flex h-6 w-6 items-center justify-center rounded-sm border transition-colors ${
              feedbackVote === "down"
                ? "bg-destructive/10 border-destructive/30 text-destructive"
                : "border-border text-muted-foreground hover:text-foreground disabled:opacity-50"
            }`}
          >
            <ThumbsDown className="h-3 w-3" />
          </button>
        </div>

        {timeline.length >= 3 && (
          <div className="h-[60px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div className="rounded border border-border bg-popover px-2 py-1 text-xs shadow">
                        {payload
                          .filter(
                            (p) =>
                              p != null && p.dataKey != null && p.value != null
                          )
                          .map((p) => (
                            <div key={String(p.dataKey)}>
                              {p.dataKey}: {p.value}
                            </div>
                          ))}
                      </div>
                    );
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="messages"
                  stroke="hsl(var(--primary))"
                  dot={false}
                  strokeWidth={1.5}
                />
                <Line
                  type="monotone"
                  dataKey="consumers"
                  stroke="hsl(var(--muted-foreground))"
                  dot={false}
                  strokeWidth={1}
                  strokeDasharray="3 3"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
