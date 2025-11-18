import { Lock, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreateVHostModal } from "@/components/vhosts/CreateVHostModal";
import { UserPlan } from "@/types/plans";
import { useUser } from "@/hooks/useUser";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

interface AddVirtualHostButtonProps {
  serverId: string;
  onUpgradeClick: () => void;
  onSuccess?: () => void;
  initialName?: string;
}

export const AddVirtualHostButton = ({
  serverId,
  onUpgradeClick,
  onSuccess,
  initialName = "",
}: AddVirtualHostButtonProps) => {
  const { userPlan, isLoading: workspaceLoading } = useUser();
  const navigate = useNavigate();
  const [showCreateModal, setShowCreateModal] = useState(false);

  // For Free plan users, virtual host creation is restricted
  const canAddVirtualHost = userPlan !== UserPlan.FREE;

  const getVirtualHostButtonConfig = () => {
    if (workspaceLoading || canAddVirtualHost) return null;

    return {
      text: "Add virtual host",
      badge: "Upgrade",
      badgeColor: "bg-orange-500",
      title: "Upgrade to add virtual hosts",
    };
  };

  const handleAddVirtualHostClick = () => {
    if (!canAddVirtualHost) {
      navigate("/plans");
    } else {
      setShowCreateModal(true);
    }
  };

  if (canAddVirtualHost) {
    return (
      <>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add virtual host
        </Button>

        <CreateVHostModal
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

  const buttonConfig = getVirtualHostButtonConfig();
  if (!buttonConfig) return null;

  return (
    <Button
      onClick={handleAddVirtualHostClick}
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
