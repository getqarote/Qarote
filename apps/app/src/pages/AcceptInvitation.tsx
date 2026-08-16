import { useEffect, useReducer } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router";

import { zodResolver } from "@hookform/resolvers/zod";
import { Building, Loader2, Users } from "lucide-react";
import { toast } from "sonner";

import { identify, track } from "@/lib/analytics";
import { authClient } from "@/lib/auth-client";
import { logger } from "@/lib/logger";
import { trpc } from "@/lib/trpc/client";

import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import { InviteAcceptanceForm } from "@/components/auth/InviteAcceptanceForm";
import {
  type InviteInfoField,
  InviteInfoPanel,
} from "@/components/auth/InviteInfoPanel";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

import { useAuth } from "@/contexts/AuthContextDefinition";

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
  alreadyMember?: boolean;
}

type InvitationState = {
  invitation: InvitationDetails | null;
  loading: boolean;
  error: string | null;
};

type InvitationAction =
  | { type: "FETCH_SUCCESS"; invitation: InvitationDetails }
  | { type: "FETCH_ERROR"; error: string }
  | { type: "SET_ERROR"; error: string };

const initialState: InvitationState = {
  invitation: null,
  loading: true,
  error: null,
};

function invitationReducer(
  state: InvitationState,
  action: InvitationAction
): InvitationState {
  switch (action.type) {
    case "FETCH_SUCCESS":
      return { invitation: action.invitation, loading: false, error: null };
    case "FETCH_ERROR":
      return { invitation: null, loading: false, error: action.error };
    case "SET_ERROR":
      return { ...state, error: action.error };
  }
}

const PLAN_DISPLAY_NAMES: Record<string, string> = {
  FREE: "Free",
  DEVELOPER: "Developer",
  ENTERPRISE: "Enterprise",
};

/**
 * Workspace-level invitation acceptance page. Reached via
 * `/invite/:token`. Fetches the invitation details, presents the
 * workspace name + plan + inviter, and collects the new user's
 * name + password to create their account and log them in.
 *
 * The related `AcceptOrgInvitation` page handles organization-level
 * invitations and shares the `AuthPageWrapper`, `AuthPageHeader`,
 * `InviteInfoPanel`, and `InviteAcceptanceForm` components.
 */
