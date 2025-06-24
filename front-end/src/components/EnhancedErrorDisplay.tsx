import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ArrowUpCircle, AlertTriangle, XCircle } from "lucide-react";
import { generateErrorProps } from "@/lib/error-utils";

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
          ? "border-amber-200 bg-amber-50"
          : "border-red-200 bg-red-50"
      }`}
    >
      <Icon
        className={`h-4 w-4 ${
          variant === "warning" ? "text-amber-600" : "text-red-600"
        }`}
      />
      <AlertTitle
        className={variant === "warning" ? "text-amber-800" : "text-red-800"}
      >
        {title}
      </AlertTitle>
      <AlertDescription className="space-y-3">
        <div
          className={variant === "warning" ? "text-amber-700" : "text-red-700"}
        >
          {message}
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`text-sm ${
              variant === "warning" ? "text-amber-600" : "text-red-600"
            }`}
          >
            {action}
          </span>

          {variant === "warning" && onUpgrade && (
            <Button
              variant="outline"
              size="sm"
              onClick={onUpgrade}
              className="border-amber-300 text-amber-700 hover:bg-amber-100"
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
