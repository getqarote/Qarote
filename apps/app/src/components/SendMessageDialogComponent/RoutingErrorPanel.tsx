import { useTranslation } from "react-i18next";

import { AlertCircle } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

import type { RoutingError } from "./types";

interface RoutingErrorPanelProps {
  routingError: RoutingError;
  onApplySuggestion: (suggestion: string) => void;
  onDismiss: () => void;
}

export const RoutingErrorPanel = ({
  routingError,
  onApplySuggestion,
  onDismiss,
}: RoutingErrorPanelProps) => {
  const { t } = useTranslation("exchanges");

  return (
    <Alert variant="destructive" className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        <div className="space-y-3">
          <div className="font-medium">{routingError.message}</div>

          {routingError.details && (
            <dl className="text-sm grid grid-cols-[auto_1fr] gap-x-2 gap-y-1">
              <dt className="font-medium">{t("sendMessage.issueLabel")}</dt>
              <dd>{routingError.details.reason}</dd>
              <dt className="font-medium">{t("sendMessage.exchangeLabel2")}</dt>
              <dd className="font-mono text-xs">
                {routingError.details.exchange || "(default)"}
              </dd>
              <dt className="font-medium">
                {t("sendMessage.routingKeyLabel2")}
              </dt>
              <dd className="font-mono text-xs">
                {routingError.details.routingKey || "—"}
              </dd>
            </dl>
          )}

          {routingError.suggestions.length > 0 && (
            <div className="space-y-2">
              <div className="font-medium text-sm">
                {t("sendMessage.suggestionsTitle")}
              </div>
              <ul className="space-y-1.5">
                {routingError.suggestions.map((suggestion, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <span
                      aria-hidden
                      className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-current"
                    />
                    <span className="flex-1">{suggestion}</span>
                    {(suggestion.includes("default exchange") ||
                      suggestion.includes("Consider using")) && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onApplySuggestion(suggestion)}
                        className="ml-2 text-xs"
                      >
                        {t("sendMessage.apply")}
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {routingError.details?.possibleCauses &&
            routingError.details.possibleCauses.length > 0 && (
              <div className="space-y-2">
                <div className="font-medium text-sm">
                  {t("sendMessage.possibleCausesTitle")}
                </div>
                <ul className="space-y-1">
                  {routingError.details.possibleCauses.map((cause, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-2 text-sm text-muted-foreground"
                    >
                      <span
                        aria-hidden
                        className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/40"
                      />
                      <span className="flex-1">{cause}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onDismiss}
            className="mt-2"
          >
            {t("sendMessage.dismiss")}
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
};
