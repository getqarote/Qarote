import React from "react";

import { LockKeyholeIcon } from "lucide-react";

import { logger } from "@/lib/logger";
import { trpc } from "@/lib/trpc/client";

import { Button } from "@/components/ui/button";

interface SSOLoginButtonProps {
  onError?: (error: string) => void;
  className?: string;
  mode?: "signin" | "signup";
}

export const SSOLoginButton: React.FC<SSOLoginButtonProps> = ({
  onError,
  className,
  mode = "signin",
}) => {
  // Query SSO config from the backend
  const ssoConfigQuery = trpc.auth.sso.getConfig.useQuery(undefined, {
    staleTime: Infinity,
    retry: false,
  });

  const handleClick = () => {
    try {
      // VITE_API_URL (build-time) wins over runtime config (binary mode fallback).
      const apiUrl =
        import.meta.env.VITE_API_URL ??
        (
          (window as unknown as Record<string, unknown>).__QAROTE_CONFIG__ as
            | { apiUrl?: string }
            | undefined
        )?.apiUrl ??
        "";
      // Full page redirect to the SSO authorize endpoint
      window.location.href = `${apiUrl}/sso/authorize`;
    } catch (error) {
      logger.error("SSO redirect failed:", error);
      onError?.("SSO login failed");
    }
  };

  // Don't render if SSO is not enabled or config is still loading
  if (!ssoConfigQuery.data?.enabled) {
    return null;
  }

  const buttonLabel = ssoConfigQuery.data?.buttonLabel ?? "Sign in with SSO";
  const displayLabel =
    mode === "signup" ? buttonLabel.replace("Sign in", "Sign up") : buttonLabel;

  return (
    <div className={`flex justify-center items-center ${className || ""}`}>
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={handleClick}
      >
        <LockKeyholeIcon className="mr-2 h-4 w-4" />
        {displayLabel}
      </Button>
    </div>
  );
};
