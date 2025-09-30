import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddServerForm } from "@/components/AddServerFormComponent";
import { UserPlan } from "@/types/plans";
import { useUser } from "@/hooks/useUser";

interface AddServerButtonProps {
  onUpgradeClick: () => void;
}

export const AddServerButton = ({ onUpgradeClick }: AddServerButtonProps) => {
  const {
    userPlan,
    canAddServer,
    isLoading: userLoading,
    planData,
  } = useUser();

  // Keep server usage since we still track servers
  const serverUsage = planData?.usage?.servers || {
    current: 0,
    limit: 1,
    percentage: 0,
    canAdd: false,
  };

  const getServerButtonConfig = () => {
    if (userLoading || canAddServer) return null;

    switch (userPlan) {
      case UserPlan.FREE:
        return {
          text: "Add Server",
          badge: "Pro",
          badgeColor: "bg-orange-500",
          title: "Upgrade to add servers",
        };
      case UserPlan.DEVELOPER:
        return {
          text: "Add Server",
          badge: `${serverUsage.current}/${serverUsage.limit || 2}`,
          badgeColor: "bg-blue-500",
          title:
            "You've reached your server limit. Upgrade to add more servers.",
        };
      case UserPlan.ENTERPRISE:
        return {
          text: "Add Server",
          badge: `${serverUsage.current}/${serverUsage.limit || 5}`,
          badgeColor: "bg-purple-500",
          title:
            "You've reached your server limit. Upgrade to add more servers.",
        };
      default:
        return {
          text: "Add Server",
          badge: "Pro",
          badgeColor: "bg-orange-500",
          title: "Upgrade to add servers",
        };
    }
  };

  const handleAddServerClick = () => {
    if (!canAddServer) {
      onUpgradeClick();
    }
  };

  if (canAddServer) {
    return <AddServerForm />;
  }

  const buttonConfig = getServerButtonConfig();
  if (!buttonConfig) return null;

  return (
    <Button
      onClick={handleAddServerClick}
      disabled={true}
      variant="outline"
      className="flex items-center gap-2 opacity-60 cursor-not-allowed"
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
