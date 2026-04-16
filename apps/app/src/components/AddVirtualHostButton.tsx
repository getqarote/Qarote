import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { CreateVHostModal } from "@/components/vhosts/CreateVHostModal";

interface AddVirtualHostButtonProps {
  serverId: string;
  onSuccess?: () => void;
  initialName?: string;
  /**
   * Controlled open state. When provided, the component delegates
   * modal visibility to the parent (useful when the page also needs
   * to open the modal from a different trigger, e.g. the empty state).
   * When omitted, the component manages its own internal state.
   */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const AddVirtualHostButton = ({
  serverId,
  onSuccess,
  initialName = "",
  open: controlledOpen,
  onOpenChange,
}: AddVirtualHostButtonProps) => {
  const { t } = useTranslation("vhosts");
  const [internalOpen, setInternalOpen] = useState(false);

  const isControlled = controlledOpen !== undefined;
  const showModal = isControlled ? controlledOpen : internalOpen;
  const setShowModal = isControlled
    ? (v: boolean) => onOpenChange?.(v)
    : setInternalOpen;

  return (
    <>
      <Button onClick={() => setShowModal(true)} className="btn-primary">
        {t("addVhost")}
      </Button>

      <CreateVHostModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        serverId={serverId}
        initialName={initialName}
        onSuccess={() => {
          setShowModal(false);
          onSuccess?.();
        }}
      />
    </>
  );
};
