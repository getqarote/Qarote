import { useTranslation } from "react-i18next";

import type { SupportedLocale } from "@qarote/i18n";

import { IslandProvider } from "@/components/IslandProvider";
import FinalCtaSection from "@/components/landing/FinalCtaSection";
import FooterSection from "@/components/landing/FooterSection";
import StickyNav from "@/components/StickyNav";
import { TawkTo } from "@/components/TawkTo";

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

// ---------------------------------------------------------------------------
// Shared sub-components
// ---------------------------------------------------------------------------

function CheckIcon() {
  return (
    <img
      src="/images/check.svg"
      alt=""
      aria-hidden="true"
      className="h-3 w-auto shrink-0 image-crisp"
      width={12}
      height={12}
    />
  );
}

function CrossIcon() {
  return (
    <img
      src="/images/cross.svg"
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

  return (
    <div className="border border-border overflow-hidden mb-8">
      <div className="px-6 py-3 bg-muted/30 border-b border-border">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t("hero.eyebrow")}
        </span>
      </div>
      <div className="p-8 text-center">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-normal text-foreground mb-6">
          {t("hero.title")}
        </h1>
        <p className="text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
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
            <CheckIcon />
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
            <CrossIcon />
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
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={row.key}
                className={
                  i % 2 === 1
                    ? "border-t border-border"
                    : "border-t border-border"
                }
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
      <div className="px-4 py-3 border-t border-border">
        <p className="text-xs text-muted-foreground">{t("table.asOf")}</p>
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
          if (val && val !== `sections.${key}.${pKey}`) {
            paragraphs.push(val);
          }
        }

        return (
          <div key={key} className="border border-border overflow-hidden">
            <div className="px-6 py-3 bg-muted/30 border-b border-border">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Deep dive
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
}: {
  ns: string;
  crossLink: CrossLinkConfig;
}) {
  const { t } = useTranslation(ns);

  return (
    <div className="border border-border overflow-hidden mb-8">
      <div className="px-6 py-3 bg-muted/30 border-b border-border">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t("crossLink.text")}
        </span>
      </div>
      <div className="p-6 flex flex-wrap gap-x-6 gap-y-3 items-center">
        <a
          href={crossLink.linkHref}
          className="text-sm text-primary hover:underline"
        >
          {t(crossLink.linkKey)}
        </a>
        <span className="text-muted-foreground text-xs">·</span>
        <a
          href="/pricing/"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Pricing
        </a>
        <a
          href="/features/"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Features
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
      <div className="divide-y divide-border">
        {items.map((item, i) => (
          <div key={i} className="p-6">
            <p className="text-sm font-semibold text-foreground mb-2">
              {item.question}
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {item.answer}
            </p>
          </div>
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
}

function CompareLayout({
  locale,
  resources,
  ns,
  rows,
  sectionKeys,
  crossLink,
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
          <CrossLinkSection ns={ns} crossLink={crossLink} />
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
    />
  );
}

export function CompareGrafanaIsland({
  locale = "en",
  resources,
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
    />
  );
}
