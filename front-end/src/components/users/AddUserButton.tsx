import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Plus } from "lucide-react";
import { toast } from "sonner";

import { apiClient } from "@/lib/api";

import { Button } from "@/components/ui/button";

import { useWorkspace } from "@/hooks/useWorkspace";

interface AddUserButtonProps {
  serverId: string;
  onSuccess?: () => void;
  initialName?: string;
  initialPassword?: string;
  initialTags?: string;
  initialVhost?: string;
}

export function AddUserButton({
  serverId,
  onSuccess,
  initialName = "",
  initialPassword = "",
  initialTags = "",
  initialVhost = "/",
}: AddUserButtonProps) {
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();

  const createUserMutation = useMutation({
    mutationFn: async () => {
      if (!workspace?.id) {
        throw new Error("Workspace ID is required");
      }

      // First create the user
      await apiClient.createUser(
        serverId,
        {
          username: initialName,
          password: initialPassword.trim() || undefined,
          tags: initialTags,
        },
        workspace.id
      );

      // Then set permissions on the selected virtual host
      await apiClient.setUserPermissions(
        serverId,
        initialName,
        {
          vhost: initialVhost,
          configure: ".*",
          write: ".*",
          read: ".*",
        },
        workspace.id
      );

      return { username: initialName };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users", serverId] });
      toast.success("User created successfully");
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create user");
    },
  });

  const handleAddUserClick = () => {
    // Validate required fields
    if (!initialName.trim()) {
      toast.error("Username is required");
      return;
    }

    createUserMutation.mutate();
  };

  return (
    <Button
      onClick={handleAddUserClick}
      disabled={createUserMutation.isPending}
      className="btn-primary flex items-center gap-2"
    >
      <Plus className="w-4 h-4" />
      {createUserMutation.isPending ? "Creating..." : "Add user"}
    </Button>
  );
}
