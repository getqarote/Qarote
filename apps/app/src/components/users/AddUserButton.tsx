import { useState } from "react";
import { useTranslation } from "react-i18next";

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
      <Button onClick={() => setShowCreateModal(true)} className="btn-primary">
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
