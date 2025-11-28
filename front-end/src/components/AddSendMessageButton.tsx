import { MessageSquare } from "lucide-react";

import { SendMessageDialog } from "@/components/SendMessageDialog";
import { Button } from "@/components/ui/button";

interface AddSendMessageButtonProps {
  serverId: string;
  onSuccess?: () => void;
}

export const AddSendMessageButton = ({
  serverId,
  onSuccess,
}: AddSendMessageButtonProps) => {
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
};
