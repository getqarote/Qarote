import { useState } from "react";
import { useTranslation } from "react-i18next";

import { EXTERNAL_LINKS, HELP_LINKS } from "@/lib/externalLinks";
import { isCloudMode } from "@/lib/featureFlags";
import { trpc } from "@/lib/trpc/client";

import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import {
  IconCheck,
  IconCluster,
  IconCopy,
  IconDoc,
  IconExternal,
  IconMail,
  IconMessage,
  type IconProps,
  IconRefresh,
  IconServer,
  IconSparkle,
} from "@/components/ui/icons";
import { SidebarTrigger } from "@/components/ui/sidebar";

import { useAuth } from "@/contexts/AuthContextDefinition";
import { useServerContext } from "@/contexts/ServerContext";

import { useOverview } from "@/hooks/queries/useRabbitMQ";
import { useServer } from "@/hooks/queries/useServer";

/**
 * Tawk.to is loaded once, globally, by <TawkTo /> (gated on isCloudMode()).
 * The Help page never loads it — the Chat button only drives the already-mounted
 * widget. We type only the slice of the Tawk_API surface we touch.
 */
interface TawkAPI {
  maximize?: () => void;
  onLoad?: () => void;
  setAttributes?: (
    attributes: Record<string, string>,
    callback?: (error?: unknown) => void
  ) => void;
}

declare global {
  interface Window {
    Tawk_API?: TawkAPI;
  }
}

const HELP_LINK_ICONS: Record<string, (p: IconProps) => JSX.Element> = {
  docs: IconDoc,
  mcp: IconSparkle,
  changelog: IconRefresh,
  status: IconServer,
};

