import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";

interface AddExchangeButtonProps {
  onAddClick?: () => void;
}

export const AddExchangeButton = ({ onAddClick }: AddExchangeButtonProps) => {
  const { t } = useTranslation("exchanges");
  return (
    <Button onClick={onAddClick} className="btn-primary">
      {t("addExchange")}
    </Button>
  );
};
