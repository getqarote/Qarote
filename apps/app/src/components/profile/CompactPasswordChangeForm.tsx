import React, { useState } from "react";

import { Eye, EyeOff, Shield } from "lucide-react";
import { toast } from "sonner";

import { logger } from "@/lib/logger";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CompactPasswordChangeFormProps {
  onPasswordChange: (data: {
    currentPassword: string;
    newPassword: string;
  }) => Promise<void>;
  isLoading?: boolean;
}

export const CompactPasswordChangeForm: React.FC<
  CompactPasswordChangeFormProps
> = ({ onPasswordChange, isLoading = false }) => {
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.currentPassword) {
      newErrors.currentPassword = "Current password is required";
    }

    if (!formData.newPassword) {
      newErrors.newPassword = "New password is required";
    } else if (formData.newPassword.length < 8) {
      newErrors.newPassword = "Password must be at least 8 characters long";
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your new password";
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    if (formData.currentPassword === formData.newPassword) {
      newErrors.newPassword =
        "New password must be different from current password";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      await onPasswordChange({
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
      });

      // Reset form on success
      setFormData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setErrors({});
      toast.success("Password changed successfully");
    } catch (error) {
      logger.error("Password change error:", error);
      // Error handling is done by the parent component
    }
  };

  const togglePasswordVisibility = (field: keyof typeof showPasswords) => {
    setShowPasswords((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  return (
    <div className="flex flex-col h-full">
      <form onSubmit={handleSubmit} className="flex flex-col h-full space-y-4">
        <div className="flex-1 space-y-4">
          {/* Current Password */}
          <div className="space-y-2">
            <Label htmlFor="currentPassword" className="text-sm">
              Current Password
            </Label>
            <div className="relative">
              <Input
                id="currentPassword"
                type={showPasswords.current ? "text" : "password"}
                value={formData.currentPassword}
                onChange={(e) =>
                  setFormData({ ...formData, currentPassword: e.target.value })
                }
                placeholder="Enter current password"
                disabled={isLoading}
                className="pr-10"
                autoComplete="current-password"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => togglePasswordVisibility("current")}
                disabled={isLoading}
              >
                {showPasswords.current ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            {errors.currentPassword && (
              <p className="text-xs text-destructive">
                {errors.currentPassword}
              </p>
            )}
          </div>

          {/* New Password */}
          <div className="space-y-2">
            <Label htmlFor="newPassword" className="text-sm">
              New Password
            </Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showPasswords.new ? "text" : "password"}
                value={formData.newPassword}
                onChange={(e) =>
                  setFormData({ ...formData, newPassword: e.target.value })
                }
                placeholder="Enter new password"
                disabled={isLoading}
                className="pr-10"
                autoComplete="new-password"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => togglePasswordVisibility("new")}
                disabled={isLoading}
              >
                {showPasswords.new ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            {errors.newPassword && (
              <p className="text-xs text-destructive">{errors.newPassword}</p>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-sm">
              Confirm New Password
            </Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showPasswords.confirm ? "text" : "password"}
                value={formData.confirmPassword}
                onChange={(e) =>
                  setFormData({ ...formData, confirmPassword: e.target.value })
                }
                placeholder="Confirm new password"
                disabled={isLoading}
                className="pr-10"
                autoComplete="new-password"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => togglePasswordVisibility("confirm")}
                disabled={isLoading}
              >
                {showPasswords.confirm ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            {errors.confirmPassword && (
              <p className="text-xs text-destructive">
                {errors.confirmPassword}
              </p>
            )}
          </div>

          {/* Password Requirements */}
          <Alert className="py-2">
            <Shield className="h-3 w-3" />
            <AlertDescription className="text-xs">
              Password must be at least 8 characters long and include a mix of
              letters, numbers, and symbols.
            </AlertDescription>
          </Alert>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={isLoading}
          className="w-full"
          size="sm"
          style={{
            background: isLoading
              ? "#9ca3af"
              : "linear-gradient(135deg, #f97316 0%, #dc2626 100%)",
            color: "white",
            border: "none",
          }}
          onMouseEnter={(e) => {
            if (!isLoading) {
              e.currentTarget.style.background =
                "linear-gradient(135deg, #ea580c 0%, #b91c1c 100%)";
            }
          }}
          onMouseLeave={(e) => {
            if (!isLoading) {
              e.currentTarget.style.background =
                "linear-gradient(135deg, #f97316 0%, #dc2626 100%)";
            }
          }}
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Changing Password...
            </>
          ) : (
            "Change Password"
          )}
        </Button>
      </form>
    </div>
  );
};
