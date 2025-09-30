import { Lock, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SendMessageDialog } from "@/components/SendMessageDialog";
import { UserPlan } from "@/types/plans";
import { useUser } from "@/hooks/useUser";

interface AddSendMessageButtonProps {
  serverId: string;
  onUpgradeClick: () => void;
  onSuccess?: () => void;
}

export const AddSendMessageButton = ({
  serverId,
  onUpgradeClick,
  onSuccess,
}: AddSendMessageButtonProps) => {
  const { userPlan, canSendMessages, isLoading: userLoading } = useUser();

  const getMessageButtonConfig = () => {
    if (userLoading || canSendMessages) return null;

    switch (userPlan) {
      case UserPlan.FREE:
        return {
          text: "Send Message",
          badge: "Pro",
          badgeColor: "bg-orange-500",
          title: "Upgrade to send messages",
        };
      case UserPlan.DEVELOPER:
        return {
          text: "Send Message",
          badge: "Pro",
          badgeColor: "bg-blue-500",
          title: "Send messages available with Developer plan",
        };
      case UserPlan.ENTERPRISE:
        return {
          text: "Send Message",
          badge: "Pro",
          badgeColor: "bg-purple-500",
          title: "Send messages available with Enterprise plan",
        };
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
