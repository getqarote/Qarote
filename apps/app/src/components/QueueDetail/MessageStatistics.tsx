import { HelpCircle } from "lucide-react";

import { Queue } from "@/lib/api";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface MessageStatisticsProps {
  queue: Queue;
}

export function MessageStatistics({ queue }: MessageStatisticsProps) {
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="px-4 py-3 bg-muted/30 border-b border-border">
        <h2 className="title-section">Message Statistics</h2>
      </div>
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Ready</p>
            <p className="text-xl font-semibold text-foreground font-mono tabular-nums">
              {queue.messages_ready.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Unacknowledged</p>
            <p
              className={`text-xl font-semibold font-mono tabular-nums ${
                queue.messages_unacknowledged > 0
                  ? "text-warning"
                  : "text-foreground"
              }`}
            >
              {queue.messages_unacknowledged.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">In RAM</p>
            <p className="text-xl font-semibold text-foreground font-mono tabular-nums">
              {queue.messages_ram?.toLocaleString() || "0"}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Persistent</p>
            <p className="text-xl font-semibold text-foreground font-mono tabular-nums">
              {queue.messages_persistent?.toLocaleString() || "0"}
            </p>
          </div>
        </div>
        <div className="pt-4 border-t border-border">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm text-muted-foreground">Incoming</span>
                <Tooltip>
                  <TooltipTrigger aria-label="Incoming rate info">
                    <HelpCircle className="w-3 h-3 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">
                      Rate of messages published to the queue.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <p className="text-lg font-semibold font-mono tabular-nums">
                {queue.message_stats?.publish_details?.rate?.toFixed(2) ||
                  "0.00"}{" "}
                msg/s
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm text-muted-foreground">
                  Deliver / Get
                </span>
                <Tooltip>
                  <TooltipTrigger aria-label="Deliver / Get rate info">
                    <HelpCircle className="w-3 h-3 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">
                      Combined rate of deliver + get operations.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <p className="text-lg font-semibold font-mono tabular-nums">
                {queue.message_stats?.deliver_get_details?.rate?.toFixed(2) ||
                  "0.00"}{" "}
                msg/s
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm text-muted-foreground">
                  Redelivered
                </span>
                <Tooltip>
                  <TooltipTrigger aria-label="Redelivered rate info">
                    <HelpCircle className="w-3 h-3 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">
                      Rate of messages redelivered after nack/reject.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <p className="text-lg font-semibold font-mono tabular-nums">
                {queue.message_stats?.redeliver_details?.rate?.toFixed(2) ||
                  "0.00"}{" "}
                msg/s
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm text-muted-foreground">Ack</span>
                <Tooltip>
                  <TooltipTrigger aria-label="Ack rate info">
                    <HelpCircle className="w-3 h-3 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">
                      Rate of messages acknowledged by consumers.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <p className="text-lg font-semibold font-mono tabular-nums">
                {queue.message_stats?.ack_details?.rate?.toFixed(2) || "0.00"}{" "}
                msg/s
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
