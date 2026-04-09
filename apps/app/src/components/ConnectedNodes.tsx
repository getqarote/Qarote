import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { ArrowRight, Cpu, HardDrive, Server, Wifi } from "lucide-react";

import { RabbitMQNode } from "@/lib/api";

import { RabbitMQPermissionError } from "@/components/RabbitMQPermissionError";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { isRabbitMQAuthError } from "@/types/apiErrors";

interface ConnectedNodesProps {
  nodes: RabbitMQNode[];
  isLoading: boolean;
  nodesError?: Error | null;
}

export const ConnectedNodes = ({
  nodes,
  isLoading,
  nodesError,
}: ConnectedNodesProps) => {
  const { t } = useTranslation("dashboard");

  const getStatusBadge = (node: RabbitMQNode) => {
    if (!node.running) {
      return (
        <Badge className="bg-destructive/10 text-destructive hover:bg-destructive/10">
          <Wifi className="w-3 h-3 mr-1" />
          Error
        </Badge>
      );
    }

    const memoryUsage = (node.mem_used / node.mem_limit) * 100;
    const diskUsage =
      ((node.disk_free_limit - node.disk_free) / node.disk_free_limit) * 100;

    if (memoryUsage > 80 || diskUsage > 80) {
      return (
        <Badge className="bg-warning-muted text-warning hover:bg-warning-muted">
          <Wifi className="w-3 h-3 mr-1" />
          Warning
        </Badge>
      );
    }

    return (
      <Badge className="bg-success-muted text-success hover:bg-success-muted">
        <Wifi className="w-3 h-3 mr-1" />
        {t("running")}
      </Badge>
    );
  };

  const formatUptime = (uptimeMs: number) => {
    const days = Math.floor(uptimeMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor(
      (uptimeMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );
    const minutes = Math.floor((uptimeMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${days}d ${hours}h ${minutes}m`;
  };

  const formatBytes = (bytes: number) => {
    const gb = bytes / (1024 * 1024 * 1024);
    return `${gb.toFixed(1)} GB`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Server className="h-5 w-5" />
              {t("connectedNodesTitle")} ({nodes.length})
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {t("connectedNodesSubtitle")}
            </p>
          </div>
          <Link
            to="/nodes"
            className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 transition-colors font-medium"
          >
            {t("seeMore")}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {nodesError && isRabbitMQAuthError(nodesError) ? (
          <RabbitMQPermissionError
            requiredPermission={nodesError.requiredPermission}
            message={nodesError.message}
            title="RabbitMQNode Information Unavailable"
          />
        ) : isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-4 bg-muted rounded-lg border">
                <Skeleton className="h-5 w-32 mb-3" />
                <Skeleton className="h-4 w-20 mb-2" />
                <div className="space-y-2">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : nodes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {nodes.map((node) => (
              <div
                key={node.name}
                className="p-4 bg-card rounded-lg border border-border hover:shadow-md transition-all duration-300"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-foreground truncate">
                    {node.name}
                  </h3>
                  {getStatusBadge(node)}
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      {t("nodeType")}:
                    </span>
                    <span className="font-medium">{node.type}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      {t("uptime")}:
                    </span>
                    <span className="font-medium">
                      {formatUptime(node.uptime)}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-3">
                    <div className="text-center p-2 bg-card rounded">
                      <HardDrive className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
                      <div className="text-xs font-medium">
                        {formatBytes(node.mem_used)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {t("memory")}
                      </div>
                    </div>

                    <div className="text-center p-2 bg-card rounded">
                      <Cpu className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
                      <div className="text-xs font-medium">
                        {node.processors}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {t("cpus")}
                      </div>
                    </div>

                    <div className="text-center p-2 bg-card rounded">
                      <Server className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
                      <div className="text-xs font-medium">
                        {formatBytes(node.disk_free)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {t("diskFree")}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Server className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">{t("noNodesFound")}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