const AcceptInvitation = () => {
  const { t } = useTranslation("auth");
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user: authUser, login } = useAuth();
  const acceptInvitationMutation = trpc.public.invitation.accept.useMutation();
  const acceptAuthInvitationMutation =
    trpc.auth.invitation.acceptInvitation.useMutation();
  const utils = trpc.useUtils();

  const [{ invitation, loading, error }, dispatch] = useReducer(
    invitationReducer,
    initialState
  );

  const form = useForm<AcceptInvitationFormData>({
    resolver: zodResolver(acceptInvitationSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      password: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    const fetchInvitationDetails = async () => {
      if (!token) {
        dispatch({ type: "FETCH_ERROR", error: t("invalidInvitationLink") });
        return;
      }
      try {
        const response = await utils.public.invitation.getDetails.fetch({
          token,
        });
        if (response.success) {
          dispatch({ type: "FETCH_SUCCESS", invitation: response.invitation });
        } else {
          dispatch({
            type: "FETCH_ERROR",
            error: t("invalidOrExpiredInvitation"),
          });
        }
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error ? err.message : t("failedLoadInvitation");
        dispatch({ type: "FETCH_ERROR", error: errorMessage });
      }
    };

    fetchInvitationDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const onSubmit = (data: AcceptInvitationFormData) => {
    if (!token) return;

    acceptInvitationMutation.mutate(
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
            identify({
              id: user.id,
              email: user.email,
              workspaceId: user.workspaceId ?? undefined,
              signupAt: user.createdAt,
            });
            track("invitation_accepted", {
              workspace_id: invitation?.workspace.id,
              workspace_name: invitation?.workspace.name,
              role: invitation?.role,
            });

            toast(t("welcomeToQarote"), {
              description: t("successfullyJoinedWorkspace", {
                workspace: invitation?.workspace.name,
              }),
            });

            navigate("/", { replace: true });
          } catch (err) {
            logger.error("Failed to sign in after accepting invitation:", err);
            toast(t("invitationAccepted"), {
              description: t("signInToAccess"),
            });
            navigate("/auth/sign-in", { replace: true });
          }
        },
        onError: (err: unknown) => {
          const errorMessage =
            err instanceof Error ? err.message : t("failedAcceptInvitation");
          dispatch({ type: "SET_ERROR", error: errorMessage });
        },
      }
    );
  };

  // Signed-in user with a matching email accepts directly (password-less —
  // the session already proves identity).
  const handleAuthAccept = () => {
    if (!token) return;
    dispatch({ type: "SET_ERROR", error: "" });
    acceptAuthInvitationMutation.mutate(
      { token },
      {
        onSuccess: () => {
          track("invitation_accepted", {
            workspace_id: invitation?.workspace.id,
            workspace_name: invitation?.workspace.name,
            role: invitation?.role,
          });
          toast(t("welcomeToQarote"), {
            description: t("successfullyJoinedWorkspace", {
              workspace: invitation?.workspace.name,
            }),
          });
          // Hard nav so the new active workspace is picked up everywhere.
          window.location.href = "/";
        },
        onError: (err: unknown) => {
          dispatch({
            type: "SET_ERROR",
            error:
              err instanceof Error ? err.message : t("failedAcceptInvitation"),
          });
        },
      }
    );
  };

  const eyebrow = (
    <p className="mb-3 select-none font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-primary">
      {t("panelEyebrow")}
    </p>
  );

  if (loading) {
    return (
      <AuthSplitLayout>
        <div
          className="flex items-center justify-center py-10"
          role="status"
          aria-live="polite"
        >
          <Loader2
            className="h-7 w-7 animate-spin text-primary"
            aria-hidden="true"
          />
        </div>
      </AuthSplitLayout>
    );
  }

  if (error && !invitation) {
    return (
      <AuthSplitLayout
        header={
          <div className="mb-6">
            {eyebrow}
            <h1 className="font-heading text-[clamp(26px,3vw,32px)] font-bold leading-[1.15] tracking-tight">
              {t("invalidInvitation")}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {error}
            </p>
          </div>
        }
      >
        <Button
          onClick={() => navigate("/auth/sign-in")}
          className="btn-primary h-11 w-full"
        >
          {t("goToSignIn")}
        </Button>
      </AuthSplitLayout>
    );
  }

  const planDisplayName =
    PLAN_DISPLAY_NAMES[invitation?.workspace.plan as string] ||
    invitation?.workspace.plan ||
    "";

  const infoFields: InviteInfoField[] = invitation
    ? [
        {
          Icon: Building,
          label: `${t("workspace")}:`,
          value: invitation.workspace.name,
        },
        {
          Icon: Users,
          label: `${t("plan")}:`,
          value: planDisplayName,
        },
        {
          label: `${t("invitedBy")}:`,
          value: invitation.invitedBy.displayName,
        },
      ]
    : [];

  const headerBlock = (title: string, description: string) => (
    <div className="mb-6">
      {eyebrow}
      <h1 className="font-heading text-[clamp(26px,3vw,32px)] font-bold leading-[1.15] tracking-tight">
        {title}
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
    </div>
  );

  // ── Signed-in flows ───────────────────────────────────────────────────────
  if (authUser && invitation) {
    const sameEmail =
      authUser.email.toLowerCase().trim() ===
      invitation.email.toLowerCase().trim();

    // Wrong account — signed in as a different email than the invite
    if (!sameEmail) {
      return (
        <AuthSplitLayout
          header={headerBlock(
            t("joinQaroteTitle"),
            t("wrongAccountDescription", { email: invitation.email })
          )}
        >
          <div className="space-y-6">
            <InviteInfoPanel fields={infoFields} />
            <div className="space-y-3">
              <Button
                className="btn-primary h-11 w-full"
                onClick={async () => {
                  await authClient.signOut();
                  navigate(`/auth/sign-in?redirect=/invite/${token}`);
                }}
              >
                {t("switchAccount")}
              </Button>
              <Button asChild variant="ghost" className="h-11 w-full">
                <Link to="/">{t("goToDashboard")}</Link>
              </Button>
            </div>
          </div>
        </AuthSplitLayout>
      );
    }

    // Already a member of this workspace
    if (invitation.alreadyMember) {
      return (
        <AuthSplitLayout
          header={headerBlock(
            t("alreadyMemberTitle", { workspace: invitation.workspace.name }),
            t("alreadyMemberDescription")
          )}
        >
          <Button
            className="btn-primary h-11 w-full"
            onClick={() => {
              window.location.href = "/";
            }}
          >
            {t("goToWorkspace")}
          </Button>
        </AuthSplitLayout>
      );
    }

    // Direct accept (password-less)
    return (
      <AuthSplitLayout
        header={headerBlock(
          t("joinQaroteTitle"),
          t("acceptInvitationDescription")
        )}
      >
        <div className="space-y-6">
          <InviteInfoPanel fields={infoFields} />
          {error && (
            <Alert variant="destructive" aria-live="assertive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Button
            className="btn-primary h-11 w-full"
            onClick={handleAuthAccept}
            disabled={acceptAuthInvitationMutation.isPending}
          >
            {acceptAuthInvitationMutation.isPending ? (
              <>
                <Loader2
                  className="mr-2 h-4 w-4 animate-spin"
                  aria-hidden="true"
                />
                {t("accepting")}
              </>
            ) : (
              t("acceptInvitation")
            )}
          </Button>
        </div>
      </AuthSplitLayout>
    );
  }

  // ── Signed-out flow (registration) ────────────────────────────────────────
  return (
    <AuthSplitLayout
      header={
        <div className="mb-6">
          {eyebrow}
          <h1 className="font-heading text-[clamp(26px,3vw,32px)] font-bold leading-[1.15] tracking-tight">
            {t("joinQaroteTitle")}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {t("setUpAccount")}
          </p>
        </div>
      }
    >
      <div className="space-y-6">
        {invitation && <InviteInfoPanel fields={infoFields} />}

        {error && (
          <Alert variant="destructive" aria-live="assertive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <InviteAcceptanceForm
          form={form}
          email={invitation?.email || ""}
          isPending={acceptInvitationMutation.isPending}
          onSubmit={onSubmit}
          onNavigateSignIn={() =>
            navigate(`/auth/sign-in?redirect=/invite/${token}`)
          }
        />
      </div>
    </AuthSplitLayout>
  );
};

export default AcceptInvitation;
