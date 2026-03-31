import { ConfusedRabbit } from "@/components/ConfusedRabbit";

interface PageErrorProps {
  message: string;
}

export function PageError({ message }: PageErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <ConfusedRabbit />

      <p className="mt-4 text-sm text-muted-foreground text-center max-w-md">
        {message}
      </p>
    </div>
  );
}
