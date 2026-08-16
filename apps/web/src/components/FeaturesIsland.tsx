import { type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import type { SupportedLocale } from "@qarote/i18n";

import { IslandProvider } from "@/components/IslandProvider";
import CtaBand from "@/components/landing/CtaBand";
import FooterSection from "@/components/landing/FooterSection";
import { TawkTo } from "@/components/TawkTo";

interface FeaturesIslandProps {
  locale?: SupportedLocale;
  resources?: Record<string, Record<string, unknown>>;
}

const NS = "features";

// ── shared bits ────────────────────────────────────────────────────────────

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-primary">
      {children}
    </span>
  );
}

/** CE·free (green) / EE·paid (carrot) edition badge. */
function EditionBadge({
  kind,
  children,
}: {
  kind: "ce" | "ee";
  children: ReactNode;
}) {
  return (
    <span
      className={`rounded-full border px-2 py-0.5 font-mono text-[10.5px] font-medium uppercase tracking-[0.05em] ${
        kind === "ce"
          ? "border-success/40 text-success"
          : "border-primary/40 bg-accent text-primary"
      }`}
    >
      {children}
    </span>
  );
}

function Pill({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "carrot" | "good" | "red";
}) {
  const cls =
    tone === "carrot"
      ? "border-primary/40 bg-accent text-primary"
      : tone === "good"
        ? "border-success/40 text-success"
        : tone === "red"
          ? "border-destructive/40 text-destructive"
          : "border-border text-muted-foreground";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-1 font-mono text-xs ${cls}`}
    >
      {children}
    </span>
  );
}

function Chip({ children, any }: { children: ReactNode; any?: boolean }) {
  return (
    <span
      className={`rounded-md border px-2.5 py-1 text-xs ${
        any
          ? "border-primary/40 bg-accent font-medium text-primary"
          : "border-border bg-card text-muted-foreground"
      }`}
    >
      {children}
    </span>
  );
}

function CodeCard({ name, children }: { name: string; children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-3 py-2">
        <span className="h-2.5 w-2.5 rounded-full bg-border" />
        <span className="h-2.5 w-2.5 rounded-full bg-border" />
        <span className="h-2.5 w-2.5 rounded-full bg-border" />
        <span className="ml-1 font-mono text-xs text-muted-foreground">
          {name}
        </span>
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-[12.5px] leading-relaxed text-foreground">
        {children}
      </pre>
    </div>
  );
}

function Card({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      {children}
    </div>
  );
}

/** Alternating two-column feature row (media swaps side on odd rows). */
function FeatRow({
  reverse,
  text,
  media,
}: {
  reverse?: boolean;
  text: ReactNode;
  media: ReactNode;
}) {
  return (
    <section className="grid items-center gap-8 border-b border-border py-12 sm:gap-12 lg:grid-cols-2">
      <div className={reverse ? "lg:order-2" : ""}>{text}</div>
      <div className={`min-w-0 ${reverse ? "lg:order-1" : ""}`}>{media}</div>
    </section>
  );
}

function FeatText({
  eyebrow,
  badge,
  title,
  body,
  meta,
}: {
  eyebrow: ReactNode;
  badge?: ReactNode;
  title: string;
  body: ReactNode;
  meta?: ReactNode;
}) {
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Eyebrow>{eyebrow}</Eyebrow>
        {badge}
      </div>
      <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
        {title}
      </h2>
      <p className="mt-4 max-w-[52ch] text-base leading-relaxed text-muted-foreground">
        {body}
      </p>
      {meta && (
        <div className="mt-5 flex flex-wrap items-center gap-2.5">{meta}</div>
      )}
    </>
  );
}

// ── page ───────────────────────────────────────────────────────────────────

const MCP_CLIENTS = [
  "Claude Desktop",
  "Claude Code",
  "Cursor",
  "Cline",
  "GitHub Copilot",
  "Codex",
  "Windsurf",
  "opencode",
];

interface ConfigFind {
  code: string;
  text: string;
  sev: "amber" | "blue";
}

function FeaturesContent() {
  const { t } = useTranslation(NS);
  const signupUrl = `${import.meta.env.VITE_APP_BASE_URL || ""}/auth/sign-up`;

  const findsRaw = t("configScan.finds", { returnObjects: true });
  const configFinds: ConfigFind[] = Array.isArray(findsRaw)
    ? (findsRaw as ConfigFind[])
    : [];

  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
      {/* Page head */}
      <section className="mx-auto max-w-3xl py-16 text-center">
        <Eyebrow>{t("head.eyebrow")}</Eyebrow>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
          {t("head.title")}
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
          {t("head.lead")}
        </p>
      </section>

      {/* 1 · Agent-native */}
      <FeatRow
        text={
          <FeatText
            eyebrow={t("agentNative.eyebrow")}
            title={t("agentNative.title")}
            body={t("agentNative.body")}
            meta={
              <>
                <Pill>list_incidents</Pill>
                <Pill>get_incident</Pill>
                <Pill>list_config_findings</Pill>
                <Pill>get_overview</Pill>
                <Pill tone="carrot">explain_incident</Pill>
              </>
            }
          />
        }
        media={
          <div className="space-y-4">
            <CodeCard name=".mcp.json">
              {`{
  "mcpServers": {
    "qarote": {
      "command": "npx",
      "args": ["-y", "@qarote/mcp"]
    }
  }
}`}
            </CodeCard>
            <div>
              <div className="mb-3 font-mono text-xs uppercase tracking-[0.08em] text-muted-foreground">
                {t("worksWith.label")}
              </div>
              <div className="flex flex-wrap gap-2">
                {MCP_CLIENTS.map((c) => (
                  <Chip key={c}>{c}</Chip>
                ))}
                <Chip any>{t("worksWith.any")}</Chip>
              </div>
            </div>
          </div>
        }
      />

      {/* 2 · Incident detection */}
      <FeatRow
        reverse
        text={
          <FeatText
            eyebrow={t("incident.eyebrow")}
            badge={<EditionBadge kind="ce">{t("incident.badge")}</EditionBadge>}
            title={t("incident.title")}
            body={t("incident.body")}
          />
        }
        media={
          <Card>
            <div className="flex items-start gap-3">
              <span className="text-lg" aria-hidden="true">
                🔴
              </span>
              <div>
                <div className="text-[15px] font-semibold text-foreground">
                  <code className="font-mono text-accent-foreground">
                    orders.incoming
                  </code>{" "}
                  — {t("incident.findingTitle")}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[12.5px] text-muted-foreground">
                  <Pill tone="red">{t("incident.severity")}</Pill>
                  <span>{t("incident.time")}</span>
                  <span>·</span>
                  <span className="font-mono text-destructive">
                    {t("incident.depth")}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        }
      />

      {/* 3 · AI Explain */}
      <FeatRow
        text={
          <FeatText
            eyebrow={t("aiExplain.eyebrow")}
            badge={
              <EditionBadge kind="ee">{t("aiExplain.badge")}</EditionBadge>
            }
            title={t("aiExplain.title")}
            body={
              <>
                {t("aiExplain.bodyPre")}{" "}
                <code className="font-mono text-accent-foreground">
                  explain_incident
                </code>{" "}
                {t("aiExplain.bodyPost")}
              </>
            }
          />
        }
        media={
          <Card>
            <div className="mb-2.5 font-mono text-[11px] uppercase tracking-[0.08em] text-primary">
              ✦ {t("aiExplain.cardLabel")}
            </div>
            <p className="text-[14.5px] leading-relaxed text-muted-foreground">
              {t("aiExplain.cardBody")}{" "}
              <span className="text-muted-foreground/70">
                {t("aiExplain.cardCofire")}
              </span>
            </p>
          </Card>
        }
      />

      {/* 4 · Config scan */}
      <FeatRow
        reverse
        text={
          <FeatText
            eyebrow={t("configScan.eyebrow")}
            badge={
              <EditionBadge kind="ce">{t("configScan.badge")}</EditionBadge>
            }
            title={t("configScan.title")}
            body={t("configScan.body")}
          />
        }
        media={
          <div className="flex flex-col gap-3">
            {configFinds.map((f, i) => (
              <div
                key={i}
                className="flex items-start gap-3.5 rounded-lg border border-border bg-card p-4"
              >
                <span
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                    f.sev === "amber" ? "bg-warning" : "bg-[hsl(222_84%_59%)]"
                  }`}
                />
                <div>
                  <code className="font-mono text-[13px] text-accent-foreground">
                    {f.code}
                  </code>
                  <p className="mt-1 text-sm leading-snug text-muted-foreground">
                    {f.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        }
      />

      {/* 5 · Topology */}
      <FeatRow
        text={
          <FeatText
            eyebrow={t("topology.eyebrow")}
            badge={<EditionBadge kind="ce">{t("topology.badge")}</EditionBadge>}
            title={t("topology.title")}
            body={t("topology.body")}
          />
        }
        media={
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <svg
              viewBox="0 0 360 180"
              className="block h-auto w-full bg-muted/20"
              role="img"
              aria-label={t("topology.caption")}
            >
              <line
                x1="120"
                y1="60"
                x2="240"
                y2="45"
                stroke="hsl(var(--border))"
                strokeWidth="1.2"
              />
              <line
                x1="120"
                y1="60"
                x2="240"
                y2="100"
                stroke="hsl(var(--border))"
                strokeWidth="1.2"
              />
              <line
                x1="120"
                y1="60"
                x2="240"
                y2="145"
                stroke="hsl(var(--border))"
                strokeWidth="1.2"
              />
              <rect
                x="90"
                y="48"
                width="60"
                height="24"
                rx="5"
                fill="hsl(var(--card))"
                stroke="hsl(var(--primary))"
                strokeWidth="1.4"
              />
              <text
                x="120"
                y="64"
                textAnchor="middle"
                fontFamily="var(--font-mono)"
                fontSize="9"
                fill="hsl(var(--muted-foreground))"
              >
                orders
              </text>
              <circle
                cx="240"
                cy="45"
                r="9"
                fill="hsl(var(--card))"
                stroke="hsl(var(--destructive))"
                strokeWidth="1.6"
              />
              <circle
                cx="240"
                cy="100"
                r="9"
                fill="hsl(var(--card))"
                stroke="hsl(var(--success))"
                strokeWidth="1.6"
              />
              <circle
                cx="240"
                cy="145"
                r="9"
                fill="hsl(var(--card))"
                stroke="hsl(var(--success))"
                strokeWidth="1.6"
              />
              <text
                x="256"
                y="48"
                fontFamily="var(--font-mono)"
                fontSize="9"
                fill="hsl(var(--muted-foreground))"
              >
                orders.incoming
              </text>
              <text
                x="256"
                y="103"
                fontFamily="var(--font-mono)"
                fontSize="9"
                fill="hsl(var(--muted-foreground))"
              >
                orders.archive
              </text>
              <text
                x="256"
                y="148"
                fontFamily="var(--font-mono)"
                fontSize="9"
                fill="hsl(var(--muted-foreground))"
              >
                orders.dlq
              </text>
            </svg>
            <div className="border-t border-border px-3.5 py-2.5 font-mono text-[11px] text-muted-foreground">
              {t("topology.caption")}
            </div>
          </div>
        }
      />

      {/* 6 · Alerting */}
      <FeatRow
        reverse
        text={
          <FeatText
            eyebrow={t("alerting.eyebrow")}
            badge={<EditionBadge kind="ee">{t("alerting.badge")}</EditionBadge>}
            title={t("alerting.title")}
            body={t("alerting.body")}
          />
        }
        media={
          <Card>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <span className="font-mono text-[13px] font-semibold text-foreground">
                  Email
                </span>
                <span className="text-[13px] text-muted-foreground">
                  {t("alerting.emailScope")}
                </span>
                <span className="ml-auto">
                  <Pill tone="good">{t("alerting.on")}</Pill>
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-[13px] font-semibold text-foreground">
                  Slack
                </span>
                <span className="text-[13px] text-muted-foreground">
                  #rabbitmq-alerts
                </span>
                <span className="ml-auto">
                  <Pill tone="carrot">EE</Pill>
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-[13px] font-semibold text-foreground">
                  Webhook
                </span>
                <span className="text-[13px] text-muted-foreground">
                  hooks.acme.io
                </span>
                <span className="ml-auto">
                  <Pill tone="carrot">EE</Pill>
                </span>
              </div>
            </div>
          </Card>
        }
      />

      {/* 7 · Connect & scale */}
      <FeatRow
        text={
          <FeatText
            eyebrow={t("connect.eyebrow")}
            title={t("connect.title")}
            body={t("connect.body")}
            meta={
              <>
                <Pill>RabbitMQ 3.x &amp; 4.x</Pill>
                <Pill>clustered</Pill>
                <Pill>CloudAMQP</Pill>
                <Pill>Amazon MQ</Pill>
              </>
            }
          />
        }
        media={
          <CodeCard name="connect">
            <span className="text-muted-foreground">
              # {t("connect.codeComment")}
            </span>
            {`
host:  aws-rabbit.prod.internal
port:  15672   tls: on
user:  qarote-readonly
`}
            <span className="text-muted-foreground">
              # → {t("connect.codeResult")}
            </span>
          </CodeCard>
        }
      />

      {/* 8 · Deploy your way */}
      <FeatRow
        reverse
        text={
          <FeatText
            eyebrow={t("deploy.eyebrow")}
            title={t("deploy.title")}
            body={t("deploy.body")}
            meta={
              <>
                <Pill>Docker</Pill>
                <Pill>Compose</Pill>
                <Pill>Dokku</Pill>
                <Pill>binary</Pill>
                <Pill tone="good">{t("deploy.licensePill")}</Pill>
              </>
            }
          />
        }
        media={
          <Card>
            <div className="mb-2.5 font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
              {t("deploy.cardLabel")}
            </div>
            <p className="text-[14.5px] leading-relaxed text-muted-foreground">
              {t("deploy.cardBody")}
            </p>
          </Card>
        }
      />

      {/* CTA band */}
      <CtaBand
        title={t("cta.heading")}
        subtitle={t("cta.body")}
        primaryLabel={t("cta.primary")}
        primaryHref={signupUrl}
        secondaryLabel={t("cta.secondary")}
        secondaryHref="/pricing/"
      />
    </main>
  );
}

export default function FeaturesIsland({
  locale = "en",
  resources,
}: FeaturesIslandProps) {
  return (
    <IslandProvider locale={locale} resources={resources}>
      <div className="min-h-screen bg-background font-sans">
        <FeaturesContent />
        <FooterSection currentLocale={locale} />
      </div>
      <TawkTo />
    </IslandProvider>
  );
}
