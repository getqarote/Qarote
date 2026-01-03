import "@/styles/google-auth.css";

import React from "react";
import { CredentialResponse, GoogleLogin } from "@react-oauth/google";
import { useNavigate } from "react-router-dom";

import { logger } from "@/lib/logger";
import { trpc } from "@/lib/trpc/client";

import { useAuth } from "@/contexts/AuthContextDefinition";

import { useToast } from "@/hooks/ui/useToast";

interface GoogleInvitationButtonProps {
  invitationToken: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
  className?: string;
  disabled?: boolean;
}

export const GoogleInvitationButton: React.FC<GoogleInvitationButtonProps> = ({
  invitationToken,
  onSuccess,
  onError,
  className,
}) => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const googleInvitationMutation =
    trpc.public.invitation.acceptWithGoogle.useMutation({
      onSuccess: (data) => {
        // Set authentication state
        login(data.token, data.user);

        // Show success message
        toast({
          title: "Welcome to Qarote!",
          description: `You've successfully joined ${data.workspace.name}${data.isNewUser ? " with Google" : ""}`,
        });

        onSuccess?.();

        // Redirect to dashboard
        navigate("/", { replace: true });
      },
      onError: (error: Error) => {
        logger.error("Google invitation acceptance failed:", error);
        const errorMessage =
          error.message || "Failed to accept invitation with Google";
        onError?.(errorMessage);

        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      },
    });

  const handleGoogleSuccess = (credentialResponse: CredentialResponse) => {
    if (credentialResponse.credential) {
      googleInvitationMutation.mutate({
        token: invitationToken,
        credential: credentialResponse.credential,
      });
    } else {
      onError?.("No credential received from Google");
    }
  };

  const handleGoogleError = () => {
    onError?.("Google login was cancelled or failed");
  };

  return (
    <div
      className={`google-login-container flex justify-center items-center ${className || ""}`}
    >
      <GoogleLogin
        onSuccess={handleGoogleSuccess}
        onError={handleGoogleError}
        useOneTap={false}
        theme="outline"
        size="large"
        text="signup_with"
        shape="rectangular"
        logo_alignment="left"
        width={200}
      />
    </div>
  );
};
