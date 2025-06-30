import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Mail, Clock, RefreshCw } from "lucide-react";
import { apiClient } from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export const EmailVerificationSettings = () => {
  const { user } = useAuth();
  const [isResending, setIsResending] = useState(false);

  const {
    data: verificationStatus,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["verification-status"],
    queryFn: () => apiClient.getVerificationStatus(),
    enabled: !!user,
  });

  const handleResendVerification = async (type: "SIGNUP" | "EMAIL_CHANGE") => {
    try {
      setIsResending(true);
      await apiClient.resendVerificationEmail(type);
      toast.success("Verification email sent! Please check your inbox.");
      refetch(); // Refresh verification status
    } catch (error) {
      console.error("Resend verification error:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to resend verification email"
      );
    } finally {
      setIsResending(false);
    }
  };

  if (!user) {
    return null;
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Verification
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <RefreshCw className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const status = verificationStatus || {
    emailVerified: user.emailVerified || false,
    emailVerifiedAt: user.emailVerifiedAt || null,
    pendingEmail: user.pendingEmail || null,
    hasPendingSignupVerification: false,
    hasPendingEmailChange: false,
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Email Verification
        </CardTitle>
        <CardDescription>
          Manage your email verification status and pending email changes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Email Status */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center gap-3">
            {status.emailVerified ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <XCircle className="h-5 w-5 text-red-600" />
            )}
            <div>
              <div className="font-medium">{user.email}</div>
              <div className="text-sm text-gray-500">
                {status.emailVerified
                  ? `Verified ${status.emailVerifiedAt ? new Date(status.emailVerifiedAt).toLocaleDateString() : ""}`
                  : "Not verified"}
              </div>
            </div>
          </div>
          <Badge
            variant={status.emailVerified ? "default" : "destructive"}
            className={
              status.emailVerified
                ? "bg-green-100 text-green-800 border-green-200"
                : "bg-red-100 text-red-800 border-red-200"
            }
          >
            {status.emailVerified ? "Verified" : "Unverified"}
          </Badge>
        </div>

        {/* Pending Email Change */}
        {status.pendingEmail && (
          <div className="flex items-center justify-between p-4 border rounded-lg bg-amber-50 border-amber-200">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-amber-600" />
              <div>
                <div className="font-medium">Pending Email Change</div>
                <div className="text-sm text-amber-700">
                  New email: {status.pendingEmail}
                </div>
                <div className="text-xs text-amber-600">
                  Please check your new email for verification
                </div>
              </div>
            </div>
            <Button
              onClick={() => handleResendVerification("EMAIL_CHANGE")}
              disabled={isResending}
              size="sm"
              variant="outline"
              className="border-amber-300 text-amber-700 hover:bg-amber-100"
            >
              {isResending ? "Sending..." : "Resend"}
            </Button>
          </div>
        )}

        {/* Verification Actions */}
        {!status.emailVerified && status.hasPendingSignupVerification && (
          <Alert className="border-blue-200 bg-blue-50">
            <Mail className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <div className="space-y-3">
                <div>
                  <div className="font-medium mb-1">
                    Email verification required
                  </div>
                  <p className="text-sm">
                    Please verify your email address to access all features.
                    Check your inbox for a verification email.
                  </p>
                </div>
                <Button
                  onClick={() => handleResendVerification("SIGNUP")}
                  disabled={isResending}
                  size="sm"
                  variant="outline"
                  className="w-full sm:w-auto bg-white border-blue-300 text-blue-700 hover:bg-blue-100"
                >
                  {isResending ? "Sending..." : "Resend Email"}
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Success State */}
        {status.emailVerified && !status.pendingEmail && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Your email address is verified and you have access to all
              features.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};
