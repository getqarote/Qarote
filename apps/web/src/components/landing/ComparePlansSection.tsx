import { useTranslation } from "react-i18next";

/**
 * "Compare plans" — grouped feature table for the /pricing page only:
 * the open-source core against the single cloud plan.
 * Ported from Pricing.html (#compare). Light section, theme tokens.
 *
 * Symbols (✓ / —) and the literal "explain_finding" tool name are not i18n'd
 * (they are product/markup, not prose); column heads, group names, row labels,
 * and text values ("30 days", "Unlimited") come from the `pricing` namespace.
 *
 * Cell values are encoded as:
 *   "yes"  → ✓ (green)
 *   "no"   → — (muted)
 *   string → that string, run through t() unless it is purely numeric.
 */

type Cell = "yes" | "no" | { literal: string } | { key: string };

type FeatureRow = {
  /** i18n key under pricing.compare.rows for the label */
  labelKey: string;
  /** render the label as a monospace <code> (e.g. explain_finding) */
  code?: boolean;
  /** Community — the open-source core */
  c: Cell;
  /** Cloud — the single paid plan */
  e: Cell;
};

type Group = {
  /** i18n key under pricing.compare.groups */
  groupKey: string;
  rows: FeatureRow[];
};

const yes: Cell = "yes";
const no: Cell = "no";
const lit = (literal: string): Cell => ({ literal });
const txt = (key: string): Cell => ({ key });

const GROUPS: Group[] = [
  {
    groupKey: "monitoring",
    rows: [
      { labelKey: "incidentDetection", c: yes, e: yes },
      { labelKey: "configScan", c: yes, e: yes },
      { labelKey: "metricHistory", c: txt("days30"), e: txt("days30") },
      { labelKey: "servers", c: lit("1"), e: txt("unlimited") },
    ],
  },
  {
    groupKey: "diagnosis",
    rows: [
      { labelKey: "aiExplain", c: no, e: yes },
      { labelKey: "byok", c: no, e: yes },
      { labelKey: "managedLlm", c: no, e: yes },
    ],
  },
  {
    groupKey: "agent",
    rows: [
      { labelKey: "readTools", c: yes, e: yes },
      { labelKey: "explainFindingTool", code: true, c: no, e: yes },
    ],
  },
  {
    groupKey: "alerting",
    rows: [
      { labelKey: "email", c: yes, e: yes },
      { labelKey: "slackWebhooks", c: no, e: yes },
    ],
  },
  {
    groupKey: "team",
    rows: [
      { labelKey: "ssoRbac", c: no, e: yes },
      { labelKey: "auditSoc2", c: no, e: yes },
    ],
  },
  {
    groupKey: "deployment",
    rows: [
      { labelKey: "selfHostedOss", c: yes, e: no },
      { labelKey: "managedCloud", c: no, e: yes },
    ],
  },
];

const COLUMN_KEYS = ["community", "cloud"] as const;

const CompareCell = ({
  value,
  t,
}: {
  value: Cell;
  t: ReturnType<typeof useTranslation<"pricing">>["t"];
}) => {
  if (value === "yes") {
    return (
      <span
        className="text-[15px] text-status-success-text"
        aria-label="Included"
      >
        ✓
      </span>
    );
  }
  if (value === "no") {
    return (
      <span
        className="text-[15px] text-muted-foreground"
        aria-label="Not included"
      >
        —
      </span>
    );
  }
  const text =
    "literal" in value ? value.literal : t(`compare.values.${value.key}`);
  return <span className="text-[14px] text-foreground">{text}</span>;
};

const ComparePlansSection = () => {
  const { t } = useTranslation("pricing");

  return (
    <section className="py-[clamp(48px,6vw,88px)]">
      <div className="mx-auto max-w-[1180px] px-[clamp(20px,5vw,64px)]">
        <h2 className="text-center font-display text-[clamp(30px,4.4vw,46px)] font-semibold tracking-[-0.025em] text-foreground">
          {t("compare.title")}
        </h2>

        <div className="mt-[clamp(32px,5vw,48px)] overflow-x-auto rounded-xl border border-border">
          <div
            className="grid min-w-[640px] grid-cols-[1.6fr_1fr_1fr]"
            role="table"
            aria-label={t("compare.title")}
          >
            {/* Header row */}
            <div className="contents" role="row">
              <span
                role="columnheader"
                className="bg-secondary px-4 py-[13px] font-mono text-[11.5px] uppercase tracking-[0.1em] text-muted-foreground"
              >
                {t("compare.feature")}
              </span>
              {COLUMN_KEYS.map((col) => (
                <span
                  key={col}
                  role="columnheader"
                  className="bg-secondary px-4 py-[13px] text-center font-mono text-[11.5px] uppercase tracking-[0.1em] text-muted-foreground"
                >
                  {t(`compare.columns.${col}`)}
                </span>
              ))}
            </div>

            {/* Grouped rows */}
            {GROUPS.map((group) => (
              <div className="contents" key={group.groupKey}>
                {/* Group band */}
                <div className="contents" role="row">
                  <div
                    role="cell"
                    aria-colspan={3}
                    className="col-span-3 border-t border-border bg-secondary px-4 py-[10px] font-mono text-[11.5px] uppercase tracking-[0.1em] text-muted-foreground"
                  >
                    {t(`compare.groups.${group.groupKey}`)}
                  </div>
                </div>

                {/* Feature rows */}
                {group.rows.map((row) => (
                  <div className="contents" key={row.labelKey} role="row">
                    <span
                      role="cell"
                      className="flex items-center border-t border-border bg-card px-4 py-[13px] text-[14px] text-foreground"
                    >
                      {row.code ? (
                        <code className="font-mono text-[13px] text-primary">
                          {t(`compare.rows.${row.labelKey}`)}
                        </code>
                      ) : (
                        t(`compare.rows.${row.labelKey}`)
                      )}
                    </span>
                    <span
                      role="cell"
                      className="flex items-center justify-center border-t border-border bg-card px-4 py-[13px] text-center"
                    >
                      <CompareCell value={row.c} t={t} />
                    </span>
                    <span
                      role="cell"
                      className="flex items-center justify-center border-t border-border bg-card px-4 py-[13px] text-center"
                    >
                      <CompareCell value={row.e} t={t} />
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ComparePlansSection;
