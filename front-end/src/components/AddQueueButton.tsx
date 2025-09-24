import { Lock, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddQueueForm } from "@/components/AddQueueForm";
import { WorkspacePlan } from "@/types/plans";
import { useWorkspace } from "@/hooks/useWorkspace";

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
  const {
    workspacePlan,
    canAddQueue,
    isLoading: workspaceLoading,
  } = useWorkspace();

  const getQueueButtonConfig = () => {
    if (workspaceLoading || canAddQueue) return null;

    switch (workspacePlan) {
      case WorkspacePlan.FREE:
        return {
          text: "Add Queue",
          badge: "Pro",
          badgeColor: "bg-orange-500",
          title: "Upgrade to add queues",
        };
      case WorkspacePlan.DEVELOPER:
        return {
          text: "Add Queue",
          badge: "Pro",
          badgeColor: "bg-blue-500",
          title: "Queues available with Developer plan",
        };
      case WorkspacePlan.ENTERPRISE:
        return {
          text: "Add Queue",
          badge: "Pro",
          badgeColor: "bg-purple-500",
          title: "Queues available with Enterprise plan",
        };
      default:
        return {
          text: "Add Queue",
          badge: "Pro",
          badgeColor: "bg-orange-500",
          title: "Upgrade to add queues",
        };
    }
  };

  const handleAddQueueClick = () => {
    if (!canAddQueue) {
      onUpgradeClick();
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
      disabled={true}
      className="bg-gray-200 text-gray-400 cursor-not-allowed opacity-60 flex items-center gap-2"
      title={buttonConfig.title}
    >
      <Lock className="w-4 h-4" />
      {buttonConfig.text}
      <span
        className={`ml-1 px-2 py-0.5 ${buttonConfig.badgeColor} text-white text-xs rounded-full font-bold`}
      >
        {buttonConfig.badge}
      </span>
    </Button>
  );
};
