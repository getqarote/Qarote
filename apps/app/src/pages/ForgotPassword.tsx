import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { Loader2 } from "lucide-react";

import { logger } from "@/lib/logger";

import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { useRequestPasswordReset } from "@/hooks/queries/useProfile";

/**
 * Forgot-password — prototype split layout (form left, night topology panel
 * right). States: default · loading · sent (anti-enumeration — the same
 * neutral message whether or not the account exists) · error (inline,
 * aria-live). Wiring unchanged: {@link useRequestPasswordReset}.
 */
const ForgotPassword = () => {
  const { t } = useTranslation("auth");
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const resetMutation = useRequestPasswordReset({
    onSuccess: () => setSent(true),
    onError: (error: Error) =>
      logger.error("Password reset request error:", error),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) return;
    resetMutation.mutate({ email: email.trim() });
  };

  const backToSignIn = (
    <p className="mt-6 border-t pt-5 text-center text-sm text-muted-foreground">
      <Link
        to="/auth/sign-in"
        className="font-medium text-primary underline-offset-2 hover:underline"
      >
        {t("backToSignIn")}
      </Link>
    </p>
  );

  return (
    <AuthSplitLayout
      header={
        <div className="mb-6">
          <p className="mb-3 select-none font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-primary">
            {t("panelEyebrow")}
          </p>
          <h1 className="font-heading text-[clamp(26px,3vw,32px)] font-bold leading-[1.15] tracking-tight">
            {sent ? t("checkYourEmail") : t("forgotPasswordTitle")}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {sent
              ? t("resetLinkSentNeutral", { email })
              : t("forgotPasswordDescription")}
          </p>
        </div>
      }
    >
      {sent ? (
        <div className="space-y-4">
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full"
            onClick={() => resetMutation.mutate({ email })}
            disabled={resetMutation.isPending}
          >
            {resetMutation.isPending && (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            )}
            {t("resendEmail")}
          </Button>
          {backToSignIn}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {resetMutation.isError && (
            <Alert variant="destructive" aria-live="assertive">
              <AlertDescription>{t("failedSendResetEmail")}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">{t("emailAddress")}</Label>
            <Input
              id="email"
              type="email"
              placeholder={t("enterEmailAddress")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={resetMutation.isPending}
              required
              autoComplete="username"
            />
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
                ? t("sendingResetLink")
                : t("sendResetLink")}
              {!resetMutation.isPending && (
                <span
                  className="-translate-x-1 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100"
                  aria-hidden="true"
                >
                  →
                </span>
              )}
            </span>
          </Button>

          {backToSignIn}
        </form>
      )}
    </AuthSplitLayout>
  );
};

export default ForgotPassword;
