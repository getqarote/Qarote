import { useState } from "react";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CreateUserModal } from "@/components/users/CreateUserModal";

interface AddUserButtonProps {
  serverId: string;
  onSuccess?: () => void;
  initialName?: string;
}

export const AddUserButton = ({
  serverId,
  onSuccess,
  initialName = "",
}: AddUserButtonProps) => {
  const [showCreateModal, setShowCreateModal] = useState(false);

  return (
    <>
      <Button
        onClick={() => setShowCreateModal(true)}
        className="btn-primary flex items-center gap-2"
      >
        <Plus className="w-4 h-4" />
        Add user
      </Button>

      <CreateUserModal
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
