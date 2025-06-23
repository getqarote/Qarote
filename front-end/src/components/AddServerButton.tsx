import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddServerForm } from "@/components/AddServerForm";
import {
  canUserAddServerWithCount,
  WorkspacePlan,
} from "@/lib/plans/planUtils";

interface AddServerButtonProps {
  workspacePlan: WorkspacePlan;
  serverCount: number;
  workspaceLoading: boolean;
  onUpgradeClick: () => void;
}

export const AddServerButton = ({
  workspacePlan,
  serverCount,
  workspaceLoading,
  onUpgradeClick,
}: AddServerButtonProps) => {
  const canAddServer = workspaceLoading
    ? false
    : canUserAddServerWithCount(workspacePlan, serverCount);

  const getServerButtonConfig = () => {
    if (workspaceLoading || canAddServer) return null;

    switch (workspacePlan) {
      case "FREE":
        return {
          text: "Add Server",
          badge: "Pro",
          badgeColor: "bg-orange-500",
          title: "Upgrade to add servers",
        };
      case "FREELANCE":
        return {
          text: "Add Server",
          badge: `${serverCount}/2`,
          badgeColor: "bg-blue-500",
          title:
            "You've reached your server limit (2). Upgrade to add more servers.",
        };
      case "STARTUP":
        return {
          text: "Add Server",
          badge: `${serverCount}/5`,
          badgeColor: "bg-purple-500",
          title:
            "You've reached your server limit (5). Upgrade to add more servers.",
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
