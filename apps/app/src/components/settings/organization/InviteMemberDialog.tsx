import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Check, Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { logger } from "@/lib/logger";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";

import {
  useInviteOrgMember,
  useOrgWorkspaces,
} from "@/hooks/queries/useOrganization";

import { getRoleIcon, useRoleLabels, type WsRole } from "./roleUi";
import { WorkspaceRow } from "./WorkspaceRow";

interface InviteMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type InviteForm = {
  email: string;
  role: "ADMIN" | "MEMBER";
  allWorkspaces: boolean;
  wsAssignments: Map<string, WsRole>;
};

const emptyForm: InviteForm = {
  email: "",
  role: "MEMBER",
  allWorkspaces: true,
  wsAssignments: new Map(),
};

/**
 * Dialog for inviting a new member to the organization. Two render
 * states:
 *
 *  1. **Form mode** (default): email, role, workspace assignments.
 *     Workspace assignments default to "all" — the common case —
 *     and the operator can opt into fine-grained per-workspace
 *     grants if they need to.
 *
 *  2. **Manual-share mode**: shown when the server returns a
 *     signed invitation URL because SMTP isn't configured. The
 *     operator copies the URL and shares it out-of-band. This is
 *     the self-hosted-without-email-server escape hatch and
 *     critical for the "I just installed Qarote on my Dokku box"
 *     user — don't break it.
 *
 * The dialog owns all form state internally. On close it resets to
 * the empty form so reopening gives a clean slate.
 */
