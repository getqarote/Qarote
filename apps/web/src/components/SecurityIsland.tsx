import { type CSSProperties, type ReactNode, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import type { SupportedLocale } from "@qarote/i18n";

import { IslandProvider } from "@/components/IslandProvider";
import FooterSection from "@/components/landing/FooterSection";
import { TawkTo } from "@/components/TawkTo";

import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useScrollEntry } from "@/hooks/useScrollEntry";

interface IslandProps {
  locale?: SupportedLocale;
  resources?: Record<string, Record<string, unknown>>;
}

interface ResidencyRow {
  name: string;
  detail: string;
  badge: string;
  residency: "in" | "out";
}

const NS = "security";

// Shared bits ---------------------------------------------------------------

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-primary">
      {children}
    </span>
  );
}

function SectionHead({
  eyebrow,
  heading,
  body,
}: {
  eyebrow: string;
  heading: string;
  body?: string;
}) {
  return (
    <div className="mx-auto mb-8 max-w-[620px] text-center">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
        {heading}
      </h2>
      {body && (
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
          {body}
        </p>
      )}
    </div>
  );
}

function Check() {
  return (
    <svg
      className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

/** Marketing "sec-card": icon tile + heading + body + optional children. */
function SecCard({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="mb-4 grid h-10 w-10 place-items-center rounded-lg bg-accent text-primary">
        {icon}
      </div>
      <h3 className="mb-2 text-base font-semibold text-foreground">{title}</h3>
      <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">
        {children}
      </div>
    </div>
  );
}

function useEnter() {
  const reduceMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    requestAnimationFrame(() => requestAnimationFrame(() => setMounted(true)));
  }, []);
  return (delay = 0): CSSProperties =>
    reduceMotion
      ? {}
      : {
          opacity: mounted ? 1 : 0,
          transform: mounted ? "translateY(0)" : "translateY(14px)",
          transition: `opacity 0.55s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.55s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
        };
}

// Hero ----------------------------------------------------------------------

function Hero() {
  const { t } = useTranslation(NS);
  const enter = useEnter();
  return (
    <section className="mx-auto mb-12 max-w-2xl text-center">
      <Eyebrow>{t("hero.eyebrow")}</Eyebrow>
      <h1
        className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-5xl"
        style={enter(0)}
      >
        {t("hero.title")}
      </h1>
      <p
        className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground"
        style={enter(80)}
      >
        {t("hero.subtitle")}
      </p>
    </section>
  );
}

// Data handling -------------------------------------------------------------

function DataHandling() {
  const { t } = useTranslation(NS);
  const noStore = Array.isArray(
    t("data.noStore.items", { returnObjects: true })
  )
    ? (t("data.noStore.items", { returnObjects: true }) as string[])
    : [];
  return (
    <section className="mb-12 grid gap-4 sm:grid-cols-2">
      <SecCard
        title={t("data.encryption.title")}
        icon={
          <svg
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.7}
            aria-hidden="true"
          >
            <rect x="4" y="10" width="16" height="11" rx="2" />
            <path d="M8 10V7a4 4 0 0 1 8 0v3" />
          </svg>
        }
      >
        <p>{t("data.encryption.body")}</p>
      </SecCard>

      <SecCard
        title={t("data.noStore.title")}
        icon={
          <svg
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.7}
            aria-hidden="true"
          >
            <path d="M4 7h16M4 12h16M4 17h10" />
          </svg>
        }
      >
        <p>{t("data.noStore.body")}</p>
        <ul className="space-y-1.5 pl-0">
          {noStore.map((item) => (
            <li key={item} className="flex items-start gap-2">
              <Check />
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <p className="pt-1">{t("data.noStore.note")}</p>
      </SecCard>
    </section>
  );
}

// AI & data residency -------------------------------------------------------

function AiResidency() {
  const { t } = useTranslation(NS);
  const reduceMotion = useReducedMotion();
  const [listRef, listEntered] = useScrollEntry<HTMLDivElement>(0.05);

  const rowsRaw = t("residency.rows", { returnObjects: true });
  const rows: ResidencyRow[] = Array.isArray(rowsRaw)
    ? (rowsRaw as ResidencyRow[])
    : [];

  const rowStyle = (i: number): CSSProperties =>
    reduceMotion
      ? {}
      : {
          opacity: listEntered ? 1 : 0,
          transform: listEntered ? "translateY(0)" : "translateY(10px)",
          transition: `opacity 0.4s cubic-bezier(0.16,1,0.3,1) ${i * 55}ms, transform 0.4s cubic-bezier(0.16,1,0.3,1) ${i * 55}ms`,
        };

  return (
    <section className="mb-12">
      <SectionHead
        eyebrow={t("residency.eyebrow")}
        heading={t("residency.heading")}
        body={t("residency.body")}
      />
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="hidden grid-cols-[1fr_2fr_auto] gap-8 border-b border-border bg-muted/30 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:grid">
          <span>{t("residency.cols.provider")}</span>
          <span>{t("residency.cols.flow")}</span>
          <span>{t("residency.cols.residency")}</span>
        </div>
        <div ref={listRef} className="divide-y divide-border">
          {rows.map((row, i) => (
            <div
              key={i}
              className="grid grid-cols-1 gap-2 px-6 py-5 sm:grid-cols-[1fr_2fr_auto] sm:gap-8"
              style={rowStyle(i)}
            >
              <div className="text-sm font-semibold leading-snug text-foreground">
                {row.name}
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {row.detail}
              </p>
              <span
                className={`inline-flex items-center self-start whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium ${
                  row.residency === "in"
                    ? "border-primary/30 bg-accent text-primary"
                    : "border-border bg-muted/40 text-muted-foreground"
                }`}
              >
                {row.badge}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Self-host & compliance ----------------------------------------------------

function Control() {
  const { t } = useTranslation(NS);
  const selfHost = Array.isArray(
    t("control.selfHost.items", { returnObjects: true })
  )
    ? (t("control.selfHost.items", { returnObjects: true }) as string[])
    : [];
  return (
    <section className="mb-12 grid gap-4 sm:grid-cols-2">
      <SecCard
        title={t("control.selfHost.title")}
        icon={
          <svg
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.7}
            aria-hidden="true"
          >
            <rect x="3" y="4" width="18" height="7" rx="2" />
            <rect x="3" y="13" width="18" height="7" rx="2" />
            <path d="M7 7.5h.01M7 16.5h.01" />
          </svg>
        }
      >
        <p>{t("control.selfHost.body")}</p>
        <ul className="space-y-1.5 pl-0">
          {selfHost.map((item) => (
            <li key={item} className="flex items-start gap-2">
              <Check />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </SecCard>

      <SecCard
        title={t("control.compliance.title")}
        icon={
          <svg
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.7}
            aria-hidden="true"
          >
            <path d="M12 3l8 3v6c0 4.5-3.2 7.5-8 9-4.8-1.5-8-4.5-8-9V6Z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
        }
      >
        <p>{t("control.compliance.body")}</p>
        <a
          href="#contact-security"
          className="group mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-primary underline-offset-2 transition-colors hover:underline"
        >
          {t("control.compliance.cta")}
          <span
            className="transition-transform duration-150 group-hover:translate-x-0.5"
            aria-hidden="true"
          >
            →
          </span>
        </a>
      </SecCard>
    </section>
  );
}

// Responsible disclosure ----------------------------------------------------

function Disclosure() {
  const { t } = useTranslation(NS);
  return (
    <section className="mb-12">
      <div className="mx-auto flex max-w-3xl items-start gap-4 rounded-lg border border-border bg-card p-6 sm:p-8">
        <span
          className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-accent text-primary"
          aria-hidden="true"
        >
          <svg
            className="h-[22px] w-[22px]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.7}
          >
            <path d="M12 3l8 3v6c0 4.5-3.2 7.5-8 9-4.8-1.5-8-4.5-8-9V6Z" />
          </svg>
        </span>
        <div>
          <h3 className="mb-2 text-base font-semibold text-foreground">
            {t("disclosure.heading")}
          </h3>
          <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
            {t("disclosure.body")}
          </p>
          <a
            href={`mailto:${t("disclosure.email")}`}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 active:translate-y-px"
          >
            {t("disclosure.cta")}
          </a>
        </div>
      </div>
    </section>
  );
}

// CTA band ------------------------------------------------------------------

function CtaBand({ locale }: { locale: SupportedLocale }) {
  const { t } = useTranslation(NS);
  const privacyHref =
    locale === "en" ? "/privacy-policy/" : `/${locale}/privacy-policy/`;
  return (
    <section className="mb-4">
      <div className="mx-auto max-w-3xl rounded-lg border border-border bg-muted/20 px-6 py-10 text-center sm:px-10">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {t("cta.heading")}
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">
          {t("cta.body")}
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <a
            id="contact-security"
            href={`mailto:${t("disclosure.email")}`}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 active:translate-y-px"
          >
            {t("cta.primary")}
            <span aria-hidden="true">→</span>
          </a>
          <a
            href={privacyHref}
            className="inline-flex items-center rounded-md border border-border px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted/40"
          >
            {t("cta.secondary")}
          </a>
        </div>
      </div>
    </section>
  );
}

// Island root ---------------------------------------------------------------

export function SecurityIsland({ locale = "en", resources }: IslandProps) {
  return (
    <IslandProvider locale={locale} resources={resources}>
      <div className="min-h-screen bg-background font-sans">
        <main className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
          <Hero />
          <DataHandling />
          <AiResidency />
          <Control />
          <Disclosure />
          <CtaBand locale={locale} />
        </main>
        <FooterSection currentLocale={locale} />
      </div>
      <TawkTo />
    </IslandProvider>
  );
}
