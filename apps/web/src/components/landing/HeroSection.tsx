import { useTranslation } from "react-i18next";

import AuthButtons from "@/components/AuthButtons";
import DemoVideoModal from "@/components/DemoVideoModal";
import HeroAgentChat from "@/components/HeroAgentChat";
import HeroFlowCanvas from "@/components/HeroFlowCanvas";

const HeroSection = () => {
  const { t, i18n } = useTranslation("landing");
  const lang = i18n.resolvedLanguage ?? i18n.language ?? "";
  const needsWordSpacing = !/^(zh|ja|ko)(-|$)/i.test(lang);

  return (
    <header>
      {/* Dark, full-bleed hero: the animated message-flow canvas sits behind a
          split of headline + CTAs (left) and the agent-chat proof card (right),
          with a scrim so the white headline stays legible over the animation. */}
      <section
        id="hero"
        className="relative isolate overflow-hidden bg-[#0B0E14] text-[#E7EAF0]"
      >
        <HeroFlowCanvas />
        <div
          className="hero-scrim pointer-events-none absolute inset-0 z-[1]"
          aria-hidden="true"
        />

        <div className="relative z-[2] mx-auto grid max-w-[1180px] items-center gap-[clamp(32px,5vw,72px)] px-[clamp(20px,5vw,64px)] pb-[clamp(56px,9vh,96px)] pt-[clamp(72px,12vh,150px)] lg:grid-cols-[1.05fr_0.95fr]">
          {/* LEFT — headline, CTAs, meta */}
          <div className="max-w-[600px]">
            <span className="font-mono text-[12px] uppercase tracking-[0.14em] text-carrot">
              {t("hero.eyebrow")}
            </span>
            <h1 className="mt-[22px] font-display text-[clamp(38px,6vw,68px)] font-semibold leading-[1.02] tracking-[-0.03em] text-[#E7EAF0]">
              {t("hero.titleBefore")}
              {needsWordSpacing ? " " : ""}
              <span className="text-carrot">{t("hero.titleHighlight")}</span>
              {t("hero.titleAfter")}
            </h1>
            <p className="mt-6 max-w-[50ch] text-[clamp(17px,1.9vw,20px)] leading-[1.55] text-[#9AA3B2] [text-wrap:pretty]">
              {t("hero.subtitle")}
            </p>

            <div className="mt-[34px] flex flex-wrap items-center gap-[14px]">
              <AuthButtons
                align="left"
                labelKey="cta.tryForFree"
                describedById="hero-meta"
              />
              <a
                className="inline-flex items-center gap-2 rounded-md border border-[#232936] px-5 py-2.5 text-[15px] font-medium text-[#E7EAF0] transition-colors hover:bg-white/[0.04]"
                href="https://demo.qarote.io/"
                target="_blank"
                rel="noopener noreferrer"
              >
                {t("cta.seeLiveDemo")}
                <span className="sr-only">{t("cta.opensInNewTab")}</span>
              </a>
            </div>

            <div className="mt-[18px]">
              <DemoVideoModal videoId="x1GvnivauyA" />
            </div>

            <p
              id="hero-meta"
              className="mt-[26px] flex flex-wrap items-center gap-x-[18px] gap-y-[7px] font-mono text-[12.5px] text-[#9AA3B2]"
            >
              <span className="inline-flex items-center gap-[7px]">
                <span
                  className="h-[6px] w-[6px] rounded-full bg-[#3FBF7F]"
                  aria-hidden="true"
                />
                {t("hero.noExporter")}
              </span>
              <span>{t("hero.versions")}</span>
            </p>
          </div>

          {/* RIGHT — live agent-chat proof card */}
          <HeroAgentChat />
        </div>
      </section>
    </header>
  );
};

export default HeroSection;
