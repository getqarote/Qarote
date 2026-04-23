import { trpc } from "@/lib/trpc/client";

export interface OrgInvitationDetails {
  id: string;
  email: string;
  role: string;
  expiresAt: string;
  organization: {
    id: string;
    name: string;
  };
  invitedBy: {
    id: string;
    email: string;
    displayName: string;
  } | null;
  userExists: boolean;
}

export const useOrgInvitationDetails = (token: string | undefined) => {
  const query = trpc.public.orgInvitation.getDetails.useQuery(
    { token: token! },
    {
      enabled: !!token,
      retry: false,
      staleTime: Infinity,
    }
  );

  const invitation = query.data?.success
    ? (query.data.invitation as OrgInvitationDetails)
    : null;

  const error = !token
    ? "invalid-token"
    : query.isError
      ? (query.error?.message ?? "fetch-failed")
      : query.data && !query.data.success
        ? "invalid-or-expired"
        : null;

  return {
    invitation,
    loading: query.isLoading,
    error,
  };
};
