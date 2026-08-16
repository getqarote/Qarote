/**
 * Cockpit "Ask your agent" — a carousel of example prompts the user can copy
 * straight into their MCP client. Reinforces the agent-first loop: don't
 * click through dashboards, ask the agent and it calls Qarote's tools.
 *
 * Visual: the prototype `.ask` — a mono eyebrow, circular nav buttons, and a
 * pill-shaped prompt with a copy action. Changing prompts plays a slight
 * directional slide+fade (see `.ask-anim-*` in styles/index.css).
 */

import { useState } from "react";
import { useTranslation } from "react-i18next";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { CopyPromptButton } from "@/components/CopyPromptButton";

// Six example prompts, keyed in the cockpit namespace (ask.prompt1…6).
const PROMPT_KEYS = [
  "ask.prompt1",
  "ask.prompt2",
  "ask.prompt3",
  "ask.prompt4",
  "ask.prompt5",
  "ask.prompt6",
] as const;

const NAV_BUTTON =
  "grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:border-primary hover:bg-accent hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function AskYourAgent() {
  const { t } = useTranslation("cockpit");
  const [idx, setIdx] = useState(0);
  // Navigation direction drives which slide-in animation plays on change.
  const [dir, setDir] = useState<1 | -1>(1);

  const prompt = t(PROMPT_KEYS[idx]);
  const go = (delta: 1 | -1) => {
    setDir(delta);
    setIdx((idx + delta + PROMPT_KEYS.length) % PROMPT_KEYS.length);
  };

  return (
    <section className="space-y-3" aria-label={t("ask.label")}>
      <div className="space-y-1">
        <span className="font-mono text-[11px] uppercase tracking-[0.09em] text-muted-foreground">
          {t("ask.label")}
        </span>
        <p className="text-sm text-muted-foreground">{t("ask.hint")}</p>
      </div>

      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={() => go(-1)}
          aria-label={t("ask.previous")}
          className={NAV_BUTTON}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div
          className="flex min-w-0 flex-1 items-center gap-2.5 rounded-full border border-border bg-muted/50 px-4 py-2"
          aria-live="polite"
        >
          <span
            key={idx}
            className={`min-w-0 flex-1 truncate font-mono text-sm text-foreground ${
              dir === 1 ? "ask-anim-next" : "ask-anim-prev"
            }`}
          >
            {prompt}
          </span>
          <CopyPromptButton prompt={prompt} label={t("ask.copy")} />
        </div>

        <button
          type="button"
          onClick={() => go(1)}
          aria-label={t("ask.next")}
          className={NAV_BUTTON}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <p className="text-center font-mono text-[11px] text-muted-foreground">
        {idx + 1} / {PROMPT_KEYS.length}
      </p>
    </section>
  );
}
