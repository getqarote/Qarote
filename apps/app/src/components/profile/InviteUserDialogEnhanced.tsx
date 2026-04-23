import { useTranslation } from "react-i18next";

import { AlertTriangle, Info } from "lucide-react";
import { toast } from "sonner";

import {
  InviteFieldsLabels,
  InviteMembersSection,
} from "@/components/InviteMembersSection";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { InviteFormState } from "./profileUtils";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface InviteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inviteForm: InviteFormState;
  setInviteForm: (form: InviteFormState) => void;
  onInviteUser: () => void;
  isInviting: boolean;
  canInvite?: boolean;
  maxUsers?: number;
  currentCount?: number;
  emailEnabled?: boolean;
}

export const InviteUserDialog = ({
  open,
  onOpenChange,
  inviteForm,
  setInviteForm,
  onInviteUser,
  isInviting,
  canInvite = true,
  maxUsers,
  currentCount,
  emailEnabled = true,
}: InviteUserDialogProps) => {
  const { t } = useTranslation("profile");
  const isAtLimit = maxUsers && currentCount && currentCount >= maxUsers;

  const remainingSlots = maxUsers ? maxUsers - (currentCount || 0) : undefined;

  const handleEmailsChange = (emails: string[]) => {
    const validEmails = emails.filter((email) => EMAIL_REGEX.test(email));
    const hasInvalid = emails.length !== validEmails.length;
    setInviteForm({ ...inviteForm, emails: validEmails });
    if (hasInvalid) {
      toast.error(t("invite.invalidEmail"));
    }
  };

  const labels: InviteFieldsLabels = {
    emailPlaceholder: t("invite.emailPlaceholder"),
    role: t("invite.role"),
    selectRole: t("invite.selectRole"),
    roleMember: t("invite.member"),
    roleAdmin: t("invite.admin"),
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("invite.title")}</DialogTitle>
          <DialogDescription>
            {emailEnabled
              ? t("invite.description")
              : t("invite.descriptionNoEmail")}
            {maxUsers && (
              <span className="block mt-1 text-sm">
                {t("invite.usersUsed", {
                  current: currentCount || 0,
                  max: maxUsers,
                })}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {!emailEnabled && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              {t("invite.emailDisabledBanner")}
            </AlertDescription>
          </Alert>
        )}

        {isAtLimit && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {t("invite.userLimitReached", { max: maxUsers })}
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <InviteMembersSection
            inviteEmails={inviteForm.emails}
            setInviteEmails={handleEmailsChange}
            inviteRole={inviteForm.role}
            setInviteRole={(role) => setInviteForm({ ...inviteForm, role })}
            canInviteUsers={canInvite}
            maxInvites={remainingSlots}
            disabled={isInviting || !canInvite}
            labels={labels}
            hideHeader
            emailLabel={t("invite.emailAddress")}
          />

          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isInviting}
            >
              {t("invite.cancel")}
            </Button>
            <Button
              onClick={onInviteUser}
              disabled={
                isInviting ||
                inviteForm.emails.length === 0 ||
                !inviteForm.role ||
                !canInvite
              }
              className="btn-primary"
            >
              {isInviting
                ? emailEnabled
                  ? t("invite.sending")
                  : t("invite.creating")
                : emailEnabled
                  ? t("invite.sendInvitation")
                  : t("invite.createInvitation")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
