import { useTranslation } from "react-i18next";

import { Save, X } from "lucide-react";

import { UserProfile } from "@/lib/api/authTypes";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PixelCalendar } from "@/components/ui/pixel-calendar";
import { PixelEmail } from "@/components/ui/pixel-email";
import { PixelKey } from "@/components/ui/pixel-key";
import { PixelSettings } from "@/components/ui/pixel-settings";
import { Separator } from "@/components/ui/separator";

import { CompactEmailChangeForm } from "./CompactEmailChangeForm";
import { CompactPasswordChangeForm } from "./CompactPasswordChangeForm";
import { formatDate, ProfileFormState } from "./profileUtils";

interface PersonalInfoTabProps {
  profile: UserProfile;
  editingProfile: boolean;
  profileForm: ProfileFormState;
  setProfileForm: (form: ProfileFormState) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onUpdateProfile: () => void;
  onPasswordChange: (data: {
    currentPassword: string;
    newPassword: string;
  }) => Promise<void>;
  onEmailChangeRequest: (data: {
    newEmail: string;
    password: string;
  }) => Promise<void>;
  onCancelEmailChange: () => Promise<void>;
  verificationStatus?: {
    pendingEmail: string | null;
    hasPendingEmailChange: boolean;
  };
  isUpdating: boolean;
  isChangingPassword?: boolean;
  isRequestingEmailChange?: boolean;
  isCancellingEmailChange?: boolean;
  emailEnabled?: boolean;
}

export const PersonalInfoTab = ({
  profile,
  editingProfile,
  profileForm,
  setProfileForm,
  onStartEdit,
  onCancelEdit,
  onUpdateProfile,
  onPasswordChange,
  onEmailChangeRequest,
  onCancelEmailChange,
  verificationStatus,
  isUpdating,
  isChangingPassword = false,
  isRequestingEmailChange = false,
  isCancellingEmailChange = false,
  emailEnabled = true,
}: PersonalInfoTabProps) => {
  const { t } = useTranslation("profile");
  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between px-4 py-3 bg-muted/30 border-b border-border">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar className="h-10 w-10">
              <AvatarImage src={profile.image || ""} />
              <AvatarFallback>
                {profile.firstName?.[0]}
                {profile.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="title-section truncate">
                  {profile.firstName} {profile.lastName}
                </h2>
                <Badge variant="soft-primary">
                  {profile.role.charAt(0) + profile.role.slice(1).toLowerCase()}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground truncate">
                {profile.email}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {editingProfile ? (
              <>
                <Button
                  variant="outline"
                  onClick={onCancelEdit}
                  disabled={isUpdating}
                  className="h-9"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                  <span className="hidden sm:inline">
                    {t("personal.cancel")}
                  </span>
                </Button>
                <Button
                  onClick={onUpdateProfile}
                  disabled={isUpdating}
                  className="btn-primary h-9"
                >
                  <Save className="h-4 w-4" aria-hidden="true" />
                  <span className="hidden sm:inline">
                    {t("personal.saveChanges")}
                  </span>
                </Button>
              </>
            ) : (
              <Button onClick={onStartEdit} className="btn-primary h-9">
                {t("personal.editProfile")}
              </Button>
            )}
          </div>
        </div>
        <div className="p-4 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">{t("personal.firstName")}</Label>
              {editingProfile ? (
                <Input
                  id="firstName"
                  value={profileForm.firstName}
                  onChange={(e) =>
                    setProfileForm({
                      ...profileForm,
                      firstName: e.target.value,
                    })
                  }
                />
              ) : (
                <p className="text-sm p-2 border rounded-md bg-muted">
                  {profile.firstName || t("personal.notSet")}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">{t("personal.lastName")}</Label>
              {editingProfile ? (
                <Input
                  id="lastName"
                  value={profileForm.lastName}
                  onChange={(e) =>
                    setProfileForm({
                      ...profileForm,
                      lastName: e.target.value,
                    })
                  }
                />
              ) : (
                <p className="text-sm p-2 border rounded-md bg-muted">
                  {profile.lastName || t("personal.notSet")}
                </p>
              )}
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <PixelEmail className="h-4" />
              <span>
                {t("personal.email")} {profile.email}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <PixelCalendar className="h-4 w-auto shrink-0" />
              <span>
                {t("personal.joined")} {formatDate(profile.createdAt)}
              </span>
            </div>
            {profile.lastLogin && (
              <div className="flex items-center gap-2">
                <PixelSettings className="h-4" />
                <span>
                  {t("personal.lastLogin")} {formatDate(profile.lastLogin)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Security Settings Section - Show only for password-based accounts */}
      {profile.authProvider === "password" && (
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="px-4 py-3 bg-muted/30 border-b border-border">
            <h2 className="title-section flex items-center gap-2">
              <PixelSettings className="h-5" />
              {t("personal.securitySettings")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t("personal.securityDescription")}
            </p>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:divide-x lg:divide-border">
              {/* Password Change Section */}
              <div className="space-y-3 lg:pr-6 flex flex-col">
                <div className="flex items-center gap-2 pb-1">
                  <PixelKey className="h-4 text-muted-foreground" />
                  <h3 className="font-medium">
                    {t("personal.changePassword")}
                  </h3>
                </div>
                <div className="flex-1">
                  <CompactPasswordChangeForm
                    onPasswordChange={onPasswordChange}
                    isLoading={isChangingPassword}
                  />
                </div>
              </div>

              {/* Email Change Section */}
              <div className="space-y-3 lg:pl-6 flex flex-col">
                <div className="flex items-center gap-2 pb-1">
                  <PixelEmail className="h-4 text-muted-foreground" />
                  <h3 className="font-medium">{t("personal.emailAddress")}</h3>
                </div>
                <div className="flex-1">
                  <CompactEmailChangeForm
                    currentEmail={profile.email}
                    pendingEmail={verificationStatus?.pendingEmail}
                    hasPendingEmailChange={
                      verificationStatus?.hasPendingEmailChange
                    }
                    onEmailChangeRequest={onEmailChangeRequest}
                    onCancelEmailChange={onCancelEmailChange}
                    isLoading={isRequestingEmailChange}
                    isCancelling={isCancellingEmailChange}
                    emailEnabled={emailEnabled}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
