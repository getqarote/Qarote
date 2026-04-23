import { Fragment, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { Sparkles } from "lucide-react";

import type { VHostQueueType } from "@/schemas";

interface VHostPreviewCardProps {
  name: string;
  defaultQueueType: VHostQueueType | undefined;
  tracing: boolean;
}

export const VHostPreviewCard = ({
  name,
  defaultQueueType,
  tracing,
}: VHostPreviewCardProps) => {
  const { t } = useTranslation("vhosts");

  const adjectives = [tracing ? t("previewTraced") : null]
    .filter(Boolean)
    .join(", ");

  const displayName = name ? `\`${name}\`` : "…";
  const queueType = defaultQueueType
    ? `\`${defaultQueueType}\``
    : t("previewServerDefault");

  const sentence = adjectives
    ? t("previewTemplateVHostWithTracing", {
        adjectives,
        name: displayName,
        queueType,
      })
    : t("previewTemplateVHost", {
        name: displayName,
        queueType,
      });

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
        <Sparkles className="h-3.5 w-3.5" />
        <span>{t("previewTitle")}</span>
      </div>
      <p className="text-sm text-foreground leading-relaxed">
        {renderInlineCode(sentence)}
      </p>
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
