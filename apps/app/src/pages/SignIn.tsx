import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useSearchParams } from "react-router";

import { zodResolver } from "@hookform/resolvers/zod";

import { logger } from "@/lib/logger";

import { AuthPageWrapper } from "@/components/auth/AuthPageWrapper";
import { GoogleLoginButton } from "@/components/auth/GoogleLoginButton";
import { SSOLoginButton } from "@/components/auth/SSOLoginButton";
import {
  TurnstileCaptcha,
  turnstileEnabled,
} from "@/components/auth/TurnstileCaptcha";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

import { type SignInFormData, signInSchema } from "@/schemas";

/**
 * Sign-in page. Matches the signup page's typographic header treatment:
 * Fragment Mono orange eyebrow → Bricolage Grotesque heading, no icon badge.
 *
 * Delight layer:
 * - Staggered entrance animation (respects prefers-reduced-motion)
 * - Submit button reveals a → arrow on hover
 */
const SignIn = () => {
  const { t } = useTranslation("auth");
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
      import.meta.env.VITE_DEMO_MODE === "true" &&
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
          setCaptchaKey((k) => k + 1);
        },
      }
    );
  };

  return (
    <AuthPageWrapper>
      {/* ── Header — no icon badge ────────────────────────────────── */}
      <CardHeader className="px-8 pt-8 pb-2 space-y-0">
        <p className="si-in si-delay-0 text-[10px] tracking-[0.18em] uppercase text-primary font-medium mb-3 select-none font-mono">
          Qarote
        </p>
        <CardTitle className="si-in si-delay-40 text-[1.65rem] font-bold tracking-tight leading-[1.15] font-heading">
          {t("welcomeBack")}
        </CardTitle>
        <CardDescription className="si-in si-delay-80 text-sm leading-relaxed mt-2">
          {t("enterCredentials")}
        </CardDescription>
      </CardHeader>

      {/* ── Body ─────────────────────────────────────────────────── */}
      <CardContent className="px-8 pb-8 pt-5">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {loginMutation.isError && (
              <Alert variant="destructive" className="si-in">
                <AlertDescription>
                  <SignInErrorMessage
                    error={loginMutation.error}
                    onGoToVerification={() => navigate("/verify-email")}
                  />
                </AlertDescription>
              </Alert>
            )}

            {/* ── Email ── */}
            <div className="si-in si-delay-120">
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
            </div>

            {/* ── Password + forgot link ── */}
            <div className="si-in si-delay-160">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>{t("password")}</FormLabel>
                      <Link
                        to="/forgot-password"
                        className="text-sm text-muted-foreground hover:text-primary transition-colors"
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
            </div>

            {/* ── Turnstile CAPTCHA ── */}
            {turnstileEnabled && (
              <div className="si-in [animation-delay:180ms]">
                <TurnstileCaptcha
                  key={captchaKey}
                  onVerify={setTurnstileToken}
                  onExpire={() => setTurnstileToken(null)}
                  onError={() => setTurnstileToken(null)}
                />
              </div>
            )}

            {/* ── Submit ── */}
            <div className="si-in si-delay-200 pt-1">
              <Button
                type="submit"
                className="w-full btn-primary h-11 group"
                disabled={
                  loginMutation.isPending ||
                  (turnstileEnabled && !turnstileToken)
                }
              >
                <span className="flex items-center justify-center gap-1.5">
                  {loginMutation.isPending ? t("signingIn") : t("signIn")}
                  {!loginMutation.isPending && (
                    <span
                      className="opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200"
                      aria-hidden="true"
                    >
                      →
                    </span>
                  )}
                </span>
              </Button>
            </div>
          </form>
        </Form>

        {/* ── Alternative auth ── */}
        {showAlternativeAuth && (
          <>
            <div className="relative my-6">
              <div
                className="absolute inset-0 flex items-center"
                aria-hidden="true"
              >
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-card px-2 text-muted-foreground">
                  {t("orContinueWith")}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <GoogleLoginButton
                onError={(error) => logger.error("Google login error:", error)}
              />
              <SSOLoginButton
                onError={(error) => logger.error("SSO login error:", error)}
              />
            </div>
          </>
        )}

        {/* ── Create account link ── */}
        {publicConfig?.registrationEnabled === true && (
          <p className="pt-4 text-center text-sm text-muted-foreground">
            {t("or")}{" "}
            <Link
              to="/auth/sign-up"
              className="font-medium text-primary hover:underline underline-offset-2"
            >
              {t("createAccount")}
            </Link>
          </p>
        )}

        {/* ── Legal links ── */}
        <div className="pt-4 flex justify-center gap-4 text-sm text-muted-foreground">
          <Link
            to="/terms-of-service"
            className="hover:text-primary transition-colors"
          >
            {t("common:termsOfService")}
          </Link>
          <Link
            to="/privacy-policy"
            className="hover:text-primary transition-colors"
          >
            {t("common:privacyPolicy")}
          </Link>
        </div>
      </CardContent>
    </AuthPageWrapper>
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
    return <>{t("failedSignIn")}</>;
  }

  const isEmailNotVerified =
    (error as Error & { code?: string }).code === "EMAIL_NOT_VERIFIED" ||
    error.message.includes("Email not verified");

  if (isEmailNotVerified) {
    return (
      <div>
        <div className="font-medium mb-2">{t("emailNotVerified")}</div>
        <p className="text-sm mb-3">{t("emailNotVerifiedDescription")}</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onGoToVerification}
          className="text-destructive border-destructive/30 hover:bg-destructive/10"
        >
          {t("goToVerification")}
        </Button>
      </div>
    );
  }

  return <>{error.message}</>;
}

export default SignIn;
