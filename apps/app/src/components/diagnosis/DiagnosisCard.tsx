import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { usePostHog } from "@posthog/react";
import { ChevronRight, ExternalLink, ThumbsDown, ThumbsUp } from "lucide-react";
import { Line, LineChart, ResponsiveContainer, Tooltip } from "recharts";

import { formatRelativeAgo } from "@/lib/formatRelativeAgo";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

import type { DiagnosisRuleType } from "./DiagnosisRuleBadge";
import { DiagnosisRuleBadge } from "./DiagnosisRuleBadge";
import { RecommendationText } from "./RecommendationText";
import { formatCitationLabel, RULE_CITATIONS } from "./ruleCitations";

interface TimelinePoint {
  timestamp: string;
  messages: number;
  consumerCount: number;
  // publishRate / consumeRate are sent by the API but not rendered in the
  // mini-chart — leave them out of the interface until a line is added.
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
}

const SEVERITY_BADGE: Record<string, string> = {
  CRITICAL: "bg-destructive text-destructive-foreground",
  HIGH: "bg-orange-500 text-white",
  MEDIUM: "bg-yellow-500 text-black",
  LOW: "bg-muted text-muted-foreground border border-border",
  INFO: "bg-blue-500/10 text-blue-700 border border-blue-500/20 dark:text-blue-400",
};

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
}: DiagnosisCardProps) {
  const { t } = useTranslation("diagnosis");
  const posthog = usePostHog();
  const [feedbackVote, setFeedbackVote] = useState<"up" | "down" | null>(null);
  const badgeClass =
    SEVERITY_BADGE[severity] ?? "bg-muted text-muted-foreground";

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
        {citationUrl && (
          <Collapsible>
            <CollapsibleTrigger className="group inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <ChevronRight className="h-3 w-3 transition-transform group-data-[state=open]:rotate-90" />
              {t("card.whyThisDiagnosis")}
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 pl-4 border-l-2 border-border text-xs space-y-1">
              <p className="text-muted-foreground">{t("card.citationIntro")}</p>
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

        {supersededBy && (
          <p className="text-xs text-muted-foreground italic">
            {t("card.causedBy")}:{" "}
            <span className="font-mono not-italic">{supersededBy}</span>
          </p>
        )}

        {/* Feedback thumbs — one vote per card, fires PostHog
            `diagnosis_feedback` so we can drive the Tier C decisions
            (ship | reject | needs more research) on real signal. */}
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
