import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";

import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { InviteLinksDialog } from "@/components/InviteLinksDialog";
import { InviteMembersSection } from "@/components/InviteMembersSection";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { TagsInput } from "@/components/ui/tags-input";

import { useCreateWorkspace } from "@/hooks/queries/useWorkspaceApi";
import { useWorkspace } from "@/hooks/ui/useWorkspace";
import { useWorkspaceInvites } from "@/hooks/ui/useWorkspaceInvites";

import { WorkspaceFormData, workspaceSchema } from "@/schemas";

interface CreateWorkspaceFormProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateWorkspaceForm({
  isOpen,
  onClose,
}: CreateWorkspaceFormProps) {
  const { t } = useTranslation("workspace");
  const { refetch: refreshWorkspace } = useWorkspace();
  const queryClient = useQueryClient();

  const {
    inviteEmails,
    setInviteEmails,
    inviteRole,
    setInviteRole,
    inviteLinks,
    canInviteUsers,
    maxInvites,
    storePendingInvites,
    sendPendingInvites,
    reset: resetInvites,
  } = useWorkspaceInvites();

  const form = useForm<WorkspaceFormData>({
    resolver: zodResolver(workspaceSchema),
    defaultValues: {
      name: "",
      contactEmail: "",
      tags: [],
    },
  });

  const createWorkspaceMutation = useCreateWorkspace();

  const onSubmit = (data: WorkspaceFormData) => {
    storePendingInvites();
    createWorkspaceMutation.mutate(
      {
        name: data.name.trim(),
        contactEmail: data.contactEmail?.trim() || undefined,
        tags: data.tags?.filter((tag) => tag.trim().length > 0) || undefined,
      },
      {
        onSuccess: () => {
          sendPendingInvites();
          queryClient.invalidateQueries({ queryKey: ["workspaces"] });
          refreshWorkspace();
          setInviteEmails([]);
          onClose();
          form.reset();
        },
        onError: (error) => {
          toast.error(
            t("toast.workspaceCreateFailed", {
              error: error?.message || t("error.unknown"),
            })
          );
        },
      }
    );
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[600px] lg:max-w-[700px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {t("createForm.title", {
                defaultValue: "Create New Workspace",
              })}
            </DialogTitle>
            <DialogDescription>
              {t("createForm.description", {
                defaultValue:
                  "Create a new workspace to organize your RabbitMQ servers and collaborate with your team.",
              })}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {createWorkspaceMutation.isError && (
                <Alert variant="destructive">
                  <AlertDescription>
                    {createWorkspaceMutation.error?.message ||
                      t("error.createFailed")}
                  </AlertDescription>
                </Alert>
              )}

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-foreground">
                      {t("createForm.workspaceName", {
                        defaultValue: "Workspace Name",
                      })}{" "}
                      *
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={t("createForm.workspaceNamePlaceholder", {
                          defaultValue: "My Workspace",
                        })}
                        className="h-10"
                        disabled={createWorkspaceMutation.isPending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tags"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-foreground">
                      {t("createForm.tags", { defaultValue: "Tags" })} (
                      {t("createForm.optional", {
                        defaultValue: "Optional",
                      })}
                      )
                    </FormLabel>
                    <FormControl>
                      <TagsInput
                        value={field.value || []}
                        onChange={field.onChange}
                        placeholder={t("createForm.tagsPlaceholder", {
                          defaultValue: "Add tags to organize your workspace",
                        })}
                        maxTags={10}
                        maxTagLength={20}
                        disabled={createWorkspaceMutation.isPending}
                      />
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground">
                      {t("createForm.tagsHint", {
                        defaultValue:
                          'Use tags like "production", "development", or "testing"',
                      })}
                    </p>
                  </FormItem>
                )}
              />

              <InviteMembersSection
                inviteEmails={inviteEmails}
                setInviteEmails={setInviteEmails}
                inviteRole={inviteRole}
                setInviteRole={setInviteRole}
                canInviteUsers={canInviteUsers}
                maxInvites={maxInvites}
                disabled={createWorkspaceMutation.isPending}
                i18nPrefix="createForm"
              />
            </form>
          </Form>

          <DialogFooter className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={createWorkspaceMutation.isPending}
            >
              {t("createForm.cancel", { defaultValue: "Cancel" })}
            </Button>
            <Button
              type="submit"
              onClick={form.handleSubmit(onSubmit)}
              className="bg-gradient-button hover:bg-gradient-button-hover text-white"
              disabled={
                createWorkspaceMutation.isPending || !form.formState.isValid
              }
            >
              {createWorkspaceMutation.isPending ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("createForm.creating", {
                    defaultValue: "Creating...",
                  })}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  {t("createForm.submit", {
                    defaultValue: "Create Workspace",
                  })}
                </div>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <InviteLinksDialog inviteLinks={inviteLinks} onClose={resetInvites} />
    </>
  );
}
