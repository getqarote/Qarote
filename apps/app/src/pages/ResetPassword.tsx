import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useSearchParams } from "react-router";

import { Loader2 } from "lucide-react";

import { logger } from "@/lib/logger";

import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import { PasswordStrengthMeter } from "@/components/auth/PasswordStrengthMeter";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";

import { useResetPassword } from "@/hooks/queries/useProfile";

/**
 * Reset-password — prototype split layout. States: default (new password with
 * reveal + strength meter + confirm) · validation/mismatch · loading · success
 * ("Password updated" → sign in) · invalid/expired token (missing OR rejected
 * token → "Request a new link" to forgot-password). Wiring: {@link useResetPassword}.
 */
const ResetPassword = () => {
  const { t } = useTranslation("auth");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [mismatch, setMismatch] = useState(false);
  const [success, setSuccess] = useState(false);
  const [tokenInvalid, setTokenInvalid] = useState(false);

  const resetMutation = useResetPassword({
    onSuccess: () => setSuccess(true),
    onError: (error) => {
      logger.error("Password reset error:", error);
      // A rejected token (expired / already used / malformed) surfaces as the
      // dedicated invalid-token branch; everything else stays inline.
      if (/invalid|expired|token/i.test(error.message)) setTokenInvalid(true);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setTokenInvalid(true);
      return;
    }
    if (password !== confirm) {
      setMismatch(true);
      return;
    }
    setMismatch(false);
    resetMutation.mutate({ token, password });
  };

  const eyebrow = (
    <p className="mb-3 select-none font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-primary">
      {t("panelEyebrow")}
    </p>
  );

  // ── Invalid / expired token ───────────────────────────────────────────────
  if (tokenInvalid || !token) {
    return (
      <AuthSplitLayout
        header={
          <div className="mb-6">
            {eyebrow}
            <h1 className="font-heading text-[clamp(26px,3vw,32px)] font-bold leading-[1.15] tracking-tight">
              {t("resetTokenInvalidTitle")}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {t("resetTokenInvalidDescription")}
            </p>
          </div>
        }
      >
        <div className="space-y-3">
          <Button asChild className="btn-primary h-11 w-full">
            <Link to="/forgot-password">{t("requestNewLink")}</Link>
          </Button>
          <Button asChild variant="ghost" className="h-11 w-full">
            <Link to="/auth/sign-in">{t("backToSignIn")}</Link>
          </Button>
        </div>
      </AuthSplitLayout>
    );
  }

  // ── Success ───────────────────────────────────────────────────────────────
  if (success) {
    return (
      <AuthSplitLayout
        header={
          <div className="mb-6">
            {eyebrow}
            <h1 className="font-heading text-[clamp(26px,3vw,32px)] font-bold leading-[1.15] tracking-tight">
              {t("resetPasswordSuccessTitle")}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {t("resetPasswordSuccessDescription")}
            </p>
          </div>
        }
      >
        <Button
          className="btn-primary h-11 w-full"
          onClick={() => navigate("/auth/sign-in")}
        >
          {t("continueToSignIn")}
        </Button>
      </AuthSplitLayout>
    );
  }

  // ── Default form ──────────────────────────────────────────────────────────
  return (
    <AuthSplitLayout
      header={
        <div className="mb-6">
          {eyebrow}
          <h1 className="font-heading text-[clamp(26px,3vw,32px)] font-bold leading-[1.15] tracking-tight">
            {t("resetPassword")}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {t("resetPasswordDescription")}
          </p>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {resetMutation.isError && !tokenInvalid && (
          <Alert variant="destructive" aria-live="assertive">
            <AlertDescription>{t("failedResetPassword")}</AlertDescription>
          </Alert>
        )}

        {/* New password + strength meter */}
        <div className="space-y-2">
          <Label htmlFor="password">{t("newPassword")}</Label>
          <PasswordInput
            id="password"
            placeholder={t("enterNewPassword")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onFocus={() => setPasswordFocused(true)}
            onBlur={() => setPasswordFocused(false)}
            disabled={resetMutation.isPending}
            autoComplete="new-password"
          />
          <PasswordStrengthMeter
            password={password}
            showRules={passwordFocused}
          />
        </div>

        {/* Confirm */}
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">{t("confirmNewPassword")}</Label>
          <PasswordInput
            id="confirmPassword"
            placeholder={t("confirmYourNewPassword")}
            value={confirm}
            onChange={(e) => {
              setConfirm(e.target.value);
              if (mismatch) setMismatch(false);
            }}
            disabled={resetMutation.isPending}
            autoComplete="new-password"
          />
          {mismatch && (
            <p className="text-sm text-destructive" aria-live="assertive">
              {t("passwordsDoNotMatch")}
            </p>
          )}
        </div>

        <Button
          type="submit"
          className="btn-primary group h-11 w-full"
          disabled={resetMutation.isPending}
        >
          <span className="flex items-center justify-center gap-1.5">
            {resetMutation.isPending && (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            )}
            {resetMutation.isPending
              ? t("resettingPassword")
              : t("resetPasswordButton")}
          </span>
        </Button>

        <p className="mt-6 border-t pt-5 text-center text-sm text-muted-foreground">
          <Link
            to="/auth/sign-in"
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            {t("backToSignIn")}
          </Link>
        </p>
      </form>
    </AuthSplitLayout>
  );
};

export default ResetPassword;
