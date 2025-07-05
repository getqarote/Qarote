import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, Lock, Check, X, Shield } from "lucide-react";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import type { PasswordReset } from "@/lib/api/passwordClient";

export const ResetPassword: React.FC = () => {
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
      toast.error("Invalid reset link");
      navigate("/auth/sign-in");
    }
  }, [token, navigate]);

  const resetPasswordMutation = useMutation({
    mutationFn: (data: PasswordReset) => apiClient.resetPassword(data),
    onSuccess: () => {
      setResetSuccess(true);
      toast.success(
        "Password reset successfully! You can now sign in with your new password."
      );
    },
    onError: (error: Error) => {
      console.error("Password reset error:", error);
      toast.error(
        "Failed to reset password. The link may be expired or invalid."
      );
    },
  });

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters long";
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
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
      { test: password.length >= 8, label: "At least 8 characters" },
      { test: /[A-Z]/.test(password), label: "One uppercase letter" },
      { test: /[a-z]/.test(password), label: "One lowercase letter" },
      { test: /\d/.test(password), label: "One number" },
      {
        test: /[!@#$%^&*(),.?":{}|<>]/.test(password),
        label: "One special character",
      },
    ];

    return checks;
  };

  if (resetSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <Check className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle className="text-2xl">
              Password Reset Successful!
            </CardTitle>
            <CardDescription>
              Your password has been successfully reset. You can now sign in
              with your new password.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => navigate("/auth/sign-in")}
              className="w-full"
            >
              Continue to Sign In
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl flex items-center justify-center gap-2">
            <Lock className="h-6 w-6" />
            Reset Your Password
          </CardTitle>
          <CardDescription>Enter your new password below</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* New Password */}
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPasswords.password ? "text" : "password"}
                  placeholder="Enter your new password"
                  value={formData.password}
                  onChange={(e) =>
                    handleInputChange("password", e.target.value)
                  }
                  className={errors.password ? "border-red-500" : ""}
                  disabled={resetPasswordMutation.isPending}
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
                <p className="text-sm text-red-500">{errors.password}</p>
              )}
            </div>

            {/* Password Strength Indicator */}
            {formData.password && (
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">
                  Password Requirements
                </Label>
                <div className="space-y-1">
                  {passwordStrength.map((check, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 text-sm"
                    >
                      {check.test ? (
                        <Check className="h-3 w-3 text-green-500" />
                      ) : (
                        <X className="h-3 w-3 text-red-500" />
                      )}
                      <span
                        className={
                          check.test
                            ? "text-green-700"
                            : "text-muted-foreground"
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
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showPasswords.confirm ? "text" : "password"}
                  placeholder="Confirm your new password"
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    handleInputChange("confirmPassword", e.target.value)
                  }
                  className={errors.confirmPassword ? "border-red-500" : ""}
                  disabled={resetPasswordMutation.isPending}
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
                <p className="text-sm text-red-500">{errors.confirmPassword}</p>
              )}
            </div>

            {/* Security Info */}
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                Choose a strong password that you haven't used before on other
                accounts.
              </AlertDescription>
            </Alert>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              disabled={resetPasswordMutation.isPending}
            >
              {resetPasswordMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Resetting Password...
                </>
              ) : (
                "Reset Password"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Remember your password?{" "}
              <Link to="/auth/sign-in" className="text-primary hover:underline">
                Sign in here
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;
