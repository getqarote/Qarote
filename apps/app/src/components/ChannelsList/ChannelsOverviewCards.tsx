import { useTranslation } from "react-i18next";

import { AlertTriangle, CheckCircle, XCircle } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";

import type { ChannelListItem } from "./types";

type StateFilter = "running" | "idle" | "blocked" | "flow" | null;

interface ChannelsOverviewCardsProps {
  totalChannels: number | undefined;
  channels: ChannelListItem[];
  isLoading: boolean;
  activeFilter: StateFilter;
  onStateFilter: (state: StateFilter) => void;
}

export function ChannelsOverviewCards({
  totalChannels,
  channels,
  isLoading,
  activeFilter,
  onStateFilter,
}: ChannelsOverviewCardsProps) {
  const { t } = useTranslation("channels");

  if (isLoading) {
    return <Skeleton className="h-5 w-72" />;
  }

  const total = totalChannels ?? 0;
  const nonRunning = channels.filter(
    (c) => c.state && c.state.toLowerCase() !== "running"
  );
  const nonRunningCount = nonRunning.length;
  const uniqueConnections = new Set(
    channels.map((c) => c.connection_details.name)
  ).size;

  // Dominant non-running state for pill click target
  const dominantNonRunningState = (() => {
    if (nonRunningCount === 0) return null;
    const counts: Record<string, number> = {};
    nonRunning.forEach((c) => {
      const s = c.state.toLowerCase();
      counts[s] = (counts[s] ?? 0) + 1;
    });
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
    const VALID_FILTERS = new Set<string>([
      "running",
      "idle",
      "blocked",
      "flow",
    ]);
    return VALID_FILTERS.has(top) ? (top as StateFilter) : null;
  })();

  let pillClass: string;
  let PillIcon: typeof CheckCircle;
  let pillText: string;

  if (total === 0) {
    pillClass = "bg-muted text-muted-foreground border border-border";
    PillIcon = CheckCircle;
    pillText = t("noActiveChannels");
  } else if (nonRunningCount === 0) {
    pillClass = "bg-success/10 text-success border border-success/20";
    PillIcon = CheckCircle;
    pillText = t("allRunning");
  } else if (nonRunningCount < total) {
    pillClass = "bg-warning/10 text-warning border border-warning/20";
    PillIcon = AlertTriangle;
    pillText = t("nNonRunning", { count: nonRunningCount });
  } else {
    pillClass =
      "bg-destructive/10 text-destructive border border-destructive/20";
    PillIcon = XCircle;
    pillText = t("nNonRunning", { count: nonRunningCount });
  }

  const isFilterable = dominantNonRunningState !== null;
  const isActive = activeFilter === dominantNonRunningState;

  const handlePillClick = () => {
    if (!isFilterable) return;
    onStateFilter(isActive ? null : dominantNonRunningState);
  };

  return (
    <div className="flex items-center flex-wrap gap-x-3 gap-y-1.5 text-sm text-muted-foreground py-0.5">
      {isFilterable ? (
        <button
          type="button"
          onClick={handlePillClick}
          aria-pressed={isActive}
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold border cursor-pointer hover:opacity-80 transition-opacity ${pillClass} ${isActive ? "ring-2 ring-offset-1 ring-current" : ""}`}
          title={t("filterByState")}
        >
          <PillIcon className="h-3 w-3" aria-hidden="true" />
          {pillText}
        </button>
      ) : (
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold border ${pillClass}`}
        >
          <PillIcon className="h-3 w-3" aria-hidden="true" />
          {pillText}
        </span>
      )}
      <span className="font-mono tabular-nums font-semibold text-foreground">
        {total.toLocaleString()}
      </span>
      <span>{t(total === 1 ? "channel" : "channels")}</span>
      {total > 0 && (
        <>
          <span className="select-none text-border">·</span>
          <span className="font-mono tabular-nums font-semibold text-foreground">
            {uniqueConnections.toLocaleString()}
          </span>
          <span>
            {t(uniqueConnections === 1 ? "connection" : "connections")}
          </span>
        </>
      )}
    </div>
  );
}
