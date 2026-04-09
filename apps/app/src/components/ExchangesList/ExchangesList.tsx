import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Activity, Shuffle } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { ExchangeRow } from "./ExchangeRow";
import {
  ExchangeTypeFilter,
  type ExchangeTypeFilterValue,
} from "./ExchangeTypeFilter";
import type { ExchangeListItem } from "./types";

/**
 * Exchange names are only unique within a vhost, so we key rows on the
 * composite `${vhost}:${name}`. The original page had `key={name}` which
 * caused React duplicate-key warnings and incorrect expand/collapse
 * state whenever two vhosts both had `amq.fanout`.
 */
function exchangeKey(exchange: ExchangeListItem): string {
  return `${exchange.vhost}:${exchange.name}`;
}

interface ExchangesListProps {
  exchanges: ExchangeListItem[];
  isLoading: boolean;
  typeFilter: ExchangeTypeFilterValue;
  onTypeFilterChange: (value: ExchangeTypeFilterValue) => void;
  onDelete?: (exchange: ExchangeListItem) => void;
  isDeleting?: boolean;
}

/**
 * Card-wrapped list of exchanges with a type-filter tab bar in the
 * header. Handles three render states:
 *   - loading  → five row-shaped skeletons
 *   - empty    → friendly explanation (general or type-specific)
 *   - populated → collapsible `ExchangeRow` for each exchange
 *
 * Expansion state is owned here (a local `Set<string>` keyed by exchange
 * name) rather than in the page, because which rows are open is pure
 * presentation state — the page shouldn't care.
 */
export function ExchangesList({
  exchanges,
  isLoading,
  typeFilter,
  onTypeFilterChange,
  onDelete,
  isDeleting,
}: ExchangesListProps) {
  const { t } = useTranslation("exchanges");
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

  const toggleExpanded = (key: string, isOpen: boolean) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (isOpen) {
        next.add(key);
      } else {
        next.delete(key);
      }
      return next;
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <CardTitle className="title-section flex items-center gap-2">
            <Shuffle className="h-5 w-5" aria-hidden="true" />
            {t("exchangesTitle")}
          </CardTitle>
          <ExchangeTypeFilter
            value={typeFilter}
            onChange={onTypeFilterChange}
          />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        ) : exchanges.length === 0 ? (
          <EmptyState typeFilter={typeFilter} />
        ) : (
          <div className="space-y-4">
            {exchanges.map((exchange) => {
              const key = exchangeKey(exchange);
              return (
                <ExchangeRow
                  key={key}
                  exchange={exchange}
                  isOpen={expandedKeys.has(key)}
                  onOpenChange={(open) => toggleExpanded(key, open)}
                  onDelete={onDelete ? () => onDelete(exchange) : undefined}
                  isDeleting={isDeleting}
                />
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EmptyState({ typeFilter }: { typeFilter: ExchangeTypeFilterValue }) {
  const { t } = useTranslation("exchanges");
  const isAll = typeFilter === "all";

  return (
    <div className="text-center py-8">
      <Activity
        className="h-16 w-16 text-muted-foreground mx-auto mb-4"
        aria-hidden="true"
      />
      <h3 className="text-lg font-semibold text-foreground mb-2">
        {isAll
          ? t("noExchangesFound")
          : t("noExchangesOfType", { type: typeFilter })}
      </h3>
      <p className="text-muted-foreground">
        {isAll
          ? t("noExchangesDesc")
          : t("noExchangesOfTypeDesc", { type: typeFilter })}
      </p>
    </div>
  );
}
