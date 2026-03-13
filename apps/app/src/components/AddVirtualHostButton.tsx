import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CreateVHostModal } from "@/components/vhosts/CreateVHostModal";

interface AddVirtualHostButtonProps {
  serverId: string;
  onSuccess?: () => void;
  initialName?: string;
}

export const AddVirtualHostButton = ({
  serverId,
  onSuccess,
  initialName = "",
}: AddVirtualHostButtonProps) => {
  const { t } = useTranslation("vhosts");
  const [showCreateModal, setShowCreateModal] = useState(false);

  return (
    <>
      <Button
        onClick={() => setShowCreateModal(true)}
        className="btn-primary flex items-center gap-2"
      >
        <Plus className="w-4 h-4" />
        {t("addVhost")}
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
};
