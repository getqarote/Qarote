/**
 * Renders a recommendation string with backtick-delimited segments
 * promoted to inline `<code>` elements, each with a copy button.
 *
 * Backend rule recommendations contain command examples wrapped in
 * backticks (e.g. `` `rabbitmqctl list_alarms` ``); rendering them
 * as plain text loses the visual affordance and forces operators to
 * select-by-character to copy the command. This component does the
 * minimal transform: split on backtick pairs, render alternating
 * text and `<code>` runs, attach a copy button to each code segment.
 */

import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { Check, Copy } from "lucide-react";

import { copyToClipboard, isClipboardAvailable } from "@/lib/clipboard";

interface CopyButtonProps {
  value: string;
}

function CopyButton({ value }: CopyButtonProps) {
  const { t } = useTranslation("diagnosis");
  const [copied, setCopied] = useState(false);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, []);

  const onClick = async () => {
    const ok = await copyToClipboard(value);
    if (!ok) return;
    setCopied(true);
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    resetTimerRef.current = setTimeout(() => {
      setCopied(false);
      resetTimerRef.current = null;
    }, 1500);
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={copied ? t("card.copied") : t("card.copyCommand")}
      title={copied ? t("card.copied") : t("card.copyCommand")}
      // h-6 w-6 = 24×24 px touch target — meets WCAG 2.5.8 minimum.
      // Smaller looks tighter against the inline <code> but loses
      // tap reliability on phones.
      className="inline-flex h-6 w-6 items-center justify-center text-muted-foreground hover:text-foreground transition-colors align-text-bottom ml-1"
    >
      {copied ? (
        <Check className="h-3 w-3 text-green-600 dark:text-green-400" />
      ) : (
        <Copy className="h-3 w-3" />
      )}
    </button>
  );
}

interface RecommendationTextProps {
  text: string;
}

export function RecommendationText({ text }: RecommendationTextProps) {
  // Split on backticks. Even-index segments are plain text; odd-index
  // segments are inside backticks → render as <code>. This handles
  // an unmatched trailing backtick (string ends mid-code) gracefully:
  // the trailing odd segment renders as code without a copy button
  // when its content is empty. No nesting support — backticks inside
  // backticks are not a markdown convention.
  const canCopy = isClipboardAvailable();
  const segments = text.split("`");
  return (
    <span>
      {segments.map((segment, idx) => {
        if (idx % 2 === 0) {
          return <span key={idx}>{segment}</span>;
        }
        if (segment.length === 0) return null;
        return (
          <span key={idx} className="inline-flex items-baseline">
            <code className="rounded-sm border border-border bg-muted/40 px-1 py-0.5 text-[0.85em] font-mono">
              {segment}
            </code>
            {/* Suppress the copy button when the runtime cannot copy
                — no point rendering a button that no-ops. The user
                can still select the text manually. */}
            {canCopy && <CopyButton value={segment} />}
          </span>
        );
      })}
    </span>
  );
}
