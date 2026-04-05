import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import AuthButtons from "@/components/AuthButtons";

const HeroSection = () => {
  const { t } = useTranslation("landing");
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  // Listen for play-video custom events from StickyNav island
  useEffect(() => {
    const handler = () => setIsVideoPlaying(true);
    document.addEventListener("play-video", handler);
    return () => document.removeEventListener("play-video", handler);
  }, []);

  return (
    <header
      id="home"
      className="relative overflow-visible text-foreground pb-16 bg-white"
    >
      {/* Decorative elements - subtle colored accents */}
      <div className="absolute inset-0 opacity-5 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-orange-400/20 to-transparent"></div>
        <div className="absolute -top-20 -right-20 sm:-top-40 sm:-right-40 w-40 h-40 sm:w-80 sm:h-80 bg-orange-300  filter blur-3xl opacity-20"></div>
        <div className="absolute top-1/2 -left-20 sm:-left-40 w-32 h-32 sm:w-60 sm:h-60 bg-red-300  filter blur-3xl opacity-20"></div>
      </div>

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 md:pt-28 pb-3.5">
        <div className="w-full text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-foreground mb-6 leading-tight max-w-4xl mx-auto px-2 font-normal">
            {t("hero.titleBefore")}
            <span className="text-primary">{t("hero.titleHighlight")}</span>
            {t("hero.titleAfter")}
          </h1>

          <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-12 leading-relaxed max-w-3xl mx-auto px-2">
            {t("hero.subtitle")}
          </p>

          <div className="mb-12">
            <AuthButtons />
            <p className="text-xs sm:text-sm text-muted-foreground mt-3 px-4">
              {t("hero.noCreditCard")}
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground mt-2 px-4">
              <a
                href="https://demo.qarote.io/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:text-primary/80 underline underline-offset-2 transition-colors"
              >
                {t("cta.tryLiveDemo")}
                <span className="sr-only">(opens in new tab)</span>
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* YouTube Video */}
      <div id="video" className="relative pb-12">
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
                  width={3024}
                  height={1706}
                  fetchPriority="high"
                />
              </picture>
              <div className="absolute inset-0 flex items-center justify-center bg-black/15 group-hover:bg-black/20 transition-colors">
                <div
                  aria-hidden="true"
                  className="w-20 h-20 md:w-24 md:h-24 bg-white flex items-center justify-center transition-all group-hover:scale-110 shadow-soft rounded-full"
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
                src="https://www.youtube.com/embed/g9Coi3niYIY?autoplay=1"
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
