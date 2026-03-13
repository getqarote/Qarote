import { useTranslation } from "react-i18next";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

interface AddExchangeButtonProps {
  onAddClick?: () => void;
}

export const AddExchangeButton = ({ onAddClick }: AddExchangeButtonProps) => {
  const { t } = useTranslation("exchanges");
  return (
    <Button
      onClick={onAddClick}
      className="btn-primary flex items-center gap-2"
    >
      <Plus className="w-4 h-4" />
      {t("addExchange")}
    </Button>
  );
};
