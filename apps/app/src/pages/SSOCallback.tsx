import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router";

import { Loader2 } from "lucide-react";

import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

import { useAuth } from "@/contexts/AuthContextDefinition";

/**
 * SSO error codes → i18n keys (auth namespace). Unrecognized codes fall back to
 * the generic `ssoErrorGeneric` so the operator still sees the raw code.
 */
const ERROR_KEYS: Record<string, string> = {
  missing_code: "ssoError.missingCode",
  invalid_state: "ssoError.invalidState",
  no_email: "ssoError.noEmail",
  no_subject_id: "ssoError.noSubjectId",
  account_creation_failed: "ssoError.accountCreationFailed",
  account_inactive: "ssoError.accountInactive",
  token_exchange_failed: "ssoError.tokenExchangeFailed",
  authentication_failed: "ssoError.authenticationFailed",
  expired_code: "ssoError.expiredCode",
  email_in_use: "ssoError.emailInUse",
};

/**
 * SSO callback interstitial (prototype split layout). Two states:
 * signing ("Signing you in…" + spinner) and error ("We couldn't complete SSO
 * sign-in" + the specific reason + "Back to sign in"). Redirect logic and the
 * org-invite hand-off are unchanged.
 */
const SSOCallback = () => {
  const { t } = useTranslation("auth");
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, user } = useAuth();
  const errorParam = searchParams.get("error");
  const error = errorParam
    ? ERROR_KEYS[errorParam]
      ? t(ERROR_KEYS[errorParam])
      : t("ssoErrorGeneric", { code: errorParam })
    : null;

  useEffect(() => {
    if (error || isLoading) return;

    if (isAuthenticated) {
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
      <AuthSplitLayout
        header={
          <div className="mb-6">
            <p className="mb-3 select-none font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-primary">
              {t("panelEyebrow")}
            </p>
            <h1 className="font-heading text-[clamp(26px,3vw,32px)] font-bold leading-[1.15] tracking-tight">
              {t("ssoErrorTitle")}
            </h1>
          </div>
        }
      >
        <div className="space-y-4">
          <Alert variant="destructive" aria-live="assertive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button
            className="btn-primary h-11 w-full"
            onClick={() => navigate("/auth/sign-in", { replace: true })}
          >
            {t("backToSignIn")}
          </Button>
        </div>
      </AuthSplitLayout>
    );
  }

  // ── Signing in… ───────────────────────────────────────────────────────────
  return (
    <AuthSplitLayout>
      <div
        className="flex flex-col items-center justify-center gap-3 py-10 text-center"
        role="status"
        aria-live="polite"
      >
        <Loader2
          className="h-7 w-7 animate-spin text-primary"
          aria-hidden="true"
        />
        <p className="text-sm text-muted-foreground">{t("ssoSigningIn")}</p>
      </div>
    </AuthSplitLayout>
  );
};

export default SSOCallback;
