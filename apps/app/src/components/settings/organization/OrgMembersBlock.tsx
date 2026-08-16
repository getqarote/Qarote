import { useState } from "react";

import { OrgMembersCard } from "@/components/settings/organization/OrgMembersCard";
import { OrgMyInvitationsCard } from "@/components/settings/organization/OrgMyInvitationsCard";
import { RemoveMemberDialog } from "@/components/settings/organization/RemoveMemberDialog";

/**
 * Organization-membership block — the members list (with inline invite +
 * pending invitations) plus the remove-confirm dialog. Lives on the Members
 * page alongside workspace members, since org and workspace membership are
 * peers. Owns the remove-target state because the dialog is page-level but
 * triggered from a member's Manage menu.
 */
export function OrgMembersBlock({ isOrgAdmin }: { isOrgAdmin: boolean }) {
  const [memberToRemove, setMemberToRemove] = useState<{
    id: string;
    email: string;
  } | null>(null);

  return (
    <>
      <OrgMembersCard
        isOrgAdmin={isOrgAdmin}
        onRemoveMember={setMemberToRemove}
      />

      <OrgMyInvitationsCard alreadyInOrg />

      <RemoveMemberDialog
        member={memberToRemove}
        onClose={() => setMemberToRemove(null)}
      />
    </>
  );
}
