import { useTranslation } from "react-i18next";

import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

interface TestConnectionButtonProps {
  onTestConnection: () => void;
  isTestingConnection: boolean;
  isLoading: boolean;
  disabled?: boolean;
}

export const TestConnectionButton = ({
  onTestConnection,
  isTestingConnection,
  isLoading,
  disabled,
}: TestConnectionButtonProps) => {
  const { t } = useTranslation("dashboard");
  return (
    <Button
      type="button"
      className="btn-primary min-w-[160px]"
      onClick={onTestConnection}
      disabled={disabled || isTestingConnection || isLoading}
    >
      {isTestingConnection && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
      {isTestingConnection ? t("testingConnection") : t("testConnection")}
    </Button>
  );
};
