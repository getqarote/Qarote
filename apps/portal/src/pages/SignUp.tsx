import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useNavigate } from "react-router";

import { zodResolver } from "@hookform/resolvers/zod";

import { logger } from "@/lib/logger";

import { AuthPageHeader } from "@/components/auth/AuthPageHeader";
import { AuthPageWrapper } from "@/components/auth/AuthPageWrapper";
import { GoogleLoginButton } from "@/components/auth/GoogleLoginButton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { PasswordRequirements } from "@/components/ui/password-requirements";
import { PixelUserPlus } from "@/components/ui/pixel-user-plus";

import { useAuth } from "@/contexts/AuthContext";

import { useRegister } from "@/hooks/ui/useAuth";

import { type SignUpFormData, signUpSchema } from "@/schemas";

const SignUp = () => {
  const { t } = useTranslation("auth");
  const { t: tCommon } = useTranslation("common");
  const { isAuthenticated } = useAuth();
  const registerMutation = useRegister();
  const location = useLocation();
  const navigate = useNavigate();

  const from = location.state?.from?.pathname || "/";

  const form = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
      acceptTerms: false,
    },
  });

  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  const onSubmit = (data: SignUpFormData) => {
    registerMutation.mutate({
      email: data.email,
      password: data.password,
      firstName: data.firstName,
      lastName: data.lastName,
      acceptTerms: data.acceptTerms,
      sourceApp: "portal" as const,
    });
  };

  const isSuccess = registerMutation.isSuccess;

  return (
    <AuthPageWrapper>
      <AuthPageHeader
        Icon={PixelUserPlus}
        title={t("getStarted")}
        description={t("createAccountDescription")}
      />

      <CardContent className="space-y-4">
        {isSuccess ? (
          <Alert className="border-success/30 bg-success-muted">
            <AlertDescription className="text-success">
              <div className="font-medium mb-2">
                {t("accountCreatedSuccess")}
              </div>
              <p className="text-sm mb-3">{t("verificationEmailSent")}</p>
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
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {registerMutation.isError && (
                <Alert variant="destructive">
                  <AlertDescription>
                    {registerMutation.error instanceof Error
                      ? registerMutation.error.message
                      : t("failedCreateAccount")}
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("firstName")}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t("firstNamePlaceholder")}
                          disabled={registerMutation.isPending}
                          autoComplete="given-name"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("lastName")}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t("lastNamePlaceholder")}
                          disabled={registerMutation.isPending}
                          autoComplete="family-name"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

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
                      />
                    </FormControl>
                    <PasswordRequirements
                      password={field.value || ""}
                      className="mt-2"
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("confirmPassword")}</FormLabel>
                    <FormControl>
                      <PasswordInput
                        placeholder={t("confirmYourPassword")}
                        disabled={registerMutation.isPending}
                        autoComplete="new-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="acceptTerms"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={registerMutation.isPending}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-sm font-normal">
                        {t("agreeToTerms")}{" "}
                        <Link
                          to="/terms-of-service"
                          className="font-medium text-primary hover:underline underline-offset-2"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {tCommon("termsOfService")}
                        </Link>{" "}
                        {t("andThe")}{" "}
                        <Link
                          to="/privacy-policy"
                          className="font-medium text-primary hover:underline underline-offset-2"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {tCommon("privacyPolicy")}
                        </Link>
                        .
                      </FormLabel>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full btn-primary"
                disabled={registerMutation.isPending}
              >
                {registerMutation.isPending
                  ? t("creatingAccount")
                  : t("createAccountButton")}
              </Button>
            </form>
          </Form>
        )}

        {!isSuccess && (
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

            <GoogleLoginButton
              mode="signup"
              onError={(error) => logger.error("Google signup error:", error)}
            />
          </>
        )}

        {!isSuccess && (
          <div className="pt-2 text-center text-sm text-muted-foreground">
            {t("or")}{" "}
            <Link
              to="/auth/sign-in"
              className="font-medium text-primary hover:underline underline-offset-2"
            >
              {t("signInToExisting")}
            </Link>
          </div>
        )}

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

export default SignUp;
