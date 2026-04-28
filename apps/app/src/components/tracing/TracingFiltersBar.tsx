/**
 * TracingFiltersBar
 *
 * Filter inputs for the Message Tracing page.
 * State is stored in URL search params so filters survive page reload
 * and are shareable via URL.
 *
 * Params: vhost, queue, exchange, rk (routingKey), dir (direction)
 * Time range params (from, to) are passed as controlled props —
 * they are only shown in Query mode.
 *
 * Layout:
 *   Live mode  — single flat row of 5 filter controls
 *   Query mode — two labeled rows:
 *                  Row 1 "Time range": from → to
 *                  Row 2 "Filter":     vhost, queue, exchange, rk, dir + clear
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

import type { TraceDirection, TraceFilters } from "@/types/tracing";

interface TracingFiltersBarProps {
  /** Only shown in Query mode */
  showTimeRange?: boolean;
  from?: string;
  to?: string;
  onFromChange?: (value: string) => void;
  onToChange?: (value: string) => void;
}

const VALID_DIRECTIONS: TraceDirection[] = ["publish", "deliver"];

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
  showTimeRange = false,
  from,
  to,
  onFromChange,
  onToChange,
}: TracingFiltersBarProps) {
  const { t } = useTranslation("tracing");
  const [params, setParams] = useSearchParams();

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

  /** The 5 text/select filter controls — shared between both modes */
  const filterControls = (
    <>
      <Input
        placeholder={t("filter.vhost")}
        aria-label={t("filter.vhost")}
        value={params.get("vhost") ?? ""}
        onChange={(e) => set("vhost", e.target.value || undefined)}
        className="h-8 w-32 text-xs font-mono"
      />
      <Input
        placeholder={t("filter.queue")}
        aria-label={t("filter.queue")}
        value={params.get("queue") ?? ""}
        onChange={(e) => set("queue", e.target.value || undefined)}
        className="h-8 w-32 text-xs font-mono"
      />
      <Input
        placeholder={t("filter.exchange")}
        aria-label={t("filter.exchange")}
        value={params.get("exchange") ?? ""}
        onChange={(e) => set("exchange", e.target.value || undefined)}
        className="h-8 w-36 text-xs font-mono"
      />
      <Input
        placeholder={t("filter.routingKey")}
        aria-label={t("filter.routingKey")}
        value={params.get("rk") ?? ""}
        onChange={(e) => set("rk", e.target.value || undefined)}
        className="h-8 w-36 text-xs font-mono"
      />
      <Select
        value={params.get("dir") ?? "all"}
        onValueChange={(v) => set("dir", v === "all" ? undefined : v)}
      >
        <SelectTrigger
          className="h-8 w-28 text-xs"
          aria-label={t("filter.direction")}
        >
          <SelectValue placeholder={t("filter.direction")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("filter.direction.all")}</SelectItem>
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

  /* ── Live mode: single flat row ── */
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

  /* ── Query mode: two labeled groups ── */
  return (
    <div className="flex flex-col gap-2">
      {/* Row 1 — Time range (primary: defines the data window) */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-medium text-muted-foreground tracking-wide uppercase w-20 shrink-0">
          {t("filter.timeRangeLabel")}
        </span>
        <Input
          type="datetime-local"
          value={from ?? ""}
          onChange={(e) => onFromChange?.(e.target.value)}
          className="h-8 w-44 text-xs"
          aria-label={t("filter.from")}
        />
        <span className="text-xs text-muted-foreground" aria-hidden>
          →
        </span>
        <Input
          type="datetime-local"
          value={to ?? ""}
          onChange={(e) => onToChange?.(e.target.value)}
          className="h-8 w-44 text-xs"
          aria-label={t("filter.to")}
        />
      </div>

      {/* Row 2 — Attribute filters (secondary: refine within the window) */}
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
