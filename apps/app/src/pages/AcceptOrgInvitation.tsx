import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router";

import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, CheckCircle2, Loader2, Mail, Shield } from "lucide-react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";
import { logger } from "@/lib/logger";
import { trpc } from "@/lib/trpc/client";

import { AuthPageHeader } from "@/components/auth/AuthPageHeader";
import { AuthPageWrapper } from "@/components/auth/AuthPageWrapper";
import { GoogleLoginButton } from "@/components/auth/GoogleLoginButton";
import { InviteAcceptanceForm } from "@/components/auth/InviteAcceptanceForm";
import {
  type InviteInfoField,
  InviteInfoPanel,
} from "@/components/auth/InviteInfoPanel";
import { SSOLoginButton } from "@/components/auth/SSOLoginButton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";

import { useAuth } from "@/contexts/AuthContextDefinition";

import {
  useAcceptOrgInvitationAuth,
  useAcceptOrgInvitationPublic,
} from "@/hooks/queries/useOrganization";
import {
  type OrgInvitationDetails,
  useOrgInvitationDetails,
} from "@/hooks/queries/useOrgInvitationDetails";
import { useShowAlternativeAuth } from "@/hooks/queries/useSsoConfig";
import { useSwitchWorkspace } from "@/hooks/queries/useWorkspaceApi";

import {
  type AcceptInvitationFormData,
  acceptInvitationSchema,
} from "@/schemas";

const ROLE_DISPLAY_NAMES: Record<string, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  MEMBER: "Member",
};

/**
 * Builds the role/org info fields shown in the `InviteInfoPanel`.
 * Derived from the invitation rather than passed as props so all
 * three render branches (authed / existing-user / new-user) render
 * the exact same fields without repeated JSX.
 */
function buildInviteInfoFields(
  invitation: OrgInvitationDetails,
  t: (key: string, fallback?: string) => string
): InviteInfoField[] {
  const fields: InviteInfoField[] = [
    {
      Icon: Building2,
      label: t("orgLabel"),
      value: invitation.organization.name,
    },
    {
      Icon: Shield,
      label: `${t("role", "Role")}:`,
      value: ROLE_DISPLAY_NAMES[invitation.role] || invitation.role,
    },
  ];

  if (invitation.invitedBy) {
    fields.push({
      label: `${t("invitedBy")}:`,
      value: invitation.invitedBy.displayName,
    });
  }

  return fields;
}

/**
 * OAuth section rendered on the new-user registration and
 * existing-user sign-in branches. Only renders when the server
 * reports that alternative auth (Google/SSO) is enabled — otherwise
 * returns null so there's no dead divider hanging around.
 */
