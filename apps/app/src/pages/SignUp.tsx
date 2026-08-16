import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useNavigate } from "react-router";

import { zodResolver } from "@hookform/resolvers/zod";

import { track } from "@/lib/analytics";
import { trackSignUp } from "@/lib/ga";
import { logger } from "@/lib/logger";

import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import { GoogleLoginButton } from "@/components/auth/GoogleLoginButton";
import { PasswordStrengthMeter } from "@/components/auth/PasswordStrengthMeter";
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

import { useAuth } from "@/contexts/AuthContextDefinition";

import { usePublicConfig } from "@/hooks/queries/usePublicConfig";
import { useShowAlternativeAuth } from "@/hooks/queries/useSsoConfig";
import { useRegister } from "@/hooks/ui/useAuth";

import { type SignUpFormData, signUpSchema } from "@/schemas";

/**
 * Lightweight sign-up — OAuth-first, then a minimal email + password form.
 *
 * Three render states:
 *   1. Registration disabled — warning alert with "Go to sign-in" fallback
 *   2. Success — success alert with "Go to sign-in" CTA
 *   3. Form mode — OAuth buttons, then email + password + Turnstile
 *
 * Friction removed vs. the old form: first/last name (→ onboarding / OAuth),
 * confirm-password (→ reveal toggle + email reset), the always-on 5-bullet
 * requirement list (→ inline strength bar + focus-revealed unmet rules), the
 * "where did you hear" attribution block (→ onboarding), and the duplicate
 * legal mention (→ a single passive notice under the CTA). First-touch
 * UTM/referrer/landing attribution from the URL is still forwarded.
 */
