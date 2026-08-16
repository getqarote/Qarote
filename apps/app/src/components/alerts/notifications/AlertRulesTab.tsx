import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Search, Sparkles } from "lucide-react";
import { toast } from "sonner";

import type { AlertRule } from "@/lib/api/alertTypes";

import { getSeverityColor } from "@/components/alerts/alertUtils";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

import { useServerContext } from "@/contexts/ServerContext";

import { useAlertRules, useUpdateAlertRule } from "@/hooks/queries/useAlerts";

type RuleKind = "threshold" | "diagnostic" | "config";

const RULE_KIND_ORDER: RuleKind[] = ["threshold", "diagnostic", "config"];

const SEV_RANK: Record<string, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
  INFO: 4,
};

function getRuleKind(rule: AlertRule): RuleKind {
  if (rule.evaluator === "CONFIG" || rule.configRuleKey) return "config";
  return "threshold";
}

/**
 * Inline Alert rules tab (prototype `AlertRulesTab`). Launch surface is read +
 * on/off toggle — no threshold editor, no create. Rules are grouped by kind
 * (Threshold / Diagnostic / Config); empty kinds are hidden. Toggling is
 * optimistic with an undo toast.
 */
export function AlertRulesTab() {
  const { t } = useTranslation("alerts");
  const { selectedServerId } = useServerContext();
  const [query, setQuery] = useState("");

  const { data: rules } = useAlertRules(true);
  const toggleMutation = useUpdateAlertRule();

  const serverRules =
    rules?.filter((r) => r.serverId === selectedServerId) ?? [];
  const onCount = serverRules.filter((r) => r.enabled).length;

  const q = query.trim().toLowerCase();
  const filtered = q
    ? serverRules.filter((r) =>
        `${r.name} ${r.description ?? ""} ${getRuleKind(r)} ${r.severity}`
          .toLowerCase()
          .includes(q)
      )
    : serverRules;

  const handleToggle = (rule: AlertRule, enabled: boolean) => {
    toggleMutation.mutate(
      { id: rule.id, enabled },
      {
        onSuccess: () => {
          toast.success(
            enabled ? t("rules.toast.enabled") : t("rules.toast.disabled"),
            {
              description: rule.name,
              action: {
                label: t("rules.undo"),
                onClick: () =>
                  toggleMutation.mutate({ id: rule.id, enabled: !enabled }),
              },
            }
          );
        },
        onError: (error) =>
          toast.error(
            error instanceof Error
              ? error.message
              : t("rules.toast.updateError")
          ),
      }
    );
  };

  return (
    <div className="space-y-4">
      {/* Intent note */}
      <p className="border-l-2 border-border pl-2.5 font-mono text-[11px] leading-relaxed text-muted-foreground">
        <span className="text-primary">// intent — </span>
        {t("rules.intent")}
      </p>

      {/* Search + count */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("rules.searchPlaceholderShort")}
            className="pl-9"
            aria-label={t("rules.searchPlaceholderShort")}
          />
        </div>
        <span className="font-mono text-xs text-muted-foreground">
          {t("rules.countOn", { on: onCount, total: serverRules.length })}
        </span>
      </div>

      {/* Defaults note */}
      <div className="flex items-center gap-2 rounded-md border border-primary/30 bg-accent px-3 py-2 text-xs text-foreground/80 dark:bg-primary/10">
        <Sparkles className="h-3.5 w-3.5 shrink-0 text-primary" />
        {t("rules.defaultsNote")}
      </div>

      {filtered.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <p className="text-sm font-medium">{t("rules.noResults")}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("rules.noResultsDescription")}
          </p>
        </div>
      ) : (
        RULE_KIND_ORDER.map((kind) => {
          const group = filtered
            .filter((r) => getRuleKind(r) === kind)
            .sort((a, b) => SEV_RANK[a.severity] - SEV_RANK[b.severity]);
          if (group.length === 0) return null;
          const gOn = group.filter((r) => r.enabled).length;
          return (
            <div key={kind} className="space-y-2">
              <div className="flex items-baseline justify-between gap-3 px-1">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
                    {t(`rules.kind.${kind}`)}
                  </span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {t(`rules.kindDesc.${kind}`)}
                  </span>
                </div>
                <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                  {t("rules.groupCount", { on: gOn, total: group.length })}
                </span>
              </div>
              <div className="space-y-1.5">
                {group.map((rule) => (
                  <RuleRow
                    key={rule.id}
                    rule={rule}
                    kind={kind}
                    disabled={toggleMutation.isPending}
                    onToggle={handleToggle}
                  />
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

function RuleRow({
  rule,
  kind,
  disabled,
  onToggle,
}: {
  rule: AlertRule;
  kind: RuleKind;
  disabled: boolean;
  onToggle: (rule: AlertRule, enabled: boolean) => void;
}) {
  const { t } = useTranslation("alerts");
  const { badge } = getSeverityColor(rule.severity as never);
  const info =
    kind === "diagnostic"
      ? t("rules.selfCalibrating")
      : (rule.description ?? "");

  return (
    <div
      className={`flex items-center gap-3 rounded-md border border-border bg-card px-4 py-2.5 ${
        rule.enabled ? "" : "opacity-60"
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-foreground">{rule.name}</div>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
            {t(`rules.kind.${kind}`)}
          </span>
          <span
            className={`rounded px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide ${badge}`}
          >
            {t(`sevLabel.${rule.severity.toLowerCase()}`, {
              defaultValue: rule.severity,
            })}
          </span>
          {info && <span className="text-muted-foreground">{info}</span>}
        </div>
      </div>
      {kind === "threshold" && (
        <span
          className="hidden shrink-0 font-mono text-[10px] text-muted-foreground sm:inline"
          title={t("rules.customSoonTooltip")}
        >
          {t("rules.customSoon")}
        </span>
      )}
      <Switch
        checked={rule.enabled}
        onCheckedChange={(checked) => onToggle(rule, checked)}
        disabled={disabled}
        aria-label={
          rule.enabled
            ? t("rules.disableRule", { name: rule.name })
            : t("rules.enableRule", { name: rule.name })
        }
        className="h-4 w-7 shrink-0"
      />
    </div>
  );
}
