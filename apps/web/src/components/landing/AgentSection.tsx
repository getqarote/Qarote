/**
 * Agent-native pitch — sits right after the hero. Sells the differentiator
 * the rest of the body does not: Qarote ships an MCP endpoint so the
 * user's AI agent (Claude Desktop, Claude Code, Cursor, Cline, any MCP-compatible client)
 * can debug RabbitMQ directly, no dashboard switch.
 *
 * Two-column proof: a real `.mcp.json` snippet on the left, a mock
 * agent interaction on the right. Below: the actual tool inventory that
 * ships today + the launch clients (D4: named explicitly, text-styled
 * to avoid brand-asset friction) + the two CTAs (signup primary, doc
 * secondary).
 *
 * Every claim is verified against shipped code (PR-2/3/4/5 merged) —
 * the .mcp.json shape, the tool names, the input fields, and the
 * setup-time figure are all live as of the integration guide at
 * /docs/MCP_INTEGRATION.
 */

import { type CSSProperties } from "react";
import { useTranslation } from "react-i18next";

import { ExternalLink } from "lucide-react";

import { trackSignUpClick } from "@/lib/gtm";

import { Button } from "@/components/ui/button";

import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useScrollEntry } from "@/hooks/useScrollEntry";

const MCP_SNIPPET = `{
  "mcpServers": {
    "qarote": {
      "url": "https://app.qarote.io/api/mcp",
      "headers": {
        "x-api-key": "qrt_…"
      }
    }
  }
}`;

