import { Card, CardContent } from "@/components/ui/card";
import { Database, MessageSquare } from "lucide-react";
import { Queue } from "@/lib/api";

interface QueueMetricsProps {
  queues: Queue[];
}

export function QueueMetrics({ queues }: QueueMetricsProps) {
  const totalMessages = queues.reduce((sum, q) => sum + q.messages, 0);

  return (
    <div className="flex gap-4">
      <Card className="border-0 shadow-md bg-white/80 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Database className="w-5 h-5 text-blue-600" />
            <div>
              <p className="text-sm text-gray-600">Total Queues</p>
              <p className="font-bold text-xl">{queues.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="border-0 shadow-md bg-white/80 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <MessageSquare className="w-5 h-5 text-green-600" />
            <div>
              <p className="text-sm text-gray-600">Total Messages</p>
              <p className="font-bold text-xl">
                {totalMessages.toLocaleString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
