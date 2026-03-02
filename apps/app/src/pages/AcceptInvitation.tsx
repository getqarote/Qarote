import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router";

import { zodResolver } from "@hookform/resolvers/zod";
import { Building, Loader2, Mail, Users } from "lucide-react";

import { trpc } from "@/lib/trpc/client";

import { GoogleInvitationButton } from "@/components/auth/GoogleInvitationButton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { PasswordRequirements } from "@/components/ui/password-requirements";

import { useAcceptInvitation } from "@/hooks/ui/useAuth";
import { useToast } from "@/hooks/ui/useToast";

import {
  type AcceptInvitationFormData,
  acceptInvitationSchema,
} from "@/schemas";

interface InvitationDetails {
  id: string;
  email: string;
  role: string;
  expiresAt: string;
  workspace: {
    id: string;
    name: string;
    plan: string;
  };
  invitedBy: {
    id: string;
    email: string;
    displayName: string;
  };
}

const AcceptInvitation = () => {
  const { t } = useTranslation("auth");
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const acceptInvitationMutation = useAcceptInvitation();
  const utils = trpc.useUtils();

  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Initialize form with react-hook-form
  const form = useForm<AcceptInvitationFormData>({
    resolver: zodResolver(acceptInvitationSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      password: "",
      confirmPassword: "",
    },
  });

  // Fetch invitation details
  useEffect(() => {
    const fetchInvitationDetails = async () => {
      if (!token) {
        setError(t("invalidInvitationLink"));
        setLoading(false);
        return;
      }

      try {
        const response = await utils.public.invitation.getDetails.fetch({
          token,
        });
        if (response.success) {
          setInvitation(response.invitation);
        } else {
          setError(t("invalidOrExpiredInvitation"));
        }
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error ? err.message : t("failedLoadInvitation");
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchInvitationDetails();
  }, [token, utils]);

  const onSubmit = (data: AcceptInvitationFormData) => {
    if (!token) {
      return;
    }

    acceptInvitationMutation.mutate(
      {
        token,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
      },
      {
        onSuccess: () => {
          toast({
            title: t("welcomeToQarote"),
            description: t("successfullyJoinedWorkspace", {
              workspace: invitation?.workspace.name,
            }),
          });
          // Redirect to dashboard
          navigate("/", { replace: true });
        },
        onError: (err: unknown) => {
          const errorMessage =
            err instanceof Error ? err.message : t("failedAcceptInvitation");
          setError(errorMessage);
        },
      }
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-auth py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md bg-white/95 backdrop-blur-xs border-white/20 shadow-2xl">
          <CardContent className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-auth py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md bg-white/95 backdrop-blur-xs border-white/20 shadow-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-red-600">
              {t("invalidInvitation")}
            </CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => navigate("/auth/sign-in")}
              className="w-full bg-gradient-button hover:bg-gradient-button-hover"
            >
              {t("goToSignIn")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const planDisplayName =
    {
      FREE: "Free",
      DEVELOPER: "Developer",
      ENTERPRISE: "Enterprise",
    }[invitation?.workspace.plan as string] || invitation?.workspace.plan;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-auth py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md bg-white/95 backdrop-blur-xs border-white/20 shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
            <Mail className="h-6 w-6 text-blue-600" />
          </div>
          <CardTitle>{t("joinQaroteTitle")}</CardTitle>
          <CardDescription>{t("setUpAccount")}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Invitation Details */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Building className="h-4 w-4" />
              <span>
                {t("workspace")}: <strong>{invitation?.workspace.name}</strong>
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Users className="h-4 w-4" />
              <span>
                {t("plan")}: <strong>{planDisplayName}</strong>
              </span>
            </div>
            <div className="text-sm text-gray-600">
              {t("invitedBy")}:{" "}
              <strong>{invitation?.invitedBy.displayName}</strong>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Google Authentication Option */}
          <div className="space-y-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  {t("orContinueWith")}
                </span>
              </div>
            </div>

            <GoogleInvitationButton
              invitationToken={token || ""}
              onError={(error) => setError(error)}
            />
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                {t("orCreateAccountManually")}
              </span>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("firstName")}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t("firstNamePlaceholder")}
                          disabled={acceptInvitationMutation.isPending}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("lastName")}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t("lastNamePlaceholder")}
                          disabled={acceptInvitationMutation.isPending}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-2">
                <FormLabel>{t("email")}</FormLabel>
                <Input
                  type="email"
                  value={invitation?.email || ""}
                  disabled
                  className="bg-gray-50"
                  autoComplete="username"
                />
              </div>

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("password")}</FormLabel>
                    <FormControl>
                      <PasswordInput
                        placeholder={t("enterYourPassword")}
                        disabled={acceptInvitationMutation.isPending}
                        showPassword={showPassword}
                        onToggleVisibility={() =>
                          setShowPassword(!showPassword)
                        }
                        autoComplete="new-password"
                        {...field}
                      />
                    </FormControl>
                    <PasswordRequirements
                      password={field.value || ""}
                      className="mt-2"
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("confirmPassword")}</FormLabel>
                    <FormControl>
                      <PasswordInput
                        placeholder={t("confirmYourPassword")}
                        disabled={acceptInvitationMutation.isPending}
                        showPassword={showConfirmPassword}
                        onToggleVisibility={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                        autoComplete="new-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full bg-gradient-button hover:bg-gradient-button-hover"
                disabled={
                  acceptInvitationMutation.isPending || !form.formState.isValid
                }
              >
                {acceptInvitationMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    {t("creatingAccount")}
                  </>
                ) : (
                  t("acceptInvitationAndCreate")
                )}
              </Button>
            </form>
          </Form>

          <div className="text-center">
            <p className="text-sm text-gray-500">
              {t("alreadyHaveAccount")}{" "}
              <button
                onClick={() => navigate("/auth/sign-in")}
                className="text-blue-600 hover:underline"
              >
                {t("signInInstead")}
              </button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AcceptInvitation;
