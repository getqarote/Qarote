import React from "react";
import { GoogleLogin, CredentialResponse } from "@react-oauth/google";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContextDefinition";
import { useNavigate } from "react-router-dom";
import { apiClient } from "@/lib/api";
import logger from "@/lib/logger";
import { useToast } from "@/hooks/useToast";
import "@/styles/google-auth.css";

interface GoogleInvitationButtonProps {
  invitationToken: string;
  invitationEmail: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
  className?: string;
  disabled?: boolean;
}

export const GoogleInvitationButton: React.FC<GoogleInvitationButtonProps> = ({
  invitationToken,
  invitationEmail,
  onSuccess,
  onError,
  className,
  disabled = false,
}) => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const googleInvitationMutation = useMutation({
    mutationFn: async (credentialResponse: CredentialResponse) => {
      if (!credentialResponse.credential) {
        throw new Error("No credential received from Google");
      }
      return await apiClient.acceptInvitationWithGoogle(
        invitationToken,
        credentialResponse.credential
      );
    },
    onSuccess: (data) => {
      // Set authentication state
      login(data.token, data.user);

      // Show success message
      toast({
        title: "Welcome to RabbitHQ!",
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
      googleInvitationMutation.mutate(credentialResponse);
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
        disabled={disabled || googleInvitationMutation.isPending}
      />
    </div>
  );
};
