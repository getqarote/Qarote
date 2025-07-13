import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle } from "lucide-react";

interface TestConnectionButtonProps {
  onTestConnection: () => void;
  isTestingConnection: boolean;
  isLoading: boolean;
}

export const TestConnectionButton = ({
  onTestConnection,
  isTestingConnection,
  isLoading,
}: TestConnectionButtonProps) => {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={onTestConnection}
      disabled={isTestingConnection || isLoading}
      className="min-w-[140px]"
    >
      {isTestingConnection ? (
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
      ) : (
        <CheckCircle className="h-4 w-4 mr-2" />
      )}
      Test Connection
    </Button>
  );
};
