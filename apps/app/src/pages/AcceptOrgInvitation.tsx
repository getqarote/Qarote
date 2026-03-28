import { type ReactNode, useState } from "react";
import { useForm, type UseFormReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router";

import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, CheckCircle2, Loader2, Mail, Shield } from "lucide-react";

import { authClient } from "@/lib/auth-client";
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

import { useAuth } from "@/contexts/AuthContextDefinition";

import {
  useAcceptOrgInvitationAuth,
  useAcceptOrgInvitationPublic,
} from "@/hooks/queries/useOrganization";
import {
  type OrgInvitationDetails,
  useOrgInvitationDetails,
} from "@/hooks/queries/useOrgInvitationDetails";
import { useSwitchWorkspace } from "@/hooks/queries/useWorkspaceApi";
import { useToast } from "@/hooks/ui/useToast";

import {
  type AcceptInvitationFormData,
  acceptInvitationSchema,
} from "@/schemas";

const ROLE_DISPLAY_NAMES: Record<string, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  MEMBER: "Member",
};

const PageWrapper = ({ children }: { children: ReactNode }) => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-auth py-12 px-4 sm:px-6 lg:px-8">
    <Card className="w-full max-w-md bg-card/95 backdrop-blur-xs border-border/20 shadow-2xl">
      {children}
    </Card>
  </div>
);

const OrgInvitationInfo = ({
  invitation,
}: {
  invitation: OrgInvitationDetails;
}) => {
  const { t } = useTranslation("auth");
  return (
    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <Building2 className="h-4 w-4" />
        <span>
          {t("orgLabel")} <strong>{invitation.organization.name}</strong>
        </span>
      </div>
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <Shield className="h-4 w-4" />
        <span>
          {t("role", "Role")}:{" "}
          <strong>
            {ROLE_DISPLAY_NAMES[invitation.role] || invitation.role}
          </strong>
        </span>
      </div>
      {invitation.invitedBy && (
        <div className="text-sm text-gray-600">
          {t("invitedBy")}: <strong>{invitation.invitedBy.displayName}</strong>
        </div>
      )}
    </div>
  );
};

