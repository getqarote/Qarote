import { type CSSProperties, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import AuthButtons from "@/components/AuthButtons";

import { useReducedMotion } from "@/hooks/useReducedMotion";

function useScrollEntry<T extends Element>(
  threshold = 0.1
): [React.RefObject<T>, boolean] {
  const ref = useRef<T>(null);
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setEntered(true);
          observer.disconnect();
        }
      },
      { threshold }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [threshold]);
  return [ref, entered];
}

const FinalCtaSection = () => {
  const { t } = useTranslation("landing");
  const reduceMotion = useReducedMotion();
  const [ctaRef, ctaEntered] = useScrollEntry<HTMLDivElement>(0.1);

  const style: CSSProperties = reduceMotion
    ? {}
    : {
        opacity: ctaEntered ? 1 : 0,
        transform: ctaEntered ? "none" : "translateY(12px)",
        transition:
          "opacity 0.5s cubic-bezier(0.16,1,0.3,1), transform 0.5s cubic-bezier(0.16,1,0.3,1)",
      };

  return (
    <section className="pt-12 pb-20 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          ref={ctaRef}
          className="border border-border overflow-hidden"
          style={style}
        >
          <div className="px-6 py-3 bg-primary/10 border-b border-border">
            <span className="text-xs font-semibold uppercase tracking-wide text-primary">
              {t("cta.getStartedForFree")}
            </span>
          </div>
          <div className="bg-primary/5 py-16 px-8 lg:px-16">
            <div className="grid md:grid-cols-2 gap-12 lg:gap-16 items-center">
              <div>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl mb-6 text-center md:text-left leading-[1.2] font-normal text-foreground">
                  {t("finalCta.title")}
                </h2>
                <div className="flex items-center gap-6 justify-center md:justify-start text-sm text-muted-foreground">
                  <span className="flex items-center gap-2">
                    <img
                      src="/images/check.svg"
                      alt=""
                      aria-hidden="true"
                      className="h-3 w-auto image-crisp"
                      width={12}
                      height={12}
                    />
                    {t("finalCta.openSource", "Open source")}
                  </span>
                  <span className="flex items-center gap-2">
                    <img
                      src="/images/check.svg"
                      alt=""
                      aria-hidden="true"
                      className="h-3 w-auto image-crisp"
                      width={12}
                      height={12}
                    />
                    {t("finalCta.selfHostable", "Self-hostable")}
                  </span>
                  <span className="flex items-center gap-2">
                    <img
                      src="/images/check.svg"
                      alt=""
                      aria-hidden="true"
                      className="h-3 w-auto image-crisp"
                      width={12}
                      height={12}
                    />
                    {t("finalCta.freeForever", "Free forever (self-hosted)")}
                  </span>
                </div>
              </div>
              <div className="text-center md:text-left">
                <p className="text-xl mb-8 text-muted-foreground">
                  {t("finalCta.subtitle")}
                </p>
                <div className="flex flex-col items-center md:items-start">
                  <AuthButtons align="left" />
                  <p className="text-xs text-muted-foreground mt-4 max-w-sm text-center md:text-left">
                    {t("finalCta.freeTierScope")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FinalCtaSection;
