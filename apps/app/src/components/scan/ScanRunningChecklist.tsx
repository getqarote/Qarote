import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { type LogEntry, ScanLogStream } from "@/components/scan/ScanLogStream";
import { DiagnosingLoader } from "@/components/ui/loaders/DiagnosingLoader";

// The point-in-time scan checklist — the same inspection steps surfaced in the
// compact add-server reveal. Lines ticking ✓ one-by-one show WHAT Qarote reads
// (it's the "product moment" talking to the broker), and reassure more than a
// bare spinner. API paths / resource words stay literal across locales.
const STEP_KEYS = [
  "scanChecklist.overview", // Reading /api/overview…
  "scanChecklist.enumerate", // Enumerating queues & exchanges…
  "scanChecklist.dlx", // Checking dead-letter exchanges…
  "scanChecklist.consumers", // Scanning consumer health…
  "scanChecklist.routing", // Evaluating exchange routing…
] as const;

const STEP_MS = 260;

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

interface ScanRunningChecklistProps {
  /**
   * Detected/entered server name, substituted into the default headline
   * (`scanningServer`). Optional when an explicit {@link title} is given.
   */
  serverName?: string;
  /**
   * Overrides the default `scanningServer` headline with a fixed string —
   * used by onboarding ("Scanning your broker…") where no server name is
   * surfaced yet. When omitted, the `serverName`-based headline is used.
   */
  title?: string;
}

/**
 * Reusable "Connecting & scanning…" body for the point-in-time scan: a
 * DiagnosingLoader reticle, the headline + "point-in-time · no warm-up" subtitle, and a
 * progressive checklist driven over {@link ScanLogStream}. Under
 * `prefers-reduced-motion` every step shows done at once (no stagger). The
 * checklist's own `aria-live` announces each step.
 */
export function ScanRunningChecklist({
  serverName,
  title,
}: ScanRunningChecklistProps) {
  const { t } = useTranslation("dashboard");
  const steps = useMemo(() => STEP_KEYS.map((key) => t(key)), [t]);

  const reduced = prefersReducedMotion();
  const [completed, setCompleted] = useState(reduced ? STEP_KEYS.length : 0);

  useEffect(() => {
    // Reduced motion: `completed` already starts at the full count, so there's
    // nothing to animate.
    if (reduced) return;
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setCompleted(i);
      if (i >= STEP_KEYS.length) window.clearInterval(id);
    }, STEP_MS);
    return () => window.clearInterval(id);
  }, [reduced]);

  const entries: LogEntry[] = steps
    .slice(0, completed)
    .map((text, i) => ({ id: String(i), text, done: true }));
  const activeText = completed < steps.length ? steps[completed] : undefined;

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-10">
      <DiagnosingLoader size={92} />
      <div className="space-y-1 text-center">
        <p className="font-mono text-sm font-medium text-foreground">
          {title ?? t("scanningServer", { name: serverName })}
        </p>
        <p className="font-mono text-xs text-muted-foreground">
          {t("scanningSubtext")}
        </p>
      </div>
      <div className="w-full max-w-xs">
        <ScanLogStream entries={entries} activeText={activeText} />
      </div>
    </div>
  );
}
