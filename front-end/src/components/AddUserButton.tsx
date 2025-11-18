import { Lock, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreateUserModal } from "@/components/users/CreateUserModal";
import { UserPlan } from "@/types/plans";
import { useUser } from "@/hooks/useUser";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

interface AddUserButtonProps {
  serverId: string;
  onUpgradeClick: () => void;
  onSuccess?: () => void;
  initialName?: string;
}

export const AddUserButton = ({
  serverId,
  onUpgradeClick,
  onSuccess,
  initialName = "",
}: AddUserButtonProps) => {
  const { userPlan, isLoading: userLoading, planData } = useUser();
  const navigate = useNavigate();
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Since we removed user usage tracking, check permission from plan features
  const userUsage = planData?.usage?.users || {
    current: 0,
    limit: 1,
    percentage: 0,
    canAdd: false,
  };

  // Users can be added by paid plan users
  const canAddUser = userUsage.canAdd;

  const getUserButtonConfig = () => {
    if (userLoading || canAddUser) return null;

    switch (userPlan) {
      case UserPlan.FREE:
        return {
          text: "Add user",
          badge: "Upgrade",
          badgeColor: "bg-orange-500",
          title: "Upgrade to add users",
        };
      case UserPlan.DEVELOPER:
        return {
          text: "Add user",
          badge: "Upgrade",
          badgeColor: "bg-blue-500",
          title: "User management available with Developer plan",
        };
      case UserPlan.ENTERPRISE:
        return {
          text: "Add user",
          badge: "Upgrade",
          badgeColor: "bg-purple-500",
          title: "User management available with Enterprise plan",
        };
      default:
        return {
          text: "Add user",
          badge: "Upgrade",
          badgeColor: "bg-green-500",
          title: "User management available with paid plans",
        };
    }
  };

  const handleAddUserClick = () => {
    if (!canAddUser) {
      navigate("/plans");
    } else {
      setShowCreateModal(true);
    }
  };

  if (canAddUser) {
    return (
      <>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add user
        </Button>

        <CreateUserModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          serverId={serverId}
          initialName={initialName}
          onSuccess={() => {
            setShowCreateModal(false);
            onSuccess?.();
          }}
        />
      </>
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
};