function OAuthSection({
  mode,
  callbackURL,
  onBeforeRedirect,
  onError,
}: {
  mode: "signin" | "signup";
  callbackURL?: string;
  onBeforeRedirect: () => void;
  onError: (msg: string) => void;
}) {
  const { t } = useTranslation("auth");
  const { showAlternativeAuth } = useShowAlternativeAuth();

  if (!showAlternativeAuth) return null;

  return (
    <div className="space-y-3">
      <GoogleLoginButton
        mode={mode}
        callbackURL={callbackURL}
        onBeforeRedirect={onBeforeRedirect}
        onError={onError}
      />
      <SSOLoginButton
        mode={mode}
        callbackURL={callbackURL}
        onBeforeRedirect={onBeforeRedirect}
        onError={onError}
      />
      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">
            {t("orContinueWith")}
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Organization-level invitation acceptance page. Reached via
 * `/org-invite/:token`. More complex than `AcceptInvitation` because
 * it has FOUR distinct render branches depending on the caller's
 * current auth state:
 *
 *   1. **Loading** — still fetching invitation details
 *   2. **Error** — invalid/expired token, no invitation to show
 *   3. **Authed** — user is already signed in, just needs to
 *      confirm acceptance (shows a success pane afterwards with a
 *      "switch workspaces" button)
 *   4. **Existing user** — server says this email already has an
 *      account, offer sign-in with a fallback to register instead
 *   5. **New user** — registration form (via the shared
 *      `InviteAcceptanceForm`)
 *
 * The shared `AuthPageWrapper`, `AuthPageHeader`, `InviteInfoPanel`,
 * and `InviteAcceptanceForm` components eliminate ~200 lines of
 * duplication with the cousin `AcceptInvitation` page.
 */
const AcceptOrgInvitation = () => {
  const { t } = useTranslation("auth");
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
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

  const oauthCallbackURL = token
    ? `${window.location.origin}/auth/sso/callback?orgInviteToken=${encodeURIComponent(token)}`
    : undefined;

  const storeTokenFallback = () => {
    try {
      if (token) sessionStorage.setItem("pendingOrgInviteToken", token);
    } catch {
      // Best-effort — Safari private browsing may throw
    }
  };

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

  // ── Authed user acceptance ─────────────────────────────────────
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

  // ── New user registration submission ───────────────────────────
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

            toast(t("welcomeToQarote"), {
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
            toast(t("invitationAccepted"), {
              description: t("orgSignInToAccess"),
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

  // ── Render branches ────────────────────────────────────────────

  if (loading) {
    return (
      <AuthPageWrapper>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" aria-hidden="true" />
        </CardContent>
      </AuthPageWrapper>
    );
  }

  if (error && !invitation) {
    return (
      <AuthPageWrapper>
        <AuthPageHeader
          Icon={Mail}
          title={t("invalidInvitation")}
          description={error}
          variant="destructive"
        />
        <CardContent>
          <Button onClick={() => navigate("/auth/sign-in")} className="w-full">
            {t("goToSignIn")}
          </Button>
        </CardContent>
      </AuthPageWrapper>
    );
  }

  const infoFields = invitation ? buildInviteInfoFields(invitation, t) : [];

  // Authed user flow — already signed in, just confirm acceptance
  if (authUser) {
    if (acceptSuccess) {
      return (
        <AuthPageWrapper>
          <AuthPageHeader
            Icon={CheckCircle2}
            title={t("youJoinedOrg", { org: acceptSuccess.orgName })}
            variant="success"
          />
          <CardContent className="space-y-3">
            {acceptSuccess.firstWorkspaceId && (
              <Button
                className="w-full"
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
                    <Loader2
                      className="h-4 w-4 animate-spin mr-2"
                      aria-hidden="true"
                    />
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
        </AuthPageWrapper>
      );
    }

    return (
      <AuthPageWrapper>
        <AuthPageHeader
          Icon={Building2}
          title={t("joinOrganization")}
          description={t("acceptOrgInvitationDescription")}
        />
        <CardContent className="space-y-6">
          {invitation && <InviteInfoPanel fields={infoFields} />}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Button
            className="w-full"
            onClick={handleAuthAccept}
            disabled={acceptAuthOrgInvitationMutation.isPending}
          >
            {acceptAuthOrgInvitationMutation.isPending ? (
              <>
                <Loader2
                  className="h-4 w-4 animate-spin mr-2"
                  aria-hidden="true"
                />
                {t("accepting")}
              </>
            ) : (
              t("acceptInvitation")
            )}
          </Button>
        </CardContent>
      </AuthPageWrapper>
    );
  }

  // Existing user — prompt to sign in rather than register again
  if (invitation?.userExists && !forceRegistration) {
    return (
      <AuthPageWrapper>
        <AuthPageHeader
          Icon={Building2}
          title={t("joinOrganization")}
          description={t("existingAccountMessage")}
        />
        <CardContent className="space-y-6">
          <InviteInfoPanel fields={infoFields} />

          <OAuthSection
            mode="signin"
            callbackURL={oauthCallbackURL}
            onBeforeRedirect={storeTokenFallback}
            onError={(msg) => setMutationError(msg)}
          />

          <Button
            className="w-full"
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
              className="text-sm text-muted-foreground hover:underline underline-offset-2"
            >
              {t("dontHaveAccountCreate")}
            </button>
          </div>
        </CardContent>
      </AuthPageWrapper>
    );
  }

  // New user registration flow
  return (
    <AuthPageWrapper>
      <AuthPageHeader
        Icon={Mail}
        title={t("joinOrganization")}
        description={t("orgSetUpAccount")}
      />
      <CardContent className="space-y-6">
        {invitation && <InviteInfoPanel fields={infoFields} />}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <OAuthSection
          mode="signup"
          callbackURL={oauthCallbackURL}
          onBeforeRedirect={storeTokenFallback}
          onError={(msg) => setMutationError(msg)}
        />

        <InviteAcceptanceForm
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
    </AuthPageWrapper>
  );
};

export default AcceptOrgInvitation;
