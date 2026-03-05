import { useState } from "react";
import { useTranslation } from "react-i18next";

import { AlertTriangle, Check, Copy, Info } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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

import { InviteFormState } from "./profileUtils";

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
  inviteResult?: { inviteUrl: string; email: string } | null;
  onResultDismiss?: () => void;
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
  inviteResult,
  onResultDismiss,
}: InviteUserDialogProps) => {
  const { t } = useTranslation("profile");
  const [copied, setCopied] = useState(false);
  const isAtLimit = maxUsers && currentCount && currentCount >= maxUsers;

  const handleCopyLink = async () => {
    if (inviteResult?.inviteUrl) {
      await navigator.clipboard.writeText(inviteResult.inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDone = () => {
    onResultDismiss?.();
    onOpenChange(false);
  };

  // Result view: shown after invitation creation when email was not sent
  if (inviteResult) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("invite.resultTitle")}</DialogTitle>
            <DialogDescription>
              {t("invite.resultDescription", { email: inviteResult.email })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                readOnly
                value={inviteResult.inviteUrl}
                className="font-mono text-sm"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyLink}
                className="shrink-0"
              >
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleDone}>{t("invite.done")}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Form view
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
          <div className="space-y-2">
            <Label htmlFor="email">{t("invite.emailAddress")}</Label>
            <Input
              id="email"
              type="email"
              placeholder="colleague@company.com"
              value={inviteForm.email}
              onChange={(e) =>
                setInviteForm({ ...inviteForm, email: e.target.value })
              }
              disabled={isInviting || !canInvite}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">{t("invite.role")}</Label>
            <Select
              value={inviteForm.role}
              onValueChange={(value) =>
                setInviteForm({
                  ...inviteForm,
                  role: value as "ADMIN" | "MEMBER",
                })
              }
              disabled={isInviting || !canInvite}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("invite.selectRole")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MEMBER">{t("invite.member")}</SelectItem>
                <SelectItem value="ADMIN">{t("invite.admin")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

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
                !inviteForm.email ||
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
