
import { Badge } from "@/components/ui/badge";

export const ConnectionStatus = () => {
  return (
    <div className="flex items-center gap-2 mt-1">
      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
      <Badge variant="secondary" className="bg-green-100 text-green-700">
        Connected to cluster-prod-01
      </Badge>
    </div>
  );
};
