import { useId, useState } from "react";
import { Trans, useTranslation } from "react-i18next";

import {
  Building2,
  Calendar,
  ChevronRight,
  Edit,
  Save,
  Settings,
  Trash2,
  Users,
  X,
} from "lucide-react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
import { Input } from "@/components/ui/input";
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
  onStartEdit: () => void;
  onCancelEdit: () => void;
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
  onStartEdit,
  onCancelEdit,
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
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between px-4 py-3 bg-muted/30 border-b border-border">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10 shrink-0"
            aria-hidden="true"
          >
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h2 className="title-section">{t("workspace.information")}</h2>
            <p className="text-sm text-muted-foreground">
              {editingWorkspace
                ? t("workspace.subtitleEditing")
                : t("workspace.subtitleViewing")}
            </p>
          </div>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2 shrink-0">
            {editingWorkspace ? (
              <>
                <Button
                  variant="outline"
                  onClick={onCancelEdit}
                  disabled={isUpdating}
                  className="h-9"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                  <span className="hidden sm:inline">
                    {t("workspace.cancel")}
                  </span>
                </Button>
                <Button
                  onClick={onUpdateWorkspace}
                  disabled={isUpdating}
                  className="btn-primary h-9"
                >
                  <Save className="h-4 w-4" aria-hidden="true" />
                  <span className="hidden sm:inline">
                    {t("workspace.saveChanges")}
                  </span>
                </Button>
              </>
            ) : (
              <Button onClick={onStartEdit} className="btn-primary h-9">
                <Edit className="h-4 w-4" aria-hidden="true" />
                {t("workspace.editWorkspace")}
              </Button>
            )}
          </div>
        )}
      </div>
      <div className="p-4 space-y-6">
        <WorkspaceFormFields
          workspace={workspace}
          isAdmin={isAdmin}
          editingWorkspace={editingWorkspace}
          workspaceForm={workspaceForm}
          setWorkspaceForm={setWorkspaceForm}
          userEmail={user.email}
        />

        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">
            {t("workspace.facts")}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-lg border bg-muted/30 p-3">
            <div className="flex items-center gap-2">
              <Users
                className="h-4 w-4 text-muted-foreground"
                aria-hidden="true"
              />
              <div className="min-w-0">
                <div className="text-xs text-muted-foreground">
                  {t("workspace.users")}
                </div>
                <div className="font-mono tabular-nums text-sm text-foreground">
                  {planData?.usage.users.current ?? "—"}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Settings
                className="h-4 w-4 text-muted-foreground"
                aria-hidden="true"
              />
              <div className="min-w-0">
                <div className="text-xs text-muted-foreground">
                  {t("workspace.servers")}
                </div>
                <div className="font-mono tabular-nums text-sm text-foreground">
                  {planData?.usage.servers.current ?? "—"}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar
                className="h-4 w-4 text-muted-foreground"
                aria-hidden="true"
              />
              <div className="min-w-0">
                <div className="text-xs text-muted-foreground">
                  {t("workspace.created")}
                </div>
                <div className="text-sm text-foreground truncate">
                  {formatDate(workspace.createdAt)}
                </div>
              </div>
            </div>
          </div>
          {!editingWorkspace && (
            <p className="text-xs text-muted-foreground">
              {t("workspace.factsHint")}
            </p>
          )}
        </div>

        {isAdmin && (
          <>
            <Separator />

            <Accordion type="single" collapsible>
              <AccordionItem value="danger" className="border rounded-lg px-4">
                <AccordionTrigger className="py-3 hover:no-underline">
                  <div className="flex items-center gap-2 text-sm font-semibold text-destructive">
                    {t("workspace.dangerZone")}
                    <ChevronRight
                      className="h-4 w-4 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <span className="text-sm font-normal text-muted-foreground">
                      {t("workspace.dangerZoneHint")}
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-1">
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      {t("workspace.deleteDescription")}
                    </p>
                    <Button
                      variant="destructive"
                      onClick={() => setDeleteDialogOpen(true)}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                      {t("workspace.deleteWorkspace")}
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

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
      </div>
    </div>
  );
};
