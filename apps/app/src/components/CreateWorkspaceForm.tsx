import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";

import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, Info, Loader2, Plus, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { InviteLinksDialog } from "@/components/InviteLinksDialog";
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
    inviteLinks,
    clearInviteLinks,
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

  // After workspace is created, send pending invitations
  useEffect(() => {
    if (createWorkspaceMutation.isSuccess) {
      sendPendingInvites();
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      refreshWorkspace();
      onClose();
      form.reset();
    }
    if (createWorkspaceMutation.isError) {
      toast.error(
        `Failed to create workspace: ${createWorkspaceMutation.error?.message || "Unknown error"}`
      );
    }
  }, [createWorkspaceMutation.isSuccess, createWorkspaceMutation.isError]);

  const onSubmit = (data: WorkspaceFormData) => {
    storePendingInvites();
    createWorkspaceMutation.mutate({
      name: data.name.trim(),
      contactEmail: data.contactEmail?.trim() || undefined,
      tags: data.tags?.filter((tag) => tag.trim().length > 0) || undefined,
    });
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
                      "Failed to create workspace. Please try again."}
                  </AlertDescription>
                </Alert>
              )}

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700">
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
                    <FormLabel className="text-sm font-medium text-gray-700">
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
                    <p className="text-xs text-gray-500">
                      {t("createForm.tagsHint", {
                        defaultValue:
                          'Use tags like "production", "development", or "testing"',
                      })}
                    </p>
                  </FormItem>
                )}
              />

              {/* Invite Members Section - plan gated */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">
                    {t("createForm.inviteMembers", {
                      defaultValue: "Invite Members",
                    })}{" "}
                    (
                    {t("createForm.optional", {
                      defaultValue: "Optional",
                    })}
                    )
                  </span>
                </div>

                {canInviteUsers ? (
                  <>
                    <TagsInput
                      value={inviteEmails}
                      onChange={setInviteEmails}
                      placeholder={t("createForm.invitePlaceholder", {
                        defaultValue: "Type an email and press Enter to add",
                      })}
                      maxTags={maxInvites}
                      maxTagLength={100}
                      disabled={createWorkspaceMutation.isPending}
                    />
                    {maxInvites && (
                      <p className="text-xs text-gray-500">
                        {t("createForm.inviteHintWithLimit", {
                          count: maxInvites,
                          defaultValue: `You can invite up to ${maxInvites} members on your current plan`,
                        })}
                      </p>
                    )}
                  </>
                ) : (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      {t("createForm.upgradeToInvite", {
                        defaultValue:
                          "Upgrade to the Developer or Enterprise plan to invite team members.",
                      })}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
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

      <InviteLinksDialog
        inviteLinks={inviteLinks}
        onClose={() => {
          clearInviteLinks();
          resetInvites();
        }}
      />
    </>
  );
}
