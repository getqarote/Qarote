import { type CSSProperties, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import type { SupportedLocale } from "@qarote/i18n";
import { AlignLeft, ArrowRight, Lock, Shield } from "lucide-react";

import AuthButtons from "@/components/AuthButtons";
import { IslandProvider } from "@/components/IslandProvider";
import FooterSection from "@/components/landing/FooterSection";
import FounderQuoteSection from "@/components/landing/FounderQuoteSection";
import { TawkTo } from "@/components/TawkTo";

import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useScrollEntry } from "@/hooks/useScrollEntry";

interface AboutIslandProps {
  locale?: SupportedLocale;
  resources?: Record<string, Record<string, unknown>>;
}

export default function AboutIsland({
  locale = "en",
  resources,
}: AboutIslandProps) {
  return (
    <IslandProvider locale={locale} resources={resources}>
      <div className="min-h-screen font-sans bg-background">
        <AboutContent />
        <FooterSection currentLocale={locale} />
      </div>
      <TawkTo />
    </IslandProvider>
  );
}

function AboutContent() {
  const { t } = useTranslation("about");
  const reduceMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const [teamRef, teamEntered] = useScrollEntry<HTMLDivElement>(0.05);
  const [missionRef, missionEntered] = useScrollEntry<HTMLDivElement>(0.1);
  const [pivotRef, pivotEntered] = useScrollEntry<HTMLDivElement>(0.1);
  const [beliefsRef, beliefsEntered] = useScrollEntry<HTMLDivElement>(0.1);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const mountEnter = (delay: number): CSSProperties =>
    reduceMotion
      ? {}
      : {
          opacity: mounted ? 1 : 0,
          transform: mounted ? "none" : "translateY(10px)",
          transition: `opacity 0.5s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.5s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
        };

  const scrollEnter = (entered: boolean, delay: number): CSSProperties =>
    reduceMotion
      ? {}
      : {
          opacity: entered ? 1 : 0,
          transform: entered ? "none" : "translateY(12px)",
          transition: `opacity 0.5s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.5s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
        };

  const beliefs = [
    { id: "openSource", Icon: Shield },
    { id: "dataControl", Icon: Lock },
    { id: "honest", Icon: AlignLeft },
  ] as const;

  return (
    <>
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Page header — centered, prototype style */}
        <div
          className="mx-auto mb-12 max-w-3xl text-center"
          style={mountEnter(0)}
        >
          <span className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-primary">
            {t("hero.eyebrow")}
          </span>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            {t("hero.title")}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-foreground [text-wrap:pretty]">
            {t("hero.intro")}
          </p>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground [text-wrap:pretty]">
            {t("hero.subtitle")}
          </p>
        </div>

        {/* Mission — centered section head */}
        <div
          ref={missionRef}
          className="mx-auto mb-4 max-w-[620px] text-center"
          style={scrollEnter(missionEntered, 0)}
        >
          <span className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-primary">
            {t("mission.eyebrow")}
          </span>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {t("mission.title")}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-muted-foreground [text-wrap:pretty]">
            {t("mission.description")}
          </p>
        </div>
      </main>

      {/* Founder quote — full-bleed dark band (shared with landing) */}
      <FounderQuoteSection />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Why agent-first — the pivot */}
        <div
          ref={pivotRef}
          className="mb-12"
          style={scrollEnter(pivotEntered, 0)}
        >
          <div className="text-center max-w-2xl mx-auto mb-8">
            <span className="text-xs font-semibold uppercase tracking-wide text-primary">
              {t("pivot.eyebrow")}
            </span>
            <h2 className="text-2xl font-normal text-foreground mt-2 mb-3">
              {t("pivot.title")}
            </h2>
            <p className="text-muted-foreground [text-wrap:pretty]">
              {t("pivot.description")}
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr] items-center">
            <div className="border border-border p-6 bg-muted/20">
              <div className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground mb-3">
                {t("pivot.old.label")}
              </div>
              <h3 className="text-lg text-foreground leading-tight">
                {t("pivot.old.title")}
              </h3>
              <p className="text-sm text-muted-foreground mt-2.5 leading-relaxed [text-wrap:pretty]">
                {t("pivot.old.body")}
              </p>
            </div>
            <div
              className="grid place-items-center text-primary md:rotate-0 rotate-90"
              aria-hidden="true"
            >
              <ArrowRight className="w-8 h-8" strokeWidth={1.6} />
            </div>
            <div className="border border-primary p-6 bg-primary/5">
              <div className="font-mono text-[11px] uppercase tracking-wide text-primary mb-3">
                {t("pivot.new.label")}
              </div>
              <h3 className="text-lg text-foreground leading-tight">
                {t("pivot.new.title")}
              </h3>
              <p className="text-sm text-muted-foreground mt-2.5 leading-relaxed [text-wrap:pretty]">
                {t("pivot.new.body")}
              </p>
            </div>
          </div>
        </div>

        {/* What we believe */}
        <div
          ref={beliefsRef}
          className="mb-12"
          style={scrollEnter(beliefsEntered, 0)}
        >
          <div className="text-center max-w-xl mx-auto mb-8">
            <span className="text-xs font-semibold uppercase tracking-wide text-primary">
              {t("beliefs.eyebrow")}
            </span>
            <h2 className="text-2xl font-normal text-foreground mt-2">
              {t("beliefs.title")}
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {beliefs.map(({ id, Icon }) => (
              <div key={id} className="border border-border p-6 bg-card">
                <div className="w-10 h-10 grid place-items-center bg-primary/10 text-primary mb-3.5">
                  <Icon className="w-5 h-5" strokeWidth={1.7} />
                </div>
                <h3 className="text-base text-foreground">
                  {t(`beliefs.${id}.title`)}
                </h3>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed [text-wrap:pretty]">
                  {t(`beliefs.${id}.body`)}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Team — single compact card (prototype) */}
        <div className="mx-auto mb-8 max-w-[560px] text-center">
          <span className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-primary">
            {t("teamHeading.eyebrow")}
          </span>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {t("teamHeading.title")}
          </h2>
        </div>
        <div
          ref={teamRef}
          className="mx-auto max-w-[560px]"
          style={scrollEnter(teamEntered, 0)}
        >
          <article className="flex items-start gap-4 rounded-lg border border-border bg-card p-5">
            <img
              src="/images/team/brice.jpg"
              alt={t("team.brice.name")}
              width={52}
              height={52}
              className="h-[52px] w-[52px] shrink-0 rounded-full object-cover"
              loading="lazy"
            />
            <div className="min-w-0">
              <div className="text-[15px] font-semibold text-foreground">
                {t("team.brice.name")}
              </div>
              <div className="mt-0.5 font-mono text-xs text-primary">
                {t("teamCard.role")}
              </div>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                {t("teamCard.bio")}
              </p>
            </div>
          </article>
        </div>
        <p className="mx-auto mt-6 max-w-[560px] text-center font-mono text-xs text-muted-foreground">
          {t("teamHeading.hiring")}{" "}
          <a
            href="mailto:support@qarote.io"
            className="font-medium text-primary hover:underline"
          >
            {t("teamHeading.hiringLink")}
          </a>
          .
        </p>

        {/* CTA band */}
        <div className="mx-auto mt-16 max-w-3xl rounded-lg border border-border bg-muted/20 px-6 py-10 text-center sm:px-10">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {t("cta.heading")}
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">
            {t("cta.body")}
          </p>
          <div className="mt-6 flex flex-col items-center gap-3">
            <AuthButtons align="center" />
            <a
              href="/features/"
              className="text-sm font-medium text-primary underline-offset-2 hover:underline"
            >
              {t("cta.secondary")}
            </a>
          </div>
        </div>
      </main>
    </>
  );
}
