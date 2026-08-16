import { useTranslation } from "react-i18next";

/**
 * "The agent surface" — the centerpiece that sells the differentiator:
 * Qarote ships one MCP surface your agent already speaks, so you debug
 * RabbitMQ by asking, in the chat you're already in. Ported from
 * Qarote.html (#features).
 *
 * Structure: a 4-step loop, the exact tool inventory split free (MIT) vs
 * paid (root-cause), and every MCP client it speaks to.
 *
 * Tool names, `.mcp.json`, queue names and client product names are
 * illustrative/literal English (like the hero card and the snippet block);
 * section chrome is i18n'd under the `agentSurface.*` namespace.
 */

const STEPS = ["connect", "mint", "wire", "ask"] as const;

const FREE_TOOLS = [
  { name: "list_incidents", desc: "open incidents, ranked" },
  { name: "get_incident", desc: "one incident, full detail" },
  { name: "list_config_findings", desc: "anti-patterns found" },
  { name: "list_servers", desc: "brokers under watch" },
  { name: "list_queues", desc: "queues + state" },
  { name: "get_overview", desc: "cluster health" },
  { name: "ping", desc: "connectivity check" },
];

const CLIENTS = [
  "Claude Desktop",
  "Claude Code",
  "Cursor",
  "Cline",
  "GitHub Copilot",
  "Codex",
  "Windsurf",
  "opencode",
];

const ToolRow = ({
  name,
  desc,
  paid = false,
  last = false,
}: {
  name: string;
  desc: string;
  paid?: boolean;
  last?: boolean;
}) => (
  <div
    className={`flex items-center gap-[9px] py-[9px] ${
      last ? "" : "border-b border-dashed border-border"
    }`}
  >
    <span
      className={`h-[7px] w-[7px] shrink-0 rounded-full ${
        paid ? "bg-primary" : "bg-[#2E8B57]"
      }`}
      aria-hidden="true"
    />
    <code className="font-mono text-[13.5px] text-foreground">{name}</code>
    <span className="ml-auto text-[12.5px] text-muted-foreground">{desc}</span>
  </div>
);

const AgentSection = () => {
  const { t } = useTranslation("landing");

  return (
    <section
      id="agent"
      className="border-y border-border bg-secondary py-[clamp(48px,6vw,88px)]"
    >
      <div className="mx-auto max-w-[1180px] px-[clamp(20px,5vw,64px)]">
        {/* Header */}
        <div className="max-w-[760px]">
          <span className="font-mono text-[12.5px] uppercase tracking-[0.13em] text-primary">
            {t("agentSurface.eyebrow")}
          </span>
          <h2 className="mt-[18px] font-display text-[clamp(30px,4.4vw,46px)] font-semibold tracking-[-0.025em] text-foreground">
            {t("agentSurface.title")}
          </h2>
          <p className="mt-[18px] max-w-[62ch] text-[clamp(17px,1.6vw,19px)] leading-relaxed text-muted-foreground [text-wrap:pretty]">
            {t("agentSurface.subtitle")}
          </p>
        </div>

        {/* 4-step loop */}
        <div className="mt-[clamp(28px,4vw,40px)] grid grid-cols-2 gap-[14px] lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <div
              key={step}
              className="relative rounded-xl border border-border bg-card p-[22px]"
            >
              <span className="font-mono text-[12px] font-medium text-primary">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="mb-2 mt-3 font-display text-[18px] tracking-[-0.01em] text-foreground">
                {t(`agentSurface.steps.${step}.title`)}
              </h3>
              <p className="text-[14.5px] leading-[1.5] text-muted-foreground">
                {t(`agentSurface.steps.${step}.desc`)}
              </p>
              {/* sequence arrow into the next step (4-col desktop layout only) */}
              {i < STEPS.length - 1 && (
                <svg
                  className="absolute -right-[10px] top-1/2 z-[2] hidden -translate-y-1/2 text-muted-foreground/40 lg:block"
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M4 10h12m-5-5 5 5-5 5"
                    stroke="currentColor"
                    strokeWidth="1.4"
                  />
                </svg>
              )}
            </div>
          ))}
        </div>

        {/* Tool inventory — free vs paid */}
        <div className="mt-[44px] grid gap-[22px] md:grid-cols-2">
          {/* Free tools */}
          <div className="rounded-xl border border-border bg-card p-6">
            <h4 className="mb-4 flex items-center justify-between font-display text-base text-foreground">
              {t("agentSurface.freeTools")}
              <span className="rounded-full border border-[#2E8B57]/35 px-2.5 py-1 font-mono text-[11.5px] text-[#2E8B57]">
                MIT · open source
              </span>
            </h4>
            <div className="flex flex-col">
              {FREE_TOOLS.map((tool, i) => (
                <ToolRow
                  key={tool.name}
                  name={tool.name}
                  desc={tool.desc}
                  last={i === FREE_TOOLS.length - 1}
                />
              ))}
            </div>
          </div>

          {/* Paid tool */}
          <div className="rounded-xl border border-primary/30 bg-gradient-to-b from-primary/5 to-card p-6">
            <h4 className="mb-4 flex items-center justify-between font-display text-base text-foreground">
              {t("agentSurface.paidTool")}
              <span className="rounded-full border border-primary/40 px-2.5 py-1 font-mono text-[11.5px] text-primary">
                root-cause analysis
              </span>
            </h4>
            <div className="flex flex-col">
              <ToolRow
                name="explain_incident"
                desc="LLM root-cause, in chat"
                paid
                last
              />
            </div>
            <p className="mt-4 text-[14px] leading-[1.55] text-muted-foreground">
              {t("agentSurface.paidPara")}
            </p>
          </div>
        </div>

        {/* Works with */}
        <div className="mt-10 border-t border-border pt-8">
          <div className="mb-4 font-mono text-[12px] uppercase tracking-[0.08em] text-muted-foreground">
            {t("agentSurface.worksWith")}
          </div>
          <div className="flex flex-wrap gap-[10px]">
            {CLIENTS.map((client) => (
              <span
                key={client}
                className="rounded-full border border-input bg-card px-[14px] py-2 font-mono text-[13px] text-foreground"
              >
                {client}
              </span>
            ))}
            <span className="rounded-full border border-dashed border-input bg-card px-[14px] py-2 font-mono text-[13px] text-muted-foreground">
              + any MCP client
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AgentSection;
