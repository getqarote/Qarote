import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router";

import { zodResolver } from "@hookform/resolvers/zod";

import { logger } from "@/lib/logger";

import { AuthPageHeader } from "@/components/auth/AuthPageHeader";
import { AuthPageWrapper } from "@/components/auth/AuthPageWrapper";
import { GoogleLoginButton } from "@/components/auth/GoogleLoginButton";
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
import { PixelLogin } from "@/components/ui/pixel-login";

import { useLogin } from "@/hooks/ui/useAuth";

import { type SignInFormData, signInSchema } from "@/schemas";

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
    <AuthPageWrapper>
      <AuthPageHeader
        Icon={PixelLogin}
        title={t("welcomeBack")}
        description={t("enterCredentials")}
      />

      <CardContent className="space-y-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {loginMutation.isError && (
              <Alert variant="destructive">
                <AlertDescription>
                  <LoginErrorMessage
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

        <GoogleLoginButton
          onError={(error) => logger.error("Google login error:", error)}
        />

        <div className="pt-2 text-center text-sm text-muted-foreground">
          {t("or")}{" "}
          <Link
            to="/auth/sign-up"
            className="font-medium text-primary hover:underline underline-offset-2"
          >
            {t("createAccount")}
          </Link>
        </div>

        <div className="pt-4 flex justify-center gap-4 text-sm text-muted-foreground">
          <Link
            to="/terms-of-service"
            className="hover:text-primary transition-colors"
          >
            {tCommon("termsOfService")}
          </Link>
          <Link
            to="/privacy-policy"
            className="hover:text-primary transition-colors"
          >
            {tCommon("privacyPolicy")}
          </Link>
        </div>
      </CardContent>
    </AuthPageWrapper>
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

export default Login;
