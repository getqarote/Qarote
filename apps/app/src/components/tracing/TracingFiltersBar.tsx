/**
 * TracingFiltersBar
 *
 * Filter controls for the Recorded mode (firehose). Vhost, Queue and
 * Exchange are driven by live data from the broker — Select dropdowns
 * instead of free-text inputs. Routing Key stays as free text (pattern
 * matching, too many possible values to enumerate).
 *
 * State is stored in URL search params (via nuqs) so filters survive
 * page reload and are shareable via URL.
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

import { useState } from "react";
import { useTranslation } from "react-i18next";

import { AlertTriangle, X } from "lucide-react";
import { parseAsString, parseAsStringEnum, useQueryStates } from "nuqs";

import { TRACE_RETENTION_DAYS } from "@/lib/tracingConfig";

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

const VALID_DIRECTIONS = ["publish", "deliver"] as const;
const ALL_VALUE = "__all__";

const tracingFiltersParsers = {
  vhost: parseAsString,
  queue: parseAsString,
  exchange: parseAsString,
  rk: parseAsString,
  dir: parseAsStringEnum<TraceDirection>([...VALID_DIRECTIONS]),
};

const tracingFiltersOptions = {
  history: "replace" as const,
  clearOnDefault: true,
};

// eslint-disable-next-line react-refresh/only-export-components
export function useTracingFilters(): TraceFilters {
  const [params] = useQueryStates(tracingFiltersParsers, tracingFiltersOptions);
  return {
    vhost: params.vhost ?? undefined,
    queueName: params.queue ?? undefined,
    exchange: params.exchange ?? undefined,
    routingKey: params.rk ?? undefined,
    direction: params.dir ?? undefined,
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
  const [filters, setFilters] = useQueryStates(
    tracingFiltersParsers,
    tracingFiltersOptions
  );
  const { availableVHosts } = useVHostContext();

  // Mount-time retention floor. useState's lazy initializer is the
  // documented escape hatch for "read wall-clock once" — Date.now()
  // during render directly is flagged as impure, but a lazy init
  // function runs exactly once per component instance. Drift over a
  // long-lived session is negligible for a 7-day-window UX hint.
  // Hooked before the early return so call order stays stable.
  const [retentionFloorMs] = useState(
    () => Date.now() - TRACE_RETENTION_DAYS * 24 * 60 * 60 * 1000
  );

  const { data: queuesData } = useQueues(serverId, filters.vhost ?? null);
  const queues = queuesData?.queues ?? [];

  const { data: exchangesData } = useExchanges(serverId, filters.vhost ?? null);
  const exchanges = (exchangesData?.exchanges ?? []).filter(
    (e) => e.name !== "" && !e.name.startsWith("amq.")
  );

  const clear = () => {
    setFilters(null);
    onFromChange?.("");
    onToChange?.("");
  };

  const hasFilters =
    filters.vhost !== null ||
    filters.queue !== null ||
    filters.exchange !== null ||
    filters.rk !== null ||
    filters.dir !== null ||
    Boolean(from) ||
    Boolean(to);

  const filterControls = (
    <>
      {/* Vhost — select from available vhosts */}
      <Select
        value={filters.vhost ?? ALL_VALUE}
        onValueChange={(v) => setFilters({ vhost: v === ALL_VALUE ? null : v })}
      >
        <SelectTrigger
          className="h-8 min-w-32 w-auto text-xs"
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
        value={filters.queue ?? ALL_VALUE}
        onValueChange={(v) => setFilters({ queue: v === ALL_VALUE ? null : v })}
      >
        <SelectTrigger
          className="h-8 min-w-36 w-auto text-xs"
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
        value={filters.exchange ?? ALL_VALUE}
        onValueChange={(v) =>
          setFilters({ exchange: v === ALL_VALUE ? null : v })
        }
      >
        <SelectTrigger
          className="h-8 min-w-36 w-auto text-xs"
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
        value={filters.rk ?? ""}
        onChange={(e) => setFilters({ rk: e.target.value || null })}
        className="h-8 w-36 text-xs font-mono"
      />

      {/* Direction */}
      <Select
        value={filters.dir ?? ALL_VALUE}
        onValueChange={(v) =>
          setFilters({
            dir: v === ALL_VALUE ? null : (v as TraceDirection),
          })
        }
      >
        <SelectTrigger
          className="h-8 min-w-28 w-auto text-xs"
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
  // Validation for the time range. Two failure modes are surfaced to the
  // user in a single hint line:
  //   1. from > to — the query would return no rows; flag immediately.
  //   2. from < (now − retention) — the query is valid but the older
  //      portion of the range falls outside the configured retention
  //      window, so the result will be incomplete. We don't block the
  //      query; the user just gets an honest signal that they're asking
  //      for something the backend can't fully serve.
  const fromMs = from ? Date.parse(from) : NaN;
  const toMs = to ? Date.parse(to) : NaN;
  const rangeInverted =
    Number.isFinite(fromMs) && Number.isFinite(toMs) && fromMs > toMs;
  const exceedsRetention =
    Number.isFinite(fromMs) && fromMs < retentionFloorMs && !rangeInverted;
  const validationKey = rangeInverted
    ? "filter.rangeInverted"
    : exceedsRetention
      ? "filter.rangeExceedsRetention"
      : null;

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
          // Cap `from` at the current `to` so the picker can't produce an
          // inverted range; we still validate at runtime in case the user
          // types directly.
          max={to ?? undefined}
          onChange={(e) => onFromChange?.(e.target.value)}
          className="h-8 w-52"
          aria-label={t("filter.from")}
          // aria-invalid only on the *error* (inverted range) — exceeding
          // retention is a warning that doesn't break the query, so it
          // stays in aria-describedby without flagging the field invalid.
          aria-invalid={rangeInverted ? true : undefined}
          aria-describedby={validationKey ? "tracing-range-error" : undefined}
        />
        <span className="text-xs text-muted-foreground" aria-hidden>
          →
        </span>
        <Input
          type="datetime-local"
          value={to ?? ""}
          // Floor `to` at the current `from` so the picker can't produce
          // an inverted range.
          min={from ?? undefined}
          onChange={(e) => onToChange?.(e.target.value)}
          className="h-8 w-52"
          aria-label={t("filter.to")}
          aria-invalid={rangeInverted ? true : undefined}
          aria-describedby={validationKey ? "tracing-range-error" : undefined}
        />
      </div>

      {/* Validation hint — always-mounted live region so NVDA + Firefox
          (which can miss announcements when the live region is added to
          the DOM with content already in it) reliably picks up content
          changes. The container is rendered on every paint; only its
          inner content and visibility toggle with validationKey. */}
      <p
        id="tracing-range-error"
        role="status"
        aria-live="polite"
        className={
          validationKey
            ? "flex items-start gap-1.5 text-xs text-warning"
            : "sr-only"
        }
      >
        {validationKey && (
          <>
            <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" aria-hidden />
            <span>
              {validationKey === "filter.rangeExceedsRetention"
                ? t(validationKey, { days: TRACE_RETENTION_DAYS })
                : t(validationKey)}
            </span>
          </>
        )}
      </p>

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
