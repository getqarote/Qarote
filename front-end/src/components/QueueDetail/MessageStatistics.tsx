import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Database, HelpCircle } from "lucide-react";
import { Queue } from "@/lib/api";

interface MessageStatisticsProps {
  queue: Queue;
}

export function MessageStatistics({ queue }: MessageStatisticsProps) {
  return (
    <Card className="border-0 shadow-md bg-white/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="w-5 h-5" />
          Message Statistics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Ready</p>
            <p className="text-xl font-bold text-blue-600">
              {queue.messages_ready.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Unacknowledged</p>
            <p className="text-xl font-bold text-orange-600">
              {queue.messages_unacknowledged.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">In RAM</p>
            <p className="text-xl font-bold text-green-600">
              {queue.messages_ram?.toLocaleString() || "0"}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Persistent</p>
            <p className="text-xl font-bold text-purple-600">
              {queue.messages_persistent?.toLocaleString() || "0"}
            </p>
          </div>
        </div>
        <div className="pt-4 border-t">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Publish Rate</span>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-xs">
                    Average rate of messages published to the queue.
                  </div>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Deliver Rate</span>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-xs">
                    Average rate of messages delivered to consumers.
                  </div>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-2">
            <div>
              <p className="text-sm text-gray-600">Publish Rate</p>
              <p className="text-lg font-semibold">
                {queue.message_stats?.publish_details?.rate?.toFixed(2) ||
                  "0.00"}{" "}
                msg/s
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Deliver Rate</p>
              <p className="text-lg font-semibold">
                {queue.message_stats?.deliver_details?.rate?.toFixed(2) ||
                  "0.00"}{" "}
                msg/s
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
