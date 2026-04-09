import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Check, Loader2, Mail, X } from "lucide-react";
import { toast } from "sonner";

import { logger } from "@/lib/logger";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  useAcceptOrgInvitation,
  useDeclineOrgInvitation,
  useMyOrgInvitations,
} from "@/hooks/queries/useOrganization";

import { useRoleLabels } from "./roleUi";
import type { MyOrgInvitation } from "./types";

interface OrgMyInvitationsCardProps {
  /**
   * Whether the current user is already a member of an organization.
   * Changes the copy: "You're invited to another org" vs "Accept to
   * join your first org". Both branches show the same list of cards
   * — only the heading description differs.
   */
  alreadyInOrg: boolean;
}

/**
 * Shows invitations the current user has been extended. Rendered in
 * two contexts:
 *   - The "no org" branch, as the only card — this is how a first-time
 *     user lands in the product before they've joined anywhere.
 *   - The "in org" branch, below the main cards — this is the case
 *     where a user in one org has been invited to another.
 *
 * Renders nothing when there are no invitations. Owns its own per-row
 * pending state so the operator sees which button is mid-click
 * rather than a global spinner.
 */
export function OrgMyInvitationsCard({
  alreadyInOrg,
}: OrgMyInvitationsCardProps) {
  const { t } = useTranslation("profile");
  const roleLabels = useRoleLabels();

  const { data } = useMyOrgInvitations();
  const acceptMutation = useAcceptOrgInvitation();
  const declineMutation = useDeclineOrgInvitation();

  const [pendingAction, setPendingAction] = useState<{
    id: string;
    action: "accept" | "decline";
  } | null>(null);

  const invitations = (data?.invitations ?? []) as MyOrgInvitation[];

  if (invitations.length === 0) {
    return null;
  }

  const handleAccept = async (invitationId: string) => {
    setPendingAction({ id: invitationId, action: "accept" });
    try {
      await acceptMutation.mutateAsync({ invitationId });
      toast.success(t("org.toast.invitationAccepted"));
    } catch (error) {
      logger.error({ error }, "Accept invitation error");
      toast.error(
        error instanceof Error
          ? error.message
          : t("org.toast.invitationAcceptFailed")
      );
    } finally {
      setPendingAction(null);
    }
  };

  const handleDecline = async (invitationId: string) => {
    setPendingAction({ id: invitationId, action: "decline" });
    try {
      await declineMutation.mutateAsync({ invitationId });
      toast.success(t("org.toast.invitationDeclined"));
    } catch (error) {
      logger.error({ error }, "Decline invitation error");
      toast.error(
        error instanceof Error
          ? error.message
          : t("org.toast.invitationDeclineFailed")
      );
    } finally {
      setPendingAction(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" aria-hidden="true" />
          {alreadyInOrg
            ? t("org.yourInvitations")
            : t("org.pendingInvitations")}
        </CardTitle>
        <CardDescription>
          {alreadyInOrg
            ? t("org.yourInvitationsDesc")
            : t("org.yourInvitationsNoOrg")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {invitations.map((inv) => {
            const isAccepting =
              pendingAction?.id === inv.id && pendingAction.action === "accept";
            const isDeclining =
              pendingAction?.id === inv.id &&
              pendingAction.action === "decline";

            return (
              <div
                key={inv.id}
                className="flex items-center justify-between p-3 rounded-lg border"
              >
                <div className="min-w-0">
                  <div className="font-medium text-sm truncate">
                    {inv.organization.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t("org.invitedByAs", {
                      name: `${inv.invitedBy.firstName} ${inv.invitedBy.lastName}`,
                      role: roleLabels[inv.role] ?? inv.role,
                    })}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    onClick={() => handleAccept(inv.id)}
                    disabled={pendingAction !== null}
                  >
                    {isAccepting ? (
                      <Loader2
                        className="h-4 w-4 animate-spin"
                        aria-hidden="true"
                      />
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-1" aria-hidden="true" />
                        {t("org.accept")}
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDecline(inv.id)}
                    disabled={pendingAction !== null}
                  >
                    {isDeclining ? (
                      <Loader2
                        className="h-4 w-4 animate-spin"
                        aria-hidden="true"
                      />
                    ) : (
                      <>
                        <X className="h-4 w-4 mr-1" aria-hidden="true" />
                        {t("org.decline")}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
