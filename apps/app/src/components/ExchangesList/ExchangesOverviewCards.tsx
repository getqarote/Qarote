import { useTranslation } from "react-i18next";

import { Skeleton } from "@/components/ui/skeleton";

import type { ExchangeTypeCounts } from "./types";

interface ExchangesOverviewCardsProps {
  totalExchanges: number | undefined;
  totalBindings: number | undefined;
  exchangeTypes: ExchangeTypeCounts | undefined;
  isLoading: boolean;
}

/**
 * A single stat line summarising the exchange topology above the list.
 * Renders as: "13 exchanges — 4 direct · 3 fanout · 4 topic · 21 bindings"
 *
 * Numbers use Fragment Mono. Type labels carry the same semantic colours
 * as the type badges in the list below — so the colours are connective,
 * not decorative. The separator characters (— and ·) are muted so the
 * numbers and labels carry the weight.
 *
 * No cards. No chrome. If the numbers are healthy, nothing competes for
 * attention. If they're not, the operator is already looking at the list.
 */
export function ExchangesOverviewCards({
  totalExchanges,
  totalBindings,
  exchangeTypes,
  isLoading,
}: ExchangesOverviewCardsProps) {
  const { t } = useTranslation("exchanges");

  if (isLoading) {
    return <Skeleton className="h-5 w-80" />;
  }

  return (
    <div className="flex items-center flex-wrap gap-x-1.5 gap-y-1 text-sm text-muted-foreground py-0.5">
      <span className="font-mono tabular-nums font-semibold text-foreground">
        {(totalExchanges ?? 0).toLocaleString()}
      </span>
      <span>{t("exchangesTitle").toLowerCase()}</span>

      <span className="mx-0.5 select-none">—</span>

      <span className="font-mono tabular-nums font-semibold text-foreground">
        {(exchangeTypes?.direct ?? 0).toLocaleString()}
      </span>
      <span className="font-medium text-info">{t("direct").toLowerCase()}</span>

      <span className="select-none">·</span>

      <span className="font-mono tabular-nums font-semibold text-foreground">
        {(exchangeTypes?.fanout ?? 0).toLocaleString()}
      </span>
      <span className="font-medium text-success">
        {t("fanout").toLowerCase()}
      </span>

      <span className="select-none">·</span>

      <span className="font-mono tabular-nums font-semibold text-foreground">
        {(exchangeTypes?.topic ?? 0).toLocaleString()}
      </span>
      <span className="font-medium">{t("topic").toLowerCase()}</span>

      <span className="select-none">·</span>

      <span className="font-mono tabular-nums font-semibold text-foreground">
        {(totalBindings ?? 0).toLocaleString()}
      </span>
      <span>{t("bindings").toLowerCase()}</span>
    </div>
  );
}
