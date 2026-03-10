import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { toast } from "sonner";

import { useSendInvitation } from "@/hooks/queries/useWorkspaceApi";
import { useUser } from "@/hooks/ui/useUser";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface InviteLink {
  email: string;
  inviteUrl: string;
}

export function useWorkspaceInvites() {
  const { t } = useTranslation("workspace");
  const { planData } = useUser();
  const sendInvitationMutation = useSendInvitation();
  const [inviteEmails, setInviteEmails] = useState<string[]>([]);
  const [inviteLinks, setInviteLinks] = useState<InviteLink[]>([]);
  const pendingInvites = useRef<string[]>([]);
  const pendingCount = useRef(0);
  const batchIdRef = useRef(0);

  const canInviteUsers = planData?.planFeatures?.canInviteUsers ?? false;
  const maxUsers = planData?.planFeatures?.maxUsers;
  const maxInvites = maxUsers ? maxUsers - 1 : undefined;

  const handleInviteEmailsChange = useCallback(
    (emails: string[]) => {
      const validEmails = emails.filter((email) => EMAIL_REGEX.test(email));
      const hasInvalid = emails.length !== validEmails.length;
      setInviteEmails(validEmails);
      if (hasInvalid) {
        toast.error(t("invites.invalidEmail"));
      }
    },
    [t]
  );

  const storePendingInvites = useCallback(() => {
    pendingInvites.current = [...inviteEmails];
  }, [inviteEmails]);

  const sendPendingInvites = useCallback(() => {
    const emails = pendingInvites.current;
    if (emails.length === 0) {
      toast.success(t("invites.workspaceCreated"));
      return;
    }

    toast.success(t("invites.workspaceCreatedSendingInvites"));

    const currentBatchId = ++batchIdRef.current;
    const collectedLinks: InviteLink[] = [];
    pendingCount.current = emails.length;

    emails.forEach((email) => {
      sendInvitationMutation.mutate(
        { email, role: "MEMBER" },
        {
          onSuccess: (data) => {
            if (currentBatchId !== batchIdRef.current) return;

            if (data.emailSent) {
              toast.success(t("invites.invitationSent", { email }));
            } else {
              collectedLinks.push({ email, inviteUrl: data.inviteUrl });
              toast.success(t("invites.invitationCreated", { email }));
            }
            pendingCount.current--;
            if (pendingCount.current === 0 && collectedLinks.length > 0) {
              setInviteLinks(collectedLinks);
            }
          },
          onError: (error) => {
            if (currentBatchId !== batchIdRef.current) return;

            toast.error(
              t("invites.invitationFailed", {
                email,
                error: error.message,
              })
            );
            pendingCount.current--;
            if (pendingCount.current === 0 && collectedLinks.length > 0) {
              setInviteLinks(collectedLinks);
            }
          },
        }
      );
    });

    pendingInvites.current = [];
  }, [sendInvitationMutation, t]);

  const reset = useCallback(() => {
    setInviteEmails([]);
    setInviteLinks([]);
    pendingInvites.current = [];
    pendingCount.current = 0;
  }, []);

  return {
    inviteEmails,
    setInviteEmails: handleInviteEmailsChange,
    inviteLinks,
    canInviteUsers,
    maxInvites,
    storePendingInvites,
    sendPendingInvites,
    isSending: sendInvitationMutation.isPending,
    reset,
  };
}
