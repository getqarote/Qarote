import { isCloudMode } from "@/lib/featureFlags";
import { trpc } from "@/lib/trpc/client";

const useSsoConfig = () => {
  return trpc.sso.getConfig.useQuery(undefined, {
    staleTime: Infinity,
    retry: false,
  });
};

export const useShowAlternativeAuth = () => {
  const ssoConfig = useSsoConfig();
  const showAlternativeAuth =
    (isCloudMode() && !!import.meta.env.VITE_GOOGLE_CLIENT_ID) ||
    !!ssoConfig.data?.enabled;
  return { showAlternativeAuth };
};
