import { Lock, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SendMessageDialog } from "@/components/SendMessageDialog";
import {
  canUserSendMessagesWithCount,
  WorkspacePlan,
} from "@/lib/plans/planUtils";

interface AddSendMessageButtonProps {
  workspacePlan: WorkspacePlan;
  monthlyMessageCount: number;
  serverId: string;
  workspaceLoading: boolean;
  onUpgradeClick: () => void;
  onSuccess?: () => void;
}

export const AddSendMessageButton = ({
  workspacePlan,
  monthlyMessageCount,
  serverId,
  workspaceLoading,
  onUpgradeClick,
  onSuccess,
}: AddSendMessageButtonProps) => {
  const canSendMessages = workspaceLoading
    ? false
    : canUserSendMessagesWithCount(workspacePlan, monthlyMessageCount);

  const getMessageButtonConfig = () => {
    if (workspaceLoading || canSendMessages) return null;

    switch (workspacePlan) {
      case "FREE":
        return {
          text: "Send Message",
          badge: "Pro",
          badgeColor: "bg-orange-500",
          title: "Upgrade to send messages",
        };
      case "FREELANCE":
        return {
          text: "Send Message",
          badge: `${monthlyMessageCount}/100`,
          badgeColor: "bg-blue-500",
          title:
            "You've reached your monthly message limit (100). Upgrade to send more messages.",
        };
      case "STARTUP":
        return {
          text: "Send Message",
          badge: `${monthlyMessageCount}/1000`,
          badgeColor: "bg-purple-500",
          title:
            "You've reached your monthly message limit (1,000). Upgrade to send more messages.",
        };
      case "BUSINESS":
        // Business plan has unlimited messages, so this shouldn't show
        return null;
      default:
        return {
          text: "Send Message",
          badge: "Pro",
          badgeColor: "bg-orange-500",
          title: "Upgrade to send messages",
        };
    }
  };

  const handleSendMessageClick = () => {
    if (!canSendMessages) {
      onUpgradeClick();
    }
  };

  if (canSendMessages) {
    return (
      <SendMessageDialog
        serverId={serverId}
        mode="exchange"
        onSuccess={onSuccess}
        trigger={
          <Button variant="outline" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Send Message
          </Button>
        }
      />
    );
  }

  const buttonConfig = getMessageButtonConfig();
  if (!buttonConfig) return null;

  return (
    <Button
      onClick={handleSendMessageClick}
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
