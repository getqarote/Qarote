import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { DiagnosisCard } from "@/components/diagnosis/DiagnosisCard";

import type { useDiagnosis } from "@/hooks/queries/useDiagnosis";

/**
 * Source the per-finding shape from the actual hook return rather than
 * re-declaring it here. A wire-contract change in the incident API
 * surfaces as a TS error at this call site instead of silently
 * drifting through casts.
 */
type DiagnosisItem = NonNullable<
  NonNullable<ReturnType<typeof useDiagnosis>["data"]>["diagnoses"]
>[number];

interface HomeActiveConcernsProps {
  diagnoses: readonly DiagnosisItem[] | undefined;
  isFetched: boolean;
  /**
   * Capped to keep the Home calm even on a noisy broker. Surplus is
   * funneled to /diagnosis via a "view all" link rather than a wall of
   * cards that defeats the calm-baseline emotional goal.
   */
  maxVisible?: number;
}

const DEFAULT_MAX_VISIBLE = 3;

/**
 * "Active concerns" zone of the Home. Surfaces the **root** diagnosis
 * findings (post cascade-collapse) using the same `<DiagnosisCard>` the
 * /diagnosis page renders, so the Home and the dedicated page speak the
 * same visual language.
 *
 * Rendering rules:
 *   - Loading or feature-unavailable → render nothing (status banner
 *     is the source of truth for that state)
 *   - 0 root findings → render nothing (the calm banner above already
 *     said "all quiet" — repeating it here would be padding)
 *   - 1+ findings → render up to `maxVisible`, with "view all" if more
 */
export function HomeActiveConcerns({
  diagnoses,
  isFetched,
  maxVisible = DEFAULT_MAX_VISIBLE,
}: HomeActiveConcernsProps) {
  const { t } = useTranslation("dashboard");

  if (!isFetched || !diagnoses) return null;

  // Root findings only — superseded ones are symptoms; the user's eye
  // should land on the cause, not the cascade.
  const roots = diagnoses.filter((d) => !d.supersededBy);
  if (roots.length === 0) return null;

  const visible = roots.slice(0, maxVisible);
  const overflow = Math.max(0, roots.length - visible.length);

  return (
    <section
      aria-labelledby="home-active-concerns-heading"
      className="space-y-3"
    >
      <div className="flex items-baseline justify-between">
        <h2
          id="home-active-concerns-heading"
          className="title-section text-foreground"
        >
          {t("home.activeConcerns.heading")}
        </h2>
        <Link
          to="/diagnosis"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {overflow > 0
            ? t("home.activeConcerns.viewAllWithOverflow", { count: overflow })
            : t("home.activeConcerns.viewAll")}
        </Link>
      </div>
      <div className="space-y-3">
        {visible.map((d) => (
          <div
            key={`${d.rule}-${d.scope}-${d.queueName}-${d.vhost}-${d.detectedAt}`}
          >
            <DiagnosisCard
              rule={d.rule}
              severity={d.severity}
              scope={d.scope}
              queueName={d.queueName}
              vhost={d.vhost}
              description={d.description}
              recommendation={d.recommendation}
              timeline={d.timeline}
              detectedAt={d.detectedAt}
              supersededBy={d.supersededBy}
              firstSeenAt={d.firstSeenAt}
            />
            <div className="flex justify-end mt-1.5">
              <Link
                to="/diagnosis"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {t("home.activeConcerns.openInDiagnosis")} →
              </Link>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
