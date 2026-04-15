import { Fragment, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { Sparkles } from "lucide-react";

import { DEFAULT_EXCHANGE, NO_BINDING, normalizeArgValue } from "./constants";
import type { ArgRow } from "./types";

interface QueuePreviewCardProps {
  name: string;
  durable: boolean;
  autoDelete: boolean;
  exclusive: boolean;
  bindToExchange?: string;
  routingKey?: string;
  rows: ArgRow[];
}

export const QueuePreviewCard = ({
  name,
  durable,
  autoDelete,
  exclusive,
  bindToExchange,
  routingKey,
  rows,
}: QueuePreviewCardProps) => {
  const { t } = useTranslation("queues");

  const adjectives = [
    durable ? t("previewPersistent") : t("previewInMemory"),
    autoDelete ? t("previewAutoDelete") : null,
    exclusive ? t("previewExclusive") : null,
  ]
    .filter(Boolean)
    .join(", ");

  const hasBinding = !!bindToExchange && bindToExchange !== NO_BINDING;
  const exchangeLabel =
    bindToExchange === DEFAULT_EXCHANGE ? "(default)" : bindToExchange;

  const routingClause = routingKey
    ? t("previewRoutingClause", { key: `\`${routingKey}\`` })
    : "";

  const displayName = name ? `\`${name}\`` : "…";

  const sentence = hasBinding
    ? t("previewTemplateWithBinding", {
        adjectives,
        name: displayName,
        exchange: `\`${exchangeLabel}\``,
        routingClause,
      })
    : t("previewTemplateNoBinding", {
        adjectives,
        name: displayName,
      });

  // Count active argument rows (non-empty, normalizable values).
  const argsCount = rows.filter(
    (r) => r.key && normalizeArgValue(r.key, r.value) !== undefined
  ).length;

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
        <Sparkles className="h-3.5 w-3.5" />
        <span>{t("previewTitle")}</span>
      </div>
      <p className="text-sm text-foreground leading-relaxed">
        {renderInlineCode(sentence)}
      </p>
      {argsCount > 0 && (
        <p className="text-xs text-muted-foreground">
          {t("previewArgsCount", { count: argsCount })}
        </p>
      )}
    </div>
  );
};

/**
 * Splits a string on markdown-style backticks and renders the delimited
 * segments as <code> nodes so RabbitMQ names and routing keys appear in
 * monospace. Returns React nodes — no HTML injection.
 */
function renderInlineCode(input: string): ReactNode {
  const parts = input.split(/(`[^`]+`)/g);
  return parts.map((part, index) => {
    if (part.startsWith("`") && part.endsWith("`") && part.length >= 2) {
      return (
        <code
          key={index}
          className="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return <Fragment key={index}>{part}</Fragment>;
  });
}
