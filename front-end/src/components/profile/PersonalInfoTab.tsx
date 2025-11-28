import {
  Calendar,
  Crown,
  Edit,
  Lock,
  Mail,
  Save,
  Settings,
  X,
} from "lucide-react";

import { UserProfile } from "@/lib/api/authTypes";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
import { Separator } from "@/components/ui/separator";

import { CompactEmailChangeForm } from "./CompactEmailChangeForm";
import { CompactPasswordChangeForm } from "./CompactPasswordChangeForm";
import { formatDate, getRoleColor, ProfileFormState } from "./profileUtils";

interface PersonalInfoTabProps {
  profile: UserProfile;
  editingProfile: boolean;
  profileForm: ProfileFormState;
  setProfileForm: (form: ProfileFormState) => void;
  setEditingProfile: (editing: boolean) => void;
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
}

export const PersonalInfoTab = ({
  profile,
  editingProfile,
  profileForm,
  setProfileForm,
  setEditingProfile,
  onUpdateProfile,
  onPasswordChange,
  onEmailChangeRequest,
  onCancelEmailChange,
  verificationStatus,
  isUpdating,
  isChangingPassword = false,
  isRequestingEmailChange = false,
  isCancellingEmailChange = false,
}: PersonalInfoTabProps) => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Avatar className="h-10 w-10">
                <AvatarImage src="" />
                <AvatarFallback>
                  {profile.firstName?.[0]}
                  {profile.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-xl font-semibold">
                  {profile.firstName} {profile.lastName}
                </h2>
                <p className="text-sm text-muted-foreground">{profile.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={getRoleColor(profile.role)}>
                {profile.role}
              </Badge>
              {profile.role === "ADMIN" && (
                <Crown className="h-4 w-4 text-yellow-500" />
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
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
                  {profile.firstName || "Not set"}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
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
                  {profile.lastName || "Not set"}
                </p>
              )}
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              <span>Email: {profile.email}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>Joined: {formatDate(profile.createdAt)}</span>
            </div>
            {profile.lastLogin && (
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                <span>Last login: {formatDate(profile.lastLogin)}</span>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            {editingProfile ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => setEditingProfile(false)}
                  disabled={isUpdating}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  onClick={onUpdateProfile}
                  disabled={isUpdating}
                  className="btn-primary"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </>
            ) : (
              <Button
                onClick={() => setEditingProfile(true)}
                className="btn-primary"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Security Settings Section - Only show for non-Google OAuth users */}
      {!profile.googleId ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Security Settings
            </CardTitle>
            <CardDescription>
              Manage your password and email address for account security
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:divide-x lg:divide-border">
              {/* Password Change Section */}
              <div className="space-y-3 lg:pr-6 flex flex-col">
                <div className="flex items-center gap-2 pb-1">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-medium">Change Password</h3>
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
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-medium">Email Address</h3>
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
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Account Security
            </CardTitle>
            <CardDescription>Your account is managed by Google</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full">
                <svg
                  className="w-5 h-5 text-blue-600"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  Google Account
                </p>
                <p className="text-sm text-muted-foreground">
                  To change your password or email address, please update your
                  Google account settings.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
