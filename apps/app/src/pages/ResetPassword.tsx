import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useSearchParams } from "react-router";

import { Check, Eye, EyeOff, Loader2, Lock, Shield, X } from "lucide-react";
import { toast } from "sonner";

import { logger } from "@/lib/logger";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { useResetPassword } from "@/hooks/queries/useProfile";

const ResetPassword: React.FC = () => {
  const { t } = useTranslation("auth");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  });
  const [showPasswords, setShowPasswords] = useState({
    password: false,
    confirm: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [resetSuccess, setResetSuccess] = useState(false);

  // Redirect if no token provided
  useEffect(() => {
    if (!token) {
      toast.error(t("invalidResetLink"));
      navigate("/auth/sign-in");
    }
  }, [token, navigate]);

  const resetPasswordMutation = useResetPassword({
    onSuccess: () => {
      setResetSuccess(true);
      toast.success(t("resetSuccessToast"));
    },
    onError: (error) => {
      logger.error("Password reset error:", error);
      toast.error(t("failedResetPassword"));
    },
  });

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.password) {
      newErrors.password = t("passwordIsRequired");
    } else if (formData.password.length < 8) {
      newErrors.password = t("passwordMinLengthError");
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = t("pleaseConfirmPassword");
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = t("passwordsDoNotMatch");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || !token) {
      return;
    }

    resetPasswordMutation.mutate({
      token,
      password: formData.password,
    });
  };

  const togglePasswordVisibility = (field: "password" | "confirm") => {
    setShowPasswords((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: "",
      }));
    }
  };

  // Password strength indicators
  const getPasswordStrength = (password: string) => {
    const checks = [
      { test: password.length >= 8, label: t("passwordMinLength") },
      { test: /[A-Z]/.test(password), label: t("passwordUppercase") },
      { test: /[a-z]/.test(password), label: t("passwordLowercase") },
      { test: /\d/.test(password), label: t("passwordNumber") },
      {
        test: /[!@#$%^&*(),.?":{}|<>]/.test(password),
        label: t("passwordSpecialChar"),
      },
    ];

    return checks;
  };

  if (resetSuccess) {
    return (
      <div className="h-full flex items-center justify-center page-layout p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-success-muted rounded-full flex items-center justify-center mb-4">
              <Check className="h-6 w-6 text-success" />
            </div>
            <CardTitle className="text-2xl">
              {t("resetPasswordSuccessTitle")}
            </CardTitle>
            <CardDescription>
              {t("resetPasswordSuccessDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => navigate("/auth/sign-in")}
              className="w-full bg-primary hover:bg-primary/90"
            >
              {t("continueToSignIn")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!token) {
    return null; // Will redirect in useEffect
  }

  const passwordStrength = getPasswordStrength(formData.password);

  return (
    <div className="h-full flex items-center justify-center page-layout p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl flex items-center justify-center gap-2">
            <Lock className="h-6 w-6" />
            {t("resetPassword")}
          </CardTitle>
          <CardDescription>{t("resetPasswordDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* New Password */}
            <div className="space-y-2">
              <Label htmlFor="password">{t("newPassword")}</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPasswords.password ? "text" : "password"}
                  placeholder={t("enterNewPassword")}
                  value={formData.password}
                  onChange={(e) =>
                    handleInputChange("password", e.target.value)
                  }
                  className={errors.password ? "border-destructive" : ""}
                  disabled={resetPasswordMutation.isPending}
                  autoComplete="new-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => togglePasswordVisibility("password")}
                  disabled={resetPasswordMutation.isPending}
                >
                  {showPasswords.password ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password}</p>
              )}
            </div>

            {/* Password Strength Indicator */}
            {formData.password && (
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">
                  {t("passwordRequirementsLabel")}
                </Label>
                <div className="space-y-1">
                  {passwordStrength.map((check, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 text-sm"
                    >
                      {check.test ? (
                        <Check className="h-3 w-3 text-success" />
                      ) : (
                        <X className="h-3 w-3 text-destructive" />
                      )}
                      <span
                        className={
                          check.test ? "text-success" : "text-muted-foreground"
                        }
                      >
                        {check.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t("confirmNewPassword")}</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showPasswords.confirm ? "text" : "password"}
                  placeholder={t("confirmYourNewPassword")}
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    handleInputChange("confirmPassword", e.target.value)
                  }
                  className={errors.confirmPassword ? "border-destructive" : ""}
                  disabled={resetPasswordMutation.isPending}
                  autoComplete="new-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => togglePasswordVisibility("confirm")}
                  disabled={resetPasswordMutation.isPending}
                >
                  {showPasswords.confirm ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">
                  {errors.confirmPassword}
                </p>
              )}
            </div>

            {/* Security Info */}
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>{t("securityAdvice")}</AlertDescription>
            </Alert>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              disabled={resetPasswordMutation.isPending}
            >
              {resetPasswordMutation.isPending ? (
                <>
                  <Loader2
                    className="h-4 w-4 mr-2 animate-spin"
                    aria-hidden="true"
                  />
                  {t("resettingPassword")}
                </>
              ) : (
                t("resetPasswordButton")
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              {t("rememberPassword")}{" "}
              <Link to="/auth/sign-in" className="text-primary hover:underline">
                {t("signInHere")}
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;
