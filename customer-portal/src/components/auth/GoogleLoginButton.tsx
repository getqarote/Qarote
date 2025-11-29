import "@/styles/google-auth.css";

import React from "react";
import { CredentialResponse, GoogleLogin } from "@react-oauth/google";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import { toast } from "sonner";

import { authClient } from "@/lib/api";
import { logger } from "@/lib/logger";

import { useAuth } from "@/contexts/AuthContext";

interface GoogleLoginButtonProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
  className?: string;
}

export const GoogleLoginButton: React.FC<GoogleLoginButtonProps> = ({
  onSuccess,
  onError,
  className,
}) => {
  const { login } = useAuth();
  const navigate = useNavigate();

  // Check if OAuth is enabled
  const deploymentMode = import.meta.env.VITE_DEPLOYMENT_MODE || "cloud";
  const enableOAuth =
    import.meta.env.VITE_ENABLE_OAUTH !== "false" &&
    (deploymentMode === "cloud" ||
      import.meta.env.VITE_ENABLE_OAUTH === "true");
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  // Don't render if OAuth is disabled or client ID is missing
  if (!enableOAuth || !googleClientId) {
    return null;
  }

  const googleLoginMutation = useMutation({
    mutationFn: async (credentialResponse: CredentialResponse) => {
      if (!credentialResponse.credential) {
        throw new Error("No credential received from Google");
      }
      return await authClient.googleLogin(credentialResponse.credential);
    },
    onSuccess: (data) => {
      // Set authentication state
      login(data.token, data.user);
      toast.success("Logged in successfully with Google");
      onSuccess?.();
      navigate("/licenses", { replace: true });
    },
    onError: (error: Error) => {
      logger.error("Google login failed:", error);
      const errorMessage = error.message || "Google login failed";
      toast.error(errorMessage);
      onError?.(errorMessage);
    },
  });

  const handleGoogleSuccess = (credentialResponse: CredentialResponse) => {
    if (credentialResponse.credential) {
      googleLoginMutation.mutate(credentialResponse);
    } else {
      onError?.("No credential received from Google");
    }
  };

  const handleGoogleError = () => {
    const errorMessage = "Google login was cancelled or failed";
    toast.error(errorMessage);
    onError?.(errorMessage);
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
        text="signin_with"
        shape="rectangular"
        logo_alignment="left"
        width={200}
      />
    </div>
  );
};

