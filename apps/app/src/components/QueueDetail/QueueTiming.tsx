import { useEffect, useState } from "react";

import { Queue } from "@/lib/api";

interface QueueTimingProps {
  queue: Queue;
}

function formatDuration(timestamp: string | null, now: number) {
  if (!timestamp) return "Never";
  const diff = now - new Date(timestamp).getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h ago`;
  if (hours > 0) return `${hours}h ${minutes % 60}m ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "<1m ago";
}

export function QueueTiming({ queue }: QueueTimingProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="px-4 py-3 bg-muted/30 border-b border-border">
          <h2 className="title-section">Timing Information</h2>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Idle Since</p>
            <p className="text-lg font-semibold font-mono tabular-nums">
              {formatDuration(queue.idle_since, now)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Last Message</p>
            <p className="text-lg font-semibold font-mono tabular-nums">
              {formatDuration(queue.head_message_timestamp, now)}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <div className="px-4 py-3 bg-muted/30 border-b border-border">
          <h2 className="title-section">Performance Metrics</h2>
        </div>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Consumer Capacity</p>
              <p className="text-lg font-semibold font-mono tabular-nums">
                {queue.consumer_capacity != null
                  ? `${(queue.consumer_capacity * 100).toFixed(1)}%`
                  : "N/A"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Reductions</p>
              <p className="text-lg font-semibold font-mono tabular-nums">
                {queue.reductions?.toLocaleString() || "0"}
              </p>
            </div>
          </div>
          <div className="pt-4 border-t border-border">
            <div>
              <p className="text-sm text-muted-foreground">Message Bytes</p>
              <p className="text-lg font-semibold font-mono tabular-nums">
                {formatBytes(queue.message_bytes || 0)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
