import { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { Activity, Filter, Lock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { PixelChevronRight } from "@/components/ui/pixel-chevron-right";
import { PixelTrash } from "@/components/ui/pixel-trash";

import { getExchangeTypeBadgeClass } from "./exchangeTypeUi";
import type { ExchangeBinding, ExchangeListItem } from "./types";

interface ExchangeRowProps {
  exchange: ExchangeListItem;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete?: () => void;
  isDeleting?: boolean;
}

/**
 * A single exchange row matching the QueueTable pattern: fixed-width
 * right-aligned metric columns aligned to sortable headers, mono font
 * for identifiers, hover:bg-accent for row hover.
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
          className="w-full flex items-center px-4 py-3 hover:bg-accent transition-colors text-left"
        >
          {/* Left: identity */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="font-medium truncate font-mono text-sm"
                title={displayName}
              >
                {displayName}
              </span>
              {exchange.internal && (
                <Badge
                  variant="secondary"
                  className="text-xs flex items-center gap-1 shrink-0"
                >
                  <Lock className="w-3 h-3" />
                  {t("internal")}
                </Badge>
              )}
            </div>
            <Badge
              className={`shrink-0 ${getExchangeTypeBadgeClass(exchange.type)}`}
            >
              {exchange.type}
            </Badge>
            {exchange.durable && (
              <span className="hidden xl:inline text-xs text-muted-foreground">
                {t("durable")}
              </span>
            )}
          </div>

          {/* Right: metrics aligned to sort headers */}
          <div className="flex items-center gap-0">
            <span className="w-24 text-right font-mono tabular-nums text-sm text-foreground hidden xl:block">
              {exchange.type}
            </span>
            <span className="w-28 text-right font-mono tabular-nums text-sm text-foreground">
              {exchange.bindingCount.toLocaleString()}
            </span>
            <span className="w-28 text-right font-mono tabular-nums text-sm text-foreground">
              {(exchange.message_stats?.publish_in ?? 0).toLocaleString()}
            </span>
            <span className="w-28 text-right font-mono tabular-nums text-sm text-foreground">
              {(exchange.message_stats?.publish_out ?? 0).toLocaleString()}
            </span>
            <div className="w-8 flex justify-center">
              <PixelChevronRight
                className={`h-3 text-muted-foreground transition-transform duration-150 shrink-0 ${
                  isOpen ? "rotate-90" : ""
                }`}
                aria-hidden="true"
              />
            </div>
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

/**
 * Expanded details pane matching the QueueTable DetailItem pattern:
 * inline flex-wrap metrics strip instead of a two-column grid.
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
    <div className="border-t border-border bg-muted/20 px-4 py-3 space-y-3">
      {/* Inline metrics strip */}
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        <DetailItem label={t("vhost")} value={exchange.vhost} mono />
        <DetailItem label={t("type")} value={exchange.type} mono />
        <DetailItem
          label={t("durable")}
          value={exchange.durable ? t("common:yes") : t("common:no")}
        />
        <DetailItem
          label={t("autoDelete")}
          value={exchange.auto_delete ? t("common:yes") : t("common:no")}
        />
        <DetailItem
          label={t("internal")}
          value={exchange.internal ? t("common:yes") : t("common:no")}
        />
        <DetailItem
          label={t("messagesIn")}
          value={
            exchange.message_stats?.publish_in !== undefined
              ? exchange.message_stats.publish_in.toLocaleString()
              : "—"
          }
          mono
        />
        <DetailItem
          label={t("messagesOut")}
          value={
            exchange.message_stats?.publish_out !== undefined
              ? exchange.message_stats.publish_out.toLocaleString()
              : "—"
          }
          mono
        />
        {exchange.policy && (
          <DetailItem label={t("policy")} value={exchange.policy} mono />
        )}
        {exchange.user_who_performed_action && (
          <DetailItem
            label={t("lastActionBy")}
            value={exchange.user_who_performed_action}
            mono
          />
        )}
      </div>

      {/* Arguments block — only when present */}
      {hasArguments && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1.5">
            {t("arguments")}
          </p>
          <pre className="text-xs font-mono p-2.5 bg-muted rounded-md overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">
            {JSON.stringify(exchange.arguments, null, 2)}
          </pre>
        </div>
      )}

      {/* Bindings + delete */}
      {hasBindings && <ExchangeBindingsList bindings={exchange.bindings!} />}
      {onDelete && (
        <div className="flex items-center gap-2 pt-1">
          <Button
            variant="destructive-outline"
            size="sm"
            onClick={onDelete}
            disabled={isDeleting}
          >
            <PixelTrash
              className="h-3.5 w-auto shrink-0 mr-1.5"
              aria-hidden="true"
            />
            {isDeleting ? t("deleting") : t("deleteExchange")}
          </Button>
        </div>
      )}
    </div>
  );
}

function DetailItem({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span
        className={`text-xs font-medium text-foreground ${mono ? "font-mono tabular-nums" : ""}`}
      >
        {value}
      </span>
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
