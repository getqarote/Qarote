import { type CSSProperties, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import type { SupportedLocale } from "@qarote/i18n";

import { IslandProvider } from "@/components/IslandProvider";
import { type BlogPostPreview } from "@/components/landing/BlogSection";
import FinalCtaSection from "@/components/landing/FinalCtaSection";
import FooterSection from "@/components/landing/FooterSection";
import StickyNav from "@/components/StickyNav";
import { TawkTo } from "@/components/TawkTo";

import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useScrollEntry } from "@/hooks/useScrollEntry";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CellType = "win" | "neutral" | "loss";

interface TableRow {
  key: string;
  competitorType: CellType;
  qaroteType: CellType;
}

interface IslandProps {
  locale?: SupportedLocale;
  resources?: Record<string, Record<string, unknown>>;
  blogPosts?: BlogPostPreview[];
}

// ---------------------------------------------------------------------------
// Row configurations
// ---------------------------------------------------------------------------

const DATADOG_ROWS: TableRow[] = [
  { key: "rabbitmqNative", competitorType: "neutral", qaroteType: "win" },
  { key: "setupTime", competitorType: "neutral", qaroteType: "win" },
  { key: "selfHosted", competitorType: "loss", qaroteType: "win" },
  { key: "dataPrivacy", competitorType: "loss", qaroteType: "win" },
  { key: "pricingModel", competitorType: "neutral", qaroteType: "win" },
  { key: "estimatedCost", competitorType: "neutral", qaroteType: "win" },
  { key: "multiVhost", competitorType: "neutral", qaroteType: "win" },
  { key: "alerting", competitorType: "win", qaroteType: "win" },
  { key: "openSource", competitorType: "loss", qaroteType: "win" },
  { key: "integrations", competitorType: "win", qaroteType: "neutral" },
];

const GRAFANA_ROWS: TableRow[] = [
  { key: "rabbitmqNative", competitorType: "neutral", qaroteType: "win" },
  { key: "components", competitorType: "loss", qaroteType: "win" },
  { key: "setupTime", competitorType: "loss", qaroteType: "win" },
  { key: "queryLanguage", competitorType: "loss", qaroteType: "win" },
  { key: "dashboards", competitorType: "neutral", qaroteType: "win" },
  { key: "alerting", competitorType: "neutral", qaroteType: "win" },
  { key: "selfHosted", competitorType: "win", qaroteType: "win" },
  { key: "maintenance", competitorType: "loss", qaroteType: "win" },
  { key: "openSource", competitorType: "win", qaroteType: "win" },
  { key: "flexibility", competitorType: "win", qaroteType: "neutral" },
];

const CLOUDAMQP_ROWS: TableRow[] = [
  { key: "brokerLockIn", competitorType: "loss", qaroteType: "win" },
  { key: "rabbitmqNative", competitorType: "neutral", qaroteType: "win" },
  { key: "alerting", competitorType: "neutral", qaroteType: "win" },
  { key: "selfHosted", competitorType: "loss", qaroteType: "win" },
  { key: "multiCluster", competitorType: "loss", qaroteType: "win" },
  { key: "pricingModel", competitorType: "neutral", qaroteType: "win" },
  { key: "dataPrivacy", competitorType: "loss", qaroteType: "win" },
  { key: "setupTime", competitorType: "neutral", qaroteType: "win" },
  { key: "openSource", competitorType: "loss", qaroteType: "win" },
  { key: "ownBroker", competitorType: "loss", qaroteType: "win" },
];

const NEW_RELIC_ROWS: TableRow[] = [
  { key: "rabbitmqNative", competitorType: "neutral", qaroteType: "win" },
  { key: "agentRequired", competitorType: "loss", qaroteType: "win" },
  { key: "setupTime", competitorType: "neutral", qaroteType: "win" },
  { key: "selfHosted", competitorType: "loss", qaroteType: "win" },
  { key: "dataPrivacy", competitorType: "loss", qaroteType: "win" },
  { key: "pricingModel", competitorType: "neutral", qaroteType: "win" },
  { key: "estimatedCost", competitorType: "loss", qaroteType: "win" },
  { key: "alerting", competitorType: "win", qaroteType: "win" },
  { key: "openSource", competitorType: "loss", qaroteType: "win" },
  { key: "integrations", competitorType: "win", qaroteType: "neutral" },
];

