import { Lock, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserPlan } from "@/types/plans";
import { useUser } from "@/hooks/useUser";
import { useNavigate } from "react-router-dom";

interface AddExchangeButtonProps {
  onUpgradeClick: () => void;
  onAddClick?: () => void;
}

export const AddExchangeButton = ({
  onUpgradeClick,
  onAddClick,
}: AddExchangeButtonProps) => {
  const { userPlan, isLoading: userLoading } = useUser();
  const navigate = useNavigate();

  // For Free plan users, exchange creation is restricted
  const canAddExchange = userPlan !== UserPlan.FREE;

  const getExchangeButtonConfig = () => {
    if (userLoading || canAddExchange) return null;

    return {
      text: "Add Exchange",
      badge: "Upgrade",
      badgeColor: "bg-orange-500",
      title: "Upgrade to add exchanges",
    };
  };

  const handleAddExchangeClick = () => {
    if (!canAddExchange) {
      navigate("/plans");
    } else {
      onAddClick?.();
    }
  };

  if (canAddExchange) {
    return (
      <Button
        onClick={onAddClick}
        className="btn-primary flex items-center gap-2"
      >
        <Plus className="w-4 h-4" />
        Add Exchange
      </Button>
    );
  }

  const buttonConfig = getExchangeButtonConfig();
  if (!buttonConfig) return null;

  return (
    <Button
      onClick={handleAddExchangeClick}
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
