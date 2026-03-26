import { useTranslation } from "react-i18next";

import { RefreshCw } from "lucide-react";

import { ConfusedRabbit } from "@/components/ConfusedRabbit";
import { Button } from "@/components/ui/button";

interface PageErrorProps {
  message: string;
  onRetry?: () => void;
}

export function PageError({ message, onRetry }: PageErrorProps) {
  const { t } = useTranslation("common");

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <ConfusedRabbit />

      <p className="mt-4 text-sm text-muted-foreground text-center max-w-md">
        {message}
      </p>

      {onRetry && (
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
          <RefreshCw className="mr-2 h-4 w-4" />
          {t("tryAgain")}
        </Button>
      )}
    </div>
  );
}
