import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";

import { logger } from "@/lib/logger";

import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import { GoogleLoginButton } from "@/components/auth/GoogleLoginButton";
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

import { useLogin } from "@/hooks/ui/useAuth";

import { type SignInFormData, signInSchema } from "@/schemas";

/**
 * Portal sign-in — prototype split layout (form left, night brand panel right),
 * matching the app's redesigned auth. Wiring is unchanged: better-auth login
 * via {@link useLogin}, Google OAuth, and redirect to the licenses dashboard.
 */
const Login = () => {
  const { t } = useTranslation("auth");
  const { t: tCommon } = useTranslation("common");
  const navigate = useNavigate();
  const loginMutation = useLogin();

  const form = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = (data: SignInFormData) => {
    logger.info("Login form submitted");
    loginMutation.mutate(
      { email: data.email, password: data.password },
      {
        onSuccess: () => {
          navigate("/licenses", { replace: true });
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
      <GoogleLoginButton
        onError={(error) => logger.error("Google login error:", error)}
      />

      <div className="relative my-5">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
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
          {loginMutation.isError && (
            <Alert variant="destructive" aria-live="assertive">
              <AlertDescription>
                <LoginErrorMessage
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

          {/* ── Submit ── */}
          <Button
            type="submit"
            className="btn-primary group h-11 w-full"
            disabled={loginMutation.isPending}
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
      <p className="mt-6 border-t pt-5 text-center text-sm text-muted-foreground">
        {t("dontHaveAccount")}{" "}
        <Link
          to="/auth/sign-up"
          className="font-medium text-primary underline-offset-2 hover:underline"
        >
          {t("signUp")}
        </Link>
      </p>

      {/* ── Legal links ── */}
      <div className="flex justify-center gap-4 pt-4 text-sm text-muted-foreground">
        <Link
          to="/terms-of-service"
          className="transition-colors hover:text-primary"
        >
          {tCommon("termsOfService")}
        </Link>
        <Link
          to="/privacy-policy"
          className="transition-colors hover:text-primary"
        >
          {tCommon("privacyPolicy")}
        </Link>
      </div>
    </AuthSplitLayout>
  );
};

function LoginErrorMessage({
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

  return <>{error.message}</>;
}

export default Login;
