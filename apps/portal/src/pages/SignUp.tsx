import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useNavigate } from "react-router";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";

import { track } from "@/lib/analytics";
import { logger } from "@/lib/logger";

import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import { GoogleLoginButton } from "@/components/auth/GoogleLoginButton";
import { PasswordStrengthMeter } from "@/components/auth/PasswordStrengthMeter";
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

import { useAuth } from "@/contexts/AuthContext";

import { useRegister } from "@/hooks/ui/useAuth";

import { type SignUpFormData, signUpSchema } from "@/schemas";

const WEB_BASE_URL = import.meta.env.VITE_WEB_BASE_URL || "https://qarote.io";

/**
 * Portal sign-up — prototype split layout (form left, night brand panel right),
 * matching the app's redesigned OAuth-first auth.
 *
 * Lightweight form: email + password only. First/last name are optional at the
 * backend (filled from OAuth or onboarding) and the explicit accept-terms
 * checkbox is replaced by a passive legal notice. Registration wiring is
 * unchanged — {@link useRegister} with `sourceApp: "portal"`, then a "verify
 * your email" success state.
 */
const SignUp = () => {
  const { t } = useTranslation("auth");
  const { isAuthenticated } = useAuth();
  const registerMutation = useRegister();
  const location = useLocation();
  const navigate = useNavigate();
  const [passwordFocused, setPasswordFocused] = useState(false);

  const from = location.state?.from?.pathname || "/";

  const form = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  const onSubmit = (data: SignUpFormData) => {
    // Forward first-touch attribution from the URL (set by apps/web
    // AuthButtons) so the backend can attribute the new sign-up.
    const search = new URLSearchParams(location.search);
    registerMutation.mutate(
      {
        email: data.email,
        password: data.password,
        sourceApp: "portal" as const,
        initialUtmSource: search.get("utm_source") || undefined,
        initialUtmMedium: search.get("utm_medium") || undefined,
        initialUtmCampaign: search.get("utm_campaign") || undefined,
        initialUtmTerm: search.get("utm_term") || undefined,
        initialUtmContent: search.get("utm_content") || undefined,
        initialReferrer: search.get("referrer") || undefined,
        initialLandingPage: search.get("landing") || undefined,
      },
      {
        onSuccess: () => {
          track("user_signed_up", { method: "password" });
        },
      }
    );
  };

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
      {isSuccess ? (
        <Alert className="border-success/30 bg-success-muted">
          <AlertDescription className="text-success">
            <div className="mb-2 font-medium">{t("accountCreatedSuccess")}</div>
            <p className="mb-3 text-sm">{t("verificationEmailSent")}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/auth/sign-in")}
              className="border-success/40 text-success hover:bg-success-muted"
            >
              {t("goToSignIn")}
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
        <>
          {/* ── OAuth first ── */}
          <GoogleLoginButton
            mode="signup"
            onError={(error) => logger.error("Google signup error:", error)}
          />

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

              {/* ── Password + inline strength meter ── */}
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
                        onBlur={() => setPasswordFocused(false)}
                      />
                    </FormControl>
                    <PasswordStrengthMeter
                      password={field.value || ""}
                      showRules={passwordFocused}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* ── Submit ── */}
              <Button
                type="submit"
                className="btn-primary group h-11 w-full"
                disabled={registerMutation.isPending}
              >
                <span className="flex items-center justify-center gap-1.5">
                  {registerMutation.isPending && (
                    <Loader2
                      className="h-4 w-4 animate-spin"
                      aria-hidden="true"
                    />
                  )}
                  {registerMutation.isPending
                    ? t("creatingAccount")
                    : t("createAccountButton")}
                  {!registerMutation.isPending && (
                    <span
                      className="-translate-x-1 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100"
                      aria-hidden="true"
                    >
                      →
                    </span>
                  )}
                </span>
              </Button>

              <p className="text-center font-mono text-xs text-muted-foreground">
                {t("noCreditCard")}
              </p>
            </form>
          </Form>

          {/* ── Passive legal notice (replaces the accept-terms checkbox) ── */}
          <p className="mt-5 text-center text-xs leading-relaxed text-muted-foreground">
            {t("socialAuthTermsNotice")}{" "}
            <a
              href={`${WEB_BASE_URL}/terms-of-service/`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline-offset-2 hover:underline"
            >
              {t("common:termsOfService")}
            </a>{" "}
            {t("andThe")}{" "}
            <a
              href={`${WEB_BASE_URL}/privacy-policy/`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline-offset-2 hover:underline"
            >
              {t("common:privacyPolicy")}
            </a>
            .
          </p>

          {/* ── Sign-in footer ── */}
          <p className="mt-6 border-t pt-5 text-center text-sm text-muted-foreground">
            {t("alreadyHaveAccount")}{" "}
            <Link
              to="/auth/sign-in"
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              {t("signIn")}
            </Link>
          </p>
        </>
      )}
    </AuthSplitLayout>
  );
};

export default SignUp;
