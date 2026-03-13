import { useTranslation } from "react-i18next";

import { Plus } from "lucide-react";

import { AddQueueForm } from "@/components/AddQueueForm";
import { Button } from "@/components/ui/button";

interface AddQueueButtonProps {
  serverId: string;
  onSuccess?: () => void;
}

export const AddQueueButton = ({
  serverId,
  onSuccess,
}: AddQueueButtonProps) => {
  const { t } = useTranslation("queues");

  return (
    <AddQueueForm
      serverId={serverId}
      onSuccess={onSuccess}
      trigger={
        <Button className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          {t("addQueue")}
        </Button>
      }
    />
  );
};
