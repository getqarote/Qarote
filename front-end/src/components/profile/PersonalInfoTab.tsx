import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  User,
  Mail,
  Calendar,
  Settings,
  Edit,
  Save,
  X,
  Crown,
} from "lucide-react";
import { UserProfile } from "@/lib/api/authTypes";
import { ProfileFormState, formatDate, getRoleColor } from "./profileUtils";

interface PersonalInfoTabProps {
  profile: UserProfile;
  editingProfile: boolean;
  profileForm: ProfileFormState;
  setProfileForm: (form: ProfileFormState) => void;
  setEditingProfile: (editing: boolean) => void;
  onUpdateProfile: () => void;
  isUpdating: boolean;
}

export const PersonalInfoTab = ({
  profile,
  editingProfile,
  profileForm,
  setProfileForm,
  setEditingProfile,
  onUpdateProfile,
  isUpdating,
}: PersonalInfoTabProps) => {
  return (
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
            <Badge className={getRoleColor(profile.role)}>{profile.role}</Badge>
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
              <Button onClick={onUpdateProfile} disabled={isUpdating}>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </>
          ) : (
            <Button onClick={() => setEditingProfile(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
