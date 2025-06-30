import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, XCircle, RefreshCw, Mail } from "lucide-react";
import { apiClient } from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import logger from "@/lib/logger";

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
  const [verificationState, setVerificationState] = useState<{
    loading: boolean;
    result: VerificationResult | null;
  }>({
    loading: true,
    result: null,
  });

  const token = searchParams.get("token");

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

    const verifyEmailToken = async (verificationToken: string) => {
      try {
        logger.log("Starting verification with token:", {
          tokenLength: verificationToken.length,
          tokenPrefix: verificationToken.substring(0, 8),
        });

        setVerificationState({ loading: true, result: null });

        const data = await apiClient.verifyEmail(verificationToken);

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
        setTimeout(() => {
          if (isAuthenticated) {
            // User is logged in, go to dashboard
            navigate("/", { replace: true });
          } else {
            // User is not logged in, go to sign in page
            navigate("/auth/sign-in", { replace: true });
          }
        }, 3000);
      } catch (error: unknown) {
        logger.error("Email verification error:", error);

        // Check if the error is an HTTP error with response data
        let errorMessage = "Failed to verify email. Please try again.";
        if (error instanceof Error) {
          errorMessage = error.message;
          logger.log("Error details:", {
            message: error.message,
            name: error.name,
            stack: error.stack,
          });
        }

        // Log additional details if it's a fetch error
        if (error && typeof error === "object" && "response" in error) {
          logger.log("Response error details:", error);
        }

        setVerificationState({
          loading: false,
          result: {
            success: false,
            error: errorMessage,
          },
        });
      }
    };

    verifyEmailToken(token);
  }, [token, navigate, isAuthenticated, updateUser, queryClient]);

  const handleResendVerification = async () => {
    try {
      await apiClient.resendVerificationEmail("SIGNUP");
      toast.success("Verification email sent! Please check your inbox.");
    } catch (error: unknown) {
      logger.error("Resend verification error:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to resend verification email"
      );
    }
  };

  const handleGoToSignIn = () => {
    navigate("/auth/sign-in");
  };

  const handleGoToDashboard = () => {
    navigate("/");
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
                    " You can now access all features of the application."}
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Button
                  onClick={
                    isAuthenticated ? handleGoToDashboard : handleGoToSignIn
                  }
                  className="w-full"
                >
                  {isAuthenticated ? "Go to Dashboard" : "Sign In to Continue"}
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

                <Button
                  onClick={handleResendVerification}
                  variant="outline"
                  className="w-full"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Resend Verification Email
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
                    onClick={handleGoToDashboard}
                    variant="ghost"
                    className="w-full"
                  >
                    Go to Dashboard
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
