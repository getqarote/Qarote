import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

import { AlertTriangle } from "lucide-react";

import { track } from "@/lib/analytics";

import type { QuotaPayload } from "@/hooks/ui/useStreamingExplain";

/**
 * Workspace-scoped localStorage key for the 24h suppression window — once a
 * user has dismissed (or just seen) the 80% pill for this workspace, we
 * stop emitting `llm_quota_warned_80pct` PostHog events for it for 24h so
 * the funnel isn't drowned by repeat warnings.
 *
 * The pill itself stays visible as long as the workspace is near-cap; only
 * the analytics event is debounced.
 */
const POSTHOG_DEBOUNCE_KEY = (workspaceId: string) =>
  `qarote:llm_quota_80pct_seen:${workspaceId}`;
const POSTHOG_DEBOUNCE_MS = 24 * 60 * 60 * 1000;

interface QuotaProgressPillProps {
  quota: QuotaPayload | null;
  /** Workspace id — used to scope the PostHog suppression window. */
  workspaceId: string;
  /** PostHog feature tag of the surrounding stream. */
  feature: string;
}

/**
 * Discreet "X left this month" pill that surfaces near-cap state without
 * stealing the operator's attention. Renders ONLY when:
 *
 * - the workspace is on a capped plan (`quota.cap !== null`)
 * - usage is at-or-above 80% AND strictly below 100%
 *
 * The mid-render `null` return is intentional — the pill is a passive
 * indicator, not a controlled component. Callers can always render
 * `<QuotaProgressPill quota={...} ... />` and trust this to disappear
 * when the conditions aren't met.
 *
 * The visible-once-per-day PostHog event lets us measure "did the
 * warning land?" without the noise of the same user opening five
 * drawers in a row.
 */
export function QuotaProgressPill({
  quota,
  workspaceId,
  feature,
}: QuotaProgressPillProps) {
  const { t } = useTranslation("scan");
  const trackedRef = useRef(false);

  const cap = quota?.cap;
  const used = quota?.used ?? 0;
  const visible =
    cap !== null && cap !== undefined && used >= cap * 0.8 && used < cap;
  const remaining =
    visible && cap !== null && cap !== undefined ? cap - used : 0;

  useEffect(() => {
    if (!visible || trackedRef.current) return;
    try {
      const stored = window.localStorage.getItem(
        POSTHOG_DEBOUNCE_KEY(workspaceId)
      );
      const seenAt = stored ? Number.parseInt(stored, 10) : 0;
      const now = Date.now();
      if (Number.isFinite(seenAt) && now - seenAt < POSTHOG_DEBOUNCE_MS) {
        // Already fired this within the last 24h for this workspace.
        trackedRef.current = true;
        return;
      }
      track("llm_quota_warned_80pct", {
        feature,
        used,
        cap,
      });
      window.localStorage.setItem(
        POSTHOG_DEBOUNCE_KEY(workspaceId),
        String(now)
      );
    } catch {
      // localStorage unavailable (private browsing, quota exceeded) — fire
      // the event once per session so we don't lose the signal entirely.
      track("llm_quota_warned_80pct", { feature, used, cap });
    }
    trackedRef.current = true;
  }, [visible, used, cap, feature, workspaceId]);

  if (!visible) return null;

  return (
    <span
      role="status"
      aria-live="polite"
      className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/60 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-200"
    >
      <AlertTriangle aria-hidden className="h-3 w-3" />
      {t("explain.quota.pillRemaining", { count: remaining })}
    </span>
  );
}
