import { useTranslation } from "react-i18next";
import { Link } from "react-router";

type Tone = "calm" | "amber" | "red" | "neutral";

interface HomeStatusBannerProps {
  /** Server display name (or host) — surfaced in the calm message. */
  serverName: string;
  /**
   * Pre-computed root-finding counts (post cascade-collapse). Resolved
   * by the page so the banner stays a presentation component and is
   * decoupled from the on-the-wire severity shape (which is a loose
   * `Record<string, number>` keyed by uppercase severity).
   *
   * `null` means the diagnosis feature is unavailable for this server
   * (no plan, no license, capability missing) — render a neutral
   * "no signal" surface rather than an inaccurate "all clear".
   */
  counts: { critical: number; warning: number; total: number } | null;
  /** Loading state — render a calm skeleton, never assume "all clear". */
  isLoading: boolean;
  /**
   * Number of failed signal endpoints reported by the diagnosis API.
   * Combined with the severity counts: a critical finding still wins
   * tone-wise (the broker IS critical), but the headline/subline
   * mention the partial fetch so operators know visibility is degraded.
   */
  signalErrorCount: number;
}

/**
 * Top-of-Home status surface. Implements the `.impeccable.md` directive:
 *   « Calm baseline (healthy state) — quiet, confident, scannable. »
 *   « Sharp alerts (incident state) — unmissable without becoming hostile. »
 *
 * Four tones, picked from the root-cause counts:
 *   - calm    → 0 findings, no partial fetch
 *   - amber   → only medium/low/info findings (no critical/high)
 *   - red     → at least one critical/high finding (always wins)
 *   - neutral → diagnosis feature unavailable
 *
 * The banner never shouts during the loading window — a skeleton
 * placeholder holds the layout to avoid the "all clear → red banner"
 * flicker that would erode trust.
 *
 * The container uses `role="region"` (not `aria-live`/`role="status"`)
 * because the CTA is interactive: live regions should not contain
 * controls — screen readers re-announce the entire region on every
 * change, including focusable elements, which is hostile to keyboard
 * users.
 */
export function HomeStatusBanner({
  serverName,
  counts,
  isLoading,
  signalErrorCount,
}: HomeStatusBannerProps) {
  const { t } = useTranslation("dashboard");

  if (isLoading) {
    return (
      <div
        aria-busy="true"
        aria-label={t("home.statusBanner.loading")}
        className="h-14 rounded-lg border border-border bg-muted/30 animate-pulse"
      />
    );
  }

  const hasPartialFetch = signalErrorCount > 0;
  const isCritical = (counts?.critical ?? 0) > 0;
  const isWarning = !isCritical && (counts?.warning ?? 0) > 0;
  const totalFindings = counts?.total ?? 0;

  // Tone selection. Critical wins over partial fetch (a red broker
  // missing some signals is still a red broker). Partial fetch only
  // downgrades the *otherwise-calm* state — silence from a partial
  // fetch is not the same as "no findings".
  const tone: Tone = isCritical
    ? "red"
    : isWarning
      ? "amber"
      : hasPartialFetch || !counts
        ? "neutral"
        : "calm";

  const toneClasses: Record<Tone, string> = {
    calm: "border-border bg-success-muted/30 text-foreground",
    amber: "border-warning/30 bg-warning-muted/40 text-foreground",
    red: "border-destructive/30 bg-destructive/10 text-foreground",
    neutral: "border-border bg-muted/40 text-foreground",
  };

  const dotClasses: Record<Tone, string> = {
    calm: "bg-success",
    amber: "bg-warning",
    red: "bg-destructive",
    neutral: "bg-muted-foreground/40",
  };

  // CTA color tracks the tone so the action lives inside the same
  // visual register as the headline. Neutral foreground-on-background
  // pill in red was jarring per design review.
  const ctaClasses: Record<Tone, string> = {
    calm: "bg-foreground text-background hover:bg-foreground/90",
    amber: "bg-foreground text-background hover:bg-foreground/90",
    red: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
    neutral: "bg-foreground text-background hover:bg-foreground/90",
  };

  type Content = {
    headline: string;
    subline: string | null;
    cta: { label: string; to: string } | null;
  };

  let content: Content;
  if (isCritical || isWarning) {
    const headlineKey = isCritical
      ? "home.statusBanner.criticalHeadline"
      : "home.statusBanner.warningHeadline";
    const ctaLabelKey = isCritical
      ? "home.statusBanner.investigateNow"
      : "home.statusBanner.review";
    content = {
      headline: t(headlineKey, { count: totalFindings }),
      // When a finding is present AND signal endpoints failed, name
      // the partial fetch in the subline so the operator doesn't
      // assume the displayed count is exhaustive.
      subline: hasPartialFetch
        ? t("home.statusBanner.partialDataDetail", { count: signalErrorCount })
        : null,
      cta: { label: t(ctaLabelKey), to: "/diagnosis" },
    };
  } else if (hasPartialFetch) {
    content = {
      headline: t("home.statusBanner.partialData", { serverName }),
      subline: t("home.statusBanner.partialDataDetail", {
        count: signalErrorCount,
      }),
      cta: null,
    };
  } else if (!counts) {
    content = {
      headline: t("home.statusBanner.unavailableHeadline", { serverName }),
      subline: t("home.statusBanner.unavailableSubline"),
      cta: null,
    };
  } else {
    content = {
      headline: t("home.statusBanner.calmHeadline", { serverName }),
      subline: t("home.statusBanner.calmSubline"),
      cta: null,
    };
  }
  const { headline, subline, cta } = content;

  return (
    <div
      role="region"
      aria-label={t("home.statusBanner.regionLabel")}
      className={`flex items-center gap-4 rounded-lg border px-5 py-4 transition-colors ${toneClasses[tone]}`}
    >
      <span
        aria-hidden="true"
        className={`h-2.5 w-2.5 shrink-0 rounded-full ${dotClasses[tone]}`}
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-tight">{headline}</p>
        {subline && (
          <p className="mt-0.5 text-xs text-muted-foreground leading-tight">
            {subline}
          </p>
        )}
      </div>
      {cta && (
        <Link
          to={cta.to}
          className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${ctaClasses[tone]}`}
        >
          {cta.label}
        </Link>
      )}
    </div>
  );
}
