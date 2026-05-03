import { useTranslation } from "react-i18next";

import { XCircle } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface EnhancedErrorDisplayProps {
  /**
   * Human-readable error message. Used as-is — no regex parsing or
   * plan-string extraction. Structured gate errors (license / plan /
   * capability blocks per ADR-002) render via `<FeatureGateCard>`
   * upstream; this component is the fallback for unstructured
   * errors (network, auth, broker unreachable, etc.).
   */
  message?: string;
  className?: string;
}

export const EnhancedErrorDisplay = ({
  message,
  className,
}: EnhancedErrorDisplayProps) => {
  const { t } = useTranslation("common");
  return (
    <Alert
      className={`${className ?? ""} border-destructive/30 bg-destructive/10`}
    >
      <XCircle className="h-4 w-4 text-destructive" />
      <AlertTitle className="text-destructive">{t("error")}</AlertTitle>
      <AlertDescription className="text-destructive">
        {message ?? t("errorDescription")}
      </AlertDescription>
    </Alert>
  );
};
