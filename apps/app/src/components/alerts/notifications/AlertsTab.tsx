import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { toast } from "sonner";

import { RabbitMQAlertSeverity } from "@/lib/api/alertTypes";

import { getSeverityAccent } from "@/components/alerts/alertUtils";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { HappyRabbit } from "@/components/HappyRabbit";
import { AlertsListSkeleton } from "@/components/skeletons/AlertsListSkeleton";
import { Button } from "@/components/ui/button";

import {
  useAcknowledgeAlert,
  useAlertNotificationSettings,
  useRabbitMQAlerts,
  useReopenAlert,
  useResolveAlert,
  useResolvedAlerts,
  useSnoozeAlert,
} from "@/hooks/queries/useAlerts";
import { useBrowserNotifications } from "@/hooks/ui/useBrowserNotifications";
import { useDelayedLoading } from "@/hooks/ui/useDelayedLoading";
import { useWorkspace } from "@/hooks/ui/useWorkspace";

import {
  type AlertAction,
  AlertDetailDrawer,
  type SnoozeDuration,
} from "./AlertDetailDrawer";
import {
  activeAlertToVM,
  activeCount,
  activeCountsBySeverity,
  type AlertVM,
  type AlertVMStatus,
  filterAndSort,
  groupBySeverity,
  resolvedAlertToVM,
  SEV_FILTERS,
} from "./alertViewModel";

const PAGE = 5;
// Pull a generous window so the client owns severity-tabs + grouping +
// pagination (matching the prototype). Real workspaces carry few open alerts.
const FETCH_LIMIT = 200;

interface AlertsTabProps {
  serverId: string;
  vhost: string;
  canManage: boolean;
}

type Override = { status?: AlertVMStatus; hidden?: boolean };

