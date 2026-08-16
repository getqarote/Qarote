import { useTranslation } from "react-i18next";

/**
 * Comparison teaser — two honest, at-a-glance mini-tables (vs the Management
 * plugin, vs Prometheus + Grafana). A tight tease; the full SEO compare pages
 * live in the footer. Ported from Qarote.html (#compare).
 *
 * Light/token section, mirroring WhatItCatchesSection's eyebrow + head pattern.
 * Both tables are driven by a typed row structure to stay DRY (one <Row>).
 */

type CompareRow = {
  /** i18n key under compareTeaser.rows.* for the row label */
  labelKey: string;
  /** i18n key under the card namespace for the Qarote cell */
  qaroteKey: string;
  /** i18n key under the card namespace for the alternative cell */
  otherKey: string;
};

const PLUGIN_ROWS: CompareRow[] = [
  { labelKey: "setup", qaroteKey: "setupQarote", otherKey: "setupOther" },
  {
    labelKey: "multiBroker",
    qaroteKey: "multiBrokerQarote",
    otherKey: "multiBrokerOther",
  },
  {
    labelKey: "diagnosis",
    qaroteKey: "diagnosisQarote",
    otherKey: "diagnosisOther",
  },
  {
    labelKey: "agentMcp",
    qaroteKey: "agentMcpQarote",
    otherKey: "agentMcpOther",
  },
  { labelKey: "speed", qaroteKey: "speedQarote", otherKey: "speedOther" },
];

const STACK_ROWS: CompareRow[] = [
  { labelKey: "setup", qaroteKey: "setupQarote", otherKey: "setupOther" },
  {
    labelKey: "multiBroker",
    qaroteKey: "multiBrokerQarote",
    otherKey: "multiBrokerOther",
  },
  {
    labelKey: "diagnosis",
    qaroteKey: "diagnosisQarote",
    otherKey: "diagnosisOther",
  },
  {
    labelKey: "agentMcp",
    qaroteKey: "agentMcpQarote",
    otherKey: "agentMcpOther",
  },
  { labelKey: "bestFor", qaroteKey: "bestForQarote", otherKey: "bestForOther" },
];

const ROW_BASE =
  "grid grid-cols-[1.1fr_1fr_1fr] gap-2 px-[22px] py-[13px] items-center text-[13.5px]";

const Row = ({
  label,
  qarote,
  other,
  last,
}: {
  label: string;
  qarote: string;
  other: string;
  last: boolean;
}) => (
  <div className={`${ROW_BASE}${last ? "" : " border-b border-border"}`}>
    <span className="font-mono text-[12px] uppercase tracking-[0.04em] text-muted-foreground">
      {label}
    </span>
    <span className="font-semibold text-foreground">{qarote}</span>
    <span className="text-muted-foreground">{other}</span>
  </div>
);

const CompareCard = ({
  title,
  subtitle,
  otherColumnLabel,
  rows,
  cardNs,
}: {
  title: string;
  subtitle: string;
  otherColumnLabel: string;
  rows: CompareRow[];
  /** translation namespace prefix for this card's cells, e.g. "compareTeaser.plugin" */
  cardNs: string;
}) => {
  const { t } = useTranslation("landing");

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="border-b border-border px-[22px] py-[18px]">
        <h3 className="font-display text-[18px] font-semibold text-foreground">
          {title}
        </h3>
        <span className="font-mono text-[12px] text-muted-foreground">
          {subtitle}
        </span>
      </div>

      {/* Column header row (alternating bg) */}
      <div className="grid grid-cols-[1.1fr_1fr_1fr] items-center gap-2 border-b border-border bg-secondary px-[22px] py-[13px]">
        <span />
        <span className="font-mono text-[11.5px] font-medium uppercase tracking-[0.06em] text-primary">
          {t("compareTeaser.columnQarote")}
        </span>
        <span className="font-mono text-[11.5px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
          {otherColumnLabel}
        </span>
      </div>

      {rows.map((row, i) => (
        <Row
          key={row.labelKey}
          label={t(`compareTeaser.rows.${row.labelKey}`)}
          qarote={t(`${cardNs}.${row.qaroteKey}`)}
          other={t(`${cardNs}.${row.otherKey}`)}
          last={i === rows.length - 1}
        />
      ))}
    </div>
  );
};

const ComparisonSection = () => {
  const { t } = useTranslation("landing");

  return (
    <section id="compare" className="bg-background py-[clamp(64px,9vw,128px)]">
      <div className="mx-auto max-w-[1180px] px-[clamp(20px,5vw,64px)]">
        <div className="max-w-[660px]">
          <span className="font-mono text-[12.5px] uppercase tracking-[0.13em] text-primary">
            {t("compareTeaser.eyebrow")}
          </span>
          <h2 className="mt-[18px] font-display text-[clamp(30px,4.4vw,46px)] font-semibold tracking-[-0.025em] text-foreground">
            {t("compareTeaser.title")}
          </h2>
          <p className="mt-[18px] max-w-[58ch] text-[clamp(17px,1.6vw,19px)] leading-relaxed text-muted-foreground [text-wrap:pretty]">
            {t("compareTeaser.subtitle")}
          </p>
        </div>

        <div className="mt-[clamp(32px,5vw,48px)] grid gap-[24px] md:grid-cols-2">
          <CompareCard
            title={t("compareTeaser.plugin.title")}
            subtitle={t("compareTeaser.plugin.subtitle")}
            otherColumnLabel={t("compareTeaser.columnPlugin")}
            rows={PLUGIN_ROWS}
            cardNs="compareTeaser.plugin"
          />
          <CompareCard
            title={t("compareTeaser.stack.title")}
            subtitle={t("compareTeaser.stack.subtitle")}
            otherColumnLabel={t("compareTeaser.columnStack")}
            rows={STACK_ROWS}
            cardNs="compareTeaser.stack"
          />
        </div>
      </div>
    </section>
  );
};

export default ComparisonSection;
