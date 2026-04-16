import { Fragment, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { Sparkles } from "lucide-react";

import type { ExchangeType } from "@/schemas";

import { normalizeArgValue } from "./constants";
import type { ArgRow } from "./types";

interface ExchangePreviewCardProps {
  name: string;
  type: ExchangeType | "";
  durable: boolean;
  autoDelete: boolean;
  internal: boolean;
  rows: ArgRow[];
}

export const ExchangePreviewCard = ({
  name,
  type,
  durable,
  autoDelete,
  internal,
  rows,
}: ExchangePreviewCardProps) => {
  const { t } = useTranslation("exchanges");

  const adjectives = [
    durable ? t("previewPersistent") : t("previewInMemory"),
    autoDelete ? t("previewAutoDelete") : null,
    internal ? t("previewInternal") : null,
  ]
    .filter(Boolean)
    .join(", ");

  const displayName = name ? `\`${name}\`` : "…";
  const typeLabel = type || "…";

  const sentence = t("previewTemplateExchange", {
    adjectives,
    type: typeLabel,
    name: displayName,
  });

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
