import { useState } from "react";
import { useTranslation } from "react-i18next";

import { toast } from "sonner";

import { logger } from "@/lib/logger";

import {
  PersonalInfoTab,
  ProfileFormState,
  ProfileLoading,
} from "@/components/profile";
import { Alert, AlertDescription } from "@/components/ui/alert";

import {
  useCancelEmailChange,
  useChangePassword,
  useProfile,
  useRequestEmailChange,
  useUpdateProfile,
  useVerificationStatus,
} from "@/hooks/queries/useProfile";

import { extractErrorMessage } from "./utils";

const ProfileSection = () => {
  const { t } = useTranslation("profile");
  const { data: profileData, isLoading: profileLoading } = useProfile();
  const { data: verificationStatusData } = useVerificationStatus();
  const updateProfileMutation = useUpdateProfile();
  const changePasswordMutation = useChangePassword();
  const requestEmailChangeMutation = useRequestEmailChange();
  const cancelEmailChangeMutation = useCancelEmailChange();

  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState<ProfileFormState>({
    firstName: "",
    lastName: "",
  });

  const profile = profileData?.user;

  // Initialize form when profile data first loads
  const [prevProfileId, setPrevProfileId] = useState<string | null>(null);
  if (profile?.id && profile.id !== prevProfileId) {
    setPrevProfileId(profile.id);
    setProfileForm({
      firstName: profile.firstName || "",
      lastName: profile.lastName || "",
    });
  }

  const handleUpdateProfile = async () => {
    try {
      await updateProfileMutation.mutateAsync(profileForm);
      setEditingProfile(false);
      toast.success(t("toast.profileUpdated"));
    } catch {
      toast.error(t("toast.profileUpdateFailed"));
    }
  };

  const handlePasswordChange = async (data: {
    currentPassword: string;
    newPassword: string;
  }) => {
    try {
      await changePasswordMutation.mutateAsync(data);
      toast.success(t("toast.passwordChanged"));
    } catch (error) {
      logger.error("Password change error:", error);
      const errorMessage = extractErrorMessage(error);
      toast.error(errorMessage);
      throw error;
    }
  };

  const handleEmailChangeRequest = async (data: {
    newEmail: string;
    password: string;
  }) => {
    try {
      await requestEmailChangeMutation.mutateAsync(data);
      toast.success(t("toast.verificationEmailSent"));
    } catch (error) {
      logger.error("Email change request error:", error);
      const errorMessage = extractErrorMessage(error);
      toast.error(errorMessage);
      throw error;
    }
  };

  const handleCancelEmailChange = async () => {
    try {
      await cancelEmailChangeMutation.mutateAsync();
      toast.success(t("toast.emailChangeCancelled"));
    } catch (error) {
      logger.error("Cancel email change error:", error);
      const errorMessage = extractErrorMessage(error);
      toast.error(errorMessage);
      throw error;
    }
  };

  if (profileLoading) {
    return <ProfileLoading />;
  }

  if (!profile) {
    return (
      <Alert>
        <AlertDescription>{t("failedToLoad")}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
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
    </div>
  );
};

export default ProfileSection;
