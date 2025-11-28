import { useState } from "react";

import { Mail, X } from "lucide-react";
import { toast } from "sonner";

import { apiClient } from "@/lib/api";
import { logger } from "@/lib/logger";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

import { useAuth } from "@/contexts/AuthContextDefinition";

interface EmailVerificationBannerProps {
  className?: string;
}

export const EmailVerificationBanner = ({
  className,
}: EmailVerificationBannerProps) => {
  const { user } = useAuth();
  const [isDismissed, setIsDismissed] = useState(false);
  const [isResending, setIsResending] = useState(false);

  // Don't show banner if user is verified, if no user, or if dismissed
  if (!user || user.emailVerified || isDismissed) {
    return null;
  }

  const handleResendVerification = async () => {
    try {
      setIsResending(true);
      await apiClient.resendVerificationEmail("SIGNUP");
      toast.success("Verification email sent! Please check your inbox.");
    } catch (error) {
      logger.error("Resend verification error:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to resend verification email"
      );
    } finally {
      setIsResending(false);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
  };

  return (
    <Alert className={`border-amber-200 bg-amber-50 relative ${className}`}>
      <Mail className="h-4 w-4 text-amber-600" />
      <AlertDescription className="text-amber-800 pr-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="font-medium mb-1">Email Verification Required</div>
            <p className="text-sm">
              Please verify your email address to access all features. Check
              your inbox for a verification email.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              onClick={handleResendVerification}
              disabled={isResending}
              size="sm"
              variant="outline"
              className="bg-white border-amber-300 text-amber-700 hover:bg-amber-100"
            >
              {isResending ? "Sending..." : "Resend"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="h-8 w-8 p-0 hover:bg-amber-100 text-amber-600 flex-shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
};
