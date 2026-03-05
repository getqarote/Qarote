import { isSelfHostedMode } from "@/lib/featureFlags";
import { trpc } from "@/lib/trpc/client";

export const useSelfhostedSmtpSettings = (options?: { enabled?: boolean }) => {
  return trpc.selfhostedSmtp.getSettings.useQuery(undefined, {
    enabled: options?.enabled ?? isSelfHostedMode(),
  });
};

export const useSmtpUpdate = (options?: {
  onSuccess?: () => void;
  onError?: (error: { message: string }) => void;
}) => {
  const utils = trpc.useUtils();

  return trpc.selfhostedSmtp.updateSettings.useMutation({
    onSuccess: () => {
      options?.onSuccess?.();
      utils.selfhostedSmtp.getSettings.invalidate();
      // Refresh public config so emailEnabled reflects new SMTP state
      utils.public.getConfig.invalidate();
    },
    onError: options?.onError,
  });
};

export const useSmtpTestConnection = (options?: {
  onSuccess?: (data: { success: boolean; error?: string }) => void;
  onError?: (error: { message: string }) => void;
}) => {
  return trpc.selfhostedSmtp.testConnection.useMutation({
    onSuccess: options?.onSuccess,
    onError: options?.onError,
  });
};
