/**
 * Cockpit "Connect your agent" flow: the shared mint form in a dialog,
 * followed by the one-time copy reveal. Settings → Agent Access renders the
 * same `MintAgentKeyForm` inline instead; both share the form so the mint
 * contract can never diverge between the two entry points.
 */

import { useState } from "react";
import { useTranslation } from "react-i18next";

import { MintAgentKeyForm } from "@/components/agent/MintAgentKeyForm";
import { AgentKeyRevealDialog } from "@/components/AgentKeyRevealDialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { useWorkspace } from "@/hooks/ui/useWorkspace";

export function MintAgentKeyDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation("settings");
  const { workspace } = useWorkspace();
  const workspaceId = workspace?.id ?? "";

  const [revealed, setRevealed] = useState<{
    secret: string;
    name: string;
  } | null>(null);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("agentAccess.mint.title")}</DialogTitle>
            <DialogDescription>
              {t("agentAccess.description")}
            </DialogDescription>
          </DialogHeader>
          <MintAgentKeyForm
            workspaceId={workspaceId}
            onMinted={(secret, name) => {
              onOpenChange(false);
              setRevealed({ secret, name });
            }}
          />
        </DialogContent>
      </Dialog>

      <AgentKeyRevealDialog
        open={revealed !== null}
        secret={revealed?.secret ?? null}
        keyName={revealed?.name ?? ""}
        onClose={() => setRevealed(null)}
      />
    </>
  );
}
