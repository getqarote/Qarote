import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";

import type { User } from "@/lib/api";
import { logger } from "@/lib/logger";
import { trpc } from "@/lib/trpc/client";

import { PageLoader } from "@/components/PageLoader";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { useAuth } from "@/contexts/AuthContextDefinition";

const ERROR_MESSAGES: Record<string, string> = {
  missing_code: "Authorization code was not provided.",
  invalid_state:
    "Invalid or expired authentication session. This may be a security issue. Please try signing in again.",
  no_email: "Your identity provider did not return an email address.",
  no_subject_id:
    "Your identity provider did not return a user identifier. Please contact your administrator.",
  account_creation_failed: "Failed to create your account. Please try again.",
  account_inactive:
    "Your account is inactive. Please contact your administrator.",
  token_exchange_failed: "Failed to exchange authorization token.",
  authentication_failed: "SSO authentication failed. Please try again.",
  expired_code: "Your login session has expired. Please try again.",
  email_in_use:
    "An account with this email already exists using a different sign-in method. Please sign in with your existing method.",
};

const SSOCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(() => {
    const errorParam = searchParams.get("error");
    if (errorParam) {
      return (
        ERROR_MESSAGES[errorParam] || `Authentication error: ${errorParam}`
      );
    }
    if (!searchParams.get("code")) {
      return "Missing authorization code. Please try signing in again.";
    }
    return null;
  });
  const processedRef = useRef(false);

  const exchangeCodeMutation = trpc.auth.sso.exchangeCode.useMutation({
    onSuccess: (data) => {
      login(data.token, data.user as User);
      navigate("/workspace", { replace: true });
    },
    onError: (err) => {
      logger.error("SSO code exchange failed:", err);
      setError(err.message || "SSO authentication failed");
    },
  });

  useEffect(() => {
    // Prevent double execution in React strict mode
    if (processedRef.current) return;
    processedRef.current = true;

    const code = searchParams.get("code");

    // Only exchange if we have a valid code and no initial error
    if (!code || error) {
      return;
    }

    // Exchange the temp auth code for a JWT
    exchangeCodeMutation.mutate({ code });
  }, [exchangeCodeMutation, searchParams, error]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-auth py-12 px-4">
        <Card className="max-w-md w-full bg-white/95 backdrop-blur-xs">
          <CardHeader>
            <CardTitle className="text-gray-900">
              Authentication Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button
              className="w-full mt-4 bg-gradient-button hover:bg-gradient-button-hover"
              onClick={() => navigate("/auth/sign-in", { replace: true })}
            >
              Return to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <PageLoader />;
};

export default SSOCallback;
