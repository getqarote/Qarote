import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";

import { authClient } from "@/lib/auth-client";
import { logger } from "@/lib/logger";
import { trpc } from "@/lib/trpc/client";

import { PageLoader } from "@/components/PageLoader";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { useAuth } from "@/contexts/AuthContextDefinition";

import { useToast } from "@/hooks/ui/useToast";

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
  const { isAuthenticated, isLoading, user, logout } = useAuth();
  const { toast } = useToast();
  const acceptMutation =
    trpc.workspace.invitation.acceptForAuthenticatedUser.useMutation();
  const inviteProcessedRef = useRef(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteToken, setInviteToken] = useState<string | null>(null);

  const errorParam = searchParams.get("error");
  const error = errorParam
    ? ERROR_MESSAGES[errorParam] || `Authentication error: ${errorParam}`
    : null;

  // Handle pending invite token after OAuth completes
  useEffect(() => {
    if (error || isLoading || !isAuthenticated || inviteProcessedRef.current)
      return;

    const pendingToken = sessionStorage.getItem("pendingInviteToken");
    if (!pendingToken) {
      // No pending invite — normal redirect
      const target = user?.workspaceId ? "/" : "/workspace";
      navigate(target, { replace: true });
      return;
    }

    // Remove from storage immediately to prevent double-processing
    sessionStorage.removeItem("pendingInviteToken");
    inviteProcessedRef.current = true;
    setInviteToken(pendingToken);

    acceptMutation.mutate(
      { token: pendingToken },
      {
        onSuccess: (result) => {
          toast({
            title: "Welcome!",
            description: `You've joined ${result.workspace.name}.`,
          });
          navigate("/", { replace: true });
        },
        onError: (err) => {
          logger.error("Failed to accept invitation after OAuth:", err);
          setInviteError(err.message);
        },
      }
    );
  }, [error, isLoading, isAuthenticated, user?.workspaceId, navigate]);

  // Wait for auth to resolve when no pending invite
  useEffect(() => {
    if (error || isLoading || inviteProcessedRef.current) return;

    if (!isAuthenticated) {
      navigate("/auth/sign-in", { replace: true });
    }
  }, [error, isLoading, isAuthenticated, navigate]);

  // Invite acceptance error — show actionable UI
  if (inviteError) {
    const isEmailMismatch = inviteError.includes("signed in as");

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-auth py-12 px-4">
        <Card className="max-w-md w-full bg-card/95 backdrop-blur-xs border-border/20 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-card-foreground">
              Invitation Error
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertDescription>{inviteError}</AlertDescription>
            </Alert>
            {isEmailMismatch ? (
              <Button
                className="w-full bg-gradient-button hover:bg-gradient-button-hover"
                onClick={async () => {
                  await authClient.signOut();
                  logout();
                  navigate(`/invite/${inviteToken}`, { replace: true });
                }}
              >
                Sign out and try again
              </Button>
            ) : (
              <Button
                className="w-full bg-gradient-button hover:bg-gradient-button-hover"
                onClick={() => navigate("/", { replace: true })}
              >
                Continue to dashboard
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

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