// ---------------------------------------------------------------------------
// Shared sub-components
// ---------------------------------------------------------------------------

function StatusIcon({ variant }: { variant: "check" | "cross" }) {
  return (
    <img
      src={`/images/${variant}.svg`}
      alt=""
      aria-hidden="true"
      className="h-3 w-auto shrink-0 image-crisp"
      width={12}
      height={12}
    />
  );
}

// ---------------------------------------------------------------------------
// Hero
// ---------------------------------------------------------------------------

function CompareHero({ ns }: { ns: string }) {
  const { t } = useTranslation(ns);
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
          className="text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed"
          style={enter(80)}
        >
          {t("hero.subtitle")}
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Verdict
// ---------------------------------------------------------------------------

function VerdictSection({ ns }: { ns: string }) {
  const { t } = useTranslation(ns);

  const competitorPoints = ((): string[] => {
    const raw = t("verdict.competitor.points", { returnObjects: true });
    return Array.isArray(raw) ? (raw as string[]) : [];
  })();

  const qarotePoints = ((): string[] => {
    const raw = t("verdict.qarote.points", { returnObjects: true });
    return Array.isArray(raw) ? (raw as string[]) : [];
  })();

  return (
    <div className="border border-border overflow-hidden mb-8">
      <div className="px-6 py-3 bg-muted/30 border-b border-border">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t("verdict.heading")}
        </span>
      </div>
      <div className="p-6 sm:p-8">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Competitor */}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-foreground">
              {t("verdict.competitor.label")}
            </p>
            <ul className="space-y-2">
              {competitorPoints.map((point, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-muted-foreground"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 bg-muted-foreground/40" />
                  {point}
                </li>
              ))}
            </ul>
          </div>
          {/* Qarote */}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-foreground">
              {t("verdict.qarote.label")}
            </p>
            <ul className="space-y-2">
              {qarotePoints.map((point, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-muted-foreground"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 bg-primary/60" />
                  {point}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Table cell
// ---------------------------------------------------------------------------

interface TableCellProps {
  text: string;
  type: CellType;
  isQarote?: boolean;
}

function TableCell({ text, type, isQarote }: TableCellProps) {
  const baseClass = "px-4 py-3 text-sm align-top";

  if (type === "win") {
    return (
      <td className={`${baseClass}${isQarote ? " bg-primary/5" : ""}`}>
        <span className="flex items-start gap-2">
          <span className="mt-0.5 shrink-0">
            <StatusIcon variant="check" />
          </span>
          <span className="text-foreground">{text}</span>
        </span>
      </td>
    );
  }

  if (type === "loss") {
    return (
      <td className={baseClass}>
        <span className="flex items-start gap-2">
          <span className="mt-0.5 shrink-0">
            <StatusIcon variant="cross" />
          </span>
          <span className="text-muted-foreground">{text}</span>
        </span>
      </td>
    );
  }

  // neutral
  return (
    <td className={baseClass}>
      <span className="text-muted-foreground">{text}</span>
    </td>
  );
}

// ---------------------------------------------------------------------------
// Comparison table
// ---------------------------------------------------------------------------

function ComparisonTable({ ns, rows }: { ns: string; rows: TableRow[] }) {
  const { t } = useTranslation(ns);
  const reduceMotion = useReducedMotion();
  const [tbodyRef, tbodyEntered] =
    useScrollEntry<HTMLTableSectionElement>(0.05);

  const winCount = rows.filter((r) => r.qaroteType === "win").length;

  const rowStyle = (i: number): CSSProperties =>
    reduceMotion
      ? {}
      : {
          opacity: tbodyEntered ? 1 : 0,
          transition: `opacity 0.35s cubic-bezier(0.16,1,0.3,1) ${i * 40}ms`,
        };

  return (
    <div className="border border-border overflow-hidden mb-8">
      <div className="px-6 py-3 bg-muted/30 border-b border-border">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t("table.heading")}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <caption className="sr-only">{t("table.caption")}</caption>
          <thead>
            <tr className="border-b border-border">
              <th className="sticky left-0 bg-background px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground w-48 sm:w-56">
                {t("table.featureLabel")}
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground min-w-48">
                {t("table.competitorLabel")}
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-primary min-w-48">
                {t("table.qaroteLabel")}
              </th>
            </tr>
          </thead>
          <tbody ref={tbodyRef}>
            {rows.map((row, i) => (
              <tr
                key={row.key}
                className="border-t border-border"
                style={rowStyle(i)}
              >
                <td className="sticky left-0 bg-background px-4 py-3 text-sm font-medium text-foreground align-top">
                  {t(`table.rows.${row.key}.feature`)}
                </td>
                <TableCell
                  text={t(`table.rows.${row.key}.competitor`)}
                  type={row.competitorType}
                />
                <TableCell
                  text={t(`table.rows.${row.key}.qarote`)}
                  type={row.qaroteType}
                  isQarote
                />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-3 border-t border-border flex items-center justify-between gap-4">
        <p className="text-xs text-muted-foreground">{t("table.asOf")}</p>
        <p className="text-xs text-primary font-medium tabular-nums">
          {t("table.qaroteWins", { count: winCount, total: rows.length })}
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Narrative sections
// ---------------------------------------------------------------------------

function NarrativeSections({
  ns,
  sectionKeys,
}: {
  ns: string;
  sectionKeys: string[];
}) {
  const { t } = useTranslation(ns);

  return (
    <div className="space-y-8 mb-8">
      {sectionKeys.map((key) => {
        // Determine how many paragraphs exist (p1, p2, p3)
        const paragraphs: string[] = [];
        for (const pKey of ["p1", "p2", "p3"]) {
          const val = t(`sections.${key}.${pKey}`, { defaultValue: "" });
          if (val) {
            paragraphs.push(val);
          }
        }

        return (
          <div key={key} className="border border-border overflow-hidden">
            <div className="px-6 py-3 bg-muted/30 border-b border-border">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("sections.eyebrow")}
              </span>
            </div>
            <div className="p-6 sm:p-8">
              <h2 className="text-2xl sm:text-3xl font-normal text-foreground mb-6">
                {t(`sections.${key}.heading`)}
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
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cross-link section
// ---------------------------------------------------------------------------

interface CrossLinkConfig {
  linkKey: string;
  linkHref: string;
}

function CrossLinkSection({
  ns,
  crossLink,
  locale,
}: {
  ns: string;
  crossLink: CrossLinkConfig;
  locale: SupportedLocale;
}) {
  const { t } = useTranslation(ns);
  const lp = (path: string) => (locale === "en" ? path : `/${locale}${path}`);

  return (
    <div className="border border-border overflow-hidden mb-8">
      <div className="px-6 py-3 bg-muted/30 border-b border-border">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t("crossLink.text")}
        </span>
      </div>
      <div className="p-6 flex flex-wrap gap-x-6 gap-y-3 items-center">
        <a
          href={lp(crossLink.linkHref)}
          className="text-sm text-primary hover:underline"
        >
          {t(crossLink.linkKey)}
        </a>
        <span className="text-muted-foreground text-xs">·</span>
        <a
          href={lp("/pricing/")}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {t("crossLink.pricing")}
        </a>
        <a
          href={lp("/features/")}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {t("crossLink.features")}
        </a>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// FAQ section
// ---------------------------------------------------------------------------

interface FaqItem {
  question: string;
  answer: string;
}

function FaqSection({ ns }: { ns: string }) {
  const { t } = useTranslation(ns);

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
      <ul className="divide-y divide-border list-none">
        {items.map((item, i) => (
          <li key={i}>
            <details className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-6 marker:hidden [&::-webkit-details-marker]:hidden hover:bg-muted/30 transition-colors duration-150">
                <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors duration-150">
                  {item.question}
                </h3>
                <span
                  className="shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180"
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
// CompareLayout — shared layout for all comparison pages
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Blog preview strip
// ---------------------------------------------------------------------------

function BlogPreviewSection({ posts }: { posts: BlogPostPreview[] }) {
  if (posts.length === 0) return null;

  return (
    <div className="border border-border overflow-hidden mb-8">
      <div className="px-6 py-3 bg-muted/30 border-b border-border">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          From the blog
        </span>
      </div>
      <div className="divide-y divide-border">
        {posts.map((post) => (
          <a
            key={post.slug}
            href={`/blog/${post.slug}/`}
            className="flex items-start justify-between gap-6 p-6 hover:bg-muted/20 transition-colors group no-underline"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors leading-snug mb-1">
                {post.title}
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                {post.description}
              </p>
            </div>
            {post.readingTimeMin && (
              <span className="shrink-0 text-xs text-muted-foreground whitespace-nowrap">
                {post.readingTimeMin} min read
              </span>
            )}
          </a>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CompareLayout — shared layout for all comparison pages
// ---------------------------------------------------------------------------

interface CompareLayoutProps {
  locale: SupportedLocale;
  resources: Record<string, Record<string, unknown>> | undefined;
  ns: string;
  rows: TableRow[];
  sectionKeys: string[];
  crossLink: CrossLinkConfig;
  blogPosts: BlogPostPreview[];
}

function CompareLayout({
  locale,
  resources,
  ns,
  rows,
  sectionKeys,
  crossLink,
  blogPosts,
}: CompareLayoutProps) {
  return (
    <IslandProvider locale={locale} resources={resources}>
      <div className="min-h-screen font-sans bg-background">
        <StickyNav />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <CompareHero ns={ns} />
          <VerdictSection ns={ns} />
          <ComparisonTable ns={ns} rows={rows} />
          <NarrativeSections ns={ns} sectionKeys={sectionKeys} />
          <CrossLinkSection ns={ns} crossLink={crossLink} locale={locale} />
          <BlogPreviewSection posts={blogPosts} />
          <FaqSection ns={ns} />
        </main>
        <FinalCtaSection />
        <FooterSection currentLocale={locale} />
      </div>
      <TawkTo />
    </IslandProvider>
  );
}

// ---------------------------------------------------------------------------
// Exported island components
// ---------------------------------------------------------------------------

export function CompareDatadogIsland({
  locale = "en",
  resources,
  blogPosts = [],
}: IslandProps) {
  return (
    <CompareLayout
      locale={locale}
      resources={resources}
      ns="compare-datadog"
      rows={DATADOG_ROWS}
      sectionKeys={["native", "pricing", "privacy", "setup"]}
      crossLink={{
        linkKey: "crossLink.grafana",
        linkHref: "/compare/grafana-prometheus/",
      }}
      blogPosts={blogPosts}
    />
  );
}

export function CompareGrafanaIsland({
  locale = "en",
  resources,
  blogPosts = [],
}: IslandProps) {
  return (
    <CompareLayout
      locale={locale}
      resources={resources}
      ns="compare-grafana"
      rows={GRAFANA_ROWS}
      sectionKeys={["assembly", "promql", "dashboards", "maintenance"]}
      crossLink={{
        linkKey: "crossLink.datadog",
        linkHref: "/compare/datadog/",
      }}
      blogPosts={blogPosts}
    />
  );
}

export function CompareCloudAMQPIsland({
  locale = "en",
  resources,
  blogPosts = [],
}: IslandProps) {
  return (
    <CompareLayout
      locale={locale}
      resources={resources}
      ns="compare-cloudamqp"
      rows={CLOUDAMQP_ROWS}
      sectionKeys={["lockIn", "monitoring", "multiCluster", "pricing"]}
      crossLink={{
        linkKey: "crossLink.datadog",
        linkHref: "/compare/datadog/",
      }}
      blogPosts={blogPosts}
    />
  );
}

export function CompareNewRelicIsland({
  locale = "en",
  resources,
  blogPosts = [],
}: IslandProps) {
  return (
    <CompareLayout
      locale={locale}
      resources={resources}
      ns="compare-new-relic"
      rows={NEW_RELIC_ROWS}
      sectionKeys={["native", "pricing", "agents", "privacy"]}
      crossLink={{
        linkKey: "crossLink.datadog",
        linkHref: "/compare/datadog/",
      }}
      blogPosts={blogPosts}
    />
  );
}
