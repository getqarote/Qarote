import { Fragment, type ReactNode, useMemo } from "react";
import { useTranslation } from "react-i18next";

import { Sparkles } from "lucide-react";

interface PublishPreviewCardProps {
  mode: "exchange" | "queue";
  exchange: string;
  routingKey: string;
  queueName?: string;
  payload: string;
  deliveryMode: string;
  propertiesCount: number;
}

export const PublishPreviewCard = ({
  mode,
  exchange,
  routingKey,
  queueName,
  payload,
  deliveryMode,
  propertiesCount,
}: PublishPreviewCardProps) => {
  const { t } = useTranslation("exchanges");

  const bytes = useMemo(() => {
    if (!payload) return 0;
    try {
      return new Blob([payload]).size;
    } catch {
      return payload.length;
    }
  }, [payload]);

  const persistence =
    deliveryMode === "2"
      ? t("sendMessage.previewPersistent")
      : t("sendMessage.previewTransient");

  const target =
    mode === "queue"
      ? t("sendMessage.previewTargetQueue", { name: queueName || "—" })
      : t("sendMessage.previewTargetExchange", {
          exchange: exchange || "—",
          routingKey: routingKey || t("sendMessage.previewNoRoutingKey"),
        });

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
        <Sparkles className="h-3.5 w-3.5" />
        <span>{t("sendMessage.previewTitle")}</span>
      </div>
      <p className="text-sm text-foreground leading-relaxed">
        {renderInlineCode(target)}
      </p>
      <p className="text-xs text-muted-foreground">
        {t("sendMessage.previewFooter", {
          bytes: formatBytes(bytes),
          persistence,
          properties:
            propertiesCount > 0
              ? t("sendMessage.previewPropertiesCount", {
                  count: propertiesCount,
                })
              : t("sendMessage.previewNoProperties"),
        })}
      </p>
    </div>
  );
};

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

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
