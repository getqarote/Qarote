import { Lock, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/useUser";
import { UserPlan } from "@/types/plans";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { toast } from "sonner";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useNavigate } from "react-router-dom";

interface AddUserButtonProps {
  serverId: string;
  onUpgradeClick: () => void;
  onSuccess?: () => void;
  initialName?: string;
  initialPassword?: string;
  initialTags?: string;
  initialVhost?: string;
}

export function AddUserButton({
  serverId,
  onUpgradeClick,
  onSuccess,
  initialName = "",
  initialPassword = "",
  initialTags = "",
  initialVhost = "/",
}: AddUserButtonProps) {
  const { userPlan, isLoading: userLoading } = useUser();
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // For Free plan users, user creation is restricted
  const canAddUser = userPlan !== UserPlan.FREE;

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

  const getUserButtonConfig = () => {
    if (userLoading || canAddUser) return null;

    return {
      text: "Add user",
      badge: "Upgrade",
      badgeColor: "bg-orange-500",
      title: "Upgrade to add users",
    };
  };

  const handleAddUserClick = () => {
    if (!canAddUser) {
      navigate("/plans");
    } else {
      // Validate required fields
      if (!initialName.trim()) {
        toast.error("Username is required");
        return;
      }

      createUserMutation.mutate();
    }
  };

  if (canAddUser) {
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

  const buttonConfig = getUserButtonConfig();
  if (!buttonConfig) return null;

  return (
    <Button
      onClick={handleAddUserClick}
      className="bg-gray-200 text-gray-400 cursor-pointer opacity-60 flex items-center gap-2 hover:bg-gray-300"
      title={buttonConfig.title}
    >
      <Lock className="w-4 h-4" />
      {buttonConfig.text}
      <span
        className={`ml-1 px-1.5 py-0.5 ${buttonConfig.badgeColor} text-white text-[10px] rounded-full font-semibold`}
      >
        {buttonConfig.badge}
      </span>
    </Button>
  );
}
