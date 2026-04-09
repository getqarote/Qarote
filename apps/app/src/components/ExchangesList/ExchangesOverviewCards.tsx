import { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { Activity, GitBranch, Link2, Radio, Share2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import type { ExchangeTypeCounts } from "./types";

interface ExchangesOverviewCardsProps {
  totalExchanges: number | undefined;
  totalBindings: number | undefined;
  exchangeTypes: ExchangeTypeCounts | undefined;
  isLoading: boolean;
}

/**
 * The five-card stats strip above the exchanges list: total count, the
 * three primary exchange types, and total bindings. Numbers use Fragment
 * Mono + tabular-nums so all five metrics align on the same baseline
 * grid — per the "numbers are sacred" design principle.
 *
 * Icon color maps to the same semantic tokens used in the type badges,
 * so a fanout metric card and a fanout badge read as the same concept.
 */
export function ExchangesOverviewCards({
  totalExchanges,
  totalBindings,
  exchangeTypes,
  isLoading,
}: ExchangesOverviewCardsProps) {
  const { t } = useTranslation("exchanges");

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
      <MetricCard
        title={t("totalExchanges")}
        icon={<Activity className="h-4 w-4 text-muted-foreground" />}
        value={totalExchanges}
        caption={t("activeExchanges")}
        isLoading={isLoading}
      />
      <MetricCard
        title={t("direct")}
        icon={<GitBranch className="h-4 w-4 text-info" />}
        value={exchangeTypes?.direct}
        caption={t("pointToPointRouting")}
        isLoading={isLoading}
      />
      <MetricCard
        title={t("fanout")}
        icon={<Radio className="h-4 w-4 text-success" />}
        value={exchangeTypes?.fanout}
        caption={t("broadcastRouting")}
        isLoading={isLoading}
      />
      <MetricCard
        title={t("topic")}
        icon={<Share2 className="h-4 w-4 text-muted-foreground" />}
        value={exchangeTypes?.topic}
        caption={t("patternRouting")}
        isLoading={isLoading}
      />
      <MetricCard
        title={t("totalBindings")}
        icon={<Link2 className="h-4 w-4 text-muted-foreground" />}
        value={totalBindings}
        caption={t("exchangeQueueBindings")}
        isLoading={isLoading}
      />
    </div>
  );
}

/**
 * Single metric card. Intentionally lightweight — no hover/interactive
 * affordance because these are read-only indicators, not navigation.
 */
function MetricCard({
  title,
  icon,
  value,
  caption,
  isLoading,
}: {
  title: ReactNode;
  icon: ReactNode;
  value: number | undefined;
  caption: ReactNode;
  isLoading: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <div className="text-2xl font-mono tabular-nums font-semibold text-foreground">
            {(value ?? 0).toLocaleString()}
          </div>
        )}
        <p className="text-xs text-muted-foreground">{caption}</p>
      </CardContent>
    </Card>
  );
}
