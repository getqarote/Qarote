import "@/styles/google-auth.css";

import React from "react";
import { CredentialResponse, GoogleLogin } from "@react-oauth/google";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import { apiClient } from "@/lib/api";
import { trackSignUp } from "@/lib/ga";
import { logger } from "@/lib/logger";

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

  const googleLoginMutation = useMutation({
    mutationFn: async (credentialResponse: CredentialResponse) => {
      return await apiClient.googleLogin(credentialResponse.credential);
    },
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
      googleLoginMutation.mutate(credentialResponse);
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
