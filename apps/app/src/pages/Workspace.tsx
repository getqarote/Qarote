import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { User } from "@/lib/api";

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

import { WorkspaceFormData, workspaceSchema } from "@/schemas";

const Workspace = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const queryClient = useQueryClient();
  const successHandled = useRef(false);

  // Check if user already has workspaces
  const { isLoading: workspacesLoading } = useUserWorkspaces();

  const form = useForm<WorkspaceFormData>({
    resolver: zodResolver(workspaceSchema),
    defaultValues: {
      name: "",
      tags: [],
    },
  });

  // Create workspace mutation
  const createWorkspaceMutation = useCreateWorkspace();

  // Handle success - use ref to prevent multiple executions
  // Dependencies intentionally limited to prevent infinite loops from user/updateUser
  useEffect(() => {
    if (
      createWorkspaceMutation.isSuccess &&
      createWorkspaceMutation.data &&
      !successHandled.current
    ) {
      successHandled.current = true;
      toast.success("Workspace created successfully!");
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });

      // Update user state directly with the new workspaceId
      const newWorkspaceId = createWorkspaceMutation.data.workspace.id;
      if (user) {
        const updatedUser: User = {
          ...user,
          workspaceId: newWorkspaceId,
        };
        updateUser(updatedUser);
      }

      // Redirect to dashboard after showing success message
      setTimeout(() => {
        navigate("/", { replace: true });
      }, 1000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createWorkspaceMutation.isSuccess, createWorkspaceMutation.data]);

  // Handle error separately
  useEffect(() => {
    if (createWorkspaceMutation.isError) {
      toast.error(
        `Failed to create workspace: ${createWorkspaceMutation.error?.message || "Unknown error"}`
      );
    }
  }, [createWorkspaceMutation.isError, createWorkspaceMutation.error]);

  const onSubmit = (data: WorkspaceFormData) => {
    createWorkspaceMutation.mutate({
      name: data.name.trim(),
      tags:
        data.tags && data.tags.length > 0
          ? data.tags.filter((tag) => tag.trim().length > 0)
          : undefined,
    });
  };

  if (workspacesLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading...</span>
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
        {createWorkspaceMutation.isSuccess ? (
          // Success State
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-6">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-4">
              Workspace Created Successfully!
            </h2>
            <p className="text-muted-foreground mb-6">
              Redirecting you to your dashboard...
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
                Create Your Workspace
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Welcome to Qarote! Let's start by creating your first workspace.
                Workspaces help you organize your RabbitMQ servers and
                collaborate with your team.
              </p>
            </div>

            {/* Workspace Creation Card */}
            <div className="max-w-lg mx-auto">
              <Card className="border-0 shadow-lg">
                <CardHeader className="text-center">
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-lg bg-orange-100 dark:bg-orange-900/30 mb-4">
                    <Plus className="h-6 w-6 text-orange-600" />
                  </div>
                  <CardTitle className="text-xl">New Workspace</CardTitle>
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
                              "Failed to create workspace. Please try again."}
                          </AlertDescription>
                        </Alert>
                      )}

                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium">
                              Workspace Name *
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="My Workspace"
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
                              Tags (Optional)
                            </FormLabel>
                            <FormControl>
                              <TagsInput
                                value={field.value || []}
                                onChange={field.onChange}
                                placeholder="Add tags to organize your workspace"
                                maxTags={10}
                                maxTagLength={20}
                                disabled={createWorkspaceMutation.isPending}
                              />
                            </FormControl>
                            <FormMessage />
                            <p className="text-xs text-muted-foreground">
                              Use tags like "production", "development", or
                              "testing" to organize your workspace
                            </p>
                          </FormItem>
                        )}
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
                            Creating Workspace...
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Plus className="h-4 w-4" />
                            Create Workspace
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
    </div>
  );
};

export default Workspace;
