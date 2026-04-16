import React, { useState } from "react";

import { LockKeyholeIcon } from "lucide-react";

import { authClient } from "@/lib/auth-client";
import { isCloudMode } from "@/lib/featureFlags";
import { logger } from "@/lib/logger";
import { trpc } from "@/lib/trpc/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SSOLoginButtonProps {
  onError?: (error: string) => void;
  onBeforeRedirect?: () => void;
  callbackURL?: string;
  className?: string;
  mode?: "signin" | "signup";
}

export const SSOLoginButton: React.FC<SSOLoginButtonProps> = ({
  onError,
  onBeforeRedirect,
  callbackURL,
  className,
  mode = "signin",
}) => {
  const [email, setEmail] = useState("");
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const ssoConfigQuery = trpc.sso.getConfig.useQuery(undefined, {
    staleTime: Infinity,
    retry: false,
  });

  const config = ssoConfigQuery.data;

  const handleSelfHostedClick = async () => {
    if (!config?.providerId) return;
    try {
      setIsPending(true);
      onBeforeRedirect?.();
      await authClient.signIn.sso({
        providerId: config.providerId,
        callbackURL:
          callbackURL || `${window.location.origin}/auth/sso/callback`,
      });
    } catch (error) {
      logger.error("SSO redirect failed:", error);
      onError?.("SSO login failed");
    } finally {
      setIsPending(false);
    }
  };

  const handleCloudSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    try {
      setIsPending(true);
      onBeforeRedirect?.();
      await authClient.signIn.sso({
        email,
        callbackURL:
          callbackURL || `${window.location.origin}/auth/sso/callback`,
      });
    } catch (error) {
      logger.error("SSO redirect failed:", error);
      onError?.(
        "SSO login failed. Make sure your email domain has SSO configured."
      );
    } finally {
      setIsPending(false);
    }
  };

  if (!config?.enabled) return null;

  const buttonLabel = config.buttonLabel ?? "Sign in with SSO";
  const displayLabel =
    mode === "signup" ? buttonLabel.replace("Sign in", "Sign up") : buttonLabel;

  // Cloud: email-based domain discovery flow
  if (isCloudMode()) {
    if (showEmailInput) {
      return (
        <div className={`flex flex-col gap-2 ${className || ""}`}>
          <form onSubmit={handleCloudSubmit} className="flex gap-2">
            <Input
              type="email"
              placeholder="your@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1"
            />
            <Button
              type="submit"
              disabled={isPending || !email.trim()}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Continue
            </Button>
          </form>
          <button
            type="button"
            className="text-xs text-muted-foreground hover:underline text-left"
            onClick={() => setShowEmailInput(false)}
          >
            Cancel
          </button>
        </div>
      );
    }

    return (
      <div className={`flex justify-center items-center ${className || ""}`}>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => setShowEmailInput(true)}
        >
          <LockKeyholeIcon className="mr-2 h-4 w-4" />
          {displayLabel}
        </Button>
      </div>
    );
  }

  // Self-hosted: direct button (no email lookup needed)
  return (
    <div className={`flex justify-center items-center ${className || ""}`}>
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={handleSelfHostedClick}
        disabled={isPending}
      >
        <LockKeyholeIcon className="mr-2 h-4 w-4" />
        {displayLabel}
      </Button>
    </div>
  );
};
