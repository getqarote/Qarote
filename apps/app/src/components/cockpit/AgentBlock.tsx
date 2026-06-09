/**
 * Cockpit "Your agent" block — the agent-first centerpiece. State-driven:
 *   not-wired  → invite to connect an MCP client (mint a key inline)
 *   wired      → "N agents connected · last call …" + manage / wire more
 * On cloud, a "Qarote watching 24/7" line is added (the managed agent runs
 * by default). On self-hosted, a not-wired block also nudges AI Explain
 * setup (BYOK / Ollama) since there's no managed provider.
 *
 * Wired/last-call are derived from the real agent keys (`useApiKeys`), which
 * back the merged MCP surface — no mocks.
 */

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

import { Plus, Sparkles } from "lucide-react";

import { isCloudMode } from "@/lib/featureFlags";

import { MintAgentKeyDialog } from "@/components/agent/MintAgentKeyDialog";
import { Button } from "@/components/ui/button";

import { useApiKeys } from "@/hooks/queries/useApiKeys";
import { useWorkspace } from "@/hooks/ui/useWorkspace";

function formatRelative(timestamp: number): string {
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  const diffMs = timestamp - Date.now();
  const diffMin = Math.round(diffMs / 60_000);
  if (Math.abs(diffMin) < 60) return rtf.format(diffMin, "minute");
  const diffHr = Math.round(diffMin / 60);
  if (Math.abs(diffHr) < 24) return rtf.format(diffHr, "hour");
  return rtf.format(Math.round(diffHr / 24), "day");
}

export function AgentBlock() {
  const { t } = useTranslation("cockpit");
  const navigate = useNavigate();
  const { workspace } = useWorkspace();
  const workspaceId = workspace?.id ?? "";
  const { list } = useApiKeys(workspaceId);
  const [mintOpen, setMintOpen] = useState(false);

  // Coarse 60s tick so the relative "last call" label stays honest between
  // list refetches (useApiKeys.list has no refetchInterval).
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const cloud = isCloudMode();
  const active = (list.data ?? []).filter((k) => k.enabled);
  const wired = active.length > 0;

  const lastRequestMs = active.reduce((max, k) => {
    if (!k.lastRequest) return max;
    const ts = new Date(k.lastRequest).getTime();
    return ts > max ? ts : max;
  }, 0);

  if (wired) {
    return (
      <div className="card-unified-compact flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3 min-w-0">
          <Sparkles
            className="h-5 w-5 shrink-0 text-primary mt-0.5"
            aria-hidden="true"
          />
          <div className="min-w-0">
            <p className="font-medium">
              {t("agent.wiredCount", { count: active.length })}
              {cloud && (
                <span className="text-success">
                  {" · "}
                  {t("agent.cloudWatching")}
                </span>
              )}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {lastRequestMs > 0
                ? t("agent.lastCall", { when: formatRelative(lastRequestMs) })
                : t("agent.neverCalled")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/settings/agent-access")}
          >
            {t("agent.manageKeys")}
          </Button>
          <Button size="sm" onClick={() => setMintOpen(true)}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            {t("agent.wireAgent")}
          </Button>
        </div>
        <MintAgentKeyDialog open={mintOpen} onOpenChange={setMintOpen} />
      </div>
    );
  }

  return (
    <div className="card-unified space-y-4">
      <div className="space-y-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-primary">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          {t("agent.eyebrow")}
        </span>
        <h2 className="title-section">{t("agent.connectTitle")}</h2>
        <p className="text-muted-foreground text-sm max-w-prose">
          {t("agent.connectBody")}
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button onClick={() => setMintOpen(true)}>
          {t("agent.connectCta")}
          <span aria-hidden="true">→</span>
        </Button>
        {cloud && (
          <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <span
              className="h-2 w-2 rounded-full bg-success shrink-0"
              aria-hidden="true"
            />
            {t("agent.watching")}
          </span>
        )}
      </div>

      {!cloud && (
        <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
          <span className="inline-flex items-center gap-1.5 text-sm font-medium">
            <Sparkles
              className="h-4 w-4 text-primary shrink-0"
              aria-hidden="true"
            />
            {t("agent.enableAiExplain")}
          </span>
          <p className="text-xs text-muted-foreground">
            {t("agent.enableAiExplainBody")}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/settings/llm")}
          >
            {t("agent.configureAiExplain")}
          </Button>
        </div>
      )}

      <MintAgentKeyDialog open={mintOpen} onOpenChange={setMintOpen} />
    </div>
  );
}
