/**
 * Settings → Agent keys. Owners and admins mint and revoke machine API keys
 * here so external AI agents can call Qarote's MCP endpoint (list incidents,
 * read config findings, and — on EE — get the grounded RCA via explain_incident).
 *
 * "Mint key" opens the shared MintAgentKeyDialog (also used by the cockpit
 * "Connect your agent" flow), which owns the mint form AND the copy-once
 * reveal. The button is permission-gated (apikey:manage); the backend enforces
 * the same permission on the mutation regardless.
 */

import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Check, Copy, Plus } from "lucide-react";
import { toast } from "sonner";

import { getMcpEndpoint, MCP_AUTH_HEADER } from "@/lib/mcp";

import { MintAgentKeyDialog } from "@/components/agent/MintAgentKeyDialog";
import { AgentKeysList } from "@/components/AgentKeysList";
import { SettingsTableSkeleton } from "@/components/skeletons/SettingsSkeleton";
import { Button } from "@/components/ui/button";

import { useApiKeys } from "@/hooks/queries/useApiKeys";
import { usePermission } from "@/hooks/queries/useWorkspaceRole";
import { useWorkspace } from "@/hooks/ui/useWorkspace";

const AgentAccessSection = () => {
  const { t } = useTranslation("settings");
  const { workspace } = useWorkspace();
  const workspaceId = workspace?.id ?? "";

  const { list } = useApiKeys(workspaceId);
  const canMint = usePermission("apikey:manage") === true;
  const [mintOpen, setMintOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const keys = list.data ?? [];
  const hasKeys = keys.filter((k) => k.enabled).length > 0;
  const mcpEndpoint = getMcpEndpoint();

  const copyEndpoint = async () => {
    try {
      await navigator.clipboard.writeText(mcpEndpoint);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error(t("agentAccess.endpoint.copyFailed"));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            {t("agentAccess.title")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("agentAccess.description")}
          </p>
        </div>
        {canMint && (
          <Button className="shrink-0" onClick={() => setMintOpen(true)}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            {t("agentAccess.mint.submit")}
          </Button>
        )}
      </div>

      {/* MCP endpoint + auth header — the connection target for every key. */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-secondary/40 px-5 py-3.5">
        <p className="min-w-0 break-all font-mono text-sm text-muted-foreground">
          {t("agentAccess.endpoint.label")}{" "}
          <span className="text-foreground">{mcpEndpoint}</span>
          <span className="mx-1.5">·</span>
          {t("agentAccess.endpoint.authHeader")}{" "}
          <span className="text-foreground">{MCP_AUTH_HEADER}</span>
        </p>
        <Button variant="outline" size="sm" onClick={copyEndpoint}>
          {copied ? (
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <Copy className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          {copied
            ? t("agentAccess.endpoint.copied")
            : t("agentAccess.endpoint.copy")}
        </Button>
      </div>

      {list.isLoading ? (
        <SettingsTableSkeleton rows={2} />
      ) : list.isError ? (
        <p className="text-sm text-destructive">
          {t("agentAccess.list.loadError")}
        </p>
      ) : !hasKeys ? (
        <p className="text-sm text-muted-foreground">
          {t("agentAccess.empty.description")}
        </p>
      ) : (
        <AgentKeysList workspaceId={workspaceId} />
      )}

      <MintAgentKeyDialog open={mintOpen} onOpenChange={setMintOpen} />
    </div>
  );
};

export default AgentAccessSection;
