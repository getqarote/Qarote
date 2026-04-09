import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

import { CreateUserModal } from "./CreateUserModal";

interface AddUserButtonProps {
  serverId: string;
  onSuccess?: () => void;
}

export function AddUserButton({ serverId, onSuccess }: AddUserButtonProps) {
  const { t } = useTranslation("users");
  const [showCreateModal, setShowCreateModal] = useState(false);

  return (
    <>
      <Button onClick={() => setShowCreateModal(true)}>
        <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
        {t("addUser")}
      </Button>
      <CreateUserModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        serverId={serverId}
        onSuccess={onSuccess}
      />
    </>
  );
}
