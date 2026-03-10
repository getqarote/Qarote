import { useTranslation } from "react-i18next";

import { Info, UserPlus } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { TagsInput } from "@/components/ui/tags-input";

interface InviteMembersSectionProps {
  inviteEmails: string[];
  setInviteEmails: (emails: string[]) => void;
  canInviteUsers: boolean;
  maxInvites?: number;
  disabled?: boolean;
  /** i18n key prefix — "create" for Workspace page, "createForm" for the modal */
  i18nPrefix?: "create" | "createForm";
}

export function InviteMembersSection({
  inviteEmails,
  setInviteEmails,
  canInviteUsers,
  maxInvites,
  disabled,
  i18nPrefix = "create",
}: InviteMembersSectionProps) {
  const { t } = useTranslation("workspace");

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <UserPlus className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">
          {t(`${i18nPrefix}.inviteMembers`)} ({t(`${i18nPrefix}.optional`)})
        </span>
      </div>

      {canInviteUsers ? (
        <>
          <TagsInput
            value={inviteEmails}
            onChange={setInviteEmails}
            placeholder={t(`${i18nPrefix}.invitePlaceholder`)}
            maxTags={maxInvites}
            maxTagLength={100}
            disabled={disabled}
          />
          {maxInvites && (
            <p className="text-xs text-muted-foreground">
              {t(`${i18nPrefix}.inviteHintWithLimit`, { count: maxInvites })}
            </p>
          )}
        </>
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
