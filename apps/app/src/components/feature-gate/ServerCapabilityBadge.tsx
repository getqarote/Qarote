/**
 * Compact badge surfacing a server's RabbitMQ version + how many of the
 * capability-gated features are ready on that broker. Hovers / clicks
 * open a Radix Popover with the per-feature breakdown.
 *
 * Touch-safe by design — Popover (not a hover-only Tooltip) so mobile
 * users can tap the badge to see the breakdown.
 *
 * **Zero predicate logic here**: the backend computes
 * `featureReadiness: { feature, ready }[]` inside `getCapabilities` and
 * the badge just renders it. Adding a new capability-gated feature
 * happens entirely in `gate.config.ts:badgeReadiness` — no frontend
 * change required.
 */

import { useTranslation } from "react-i18next";

import {
  CheckCircle2,
  MinusCircle,
  ServerCog,
  ShieldAlert,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { useCapabilities } from "@/hooks/queries/useCapabilities";

interface ServerCapabilityBadgeProps {
  serverId: string;
  /** Optional class for outer wrapping (alignment in tables, etc.). */
  className?: string;
}

export function ServerCapabilityBadge({
  serverId,
  className,
}: ServerCapabilityBadgeProps) {
  const { t } = useTranslation("gate");
  const { data, isLoading } = useCapabilities(serverId);

  // Skeleton while loading — keeps layout stable in lists.
  if (isLoading) {
    return (
      <Badge
        variant="outline"
        className={className}
        aria-label={t("badge.loading")}
      >
        <ServerCog className="mr-1 h-3 w-3 animate-pulse" aria-hidden />
        <span className="text-[10px]">…</span>
      </Badge>
    );
  }

  // Query errored (404 / network) — go silent rather than show a
  // misleading state. The query owner surfaces the error elsewhere.
  if (!data) return null;

  const featureReadiness = data.featureReadiness ?? [];

  // No snapshot yet — show "Pending" without claiming readiness.
  if (!data.snapshot) {
    return (
      <Badge variant="outline" className={className}>
        <ShieldAlert
          className="mr-1 h-3 w-3 text-muted-foreground"
          aria-hidden
        />
        <span className="text-[10px]">{t("badge.pending")}</span>
      </Badge>
    );
  }

  const versionLine = formatVersionLine(data.version, data.productName);
  const readyCount = featureReadiness.filter((f) => f.ready).length;

  // Defensive empty-state — every backend deploy that ships at least
  // one `badgeReadiness` entry will have a non-empty list. If a
  // contributor strips them all, render the version-only chip instead
  // of an awkward "0/0 ready".
  if (featureReadiness.length === 0) {
    return (
      <Badge
        variant="outline"
        className={className}
        aria-label={versionLine ?? t("badge.unknownVersion")}
      >
        <ServerCog className="mr-1 h-3 w-3" aria-hidden />
        <span className="text-[10px] font-medium">
          {versionLine ?? t("badge.unknownVersion")}
        </span>
      </Badge>
    );
  }

  const summary = t("badge.summary", {
    version: versionLine ?? t("badge.unknownVersion"),
    count: readyCount,
    total: featureReadiness.length,
  });

  return (
    <Popover>
      {/* Trigger is a real <button> so Enter/Space activate the popover
          natively. The Badge is purely visual inside it. */}
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={summary}
          className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Badge variant="outline" className={className}>
            <ServerCog className="mr-1 h-3 w-3" aria-hidden />
            <span className="text-[10px] font-medium">{summary}</span>
          </Badge>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(16rem,calc(100vw-2rem))]" align="start">
        <div className="space-y-2">
          {/* `versionLine` is null before the capability cron's first
              successful poll. Fall back to the unknown-version label
              so the popover header is never blank. */}
          <p className="text-sm font-medium">
            {versionLine ?? t("badge.unknownVersion")}
          </p>
          <ul className="space-y-1">
            {featureReadiness.map((f) => (
              <li key={f.feature} className="flex items-center gap-2 text-xs">
                {f.ready ? (
                  <CheckCircle2
                    className="h-3 w-3 text-green-600"
                    aria-hidden
                  />
                ) : (
                  <MinusCircle
                    className="h-3 w-3 text-muted-foreground"
                    aria-hidden
                  />
                )}
                {/* Status announced for SR users via visually-hidden
                    suffix — strikethrough is a sighted-only signal. */}
                <span
                  className={
                    f.ready ? "" : "text-muted-foreground line-through"
                  }
                >
                  {t(`features.${f.feature}`, { defaultValue: f.feature })}
                </span>
                <span className="sr-only">
                  {f.ready
                    ? t("badge.featureReady")
                    : t("badge.featureUnavailable")}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function formatVersionLine(
  version: string | null,
  productName: string | null
): string | null {
  if (!version && !productName) return null;
  if (!version) return productName;
  if (!productName) return version;
  return `${productName} ${version}`;
}