function HelpSupport() {
  const { t } = useTranslation("help");
  const { user } = useAuth();
  const { selectedServerId } = useServerContext();
  const { data: serverData } = useServer(selectedServerId);
  const { data: overviewData } = useOverview(selectedServerId);

  const [copied, setCopied] = useState(false);
  // Preserve the Discord-join signal the old DiscordLink fired. Best-effort:
  // fire-and-forget on click so it never blocks the link from opening.
  const markJoinedMutation = trpc.discord.markJoined.useMutation();

  const cloud = isCloudMode();
  const dash = "—";

  // Diagnostics values — sourced identically for both the displayed rows and
  // the copied string, so the clipboard payload always matches the UI exactly.
  const version = import.meta.env.VITE_APP_VERSION ?? dash;
  const serverName =
    serverData?.server?.name ?? overviewData?.overview?.cluster_name ?? dash;
  const deployment = cloud
    ? t("diagnostics.cloud")
    : t("diagnostics.selfHosted");
  const rabbitVersion = overviewData?.overview?.rabbitmq_version;
  const erlangVersion = overviewData?.overview?.erlang_version;
  const broker =
    rabbitVersion && erlangVersion
      ? `${rabbitVersion} · Erlang ${erlangVersion}`
      : dash;

  // Keys (version/server/deployment/broker) are literal technical identifiers,
  // not localized copy — they belong verbatim in a paste-into-a-bug-report
  // block and stay identical across languages and the copied string.
  const diagnostics: Array<{ key: string; value: string }> = [
    { key: "version", value: version },
    { key: "server", value: serverName },
    { key: "deployment", value: deployment },
    { key: "broker", value: broker },
  ];

  const diagnosticsText = diagnostics
    .map((row) => `${row.key}: ${row.value}`)
    .join("\n");

  const handleCopyDiagnostics = async () => {
    try {
      await navigator.clipboard?.writeText(diagnosticsText);
    } catch {
      // Clipboard unavailable (e.g. insecure context) — fail quietly; the
      // operator can still read the block above and copy it manually.
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  const handleOpenChat = () => {
    const api = window.Tawk_API;
    if (!api) return;
    // Pre-fill the visitor when we have an authenticated user.
    if (user && api.setAttributes) {
      api.setAttributes({ name: user.name, email: user.email });
    }
    if (typeof api.maximize === "function") {
      api.maximize();
    } else {
      // Widget script present but not ready yet — maximize once it loads.
      api.onLoad = () => window.Tawk_API?.maximize?.();
    }
  };

  return (
    <PageShell>
      {/* Header */}
      <div className="flex items-center gap-4 min-w-0">
        <SidebarTrigger />
        <div className="min-w-0 space-y-3">
          {/* Intent note (prototype `.intent-note`) — monospace one-liner with a
              carrot `// intent —` prefix, matching the cockpit treatment. */}
          <p className="border-l-2 border-border pl-2.5 font-mono text-[11px] leading-relaxed text-muted-foreground">
            <span className="text-primary">// intent — </span>
            {t("intent")}
          </p>
          <div>
            <h1 className="title-page">{t("title")}</h1>
            <p className="text-muted-foreground">{t("subtitle")}</p>
          </div>
        </div>
      </div>

      {/* Orientation link grid (prototype `.helpgrid` / `.helplink`) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-[14px]">
        {HELP_LINKS.map((link) => {
          const Icon = HELP_LINK_ICONS[link.id];
          return (
            <a
              key={link.id}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-[13px] rounded-lg border border-border bg-card p-4 text-left transition-colors hover:border-foreground/20 hover:bg-muted"
            >
              <span className="flex h-9 w-9 shrink-0 place-items-center justify-center rounded-[9px] bg-accent text-primary">
                <Icon size={18} aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-foreground">
                  {t(`links.${link.id}.title`)}
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {t(`links.${link.id}.description`)}
                </span>
              </span>
              <IconExternal
                size={15}
                className="ml-auto shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
              <span className="sr-only">{t("opensInNewTab")}</span>
            </a>
          );
        })}
      </div>

      {/* Ask-your-agent reminder (prototype `.askagent`) */}
      <div className="flex items-center gap-[13px] rounded-lg border border-primary/30 bg-accent p-4 dark:bg-primary/10">
        <span className="flex h-9 w-9 shrink-0 place-items-center justify-center rounded-[9px] bg-accent text-primary">
          <IconSparkle size={18} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-foreground">
            {t("askAgent.title")}
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            {t("askAgent.description")}
          </div>
        </div>
      </div>

      {/* Contact + Diagnostics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-[14px]">
        {/* Contact us */}
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-sm font-semibold text-foreground">
            {t("contact.title")}
          </div>
          <div className="mt-3 space-y-1">
            {/* Email */}
            <div className="flex items-center gap-3 py-1.5">
              <span className="shrink-0 text-muted-foreground">
                <IconMail size={16} aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-foreground">
                  {t("contact.email")}
                </div>
                <a
                  href={`mailto:${EXTERNAL_LINKS.supportEmail}`}
                  className="font-mono text-xs text-muted-foreground hover:text-foreground hover:underline"
                >
                  {EXTERNAL_LINKS.supportEmail}
                </a>
              </div>
            </div>

            {/* Discord */}
            <div className="flex items-center gap-3 py-1.5">
              <span className="shrink-0 text-muted-foreground">
                <IconCluster size={16} aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-foreground">
                  {t("contact.discord")}
                </div>
                <div className="text-xs text-muted-foreground">
                  {t("contact.discordDescription")}
                </div>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <a
                  href={EXTERNAL_LINKS.discordInvite}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => markJoinedMutation.mutate()}
                >
                  {t("contact.discordJoin")}
                  <span className="sr-only"> {t("opensInNewTab")}</span>
                </a>
              </Button>
            </div>

            {/* Chat with us — cloud only (Tawk.to is mounted in cloud mode) */}
            {cloud && (
              <div className="flex items-center gap-3 py-1.5">
                <span className="shrink-0 text-muted-foreground">
                  <IconMessage size={16} aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-foreground">
                    {t("contact.chat")}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t("contact.chatDescription")}
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={handleOpenChat}>
                  {t("contact.chatStart")}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Diagnostics */}
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold text-foreground">
              {t("diagnostics.title")}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyDiagnostics}
              aria-label={t("diagnostics.copyAria")}
            >
              {copied ? (
                <IconCheck size={13} aria-hidden="true" />
              ) : (
                <IconCopy size={13} aria-hidden="true" />
              )}
              {copied ? t("diagnostics.copied") : t("diagnostics.copy")}
            </Button>
          </div>
          <p aria-live="polite" className="sr-only">
            {copied ? t("diagnostics.copiedAnnouncement") : ""}
          </p>
          <div className="mt-1 text-xs text-muted-foreground">
            {t("diagnostics.description")}
          </div>
          <div className="mt-3 rounded-md border border-border bg-muted px-4 py-3.5 font-mono text-xs text-foreground">
            {diagnostics.map((row) => (
              <div key={row.key} className="flex justify-between gap-3 py-1">
                <span className="text-muted-foreground">{row.key}</span>
                <span className="whitespace-nowrap text-right">
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageShell>
  );
}

export default HelpSupport;
