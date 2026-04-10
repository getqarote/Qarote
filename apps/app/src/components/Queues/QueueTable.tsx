import { useTranslation } from "react-i18next";

import { Lock, MessageSquare, Users } from "lucide-react";

import { Queue } from "@/lib/api";

import { PurgeQueueDialog } from "@/components/PurgeQueueDialog";
import { QueueStatusBadge } from "@/components/Queues/queue-status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PaginationControls } from "@/components/ui/PaginationControls";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface QueueTableProps {
  queues: Queue[];
  isLoading: boolean;
  searchTerm: string;
  isAdmin?: boolean;
  onNavigateToQueue: (queueName: string) => void;
  onRefetch: () => void;
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export function QueueTable({
  queues,
  isLoading,
  searchTerm,
  isAdmin,
  onNavigateToQueue,
  onRefetch,
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: QueueTableProps) {
  const { t } = useTranslation("queues");
  const getQueueMetrics = (queue: Queue) => {
    return {
      messages: queue.messages || 0,
      consumers: queue.consumers || 0,
      messagesReady: queue.messages_ready || 0,
      messagesUnacked: queue.messages_unacknowledged || 0,
      incomingRate: queue.message_stats?.publish_details?.rate || 0,
      deliverGetRate: queue.message_stats?.deliver_get_details?.rate || 0,
      ackRate: queue.message_stats?.ack_details?.rate || 0,
      memory: (queue.memory || 0) / (1024 * 1024), // Convert to MB
      vhost: queue.vhost || "/",
      durability: queue.durable ? "durable" : "transient",
      autoDelete: queue.auto_delete || false,
    };
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-foreground">
            {t("allQueues")}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : queues.length > 0 ? (
          <>
            <Table className="tabular-nums">
              <TableHeader>
                <TableRow>
                  <TableHead>{t("queueName")}</TableHead>
                  <TableHead>{t("status")}</TableHead>
                  <TableHead>{t("messages")}</TableHead>
                  <TableHead>{t("ready")}</TableHead>
                  <TableHead>{t("unacked")}</TableHead>
                  <TableHead>{t("consumers")}</TableHead>
                  <TableHead>{t("incoming")}</TableHead>
                  <TableHead>{t("deliverGet")}</TableHead>
                  <TableHead>{t("ack")}</TableHead>
                  <TableHead>{t("memory")}</TableHead>
                  <TableHead>{t("vhost")}</TableHead>
                  {isAdmin && <TableHead>{t("actions")}</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {queues.map((queue) => {
                  const metrics = getQueueMetrics(queue);
                  return (
                    <TableRow
                      key={`${queue.name}-${queue.vhost}`}
                      className="hover:bg-accent/50"
                    >
                      <TableCell className="font-medium max-w-[300px]">
                        <div className="flex items-center gap-2 min-w-0">
                          <button
                            type="button"
                            onClick={() =>
                              onNavigateToQueue(encodeURIComponent(queue.name))
                            }
                            className="text-left font-medium text-foreground hover:text-primary hover:underline transition-colors cursor-pointer truncate"
                            title={queue.name}
                          >
                            {queue.name}
                          </button>
                          {queue.internal && (
                            <Badge
                              variant="secondary"
                              className="text-xs flex items-center gap-1"
                              title="Internal queue (not accessible via AMQP)"
                            >
                              <Lock className="w-3 h-3" />
                              {t("internal")}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <QueueStatusBadge state={queue.state} />
                      </TableCell>
                      <TableCell className="font-mono">
                        {metrics.messages}
                      </TableCell>
                      <TableCell className="font-mono">
                        {metrics.messagesReady}
                      </TableCell>
                      <TableCell
                        className={
                          metrics.messagesUnacked > 0
                            ? "font-mono text-warning"
                            : "font-mono"
                        }
                      >
                        {metrics.messagesUnacked}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Users className="w-3 h-3 text-muted-foreground" />
                          <span className="font-mono tabular-nums">
                            {metrics.consumers}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono">
                        {metrics.incomingRate.toFixed(1)}
                      </TableCell>
                      <TableCell className="font-mono">
                        {metrics.deliverGetRate.toFixed(1)}
                      </TableCell>
                      <TableCell className="font-mono">
                        {metrics.ackRate.toFixed(1)}
                      </TableCell>
                      <TableCell className="font-mono">
                        {metrics.memory.toFixed(1)}
                        <span className="text-xs text-muted-foreground ml-1">
                          MB
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs">
                          {metrics.vhost}
                        </Badge>
                      </TableCell>
                      {isAdmin && (
                        <TableCell>
                          <PurgeQueueDialog
                            queueName={queue.name}
                            messageCount={queue.messages}
                            vhost={metrics.vhost}
                            onSuccess={() => onRefetch()}
                          />
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <PaginationControls
              total={total}
              page={page}
              pageSize={pageSize}
              onPageChange={onPageChange}
              onPageSizeChange={onPageSizeChange}
              itemLabel={t("queues")}
            />
          </>
        ) : (
          <div className="text-center py-8">
            <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {searchTerm
                ? t("noQueuesMatchingSearch", { term: searchTerm })
                : t("noQueuesOnServer")}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
