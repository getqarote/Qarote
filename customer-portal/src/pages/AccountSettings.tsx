import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { useAuth } from "@/contexts/AuthContext";

const AccountSettings = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Account Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your account information
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>Your account details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              Email
            </label>
            <p className="mt-1">{user?.email}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              Name
            </label>
            <p className="mt-1">
              {user?.firstName} {user?.lastName}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              Role
            </label>
            <p className="mt-1">{user?.role}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccountSettings;
