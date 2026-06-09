import { trpc } from "@/lib/trpc/client";

export function useLicenses() {
  const { data, isLoading, isError, refetch } =
    trpc.license.getLicenses.useQuery();
  return { data, isLoading, isError, refetch };
}

/** Rotate the signed key of a license (issues a fresh JWT). */
export function useRegenerateLicense() {
  return trpc.license.regenerate.useMutation();
}
