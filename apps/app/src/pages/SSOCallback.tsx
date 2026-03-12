import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";

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
  const { isAuthenticated, isLoading, user } = useAuth();
  const errorParam = searchParams.get("error");
  const error = errorParam
    ? ERROR_MESSAGES[errorParam] || `Authentication error: ${errorParam}`
    : null;

  // Wait for auth to resolve, then navigate based on state
  useEffect(() => {
    if (error || isLoading) return;

    if (isAuthenticated) {
      // Authenticated: go to dashboard if user has workspace, otherwise workspace creation
      const target = user?.workspaceId ? "/" : "/workspace";
      navigate(target, { replace: true });
    } else {
      // Session cookie was expected but auth check found nothing — redirect to sign-in
      navigate("/auth/sign-in", { replace: true });
    }
  }, [error, isLoading, isAuthenticated, user?.workspaceId, navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-auth py-12 px-4">
        <Card className="max-w-md w-full bg-card/95 backdrop-blur-xs border-border/20 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-card-foreground">
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
