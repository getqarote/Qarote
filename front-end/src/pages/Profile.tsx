import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { User, Shield } from "lucide-react";
import {
  useProfile,
  useUpdateProfile,
  useUpdateCompany,
  useCompanyUsers,
  useInviteUser,
} from "@/hooks/useApi";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  PersonalInfoTab,
  CompanyInfoTab,
  TeamTab,
  ProfileLoading,
  ProfileFormState,
  CompanyFormState,
  InviteFormState,
} from "@/components/profile";

const Profile = () => {
  const { user } = useAuth();
  const { data: profileData, isLoading: profileLoading } = useProfile();
  const { data: companyUsersData, isLoading: usersLoading } = useCompanyUsers();
  const updateProfileMutation = useUpdateProfile();
  const updateCompanyMutation = useUpdateCompany();
  const inviteUserMutation = useInviteUser();

  const [editingProfile, setEditingProfile] = useState(false);
  const [editingCompany, setEditingCompany] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

  // Profile form state
  const [profileForm, setProfileForm] = useState<ProfileFormState>({
    firstName: "",
    lastName: "",
  });

  // Company form state
  const [companyForm, setCompanyForm] = useState<CompanyFormState>({
    name: "",
    contactEmail: "",
    logoUrl: "",
    planType: "FREE",
  });

  // Invite form state
  const [inviteForm, setInviteForm] = useState<InviteFormState>({
    email: "",
    role: "USER",
  });

  const profile = profileData?.profile;
  const company = profile?.company;
  const companyUsers = companyUsersData?.users || [];
  const isAdmin = profile?.role === "ADMIN";

  // Initialize forms when profile data loads
  useEffect(() => {
    if (profile) {
      setProfileForm({
        firstName: profile.firstName || "",
        lastName: profile.lastName || "",
      });
    }
    if (company) {
      setCompanyForm({
        name: company.name || "",
        contactEmail: company.contactEmail || "",
        logoUrl: company.logoUrl || "",
        planType: company.planType as "FREE" | "PREMIUM" | "ENTERPRISE",
      });
    }
  }, [profile, company]);

  const handleUpdateProfile = async () => {
    try {
      await updateProfileMutation.mutateAsync(profileForm);
      setEditingProfile(false);
      toast.success("Profile updated successfully");
    } catch (error) {
      toast.error("Failed to update profile");
    }
  };

  const handleUpdateCompany = async () => {
    try {
      await updateCompanyMutation.mutateAsync(companyForm);
      setEditingCompany(false);
      toast.success("Company information updated successfully");
    } catch (error) {
      toast.error("Failed to update company information");
    }
  };

  const handleInviteUser = async () => {
    try {
      await inviteUserMutation.mutateAsync(inviteForm);
      setInviteDialogOpen(false);
      setInviteForm({ email: "", role: "USER" });
      toast.success("Invitation sent successfully");
    } catch (error) {
      toast.error("Failed to send invitation");
    }
  };

  if (profileLoading) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-gradient-to-br from-slate-50 to-blue-50">
          <AppSidebar />
          <main className="flex-1 p-6 overflow-auto">
            <ProfileLoading />
          </main>
        </div>
      </SidebarProvider>
    );
  }

  if (!profile) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-gradient-to-br from-slate-50 to-blue-50">
          <AppSidebar />
          <main className="flex-1 p-6 overflow-auto">
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
      <div className="min-h-screen flex w-full bg-gradient-to-br from-slate-50 to-blue-50">
        <AppSidebar />
        <main className="flex-1 p-6 overflow-auto">
          <div className="container mx-auto p-6 space-y-6">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <User className="h-8 w-8" />
              <h1 className="text-3xl font-bold">Profile</h1>
            </div>

            <Tabs defaultValue="personal" className="space-y-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="personal">Personal Info</TabsTrigger>
                <TabsTrigger value="company">Company</TabsTrigger>
                <TabsTrigger value="team" disabled={!isAdmin}>
                  Team {!isAdmin && <Shield className="h-4 w-4 ml-2" />}
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
                  isUpdating={updateProfileMutation.isPending}
                />
              </TabsContent>

              <TabsContent value="company" className="space-y-6">
                <CompanyInfoTab
                  company={company}
                  isAdmin={isAdmin}
                  editingCompany={editingCompany}
                  companyForm={companyForm}
                  setCompanyForm={setCompanyForm}
                  setEditingCompany={setEditingCompany}
                  onUpdateCompany={handleUpdateCompany}
                  isUpdating={updateCompanyMutation.isPending}
                />
              </TabsContent>

              <TabsContent value="team" className="space-y-6">
                <TeamTab
                  isAdmin={isAdmin}
                  companyUsers={companyUsers}
                  usersLoading={usersLoading}
                  inviteDialogOpen={inviteDialogOpen}
                  setInviteDialogOpen={setInviteDialogOpen}
                  inviteForm={inviteForm}
                  setInviteForm={setInviteForm}
                  onInviteUser={handleInviteUser}
                  isInviting={inviteUserMutation.isPending}
                />
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Profile;
