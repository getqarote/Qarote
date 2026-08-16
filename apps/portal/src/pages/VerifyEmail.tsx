import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router";

import { CheckCircle, Mail, RefreshCw, XCircle } from "lucide-react";
import { toast } from "sonner";

import { track } from "@/lib/analytics";
import { logger } from "@/lib/logger";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

import { AuthPageHeader } from "@/components/auth/AuthPageHeader";
import { AuthPageWrapper } from "@/components/auth/AuthPageWrapper";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

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
  const token = searchParams.get("token");
  const { t } = useTranslation("auth");
  const { t: tPortal } = useTranslation("portal");

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
    return { loading: true, result: null };
  });

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

      track("account_verified", { verification_type: data.type });

      toast.success(t("emailVerifiedToast"));

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
          error: error.message || t("failedVerifyEmail"),
        },
      });
    },
  });

  const resendVerificationMutation =
    trpc.auth.verification.resendVerification.useMutation({
      onSuccess: () => {
        track("verification_resent");
        toast.success(t("verificationSentToast"));
      },
      onError: (error) => {
        logger.error("Resend verification error:", error);
        toast.error(error.message || t("failedResendVerification"));
      },
    });

  useEffect(() => {
    if (!token) {
      return;
    }

    // Prevent duplicate verification attempts
    if (verificationAttempted.current) {
      return;
    }

    verificationAttempted.current = true;
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
      toast.error(t("pleaseEnterValidEmail"));
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
      <AuthPageWrapper>
        <AuthPageHeader
          Icon={({ className }) => (
            <RefreshCw className={cn(className, "animate-spin")} />
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
        variant={result.success ? "success" : "destructive"}
        title={result.success ? t("emailVerified") : t("verificationFailed")}
        description={
          result.success
            ? result.type === "EMAIL_CHANGE"
              ? t("emailChangeVerified")
              : t("emailVerifiedSuccess")
            : result.error
        }
      />

      <CardContent className="space-y-4">
        {result.success ? (
          <>
            <Alert className="border-success/30 bg-success-muted">
              <CheckCircle className="h-4 w-4 text-success" />
              <AlertDescription className="text-success">
                {result.message || t("emailVerificationComplete")}
                {result.type === "SIGNUP" && tPortal("signupVerifiedExtra")}
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Button
                onClick={
                  isAuthenticated ? handleGoToLicenses : handleGoToSignIn
                }
                className="w-full btn-primary"
              >
                {isAuthenticated
                  ? tPortal("goToLicenses")
                  : t("signInToContinue")}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                {t("redirectingAutomatically")}
              </p>
            </div>
          </>
        ) : (
          <>
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{result.error}</AlertDescription>
            </Alert>

            <div className="space-y-2">
              {token && (
                <Button
                  onClick={() => window.location.reload()}
                  variant="outline"
                  className="w-full"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {t("tryAgain")}
                </Button>
              )}

              {!isAuthenticated && showEmailInput && (
                <Input
                  type="email"
                  placeholder={t("enterEmailAddress")}
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                />
              )}

              <Button
                onClick={handleResendVerification}
                variant="outline"
                className="w-full"
                disabled={resendVerificationMutation.isPending}
              >
                <Mail className="mr-2 h-4 w-4" />
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
                  onClick={handleGoToLicenses}
                  variant="ghost"
                  className="w-full"
                >
                  {tPortal("goToLicenses")}
                </Button>
              )}
            </div>
          </>
        )}
      </CardContent>
    </AuthPageWrapper>
  );
}
