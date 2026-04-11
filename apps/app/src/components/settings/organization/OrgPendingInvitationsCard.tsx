import { useState } from "react";
import { useTranslation } from "react-i18next";

import { X } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PaginationControls } from "@/components/ui/PaginationControls";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import {
  useCancelOrgInvitation,
  usePendingOrgInvitations,
} from "@/hooks/queries/useOrganization";

import { getRoleIcon, useRoleLabels } from "./roleUi";
import type { PendingOrgInvitation } from "./types";

/**
 * Admin view of pending invitations the org has sent out. Each row
 * shows the invited email, who sent it, when it expires, and a
 * one-click revoke action. Renders nothing when there are no pending
 * invitations (so admins don't see an empty card).
 *
 * Owns its own pagination state; toasts on success/failure directly
 * rather than delegating to the parent, because the cancel action
 * has no further consequences that the parent needs to coordinate.
 */
export function OrgPendingInvitationsCard() {
  const { t, i18n } = useTranslation("profile");
  const roleLabels = useRoleLabels();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data } = usePendingOrgInvitations({ page, limit: pageSize });
  const cancelMutation = useCancelOrgInvitation();

  const invitations = (data?.invitations ?? []) as PendingOrgInvitation[];
  const total = data?.pagination?.total ?? invitations.length;

  if (invitations.length === 0) {
    return null;
  }

  const handleCancel = (invitationId: string, email: string) => {
    cancelMutation.mutate(
      { invitationId },
      {
        onSuccess: () => {
          toast.success(t("toast.invitationRevoked", { email }));
        },
        onError: (err) => {
          toast.error(
            err.message || t("toast.invitationFailed", { email, error: "" })
          );
        },
      }
    );
  };

  const dateFormatter = new Intl.DateTimeFormat(i18n.language, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="px-4 py-3 bg-muted/30 border-b border-border">
        <h2 className="title-section flex items-center gap-2">
          {t("org.pendingInvitations")}
          <Badge variant="secondary">{total}</Badge>
        </h2>
        <p className="text-sm text-muted-foreground">
          {t("org.pendingInvitationsCount", { count: total })}
        </p>
      </div>
      <div className="p-4">
        <div className="space-y-2">
          {invitations.map((inv) => (
            <div
              key={inv.id}
              className="flex items-center justify-between p-3 rounded-lg border"
            >
              <div className="min-w-0">
                <div className="font-medium text-sm truncate">{inv.email}</div>
                <div className="text-xs text-muted-foreground">
                  {t("org.invitedBy", {
                    name: `${inv.invitedBy.firstName} ${inv.invitedBy.lastName}`,
                  })}{" "}
                  &middot;{" "}
                  {t("org.expires", {
                    date: dateFormatter.format(new Date(inv.expiresAt)),
                  })}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="secondary" className="text-xs">
                  {getRoleIcon(inv.role)}
                  <span className="ml-1">
                    {roleLabels[inv.role] ?? inv.role}
                  </span>
                </Badge>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs gap-1"
                      disabled={cancelMutation.isPending}
                      onClick={() => handleCancel(inv.id, inv.email)}
                      aria-label={t("org.cancelInvite") + ": " + inv.email}
                    >
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                      <span className="hidden sm:inline">
                        {t("org.cancelInvite")}
                      </span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t("org.cancelInvite")}</TooltipContent>
                </Tooltip>
              </div>
            </div>
          ))}
        </div>
        {total > pageSize && (
          <PaginationControls
            total={total}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
            itemLabel="invitations"
          />
        )}
      </div>
    </div>
  );
}
