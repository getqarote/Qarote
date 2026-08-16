import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { ArrowRight } from "lucide-react";

import { DeleteOrganizationCard } from "@/components/settings/organization/DeleteOrganizationCard";
import { NoOrgView } from "@/components/settings/organization/NoOrgView";
import { OrgInfoCard } from "@/components/settings/organization/OrgInfoCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import { useCurrentOrganization } from "@/hooks/queries/useOrganization";
import { useUser } from "@/hooks/ui/useUser";

import { getPlanDisplayName } from "@/types/plans";

/**
 * `/settings/organization` — the billing + team boundary (a peer of the
 * workspace, not its parent). Org info, the current plan, and the delete
 * danger zone. Member management lives on the Members page; this page is just
 * the org's own identity and billing.
 */
const OrganizationSection = () => {
  const { t } = useTranslation("profile");
  const { data: orgData, isLoading } = useCurrentOrganization();
  const { userPlan } = useUser();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  const org = orgData?.organization;
  const callerRole = orgData?.role;
  const isOrgAdmin = callerRole === "OWNER" || callerRole === "ADMIN";

  if (!org) {
    return <NoOrgView />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          {t("org.sectionTitle")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("org.sectionSubtitle")}
        </p>
      </div>

      {/* key forces a remount (form reset) when switching orgs. */}
      <OrgInfoCard key={org.id} org={org} isOrgAdmin={isOrgAdmin} />

      {/* Current plan */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-6">
        <div>
          <p className="text-sm font-semibold">{t("org.currentPlan")}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {getPlanDisplayName(userPlan)}
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link to="/settings/subscription">
            {t("org.viewSubscription")}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </Button>
      </div>

      {/* Danger zone — only the OWNER can destroy the org. */}
      {callerRole === "OWNER" && <DeleteOrganizationCard org={org} />}
    </div>
  );
};

export default OrganizationSection;
