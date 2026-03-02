import { trpc } from "@/lib/trpc/client";

export const usePublicConfig = () => {
  return trpc.public.getConfig.useQuery(undefined, {
    staleTime: Infinity,
    retry: false,
  });
};
