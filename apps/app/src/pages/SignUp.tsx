import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useNavigate } from "react-router";

import { zodResolver } from "@hookform/resolvers/zod";
import { UserPlus } from "lucide-react";

import { trackSignUp } from "@/lib/ga";
import { logger } from "@/lib/logger";

import { AuthPageHeader } from "@/components/auth/AuthPageHeader";
import { AuthPageWrapper } from "@/components/auth/AuthPageWrapper";
import { GoogleLoginButton } from "@/components/auth/GoogleLoginButton";
import { SSOLoginButton } from "@/components/auth/SSOLoginButton";
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

import { useAuth } from "@/contexts/AuthContextDefinition";

import { usePublicConfig } from "@/hooks/queries/usePublicConfig";
import { useShowAlternativeAuth } from "@/hooks/queries/useSsoConfig";
import { useRegister } from "@/hooks/ui/useAuth";

import { type SignUpFormData, signUpSchema } from "@/schemas";

/**
 * Sign-up page. Adopts the shared `AuthPageWrapper` so the auth
 * flow matches the quiet dashboard aesthetic. Three render states:
 *
 *   1. **Registration disabled** — warning alert with "Go to sign-in"
 *      fallback (self-hosted admins can turn registration off)
 *   2. **Success** — success alert with "Go to sign-in" CTA, plus
 *      a note about email verification if SMTP is configured
 *   3. **Form mode** — the happy path, full registration form with
 *      terms acceptance
 *
 * Alternative auth (Google / SSO) is hidden in the success state
 * because re-offering it after account creation is confusing.
 */
const SignUp = () => {
  const { t } = useTranslation("auth");
  const { isAuthenticated } = useAuth();
  const registerMutation = useRegister();
  const location = useLocation();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { showAlternativeAuth } = useShowAlternativeAuth();
  const { data: publicConfig } = usePublicConfig();

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

  // Redirect if already authenticated (shouldn't normally happen on
  // the signup page, but handles the deep-link case)
  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  // Track successful sign-ups with GA
  useEffect(() => {
    if (registerMutation.isSuccess && registerMutation.data) {
      trackSignUp({
        method: "email",
        email: registerMutation.data.email,
      });
    }
  }, [registerMutation.isSuccess, registerMutation.data]);

  const onSubmit = (data: SignUpFormData) => {
    registerMutation.mutate({
      email: data.email,
      password: data.password,
      firstName: data.firstName,
      lastName: data.lastName,
      acceptTerms: data.acceptTerms,
    });
  };

  const isDisabled = publicConfig?.registrationEnabled === false;
  const isSuccess = registerMutation.isSuccess;

  return (
    <AuthPageWrapper>
      <AuthPageHeader
        Icon={UserPlus}
        title={t("getStarted")}
        description={t("createAccountDescription")}
      />

      <CardContent className="space-y-4">
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
                          className="font-medium text-primary hover:underline underline-offset-2"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {t("common:termsOfService")}
                        </Link>{" "}
                        {t("andThe")}{" "}
                        <Link
                          to="/privacy-policy"
                          className="font-medium text-primary hover:underline underline-offset-2"
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
                className="w-full"
                disabled={registerMutation.isPending || !form.formState.isValid}
              >
                {registerMutation.isPending
                  ? t("creatingAccount")
                  : t("createAccountButton")}
              </Button>
            </form>
          </Form>
        )}

        {!isDisabled && !isSuccess && showAlternativeAuth && (
          <>
            <div className="relative my-6">
              <div
                className="absolute inset-0 flex items-center"
                aria-hidden="true"
              >
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  {t("orContinueWith")}
                </span>
              </div>
            </div>

            <GoogleLoginButton
              mode="signup"
              onError={(error) => logger.error("Google signup error:", error)}
            />
            <div className="mt-2" />
            <SSOLoginButton
              mode="signup"
              onError={(error) => logger.error("SSO signup error:", error)}
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
      </CardContent>
    </AuthPageWrapper>
  );
};

/**
 * Rendered when `registrationEnabled` is false. Self-hosted admins
 * can disable public registration; this state explains the state
 * and funnels the user to sign-in instead.
 */
function RegistrationDisabledAlert({
  onGoToSignIn,
}: {
  onGoToSignIn: () => void;
}) {
  const { t } = useTranslation("auth");
  return (
    <Alert className="border-warning/30 bg-warning-muted">
      <AlertDescription className="text-warning">
        <div className="font-medium mb-2">{t("registrationDisabled")}</div>
        <p className="text-sm mb-3">{t("registrationDisabledDescription")}</p>
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

/**
 * Rendered when the account has been created. Shows different copy
 * depending on whether the account was auto-verified (e.g. SSO
 * flows or configs with SMTP disabled that skip the verification
 * email) or still requires email verification.
 */
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
        <div className="font-medium mb-2">{t("accountCreatedSuccess")}</div>
        <p className="text-sm mb-3">
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