const AgentSection = () => {
  const { t, i18n } = useTranslation("landing");
  const locale = i18n.language || "en";
  const localePrefix = locale === "en" ? "" : `/${locale}`;
  const reduceMotion = useReducedMotion();
  const [gridRef, gridEntered] = useScrollEntry<HTMLDivElement>(0.1);

  const handleSignUp = () => {
    trackSignUpClick({ source: "agent_section", location: "landing_page" });
    window.location.href = `${import.meta.env.VITE_APP_BASE_URL}/auth/sign-up`;
  };

  const cardStyle = (delay: number): CSSProperties =>
    reduceMotion
      ? {}
      : {
          opacity: gridEntered ? 1 : 0,
          transform: gridEntered ? "translateY(0)" : "translateY(12px)",
          transition: `opacity 0.5s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.5s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
        };

  return (
    <section id="agent" className="pt-12 pb-20 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl text-foreground max-w-4xl mx-auto leading-[1.2] font-normal">
            {t("agent.title")}
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground mt-4 max-w-3xl mx-auto leading-relaxed">
            {t("agent.subtitle")}
          </p>
        </div>

        <div ref={gridRef} className="grid md:grid-cols-2 gap-6 mb-10">
          {/* Left: real .mcp.json snippet */}
          <figure
            className="border border-border p-6 lg:p-8 flex flex-col"
            style={cardStyle(0)}
          >
            <figcaption
              id="agent-snippet-caption"
              className="text-xs uppercase tracking-wide text-muted-foreground mb-3"
            >
              {t("agent.snippetCaption")}
            </figcaption>
            <pre
              className="text-xs sm:text-sm bg-muted/40 p-4 overflow-x-auto rounded"
              aria-labelledby="agent-snippet-caption"
            >
              <code className="language-json">{MCP_SNIPPET}</code>
            </pre>
            <p className="text-xs text-muted-foreground mt-3">
              {t("agent.snippetHint")}
            </p>
          </figure>

          {/* Right: mock agent interaction. Definition-list semantics so
              screen readers announce "term: You / definition: …" pairs
              instead of two visually-styled but semantically-flat blocks. */}
          <figure
            className="border border-border p-6 lg:p-8 flex flex-col gap-4"
            style={cardStyle(120)}
          >
            <figcaption className="text-xs uppercase tracking-wide text-muted-foreground">
              {t("agent.conversationCaption")}
            </figcaption>
            <dl className="space-y-3 text-sm">
              <div className="bg-muted/40 p-3 rounded">
                <dt className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                  {t("agent.youLabel")}
                </dt>
                <dd>{t("agent.youPrompt")}</dd>
              </div>
              <div className="border-l-2 border-primary/50 pl-3">
                <dt className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                  {t("agent.agentLabel")}
                </dt>
                <dd className="leading-relaxed whitespace-pre-line">
                  {t("agent.agentResponse")}
                </dd>
              </div>
            </dl>
          </figure>
        </div>

        {/* Tool inventory — leading [CE]/[EE] badge so a skimmer sees the
            free-vs-paid split before reading any description. */}
        <div className="mb-8">
          <h3 className="text-sm uppercase tracking-wide text-muted-foreground mb-3 text-center">
            {t("agent.toolsTitle")}
          </h3>
          <ul className="grid sm:grid-cols-2 gap-2 max-w-3xl mx-auto text-sm">
            <ToolRow
              tier="ce"
              name="ping"
              desc={t("agent.tools.ping")}
              ceLabel={t("agent.ceLabel")}
              eeLabel={t("agent.eeLabel")}
            />
            <ToolRow
              tier="ce"
              name="list_incidents"
              desc={t("agent.tools.listIncidents")}
              ceLabel={t("agent.ceLabel")}
              eeLabel={t("agent.eeLabel")}
            />
            <ToolRow
              tier="ce"
              name="get_incident"
              desc={t("agent.tools.getIncident")}
              ceLabel={t("agent.ceLabel")}
              eeLabel={t("agent.eeLabel")}
            />
            <ToolRow
              tier="ce"
              name="list_config_findings"
              desc={t("agent.tools.listConfigFindings")}
              ceLabel={t("agent.ceLabel")}
              eeLabel={t("agent.eeLabel")}
            />
            <ToolRow
              tier="ce"
              name="list_servers"
              desc={t("agent.tools.listServers")}
              ceLabel={t("agent.ceLabel")}
              eeLabel={t("agent.eeLabel")}
            />
            <ToolRow
              tier="ce"
              name="list_queues"
              desc={t("agent.tools.listQueues")}
              ceLabel={t("agent.ceLabel")}
              eeLabel={t("agent.eeLabel")}
            />
            <ToolRow
              tier="ce"
              name="get_overview"
              desc={t("agent.tools.getOverview")}
              ceLabel={t("agent.ceLabel")}
              eeLabel={t("agent.eeLabel")}
            />
            <ToolRow
              tier="ee"
              name="explain_incident"
              desc={t("agent.tools.explainIncident")}
              ceLabel={t("agent.ceLabel")}
              eeLabel={t("agent.eeLabel")}
            />
          </ul>
        </div>

        {/* Works-with row — D4: named explicitly (text-styled, no brand SVGs
            to avoid trademark friction). Swap to real logos when assets land. */}
        <div className="mb-10 flex flex-col items-center gap-3">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">
            {t("agent.worksWith")}
          </span>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {["Claude Desktop", "Claude Code", "Cursor", "Cline"].map(
              (client) => (
                <span
                  key={client}
                  className="border border-border px-3 py-1.5 text-sm"
                >
                  {client}
                </span>
              )
            )}
            <span className="text-xs text-muted-foreground">
              {t("agent.worksWithRest")}
            </span>
          </div>
        </div>

        {/* CTAs — D3 option C: signup primary + doc secondary */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button
            type="button"
            variant="cta"
            size="pill"
            onClick={handleSignUp}
          >
            <span>{t("agent.ctaSignup")}</span>
            <img
              src="/images/arrow-right.svg"
              alt=""
              aria-hidden="true"
              className="h-[0.8em] w-auto image-crisp align-middle"
              width={14}
              height={14}
            />
          </Button>
          <Button asChild variant="pillGhost" size="pillMd">
            <a href={`${localePrefix}/docs/mcp-integration/`}>
              <span>{t("agent.ctaDocs")}</span>
              <ExternalLink className="h-4 w-4 opacity-70" aria-hidden="true" />
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
};

interface ToolRowProps {
  tier: "ce" | "ee";
  name: string;
  desc: string;
  ceLabel: string;
  eeLabel: string;
}

const ToolRow = ({ tier, name, desc, ceLabel, eeLabel }: ToolRowProps) => (
  <li className="flex items-baseline gap-2">
    <span
      className={`shrink-0 text-[0.65rem] font-medium uppercase tracking-wider px-1.5 py-0.5 border ${
        tier === "ee"
          ? "border-primary/40 text-primary"
          : "border-border text-muted-foreground"
      }`}
    >
      {tier === "ee" ? eeLabel : ceLabel}
    </span>
    <code className="font-mono text-primary shrink-0">{name}</code>
    <span className="text-muted-foreground">{desc}</span>
  </li>
);

export default AgentSection;
