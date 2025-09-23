import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PurgeQueueDialog } from "@/components/PurgeQueueDialog";
import { MessageSquare, Users, Trash2, Lock } from "lucide-react";
import { Queue } from "@/lib/api";
import { useWorkspace } from "@/hooks/useWorkspace";
import { WorkspacePlan } from "@/types/plans";
import { useState } from "react";
import { PlanUpgradeModal } from "@/components/plans/PlanUpgradeModal";

interface QueueTableProps {
  queues: Queue[];
  isLoading: boolean;
  searchTerm: string;
  onNavigateToQueue: (queueName: string) => void;
  onRefetch: () => void;
}

export function QueueTable({
  queues,
  isLoading,
  searchTerm,
  onNavigateToQueue,
  onRefetch,
}: QueueTableProps) {
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const { canManageQueues, workspacePlan } = useWorkspace();

  const handleQueueManagementClick = () => {
    if (!canManageQueues) {
      setShowUpgradeModal(true);
    }
  };

  const getStatusBadge = (queue: Queue) => {
    if (queue.consumers > 0) {
      return <Badge className="bg-green-100 text-green-700">Running</Badge>;
    }
    if (queue.messages > 0) {
      return <Badge className="bg-yellow-100 text-yellow-700">Waiting</Badge>;
    }
    // Check if queue appears to be paused (no consumers but has configuration)
    if (queue.consumers === 0 && queue.durable) {
      return <Badge className="bg-gray-100 text-gray-700">Paused</Badge>;
    }
    return <Badge variant="outline">Idle</Badge>;
  };

  const getQueueMetrics = (queue: Queue) => {
    return {
      messages: queue.messages || 0,
      consumers: queue.consumers || 0,
      messagesReady: queue.messages_ready || 0,
      messagesUnacked: queue.messages_unacknowledged || 0,
      messageRate: queue.message_stats?.publish_details?.rate || 0,
      consumerUtilisation:
        (queue.consumers || 0) > 0
          ? Math.min(
              100,
              (queue.message_stats?.deliver_details?.rate || 0) * 10
            )
          : 0,
      memory: (queue.memory || 0) / (1024 * 1024), // Convert to MB
      vhost: queue.vhost || "/",
      durability: queue.durable ? "durable" : "transient",
      autoDelete: queue.auto_delete || false,
    };
  };

  return (
    <Card className="border-0 shadow-md bg-card-unified backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-900">
            All Queues
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Queue Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Messages</TableHead>
                <TableHead>Ready</TableHead>
                <TableHead>Unacked</TableHead>
                <TableHead>Consumers</TableHead>
                <TableHead>Rate (msg/s)</TableHead>
                <TableHead>Memory (MB)</TableHead>
                <TableHead>VHost</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {queues.map((queue) => {
                const metrics = getQueueMetrics(queue);
                return (
                  <TableRow
                    key={`${queue.name}-${queue.vhost}`}
                    className="hover:bg-gray-50/50"
                  >
                    <TableCell className="font-medium">
                      <button
                        onClick={() =>
                          onNavigateToQueue(encodeURIComponent(queue.name))
                        }
                        className="text-left font-medium text-orange-600 hover:text-orange-700 hover:underline transition-colors cursor-pointer"
                      >
                        {queue.name}
                      </button>
                    </TableCell>
                    <TableCell>{getStatusBadge(queue)}</TableCell>
                    <TableCell className="font-mono">
                      {metrics.messages}
                    </TableCell>
                    <TableCell className="font-mono text-blue-600">
                      {metrics.messagesReady}
                    </TableCell>
                    <TableCell className="font-mono text-orange-600">
                      {metrics.messagesUnacked}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3 text-gray-400" />
                        {metrics.consumers}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono">
                      {metrics.messageRate.toFixed(1)}
                    </TableCell>
                    <TableCell className="font-mono">
                      {metrics.memory.toFixed(1)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">
                        {metrics.vhost}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {canManageQueues ? (
                        <PurgeQueueDialog
                          queueName={queue.name}
                          messageCount={queue.messages}
                          onSuccess={() => onRefetch()}
                        />
                      ) : (
                        <Button
                          onClick={handleQueueManagementClick}
                          disabled={true}
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700 opacity-60 cursor-not-allowed"
                          title={
                            workspacePlan === WorkspacePlan.FREE
                              ? "Upgrade to Developer or Enterprise plan to purge queues"
                              : "Upgrade to purge queues"
                          }
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Purge
                          <span className="ml-1 px-1.5 py-0.5 text-white text-xs rounded-full font-bold bg-orange-500">
                            Pro
                          </span>
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8">
            <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">
              {searchTerm
                ? `No queues found matching "${searchTerm}"`
                : "No queues found on this server"}
            </p>
          </div>
        )}
      </CardContent>

      {showUpgradeModal && (
        <PlanUpgradeModal
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          currentPlan={workspacePlan}
          feature="queue-management"
        />
      )}
    </Card>
  );
}
