import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { User } from "@/lib/api";

import { InviteLinksDialog } from "@/components/InviteLinksDialog";
import { InviteMembersSection } from "@/components/InviteMembersSection";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

import { useAuth } from "@/contexts/AuthContextDefinition";

import {
  useCreateWorkspace,
  useUserWorkspaces,
} from "@/hooks/queries/useWorkspaceApi";
import { useWorkspaceInvites } from "@/hooks/ui/useWorkspaceInvites";

import { WorkspaceFormData, workspaceSchema } from "@/schemas";

const Workspace = () => {
  const { t } = useTranslation("workspace");
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const queryClient = useQueryClient();
  const [showSuccess, setShowSuccess] = useState(false);
  const isCreatingRef = useRef(false);

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

  // Check if user already has workspaces
  const { data: workspacesData, isLoading: workspacesLoading } =
    useUserWorkspaces();

  // Redirect to dashboard if user already has workspaces (skip during creation)
  useEffect(() => {
    if (
      !isCreatingRef.current &&
      !workspacesLoading &&
      workspacesData?.workspaces?.length
    ) {
      navigate("/", { replace: true });
    }
  }, [workspacesLoading, workspacesData, navigate]);

  const form = useForm<WorkspaceFormData>({
    resolver: zodResolver(workspaceSchema),
    defaultValues: {
      name: "",
      tags: [],
    },
  });

  // Create workspace mutation
  const createWorkspaceMutation = useCreateWorkspace();

  const onSubmit = async (data: WorkspaceFormData) => {
    isCreatingRef.current = true;
    storePendingInvites();
    createWorkspaceMutation.mutate(
      {
        name: data.name.trim(),
        tags:
          data.tags && data.tags.length > 0
            ? data.tags.filter((tag) => tag.trim().length > 0)
            : undefined,
      },
      {
        onSuccess: async (responseData) => {
          queryClient.invalidateQueries({ queryKey: ["workspaces"] });

          // Update user state directly with the new workspaceId
          const newWorkspaceId = responseData.workspace.id;
          if (user) {
            const updatedUser: User = {
              ...user,
              workspaceId: newWorkspaceId,
            };
            updateUser(updatedUser);
          }

          const links = await sendPendingInvites();

          if (links.length > 0) {
            // Show success state; user will dismiss InviteLinksDialog then navigate
            setShowSuccess(true);
          } else {
            navigate("/", { replace: true });
          }
        },
        onError: (error) => {
          isCreatingRef.current = false;
          toast.error(
            t("toast.workspaceCreateFailed", {
              error: error?.message || t("error.unknown"),
            })
          );
        },
      }
    );
  };

  if (workspacesLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>{t("loading")}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <img
                src="/images/new_icon.svg"
                alt="Qarote"
                className="w-8 h-8"
              />
              <div>
                <h1 className="text-xl font-semibold text-foreground">
                  Qarote
                </h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {showSuccess ? (
          // Success State
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-6">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-4">
              {t("success.title")}
            </h2>
            <p className="text-muted-foreground mb-6">
              {t("success.redirecting")}
            </p>
            <div className="flex items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-orange-600" />
            </div>
          </div>
        ) : (
          // Workspace Creation Form
          <div className="space-y-8">
            {/* Welcome Section */}
            <div className="text-center">
              <h1 className="text-3xl font-bold text-foreground mb-4">
                {t("create.title")}
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                {t("create.description")}
              </p>
            </div>

            {/* Workspace Creation Card */}
            <div className="max-w-lg mx-auto">
              <Card className="border-0 shadow-lg">
                <CardHeader className="text-center">
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-lg bg-orange-100 dark:bg-orange-900/30 mb-4">
                    <Plus className="h-6 w-6 text-orange-600" />
                  </div>
                  <CardTitle className="text-xl">
                    {t("create.cardTitle")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form
                      onSubmit={form.handleSubmit(onSubmit)}
                      className="space-y-6"
                    >
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
                            <FormLabel className="text-sm font-medium">
                              {t("create.workspaceName")}
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder={t(
                                  "create.workspaceNamePlaceholder"
                                )}
                                className="h-11"
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
                            <FormLabel className="text-sm font-medium">
                              {t("create.tagsLabel")}
                            </FormLabel>
                            <FormControl>
                              <TagsInput
                                value={field.value || []}
                                onChange={field.onChange}
                                placeholder={t("create.tagsPlaceholder")}
                                maxTags={10}
                                maxTagLength={20}
                                disabled={createWorkspaceMutation.isPending}
                              />
                            </FormControl>
                            <FormMessage />
                            <p className="text-xs text-muted-foreground">
                              {t("create.tagsHint")}
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
                        i18nPrefix="create"
                      />

                      <Button
                        type="submit"
                        className="w-full h-11 bg-gradient-button hover:bg-gradient-button-hover text-white font-medium"
                        disabled={
                          createWorkspaceMutation.isPending ||
                          !form.formState.isValid
                        }
                      >
                        {createWorkspaceMutation.isPending ? (
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            {t("create.creating")}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Plus className="h-4 w-4" />
                            {t("create.submit")}
                          </div>
                        )}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>

      <InviteLinksDialog
        inviteLinks={inviteLinks}
        onClose={() => {
          resetInvites();
          navigate("/", { replace: true });
        }}
      />
    </div>
  );
};

export default Workspace;
