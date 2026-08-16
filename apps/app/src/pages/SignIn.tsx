import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useSearchParams } from "react-router";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";

import { logger } from "@/lib/logger";
import { isDemoMode } from "@/lib/runtimeConfig";

import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import { GoogleLoginButton } from "@/components/auth/GoogleLoginButton";
import { SSOLoginButton } from "@/components/auth/SSOLoginButton";
import {
  TurnstileCaptcha,
  turnstileEnabled,
} from "@/components/auth/TurnstileCaptcha";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";

import { usePublicConfig } from "@/hooks/queries/usePublicConfig";
import { useShowAlternativeAuth } from "@/hooks/queries/useSsoConfig";
import { useLogin } from "@/hooks/ui/useAuth";
import { useSessionToast } from "@/hooks/ui/useSessionToast";

import { type SignInFormData, signInSchema } from "@/schemas";

/**
 * Sign-in page — prototype split layout (form left, night brand panel right).
 *
 * Auth wiring is unchanged: better-auth login mutation, Cloudflare Turnstile,
 * Google / SSO, validation, generic error handling, demo auto-login, and
 * redirect handling. Only the surrounding layout is the new split shell.
 */
const SignIn = () => {
  const { t } = useTranslation("auth");
  // Surface (and consume) any toast stashed before a hard-nav to login — e.g.
  // the "account deleted" confirmation. The login screen lives outside the
  // authenticated shell, so it must read the stash itself.
  useSessionToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const rawRedirect = searchParams.get("redirect");
  // Only allow relative paths to prevent open redirect
  const redirectTo =
    rawRedirect?.startsWith("/") && !rawRedirect.startsWith("//")
      ? rawRedirect
      : null;
  const loginMutation = useLogin();
  const { showAlternativeAuth } = useShowAlternativeAuth();
  const { data: publicConfig } = usePublicConfig();

  const demoAutoLoginAttempted = useRef(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  // Whether Turnstile has surfaced an interactive challenge. In managed mode
  // the widget is invisible for low-risk logins; we only announce/show it when
  // Cloudflare actually requires interaction.
  const [challengeVisible, setChallengeVisible] = useState(false);
  // Incrementing this key forces the Turnstile widget to remount and issue a
  // fresh challenge after a failed login attempt (Cloudflare tokens are single-use).
  const [captchaKey, setCaptchaKey] = useState(0);

  const form = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Auto-login in demo mode so the public demo lands users straight
  // in the dashboard instead of forcing them to type credentials.
  useEffect(() => {
    if (
      isDemoMode() &&
      !demoAutoLoginAttempted.current &&
      !loginMutation.isPending
    ) {
      demoAutoLoginAttempted.current = true;
      loginMutation.mutate(
        { email: "demo@qarote.io", password: "demo-qarote-2026" },
        {
          onSuccess: () =>
            navigate(redirectTo || "/onboarding", { replace: true }),
        }
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = (data: SignInFormData) => {
    logger.info("SignIn form submitted", { email: data.email });
    loginMutation.mutate(
      {
        email: data.email,
        password: data.password,
        turnstileToken: turnstileToken ?? undefined,
      },
      {
        onSuccess: () => {
          navigate(redirectTo || "/onboarding", { replace: true });
        },
        onError: () => {
          // Reset the widget so the user gets a fresh challenge — Turnstile
          // tokens are single-use and the previous one is now consumed.
          setTurnstileToken(null);
          setChallengeVisible(false);
          setCaptchaKey((k) => k + 1);
        },
      }
    );
  };

  return (
    <AuthSplitLayout
      header={
        <div className="mb-6">
          <p className="mb-3 select-none font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-primary">
            {t("panelEyebrow")}
          </p>
          <h1 className="font-heading text-[clamp(26px,3vw,32px)] font-bold leading-[1.15] tracking-tight">
            {t("welcomeBack")}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {t("enterCredentials")}
          </p>
        </div>
      }
    >
      {/* ── OAuth first — mirrors the sign-up layout for visual consistency ── */}
      {showAlternativeAuth && (
        <>
          <div className="space-y-2">
            <GoogleLoginButton
              onError={(error) => logger.error("Google login error:", error)}
            />
            <SSOLoginButton
              onError={(error) => logger.error("SSO login error:", error)}
            />
          </div>

          <div className="relative my-5">
            <div
              className="absolute inset-0 flex items-center"
              aria-hidden="true"
            >
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-background px-2 text-muted-foreground">
                {t("orWithEmail")}
              </span>
            </div>
          </div>
        </>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {loginMutation.isError && (
            <Alert variant="destructive" aria-live="assertive">
              <AlertDescription>
                <SignInErrorMessage
                  error={loginMutation.error}
                  onGoToVerification={() => navigate("/verify-email")}
                />
              </AlertDescription>
            </Alert>
          )}

          {/* ── Email ── */}
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("emailAddress")}</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder={t("enterEmail")}
                    disabled={loginMutation.isPending}
                    autoComplete="username"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* ── Password + forgot link ── */}
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel>{t("password")}</FormLabel>
                  <Link
                    to="/forgot-password"
                    className="text-sm text-muted-foreground transition-colors hover:text-primary"
                  >
                    {t("forgotPassword")}
                  </Link>
                </div>
                <FormControl>
                  <PasswordInput
                    placeholder={t("enterPassword")}
                    disabled={loginMutation.isPending}
                    autoComplete="current-password"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* ── Turnstile CAPTCHA (managed / invisible) ──
              Runs in the background and issues a token silently for low-risk
              logins — no widget, no "verifying" copy. It only becomes visible
              (and announced) if Cloudflare requires an interactive challenge. */}
          {turnstileEnabled && (
            <div className={challengeVisible ? "space-y-1.5" : "sr-only"}>
              <TurnstileCaptcha
                key={captchaKey}
                appearance="interaction-only"
                onVerify={(token) => {
                  setTurnstileToken(token);
                  setChallengeVisible(false);
                }}
                onExpire={() => setTurnstileToken(null)}
                onError={() => {
                  setTurnstileToken(null);
                  setChallengeVisible(false);
                }}
                onBeforeInteractive={() => setChallengeVisible(true)}
                onAfterInteractive={() => setChallengeVisible(false)}
              />
              {challengeVisible && !turnstileToken && (
                <p
                  aria-live="polite"
                  className="text-center text-xs text-muted-foreground"
                >
                  {t("turnstileChallenge")}
                </p>
              )}
            </div>
          )}

          {/* ── Submit ── */}
          <Button
            type="submit"
            className="btn-primary group h-11 w-full"
            disabled={
              loginMutation.isPending || (turnstileEnabled && !turnstileToken)
            }
          >
            <span className="flex items-center justify-center gap-1.5">
              {loginMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              )}
              {loginMutation.isPending ? t("signingIn") : t("signIn")}
              {!loginMutation.isPending && (
                <span
                  className="-translate-x-1 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100"
                  aria-hidden="true"
                >
                  →
                </span>
              )}
            </span>
          </Button>
        </form>
      </Form>

      {/* ── Create account footer ── */}
      {publicConfig?.registrationEnabled === true && (
        <p className="mt-6 border-t pt-5 text-center text-sm text-muted-foreground">
          {t("dontHaveAccount")}{" "}
          <Link
            to="/auth/sign-up"
            className="font-medium text-primary hover:underline underline-offset-2"
          >
            {t("signUp")}
          </Link>
        </p>
      )}

      {/* ── Legal links ── */}
      <div className="flex justify-center gap-4 pt-4 text-sm text-muted-foreground">
        <Link
          to="/terms-of-service"
          className="transition-colors hover:text-primary"
        >
          {t("common:termsOfService")}
        </Link>
        <Link
          to="/privacy-policy"
          className="transition-colors hover:text-primary"
        >
          {t("common:privacyPolicy")}
        </Link>
      </div>
    </AuthSplitLayout>
  );
};

/**
 * Error message rendered inside the sign-in alert. Handles the
 * special "email not verified" case with an inline CTA to the
 * verification flow, and falls back to the generic error message
 * for everything else.
 */
function SignInErrorMessage({
  error,
  onGoToVerification,
}: {
  error: unknown;
  onGoToVerification: () => void;
}) {
  const { t } = useTranslation("auth");

  if (!(error instanceof Error)) {
    return <>{t("invalidCredentials")}</>;
  }

  const code = (error as Error & { code?: string }).code;
  const status = (error as Error & { status?: number }).status;

  const isEmailNotVerified =
    code === "EMAIL_NOT_VERIFIED" ||
    error.message.includes("Email not verified");

  if (isEmailNotVerified) {
    return (
      <div>
        <div className="mb-2 font-medium">{t("emailNotVerified")}</div>
        <p className="mb-3 text-sm">{t("emailNotVerifiedDescription")}</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onGoToVerification}
          className="border-destructive/30 text-destructive hover:bg-destructive/10"
        >
          {t("goToVerification")}
        </Button>
      </div>
    );
  }

  // Rate limit / temporary lock after repeated attempts — show a wait-and-retry
  // message rather than the credential error.
  const isRateLimited =
    status === 429 ||
    code === "TOO_MANY_REQUESTS" ||
    /too many|rate limit|try again later/i.test(error.message);

  if (isRateLimited) {
    return <>{t("tooManyAttempts")}</>;
  }

  // Everything else collapses to one generic message — never reveal whether it
  // was the email or the password (no user enumeration).
  return <>{t("invalidCredentials")}</>;
}

export default SignIn;
