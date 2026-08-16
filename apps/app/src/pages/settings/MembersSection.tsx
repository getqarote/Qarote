import { useTranslation } from "react-i18next";

import { OrgMembersBlock } from "@/components/settings/organization/OrgMembersBlock";
import { Skeleton } from "@/components/ui/skeleton";

import { useCurrentOrganization } from "@/hooks/queries/useOrganization";

import WorkspaceMembers from "./TeamSection";

/**
 * `/settings/members` — organization and workspace access on one page (they're
 * peers, not nested). Org membership (roles, invites, pending) sits above the
 * current workspace's membership. Each block owns its own data + mutations;
 * this shell just stacks them under one SectionHead.
 */
const MembersSection = () => {
  const { t } = useTranslation("profile");
  const { data: orgData, isLoading } = useCurrentOrganization();
  const isOrgAdmin = orgData?.role === "OWNER" || orgData?.role === "ADMIN";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          {t("team.pageTitle")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("team.pageSubtitle")}
        </p>
      </div>

      {isLoading ? (
        <Skeleton className="h-32 w-full rounded-xl" />
      ) : (
        orgData?.organization && <OrgMembersBlock isOrgAdmin={isOrgAdmin} />
      )}

      <WorkspaceMembers />
    </div>
  );
};

export default MembersSection;
