import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router";

import { ArrowLeft, Mail, Send } from "lucide-react";
import { toast } from "sonner";

import { logger } from "@/lib/logger";

import { Alert, AlertDescription } from "@/components/ui/alert";
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

import { useRequestPasswordReset } from "@/hooks/queries/useProfile";

const ForgotPassword: React.FC = () => {
  const { t } = useTranslation("auth");
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);

  const resetPasswordMutation = useRequestPasswordReset({
    onSuccess: () => {
      setEmailSent(true);
      toast.success(t("passwordResetSentToast"));
    },
    onError: (error: Error) => {
      logger.error("Password reset request error:", error);
      toast.error(t("failedSendResetEmail"));
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error(t("pleaseEnterEmail"));
      return;
    }

    if (!email.includes("@")) {
      toast.error(t("pleaseEnterValidEmail"));
      return;
    }

    resetPasswordMutation.mutate({ email: email.trim() });
  };

  if (emailSent) {
    return (
      <div className="h-full flex items-center justify-center page-layout p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-success-muted rounded-full flex items-center justify-center mb-4">
              <Mail className="h-6 w-6 text-success" />
            </div>
            <CardTitle className="text-2xl">{t("checkYourEmail")}</CardTitle>
            <CardDescription>
              {t("resetInstructionsSent", { email })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Mail className="h-4 w-4" />
              <AlertDescription>{t("checkSpamFolder")}</AlertDescription>
            </Alert>

            <div className="flex flex-col gap-2">
              <Button
                onClick={() => resetPasswordMutation.mutate({ email })}
                variant="outline"
                disabled={resetPasswordMutation.isPending}
              >
                <Send className="h-4 w-4" />
                {t("resendEmail")}
              </Button>

              <Button onClick={() => navigate("/auth/sign-in")} variant="ghost">
                <ArrowLeft className="h-4 w-4" />
                {t("backToSignIn")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full flex items-center justify-center page-layout p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{t("forgotPasswordTitle")}</CardTitle>
          <CardDescription>{t("forgotPasswordDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t("emailAddress")}</Label>
              <Input
                id="email"
                type="email"
                placeholder={t("enterEmailAddress")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={resetPasswordMutation.isPending}
                required
                autoComplete="username"
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-button hover:bg-gradient-button-hover"
              disabled={resetPasswordMutation.isPending}
            >
              {resetPasswordMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  {t("sendingResetLink")}
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  {t("sendResetLink")}
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              {t("rememberPassword")}{" "}
              <Link to="/sign-in" className="text-primary hover:underline">
                {t("signInHere")}
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ForgotPassword;
