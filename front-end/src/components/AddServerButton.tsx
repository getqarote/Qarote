import { useNavigate } from "react-router-dom";

import { Lock } from "lucide-react";

import { AddServerForm } from "@/components/AddServerFormComponent";
import { Button } from "@/components/ui/button";

import { useUser } from "@/hooks/useUser";

import { UserPlan } from "@/types/plans";

export const AddServerButton = () => {
  const {
    userPlan,
    canAddServer,
    isLoading: userLoading,
    planData,
  } = useUser();
  const navigate = useNavigate();

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
          badge: "Upgrade",
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
          badge: "Upgrade",
          badgeColor: "bg-orange-500",
          title: "Upgrade to add servers",
        };
    }
  };

  const handleAddServerClick = () => {
    if (!canAddServer) {
      navigate("/plans");
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
      variant="outline"
      className="flex items-center gap-2 opacity-60 cursor-pointer hover:bg-gray-100"
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
