import { AlertTriangle, ArrowUpCircle, XCircle } from "lucide-react";

import { generateErrorProps } from "@/lib/error-utils";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface EnhancedErrorDisplayProps {
  error: Error;
  onUpgrade?: () => void;
  className?: string;
}

export const EnhancedErrorDisplay = ({
  error,
  onUpgrade,
  className,
}: EnhancedErrorDisplayProps) => {
  const { title, message, action, variant } = generateErrorProps(error);

  const Icon = variant === "warning" ? AlertTriangle : XCircle;

  return (
    <Alert
      className={`${className} ${
        variant === "warning"
          ? "border-warning/30 bg-warning-muted"
          : "border-destructive/30 bg-destructive/10"
      }`}
    >
      <Icon
        className={`h-4 w-4 ${
          variant === "warning" ? "text-warning" : "text-destructive"
        }`}
      />
      <AlertTitle
        className={variant === "warning" ? "text-warning" : "text-destructive"}
      >
        {title}
      </AlertTitle>
      <AlertDescription className="space-y-3">
        <div
          className={
            variant === "warning" ? "text-warning" : "text-destructive"
          }
        >
          {message}
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`text-sm ${
              variant === "warning" ? "text-warning" : "text-destructive"
            }`}
          >
            {action}
          </span>

          {variant === "warning" && onUpgrade && (
            <Button
              variant="outline"
              size="sm"
              onClick={onUpgrade}
              className="border-warning/40 text-warning hover:bg-warning-muted"
            >
              <ArrowUpCircle className="h-3 w-3 mr-1" />
              Upgrade Plan
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
};
