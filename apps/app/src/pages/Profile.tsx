import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { Crown, MessageSquare, Shield, User } from "lucide-react";
import { toast } from "sonner";

import { logger } from "@/lib/logger";

import { AppSidebar } from "@/components/AppSidebar";
import { FeedbackForm } from "@/components/FeedbackForm";
import {
  EnhancedTeamTab,
  InviteFormState,
  PersonalInfoTab,
  PlansSummaryTab,
  ProfileFormState,
  ProfileLoading,
  WorkspaceFormState,
  WorkspaceInfoTab,
} from "@/components/profile";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  useCancelEmailChange,
  useChangePassword,
  useProfile,
  useRequestEmailChange,
  useUpdateProfile,
  useVerificationStatus,
} from "@/hooks/queries/useProfile";
import {
  useInvitations,
  useRemoveUserFromWorkspace,
  useRevokeInvitation,
  useSendInvitation,
  useUpdateWorkspace,
  useWorkspaceUsers,
} from "@/hooks/queries/useWorkspaceApi";
import { useUser } from "@/hooks/ui/useUser";
import { useWorkspace } from "@/hooks/ui/useWorkspace";

// Valid tab values - defined outside component to avoid dependency issues
const VALID_TABS = [
  "personal",
  "workspace",
  "plans",
  "team",
  "feedback",
] as const;
type TabValue = (typeof VALID_TABS)[number];

