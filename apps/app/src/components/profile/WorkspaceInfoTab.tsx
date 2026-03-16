import { useId, useState } from "react";
import { Trans, useTranslation } from "react-i18next";

import {
  Building2,
  Calendar,
  Edit,
  Save,
  Settings,
  Trash2,
  Users,
  X,
} from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alertDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PlanBadge } from "@/components/ui/PlanBadge";
import { Separator } from "@/components/ui/separator";

import { ExtendedWorkspace } from "@/contexts/WorkspaceContextDefinition";

import { useUser } from "@/hooks/ui/useUser";

import { NoWorkspaceCard } from "./NoWorkspaceCard";
import { formatDate, WorkspaceFormState } from "./profileUtils";
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
  onDeleteWorkspace: () => void;
  isDeleting: boolean;
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
  onDeleteWorkspace,
  isDeleting,
}: WorkspaceInfoTabProps) => {
  const { t } = useTranslation("profile");
  const { user, planData } = useUser();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [confirmName, setConfirmName] = useState("");
  const confirmInputId = useId();

  if (!workspace) {
    return <NoWorkspaceCard />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            <span>{t("workspace.information")}</span>
          </div>
          <PlanBadge />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <WorkspaceFormFields
          workspace={workspace}
          isAdmin={isAdmin}
          editingWorkspace={editingWorkspace}
          workspaceForm={workspaceForm}
          setWorkspaceForm={setWorkspaceForm}
          userEmail={user.email}
        />

        <Separator />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span>
              {t("workspace.users")} {planData?.usage.users.current || 0}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span>
              {t("workspace.servers")} {planData?.usage.servers.current || 0}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>
              {t("workspace.created")} {formatDate(workspace.createdAt)}
            </span>
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
                  {t("workspace.cancel")}
                </Button>
                <Button
                  onClick={onUpdateWorkspace}
                  disabled={isUpdating}
                  className="btn-primary"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {t("workspace.saveChanges")}
                </Button>
              </>
            ) : (
              <Button
                onClick={() => setEditingWorkspace(true)}
                className="btn-primary"
              >
                <Edit className="h-4 w-4 mr-2" />
                {t("workspace.editWorkspace")}
              </Button>
            )}
          </div>
        )}

        {isAdmin && (
          <>
            <Separator />

            <div className="rounded-lg border border-destructive/50 p-4 space-y-3">
              <h3 className="text-lg font-semibold text-destructive">
                {t("workspace.dangerZone")}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t("workspace.deleteDescription")}
              </p>
              <Button
                variant="destructive"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {t("workspace.deleteWorkspace")}
              </Button>
            </div>

            <AlertDialog
              open={deleteDialogOpen}
              onOpenChange={(open) => {
                setDeleteDialogOpen(open);
                if (!open) setConfirmName("");
              }}
            >
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {t("workspace.deleteDialogTitle")}
                  </AlertDialogTitle>
                  <AlertDialogDescription asChild>
                    <p>
                      <Trans
                        i18nKey="workspace.deleteDialogDescription"
                        ns="profile"
                        values={{ name: workspace.name }}
                        components={{ strong: <strong /> }}
                      />
                    </p>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="space-y-2 py-2">
                  <label
                    htmlFor={confirmInputId}
                    className="text-sm font-medium"
                  >
                    {t("workspace.deleteDialogConfirmLabel")}
                  </label>
                  <Input
                    id={confirmInputId}
                    value={confirmName}
                    onChange={(e) => setConfirmName(e.target.value)}
                    placeholder={workspace.name}
                  />
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("workspace.cancel")}</AlertDialogCancel>
                  <AlertDialogAction
                    disabled={confirmName !== workspace.name || isDeleting}
                    onClick={onDeleteWorkspace}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isDeleting
                      ? t("workspace.deleting")
                      : t("workspace.deleteConfirm")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </CardContent>
    </Card>
  );
};