export function InviteMemberDialog({
  open,
  onOpenChange,
}: InviteMemberDialogProps) {
  const { t } = useTranslation("profile");
  const roleLabels = useRoleLabels();

  const { data: wsData, isLoading: wsLoading } = useOrgWorkspaces();
  const inviteMutation = useInviteOrgMember();
  const orgWorkspaces = wsData?.workspaces ?? [];

  const [form, setForm] = useState<InviteForm>(emptyForm);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const resetAll = () => {
    setForm(emptyForm);
    setShareUrl(null);
    setCopied(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetAll();
    }
    onOpenChange(nextOpen);
  };

  const handleInvite = async () => {
    if (!form.email) return;
    try {
      const result = await inviteMutation.mutateAsync({
        email: form.email,
        role: form.role,
        workspaceAssignments: form.allWorkspaces
          ? []
          : Array.from(form.wsAssignments.entries()).map(
              ([workspaceId, role]) => ({
                workspaceId,
                role,
              })
            ),
      });

      if (result.emailSent) {
        toast.success(
          t("org.toast.invitedToOrg", { email: result.invitation.email })
        );
        handleOpenChange(false);
      } else {
        // No SMTP — surface the signed URL for manual sharing.
        setShareUrl(result.inviteUrl);
      }
    } catch (error) {
      logger.error({ error }, "Invite error");
      const msg =
        error instanceof Error ? error.message : t("org.toast.inviteFailed");
      toast.error(msg);
    }
  };

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable — silently ignore. The URL is still
      // selectable in the input for manual copy.
    }
  };

  const toggleWorkspace = (wsId: string) => {
    setForm((prev) => {
      const next = new Map(prev.wsAssignments);
      if (next.has(wsId)) {
        next.delete(wsId);
      } else {
        next.set(wsId, "MEMBER");
      }
      return { ...prev, wsAssignments: next };
    });
  };

  const updateWorkspaceRole = (wsId: string, role: WsRole) => {
    setForm((prev) => {
      const next = new Map(prev.wsAssignments);
      next.set(wsId, role);
      return { ...prev, wsAssignments: next };
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("org.inviteToOrgTitle")}</DialogTitle>
          <DialogDescription>{t("org.inviteToOrgDesc")}</DialogDescription>
        </DialogHeader>

        {shareUrl ? (
          <ManualShareBody
            url={shareUrl}
            copied={copied}
            onCopy={handleCopy}
            onDone={() => handleOpenChange(false)}
          />
        ) : (
          <>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="invite-email">{t("org.email")}</Label>
                <Input
                  id="invite-email"
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, email: e.target.value }))
                  }
                  placeholder="user@example.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="invite-role">{t("org.orgRole")}</Label>
                <Select
                  value={form.role}
                  onValueChange={(v) =>
                    setForm((prev) => ({
                      ...prev,
                      role: v as "ADMIN" | "MEMBER",
                    }))
                  }
                >
                  <SelectTrigger id="invite-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="min-w-56">
                    <SelectItem value="ADMIN" className="py-2">
                      <div>
                        <span className="flex items-center gap-1.5">
                          {getRoleIcon("ADMIN")}
                          {roleLabels["ADMIN"]}
                        </span>
                        <p className="text-[11px] text-muted-foreground mt-0.5 font-normal">
                          {t("org.roleDescOrgAdmin")}
                        </p>
                      </div>
                    </SelectItem>
                    <SelectItem value="MEMBER" className="py-2">
                      <div>
                        <span className="flex items-center gap-1.5">
                          {getRoleIcon("MEMBER")}
                          {roleLabels["MEMBER"]}
                        </span>
                        <p className="text-[11px] text-muted-foreground mt-0.5 font-normal">
                          {t("org.roleDescOrgMember")}
                        </p>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {form.role === "ADMIN"
                    ? t("org.roleDescOrgAdmin")
                    : t("org.roleDescOrgMember")}
                </p>
              </div>

              <WorkspaceAccessSection
                allWorkspaces={form.allWorkspaces}
                onAllWorkspacesChange={(all) =>
                  setForm((prev) => ({
                    ...prev,
                    allWorkspaces: all,
                    wsAssignments: all ? new Map() : prev.wsAssignments,
                  }))
                }
                workspaces={orgWorkspaces}
                workspacesLoading={wsLoading}
                assignments={form.wsAssignments}
                onToggleWorkspace={toggleWorkspace}
                onRoleChange={updateWorkspaceRole}
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                {t("org.cancel")}
              </Button>
              <Button
                onClick={handleInvite}
                disabled={inviteMutation.isPending || !form.email}
              >
                {inviteMutation.isPending ? (
                  <>
                    <Loader2
                      className="h-4 w-4 mr-2 animate-spin"
                      aria-hidden="true"
                    />
                    {t("org.inviting")}
                  </>
                ) : (
                  t("org.inviteButton")
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Sub-section for the workspace access picker inside the invite form.
 * Factored out because the "grant all" toggle + conditional workspace
 * list is ~50 lines on its own and muddies the main form render.
 */
function WorkspaceAccessSection({
  allWorkspaces,
  onAllWorkspacesChange,
  workspaces,
  workspacesLoading,
  assignments,
  onToggleWorkspace,
  onRoleChange,
}: {
  allWorkspaces: boolean;
  onAllWorkspacesChange: (all: boolean) => void;
  workspaces: Array<{ id: string; name: string }>;
  workspacesLoading: boolean;
  assignments: Map<string, WsRole>;
  onToggleWorkspace: (wsId: string) => void;
  onRoleChange: (wsId: string, role: WsRole) => void;
}) {
  const { t } = useTranslation("profile");

  return (
    <div className="space-y-2">
      <Label>{t("org.workspaceAccess")}</Label>
      <div className="flex items-start justify-between gap-4 rounded-lg border p-3">
        <div className="space-y-1 min-w-0">
          <p className="text-sm font-medium">{t("org.grantAllWorkspaces")}</p>
          <p className="text-xs text-muted-foreground">
            {allWorkspaces
              ? t("org.grantAllWorkspacesDesc")
              : t("org.selectWorkspacesDesc")}
          </p>
        </div>
        <Switch
          checked={allWorkspaces}
          onCheckedChange={onAllWorkspacesChange}
          aria-label={t("org.grantAllWorkspaces")}
        />
      </div>

      {!allWorkspaces && (
        <div className="space-y-2 max-h-48 overflow-y-auto pt-2">
          {workspacesLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : workspaces.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("org.noWorkspacesFound")}
            </p>
          ) : (
            workspaces.map((ws) => (
              <WorkspaceRow
                key={ws.id}
                workspace={ws}
                selected={assignments.has(ws.id)}
                role={assignments.get(ws.id) ?? "MEMBER"}
                onToggle={() => onToggleWorkspace(ws.id)}
                onRoleChange={(r) => onRoleChange(ws.id, r)}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Render body for the "no SMTP configured" success state. Shows the
 * signed invitation URL with a copy button. Once copied, the button
 * swaps to a checkmark for 2 seconds before reverting — gives the
 * operator confirmation that the clipboard write actually happened.
 */
function ManualShareBody({
  url,
  copied,
  onCopy,
  onDone,
}: {
  url: string;
  copied: boolean;
  onCopy: () => void;
  onDone: () => void;
}) {
  const { t } = useTranslation("profile");

  return (
    <div className="space-y-4 py-4">
      <div className="rounded-lg border border-warning/30 bg-warning-muted p-4">
        <p className="text-sm font-medium text-warning mb-2">
          {t("org.emailNotConfigured")}
        </p>
        <div className="flex items-center gap-2">
          <Input value={url} readOnly className="text-xs font-mono" />
          <Button
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={onCopy}
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 mr-1" aria-hidden="true" />
                {t("org.copied")}
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-1" aria-hidden="true" />
                {t("org.copy")}
              </>
            )}
          </Button>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onDone}>
          {t("org.done")}
        </Button>
      </DialogFooter>
    </div>
  );
}
