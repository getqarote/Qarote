import { type CSSProperties, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import type { SupportedLocale } from "@qarote/i18n";

import AuthButtons from "@/components/AuthButtons";
import { IslandProvider } from "@/components/IslandProvider";
import FinalCtaSection from "@/components/landing/FinalCtaSection";
import FooterSection from "@/components/landing/FooterSection";
import StickyNav from "@/components/StickyNav";
import { TawkTo } from "@/components/TawkTo";

import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useScrollEntry } from "@/hooks/useScrollEntry";

interface IslandProps {
  locale?: SupportedLocale;
  resources?: Record<string, Record<string, unknown>>;
}

interface AlertTypeItem {
  icon: string;
  title: string;
  description: string;
}

interface StepItem {
  number: string;
  title: string;
  description: string;
}

interface FaqItem {
  question: string;
  answer: string;
}

const NS = "features-alerting";

// ---------------------------------------------------------------------------
// Hero
// ---------------------------------------------------------------------------

function Hero() {
  const { t } = useTranslation(NS);
  const reduceMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    setMounted(true);
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setEntered(true));
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, []);

  const enter = (delay = 0): CSSProperties =>
    reduceMotion || !mounted
      ? {}
      : !entered
        ? { opacity: 0, transform: "translateY(14px)" }
        : {
            opacity: 1,
            transform: "translateY(0)",
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
// Alert types grid
// ---------------------------------------------------------------------------

function AlertTypesSection() {
  const { t } = useTranslation(NS);
  const reduceMotion = useReducedMotion();
  const [gridRef, gridEntered] = useScrollEntry<HTMLDivElement>(0.05);

  const items = ((): AlertTypeItem[] => {
    const raw = t("alertTypes.items", { returnObjects: true });
    return Array.isArray(raw) ? (raw as AlertTypeItem[]) : [];
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
          {t("alertTypes.eyebrow")}
        </span>
      </div>
      <div className="p-6 sm:p-8">
        <h2 className="text-2xl sm:text-3xl font-normal text-foreground mb-8">
          {t("alertTypes.heading")}
        </h2>
        <div
          ref={gridRef}
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch"
        >
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
// How it works
// ---------------------------------------------------------------------------

function HowItWorksSection() {
  const { t } = useTranslation(NS);

  const steps = ((): StepItem[] => {
    const raw = t("howItWorks.steps", { returnObjects: true });
    return Array.isArray(raw) ? (raw as StepItem[]) : [];
  })();

  return (
    <div className="border border-border overflow-hidden mb-8">
      <div className="px-6 py-3 bg-muted/30 border-b border-border">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t("howItWorks.eyebrow")}
        </span>
      </div>
      <div className="p-6 sm:p-8">
        <h2 className="text-2xl sm:text-3xl font-normal text-foreground mb-8">
          {t("howItWorks.heading")}
        </h2>
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
// Why not Prometheus
// ---------------------------------------------------------------------------

function WhyNotPrometheusSection() {
  const { t } = useTranslation(NS);

  const paragraphs: string[] = [];
  for (const key of ["p1", "p2", "p3", "p4"]) {
    const val = t(`whyNotPrometheus.${key}`, { defaultValue: "" });
    if (val) paragraphs.push(val);
  }

  return (
    <div className="border border-border overflow-hidden mb-8">
      <div className="px-6 py-3 bg-muted/30 border-b border-border">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t("whyNotPrometheus.eyebrow")}
        </span>
      </div>
      <div className="p-6 sm:p-8">
        <h2 className="text-2xl sm:text-3xl font-normal text-foreground mb-6">
          {t("whyNotPrometheus.heading")}
        </h2>
        <div className="max-w-3xl space-y-4">
          {paragraphs.map((text, i) => (
            <p key={i} className="text-muted-foreground leading-relaxed">
              {text}
            </p>
          ))}
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
              href={lp("/compare/grafana-prometheus/")}
              className="text-sm text-primary hover:underline"
            >
              {t("crossLink.compare")}
            </a>
          </li>
          <li aria-hidden="true">
            <span className="text-muted-foreground text-xs">·</span>
          </li>
          <li>
            <a
              href={lp("/compare/datadog/")}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {t("crossLink.datadog")}
            </a>
          </li>
          <li aria-hidden="true">
            <span className="text-muted-foreground text-xs">·</span>
          </li>
          <li>
            <a
              href={lp("/pricing/")}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {t("crossLink.pricing")}
            </a>
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

export function FeaturesAlertingIsland({
  locale = "en",
  resources,
}: IslandProps) {
  return (
    <IslandProvider locale={locale} resources={resources}>
      <div className="min-h-screen font-sans bg-background">
        <StickyNav />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Hero />
          <AlertTypesSection />
          <HowItWorksSection />
          <WhyNotPrometheusSection />
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
