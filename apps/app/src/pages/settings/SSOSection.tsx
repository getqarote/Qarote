import { UserRole } from "@/lib/api";

import { LoadingState } from "@/components/settings/sso/LoadingState";
import { SSOProviderForm } from "@/components/settings/sso/SSOProviderForm";
import { SSOUpgradePrompt } from "@/components/settings/sso/SSOUpgradePrompt";

import { useAuth } from "@/contexts/AuthContextDefinition";

import { useSsoProviderConfig } from "@/hooks/queries/useSsoProvider";
import { useUser } from "@/hooks/ui/useUser";

import { UserPlan } from "@/types/plans";

/**
 * Composition shell for the SSO settings surface. Owns only the
 * top-level gating (admin-only, enterprise-only, loading, setup vs
 * edit). Every other concern — form state, mutations, individual
 * cards, the delete dialog — lives in `components/settings/sso/`.
 *
 * This file used to be 819 lines with a 240-line `SSOForm` and a
 * near-identical 240-line `SetupForm`. Collapsing them into a single
 * `SSOProviderForm` via a discriminated union on `mode` eliminates
 * ~150 lines of duplication and ensures future protocol changes
 * (e.g. adding a new OIDC field) only have to land in one place.
 */
const SSOSection = () => {
  const { user } = useAuth();
  const { userPlan } = useUser();

  const isEnterprise = userPlan === UserPlan.ENTERPRISE;

  const {
    data: providerConfig,
    isLoading,
    refetch,
  } = useSsoProviderConfig({
    enabled: user?.role === UserRole.ADMIN && isEnterprise,
  });

  // Non-admins have no SSO surface at all. Return null rather than a
  // gate because the parent route should have prevented this anyway;
  // rendering something here would be a sibling-of-the-bug.
  if (user?.role !== UserRole.ADMIN) {
    return null;
  }

  if (!isEnterprise) {
    return <SSOUpgradePrompt />;
  }

  if (isLoading) {
    return <LoadingState />;
  }

  if (!providerConfig) {
    return <SSOProviderForm mode="setup" onRefetch={refetch} />;
  }

  return (
    <SSOProviderForm
      key={providerConfig.providerId}
      mode="edit"
      initialData={providerConfig}
      onRefetch={refetch}
    />
  );
};

export default SSOSection;
