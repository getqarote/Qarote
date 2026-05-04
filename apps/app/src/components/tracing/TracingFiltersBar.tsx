/**
 * TracingFiltersBar
 *
 * Filter controls for the Recorded mode (firehose). Vhost, Queue and
 * Exchange are driven by live data from the broker — Select dropdowns
 * instead of free-text inputs. Routing Key stays as free text (pattern
 * matching, too many possible values to enumerate).
 *
 * State is stored in URL search params so filters survive page reload
 * and are shareable via URL.
 *
 * Params: vhost, queue, exchange, rk (routingKey), dir (direction)
 * Time range params (from, to) are controlled props — only shown in History mode.
 *
 * Layout:
 *   Stream mode  — single flat row of filter controls
 *   History mode — two labeled rows:
 *                    Row 1 "Time range": from → to
 *                    Row 2 "Filter":     vhost, queue, exchange, rk, dir + clear
 */

import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router";

import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useVHostContext } from "@/contexts/VHostContextDefinition";

import { useExchanges, useQueues } from "@/hooks/queries/useRabbitMQ";

import type { TraceDirection, TraceFilters } from "@/types/tracing";

interface TracingFiltersBarProps {
  serverId: string;
  /** Only shown in History mode */
  showTimeRange?: boolean;
  from?: string;
  to?: string;
  onFromChange?: (value: string) => void;
  onToChange?: (value: string) => void;
}

const VALID_DIRECTIONS: TraceDirection[] = ["publish", "deliver"];
const ALL_VALUE = "__all__";

// eslint-disable-next-line react-refresh/only-export-components
export function useTracingFilters(): TraceFilters {
  const [params] = useSearchParams();
  const rawDir = params.get("dir");
  const direction =
    rawDir && (VALID_DIRECTIONS as string[]).includes(rawDir)
      ? (rawDir as TraceDirection)
      : undefined;
  return {
    vhost: params.get("vhost") ?? undefined,
    queueName: params.get("queue") ?? undefined,
    exchange: params.get("exchange") ?? undefined,
    routingKey: params.get("rk") ?? undefined,
    direction,
  };
}

export function TracingFiltersBar({
  serverId,
  showTimeRange = false,
  from,
  to,
  onFromChange,
  onToChange,
}: TracingFiltersBarProps) {
  const { t } = useTranslation("tracing");
  const [params, setParams] = useSearchParams();
  const { availableVHosts } = useVHostContext();

  const vhostFilter = params.get("vhost") ?? undefined;
  const { data: queuesData } = useQueues(serverId, vhostFilter ?? null);
  const queues = queuesData?.queues ?? [];

  const { data: exchangesData } = useExchanges(serverId, vhostFilter ?? null);
  const exchanges = (exchangesData?.exchanges ?? []).filter(
    (e) => e.name !== "" && !e.name.startsWith("amq.")
  );

  const set = (key: string, value: string | undefined) => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value) next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: true }
    );
  };

  const clear = () => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        ["vhost", "queue", "exchange", "rk", "dir"].forEach((k) =>
          next.delete(k)
        );
        return next;
      },
      { replace: true }
    );
    onFromChange?.("");
    onToChange?.("");
  };

  const hasFilters =
    params.has("vhost") ||
    params.has("queue") ||
    params.has("exchange") ||
    params.has("rk") ||
    params.has("dir") ||
    from ||
    to;

  const filterControls = (
    <>
      {/* Vhost — select from available vhosts */}
      <Select
        value={params.get("vhost") ?? ALL_VALUE}
        onValueChange={(v) => set("vhost", v === ALL_VALUE ? undefined : v)}
      >
        <SelectTrigger
          className="h-8 w-32 text-xs"
          aria-label={t("filter.vhost")}
        >
          <SelectValue placeholder={t("filter.vhost")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_VALUE}>{t("filter.allVhosts")}</SelectItem>
          {availableVHosts.map((v) => (
            <SelectItem key={v.name} value={v.name}>
              <span className="font-mono">{v.name}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Queue — select from queues for the filtered vhost (or all) */}
      <Select
        value={params.get("queue") ?? ALL_VALUE}
        onValueChange={(v) => set("queue", v === ALL_VALUE ? undefined : v)}
      >
        <SelectTrigger
          className="h-8 w-36 text-xs"
          aria-label={t("filter.queue")}
        >
          <SelectValue placeholder={t("filter.queue")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_VALUE}>{t("filter.allQueues")}</SelectItem>
          {queues.map((q) => (
            <SelectItem key={`${q.vhost}/${q.name}`} value={q.name}>
              <span className="font-mono text-xs">{q.name}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Exchange — select from exchanges (excluding system exchanges) */}
      <Select
        value={params.get("exchange") ?? ALL_VALUE}
        onValueChange={(v) => set("exchange", v === ALL_VALUE ? undefined : v)}
      >
        <SelectTrigger
          className="h-8 w-36 text-xs"
          aria-label={t("filter.exchange")}
        >
          <SelectValue placeholder={t("filter.exchange")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_VALUE}>{t("filter.allExchanges")}</SelectItem>
          {exchanges.map((e) => (
            <SelectItem key={`${e.vhost}/${e.name}`} value={e.name}>
              <span className="font-mono text-xs">{e.name}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Routing Key — free text (pattern matching, not enumerable) */}
      <Input
        placeholder={t("filter.routingKey")}
        aria-label={t("filter.routingKey")}
        value={params.get("rk") ?? ""}
        onChange={(e) => set("rk", e.target.value || undefined)}
        className="h-8 w-36 text-xs font-mono"
      />

      {/* Direction */}
      <Select
        value={params.get("dir") ?? ALL_VALUE}
        onValueChange={(v) => set("dir", v === ALL_VALUE ? undefined : v)}
      >
        <SelectTrigger
          className="h-8 w-28 text-xs"
          aria-label={t("filter.direction")}
        >
          <SelectValue placeholder={t("filter.direction")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_VALUE}>{t("filter.direction.all")}</SelectItem>
          <SelectItem value="publish">
            {t("filter.direction.publish")}
          </SelectItem>
          <SelectItem value="deliver">
            {t("filter.direction.deliver")}
          </SelectItem>
        </SelectContent>
      </Select>
    </>
  );

  /* ── Stream mode: single flat row ── */
  if (!showTimeRange) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        {filterControls}
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs"
            onClick={clear}
          >
            <X className="w-3 h-3 mr-1" />
            {t("filter.clear")}
          </Button>
        )}
      </div>
    );
  }

  /* ── History mode: two labeled groups ── */
  return (
    <div className="flex flex-col gap-2">
      {/* Row 1 — Time range */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-medium text-muted-foreground tracking-wide uppercase w-20 shrink-0">
          {t("filter.timeRangeLabel")}
        </span>
        <Input
          type="datetime-local"
          value={from ?? ""}
          onChange={(e) => onFromChange?.(e.target.value)}
          className="h-8 w-52"
          aria-label={t("filter.from")}
        />
        <span className="text-xs text-muted-foreground" aria-hidden>
          →
        </span>
        <Input
          type="datetime-local"
          value={to ?? ""}
          onChange={(e) => onToChange?.(e.target.value)}
          className="h-8 w-52"
          aria-label={t("filter.to")}
        />
      </div>

      {/* Row 2 — Attribute filters */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-medium text-muted-foreground tracking-wide uppercase w-20 shrink-0">
          {t("filter.filterLabel")}
        </span>
        {filterControls}
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs"
            onClick={clear}
          >
            <X className="w-3 h-3 mr-1" />
            {t("filter.clear")}
          </Button>
        )}
      </div>
    </div>
  );
}
