import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Mail, Eye, EyeOff, AlertCircle, CheckCircle, X } from "lucide-react";
import { toast } from "sonner";

interface CompactEmailChangeFormProps {
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

export const CompactEmailChangeForm: React.FC<CompactEmailChangeFormProps> = ({
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
      console.error("Email change request error:", error);
      // Error handling is done by the parent component
    }
  };

  const handleCancelEmailChange = async () => {
    try {
      await onCancelEmailChange();
      toast.success("Email change request cancelled");
    } catch (error) {
      console.error("Cancel email change error:", error);
      toast.error("Failed to cancel email change request");
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="space-y-4">
      {/* Current Email Status */}
      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Current:</span>
          <span className="text-sm">{currentEmail}</span>
        </div>
        <Badge variant="secondary" className="text-xs">
          Active
        </Badge>
      </div>

      {/* Pending Email Change Status */}
      {hasPendingEmailChange && pendingEmail && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertCircle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="flex items-center justify-between">
            <div className="flex-1">
              <div className="font-medium text-orange-800">
                Email change pending
              </div>
              <div className="text-sm text-orange-700 mt-1">{pendingEmail}</div>
              <div className="text-xs text-orange-600 mt-1">
                Check your new email inbox and verify to complete the change
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancelEmailChange}
              disabled={isCancelling}
              className="ml-3 shrink-0"
            >
              <X className="h-3 w-3 mr-1" />
              Cancel
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Email Change Form - Only show if no pending change */}
      {!hasPendingEmailChange && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="newEmail" className="text-sm">
              New Email Address
            </Label>
            <Input
              id="newEmail"
              type="email"
              value={formData.newEmail}
              onChange={(e) =>
                setFormData({ ...formData, newEmail: e.target.value })
              }
              placeholder="Enter new email address"
              disabled={isLoading}
              className="h-9"
            />
            {errors.newEmail && (
              <p className="text-xs text-destructive">{errors.newEmail}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="emailPassword" className="text-sm">
              Current Password
            </Label>
            <div className="relative">
              <Input
                id="emailPassword"
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                placeholder="Enter current password"
                disabled={isLoading}
                className="h-9 pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-9 px-3"
                onClick={togglePasswordVisibility}
                disabled={isLoading}
              >
                {showPassword ? (
                  <EyeOff className="h-3 w-3" />
                ) : (
                  <Eye className="h-3 w-3" />
                )}
              </Button>
            </div>
            {errors.password && (
              <p className="text-xs text-destructive">{errors.password}</p>
            )}
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            size="sm"
            className="w-full"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2" />
                Requesting...
              </>
            ) : (
              <>
                <Mail className="h-3 w-3 mr-2" />
                Request Email Change
              </>
            )}
          </Button>
        </form>
      )}

      {/* Security Notice */}
      <Alert className="border-blue-200 bg-blue-50">
        <CheckCircle className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-xs text-blue-700">
          <strong>Security:</strong> We'll send a verification link to your new
          email. Your current email remains active until verified.
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default CompactEmailChangeForm;