const Profile = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { planData, userPlan } = useUser();
  const { workspace, refetch: refetchWorkspace } = useWorkspace();
  const { data: profileData, isLoading: profileLoading } = useProfile();
  const { data: workspaceUsersData, isLoading: usersLoading } =
    useWorkspaceUsers();
  const { data: invitationsData, isLoading: invitationsLoading } =
    useInvitations();
  const { data: verificationStatusData } = useVerificationStatus();
  const updateProfileMutation = useUpdateProfile();
  const updateWorkspaceMutation = useUpdateWorkspace();
  const sendInvitationMutation = useSendInvitation();
  const revokeInvitationMutation = useRevokeInvitation();
  const removeUserMutation = useRemoveUserFromWorkspace();
  const changePasswordMutation = useChangePassword();
  const requestEmailChangeMutation = useRequestEmailChange();
  const cancelEmailChangeMutation = useCancelEmailChange();

  const [editingProfile, setEditingProfile] = useState(false);
  const [editingWorkspace, setEditingWorkspace] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

  // Get initial tab from URL parameter or default to 'personal'
  const initialTab = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<TabValue>(
    VALID_TABS.includes(initialTab as TabValue)
      ? (initialTab as TabValue)
      : "personal"
  );

  // Update URL when tab changes
  const handleTabChange = (value: string) => {
    const newTab = value as TabValue;
    setActiveTab(newTab);
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev);
      newParams.set("tab", newTab);
      return newParams;
    });
  };

  // Profile form state
  const [profileForm, setProfileForm] = useState<ProfileFormState>({
    firstName: "",
    lastName: "",
  });

  // Workspace form state
  const [workspaceForm, setWorkspaceForm] = useState<WorkspaceFormState>({
    name: "",
    contactEmail: "",
  });

  // Invite form state
  const [inviteForm, setInviteForm] = useState<InviteFormState>({
    email: "",
    role: "MEMBER",
  });

  const profile = profileData?.user;
  const workspaceUsers = workspaceUsersData?.users || [];
  const invitations = invitationsData?.invitations || [];
  const isAdmin = profile?.role === "ADMIN";

  // Plan-based access control - use data from WorkspaceContext
  const planFeatures = planData?.planFeatures;
  const currentUserCount = workspaceUsers.length;
  const pendingInvitationCount = invitations.length;

  // Check if user can invite more users based on plan limits
  const canInviteMoreUsers = () => {
    if (!planFeatures?.maxUsers) return true; // Unlimited
    return currentUserCount + pendingInvitationCount < planFeatures.maxUsers;
  };

  // Initialize forms when profile data loads
  useEffect(() => {
    if (profile) {
      setProfileForm({
        firstName: profile.firstName || "",
        lastName: profile.lastName || "",
      });
    }
    if (workspace) {
      setWorkspaceForm({
        name: workspace.name || "",
        contactEmail: workspace.contactEmail || "",
      });
    }
  }, [profile, workspace]);

  // Sync tab state with URL parameter changes
  useEffect(() => {
    const urlTab = searchParams.get("tab");
    if (
      urlTab &&
      VALID_TABS.includes(urlTab as TabValue) &&
      urlTab !== activeTab
    ) {
      setActiveTab(urlTab as TabValue);
    }
  }, [searchParams, activeTab]);

  const handleUpdateProfile = async () => {
    try {
      await updateProfileMutation.mutateAsync(profileForm);
      setEditingProfile(false);
      toast.success("Profile updated successfully");
    } catch {
      toast.error("Failed to update profile");
    }
  };

  const handlePasswordChange = async (data: {
    currentPassword: string;
    newPassword: string;
  }) => {
    try {
      await changePasswordMutation.mutateAsync(data);
      toast.success("Password changed successfully");
    } catch (error) {
      logger.error("Password change error:", error);
      const errorMessage = extractErrorMessage(error);
      toast.error(errorMessage);
      throw error; // Re-throw to let the form handle it
    }
  };

  const handleEmailChangeRequest = async (data: {
    newEmail: string;
    password: string;
  }) => {
    try {
      await requestEmailChangeMutation.mutateAsync(data);
      toast.success("Verification email sent to your new email address");
    } catch (error) {
      logger.error("Email change request error:", error);
      const errorMessage = extractErrorMessage(error);
      toast.error(errorMessage);
      throw error; // Re-throw to let the form handle it
    }
  };

  const handleCancelEmailChange = async () => {
    try {
      await cancelEmailChangeMutation.mutateAsync();
      toast.success("Email change request cancelled");
    } catch (error) {
      logger.error("Cancel email change error:", error);
      const errorMessage = extractErrorMessage(error);
      toast.error(errorMessage);
      throw error; // Re-throw to let the form handle it
    }
  };

  const handleUpdateWorkspace = async () => {
    if (!workspace?.id) {
      toast.error("No workspace found");
      return;
    }
    try {
      await updateWorkspaceMutation.mutateAsync({
        workspaceId: workspace.id,
        ...workspaceForm,
      });
      setEditingWorkspace(false);
      await refetchWorkspace(); // Refresh workspace data
      toast.success("Workspace information updated successfully");
    } catch {
      toast.error("Failed to update workspace information");
    }
  };

  const handleInviteUser = async () => {
    if (!workspace?.id) {
      toast.error("No workspace found");
      return;
    }

    // Check plan limits before sending invitation
    if (!canInviteMoreUsers()) {
      const maxUsers = planFeatures.maxUsers;
      toast.error(
        `Cannot invite more users. Your ${userPlan} plan allows up to ${maxUsers} users. You currently have ${currentUserCount} users and ${pendingInvitationCount} pending invitations.`
      );
      return;
    }

    try {
      const result = await sendInvitationMutation.mutateAsync({
        email: inviteForm.email,
        role: inviteForm.role,
      });

      setInviteDialogOpen(false);
      setInviteForm({ email: "", role: "MEMBER" });

      toast.success(
        `Invitation sent successfully to ${inviteForm.email}! ${
          result.invitation.monthlyCost > 0
            ? `Additional cost: $${result.invitation.monthlyCost}/month.`
            : ""
        }`
      );
    } catch (error) {
      logger.error("Invitation error:", error);
      const errorMessage = extractErrorMessage(error);
      toast.error(errorMessage);
    }
  };

  const handleRevokeInvitation = async (
    invitationId: string,
    email: string
  ) => {
    try {
      await revokeInvitationMutation.mutateAsync(invitationId);
      toast.success(`Invitation to ${email} has been revoked`);
    } catch (error) {
      logger.error("Revoke invitation error:", error);
      const errorMessage = extractErrorMessage(error);
      toast.error(errorMessage);
    }
  };

  const handleRemoveUser = async (userId: string, userName: string) => {
    if (!workspace?.id) {
      toast.error("No workspace found");
      return;
    }
    try {
      await removeUserMutation.mutateAsync({
        workspaceId: workspace.id,
        userId,
      });
      toast.success(`${userName} has been removed from the workspace`);
    } catch (error) {
      logger.error("Remove user error:", error);
      const errorMessage = extractErrorMessage(error);
      toast.error(errorMessage);
    }
  };

  if (profileLoading) {
    return (
      <SidebarProvider>
        <div className="page-layout">
          <AppSidebar />
          <main className="main-content-scrollable">
            <ProfileLoading />
          </main>
        </div>
      </SidebarProvider>
    );
  }

  if (!profile) {
    return (
      <SidebarProvider>
        <div className="page-layout">
          <AppSidebar />
          <main className="main-content-scrollable">
            <div className="container mx-auto p-6">
              <Alert>
                <AlertDescription>
                  Failed to load profile information.
                </AlertDescription>
              </Alert>
            </div>
          </main>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="page-layout">
        <AppSidebar />
        <main className="main-content-scrollable">
          <div className="container mx-auto p-6 space-y-6">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <User className="h-8 w-8" />
              <h1 className="title-page">Profile</h1>
            </div>

            <Tabs
              value={activeTab}
              onValueChange={handleTabChange}
              className="space-y-6"
            >
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="personal">Personal Info</TabsTrigger>
                <TabsTrigger value="workspace">Workspace</TabsTrigger>
                <TabsTrigger value="plans">
                  <Crown className="h-4 w-4 mr-2" />
                  Plans
                </TabsTrigger>
                <TabsTrigger value="team" disabled={!isAdmin}>
                  Team {!isAdmin && <Shield className="h-4 w-4 ml-2" />}
                </TabsTrigger>
                <TabsTrigger value="feedback">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Send Feedback
                </TabsTrigger>
              </TabsList>

              <TabsContent value="personal" className="space-y-6">
                <PersonalInfoTab
                  profile={profile}
                  editingProfile={editingProfile}
                  profileForm={profileForm}
                  setProfileForm={setProfileForm}
                  setEditingProfile={setEditingProfile}
                  onUpdateProfile={handleUpdateProfile}
                  onPasswordChange={handlePasswordChange}
                  onEmailChangeRequest={handleEmailChangeRequest}
                  onCancelEmailChange={handleCancelEmailChange}
                  verificationStatus={verificationStatusData}
                  isUpdating={updateProfileMutation.isPending}
                  isChangingPassword={changePasswordMutation.isPending}
                  isRequestingEmailChange={requestEmailChangeMutation.isPending}
                  isCancellingEmailChange={cancelEmailChangeMutation.isPending}
                />
              </TabsContent>

              <TabsContent value="workspace" className="space-y-6">
                <WorkspaceInfoTab
                  workspace={workspace}
                  isAdmin={isAdmin}
                  editingWorkspace={editingWorkspace}
                  workspaceForm={workspaceForm}
                  setWorkspaceForm={setWorkspaceForm}
                  setEditingWorkspace={setEditingWorkspace}
                  onUpdateWorkspace={handleUpdateWorkspace}
                  isUpdating={updateWorkspaceMutation.isPending}
                />
              </TabsContent>

              <TabsContent value="plans" className="space-y-6">
                <PlansSummaryTab currentPlan={userPlan} />
              </TabsContent>

              <TabsContent value="team" className="space-y-6">
                <EnhancedTeamTab
                  isAdmin={isAdmin}
                  workspaceUsers={workspaceUsers}
                  invitations={invitations}
                  usersLoading={usersLoading}
                  invitationsLoading={invitationsLoading}
                  inviteDialogOpen={inviteDialogOpen}
                  setInviteDialogOpen={setInviteDialogOpen}
                  inviteForm={inviteForm}
                  setInviteForm={setInviteForm}
                  onInviteUser={handleInviteUser}
                  onRevokeInvitation={handleRevokeInvitation}
                  onRemoveUser={handleRemoveUser}
                  isInviting={sendInvitationMutation.isPending}
                  isRevoking={revokeInvitationMutation.isPending}
                  isRemoving={removeUserMutation.isPending}
                  userPlan={userPlan}
                  canInviteMoreUsers={canInviteMoreUsers()}
                />
              </TabsContent>

              <TabsContent value="feedback" className="space-y-6">
                <FeedbackForm />
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Profile;

// API Error types
interface ApiErrorResponse {
  error: string;
  planLimits?: {
    userLimit: string;
    invitationLimit: string;
    currentUsers: number;
    pendingInvitations: number;
  };
}

interface ApiError extends Error {
  response?: {
    data: ApiErrorResponse;
    status: number;
    statusText: string;
  };
}

// Helper function to extract error message from API response
const extractErrorMessage = (error: unknown): string => {
  let errorMessage = "Failed to send invitation";

  if (error && typeof error === "object" && "response" in error) {
    const apiError = error as ApiError;
    if (apiError.response?.data?.error) {
      errorMessage = apiError.response.data.error;

      // Handle plan limit errors with additional context
      if (apiError.response.data.planLimits) {
        const limits = apiError.response.data.planLimits;
        errorMessage += `. ${limits.userLimit}. Current: ${limits.currentUsers} users, ${limits.pendingInvitations} pending invitations.`;
      }
    } else if (apiError.response?.statusText) {
      errorMessage = `${errorMessage}: ${apiError.response.statusText}`;
    }
  } else if (error && typeof error === "object" && "message" in error) {
    const genericError = error as Error;
    errorMessage = genericError.message;
  }

  return errorMessage;
};
