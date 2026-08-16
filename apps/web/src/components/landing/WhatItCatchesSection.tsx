import { useTranslation } from "react-i18next";

/**
 * "What it catches" — makes detection concrete with real incident types and
 * config findings, severity-coded. Ported from Qarote.html (#what-it-catches).
 *
 * The example findings (queue names, numbers) are illustrative product data —
 * kept as English literals like the hero chat card and the .mcp.json block.
 * Section chrome is i18n'd.
 */

const INCIDENTS = [
  {
    dot: "#D8412F",
    code: "consumers → 0",
    desc: "orders.incoming lost all 3 consumers at 15:06; depth climbing ~8k/min with zero drain.",
  },
  {
    dot: "#D98A1F",
    code: "depth anomaly",
    desc: "payments.capture depth up 14× over baseline with publish rate flat — drain has stalled.",
  },
  {
    dot: "#D98A1F",
    code: "ack rate → 0",
    desc: "webhooks.delivery is redelivering without acking — a likely poison-message loop.",
  },
];

const CONFIG = [
  {
    code: "missing DLX",
    desc: "5 queues have no dead-letter exchange — rejected messages vanish silently.",
  },
  {
    code: "idle no-consumer queue",
    desc: "3 durable queues have had zero consumers for 7+ days — likely orphaned by a deploy.",
  },
  {
    code: "default-exchange overuse",
    desc: "82% of publishes route through the default exchange — no routing flexibility, hard to evolve.",
  },
];

const CONFIG_DOT = "#3A6DF0";

const Finding = ({
  dot,
  code,
  desc,
}: {
  dot: string;
  code: string;
  desc: string;
}) => (
  <div className="flex items-start gap-[14px] rounded-[7px] border border-border bg-card px-4 py-[15px]">
    <span
      className="mt-[7px] h-2 w-2 shrink-0 rounded-full"
      style={{ backgroundColor: dot }}
      aria-hidden="true"
    />
    <div>
      <code className="font-mono text-[13px] text-primary">{code}</code>
      <p className="mt-[3px] text-[14px] leading-[1.45] text-muted-foreground">
        {desc}
      </p>
    </div>
  </div>
);

const WhatItCatchesSection = () => {
  const { t } = useTranslation("landing");

  return (
    <section className="border-y border-border bg-secondary py-[clamp(48px,6vw,88px)]">
      <div className="mx-auto max-w-[1180px] px-[clamp(20px,5vw,64px)]">
        <div className="max-w-[660px]">
          <span className="font-mono text-[12.5px] uppercase tracking-[0.13em] text-primary">
            {t("whatCatches.eyebrow")}
          </span>
          <h2 className="mt-[18px] font-display text-[clamp(30px,4.4vw,46px)] font-semibold tracking-[-0.025em] text-foreground">
            {t("whatCatches.title")}
          </h2>
          <p className="mt-[18px] max-w-[58ch] text-[clamp(17px,1.6vw,19px)] leading-relaxed text-muted-foreground [text-wrap:pretty]">
            {t("whatCatches.subtitle")}
          </p>
        </div>

        <div className="mt-[clamp(32px,5vw,48px)] grid gap-[24px] md:grid-cols-2">
          {/* Incident detection */}
          <div>
            <h3 className="flex items-center gap-[10px] font-display text-[21px] font-semibold text-foreground">
              <span
                className="h-[9px] w-[9px] rounded-full"
                style={{ backgroundColor: "#D8412F" }}
                aria-hidden="true"
              />
              {t("whatCatches.incidentTitle")}
            </h3>
            <p className="mt-2 text-[15px] text-muted-foreground">
              {t("whatCatches.incidentDesc")}
            </p>
            <div className="mt-[18px] flex flex-col gap-3">
              {INCIDENTS.map((f) => (
                <Finding key={f.code} {...f} />
              ))}
            </div>
          </div>

          {/* Config scan */}
          <div>
            <h3 className="flex items-center gap-[10px] font-display text-[21px] font-semibold text-foreground">
              <span
                className="h-[9px] w-[9px] rounded-full"
                style={{ backgroundColor: CONFIG_DOT }}
                aria-hidden="true"
              />
              {t("whatCatches.configTitle")}
            </h3>
            <p className="mt-2 text-[15px] text-muted-foreground">
              {t("whatCatches.configDesc")}
            </p>
            <div className="mt-[18px] flex flex-col gap-3">
              {CONFIG.map((f) => (
                <Finding key={f.code} dot={CONFIG_DOT} {...f} />
              ))}
            </div>
          </div>
        </div>

        <p className="mt-7 text-[14px] text-muted-foreground/80">
          {t("whatCatches.footnote")}
        </p>
      </div>
    </section>
  );
};

export default WhatItCatchesSection;
