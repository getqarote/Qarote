import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router";

import { zodResolver } from "@hookform/resolvers/zod";

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

const SignIn: React.FC = () => {
  const { t } = useTranslation("auth");
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const loginMutation = useLogin();
  const { showAlternativeAuth } = useShowAlternativeAuth();
  const { data: publicConfig } = usePublicConfig();

  // Initialize form with react-hook-form
  const form = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = (data: SignInFormData) => {
    logger.info("SignIn form submitted", { email: data.email });
    loginMutation.mutate({
      email: data.email,
      password: data.password,
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-auth py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-white">
            {t("signInToAccount")}
          </h2>
          {publicConfig?.registrationEnabled === true && (
            <p className="mt-2 text-sm text-orange-100">
              {t("or")}{" "}
              <Link
                to="/auth/sign-up"
                className="font-medium text-orange-300 hover:text-orange-200 transition-colors"
              >
                {t("createAccount")}
              </Link>
            </p>
          )}
        </div>

        <Card className="bg-white/95 backdrop-blur-xs border-white/20 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-gray-900">{t("welcomeBack")}</CardTitle>
            <CardDescription>{t("enterCredentials")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                {loginMutation.isError && (
                  <Alert variant="destructive">
                    <AlertDescription>
                      {(() => {
                        const error = loginMutation.error;
                        if (error instanceof Error) {
                          const message = error.message;
                          if (message.includes("Email not verified")) {
                            return (
                              <div>
                                <div className="font-medium mb-2">
                                  {t("emailNotVerified")}
                                </div>
                                <p className="text-sm mb-3">
                                  {t("emailNotVerifiedDescription")}
                                </p>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => navigate("/verify-email")}
                                  className="bg-white text-red-700 border-red-300 hover:bg-red-50"
                                >
                                  {t("goToVerification")}
                                </Button>
                              </div>
                            );
                          }
                          return message;
                        }
                        return t("failedSignIn");
                      })()}
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
                      <FormLabel>{t("password")}</FormLabel>
                      <FormControl>
                        <PasswordInput
                          placeholder={t("enterPassword")}
                          disabled={loginMutation.isPending}
                          showPassword={showPassword}
                          onToggleVisibility={() =>
                            setShowPassword(!showPassword)
                          }
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
                  className="w-full bg-gradient-button hover:bg-gradient-button-hover"
                  disabled={loginMutation.isPending || !form.formState.isValid}
                >
                  {loginMutation.isPending ? t("signingIn") : t("signIn")}
                </Button>
              </form>
            </Form>

            {showAlternativeAuth && (
              <>
                {/* Divider */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-muted-foreground">
                      {t("orContinueWith")}
                    </span>
                  </div>
                </div>

                {/* Google Login */}
                <GoogleLoginButton
                  onError={(error) => {
                    logger.error("Google login error:", error);
                  }}
                />

                {/* SSO Login */}
                <SSOLoginButton
                  onError={(error) => {
                    logger.error("SSO login error:", error);
                  }}
                />
              </>
            )}

            {/* Forgot Password Link */}
            <div className="mt-4 text-center">
              <Link
                to="/forgot-password"
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                {t("forgotPassword")}
              </Link>
            </div>

            {/* Legal Links */}
            <div className="mt-6 text-center text-sm text-muted-foreground">
              <div className="flex justify-center gap-4 mt-2">
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
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SignIn;
