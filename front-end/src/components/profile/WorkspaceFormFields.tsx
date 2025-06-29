import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { WorkspaceFormState } from "./profileUtils";

interface WorkspaceFormFieldsProps {
  editingWorkspace: boolean;
  isAdmin: boolean;
  workspaceForm: WorkspaceFormState;
  setWorkspaceForm: (form: WorkspaceFormState) => void;
  workspace: {
    name: string;
    contactEmail?: string;
    logoUrl?: string;
    plan: string;
  };
}

export const WorkspaceFormFields = ({
  editingWorkspace,
  isAdmin,
  workspaceForm,
  setWorkspaceForm,
  workspace,
}: WorkspaceFormFieldsProps) => {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="workspaceName">Workspace Name</Label>
          {editingWorkspace && isAdmin ? (
            <Input
              id="workspaceName"
              value={workspaceForm.name}
              onChange={(e) =>
                setWorkspaceForm({
                  ...workspaceForm,
                  name: e.target.value,
                })
              }
            />
          ) : (
            <p className="text-sm p-2 border rounded-md bg-muted">
              {workspace.name}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="contactEmail">Contact Email</Label>
          {editingWorkspace && isAdmin ? (
            <Input
              id="contactEmail"
              type="email"
              value={workspaceForm.contactEmail}
              onChange={(e) =>
                setWorkspaceForm({
                  ...workspaceForm,
                  contactEmail: e.target.value,
                })
              }
            />
          ) : (
            <p className="text-sm p-2 border rounded-md bg-muted">
              {workspace.contactEmail || "Not set"}
            </p>
          )}
        </div>
      </div>
    </>
  );
};
