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

  const canInviteUsers = planData?.planFeatures?.canInviteUsers ?? false;
  const maxUsers = planData?.planFeatures?.maxUsers;
  const maxInvites = maxUsers ? maxUsers - 1 : undefined;

  const handleInviteEmailsChange = useCallback(
    (emails: string[]) => {
      const validEmails = emails.filter((email) => EMAIL_REGEX.test(email));
      if (emails.length !== validEmails.length) {
        toast.error(
          t("invites.invalidEmail", {
            defaultValue: "Please enter a valid email address",
          })
        );
        return;
      }
      setInviteEmails(validEmails);
    },
    [t]
  );

  const storePendingInvites = useCallback(() => {
    pendingInvites.current = [...inviteEmails];
  }, [inviteEmails]);

  const sendPendingInvites = useCallback(() => {
    const emails = pendingInvites.current;
    if (emails.length === 0) {
      toast.success(
        t("invites.workspaceCreated", {
          defaultValue: "Workspace created successfully!",
        })
      );
      return;
    }

    toast.success(
      t("invites.workspaceCreatedSendingInvites", {
        defaultValue: "Workspace created! Sending invitations...",
      })
    );

    const collectedLinks: InviteLink[] = [];
    pendingCount.current = emails.length;

    emails.forEach((email) => {
      sendInvitationMutation.mutate(
        { email, role: "MEMBER" },
        {
          onSuccess: (data) => {
            if (data.emailSent) {
              toast.success(
                t("invites.invitationSent", {
                  email,
                  defaultValue: `Invitation sent to ${email}`,
                })
              );
            } else {
              // No SMTP — collect the link
              collectedLinks.push({ email, inviteUrl: data.inviteUrl });
              toast.success(
                t("invites.invitationCreated", {
                  email,
                  defaultValue: `Invitation created for ${email}`,
                })
              );
            }
            pendingCount.current--;
            if (pendingCount.current === 0 && collectedLinks.length > 0) {
              setInviteLinks(collectedLinks);
            }
          },
          onError: (error) => {
            toast.error(
              t("invites.invitationFailed", {
                email,
                error: error.message,
                defaultValue: `Failed to invite ${email}: ${error.message}`,
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

  const clearInviteLinks = useCallback(() => {
    setInviteLinks([]);
  }, []);

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
    clearInviteLinks,
    canInviteUsers,
    maxInvites,
    storePendingInvites,
    sendPendingInvites,
    isSending: sendInvitationMutation.isPending,
    reset,
  };
}
