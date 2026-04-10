import { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { Activity, ArrowUpDown, Filter, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

import { getExchangeIcon, getExchangeTypeBadgeClass } from "./exchangeTypeUi";
import type { ExchangeBinding, ExchangeListItem } from "./types";

interface ExchangeRowProps {
  exchange: ExchangeListItem;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Admins can delete exchanges. When undefined, the delete button is
   * hidden entirely rather than shown disabled — a ghosted trash can in
   * the expanded pane would be noise for non-admin operators who still
   * use the expanded details for read-only inspection.
   */
  onDelete?: () => void;
  isDeleting?: boolean;
}

/**
 * A single exchange in the list, rendered as a `Collapsible` Radix
 * primitive so the whole header row is keyboard-operable via Enter
 * and Space without any hand-rolled key handlers.
 *
 * The expanded pane shows:
 *   - A two-column details grid (configuration on the left, message
 *     stats on the right)
 *   - The delete button (admin only)
 *   - The bindings list when the exchange has any
 *
 * All numeric values use Fragment Mono + tabular-nums. All string IDs
 * (user_who_performed_action, binding routing keys, argument payloads)
 * also use mono since they're identifiers, not prose.
 */
export function ExchangeRow({
  exchange,
  isOpen,
  onOpenChange,
  onDelete,
  isDeleting,
}: ExchangeRowProps) {
  const { t } = useTranslation("exchanges");

  const displayName = exchange.name || `(${t("common:default")})`;

  return (
    <Collapsible open={isOpen} onOpenChange={onOpenChange}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors text-left"
        >
          <div className="flex items-center gap-4 min-w-0">
            <div className="flex items-center gap-2 min-w-0 max-w-[300px]">
              {getExchangeIcon(exchange.type)}
              <span className="font-medium truncate" title={displayName}>
                {displayName}
              </span>
            </div>
            <Badge className={getExchangeTypeBadgeClass(exchange.type)}>
              {exchange.type}
            </Badge>
            <div className="flex items-center gap-2 text-sm">
              {exchange.durable && (
                <Badge variant="outline" className="text-xs">
                  {t("durable")}
                </Badge>
              )}
              {exchange.auto_delete && (
                <Badge variant="outline" className="text-xs">
                  {t("autoDelete")}
                </Badge>
              )}
              {exchange.internal && (
                <Badge variant="outline" className="text-xs">
                  {t("internal")}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <HeaderMetric label={t("bindings")} value={exchange.bindingCount} />
            {exchange.message_stats?.publish_in !== undefined && (
              <HeaderMetric
                label={t("messagesIn")}
                value={exchange.message_stats.publish_in}
              />
            )}
            {exchange.message_stats?.publish_out !== undefined && (
              <HeaderMetric
                label={t("messagesOut")}
                value={exchange.message_stats.publish_out}
              />
            )}
            <ArrowUpDown
              className="h-4 w-4 text-muted-foreground shrink-0"
              aria-hidden="true"
            />
          </div>
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <ExchangeDetailsPanel
          exchange={exchange}
          onDelete={onDelete}
          isDeleting={isDeleting}
        />
      </CollapsibleContent>
    </Collapsible>
  );
}

function HeaderMetric({ label, value }: { label: ReactNode; value: number }) {
  return (
    <div className="text-center">
      <div className="font-mono tabular-nums font-medium text-foreground">
        {value.toLocaleString()}
      </div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

/**
 * Expanded details pane for an exchange row.
 *
 * /distill: removed redundant section headings ("Exchanges" was the page
 * title; "Messages Published In" was both a heading and a row label).
 * Delete demoted from dominant filled-red to a ghost outline — it's
 * still there, still obviously destructive, but it doesn't compete with
 * the configuration data.
 *
 * /clarify: `publish_in` / `publish_out` show "—" when unavailable;
 * `bindingCount` always has a value so it shows 0 correctly. Stats now
 * use the same HeaderMetric visual as the row header so the numbers feel
 * continuous rather than switching register mid-page.
 *
 * /polish: properties use a strict `grid-cols-[max-content_1fr]` so
 * labels and values align on a shared axis. Fragment Mono on all
 * identifier values. Bindings list uses divide-y instead of individual
 * muted cards.
 */
function ExchangeDetailsPanel({
  exchange,
  onDelete,
  isDeleting,
}: {
  exchange: ExchangeListItem;
  onDelete?: () => void;
  isDeleting?: boolean;
}) {
  const { t } = useTranslation("exchanges");

  const hasArguments =
    exchange.arguments && Object.keys(exchange.arguments).length > 0;
  const hasBindings = exchange.bindings && exchange.bindings.length > 0;

  return (
    <div className="border-t bg-muted/40">
      {/* Properties + traffic stats */}
      <div className="px-4 py-4 flex flex-wrap gap-x-12 gap-y-4">
        <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-1.5 text-sm self-start flex-1 min-w-[180px]">
          <dt className="text-muted-foreground">{t("type")}</dt>
          <dd className="font-mono text-xs text-foreground">{exchange.type}</dd>

          <dt className="text-muted-foreground">{t("vhost")}</dt>
          <dd className="font-mono text-xs text-foreground">
            {exchange.vhost}
          </dd>

          <dt className="text-muted-foreground">{t("durable")}</dt>
          <dd className="text-foreground">
            {exchange.durable ? t("common:yes") : t("common:no")}
          </dd>

          <dt className="text-muted-foreground">{t("autoDelete")}</dt>
          <dd className="text-foreground">
            {exchange.auto_delete ? t("common:yes") : t("common:no")}
          </dd>

          <dt className="text-muted-foreground">{t("internal")}</dt>
          <dd className="text-foreground">
            {exchange.internal ? t("common:yes") : t("common:no")}
          </dd>

          {exchange.policy && (
            <>
              <dt className="text-muted-foreground">{t("policy")}</dt>
              <dd>
                <Badge variant="outline" className="text-xs">
                  {exchange.policy}
                </Badge>
              </dd>
            </>
          )}

          {exchange.user_who_performed_action && (
            <>
              <dt className="text-muted-foreground">{t("lastActionBy")}</dt>
              <dd className="font-mono text-xs text-foreground">
                {exchange.user_who_performed_action}
              </dd>
            </>
          )}
        </dl>

        {/* Traffic stats — same HeaderMetric visual as the row header */}
        <div className="flex items-start gap-8 shrink-0 pt-0.5">
          <TrafficStat
            label={t("messagesIn")}
            value={exchange.message_stats?.publish_in}
          />
          <TrafficStat
            label={t("messagesOut")}
            value={exchange.message_stats?.publish_out}
          />
          <TrafficStat label={t("bindings")} value={exchange.bindingCount} />
        </div>
      </div>

      {/* Arguments block — full width, only when present */}
      {hasArguments && (
        <div className="px-4 pb-4">
          <p className="text-xs font-medium text-muted-foreground mb-1.5">
            {t("arguments")}
          </p>
          <pre className="text-xs font-mono p-2.5 bg-muted rounded-md overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">
            {JSON.stringify(exchange.arguments, null, 2)}
          </pre>
        </div>
      )}

      {/* Footer: bindings list + delete — only when there's something to show */}
      {(hasBindings || onDelete) && (
        <div className="border-t px-4 py-3 space-y-3">
          {hasBindings && (
            <ExchangeBindingsList bindings={exchange.bindings!} />
          )}
          {onDelete && (
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={onDelete}
                disabled={isDeleting}
                className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
                {isDeleting ? t("deleting") : t("deleteExchange")}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * A single traffic metric — number above, label below. Mirrors the
 * HeaderMetric in the collapsible trigger so the visual register is
 * continuous when a row expands. Shows "—" for unavailable data rather
 * than "0" so the distinction between "no traffic" and "no data" is
 * legible.
 */
function TrafficStat({
  label,
  value,
}: {
  label: string;
  value: number | undefined;
}) {
  const available = value !== undefined && value !== null;
  return (
    <div className="text-right">
      <div
        className={`font-mono tabular-nums font-semibold text-xl leading-none ${available ? "text-foreground" : "text-muted-foreground"}`}
      >
        {available ? value!.toLocaleString() : "—"}
      </div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

function ExchangeBindingsList({ bindings }: { bindings: ExchangeBinding[] }) {
  const { t } = useTranslation("exchanges");

  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground mb-2">
        {t("bindings")} ({bindings.length})
      </p>
      <div className="divide-y divide-border rounded-md border overflow-hidden">
        {bindings.map((binding, index) => (
          <ExchangeBindingItem
            key={`${binding.destination}-${index}`}
            binding={binding}
          />
        ))}
      </div>
    </div>
  );
}

function ExchangeBindingItem({ binding }: { binding: ExchangeBinding }) {
  const { t } = useTranslation("exchanges");
  const argCount = Object.keys(binding.arguments).length;

  const icon =
    binding.destination_type === "queue" ? (
      <Filter
        className="h-3 w-3 text-muted-foreground shrink-0"
        aria-hidden="true"
      />
    ) : (
      <Activity
        className="h-3 w-3 text-muted-foreground shrink-0"
        aria-hidden="true"
      />
    );

  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2 text-sm bg-background">
      <div className="flex items-center gap-2.5 min-w-0">
        {icon}
        <span
          className="font-mono text-xs truncate text-foreground"
          title={binding.destination}
        >
          {binding.destination}
        </span>
        <Badge variant="outline" className="text-xs shrink-0">
          {binding.destination_type}
        </Badge>
        {binding.routing_key && (
          <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground shrink-0">
            {binding.routing_key}
          </code>
        )}
      </div>
      {argCount > 0 && (
        <span className="text-xs text-muted-foreground shrink-0">
          {argCount} {t("arguments")}
        </span>
      )}
    </div>
  );
}
