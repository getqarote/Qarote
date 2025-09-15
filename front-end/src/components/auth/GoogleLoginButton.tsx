import React from "react";
import { GoogleLogin, CredentialResponse } from "@react-oauth/google";
import { Button } from "@/components/ui/button";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { apiClient } from "@/lib/api";
import logger from "@/lib/logger";
import "@/styles/google-auth.css";

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
    onSuccess: async (data) => {
      try {
        // Check if user has any workspaces BEFORE setting auth state
        const currentToken = localStorage.getItem("auth_token");
        localStorage.setItem("auth_token", data.token);

        const workspacesResponse = await apiClient.getUserWorkspaces();
        const workspaces = workspacesResponse.workspaces || [];

        // Restore original token temporarily (in case login fails)
        if (currentToken) {
          localStorage.setItem("auth_token", currentToken);
        } else {
          localStorage.removeItem("auth_token");
        }

        // Now set the authentication state
        login(data.token, data.user);

        if (workspaces.length === 0) {
          // No workspaces - redirect to workspace creation
          navigate("/workspace", { replace: true });
        } else {
          // Has workspaces - redirect to dashboard
          navigate("/", { replace: true });
        }

        onSuccess?.();
      } catch (error) {
        logger.error("Failed to check workspaces after Google login:", error);
        // Even if workspace check fails, set auth state and redirect
        login(data.token, data.user);
        navigate("/", { replace: true });
        onSuccess?.();
      }
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
        width="100%"
      />
    </div>
  );
};

export default GoogleLoginButton;
