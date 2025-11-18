import { Lock, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddQueueForm } from "@/components/AddQueueForm";
import { UserPlan } from "@/types/plans";
import { useUser } from "@/hooks/useUser";
import { useNavigate } from "react-router-dom";

interface AddQueueButtonProps {
  serverId: string;
  onUpgradeClick: () => void;
  onSuccess?: () => void;
}

export const AddQueueButton = ({
  serverId,
  onUpgradeClick,
  onSuccess,
}: AddQueueButtonProps) => {
  const { userPlan, canAddQueue, isLoading: userLoading } = useUser();
  const navigate = useNavigate();

  const getQueueButtonConfig = () => {
    if (userLoading || canAddQueue) return null;

    switch (userPlan) {
      case UserPlan.FREE:
        return {
          text: "Add Queue",
          badge: "Upgrade",
          badgeColor: "bg-orange-500",
          title: "Upgrade to add queues",
        };
      case UserPlan.DEVELOPER:
        return {
          text: "Add Queue",
          badge: "Upgrade",
          badgeColor: "bg-blue-500",
          title: "Queues available with Developer plan",
        };
      case UserPlan.ENTERPRISE:
        return {
          text: "Add Queue",
          badge: "Upgrade",
          badgeColor: "bg-purple-500",
          title: "Queues available with Enterprise plan",
        };
      default:
        return {
          text: "Add Queue",
          badge: "Upgrade",
          badgeColor: "bg-orange-500",
          title: "Upgrade to add queues",
        };
    }
  };

  const handleAddQueueClick = () => {
    if (!canAddQueue) {
      navigate("/plans");
    }
  };

  if (canAddQueue) {
    return (
      <AddQueueForm
        serverId={serverId}
        onSuccess={onSuccess}
        trigger={
          <Button className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Queue
          </Button>
        }
      />
    );
  }

  const buttonConfig = getQueueButtonConfig();
  if (!buttonConfig) return null;

  return (
    <Button
      onClick={handleAddQueueClick}
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