const SignUp = () => {
  const { t } = useTranslation("auth");
  const { isAuthenticated } = useAuth();
  const registerMutation = useRegister();
  const location = useLocation();
  const navigate = useNavigate();
  const { showAlternativeAuth } = useShowAlternativeAuth();
  const { data: publicConfig } = usePublicConfig();

  const from = location.state?.from?.pathname || "/";
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [captchaKey, setCaptchaKey] = useState(0);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const form = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { email: "", password: "" },
  });

  // eslint-disable-next-line react-hooks/incompatible-library
  const passwordValue = form.watch("password");

  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  useEffect(() => {
    if (registerMutation.isSuccess && registerMutation.data) {
      trackSignUp({
        method: "email",
        email: registerMutation.data.email,
      });
    }
  }, [registerMutation.isSuccess, registerMutation.data]);

  const onSubmit = (data: SignUpFormData) => {
    // Forward UTM/referrer/landing first-touch attribution from the URL
    // (set by apps/web AuthButtons) so the backend can $set_once them on
    // the new PostHog person.
    const search = new URLSearchParams(location.search);
    registerMutation.mutate(
      {
        email: data.email,
        password: data.password,
        initialUtmSource: search.get("utm_source") || undefined,
        initialUtmMedium: search.get("utm_medium") || undefined,
        initialUtmCampaign: search.get("utm_campaign") || undefined,
        initialUtmTerm: search.get("utm_term") || undefined,
        initialUtmContent: search.get("utm_content") || undefined,
        initialReferrer: search.get("referrer") || undefined,
        initialLandingPage: search.get("landing") || undefined,
        turnstileToken: turnstileToken ?? undefined,
      },
      {
        onSuccess: () => {
          try {
            track("user_signed_up", { method: "email" });
          } catch {
            // non-blocking analytics
          }
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

  const isDisabled = publicConfig?.registrationEnabled === false;
  const isSuccess = registerMutation.isSuccess;

  return (
    <AuthSplitLayout
      header={
        <div className="mb-6">
          <p className="mb-3 select-none font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-primary">
            {t("panelEyebrow")}
          </p>
          <h1 className="font-heading text-[clamp(26px,3vw,32px)] font-bold leading-[1.15] tracking-tight">
            {t("getStarted")}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {t("createAccountDescription")}
          </p>
        </div>
      }
    >
      {isDisabled ? (
        <RegistrationDisabledAlert
          onGoToSignIn={() => navigate("/auth/sign-in")}
        />
      ) : isSuccess ? (
        <RegistrationSuccessAlert
          autoVerified={registerMutation.data?.autoVerified ?? false}
          onGoToSignIn={() => navigate("/auth/sign-in")}
        />
      ) : (
        <>
          {/* ── OAuth first — the fastest path to an account ── */}
          {showAlternativeAuth && (
            <>
              <div className="space-y-2">
                <GoogleLoginButton
                  mode="signup"
                  onError={(error) =>
                    logger.error("Google signup error:", error)
                  }
                />
                <SSOLoginButton
                  mode="signup"
                  onError={(error) => logger.error("SSO signup error:", error)}
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
              {registerMutation.isError && (
                <Alert variant="destructive" aria-live="assertive">
                  <AlertDescription>
                    {registerMutation.error instanceof Error
                      ? registerMutation.error.message
                      : t("failedCreateAccount")}
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
                        placeholder={t("emailPlaceholder")}
                        disabled={registerMutation.isPending}
                        autoComplete="username"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* ── Password + inline strength bar ── */}
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("password")}</FormLabel>
                    <FormControl>
                      <PasswordInput
                        placeholder={t("createAPassword")}
                        disabled={registerMutation.isPending}
                        autoComplete="new-password"
                        {...field}
                        onFocus={() => setPasswordFocused(true)}
                        onBlur={() => {
                          field.onBlur();
                          setPasswordFocused(false);
                        }}
                      />
                    </FormControl>
                    <PasswordStrengthMeter
                      password={passwordValue || ""}
                      showRules={passwordFocused}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* ── Turnstile CAPTCHA — gates the CTA ── */}
              {turnstileEnabled && (
                <div className="space-y-1.5">
                  <TurnstileCaptcha
                    key={captchaKey}
                    onVerify={setTurnstileToken}
                    onExpire={() => setTurnstileToken(null)}
                    onError={() => setTurnstileToken(null)}
                  />
                  {!turnstileToken && (
                    <p
                      aria-live="polite"
                      className="text-center text-xs text-muted-foreground"
                    >
                      {t("turnstileWaiting")}
                    </p>
                  )}
                </div>
              )}

              {/* ── Submit ── */}
              <div>
                <Button
                  type="submit"
                  className="btn-primary group h-11 w-full"
                  disabled={
                    registerMutation.isPending ||
                    (turnstileEnabled && !turnstileToken)
                  }
                >
                  <span className="flex items-center justify-center gap-1.5">
                    {registerMutation.isPending
                      ? t("creatingAccount")
                      : turnstileEnabled && !turnstileToken
                        ? t("turnstileWaitingShort")
                        : t("createAccountButton")}
                    {!registerMutation.isPending &&
                      !(turnstileEnabled && !turnstileToken) && (
                        <span
                          className="-translate-x-1 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100"
                          aria-hidden="true"
                        >
                          →
                        </span>
                      )}
                  </span>
                </Button>
                <p className="mt-2 text-center font-mono text-xs text-muted-foreground">
                  {t("noCreditCard")}
                </p>
              </div>

              {/* ── Single passive legal notice (replaces the checkbox) ── */}
              <p className="text-center text-xs leading-relaxed text-muted-foreground">
                {t("socialAuthTermsNotice")}{" "}
                <a
                  href={`${import.meta.env.VITE_WEB_BASE_URL}/terms-of-service/`}
                  className="underline underline-offset-2 transition-colors hover:text-foreground"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t("common:termsOfService")}
                </a>{" "}
                {t("andThe")}{" "}
                <a
                  href={`${import.meta.env.VITE_WEB_BASE_URL}/privacy-policy/`}
                  className="underline underline-offset-2 transition-colors hover:text-foreground"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t("common:privacyPolicy")}
                </a>
                .
              </p>
            </form>
          </Form>
        </>
      )}

      {/* ── Sign-in footer ── */}
      {!isSuccess && (
        <p className="mt-6 border-t pt-5 text-center text-sm text-muted-foreground">
          {t("alreadyHaveAccount")}{" "}
          <Link
            to="/auth/sign-in"
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            {t("signIn")}
          </Link>
        </p>
      )}
    </AuthSplitLayout>
  );
};

// ── Alert sub-components ──────────────────────────────────────────────────────

function RegistrationDisabledAlert({
  onGoToSignIn,
}: {
  onGoToSignIn: () => void;
}) {
  const { t } = useTranslation("auth");
  return (
    <Alert className="border-warning/30 bg-warning-muted">
      <AlertDescription className="text-warning">
        <div className="mb-2 font-medium">{t("registrationDisabled")}</div>
        <p className="mb-3 text-sm">{t("registrationDisabledDescription")}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={onGoToSignIn}
          className="border-warning/40 text-warning hover:bg-warning-muted"
        >
          {t("goToSignIn")}
        </Button>
      </AlertDescription>
    </Alert>
  );
}

function RegistrationSuccessAlert({
  autoVerified,
  onGoToSignIn,
}: {
  autoVerified: boolean;
  onGoToSignIn: () => void;
}) {
  const { t } = useTranslation("auth");
  return (
    <Alert className="border-success/30 bg-success-muted">
      <AlertDescription className="text-success">
        <div className="mb-2 font-medium">{t("accountCreatedSuccess")}</div>
        <p className="mb-3 text-sm">
          {autoVerified ? t("accountReadySignIn") : t("verificationEmailSent")}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={onGoToSignIn}
          className="border-success/40 text-success hover:bg-success-muted"
        >
          {t("goToSignIn")}
        </Button>
      </AlertDescription>
    </Alert>
  );
}

export default SignUp;