export function AlertsTab({ serverId, vhost, canManage }: AlertsTabProps) {
  const { t } = useTranslation("alerts");
  const { workspace } = useWorkspace();

  const { data: activeData, isLoading: activeLoading } = useRabbitMQAlerts(
    serverId,
    vhost,
    { limit: FETCH_LIMIT, offset: 0, enabled: true }
  );
  const { data: resolvedData } = useResolvedAlerts(serverId, vhost, {
    limit: FETCH_LIMIT,
    offset: 0,
    enabled: true,
  });
  // Anti-flash skeleton: paint a placeholder only once the initial feed load
  // outlives ~180ms, so cached/instant loads never flash.
  const showSkeleton = useDelayedLoading(activeLoading && !activeData);

  const { data: notificationSettings } = useAlertNotificationSettings(true);
  useBrowserNotifications(activeData?.alerts, {
    enabled: notificationSettings?.settings?.browserNotificationsEnabled,
    severities:
      notificationSettings?.settings?.browserNotificationSeverities || [],
  });

  const acknowledge = useAcknowledgeAlert();
  const resolve = useResolveAlert();
  const reopen = useReopenAlert();
  const snooze = useSnoozeAlert();
  const isMutating =
    acknowledge.isPending ||
    resolve.isPending ||
    reopen.isPending ||
    snooze.isPending;

  const [showResolved, setShowResolved] = useState(false);
  const [sevFilter, setSevFilter] = useState<RabbitMQAlertSeverity | "all">(
    "all"
  );
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<Record<string, Override>>({});
  const [confirmBulk, setConfirmBulk] = useState(false);

  const serverName = activeData?.alerts?.[0]?.serverName ?? "";

  // Normalize both feeds, apply optimistic overrides, drop hidden (snoozed).
  const alerts = useMemo<AlertVM[]>(() => {
    const base = [
      ...(activeData?.alerts ?? []).map(activeAlertToVM),
      ...(resolvedData?.alerts ?? []).map((a) =>
        resolvedAlertToVM(a, serverName)
      ),
    ];
    return base
      .map((a) => {
        const o = overrides[a.id];
        return o?.status ? { ...a, status: o.status } : a;
      })
      .filter((a) => !overrides[a.id]?.hidden);
  }, [activeData, resolvedData, serverName, overrides]);

  const counts = useMemo(() => activeCountsBySeverity(alerts), [alerts]);
  const totalActive = useMemo(() => activeCount(alerts), [alerts]);
  const resolvedTotal = useMemo(
    () => alerts.filter((a) => a.status === "resolved").length,
    [alerts]
  );

  const sorted = useMemo(
    () => filterAndSort(alerts, { showResolved, severity: sevFilter }),
    [alerts, showResolved, sevFilter]
  );
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE));
  const pageClamped = Math.min(page, totalPages);
  const paged = sorted.slice((pageClamped - 1) * PAGE, pageClamped * PAGE);
  const groups = useMemo(() => groupBySeverity(paged), [paged]);

  const openAlert = openId
    ? (alerts.find((a) => a.id === openId) ?? null)
    : null;

  const setOverride = (id: string, value: Override) =>
    setOverrides((prev) => ({ ...prev, [id]: { ...prev[id], ...value } }));
  const clearOverride = (id: string) =>
    setOverrides((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });

  const runAction = (
    id: string,
    action: AlertAction,
    duration?: SnoozeDuration
  ) => {
    if (!workspace?.id) return;
    const base = { serverId, workspaceId: workspace.id, alertId: id };
    const onError = () => {
      clearOverride(id);
      toast.error(t("lifecycle.toast.error"));
    };
    if (action === "claim") {
      setOverride(id, { status: "ack" });
      acknowledge.mutate(base, {
        onSuccess: () => toast.success(t("lifecycle.toast.acknowledged")),
        onError,
      });
    } else if (action === "resolve") {
      setOverride(id, { status: "resolved" });
      resolve.mutate(base, {
        onSuccess: () => toast.success(t("lifecycle.toast.resolved")),
        onError,
      });
    } else if (action === "reopen") {
      setOverride(id, { status: "active" });
      reopen.mutate(base, {
        onSuccess: () => toast.success(t("lifecycle.toast.reopened")),
        onError,
      });
    } else if (action === "snooze" && duration) {
      setOverride(id, { hidden: true });
      snooze.mutate(
        { ...base, duration },
        {
          onSuccess: () => toast.success(t("lifecycle.toast.snoozed")),
          onError,
        }
      );
    }
    setSelected((s) => s.filter((x) => x !== id));
  };

  const handleDrawerAction = (
    id: string,
    action: AlertAction,
    duration?: SnoozeDuration
  ) => {
    runAction(id, action, duration);
    setOpenId(null);
  };

  const bulkClaim = () => {
    selected.forEach((id) => runAction(id, "claim"));
  };
  const bulkResolve = () => {
    selected.forEach((id) => runAction(id, "resolve"));
    setConfirmBulk(false);
  };

  // ── Loading (anti-flash) ──────────────────────────────────────────────
  if (activeLoading && !activeData) {
    return showSkeleton ? (
      <div className="p-4">
        <AlertsListSkeleton />
      </div>
    ) : null;
  }

  // ── Empty state ───────────────────────────────────────────────────────
  if (totalActive === 0 && !showResolved) {
    return (
      <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
        <div className="text-muted-foreground">
          <HappyRabbit />
        </div>
        <h3 className="font-heading text-lg font-semibold text-foreground">
          {t("active.noneTitle")}
        </h3>
        <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
          {t("active.noneDescChannels")}
        </p>
        {resolvedTotal > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setShowResolved(true);
              setPage(1);
            }}
          >
            {t("active.showResolvedCount", { count: resolvedTotal })}
          </Button>
        )}
      </div>
    );
  }

  const sevTabs: Array<RabbitMQAlertSeverity | "all"> = ["all", ...SEV_FILTERS];

  return (
    <div className="space-y-3 p-4">
      {/* Severity summary (prototype `.sevsummary`) — big numbers in a card */}
      <div
        className="flex flex-wrap items-baseline gap-x-7 gap-y-2 rounded-lg border border-border bg-card px-5 py-4"
        aria-live="polite"
      >
        <SummaryStat value={totalActive} label={t("alerts")} />
        {SEV_FILTERS.filter((s) => s !== RabbitMQAlertSeverity.INFO).map(
          (s) => (
            <SummaryStat
              key={s}
              value={counts[s]}
              label={t(`summary.severity.${s.toLowerCase()}`)}
            />
          )
        )}
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div
          className="inline-flex flex-wrap gap-1 rounded-full border border-border bg-secondary p-[3px]"
          role="group"
          aria-label={t("filter.bySeverity")}
        >
          {sevTabs.map((s) => {
            const on = sevFilter === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setSevFilter(s);
                  setPage(1);
                }}
                aria-pressed={on}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  on
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {s === "all"
                  ? t("filter.all")
                  : t(`sevLabel.${s.toLowerCase()}`)}
              </button>
            );
          })}
        </div>
        <span className="flex-1" />
        <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
          <button
            type="button"
            role="switch"
            aria-checked={showResolved}
            aria-label={t("scan.showResolved")}
            onClick={() => {
              setShowResolved((v) => !v);
              setPage(1);
            }}
            className={`relative h-4 w-7 rounded-full transition-colors ${
              showResolved ? "bg-primary" : "bg-muted-foreground/30"
            }`}
          >
            <span
              className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-transform ${
                showResolved ? "translate-x-3.5" : "translate-x-0.5"
              }`}
            />
          </button>
          {t("scan.showResolved")}
        </label>
      </div>

      {/* Bulk bar */}
      {selected.length > 0 && (
        <div
          className="sticky top-0 z-10 flex items-center gap-3 rounded-md border border-border bg-secondary px-3 py-2"
          aria-live="polite"
        >
          <b className="text-sm">
            {t("bulk.selectedCount", { count: selected.length })}
          </b>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              disabled={isMutating}
              onClick={bulkClaim}
            >
              {t("lifecycle.acknowledge")}
            </Button>
            <Button
              size="sm"
              disabled={isMutating}
              onClick={() => setConfirmBulk(true)}
            >
              {t("lifecycle.resolve")}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelected([])}>
              {t("bulk.clear")}
            </Button>
          </div>
        </div>
      )}

      {/* List */}
      {sorted.length === 0 ? (
        <div className="px-6 py-12 text-center text-sm text-muted-foreground">
          {t("filter.noneForFilter")}
        </div>
      ) : (
        groups.map(([sev, list]) => (
          <div key={sev} className="space-y-1.5">
            <div className="flex items-center gap-2 pt-1 text-xs font-semibold text-muted-foreground">
              <span
                className={`h-2 w-2 rounded-full ${getSeverityAccent(sev).bg}`}
                aria-hidden="true"
              />
              {t(`sevLabel.${sev.toLowerCase()}`)} · {list.length}
            </div>
            {list.map((a) => (
              <AlertRow
                key={a.id}
                alert={a}
                canManage={canManage}
                selected={selected.includes(a.id)}
                disabled={isMutating}
                onSelectChange={(checked) =>
                  setSelected((s) =>
                    checked ? [...s, a.id] : s.filter((x) => x !== a.id)
                  )
                }
                onOpen={() => setOpenId(a.id)}
                onAction={runAction}
              />
            ))}
          </div>
        ))
      )}

      {/* Pagination */}
      {sorted.length > PAGE && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button
            variant="ghost"
            size="sm"
            disabled={pageClamped <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            ← {t("pager.prev")}
          </Button>
          <span className="font-mono text-xs text-muted-foreground">
            {t("pager.range", {
              from: (pageClamped - 1) * PAGE + 1,
              to: Math.min(pageClamped * PAGE, sorted.length),
              total: sorted.length,
            })}
          </span>
          <Button
            variant="ghost"
            size="sm"
            disabled={pageClamped >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            {t("pager.next")} →
          </Button>
        </div>
      )}

      <AlertDetailDrawer
        alert={openAlert}
        canManage={canManage}
        pending={isMutating}
        onClose={() => setOpenId(null)}
        onAction={handleDrawerAction}
      />

      <ConfirmDialog
        open={confirmBulk}
        onOpenChange={setConfirmBulk}
        tone="danger"
        title={t("bulk.confirmResolveTitle")}
        body={t("bulk.confirmResolveBody", { count: selected.length })}
        confirmLabel={t("lifecycle.resolve")}
        onConfirm={bulkResolve}
      />
    </div>
  );
}

interface AlertRowProps {
  alert: AlertVM;
  canManage: boolean;
  selected: boolean;
  disabled: boolean;
  onSelectChange: (checked: boolean) => void;
  onOpen: () => void;
  onAction: (id: string, action: AlertAction) => void;
}

function AlertRow({
  alert,
  canManage,
  selected,
  disabled,
  onSelectChange,
  onOpen,
  onAction,
}: AlertRowProps) {
  const { t } = useTranslation("alerts");
  const accent = getSeverityAccent(alert.severity);
  const stop = (e: React.MouseEvent) => e.stopPropagation();

  const statusKey =
    alert.status === "ack"
      ? "ack"
      : alert.status === "resolved"
        ? "resolved"
        : "active";

  // Resolved rows have a first→resolved range + duration; active rows just the
  // first-seen clock (the feed doesn't track a separate last-seen/duration).
  const metaTime =
    alert.status === "resolved" && alert.resolvedAt
      ? `${fmtClock(alert.firstSeen)} → ${fmtClock(alert.resolvedAt)}${
          alert.durationMs != null
            ? ` · ${fmtDurationShort(alert.durationMs)}`
            : ""
        }`
      : fmtClock(alert.firstSeen);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className={`flex cursor-pointer items-center gap-3 rounded-md border border-l-[3px] border-border ${accent.border} bg-card px-4 py-3.5 transition-colors hover:border-foreground/20 ${
        alert.status === "ack" ? "opacity-[0.82]" : ""
      } ${alert.status === "resolved" ? "bg-secondary opacity-60" : ""} ${
        selected ? "border-primary ring-2 ring-accent" : ""
      }`}
    >
      {canManage && alert.status !== "resolved" && (
        <span onClick={stop} className="flex shrink-0 items-center">
          <input
            type="checkbox"
            checked={selected}
            onChange={(e) => onSelectChange(e.target.checked)}
            aria-label={t("bulk.selectRow", { title: alert.title })}
            className="h-3.5 w-3.5 accent-primary"
          />
        </span>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 truncate text-sm font-semibold text-foreground">
          <span className="truncate">{alert.title}</span>
          {alert.resource !== "—" && (
            <code className="shrink-0 font-mono text-xs text-accent-foreground">
              {alert.resource}
            </code>
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 font-mono text-[11px] text-muted-foreground">
          <span>{alert.serverName}</span>
          <span className="opacity-50">·</span>
          <span>{alert.vhost}</span>
          <span className="opacity-50">·</span>
          <span>{metaTime}</span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <span
          className={`rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide ${STATUS_PILL[statusKey]}`}
        >
          {t(`status.${statusKey}`)}
        </span>
        {canManage && (
          <div onClick={stop} className="flex items-center gap-1.5">
            {alert.status === "ack" && alert.acknowledgedAt && (
              <span className="hidden font-mono text-[11px] text-muted-foreground sm:inline">
                {fmtClock(alert.acknowledgedAt)}
              </span>
            )}
            {alert.status === "active" && (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  disabled={disabled}
                  onClick={() => onAction(alert.id, "claim")}
                  title={t("lifecycle.claimTooltip")}
                >
                  {t("lifecycle.acknowledge")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  disabled={disabled}
                  onClick={() => onAction(alert.id, "resolve")}
                  title={t("lifecycle.resolveTooltip")}
                >
                  {t("lifecycle.resolve")}
                </Button>
              </>
            )}
            {alert.status === "ack" && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                disabled={disabled}
                onClick={() => onAction(alert.id, "resolve")}
                title={t("lifecycle.resolveTooltip")}
              >
                {t("lifecycle.resolve")}
              </Button>
            )}
            {alert.status === "resolved" && (
              <Button
                variant="secondary"
                size="sm"
                className="h-7 px-2 text-xs"
                disabled={disabled}
                onClick={() => onAction(alert.id, "reopen")}
                title={t("lifecycle.reopenTooltip")}
              >
                {t("lifecycle.reopen")}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** Outline status pills (prototype `.status-badge--*`). */
const STATUS_PILL: Record<"active" | "ack" | "resolved", string> = {
  active: "border-destructive/40 bg-destructive/10 text-destructive",
  ack: "border-warning/40 bg-warning/10 text-warning",
  resolved: "border-success/40 bg-success/10 text-success",
};

function fmtClock(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function fmtDurationShort(ms: number): string {
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem ? `${hours}h ${rem}m` : `${hours}h`;
}

/** A single big-number stat in the severity summary card. */
function SummaryStat({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="font-heading text-2xl font-bold text-foreground">
        {value}
      </span>
      <span className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
    </div>
  );
}
