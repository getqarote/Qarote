import { type CSSProperties, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { ExternalLink } from "lucide-react";

import AuthButtons from "@/components/AuthButtons";
import HeroBackgroundFlow from "@/components/landing/HeroBackgroundFlow";
import { Button } from "@/components/ui/button";

import { useReducedMotion } from "@/hooks/useReducedMotion";

const HeroSection = () => {
  const { t, i18n } = useTranslation("landing");
  const lang = i18n.resolvedLanguage ?? i18n.language ?? "";
  const needsWordSpacing = !/^(zh|ja|ko)(-|$)/i.test(lang);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [mounted, setMounted] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Listen for play-video custom events from StickyNav island
  useEffect(() => {
    const handler = () => setIsVideoPlaying(true);
    document.addEventListener("play-video", handler);
    return () => document.removeEventListener("play-video", handler);
  }, []);

  const enter = (delay: number): CSSProperties =>
    reduceMotion
      ? {}
      : {
          opacity: mounted ? 1 : 0,
          transform: mounted ? "none" : "translateY(10px)",
          transition: `opacity 0.5s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.5s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
        };

  return (
    <header
      id="home"
      className="relative overflow-hidden text-foreground pb-16 bg-background"
    >
      <div className="relative">
        <HeroBackgroundFlow />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 md:pt-28 pb-3.5">
          <div className="w-full text-center">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl text-foreground mb-6 leading-tight max-w-4xl mx-auto px-2 font-normal">
              {t("hero.titleBefore")}
              {needsWordSpacing ? " " : ""}
              <span className="text-primary">{t("hero.titleHighlight")}</span>
              {t("hero.titleAfter")}
            </h1>

            <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-12 leading-relaxed max-w-3xl mx-auto px-2">
              {t("hero.subtitle")}
            </p>

            <div className="mb-12">
              <AuthButtons describedById="hero-no-credit-card" />
              <p
                id="hero-no-credit-card"
                className="text-xs sm:text-sm text-muted-foreground mt-3 px-4"
              >
                {t("hero.noCreditCard")}
              </p>
              <div className="flex justify-center mt-5 px-4">
                <Button asChild variant="pillGhost" size="pillMd">
                  <a
                    href="https://demo.qarote.io/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t("cta.tryLiveDemo")}
                    <ExternalLink
                      className="h-4 w-4 opacity-70"
                      aria-hidden="true"
                    />
                    <span className="sr-only">{t("cta.opensInNewTab")}</span>
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* YouTube Video */}
      <div id="video" className="relative pb-12" style={enter(260)}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {!isVideoPlaying ? (
            <button
              type="button"
              className="relative w-full aspect-video overflow-hidden group cursor-pointer"
              onClick={() => setIsVideoPlaying(true)}
            >
              <picture>
                <source srcSet="/images/dashboard.webp" type="image/webp" />
                <img
                  src="/images/dashboard.png"
                  alt="Qarote Dashboard Interface"
                  className="w-full h-full object-contain bg-card"
                  width={3420}
                  height={1894}
                  fetchPriority="high"
                />
              </picture>
              <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/15 group-hover:bg-zinc-950/20 transition-colors">
                <div
                  aria-hidden="true"
                  className="w-20 h-20 md:w-24 md:h-24 bg-background flex items-center justify-center transition-all group-hover:scale-110 shadow-soft rounded-full"
                >
                  <img
                    src="/images/play.svg"
                    alt=""
                    aria-hidden="true"
                    className="w-10 h-10 md:w-12 md:h-12 object-contain block ml-2 image-crisp"
                    width={48}
                    height={48}
                  />
                </div>
              </div>
            </button>
          ) : (
            <div className="relative w-full aspect-video overflow-hidden">
              <iframe
                src="https://www.youtube.com/embed/x1GvnivauyA?autoplay=1"
                title="Qarote Video"
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default HeroSection;
