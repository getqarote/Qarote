import "@/styles/google-auth.css";

import React from "react";
import { CredentialResponse, GoogleLogin } from "@react-oauth/google";
import { useNavigate } from "react-router-dom";

import { trackSignUp } from "@/lib/ga";
import { logger } from "@/lib/logger";
import { trpc } from "@/lib/trpc/client";

import { useAuth } from "@/contexts/AuthContextDefinition";

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

  // Check if OAuth is enabled
  const deploymentMode = import.meta.env.VITE_DEPLOYMENT_MODE || "cloud";
  const enableOAuth =
    import.meta.env.VITE_ENABLE_OAUTH !== "false" &&
    (deploymentMode === "cloud" ||
      import.meta.env.VITE_ENABLE_OAUTH === "true");
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  // Always call hooks before any conditional returns
  const googleLoginMutation = trpc.auth.google.googleLogin.useMutation({
    onSuccess: (data) => {
      // Set authentication state
      login(data.token, data.user);

      // Track sign up event with Google Analytics if in signup mode
      if (mode === "signup") {
        trackSignUp({
          method: "google",
          user_id: data.user.id,
        });
      }

      onSuccess?.();
    },
    onError: (error: Error) => {
      logger.error("Google login failed:", error);
      onError?.(error.message || "Google login failed");
    },
  });

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
    onError?.("Google login was cancelled or failed");
  };

  if (googleLoginMutation.isSuccess) {
    navigate("/workspace", { replace: true });
  }

  // Don't render if OAuth is disabled or client ID is missing
  if (!enableOAuth || !googleClientId) {
    return null;
  }

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
