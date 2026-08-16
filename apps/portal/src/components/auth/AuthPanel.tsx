import { useTranslation } from "react-i18next";

import HeroFlowCanvas from "@/components/HeroFlowCanvas";

/**
 * Night brand panel on the right of the auth split layout. A fixed near-black
 * surface (never themes) holding the landing's HeroFlowCanvas — the same
 * CALM → INCIDENT → agent-reticle-scan → root-cause story the marketing site
 * shows — under a legibility scrim, with the eyebrow + headline + subtitle.
 *
 * Hidden ≤880px (the form goes full-width). The canvas owns its own lifecycle
 * (reduced-motion static frame, off-screen pause, resize) and is aria-hidden.
 */
export function AuthPanel() {
  const { t } = useTranslation("auth");

  return (
    <aside className="relative hidden overflow-hidden bg-[hsl(220_29%_6%)] [@media(min-width:881px)]:block">
      <HeroFlowCanvas />
      {/* Gradient scrim — darkens top & bottom so the copy stays legible. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,hsl(220_29%_6%/0.55)_0%,transparent_35%,transparent_60%,hsl(220_29%_6%/0.9)_100%)]"
      />
      <div className="absolute bottom-[clamp(40px,6vh,64px)] left-[clamp(32px,4vw,56px)] right-[clamp(32px,4vw,56px)] z-[2]">
        <p className="mb-3.5 inline-flex items-center gap-2.5 font-mono text-xs uppercase tracking-[0.1em] text-[hsl(21_90%_52%)]">
          <span
            aria-hidden="true"
            className="h-px w-[18px] bg-[hsl(21_90%_52%)]"
          />
          {t("panelEyebrow")}
        </p>
        <h2 className="max-w-[16ch] font-heading text-[clamp(24px,2.5vw,32px)] font-semibold leading-[1.1] tracking-tight text-white">
          {t("panelTitle")}
        </h2>
        <p className="mt-3 max-w-[42ch] text-[14.5px] leading-relaxed text-[hsl(219_12%_54%)]">
          {t("panelSubtitle")}
        </p>
      </div>
    </aside>
  );
}
