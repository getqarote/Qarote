import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import {
  AlertCircle,
  CheckCircle2,
  Infinity as InfinityIcon,
  KeyRound,
} from "lucide-react";

import { formatDate } from "@/lib/date-utils";
import { trpc } from "@/lib/trpc/client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Inline progress visual for the managed-quota row. Computes the
 * `used / cap` ratio and chooses an accent colour by zone (neutral
 * → amber at ≥80% → red at-cap). Pure presentation — no analytics
 * here, the streaming hook owns the warn/exceeded PostHog events.
 */
function ProgressBar({
  used,
  cap,
  label,
}: {
  used: number;
  cap: number;
  label: string;
}) {
  const ratio = cap === 0 ? 1 : Math.min(used / cap, 1);
  const pct = `${Math.round(ratio * 100)}%`;

  let tone: string;
  if (ratio >= 1) {
    tone = "bg-red-500 dark:bg-red-500";
  } else if (ratio >= 0.8) {
    tone = "bg-amber-500 dark:bg-amber-500";
  } else {
    tone = "bg-primary";
  }

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={Math.min(used, cap)}
      aria-valuemin={0}
      aria-valuemax={cap}
      className="h-2 w-full overflow-hidden rounded-full bg-muted"
    >
      <div
        className={`h-full rounded-full transition-all duration-300 ease-out ${tone}`}
        style={{ width: pct }}
      />
    </div>
  );
}

/**
 * Settings widget surfacing the workspace's current managed-LLM quota
 * state. Mounts at the top of the LLM settings page. Three discrete
 * states — driven by the discriminated union returned by
 * `workspace.llm.quotaCurrent`:
 *
 * - `unavailable`: the feature is off (Free plan, missing license).
 *   Hidden — nothing useful to show.
 * - `byok`: workspace pays its own provider; we don't meter. Renders a
 *   one-line "Not metered" notice so the operator knows there's no
 *   surprise cap.
 * - `managed`: full progress bar + "Resets on June 1" subtext.
 *   Unlimited (cap === null) renders an infinity glyph instead of a
 *   bar — Enterprise customers shouldn't see a number that pretends
 *   to be a limit.
 */
export function QuotaUsageWidget() {
  const { t, i18n } = useTranslation("settings");

  const { data, isLoading } = trpc.workspace.llm.quotaCurrent.useQuery(
    undefined,
    {
      // Refetch when the settings tab regains focus so the count is
      // fresh after a regenerate elsewhere. Stale-time 30s keeps the
      // tab-switch case responsive without hammering the resolver.
      staleTime: 30_000,
      refetchOnWindowFocus: true,
    }
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("llm.quota.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-2 w-full" />
          <Skeleton className="h-3 w-32" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.mode === "unavailable") return null;

  if (data.mode === "byok") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("llm.quota.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-3">
            <KeyRound
              aria-hidden
              className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0"
            />
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t("llm.quota.byok")}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // mode === "managed"
  const isUnlimited = data.cap === null;
  const remaining = isUnlimited
    ? null
    : Math.max((data.cap as number) - data.used, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("llm.quota.title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isUnlimited ? (
          <div className="flex items-center gap-2">
            <InfinityIcon
              aria-hidden
              className="h-4 w-4 text-muted-foreground"
            />
            <p className="text-sm text-foreground">
              {t("llm.quota.unlimited")}
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-sm text-foreground">
                {t("llm.quota.usageOf", {
                  used: data.used,
                  cap: data.cap,
                })}
              </p>
              <p className="text-xs text-muted-foreground tabular-nums">
                {t("llm.quota.remainingShort", { count: remaining ?? 0 })}
              </p>
            </div>
            <ProgressBar
              used={data.used}
              cap={data.cap as number}
              label={t("llm.quota.usageOf", {
                used: data.used,
                cap: data.cap,
              })}
            />
            {remaining === 0 ? (
              <p className="text-xs text-amber-800 dark:text-amber-200 flex items-start gap-1.5">
                <AlertCircle
                  aria-hidden
                  className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400"
                />
                <span>
                  {t("llm.quota.atCapAlert")}{" "}
                  <Link
                    to="/settings/subscription"
                    className="font-medium underline underline-offset-2"
                  >
                    {t("llm.quota.upgradeLink")}
                  </Link>
                </span>
              </p>
            ) : (
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <CheckCircle2 aria-hidden className="h-3 w-3" />
                {t("llm.quota.resetsOn", {
                  date: formatDate(data.resetDate, i18n.language, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  }),
                })}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
