import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";

import { AlertCircle } from "lucide-react";

import { AuthPageHeader } from "@/components/auth/AuthPageHeader";
import { AuthPageWrapper } from "@/components/auth/AuthPageWrapper";
import { PageLoader } from "@/components/PageLoader";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";

import { useAuth } from "@/contexts/AuthContextDefinition";

/**
 * Human-readable error messages for the error codes the server
 * returns on a failed SSO callback. Unrecognized codes fall through
 * to a generic "Authentication error: {code}" message so the
 * operator still sees something actionable.
 */
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

/**
 * SSO callback handler. Reached when the IdP redirects the browser
 * back to Qarote after authentication. Two render branches:
 *
 *   1. **Error** — the URL has an `?error=` param; we surface the
 *      error in an AuthPageWrapper with a "return to sign in"
 *      fallback
 *   2. **Success** — session cookie is set; we figure out where to
 *      land (pending org invitation, workspace dashboard, or
 *      onboarding) and navigate there. Shows a `PageLoader` while
 *      the auth context resolves.
 */
const SSOCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, user } = useAuth();
  const errorParam = searchParams.get("error");
  const error = errorParam
    ? ERROR_MESSAGES[errorParam] || `Authentication error: ${errorParam}`
    : null;

  useEffect(() => {
    if (error || isLoading) return;

    if (isAuthenticated) {
      // Check for pending org invitation (query param first,
      // sessionStorage fallback for browsers that stripped the
      // query param during the OAuth round-trip)
      const orgInviteToken =
        searchParams.get("orgInviteToken") ||
        sessionStorage.getItem("pendingOrgInviteToken");
      if (orgInviteToken) {
        sessionStorage.removeItem("pendingOrgInviteToken");
        navigate(`/org-invite/${orgInviteToken}`, { replace: true });
        return;
      }

      const target = user?.workspaceId ? "/" : "/onboarding";
      navigate(target, { replace: true });
    } else {
      // Session cookie was expected but auth check found nothing —
      // redirect to sign-in to restart the flow
      navigate("/auth/sign-in", { replace: true });
    }
  }, [
    error,
    isLoading,
    isAuthenticated,
    user?.workspaceId,
    navigate,
    searchParams,
  ]);

  if (error) {
    return (
      <AuthPageWrapper>
        <AuthPageHeader
          Icon={AlertCircle}
          title="Authentication Error"
          variant="destructive"
        />
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button
            className="w-full"
            onClick={() => navigate("/auth/sign-in", { replace: true })}
          >
            Return to Sign In
          </Button>
        </CardContent>
      </AuthPageWrapper>
    );
  }

  return <PageLoader />;
};

export default SSOCallback;
