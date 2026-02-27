import { isSelfHostedMode } from "@/lib/featureFlags";
import { trpc } from "@/lib/trpc/client";

export const useLicenseStatus = () => {
  return trpc.selfhostedLicense.status.useQuery(undefined, {
    enabled: isSelfHostedMode(),
    staleTime: 30_000,
  });
};

export const useActivateLicense = (options?: {
  onSuccess?: (data: {
    tier: string;
    features: string[];
    expiresAt: string;
  }) => void;
  onError?: (error: { message: string }) => void;
}) => {
  const utils = trpc.useUtils();

  return trpc.selfhostedLicense.activate.useMutation({
    onSuccess: (data) => {
      utils.selfhostedLicense.status.invalidate();
      utils.public.getFeatureFlags.invalidate();
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      options?.onError?.(error);
    },
  });
};

export const useDeactivateLicense = (options?: {
  onSuccess?: () => void;
  onError?: (error: { message: string }) => void;
}) => {
  const utils = trpc.useUtils();

  return trpc.selfhostedLicense.deactivate.useMutation({
    onSuccess: () => {
      utils.selfhostedLicense.status.invalidate();
      utils.public.getFeatureFlags.invalidate();
      options?.onSuccess?.();
    },
    onError: (error) => {
      options?.onError?.(error);
    },
  });
};
