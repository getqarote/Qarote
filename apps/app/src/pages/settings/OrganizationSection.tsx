import { useState } from "react";

import { InviteMemberDialog } from "@/components/settings/organization/InviteMemberDialog";
import { NoOrgView } from "@/components/settings/organization/NoOrgView";
import { OrgContextHeader } from "@/components/settings/organization/OrgContextHeader";
import { OrgInfoCard } from "@/components/settings/organization/OrgInfoCard";
import { OrgMembersCard } from "@/components/settings/organization/OrgMembersCard";
import { OrgMyInvitationsCard } from "@/components/settings/organization/OrgMyInvitationsCard";
import { OrgPendingInvitationsCard } from "@/components/settings/organization/OrgPendingInvitationsCard";
import { RemoveMemberDialog } from "@/components/settings/organization/RemoveMemberDialog";
import { Skeleton } from "@/components/ui/skeleton";

import { useMyOrganizations } from "@/hooks/queries/useMyOrganizations";
import { useCurrentOrganization } from "@/hooks/queries/useOrganization";

/**
 * Composition shell for the Organization settings surface. Owns only:
 *   - The top-level guard (loading / not-in-org / in-org)
 *   - The invite dialog open state, because it's triggered from the
 *     Members card header but lives as a page-level dialog
 *   - The remove member target state, for the same reason
 *
 * Every other concern — form state, pagination, mutations, card data
 * fetching — lives in the individual extracted components. This file
 * used to be 1430 lines; the extraction makes each sub-component
 * independently readable and testable.
 */
const OrganizationSection = () => {
  const { data: orgData, isLoading: orgLoading } = useCurrentOrganization();
  const { data: orgsData } = useMyOrganizations();

  const [inviteOpen, setInviteOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<{
    id: string;
    email: string;
  } | null>(null);

  if (orgLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const org = orgData?.organization;
  const callerRole = orgData?.role;
  const isOrgAdmin = callerRole === "OWNER" || callerRole === "ADMIN";
  const organizations = orgsData?.organizations ?? [];

  if (!org) {
    return <NoOrgView />;
  }

  return (
    <div className="space-y-6">
      <OrgContextHeader
        org={org}
        callerRole={callerRole}
        organizations={organizations}
      />

      {/* `key={org.id}` forces a remount when the operator switches
          organizations, which resets the inline-edit state inside
          `OrgInfoCard` without needing an effect. */}
      <OrgInfoCard key={org.id} org={org} isOrgAdmin={isOrgAdmin} />

      <OrgMembersCard
        isOrgAdmin={isOrgAdmin}
        onInviteClick={() => setInviteOpen(true)}
        onRemoveMember={setMemberToRemove}
      />

      {isOrgAdmin && <OrgPendingInvitationsCard />}

      <OrgMyInvitationsCard alreadyInOrg />

      <InviteMemberDialog open={inviteOpen} onOpenChange={setInviteOpen} />

      <RemoveMemberDialog
        member={memberToRemove}
        onClose={() => setMemberToRemove(null)}
      />
    </div>
  );
};

export default OrganizationSection;
