import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useServerContext } from "@/contexts/ServerContext";
import { useServer, useOverview } from "@/hooks/useApi";

export const ConnectionStatus = () => {
  const { selectedServerId } = useServerContext();
  const { data: serverData, isLoading: serverLoading } = useServer(
    selectedServerId || ""
  );
  const { data: overviewData, isLoading: overviewLoading } = useOverview(
    selectedServerId || ""
  );

  if (!selectedServerId) {
    return (
      <div className="flex items-center gap-2 mt-1">
        <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
        <Badge variant="secondary" className="bg-gray-100 text-gray-700">
          No server selected
        </Badge>
      </div>
    );
  }

  if (serverLoading || overviewLoading) {
    return (
      <div className="flex items-center gap-2 mt-1">
        <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
        <Skeleton className="h-5 w-32" />
      </div>
    );
  }

  const server = serverData?.server;
  const overview = overviewData?.overview;

  if (!server || !overview) {
    return (
      <div className="flex items-center gap-2 mt-1">
        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
        <Badge variant="secondary" className="bg-red-100 text-red-700">
          Connection failed
        </Badge>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 mt-1">
      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
      <Badge variant="secondary" className="bg-green-100 text-green-700">
        Connected to {overview.cluster_name || server.name}
      </Badge>
      <Badge variant="outline" className="text-xs">
        v{overview.rabbitmq_version}
      </Badge>
    </div>
  );
};
