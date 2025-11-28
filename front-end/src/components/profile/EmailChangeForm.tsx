import React, { useState } from "react";

import { AlertCircle, CheckCircle, Eye, EyeOff, Mail, X } from "lucide-react";
import { toast } from "sonner";

import { logger } from "@/lib/logger";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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

interface EmailChangeFormProps {
  currentEmail: string;
  pendingEmail?: string | null;
  hasPendingEmailChange?: boolean;
  onEmailChangeRequest: (data: {
    newEmail: string;
    password: string;
  }) => Promise<void>;
  onCancelEmailChange: () => Promise<void>;
  isLoading?: boolean;
  isCancelling?: boolean;
}

export const EmailChangeForm: React.FC<EmailChangeFormProps> = ({
  currentEmail,
  pendingEmail,
  hasPendingEmailChange = false,
  onEmailChangeRequest,
  onCancelEmailChange,
  isLoading = false,
  isCancelling = false,
}) => {
  const [formData, setFormData] = useState({
    newEmail: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.newEmail) {
      newErrors.newEmail = "New email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.newEmail)) {
      newErrors.newEmail = "Please enter a valid email address";
    } else if (formData.newEmail === currentEmail) {
      newErrors.newEmail = "New email must be different from current email";
    }

    if (!formData.password) {
      newErrors.password = "Password is required to change email";
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
      await onEmailChangeRequest({
        newEmail: formData.newEmail,
        password: formData.password,
      });

      // Reset form on success
      setFormData({
        newEmail: "",
        password: "",
      });
      setErrors({});
      setShowPassword(false);
    } catch (error) {
      logger.error("Email change request error:", error);
      // Error handling is done by the parent component
    }
  };

  const handleCancelEmailChange = async () => {
    try {
      await onCancelEmailChange();
      toast.success("Email change request cancelled");
    } catch (error) {
      logger.error("Cancel email change error:", error);
      toast.error("Failed to cancel email change request");
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Email Address
        </CardTitle>
        <CardDescription>
          Change your email address. You'll need to verify the new email before
          it becomes active.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Email Status */}
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Current Email:</span>
              <span className="text-sm">{currentEmail}</span>
            </div>
            <Badge variant="secondary">Active</Badge>
          </div>

          {/* Pending Email Change Status */}
          {hasPendingEmailChange && pendingEmail && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <div>
                  <strong>Email change pending:</strong> {pendingEmail}
                  <br />
                  <span className="text-sm text-muted-foreground">
                    Check your new email inbox and click the verification link
                    to complete the change.
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancelEmailChange}
                  disabled={isCancelling}
                  className="ml-4"
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Email Change Form - Only show if no pending change */}
        {!hasPendingEmailChange && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newEmail">New Email Address</Label>
              <Input
                id="newEmail"
                type="email"
                value={formData.newEmail}
                onChange={(e) =>
                  setFormData({ ...formData, newEmail: e.target.value })
                }
                placeholder="Enter your new email address"
                disabled={isLoading}
              />
              {errors.newEmail && (
                <p className="text-sm text-destructive">{errors.newEmail}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Current Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  placeholder="Enter your current password"
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={togglePasswordVisibility}
                  disabled={isLoading}
                >
                  {showPassword ? (
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

            <div className="pt-4">
              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Requesting Email Change...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    Request Email Change
                  </>
                )}
              </Button>
            </div>
          </form>
        )}

        {/* Security Notice */}
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            <strong>Security Notice:</strong> When you request an email change,
            we'll send a verification link to your new email address. Your
            current email will remain active until you verify the new one.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};

export default EmailChangeForm;
