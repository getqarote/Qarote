import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router";

import { CheckCircle, Mail, RefreshCw, XCircle } from "lucide-react";
import { toast } from "sonner";

import { logger } from "@/lib/logger";
import { trpc } from "@/lib/trpc/client";

import { AuthPageHeader } from "@/components/auth/AuthPageHeader";
import { AuthPageWrapper } from "@/components/auth/AuthPageWrapper";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";

import { useAuth } from "@/contexts/AuthContextDefinition";

interface VerificationResult {
  success: boolean;
  message?: string;
  type?: string;
  error?: string;
}

export default function VerifyEmail() {
  const { t } = useTranslation("auth");
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAuthenticated, updateUser } = useAuth();
  const verificationAttempted = useRef(false);
  const token = searchParams.get("token");
  const [verificationState, setVerificationState] = useState<{
    loading: boolean;
    result: VerificationResult | null;
  }>(() => {
    if (!token) {
      return {
        loading: false,
        result: {
          success: false,
          error: t("noVerificationToken"),
        },
      };
    }
    return {
      loading: true,
      result: null,
    };
  });

  // tRPC mutations
  const { mutate: verifyEmail } =
    trpc.auth.verification.verifyEmail.useMutation({
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

        toast.success(t("emailVerifiedToast"));

        // Redirect based on authentication status
        setTimeout(() => {
          if (isAuthenticated) {
            navigate("/onboarding", { replace: true });
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
            error: error.message || t("failedVerifyEmail"),
          },
        });
      },
    });

  const resendVerificationMutation =
    trpc.auth.verification.resendVerification.useMutation({
      onSuccess: () => {
        toast.success(t("verificationSentToast"));
      },
      onError: (error) => {
        logger.error("Resend verification error:", error);
        toast.error(error.message || t("failedResendVerification"));
      },
    });

  useEffect(() => {
    logger.log("VerifyEmail useEffect triggered", {
      token,
      verificationAttempted: verificationAttempted.current,
    });

    if (!token) {
      logger.log("No token found in URL");
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

    verifyEmail({ token });
  }, [token, verifyEmail]);

  const handleResendVerification = () => {
    resendVerificationMutation.mutate({ type: "SIGNUP", sourceApp: "app" });
  };

  const handleGoToSignIn = () => {
    navigate("/auth/sign-in");
  };

  const handleGoToDashboard = () => {
    // Always go to workspace creation
    // The workspace page will handle redirecting to dashboard if user already has workspaces
    navigate("/onboarding", { replace: true });
  };

  logger.log("Verification State:", verificationState);

  if (verificationState.loading) {
    return (
      <AuthPageWrapper>
        <AuthPageHeader
          Icon={({ className }) => (
            <RefreshCw className={`${className} animate-spin`} />
          )}
          title={t("verifyingEmail")}
          description={t("verifyingEmailDescription")}
        />
      </AuthPageWrapper>
    );
  }

  const { result } = verificationState;

  if (!result) {
    return null;
  }

  return (
    <AuthPageWrapper>
      <AuthPageHeader
        Icon={result.success ? CheckCircle : XCircle}
        title={result.success ? t("emailVerified") : t("verificationFailed")}
        description={
          result.success
            ? result.type === "EMAIL_CHANGE"
              ? t("emailChangeVerified")
              : t("emailVerifiedSuccess")
            : result.error
        }
        variant={result.success ? "success" : "destructive"}
      />

      <CardContent className="space-y-4">
        {result.success ? (
          <>
            <Alert className="border-success/30 bg-success-muted">
              <CheckCircle className="h-4 w-4 text-success" />
              <AlertDescription className="text-success">
                {result.message || t("emailVerificationComplete")}
                {result.type === "SIGNUP" && t("signupVerifiedExtra")}
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Button
                onClick={
                  isAuthenticated ? handleGoToDashboard : handleGoToSignIn
                }
                className="w-full bg-primary hover:bg-primary/90"
              >
                {isAuthenticated ? t("goToDashboard") : t("signInToContinue")}
              </Button>
              <p className="text-sm text-muted-foreground text-center">
                {t("redirectingAutomatically")}
              </p>
            </div>
          </>
        ) : (
          <>
            <Alert className="border-destructive/30 bg-destructive/10">
              <XCircle className="h-4 w-4 text-destructive" />
              <AlertDescription className="text-destructive">
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
                  {t("tryAgain")}
                </Button>
              )}

              <Button
                onClick={handleResendVerification}
                variant="outline"
                className="w-full"
              >
                <Mail className="h-4 w-4 mr-2" />
                {t("resendVerificationEmail")}
              </Button>

              {!isAuthenticated && (
                <Button
                  onClick={handleGoToSignIn}
                  variant="ghost"
                  className="w-full"
                >
                  {t("backToSignIn")}
                </Button>
              )}

              {isAuthenticated && (
                <Button
                  onClick={handleGoToDashboard}
                  variant="ghost"
                  className="w-full"
                >
                  {t("goToDashboard")}
                </Button>
              )}
            </div>
          </>
        )}
      </CardContent>
    </AuthPageWrapper>
  );
}
