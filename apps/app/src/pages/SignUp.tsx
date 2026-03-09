import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useNavigate } from "react-router";

import { zodResolver } from "@hookform/resolvers/zod";

import { trackSignUp } from "@/lib/ga";
import { logger } from "@/lib/logger";

import { GoogleLoginButton } from "@/components/auth/GoogleLoginButton";
import { SSOLoginButton } from "@/components/auth/SSOLoginButton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

import { useAuth } from "@/contexts/AuthContextDefinition";

import { usePublicConfig } from "@/hooks/queries/usePublicConfig";
import { useShowAlternativeAuth } from "@/hooks/queries/useSsoConfig";
import { useRegister } from "@/hooks/ui/useAuth";

import { type SignUpFormData, signUpSchema } from "@/schemas";

const SignUp: React.FC = () => {
  const { t } = useTranslation("auth");
  const { isAuthenticated } = useAuth();
  const registerMutation = useRegister();
  const location = useLocation();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { showAlternativeAuth } = useShowAlternativeAuth();
  const { data: publicConfig } = usePublicConfig();

  // Get the page the user was trying to access
  const from = location.state?.from?.pathname || "/";

  // Initialize form with react-hook-form
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

  // Only redirect if user is already authenticated (shouldn't happen on signup page)
  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  // Track sign up event with Google Analytics
  useEffect(() => {
    if (registerMutation.isSuccess && registerMutation.data) {
      trackSignUp({
        method: "email",
        email: registerMutation.data.email,
      });
    }
  }, [registerMutation.isSuccess, registerMutation.data]);

  const onSubmit = (data: SignUpFormData) => {
    const userData = {
      email: data.email,
      password: data.password,
      firstName: data.firstName,
      lastName: data.lastName,
      acceptTerms: data.acceptTerms,
    };

    registerMutation.mutate(userData);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-auth py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-white">
            {t("createYourAccount")}
          </h2>
          <p className="mt-2 text-sm text-orange-100">
            {t("or")}{" "}
            <Link
              to="/auth/sign-in"
              className="font-medium text-orange-300 hover:text-orange-200 transition-colors"
            >
              {t("signInToExisting")}
            </Link>
          </p>
        </div>

        <Card className="bg-card/95 backdrop-blur-xs border-border/20 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-card-foreground">
              {t("getStarted")}
            </CardTitle>
            <CardDescription>{t("createAccountDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            {publicConfig?.registrationEnabled === false ? (
              <Alert className="border-amber-200 bg-amber-50">
                <AlertDescription className="text-amber-800">
                  <div className="font-medium mb-2">
                    {t("registrationDisabled")}
                  </div>
                  <p className="text-sm mb-3">
                    {t("registrationDisabledDescription")}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("/auth/sign-in")}
                    className="bg-white border-amber-300 text-amber-700 hover:bg-amber-100"
                  >
                    {t("goToSignIn")}
                  </Button>
                </AlertDescription>
              </Alert>
            ) : registerMutation.isSuccess ? (
              <Alert className="border-green-200 bg-green-50">
                <AlertDescription className="text-green-800">
                  <div className="font-medium mb-2">
                    {t("accountCreatedSuccess")}
                  </div>
                  <p className="text-sm mb-3">
                    {registerMutation.data?.autoVerified
                      ? t("accountReadySignIn")
                      : t("verificationEmailSent")}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate("/auth/sign-in")}
                      className="bg-white border-green-300 text-green-700 hover:bg-green-100"
                    >
                      {t("goToSignIn")}
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            ) : (
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4"
                >
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
                            showPassword={showPassword}
                            onToggleVisibility={() =>
                              setShowPassword(!showPassword)
                            }
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
                            showPassword={showConfirmPassword}
                            onToggleVisibility={() =>
                              setShowConfirmPassword(!showConfirmPassword)
                            }
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
                              className="font-medium text-orange-600 hover:text-orange-500 underline"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {t("common:termsOfService")}
                            </Link>{" "}
                            {t("andThe")}{" "}
                            <Link
                              to="/privacy-policy"
                              className="font-medium text-orange-600 hover:text-orange-500 underline"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {t("common:privacyPolicy")}
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
                    className="w-full bg-gradient-button hover:bg-gradient-button-hover"
                    disabled={
                      registerMutation.isPending || !form.formState.isValid
                    }
                  >
                    {registerMutation.isPending
                      ? t("creatingAccount")
                      : t("createAccountButton")}
                  </Button>
                </form>
              </Form>
            )}

            {/* Only show alternative auth if available and account creation hasn't succeeded */}
            {!registerMutation.isSuccess && showAlternativeAuth && (
              <>
                {/* Divider */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">
                      {t("orContinueWith")}
                    </span>
                  </div>
                </div>

                {/* Google Sign Up */}
                <GoogleLoginButton
                  mode="signup"
                  onError={(error) => {
                    logger.error("Google signup error:", error);
                  }}
                />

                {/* SSO Sign Up */}
                <SSOLoginButton
                  mode="signup"
                  onError={(error) => {
                    logger.error("SSO signup error:", error);
                  }}
                />
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SignUp;
