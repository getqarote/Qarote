import { trpc } from "@/lib/trpc/client";

import { useAuth } from "@/contexts/AuthContextDefinition";

/**
 * Hook to fetch all organizations the current user belongs to.
 * Used by the WorkspaceSelector to determine if the user is multi-org.
 */
export const useMyOrganizations = () => {
  const { isAuthenticated } = useAuth();

  return trpc.organization.management.listMyOrganizations.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 60000, // 1 minute
  });
};
