import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { ArrowRight, ChevronRight, Server, Wifi } from "lucide-react";

import { RabbitMQNode } from "@/lib/api";

import { RabbitMQPermissionError } from "@/components/RabbitMQPermissionError";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
  const [expandedNames, setExpandedNames] = useState<Set<string>>(new Set());

  const toggleExpanded = (name: string, isOpen: boolean) => {
    setExpandedNames((prev) => {
      const next = new Set(prev);
      if (isOpen) next.add(name);
      else next.delete(name);
      return next;
    });
  };

  const getStatusBadge = (node: RabbitMQNode) => {
    if (!node.running) {
      return (
        <Badge className="bg-destructive/10 text-destructive hover:bg-destructive/10">
          {t("nodeError")}
        </Badge>
      );
    }

    const memoryUsage = (node.mem_used / node.mem_limit) * 100;
    const diskUsage =
      ((node.disk_free_limit - node.disk_free) / node.disk_free_limit) * 100;

    if (memoryUsage > 80 || diskUsage > 80) {
      return (
        <Badge className="bg-warning-muted text-warning hover:bg-warning-muted">
          {t("nodeWarning")}
        </Badge>
      );
    }

    return (
      <Badge className="bg-success-muted text-success hover:bg-success-muted">
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
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b border-border">
        <h2 className="title-section flex items-center gap-2">
          {t("connectedNodesTitle")}
          <Badge variant="secondary">{nodes.length}</Badge>
        </h2>
        <Link
          to="/nodes"
          className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 transition-colors font-medium"
        >
          {t("seeMore")}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      {nodesError && isRabbitMQAuthError(nodesError) ? (
        <div className="p-4">
          <RabbitMQPermissionError
            requiredPermission={nodesError.requiredPermission}
            message={nodesError.message}
            title={t("nodeInfoUnavailable")}
          />
        </div>
      ) : isLoading ? (
        <div className="p-4 space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : nodes.length > 0 ? (
        <div className="divide-y divide-border">
          {nodes.map((node) => (
            <Collapsible
              key={node.name}
              open={expandedNames.has(node.name)}
              onOpenChange={(open) => toggleExpanded(node.name, open)}
            >
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="w-full flex items-center px-4 py-3 hover:bg-accent transition-colors text-left"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Wifi className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="font-medium font-mono text-sm truncate">
                      {node.name}
                    </span>
                    {getStatusBadge(node)}
                    <span className="hidden sm:inline text-xs text-muted-foreground">
                      {node.type}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="hidden md:inline font-mono tabular-nums">
                      {formatUptime(node.uptime)}
                    </span>
                    <ChevronRight
                      className={`h-4 w-4 transition-transform duration-150 ${
                        expandedNames.has(node.name) ? "rotate-90" : ""
                      }`}
                    />
                  </div>
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="border-t border-border bg-muted/20 px-4 py-3">
                  <div className="flex flex-wrap gap-x-6 gap-y-2">
                    <DetailItem label={t("nodeType")} value={node.type} t={t} />
                    <DetailItem
                      label={t("uptime")}
                      value={formatUptime(node.uptime)}
                      mono
                      t={t}
                    />
                    <DetailItem
                      label={t("memory")}
                      value={formatBytes(node.mem_used)}
                      mono
                      t={t}
                    />
                    <DetailItem
                      label={t("cpus")}
                      value={String(node.processors)}
                      mono
                      t={t}
                    />
                    <DetailItem
                      label={t("diskFree")}
                      value={formatBytes(node.disk_free)}
                      mono
                      t={t}
                    />
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 px-4">
          <Server className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">{t("noNodesFound")}</p>
        </div>
      )}
    </div>
  );
};

function DetailItem({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
  t: (key: string) => string;
}) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span
        className={`text-xs font-medium text-foreground ${mono ? "font-mono tabular-nums" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}
