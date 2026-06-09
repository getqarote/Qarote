/**
 * Settings → Agent Access section. Owners and admins mint and revoke
 * machine API keys here so external AI agents can call Qarote's MCP
 * endpoint (list incidents, read config findings, and — on EE — get the
 * grounded RCA via explain_incident).
 *
 * The mint form is the shared `MintAgentKeyForm` (also used by the cockpit
 * "Connect your agent" dialog); the copy-once reveal dialog renders only
 * when a mint succeeds, and the parent clears the secret from state inside
 * the dialog's onClose so it can't survive a re-render.
 */

import { useState } from "react";
import { useTranslation } from "react-i18next";

import { MintAgentKeyForm } from "@/components/agent/MintAgentKeyForm";
import { AgentKeyRevealDialog } from "@/components/AgentKeyRevealDialog";
import { AgentKeysList } from "@/components/AgentKeysList";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { useApiKeys } from "@/hooks/queries/useApiKeys";
import { useWorkspace } from "@/hooks/ui/useWorkspace";

const AgentAccessSection = () => {
  const { t } = useTranslation("settings");
  const { workspace } = useWorkspace();
  const workspaceId = workspace?.id ?? "";

  const { list } = useApiKeys(workspaceId);

  // The mint mutation returns the plaintext secret exactly once; we stash
  // it here long enough for the dialog to render, then clear it from
  // state inside the dialog's onClose handler.
  const [revealed, setRevealed] = useState<{
    secret: string;
    name: string;
  } | null>(null);

  // Scope the loading state to the list area only — never hide the mint
  // form behind a skeleton: a user landing here mid-fetch can already
  // start minting.
  const keys = list.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="title-section">{t("agentAccess.title")}</h2>
        <p className="text-muted-foreground text-sm mt-1">
          {t("agentAccess.description")}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("agentAccess.mint.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <MintAgentKeyForm
            workspaceId={workspaceId}
            onMinted={(secret, name) => setRevealed({ secret, name })}
          />
        </CardContent>
      </Card>

      {/* AgentKeysList already returns null when there are no enabled keys —
          no separate empty Card needed (the mint form above IS the entry
          point). A muted helper line stands in when the list is empty,
          and a Skeleton fills the area during the initial fetch. */}
      {list.isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : list.isError ? (
        <p className="text-destructive text-sm">
          {t("agentAccess.list.loadError")}
        </p>
      ) : keys.filter((k) => k.enabled).length === 0 ? (
        <p className="text-muted-foreground text-sm">
          {t("agentAccess.empty.description")}
        </p>
      ) : (
        <AgentKeysList workspaceId={workspaceId} />
      )}

      <AgentKeyRevealDialog
        open={revealed !== null}
        secret={revealed?.secret ?? null}
        keyName={revealed?.name ?? ""}
        onClose={() => setRevealed(null)}
      />
    </div>
  );
};

export default AgentAccessSection;
