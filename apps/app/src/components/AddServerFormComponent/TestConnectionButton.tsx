import { useTranslation } from "react-i18next";

import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

interface TestConnectionButtonProps {
  onTestConnection: () => void;
  isTestingConnection: boolean;
  isLoading: boolean;
  disabled?: boolean;
  /** Render as a secondary action (outline) instead of the primary button —
   *  used on the URL-first add flow where "Detect →" owns the primary slot. */
  variant?: "primary" | "secondary";
}

export const TestConnectionButton = ({
  onTestConnection,
  isTestingConnection,
  isLoading,
  disabled,
  variant = "primary",
}: TestConnectionButtonProps) => {
  const { t } = useTranslation("dashboard");
  return (
    <Button
      type="button"
      variant={variant === "secondary" ? "outline" : undefined}
      className={
        variant === "secondary" ? "min-w-[160px]" : "btn-primary min-w-[160px]"
      }
      onClick={onTestConnection}
      disabled={disabled || isTestingConnection || isLoading}
    >
      {isTestingConnection && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
      {isTestingConnection ? t("testingConnection") : t("testConnection")}
    </Button>
  );
};
