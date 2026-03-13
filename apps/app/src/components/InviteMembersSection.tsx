import { useTranslation } from "react-i18next";

import { Info, UserPlus } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TagsInput } from "@/components/ui/tags-input";

export interface InviteFieldsLabels {
  emailPlaceholder: string;
  role: string;
  selectRole: string;
  roleMember: string;
  roleAdmin: string;
}

interface InviteMembersSectionProps {
  inviteEmails: string[];
  setInviteEmails: (emails: string[]) => void;
  inviteRole: "ADMIN" | "MEMBER";
  setInviteRole: (role: "ADMIN" | "MEMBER") => void;
  canInviteUsers: boolean;
  maxInvites?: number;
  disabled?: boolean;
  /** i18n key prefix — "create" for Workspace page, "createForm" for the modal */
  i18nPrefix?: "create" | "createForm";
  /** Override labels (when used outside the workspace i18n namespace) */
  labels?: InviteFieldsLabels;
  /** Hide the header with icon + "Invite Members (Optional)" */
  hideHeader?: boolean;
  /** Show email label above input */
  emailLabel?: string;
}

/**
 * Shared email + role invite fields.
 * Used in workspace creation (modal & post-signup) and team settings invite dialog.
 */
export function InviteMembersSection({
  inviteEmails,
  setInviteEmails,
  inviteRole,
  setInviteRole,
  canInviteUsers,
  maxInvites,
  disabled,
  i18nPrefix = "create",
  labels,
  hideHeader,
  emailLabel,
}: InviteMembersSectionProps) {
  const { t } = useTranslation("workspace");

  // Use explicit labels if provided, otherwise derive from workspace i18n prefix
  const l: InviteFieldsLabels = labels ?? {
    emailPlaceholder: t(`${i18nPrefix}.invitePlaceholder`),
    role: t(`${i18nPrefix}.role`),
    selectRole: t(`${i18nPrefix}.selectRole`),
    roleMember: t(`${i18nPrefix}.roleMember`),
    roleAdmin: t(`${i18nPrefix}.roleAdmin`),
  };

  return (
    <div className="space-y-2">
      {!hideHeader && (
        <div className="flex items-center gap-2">
          <UserPlus className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">
            {t(`${i18nPrefix}.inviteMembers`)} ({t(`${i18nPrefix}.optional`)})
          </span>
        </div>
      )}

      {canInviteUsers ? (
        <div className="space-y-4">
          <div className="space-y-2">
            {emailLabel && <Label>{emailLabel}</Label>}
            <TagsInput
              value={inviteEmails}
              onChange={setInviteEmails}
              placeholder={l.emailPlaceholder}
              maxTags={maxInvites}
              maxTagLength={100}
              disabled={disabled}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm">{l.role}</Label>
            <Select
              value={inviteRole}
              onValueChange={(value) =>
                setInviteRole(value as "ADMIN" | "MEMBER")
              }
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue placeholder={l.selectRole} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MEMBER">{l.roleMember}</SelectItem>
                <SelectItem value="ADMIN">{l.roleAdmin}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {maxInvites && (
            <p className="text-xs text-muted-foreground">
              {t(`${i18nPrefix}.inviteHintWithLimit`, { count: maxInvites })}
            </p>
          )}
        </div>
      ) : (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            {t(`${i18nPrefix}.upgradeToInvite`)}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
