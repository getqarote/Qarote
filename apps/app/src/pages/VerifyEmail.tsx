import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useSearchParams } from "react-router";

import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { logger } from "@/lib/logger";
import { trpc } from "@/lib/trpc/client";

import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

import { useAuth } from "@/contexts/AuthContextDefinition";

interface VerificationResult {
  success: boolean;
  message?: string;
  type?: string;
  error?: string;
}

const RESEND_COOLDOWN_SECONDS = 30;

// Best-effort "Open inbox" deep links for common providers.
const PROVIDER_INBOX: Record<string, string> = {
  "gmail.com": "https://mail.google.com/",
  "googlemail.com": "https://mail.google.com/",
  "outlook.com": "https://outlook.live.com/mail/",
  "hotmail.com": "https://outlook.live.com/mail/",
  "live.com": "https://outlook.live.com/mail/",
  "yahoo.com": "https://mail.yahoo.com/",
  "icloud.com": "https://www.icloud.com/mail/",
  "proton.me": "https://mail.proton.me/",
  "protonmail.com": "https://mail.proton.me/",
};

const eyebrow = (label: string) => (
  <p className="mb-3 select-none font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-primary">
    {label}
  </p>
);

export default function VerifyEmail() {
  const { t } = useTranslation("auth");
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAuthenticated, user, updateUser } = useAuth();
  const verificationAttempted = useRef(false);
  const token = searchParams.get("token");
  const email = searchParams.get("email") || user?.email || "";

  const [verifying, setVerifying] = useState(!!token);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [cooldown, setCooldown] = useState(0);

  // Resend cooldown countdown.
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const { mutate: verifyEmail } =
    trpc.auth.verification.verifyEmail.useMutation({
      onSuccess: (data) => {
        if (data.user) updateUser(data.user);
        queryClient.invalidateQueries({ queryKey: ["verification-status"] });
        setVerifying(false);
        setResult({ success: true, message: data.message, type: data.type });
        toast.success(t("emailVerifiedToast"));
        setTimeout(() => {
          navigate(isAuthenticated ? "/onboarding" : "/auth/sign-in", {
            replace: true,
          });
        }, 3000);
      },
      onError: (error) => {
        logger.error("Email verification error:", error);
        setVerifying(false);
        setResult({ success: false, error: error.message });
      },
    });

  const resendMutation = trpc.auth.verification.resendVerification.useMutation({
    onSuccess: () => {
      toast.success(t("verificationSentToast"));
      setCooldown(RESEND_COOLDOWN_SECONDS);
    },
    onError: (error) => {
      logger.error("Resend verification error:", error);
      toast.error(error.message || t("failedResendVerification"));
    },
  });

  useEffect(() => {
    if (!token || verificationAttempted.current) return;
    verificationAttempted.current = true;
    verifyEmail({ token });
  }, [token, verifyEmail]);

  const handleResend = () =>
    resendMutation.mutate({ type: "SIGNUP", sourceApp: "app" });

  const inboxUrl = email
    ? PROVIDER_INBOX[email.split("@")[1]?.toLowerCase() ?? ""]
    : undefined;

  const resendButton = (
    <Button
      type="button"
      variant="outline"
      className="h-11 w-full"
      onClick={handleResend}
      disabled={resendMutation.isPending || cooldown > 0}
    >
      {resendMutation.isPending && (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      )}
      {cooldown > 0
        ? t("resendCooldown", { seconds: cooldown })
        : t("resendEmail")}
    </Button>
  );

  // ── Verifying (from-link, loading) ────────────────────────────────────────
  if (verifying) {
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
          <p className="text-sm text-muted-foreground">{t("verifyingEmail")}</p>
        </div>
      </AuthSplitLayout>
    );
  }

  // ── From-link result (success / already-verified / invalid-expired) ───────
  if (result) {
    if (result.success) {
      return (
        <AuthSplitLayout
          header={
            <div className="mb-6">
              {eyebrow(t("panelEyebrow"))}
              <h1 className="font-heading text-[clamp(26px,3vw,32px)] font-bold leading-[1.15] tracking-tight">
                {t("emailVerified")}
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {result.type === "EMAIL_CHANGE"
                  ? t("emailChangeVerified")
                  : t("emailVerifiedSuccess")}
              </p>
            </div>
          }
        >
          <div className="space-y-3">
            <Button
              className="btn-primary h-11 w-full"
              onClick={() =>
                navigate(isAuthenticated ? "/onboarding" : "/auth/sign-in", {
                  replace: true,
                })
              }
            >
              {isAuthenticated ? t("goToDashboard") : t("signInToContinue")}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              {t("redirectingAutomatically")}
            </p>
          </div>
        </AuthSplitLayout>
      );
    }

    // invalid / expired
    return (
      <AuthSplitLayout
        header={
          <div className="mb-6">
            {eyebrow(t("panelEyebrow"))}
            <h1 className="font-heading text-[clamp(26px,3vw,32px)] font-bold leading-[1.15] tracking-tight">
              {t("verificationFailed")}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {t("verifyTokenInvalidDescription")}
            </p>
          </div>
        }
      >
        <div className="space-y-3">
          {result.error && (
            <Alert variant="destructive" aria-live="assertive">
              <AlertDescription>{result.error}</AlertDescription>
            </Alert>
          )}
          {resendButton}
          <Button asChild variant="ghost" className="h-11 w-full">
            <Link to="/auth/sign-in">{t("backToSignIn")}</Link>
          </Button>
        </div>
      </AuthSplitLayout>
    );
  }

  // ── Pending (no token, after signup) ──────────────────────────────────────
  return (
    <AuthSplitLayout
      header={
        <div className="mb-6">
          {eyebrow(t("panelEyebrow"))}
          <h1 className="font-heading text-[clamp(26px,3vw,32px)] font-bold leading-[1.15] tracking-tight">
            {t("verifyEmailPendingTitle")}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {email
              ? t("verifyEmailPendingDescription", { email })
              : t("verifyEmailPendingDescriptionGeneric")}
          </p>
        </div>
      }
    >
      <div className="space-y-3">
        {inboxUrl && (
          <Button asChild className="btn-primary h-11 w-full">
            <a href={inboxUrl} target="_blank" rel="noopener noreferrer">
              {t("openInbox")}
            </a>
          </Button>
        )}
        {resendButton}
        <p className="pt-2 text-center text-sm text-muted-foreground">
          <Link
            to="/auth/sign-up"
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            {t("wrongAddress")}
          </Link>
        </p>
      </div>
    </AuthSplitLayout>
  );
}
