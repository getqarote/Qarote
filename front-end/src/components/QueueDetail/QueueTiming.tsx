import { Activity, Clock } from "lucide-react";

import { Queue } from "@/lib/api";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface QueueTimingProps {
  queue: Queue;
}

export function QueueTiming({ queue }: QueueTimingProps) {
  const formatDuration = (timestamp: string | null) => {
    if (!timestamp) return "Never";
    const diff = Date.now() - new Date(timestamp).getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h ago`;
    if (hours > 0) return `${hours}h ${minutes % 60}m ago`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s ago`;
    return `${seconds}s ago`;
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="border-0 shadow-md bg-card backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Timing Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Idle Since</p>
            <p className="text-lg font-semibold">
              {formatDuration(queue.idle_since)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Last Message</p>
            <p className="text-lg font-semibold">
              {formatDuration(queue.head_message_timestamp)}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-md bg-card backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Performance Metrics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">
                Consumer Utilization
              </p>
              <p className="text-lg font-semibold">
                {queue.consumer_utilisation?.toFixed(1) || "0.0"}%
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Reductions</p>
              <p className="text-lg font-semibold">
                {queue.reductions?.toLocaleString() || "0"}
              </p>
            </div>
          </div>
          <div className="pt-4 border-t">
            <div>
              <p className="text-sm text-muted-foreground">Message Bytes</p>
              <p className="text-lg font-semibold">
                {formatBytes(queue.message_bytes || 0)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
