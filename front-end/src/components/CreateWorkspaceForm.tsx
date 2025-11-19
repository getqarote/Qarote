import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TagsInput } from "@/components/ui/tags-input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Loader2, Building2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { toast } from "sonner";
import { WorkspaceFormData, workspaceSchema } from "@/schemas/forms";
import { useWorkspace } from "@/hooks/useWorkspace";

interface CreateWorkspaceFormProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateWorkspaceForm({
  isOpen,
  onClose,
}: CreateWorkspaceFormProps) {
  const { refetch: refreshWorkspace } = useWorkspace();
  const queryClient = useQueryClient();

  const form = useForm<WorkspaceFormData>({
    resolver: zodResolver(workspaceSchema),
    defaultValues: {
      name: "",
      contactEmail: "",
      tags: [],
    },
  });

  // Create workspace mutation
  const createWorkspaceMutation = useMutation({
    mutationFn: (data: {
      name: string;
      contactEmail?: string;
      tags?: string[];
    }) => apiClient.createWorkspace(data),
    onSuccess: () => {
      toast.success("Workspace created successfully!");
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      refreshWorkspace();
      onClose();
      // Reset form
      form.reset();
    },
    onError: (error: Error) => {
      toast.error(`Failed to create workspace: ${error.message}`);
    },
  });

  const onSubmit = (data: WorkspaceFormData) => {
    createWorkspaceMutation.mutate({
      name: data.name.trim(),
      contactEmail: data.contactEmail?.trim() || undefined,
      tags: data.tags?.filter((tag) => tag.trim().length > 0) || undefined,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] lg:max-w-[700px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Create New Workspace
          </DialogTitle>
          <DialogDescription>
            Create a new workspace to organize your RabbitMQ servers and
            collaborate with your team.
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
                    Workspace Name *
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="My Workspace"
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
              name="contactEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700">
                    Contact Email (Optional)
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="email"
                      placeholder="contact@company.com"
                      className="h-10"
                      disabled={createWorkspaceMutation.isPending}
                    />
                  </FormControl>
                  <FormMessage />
                  <p className="text-xs text-gray-500">
                    Used for workspace-related notifications
                  </p>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700">
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
                  <p className="text-xs text-gray-500">
                    Use tags like "production", "development", or "testing"
                  </p>
                </FormItem>
              )}
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
            Cancel
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
                Creating...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create Workspace
              </div>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
