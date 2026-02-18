import "@/styles/google-auth.css";

import React from "react";
import { CredentialResponse, GoogleLogin } from "@react-oauth/google";
import { useNavigate } from "react-router";

import { toast } from "sonner";

import { logger } from "@/lib/logger";
import { trpc } from "@/lib/trpc/client";

import { useAuth } from "@/contexts/AuthContext";

interface GoogleLoginButtonProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
  className?: string;
  mode?: "signin" | "signup";
}

export const GoogleLoginButton: React.FC<GoogleLoginButtonProps> = ({
  onSuccess,
  onError,
  className,
  mode = "signin",
}) => {
  const { login } = useAuth();
  const navigate = useNavigate();

  // Hooks must be called before any early returns
  const googleLoginMutation = trpc.auth.google.googleLogin.useMutation({
    onSuccess: (data) => {
      // Set authentication state
      login(data.token, data.user);
      toast.success("Logged in successfully with Google");
      onSuccess?.();
      navigate("/licenses", { replace: true });
    },
    onError: (error) => {
      logger.error("Google login failed:", error);
      const errorMessage = error.message || "Google login failed";
      toast.error(errorMessage);
      onError?.(errorMessage);
    },
  });

  // OAuth is only enabled for cloud deployments
  const deploymentMode = import.meta.env.VITE_DEPLOYMENT_MODE || "cloud";
  const enableOAuth = deploymentMode === "cloud";
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  // Don't render if OAuth is disabled or client ID is missing
  if (!enableOAuth || !googleClientId) {
    return null;
  }

  const handleGoogleSuccess = (credentialResponse: CredentialResponse) => {
    if (credentialResponse.credential) {
      googleLoginMutation.mutate({
        credential: credentialResponse.credential,
      });
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
        text={mode === "signup" ? "signup_with" : "signin_with"}
        shape="rectangular"
        logo_alignment="left"
        width={200}
      />
    </div>
  );
};
