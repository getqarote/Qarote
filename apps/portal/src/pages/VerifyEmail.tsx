import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";

import { CheckCircle, Mail, RefreshCw, XCircle } from "lucide-react";
import { toast } from "sonner";

import { logger } from "@/lib/logger";
import { trpc } from "@/lib/trpc/client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { useAuth } from "@/contexts/AuthContext";

interface VerificationResult {
  success: boolean;
  message?: string;
  type?: string;
  error?: string;
}

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAuthenticated, updateUser } = useAuth();
  const verificationAttempted = useRef(false);
  const redirectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [verificationState, setVerificationState] = useState<{
    loading: boolean;
    result: VerificationResult | null;
  }>({
    loading: true,
    result: null,
  });

  const token = searchParams.get("token");

  // tRPC mutations
  const verifyEmailMutation = trpc.auth.verification.verifyEmail.useMutation({
    onSuccess: (data) => {
      logger.log("Verification successful:", data);

      // Update user context with the verified user data
      if (data.user) {
        updateUser(data.user);
      }

      // Invalidate verification status query to refresh any cached data
      queryClient.invalidateQueries({ queryKey: ["verification-status"] });

      setVerificationState({
        loading: false,
        result: {
          success: true,
          message: data.message,
          type: data.type,
        },
      });

      toast.success("Email verified successfully!");

      // Redirect based on authentication status
      redirectTimerRef.current = setTimeout(() => {
        if (isAuthenticated) {
          navigate("/licenses", { replace: true });
        } else {
          navigate("/auth/sign-in", { replace: true });
        }
      }, 3000);
    },
    onError: (error) => {
      logger.error("Email verification error:", error);

      setVerificationState({
        loading: false,
        result: {
          success: false,
          error: error.message || "Failed to verify email. Please try again.",
        },
      });
    },
  });

  const resendVerificationMutation =
    trpc.auth.verification.resendVerification.useMutation({
      onSuccess: () => {
        toast.success("Verification email sent! Please check your inbox.");
      },
      onError: (error) => {
        logger.error("Resend verification error:", error);
        toast.error(error.message || "Failed to resend verification email");
      },
    });

  useEffect(() => {
    logger.log("VerifyEmail useEffect triggered", {
      token,
      verificationAttempted: verificationAttempted.current,
    });

    if (!token) {
      logger.log("No token found in URL");
      setVerificationState({
        loading: false,
        result: {
          success: false,
          error: "No verification token provided",
        },
      });
      return;
    }

    // Prevent duplicate verification attempts
    if (verificationAttempted.current) {
      logger.log("Verification already attempted, skipping");
      return;
    }

    verificationAttempted.current = true;

    logger.log("Starting verification with token:", {
      tokenLength: token.length,
      tokenPrefix: token.substring(0, 8),
    });

    setVerificationState({ loading: true, result: null });
    verifyEmailMutation.mutate({ token });
  }, [token]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current);
        redirectTimerRef.current = null;
      }
    };
  }, []);

  const handleResendVerification = () => {
    // For authenticated users, send directly
    if (isAuthenticated) {
      resendVerificationMutation.mutate({
        type: "SIGNUP",
        sourceApp: "portal",
      });
      return;
    }

    // For unauthenticated users, show email input if not already shown
    if (!showEmailInput) {
      setShowEmailInput(true);
      return;
    }

    // Validate email before sending
    if (!userEmail || !userEmail.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }

    resendVerificationMutation.mutate({
      type: "SIGNUP",
      email: userEmail,
      sourceApp: "portal",
    });

    // Hide email input after sending
    setShowEmailInput(false);
  };

  const handleGoToSignIn = () => {
    // Clear any pending redirect timer
    if (redirectTimerRef.current) {
      clearTimeout(redirectTimerRef.current);
      redirectTimerRef.current = null;
    }
    navigate("/auth/sign-in");
  };

  const handleGoToLicenses = () => {
    // Clear any pending redirect timer
    if (redirectTimerRef.current) {
      clearTimeout(redirectTimerRef.current);
      redirectTimerRef.current = null;
    }
    navigate("/licenses", { replace: true });
  };

  logger.log("Verification State:", verificationState);

  if (verificationState.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <RefreshCw className="h-6 w-6 text-blue-600 animate-spin" />
            </div>
            <CardTitle>Verifying Your Email</CardTitle>
            <CardDescription>
              Please wait while we verify your email address...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const { result } = verificationState;

  if (!result) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div
            className={`mx-auto mb-4 w-12 h-12 rounded-full flex items-center justify-center ${
              result.success ? "bg-green-100" : "bg-red-100"
            }`}
          >
            {result.success ? (
              <CheckCircle className="h-6 w-6 text-green-600" />
            ) : (
              <XCircle className="h-6 w-6 text-red-600" />
            )}
          </div>
          <CardTitle>
            {result.success ? "Email Verified!" : "Verification Failed"}
          </CardTitle>
          <CardDescription>
            {result.success
              ? result.type === "EMAIL_CHANGE"
                ? "Your new email address has been verified successfully."
                : "Your email address has been verified successfully."
              : result.error}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {result.success ? (
            <>
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  {result.message ||
                    "Email verification completed successfully."}
                  {result.type === "SIGNUP" &&
                    " You can now purchase and manage your licenses."}
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Button
                  onClick={
                    isAuthenticated ? handleGoToLicenses : handleGoToSignIn
                  }
                  className="w-full bg-gradient-button hover:bg-gradient-button-hover"
                >
                  {isAuthenticated ? "Go to Licenses" : "Sign In to Continue"}
                </Button>
                <p className="text-sm text-gray-500 text-center">
                  Redirecting automatically in 3 seconds...
                </p>
              </div>
            </>
          ) : (
            <>
              <Alert className="border-red-200 bg-red-50">
                <XCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  {result.error}
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                {token && (
                  <Button
                    onClick={() => window.location.reload()}
                    variant="outline"
                    className="w-full"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try Again
                  </Button>
                )}

                {!isAuthenticated && showEmailInput && (
                  <div className="space-y-2">
                    <input
                      type="email"
                      placeholder="Enter your email address"
                      value={userEmail}
                      onChange={(e) => setUserEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                )}

                <Button
                  onClick={handleResendVerification}
                  variant="outline"
                  className="w-full"
                  disabled={resendVerificationMutation.isPending}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  {!isAuthenticated && showEmailInput
                    ? "Send Verification Email"
                    : "Resend Verification Email"}
                </Button>

                {!isAuthenticated && (
                  <Button
                    onClick={handleGoToSignIn}
                    variant="ghost"
                    className="w-full"
                  >
                    Back to Sign In
                  </Button>
                )}

                {isAuthenticated && (
                  <Button
                    onClick={handleGoToLicenses}
                    variant="ghost"
                    className="w-full"
                  >
                    Go to Licenses
                  </Button>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