const OrgInvitationForm = ({
  form,
  email,
  isPending,
  onSubmit,
  onNavigateSignIn,
}: {
  form: UseFormReturn<AcceptInvitationFormData>;
  email: string;
  isPending: boolean;
  onSubmit: (data: AcceptInvitationFormData) => void;
  onNavigateSignIn: () => void;
}) => {
  const { t } = useTranslation("auth");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  return (
    <>
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
                      disabled={isPending}
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
                      disabled={isPending}
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
              value={email}
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
                    disabled={isPending}
                    showPassword={showPassword}
                    onToggleVisibility={() => setShowPassword(!showPassword)}
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
                    disabled={isPending}
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
            disabled={isPending || !form.formState.isValid}
          >
            {isPending ? (
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
            type="button"
            onClick={onNavigateSignIn}
            className="text-blue-600 hover:underline"
          >
            {t("signInInstead")}
          </button>
        </p>
      </div>
    </>
  );
};

const AcceptOrgInvitation = () => {
  const { t } = useTranslation("auth");
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user: authUser, login } = useAuth();
  const acceptOrgInvitationMutation = useAcceptOrgInvitationPublic();
  const acceptAuthOrgInvitationMutation = useAcceptOrgInvitationAuth();
  const utils = trpc.useUtils();

  const switchWorkspaceMutation = useSwitchWorkspace();

  const {
    invitation,
    loading,
    error: fetchError,
  } = useOrgInvitationDetails(token);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [forceRegistration, setForceRegistration] = useState(false);
  const [acceptSuccess, setAcceptSuccess] = useState<{
    orgName: string;
    firstWorkspaceId: string | null;
  } | null>(null);

  const error =
    mutationError ??
    (fetchError
      ? fetchError === "invalid-token"
        ? t("invalidInvitationLink")
        : fetchError === "invalid-or-expired"
          ? t("invalidOrExpiredInvitation")
          : fetchError
      : null);

  const form = useForm<AcceptInvitationFormData>({
    resolver: zodResolver(acceptInvitationSchema),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      firstName: "",
      lastName: "",
      password: "",
      confirmPassword: "",
    },
  });

  // Handle acceptance for authenticated users
  const handleAuthAccept = () => {
    if (!token) return;
    setMutationError(null);

    acceptAuthOrgInvitationMutation.mutate(
      { token },
      {
        onSuccess: (result) => {
          setAcceptSuccess({
            orgName: result.organization.name,
            firstWorkspaceId: result.firstWorkspaceId ?? null,
          });
        },
        onError: (err: unknown) => {
          const errorMessage =
            err instanceof Error ? err.message : t("failedAcceptInvitation");
          setMutationError(errorMessage);
        },
      }
    );
  };

  // Handle acceptance for new users (registration flow)
  const onSubmit = (data: AcceptInvitationFormData) => {
    if (!token) return;
    setMutationError(null);

    acceptOrgInvitationMutation.mutate(
      {
        token,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
      },
      {
        onSuccess: async (result) => {
          try {
            const signInResult = await authClient.signIn.email({
              email: invitation?.email || result.user.email,
              password: data.password,
            });

            if (signInResult.error) {
              throw new Error(signInResult.error.message);
            }

            const response = await utils.auth.session.getSession.fetch();
            const user = {
              ...response.user,
              workspaceId: response.user.workspace?.id,
            };
            login(user);

            toast({
              title: t("welcomeToQarote"),
              description: t("orgSuccessfullyJoined", {
                org: invitation?.organization.name || result.organization.name,
              }),
            });

            navigate("/", { replace: true });
          } catch (err) {
            logger.error(
              "Failed to sign in after accepting org invitation:",
              err
            );
            toast({
              title: t("invitationAccepted"),
              description: t("orgSignInToAccess"),
              variant: "default",
            });
            navigate("/auth/sign-in", { replace: true });
          }
        },
        onError: (err: unknown) => {
          const errorMessage =
            err instanceof Error ? err.message : t("failedAcceptInvitation");
          setMutationError(errorMessage);
        },
      }
    );
  };

  if (loading) {
    return (
      <PageWrapper>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </PageWrapper>
    );
  }

  if (error && !invitation) {
    return (
      <PageWrapper>
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
      </PageWrapper>
    );
  }

  // Authenticated user flow
  if (authUser) {
    // Post-acceptance success state
    if (acceptSuccess) {
      return (
        <PageWrapper>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle>
              {t("youJoinedOrg", { org: acceptSuccess.orgName })}
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-3">
            {acceptSuccess.firstWorkspaceId && (
              <Button
                className="w-full bg-gradient-button hover:bg-gradient-button-hover"
                onClick={() => {
                  switchWorkspaceMutation.mutate(
                    { workspaceId: acceptSuccess.firstWorkspaceId! },
                    {
                      onSuccess: () => {
                        window.location.href = "/";
                      },
                    }
                  );
                }}
                disabled={switchWorkspaceMutation.isPending}
              >
                {switchWorkspaceMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    {t("accepting")}
                  </>
                ) : (
                  t("switchToOrg", { org: acceptSuccess.orgName })
                )}
              </Button>
            )}
            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate("/", { replace: true })}
            >
              {t("stayInCurrentOrg")}
            </Button>
          </CardContent>
        </PageWrapper>
      );
    }

    return (
      <PageWrapper>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
            <Building2 className="h-6 w-6 text-blue-600" />
          </div>
          <CardTitle>{t("joinOrganization")}</CardTitle>
          <CardDescription>
            {t("acceptOrgInvitationDescription")}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {invitation && <OrgInvitationInfo invitation={invitation} />}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            className="w-full bg-gradient-button hover:bg-gradient-button-hover"
            onClick={handleAuthAccept}
            disabled={acceptAuthOrgInvitationMutation.isPending}
          >
            {acceptAuthOrgInvitationMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                {t("accepting")}
              </>
            ) : (
              t("acceptInvitation")
            )}
          </Button>
        </CardContent>
      </PageWrapper>
    );
  }

  // Existing user — prompt to sign in
  if (invitation?.userExists && !forceRegistration) {
    return (
      <PageWrapper>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
            <Building2 className="h-6 w-6 text-blue-600" />
          </div>
          <CardTitle>{t("joinOrganization")}</CardTitle>
          <CardDescription>{t("existingAccountMessage")}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <OrgInvitationInfo invitation={invitation} />

          <Button
            className="w-full bg-gradient-button hover:bg-gradient-button-hover"
            onClick={() =>
              navigate(
                `/auth/sign-in?redirect=${encodeURIComponent(`/org-invite/${token}`)}`
              )
            }
          >
            {t("signIn")}
          </Button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setForceRegistration(true)}
              className="text-sm text-muted-foreground hover:underline"
            >
              {t("dontHaveAccountCreate")}
            </button>
          </div>
        </CardContent>
      </PageWrapper>
    );
  }

  // New user registration flow
  return (
    <PageWrapper>
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
          <Mail className="h-6 w-6 text-blue-600" />
        </div>
        <CardTitle>{t("joinOrganization")}</CardTitle>
        <CardDescription>{t("orgSetUpAccount")}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {invitation && <OrgInvitationInfo invitation={invitation} />}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <OrgInvitationForm
          form={form}
          email={invitation?.email || ""}
          isPending={acceptOrgInvitationMutation.isPending}
          onSubmit={onSubmit}
          onNavigateSignIn={() =>
            navigate(
              `/auth/sign-in?redirect=${encodeURIComponent(`/org-invite/${token}`)}`
            )
          }
        />
      </CardContent>
    </PageWrapper>
  );
};

export default AcceptOrgInvitation;
