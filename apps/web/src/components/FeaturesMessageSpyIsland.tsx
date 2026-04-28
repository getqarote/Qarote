import { type CSSProperties, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import type { SupportedLocale } from "@qarote/i18n";

import AuthButtons from "@/components/AuthButtons";
import { IslandProvider } from "@/components/IslandProvider";
import FinalCtaSection from "@/components/landing/FinalCtaSection";
import FooterSection from "@/components/landing/FooterSection";
import StickyNav from "@/components/StickyNav";
import { TawkTo } from "@/components/TawkTo";

interface IslandProps {
  locale?: SupportedLocale;
  resources?: Record<string, Record<string, unknown>>;
}

interface ProblemItem {
  icon: string;
  title: string;
  description: string;
}

interface StepItem {
  number: string;
  title: string;
  description: string;
}

interface CapabilityItem {
  icon: string;
  title: string;
  description: string;
}

interface UseCaseItem {
  title: string;
  description: string;
}

interface FaqItem {
  question: string;
  answer: string;
}

const NS = "features-message-spy";

// ---------------------------------------------------------------------------
// Animation helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Hero
// ---------------------------------------------------------------------------

function Hero() {
  const { t } = useTranslation(NS);
  const reduceMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => requestAnimationFrame(() => setMounted(true)));
  }, []);

  const enter = (delay = 0): CSSProperties =>
    reduceMotion
      ? {}
      : {
          opacity: mounted ? 1 : 0,
          transform: mounted ? "translateY(0)" : "translateY(14px)",
          transition: `opacity 0.55s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.55s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
        };

  return (
    <div className="border border-border overflow-hidden mb-8">
      <div className="px-6 py-3 bg-muted/30 border-b border-border">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t("hero.eyebrow")}
        </span>
      </div>
      <div className="p-8 text-center">
        <h1
          className="text-3xl sm:text-4xl lg:text-5xl font-normal text-foreground mb-6"
          style={enter(0)}
        >
          {t("hero.title")}
        </h1>
        <p
          className="text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed mb-8"
          style={enter(80)}
        >
          {t("hero.subtitle")}
        </p>
        <div style={enter(160)}>
          <AuthButtons align="center" />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Problem
// ---------------------------------------------------------------------------

function ProblemSection() {
  const { t } = useTranslation(NS);
  const reduceMotion = useReducedMotion();
  const [gridRef, gridEntered] = useScrollEntry<HTMLDivElement>(0.05);

  const items = ((): ProblemItem[] => {
    const raw = t("problem.items", { returnObjects: true });
    return Array.isArray(raw) ? (raw as ProblemItem[]) : [];
  })();

  const itemStyle = (i: number): CSSProperties =>
    reduceMotion
      ? {}
      : {
          opacity: gridEntered ? 1 : 0,
          transform: gridEntered ? "translateY(0)" : "translateY(12px)",
          transition: `opacity 0.45s cubic-bezier(0.16,1,0.3,1) ${i * 60}ms, transform 0.45s cubic-bezier(0.16,1,0.3,1) ${i * 60}ms`,
        };

  return (
    <div className="border border-border overflow-hidden mb-8">
      <div className="px-6 py-3 bg-muted/30 border-b border-border">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t("problem.eyebrow")}
        </span>
      </div>
      <div className="p-6 sm:p-8">
        <h2 className="text-2xl sm:text-3xl font-normal text-foreground mb-4">
          {t("problem.heading")}
        </h2>
        <p className="text-muted-foreground leading-relaxed mb-8 max-w-3xl">
          {t("problem.body")}
        </p>
        <div ref={gridRef} className="grid sm:grid-cols-3 gap-6">
          {items.map((item, i) => (
            <div
              key={i}
              className="flex items-start gap-4 border border-border p-5"
              style={itemStyle(i)}
            >
              <div className="shrink-0 w-9 h-9 flex items-center justify-center bg-feature-icon-bg">
                <img
                  src={`/images/${item.icon}`}
                  alt=""
                  aria-hidden="true"
                  className="h-4 w-auto image-crisp"
                  width={16}
                  height={16}
                />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground mb-1">
                  {item.title}
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Solution / How it works
// ---------------------------------------------------------------------------

function SolutionSection() {
  const { t } = useTranslation(NS);

  const steps = ((): StepItem[] => {
    const raw = t("solution.steps", { returnObjects: true });
    return Array.isArray(raw) ? (raw as StepItem[]) : [];
  })();

  return (
    <div className="border border-border overflow-hidden mb-8">
      <div className="px-6 py-3 bg-muted/30 border-b border-border">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t("solution.eyebrow")}
        </span>
      </div>
      <div className="p-6 sm:p-8">
        <h2 className="text-2xl sm:text-3xl font-normal text-foreground mb-4">
          {t("solution.heading")}
        </h2>
        <p className="text-muted-foreground leading-relaxed mb-8 max-w-3xl">
          {t("solution.body")}
        </p>
        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, i) => (
            <div key={i} className="space-y-3">
              <span className="block text-4xl font-display font-light text-primary/50 select-none tabular-nums">
                {step.number}
              </span>
              <p className="text-sm font-semibold text-foreground">
                {step.title}
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Capabilities grid
// ---------------------------------------------------------------------------

function CapabilitiesSection() {
  const { t } = useTranslation(NS);
  const reduceMotion = useReducedMotion();
  const [gridRef, gridEntered] = useScrollEntry<HTMLDivElement>(0.05);

  const items = ((): CapabilityItem[] => {
    const raw = t("capabilities.items", { returnObjects: true });
    return Array.isArray(raw) ? (raw as CapabilityItem[]) : [];
  })();

  const itemStyle = (i: number): CSSProperties =>
    reduceMotion
      ? {}
      : {
          opacity: gridEntered ? 1 : 0,
          transform: gridEntered ? "translateY(0)" : "translateY(12px)",
          transition: `opacity 0.45s cubic-bezier(0.16,1,0.3,1) ${i * 50}ms, transform 0.45s cubic-bezier(0.16,1,0.3,1) ${i * 50}ms`,
        };

  return (
    <div className="border border-border overflow-hidden mb-8">
      <div className="px-6 py-3 bg-muted/30 border-b border-border">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t("capabilities.eyebrow")}
        </span>
      </div>
      <div className="p-6 sm:p-8">
        <h2 className="text-2xl sm:text-3xl font-normal text-foreground mb-8">
          {t("capabilities.heading")}
        </h2>
        <div ref={gridRef} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {items.map((item, i) => (
            <div
              key={i}
              className="flex items-start gap-4 border border-border p-5"
              style={itemStyle(i)}
            >
              <div className="shrink-0 w-9 h-9 flex items-center justify-center bg-feature-icon-bg">
                <img
                  src={`/images/${item.icon}`}
                  alt=""
                  aria-hidden="true"
                  className="h-4 w-auto image-crisp"
                  width={16}
                  height={16}
                />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground mb-1">
                  {item.title}
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Use cases
// ---------------------------------------------------------------------------

function UseCasesSection() {
  const { t } = useTranslation(NS);
  const reduceMotion = useReducedMotion();
  const [listRef, listEntered] = useScrollEntry<HTMLDivElement>(0.05);

  const items = ((): UseCaseItem[] => {
    const raw = t("useCases.items", { returnObjects: true });
    return Array.isArray(raw) ? (raw as UseCaseItem[]) : [];
  })();

  const itemStyle = (i: number): CSSProperties =>
    reduceMotion
      ? {}
      : {
          opacity: listEntered ? 1 : 0,
          transform: listEntered ? "translateY(0)" : "translateY(8px)",
          transition: `opacity 0.4s cubic-bezier(0.16,1,0.3,1) ${i * 55}ms, transform 0.4s cubic-bezier(0.16,1,0.3,1) ${i * 55}ms`,
        };

  return (
    <div className="border border-border overflow-hidden mb-8">
      <div className="px-6 py-3 bg-muted/30 border-b border-border">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t("useCases.eyebrow")}
        </span>
      </div>
      <div className="p-6 sm:p-8">
        <h2 className="text-2xl sm:text-3xl font-normal text-foreground mb-8">
          {t("useCases.heading")}
        </h2>
        <div ref={listRef} className="grid sm:grid-cols-2 gap-6">
          {items.map((item, i) => (
            <div
              key={i}
              className="border border-border p-6"
              style={itemStyle(i)}
            >
              <h3 className="text-sm font-semibold text-foreground mb-2">
                {item.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Safety callout
// ---------------------------------------------------------------------------

function SafetySection() {
  const { t } = useTranslation(NS);
  const reduceMotion = useReducedMotion();
  const [ref, entered] = useScrollEntry<HTMLDivElement>(0.1);

  const style: CSSProperties = reduceMotion
    ? {}
    : {
        opacity: entered ? 1 : 0,
        transform: entered ? "translateY(0)" : "translateY(10px)",
        transition:
          "opacity 0.5s cubic-bezier(0.16,1,0.3,1), transform 0.5s cubic-bezier(0.16,1,0.3,1)",
      };

  return (
    <div
      ref={ref}
      className="border border-border overflow-hidden mb-8"
      style={style}
    >
      <div className="px-6 py-3 bg-muted/30 border-b border-border">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t("safety.eyebrow")}
        </span>
      </div>
      <div className="p-6 sm:p-8 flex gap-6 items-start">
        <div className="shrink-0 w-10 h-10 flex items-center justify-center bg-feature-icon-bg mt-0.5">
          <img
            src="/images/flag.svg"
            alt=""
            aria-hidden="true"
            className="h-5 w-auto image-crisp"
            width={20}
            height={20}
          />
        </div>
        <div>
          <h2 className="text-xl font-normal text-foreground mb-3">
            {t("safety.heading")}
          </h2>
          <p className="text-muted-foreground leading-relaxed max-w-3xl">
            {t("safety.body")}
          </p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cross-links
// ---------------------------------------------------------------------------

function CrossLinkSection({ locale }: { locale: SupportedLocale }) {
  const { t } = useTranslation(NS);
  const lp = (path: string) => (locale === "en" ? path : `/${locale}${path}`);

  return (
    <div className="border border-border overflow-hidden mb-8">
      <div className="px-6 py-3 bg-muted/30 border-b border-border">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t("crossLink.eyebrow")}
        </span>
      </div>
      <nav aria-label={t("crossLink.navLabel")}>
        <ul className="flex flex-wrap gap-x-6 gap-y-3 items-center list-none p-6">
          <li>
            <a
              href={lp("/features/message-tracing/")}
              className="text-sm text-primary hover:underline"
            >
              {t("crossLink.messageTracing")}
            </a>
          </li>
          <li aria-hidden="true">
            <span className="text-muted-foreground text-xs">·</span>
          </li>
          <li>
            <a
              href={lp("/features/metrics/")}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {t("crossLink.queueHistory")}
            </a>
          </li>
          <li aria-hidden="true">
            <span className="text-muted-foreground text-xs">·</span>
          </li>
          <li>
            <a
              href={lp("/features/alerting/")}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {t("crossLink.alerting")}
            </a>
          </li>
          <li aria-hidden="true">
            <span className="text-muted-foreground text-xs">·</span>
          </li>
          <li>
            <a
              href={lp("/features/")}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {t("crossLink.features")}
            </a>
          </li>
        </ul>
      </nav>
    </div>
  );
}

// ---------------------------------------------------------------------------
// FAQ
// ---------------------------------------------------------------------------

function FaqSection() {
  const { t } = useTranslation(NS);

  const items = ((): FaqItem[] => {
    const raw = t("faq.items", { returnObjects: true });
    return Array.isArray(raw) ? (raw as FaqItem[]) : [];
  })();

  return (
    <div className="border border-border overflow-hidden mb-8">
      <div className="px-6 py-3 bg-muted/30 border-b border-border">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t("faq.heading")}
        </span>
      </div>
      <h2 className="sr-only">{t("faq.heading")}</h2>
      <ul className="divide-y divide-border list-none">
        {items.map((item, i) => (
          <li key={i}>
            <details className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-6 marker:hidden [&::-webkit-details-marker]:hidden">
                <span className="text-sm font-semibold text-foreground">
                  {item.question}
                </span>
                <span
                  className="shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                  aria-hidden="true"
                >
                  ▾
                </span>
              </summary>
              <p className="px-6 pb-6 text-sm text-muted-foreground leading-relaxed">
                {item.answer}
              </p>
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Island export
// ---------------------------------------------------------------------------

export function FeaturesMessageSpyIsland({
  locale = "en",
  resources,
}: IslandProps) {
  return (
    <IslandProvider locale={locale} resources={resources}>
      <div className="min-h-screen font-sans bg-background">
        <StickyNav />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Hero />
          <ProblemSection />
          <SolutionSection />
          <CapabilitiesSection />
          <UseCasesSection />
          <SafetySection />
          <CrossLinkSection locale={locale} />
          <FaqSection />
        </main>
        <FinalCtaSection />
        <FooterSection currentLocale={locale} />
      </div>
      <TawkTo />
    </IslandProvider>
  );
}
