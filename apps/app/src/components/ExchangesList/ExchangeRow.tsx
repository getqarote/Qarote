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
      <div className="border rounded-lg">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="w-full flex items-center justify-between p-4 hover:bg-accent transition-colors text-left"
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
              <HeaderMetric
                label={t("bindings")}
                value={exchange.bindingCount}
              />
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
      </div>
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
 * Expanded details pane for an exchange row. Shows configuration,
 * message statistics, the delete affordance, and the bindings list.
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

  return (
    <div className="border-t p-4 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Configuration */}
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-2">
            {t("exchangesTitle")}
          </h4>
          <dl className="space-y-1 text-sm">
            <DetailRow label={t("type")} value={exchange.type} />
            <DetailRow label={t("vhost")} value={exchange.vhost} mono />
            <DetailRow
              label={t("durable")}
              value={exchange.durable ? t("common:yes") : t("common:no")}
            />
            <DetailRow
              label={t("autoDelete")}
              value={exchange.auto_delete ? t("common:yes") : t("common:no")}
            />
            <DetailRow
              label={t("internal")}
              value={exchange.internal ? t("common:yes") : t("common:no")}
            />
            {exchange.policy && (
              <DetailRow
                label={t("policy")}
                value={
                  <Badge variant="outline" className="ml-1">
                    {exchange.policy}
                  </Badge>
                }
              />
            )}
            {exchange.user_who_performed_action && (
              <DetailRow
                label="Last action by"
                value={exchange.user_who_performed_action}
                mono
              />
            )}
            {hasArguments && (
              <div>
                <dt className="text-muted-foreground text-sm">
                  {t("arguments")}
                </dt>
                <dd className="mt-1 p-2 bg-muted rounded text-xs font-mono overflow-x-auto">
                  <pre className="whitespace-pre-wrap break-all">
                    {JSON.stringify(exchange.arguments, null, 2)}
                  </pre>
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* Message statistics */}
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-2">
            {t("messagesPublishedIn")}
          </h4>
          <dl className="space-y-1 text-sm">
            <DetailRow
              label={t("messagesPublishedIn")}
              value={exchange.message_stats?.publish_in ?? "—"}
              mono
            />
            <DetailRow
              label={t("messagesPublishedOut")}
              value={exchange.message_stats?.publish_out ?? "—"}
              mono
            />
            <DetailRow
              label={t("totalBindings")}
              value={exchange.bindingCount}
              mono
            />
          </dl>
        </div>
      </div>

      {onDelete && (
        <div>
          <Button
            variant="destructive"
            size="sm"
            onClick={onDelete}
            disabled={isDeleting}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {t("deleteExchange")}
          </Button>
        </div>
      )}

      {exchange.bindings && exchange.bindings.length > 0 && (
        <ExchangeBindingsList bindings={exchange.bindings} />
      )}
    </div>
  );
}

function DetailRow({
  label,
  value,
  mono = false,
}: {
  label: ReactNode;
  value: ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline gap-2">
      <dt className="text-muted-foreground shrink-0">{label}:</dt>
      <dd
        className={`min-w-0 truncate text-foreground ${mono ? "font-mono tabular-nums text-xs" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}

function ExchangeBindingsList({ bindings }: { bindings: ExchangeBinding[] }) {
  const { t } = useTranslation("exchanges");

  return (
    <div>
      <h4 className="text-sm font-semibold text-foreground mb-2">
        {t("bindings")} ({bindings.length})
      </h4>
      <div className="space-y-2">
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
      <Filter className="h-3 w-3" aria-hidden="true" />
    ) : (
      <Activity className="h-3 w-3" aria-hidden="true" />
    );

  return (
    <div className="flex items-center justify-between gap-3 p-3 bg-muted rounded-lg">
      <div className="flex items-center gap-3 min-w-0">
        {icon}
        <span className="font-medium truncate" title={binding.destination}>
          {binding.destination}
        </span>
        <Badge variant="outline" className="text-xs shrink-0">
          {binding.destination_type}
        </Badge>
        {binding.routing_key && (
          <div className="text-sm text-muted-foreground min-w-0 truncate">
            Key:{" "}
            <code className="bg-background border px-1 rounded text-xs font-mono">
              {binding.routing_key}
            </code>
          </div>
        )}
      </div>
      {argCount > 0 && (
        <div className="text-xs text-muted-foreground shrink-0">
          {argCount} {t("arguments")}
        </div>
      )}
    </div>
  );
}
