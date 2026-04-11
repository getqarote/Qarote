import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

import { useServerContext } from "@/contexts/ServerContext";

import { useOverview } from "@/hooks/queries/useRabbitMQ";
import { useServer } from "@/hooks/queries/useServer";

export const ConnectionStatus = () => {
  const { t } = useTranslation("dashboard");
  const { selectedServerId } = useServerContext();
  const { data: serverData, isLoading: serverLoading } =
    useServer(selectedServerId);
  const { data: overviewData, isLoading: overviewLoading } =
    useOverview(selectedServerId);

  if (!selectedServerId) {
    return (
      <div className="flex items-center gap-2 mt-1">
        <div className="w-2 h-2 bg-muted-foreground/40 rounded-full"></div>
        <Badge variant="secondary" className="bg-muted text-muted-foreground">
          {t("noServerSelectedStatus")}
        </Badge>
      </div>
    );
  }

  if (serverLoading || overviewLoading) {
    return (
      <div className="flex items-center gap-2 mt-1">
        <div className="w-2 h-2 bg-warning rounded-full animate-pulse"></div>
        <Skeleton className="h-5 w-32" />
      </div>
    );
  }

  const server = serverData?.server;
  const overview = overviewData?.overview;

  if (!server || !overview) {
    return (
      <div className="flex items-center gap-2 mt-1">
        <div className="w-2 h-2 bg-destructive/100 rounded-full"></div>
        <Badge
          variant="secondary"
          className="bg-destructive/10 text-destructive"
        >
          {t("connectionFailedStatus")}
        </Badge>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 mt-1 flex-wrap">
      <div className="w-2 h-2 bg-success-muted rounded-full animate-pulse"></div>
      <Badge
        variant="secondary"
        className="bg-success-muted text-success max-w-xs truncate"
      >
        {t("connectedToServer", { name: server.name || overview.cluster_name })}
      </Badge>
      <Badge variant="outline" className="text-xs">
        RabbitMQ v{overview.rabbitmq_version}
      </Badge>
      <Badge variant="outline" className="text-xs">
        Erlang {overview.erlang_version}
      </Badge>
      {overview.default_queue_type && (
        <Badge variant="outline" className="text-xs">
          Default: {overview.default_queue_type}
        </Badge>
      )}
      {overview.cluster_tags && overview.cluster_tags.length > 0 && (
        <div className="flex items-center gap-1">
          {overview.cluster_tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};
