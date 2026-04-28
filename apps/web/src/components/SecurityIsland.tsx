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

interface PillarItem {
  title: string;
  description: string;
}

interface FaqItem {
  question: string;
  answer: string;
}

const NS = "security";

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
          className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-8"
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
// Table of contents
// ---------------------------------------------------------------------------

function Toc() {
  const { t } = useTranslation(NS);

  const sections = [
    { id: "pillars", label: t("pillars.eyebrow") },
    { id: "selfhosted", label: t("selfHosted.eyebrow") },
    { id: "disclosure", label: t("disclosure.eyebrow") },
    { id: "faq", label: t("faq.heading") },
  ];

  return (
    <nav className="border border-border overflow-hidden mb-8">
      <div className="px-6 py-3 bg-muted/30 border-b border-border">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t("toc.heading")}
        </span>
      </div>
      <div className="p-6">
        <ol className="grid sm:grid-cols-2 gap-x-8 gap-y-2 text-sm list-none pl-0">
          {sections.map((s, i) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                className="group flex items-baseline gap-2 text-muted-foreground hover:text-foreground transition-colors duration-150"
              >
                <span
                  className="text-xs text-primary/50 shrink-0 transition-colors duration-150 group-hover:text-primary"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                {s.label}
              </a>
            </li>
          ))}
        </ol>
      </div>
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Security pillars grid
// ---------------------------------------------------------------------------

