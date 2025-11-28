import {
  Building2,
  Calendar,
  Edit,
  Save,
  Settings,
  Shield,
  Users,
  X,
} from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

import { ExtendedWorkspace } from "@/contexts/WorkspaceContextDefinition";

import { useUser } from "@/hooks/useUser";

import { NoWorkspaceCard } from "./NoWorkspaceCard";
import { formatDate, getPlanColor, WorkspaceFormState } from "./profileUtils";
import { WorkspaceFormFields } from "./WorkspaceFormFields";

interface WorkspaceInfoTabProps {
  workspace: ExtendedWorkspace | undefined;
  isAdmin: boolean;
  editingWorkspace: boolean;
  workspaceForm: WorkspaceFormState;
  setWorkspaceForm: (form: WorkspaceFormState) => void;
  setEditingWorkspace: (editing: boolean) => void;
  onUpdateWorkspace: () => void;
  isUpdating: boolean;
}

export const WorkspaceInfoTab = ({
  workspace,
  isAdmin,
  editingWorkspace,
  workspaceForm,
  setWorkspaceForm,
  setEditingWorkspace,
  onUpdateWorkspace,
  isUpdating,
}: WorkspaceInfoTabProps) => {
  const { userPlan, planData } = useUser();

  if (!workspace) {
    return <NoWorkspaceCard />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            <span>Workspace Information</span>
          </div>
          <Badge className={getPlanColor(userPlan)}>{userPlan}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <WorkspaceFormFields
          workspace={workspace}
          isAdmin={isAdmin}
          editingWorkspace={editingWorkspace}
          workspaceForm={workspaceForm}
          setWorkspaceForm={setWorkspaceForm}
        />

        <Separator />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span>Users: {planData?.usage.users.current || 0}</span>
          </div>
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span>Servers: {planData?.usage.servers.current || 0}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>Created: {formatDate(workspace.createdAt)}</span>
          </div>
        </div>

        {isAdmin && (
          <div className="flex justify-end gap-2">
            {editingWorkspace ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => setEditingWorkspace(false)}
                  disabled={isUpdating}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  onClick={onUpdateWorkspace}
                  disabled={isUpdating}
                  className="btn-primary"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </>
            ) : (
              <Button
                onClick={() => setEditingWorkspace(true)}
                className="btn-primary"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Workspace
              </Button>
            )}
          </div>
        )}

        {!isAdmin && (
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              Only admin users can edit workspace information.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};
