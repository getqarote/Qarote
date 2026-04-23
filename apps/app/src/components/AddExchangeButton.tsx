import { useTranslation } from "react-i18next";

import { AddExchangeForm } from "@/components/AddExchangeForm";
import { Button } from "@/components/ui/button";

interface AddExchangeButtonProps {
  serverId: string;
  onSuccess?: () => void;
}

export const AddExchangeButton = ({
  serverId,
  onSuccess,
}: AddExchangeButtonProps) => {
  const { t } = useTranslation("exchanges");

  return (
    <AddExchangeForm
      serverId={serverId}
      onSuccess={onSuccess}
      trigger={<Button className="btn-primary">{t("addExchange")}</Button>}
    />
  );
};
