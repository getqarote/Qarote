/**
 * Cockpit "Ask your agent" — a carousel of example prompts the user can copy
 * straight into their MCP client. Reinforces the agent-first loop: don't
 * click through dashboards, ask the agent and it calls Qarote's tools.
 */

import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Check, ChevronLeft, ChevronRight, Copy } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

// Six example prompts, keyed in the cockpit namespace (ask.prompt1…6).
const PROMPT_KEYS = [
  "ask.prompt1",
  "ask.prompt2",
  "ask.prompt3",
  "ask.prompt4",
  "ask.prompt5",
  "ask.prompt6",
] as const;

export function AskYourAgent() {
  const { t } = useTranslation("cockpit");
  const [idx, setIdx] = useState(0);
  const [copied, setCopied] = useState(false);

  const prompt = t(PROMPT_KEYS[idx]);
  const go = (delta: number) =>
    setIdx((idx + delta + PROMPT_KEYS.length) % PROMPT_KEYS.length);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      toast.success(t("ask.copied"));
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error(t("ask.copyFailed"));
    }
  };

  return (
    <section className="space-y-3" aria-label={t("ask.label")}>
      <div>
        <h2 className="title-section">{t("ask.label")}</h2>
        <p className="text-muted-foreground text-sm mt-1">{t("ask.hint")}</p>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => go(-1)}
          aria-label={t("ask.previous")}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div
          className="flex flex-1 items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3 min-w-0"
          aria-live="polite"
        >
          <span className="font-mono text-sm min-w-0 break-words">
            {prompt}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={copy}
            className="shrink-0"
            aria-label={t("ask.copy")}
          >
            {copied ? (
              <Check className="h-4 w-4 text-success" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            {t("ask.copy")}
          </Button>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => go(1)}
          aria-label={t("ask.next")}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <p className="text-center font-mono text-xs text-muted-foreground">
        {idx + 1} / {PROMPT_KEYS.length}
      </p>
    </section>
  );
}
