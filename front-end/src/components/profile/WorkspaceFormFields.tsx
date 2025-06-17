import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
    planType: string;
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="logoUrl">Logo URL</Label>
          {editingWorkspace && isAdmin ? (
            <Input
              id="logoUrl"
              type="url"
              value={workspaceForm.logoUrl}
              onChange={(e) =>
                setWorkspaceForm({
                  ...workspaceForm,
                  logoUrl: e.target.value,
                })
              }
            />
          ) : (
            <p className="text-sm p-2 border rounded-md bg-muted">
              {workspace.logoUrl || "Not set"}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="planType">Plan Type</Label>
          {editingWorkspace && isAdmin ? (
            <Select
              value={workspaceForm.planType}
              onValueChange={(value) =>
                setWorkspaceForm({
                  ...workspaceForm,
                  planType: value as "FREE" | "PREMIUM" | "ENTERPRISE",
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="FREE">Free</SelectItem>
                <SelectItem value="PREMIUM">Premium</SelectItem>
                <SelectItem value="ENTERPRISE">Enterprise</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <p className="text-sm p-2 border rounded-md bg-muted">
              {workspace.planType}
            </p>
          )}
        </div>
      </div>
    </>
  );
};
