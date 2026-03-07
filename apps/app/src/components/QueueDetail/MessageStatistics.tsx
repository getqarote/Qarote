import { Database, HelpCircle } from "lucide-react";

import { Queue } from "@/lib/api";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <Card className="border-0 shadow-md bg-card backdrop-blur-xs">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="w-5 h-5" />
          Message Statistics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Ready</p>
            <p className="text-xl font-bold text-blue-600">
              {queue.messages_ready.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Unacknowledged</p>
            <p className="text-xl font-bold text-orange-600">
              {queue.messages_unacknowledged.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">In RAM</p>
            <p className="text-xl font-bold text-green-600">
              {queue.messages_ram?.toLocaleString() || "0"}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Persistent</p>
            <p className="text-xl font-bold text-purple-600">
              {queue.messages_persistent?.toLocaleString() || "0"}
            </p>
          </div>
        </div>
        <div className="pt-4 border-t">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm text-muted-foreground">Incoming</span>
                <Tooltip>
                  <TooltipTrigger aria-label="Incoming rate info">
                    <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-xs">
                      Rate of messages published to the queue.
                    </div>
                  </TooltipContent>
                </Tooltip>
              </div>
              <p className="text-lg font-semibold">
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
                    <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-xs">
                      Combined rate of deliver + get operations.
                    </div>
                  </TooltipContent>
                </Tooltip>
              </div>
              <p className="text-lg font-semibold">
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
                    <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-xs">
                      Rate of messages redelivered after nack/reject.
                    </div>
                  </TooltipContent>
                </Tooltip>
              </div>
              <p className="text-lg font-semibold">
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
                    <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-xs">
                      Rate of messages acknowledged by consumers.
                    </div>
                  </TooltipContent>
                </Tooltip>
              </div>
              <p className="text-lg font-semibold">
                {queue.message_stats?.ack_details?.rate?.toFixed(2) || "0.00"}{" "}
                msg/s
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
