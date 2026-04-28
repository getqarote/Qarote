import { type CSSProperties, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

function useReducedMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduce(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduce(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduce;
}

function useScrollEntry<T extends Element>(
  threshold = 0.12
): [React.RefObject<T>, boolean] {
  const ref = useRef<T>(null);
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setEntered(true);
          observer.disconnect();
        }
      },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);
  return [ref, entered];
}

const FounderQuoteSection = () => {
  const { t } = useTranslation("landing");
  const reduceMotion = useReducedMotion();
  const [quoteRef, quoteEntered] = useScrollEntry<HTMLQuoteElement>(0.15);

  const enter = (delay = 0): CSSProperties =>
    reduceMotion
      ? {}
      : {
          opacity: quoteEntered ? 1 : 0,
          transform: quoteEntered ? "translateY(0)" : "translateY(12px)",
          transition: `opacity 0.5s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.5s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
        };

  return (
    <section className="py-16 bg-muted/10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <blockquote
          ref={quoteRef}
          className="border border-border p-8 lg:p-12"
          style={enter(0)}
        >
          <p className="text-2xl lg:text-3xl text-foreground font-normal leading-snug mb-8">
            {t("founderQuote.openQuote")}
            {t("founderQuote.line1")}
            <br />
            {t("founderQuote.line2")}
            <br />
            <span className="text-primary">{t("founderQuote.highlight")}</span>
            {t("founderQuote.closeQuote")}
          </p>
          <footer className="flex items-center gap-3" style={enter(80)}>
            <img
              src="/images/team/brice.jpg"
              alt={t("founderQuote.imgAlt")}
              className="w-10 h-10 rounded-full object-cover"
              width={40}
              height={40}
            />
            <p className="text-sm text-muted-foreground">
              <span className="text-foreground font-medium">
                {t("founderQuote.name")}
              </span>{" "}
              — {t("founderQuote.role")}
            </p>
          </footer>
        </blockquote>
      </div>
    </section>
  );
};

export default FounderQuoteSection;
