import { trpc } from "@/lib/trpc/client";

export function useLicenses() {
  const { data, isLoading, isError, refetch } =
    trpc.license.getLicenses.useQuery();
  return { data, isLoading, isError, refetch };
}
