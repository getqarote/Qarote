import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useSearchParams } from "react-router";

import { zodResolver } from "@hookform/resolvers/zod";
import { LogIn } from "lucide-react";

import { logger } from "@/lib/logger";

import { AuthPageHeader } from "@/components/auth/AuthPageHeader";
import { AuthPageWrapper } from "@/components/auth/AuthPageWrapper";
import { GoogleLoginButton } from "@/components/auth/GoogleLoginButton";
import { SSOLoginButton } from "@/components/auth/SSOLoginButton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
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
 * Sign-in page. Adopts the shared `AuthPageWrapper` so the auth flow
 * matches the quiet dashboard aesthetic (no glassmorphism, no
 * `text-white` hero against a dark background, no marketing-loud
 * drop shadows). The design context explicitly calls out
 * glassmorphism as anti-reference #1 — SignIn used to break that.
 *
 * Structure: `AuthPageHeader` for the icon badge + title + subtitle,
 * then `CardContent` for the form, alternative auth buttons,
 * forgot-password link, and legal links.
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
      { email: data.email, password: data.password },
      {
        onSuccess: () => {
          navigate(redirectTo || "/onboarding", { replace: true });
        },
      }
    );
  };

  return (
    <AuthPageWrapper>
      <AuthPageHeader
        Icon={LogIn}
        title={t("welcomeBack")}
        description={t("enterCredentials")}
      />

      <CardContent className="space-y-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {loginMutation.isError && (
              <Alert variant="destructive">
                <AlertDescription>
                  <SignInErrorMessage
                    error={loginMutation.error}
                    onGoToVerification={() => navigate("/verify-email")}
                  />
                </AlertDescription>
              </Alert>
            )}

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

            <Button
              type="submit"
              className="w-full btn-primary"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? t("signingIn") : t("signIn")}
            </Button>
          </form>
        </Form>

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

        {publicConfig?.registrationEnabled === true && (
          <div className="pt-2 text-center text-sm text-muted-foreground">
            {t("or")}{" "}
            <Link
              to="/auth/sign-up"
              className="font-medium text-primary hover:underline underline-offset-2"
            >
              {t("createAccount")}
            </Link>
          </div>
        )}

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

  if (error.message.includes("Email not verified")) {
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
