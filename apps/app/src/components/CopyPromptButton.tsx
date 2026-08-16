import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Check, Copy } from "lucide-react";

import { copyToClipboard } from "@/lib/clipboard";
import { cn } from "@/lib/utils";

interface CopyPromptButtonProps {
  /** The ready-to-paste agent prompt copied to the clipboard on click. */
  prompt: string;
  /** Idle-state label (e.g. "Ask your agent"). Swaps to "Copied" for ~1.3s. */
  label: string;
  className?: string;
}

/**
 * Shared "copy a ready-to-paste agent prompt" button. The gesture is COPY,
 * never navigation — the agent-first bridge from a cockpit surface into the
 * user's wired MCP client. Carrot-soft styling; inline ✓ / "Copied" feedback
 * for ~1.3s, announced via aria-live. Reused by the Message-rates chip and the
 * "Ask your agent" carousel so the copy affordance stays identical everywhere.
 */
export function CopyPromptButton({
  prompt,
  label,
  className,
}: CopyPromptButtonProps) {
  const { t } = useTranslation("common");
  const [copied, setCopied] = useState(false);

  const onClick = async () => {
    if (await copyToClipboard(prompt)) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1300);
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-live="polite"
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-md border border-primary/20 bg-accent px-2.5 py-1.5 text-xs font-medium text-primary transition-colors hover:border-primary/40 hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className
      )}
    >
      {copied ? (
        <Check className="h-3.5 w-3.5" aria-hidden="true" />
      ) : (
        <Copy className="h-3.5 w-3.5" aria-hidden="true" />
      )}
      {copied ? t("copied") : label}
    </button>
  );
}