function Pillars() {
  const { t } = useTranslation(NS);
  const reduceMotion = useReducedMotion();
  const [listRef, listEntered] = useScrollEntry<HTMLDivElement>(0.05);

  const items = t("pillars.items", { returnObjects: true }) as PillarItem[];

  const itemStyle = (i: number): CSSProperties =>
    reduceMotion
      ? {}
      : {
          opacity: listEntered ? 1 : 0,
          transform: listEntered ? "translateY(0)" : "translateY(10px)",
          transition: `opacity 0.4s cubic-bezier(0.16,1,0.3,1) ${i * 55}ms, transform 0.4s cubic-bezier(0.16,1,0.3,1) ${i * 55}ms`,
        };

  return (
    <div className="border border-border overflow-hidden mb-8">
      <div className="px-6 py-3 bg-muted/30 border-b border-border flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t("pillars.eyebrow")}
        </span>
        <span className="text-xs text-muted-foreground/50 font-mono">
          {items.length} controls
        </span>
      </div>
      <div className="px-6 sm:px-8 pt-6 pb-2">
        <h2 className="text-2xl sm:text-3xl font-normal text-foreground mb-6">
          {t("pillars.heading")}
        </h2>
      </div>
      <div ref={listRef} className="divide-y divide-border">
        {items.map((item, i) => (
          <div
            key={i}
            className="group grid grid-cols-1 sm:grid-cols-[1fr_2fr] gap-2 sm:gap-8 px-6 sm:px-8 py-5 hover:bg-muted/10 transition-colors duration-150"
            style={itemStyle(i)}
          >
            <div className="flex items-start gap-3 sm:block">
              <span
                className="text-xs text-primary/50 leading-none mt-0.5 sm:mb-2 shrink-0 transition-colors duration-200 group-hover:text-primary/80"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="text-sm font-semibold text-foreground leading-snug">
                {item.title}
              </h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed pl-6 sm:pl-0">
              {item.description}
            </p>
          </div>
        ))}
      </div>
      <div className="h-4" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Self-hosted callout
// ---------------------------------------------------------------------------

function SelfHosted() {
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
          {t("selfHosted.eyebrow")}
        </span>
      </div>
      <div className="p-6 sm:p-8 flex flex-col sm:flex-row gap-8 items-start">
        <div className="flex-1">
          <h2 className="text-2xl sm:text-3xl font-normal text-foreground mb-4">
            {t("selfHosted.heading")}
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-6">
            {t("selfHosted.body")}
          </p>
          <a
            href="/docs/self-hosted/deployment/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline underline-offset-2 transition-colors group"
          >
            {t("selfHosted.cta")}
            <svg
              className="w-4 h-4 transition-transform duration-150 group-hover:translate-x-0.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </a>
        </div>
        <div className="shrink-0 border border-border rounded-md px-6 py-5 bg-muted/20 text-sm text-muted-foreground space-y-2 min-w-[200px]">
          {(Array.isArray(t("selfHosted.features", { returnObjects: true }))
            ? (t("selfHosted.features", { returnObjects: true }) as string[])
            : []
          ).map((feat) => (
            <div key={feat} className="flex items-center gap-2">
              <img
                src="/images/check.svg"
                alt=""
                aria-hidden="true"
                className="h-3 w-auto image-crisp shrink-0"
                width={12}
                height={12}
              />
              <span>{feat}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Responsible disclosure
// ---------------------------------------------------------------------------

function Disclosure() {
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
          {t("disclosure.eyebrow")}
        </span>
      </div>
      <div className="p-6 sm:p-8">
        <h2 className="text-2xl sm:text-3xl font-normal text-foreground mb-4">
          {t("disclosure.heading")}
        </h2>
        <p className="text-muted-foreground leading-relaxed mb-6 max-w-2xl">
          {t("disclosure.body")}
        </p>
        <a
          href={`mailto:${t("disclosure.email")}`}
          className="inline-flex items-center gap-2 text-sm font-medium border border-border rounded-md px-4 py-2.5 text-foreground hover:border-primary/40 hover:text-primary transition-all duration-150 active:scale-[0.97] active:translate-y-px"
        >
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            aria-hidden="true"
          >
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
          </svg>
          {t("disclosure.email")}
        </a>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// FAQ
// ---------------------------------------------------------------------------

function Faq() {
  const { t } = useTranslation(NS);
  const [open, setOpen] = useState<number | null>(null);
  const [ref, entered] = useScrollEntry<HTMLDivElement>(0.05);
  const reduceMotion = useReducedMotion();

  const items = t("faq.items", { returnObjects: true }) as FaqItem[];

  const itemStyle = (i: number): CSSProperties =>
    reduceMotion
      ? {}
      : {
          opacity: entered ? 1 : 0,
          transform: entered ? "translateY(0)" : "translateY(8px)",
          transition: `opacity 0.4s cubic-bezier(0.16,1,0.3,1) ${i * 50}ms, transform 0.4s cubic-bezier(0.16,1,0.3,1) ${i * 50}ms`,
        };

  return (
    <div className="border border-border overflow-hidden mb-8">
      <div className="px-6 py-3 bg-muted/30 border-b border-border">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t("faq.heading")}
        </span>
      </div>
      <div ref={ref} className="divide-y divide-border">
        {items.map((item, i) => (
          <div key={i} style={itemStyle(i)}>
            <button
              type="button"
              onClick={() => setOpen(open === i ? null : i)}
              className="w-full flex items-start justify-between gap-4 px-6 py-5 text-left hover:bg-muted/20 transition-colors duration-150"
              aria-expanded={open === i}
            >
              <span className="text-sm font-medium text-foreground">
                {item.question}
              </span>
              <svg
                className={`w-4 h-4 shrink-0 text-muted-foreground mt-0.5 transition-transform duration-250 ${open === i ? "rotate-180" : ""}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {/* grid-template-rows animation: 0fr→1fr clips without JS height measurement */}
            <div
              className="grid overflow-hidden"
              style={{
                gridTemplateRows: open === i ? "1fr" : "0fr",
                transition: reduceMotion
                  ? "none"
                  : "grid-template-rows 0.28s cubic-bezier(0.16,1,0.3,1)",
              }}
            >
              <div className="overflow-hidden">
                <div className="px-6 pb-5 text-sm text-muted-foreground leading-relaxed">
                  {item.answer}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Island root
// ---------------------------------------------------------------------------

export function SecurityIsland({ locale = "en", resources }: IslandProps) {
  return (
    <IslandProvider locale={locale} resources={resources}>
      <div className="min-h-screen font-sans bg-background">
        <StickyNav />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Hero />
          <Toc />
          <div id="pillars">
            <Pillars />
          </div>
          <div id="selfhosted">
            <SelfHosted />
          </div>
          <div id="disclosure">
            <Disclosure />
          </div>
          <div id="faq">
            <Faq />
          </div>
        </main>
        <FinalCtaSection />
        <FooterSection currentLocale={locale} />
      </div>
      <TawkTo />
    </IslandProvider>
  );
}
