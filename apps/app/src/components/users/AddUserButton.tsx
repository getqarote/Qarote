import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";

import { Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import {
  useCreateUser,
  useSetUserPermissions,
} from "@/hooks/queries/useRabbitMQUsers";
import { useWorkspace } from "@/hooks/ui/useWorkspace";

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
  const { t } = useTranslation("users");
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();

  const createUserMutation = useCreateUser();
  const setPermissionsMutation = useSetUserPermissions();

  // Handle success/error
  useEffect(() => {
    if (createUserMutation.isSuccess && setPermissionsMutation.isSuccess) {
      queryClient.invalidateQueries({ queryKey: ["users", serverId] });
      toast.success(t("createSuccess"));
      onSuccess?.();
    }
    if (createUserMutation.isError) {
      toast.error(createUserMutation.error?.message || t("createError"));
    }
    if (setPermissionsMutation.isError) {
      toast.error(
        setPermissionsMutation.error?.message || t("setPermissionsError")
      );
    }
  }, [
    createUserMutation.isSuccess,
    createUserMutation.isError,
    createUserMutation.error,
    setPermissionsMutation.isSuccess,
    setPermissionsMutation.isError,
    setPermissionsMutation.error,
  ]);

  const handleAddUserClick = async () => {
    // Validate required fields
    if (!initialName.trim()) {
      toast.error(t("usernameRequired"));
      return;
    }

    if (!workspace?.id) {
      toast.error(t("requiredWorkspace"));
      return;
    }

    try {
      // First create the user
      await createUserMutation.mutateAsync({
        serverId,
        workspaceId: workspace.id,
        username: initialName,
        password: initialPassword.trim() || undefined,
        tags: initialTags,
      });

      // Then set permissions on the selected virtual host
      await setPermissionsMutation.mutateAsync({
        serverId,
        workspaceId: workspace.id,
        username: initialName,
        vhost: initialVhost,
        configure: ".*",
        write: ".*",
        read: ".*",
      });
    } catch (error) {
      // Error handling is done in useEffect
    }
  };

  return (
    <Button
      onClick={handleAddUserClick}
      disabled={
        createUserMutation.isPending || setPermissionsMutation.isPending
      }
      className="btn-primary flex items-center gap-2"
    >
      <Plus className="w-4 h-4" />
      {createUserMutation.isPending || setPermissionsMutation.isPending
        ? t("creating")
        : t("addUser")}
    </Button>
  );
}
