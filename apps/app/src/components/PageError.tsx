import { ConfusedRabbit } from "@/components/ConfusedRabbit";
import { Button } from "@/components/ui/button";

interface PageErrorProps {
  message: string;
  onRetry?: () => void;
}

export function PageError({ message, onRetry }: PageErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <ConfusedRabbit />

      <p className="mt-4 text-sm text-muted-foreground text-center max-w-md">
        {message}
      </p>

      {onRetry && (
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
