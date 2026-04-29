import { useEffect, useReducer } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router";

import { zodResolver } from "@hookform/resolvers/zod";
import { usePostHog } from "@posthog/react";
import { Building, Loader2, Mail, Users } from "lucide-react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";
import { logger } from "@/lib/logger";
import { trpc } from "@/lib/trpc/client";

import { AuthPageHeader } from "@/components/auth/AuthPageHeader";
import { AuthPageWrapper } from "@/components/auth/AuthPageWrapper";
import { InviteAcceptanceForm } from "@/components/auth/InviteAcceptanceForm";
import {
  type InviteInfoField,
  InviteInfoPanel,
} from "@/components/auth/InviteInfoPanel";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";

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
  const posthog = usePostHog();
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { login } = useAuth();
  const acceptInvitationMutation = trpc.public.invitation.accept.useMutation();
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
            posthog?.identify(user.id, { email: user.email });
            posthog?.capture("invitation_accepted", {
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

  return (
    <AuthPageWrapper>
      <AuthPageHeader
        Icon={Mail}
        title={t("joinQaroteTitle")}
        description={t("setUpAccount")}
      />

      <CardContent className="space-y-6">
        {invitation && <InviteInfoPanel fields={infoFields} />}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <InviteAcceptanceForm
          form={form}
          email={invitation?.email || ""}
          isPending={acceptInvitationMutation.isPending}
          onSubmit={onSubmit}
          onNavigateSignIn={() => navigate("/auth/sign-in")}
        />
      </CardContent>
    </AuthPageWrapper>
  );
};

export default AcceptInvitation;
