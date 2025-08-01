import { useNavigate } from "react-router-dom";
import { MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { QueueCard } from "@/components/QueueCard";
import { Queue } from "@/lib/api";

interface ActiveQueuesSectionProps {
  queues: Queue[];
  queuesLoading: boolean;
}

export const ActiveQueuesSection = ({
  queues,
  queuesLoading,
}: ActiveQueuesSectionProps) => {
  const navigate = useNavigate();

  return (
    <Card className="border-0 shadow-md bg-card-unified backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-gray-900">
              Active Queues
            </CardTitle>
            <p className="text-sm text-gray-500">
              Currently processing messages
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/queues")}
          >
            View All Queues
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {queuesLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="p-4 bg-gray-50 rounded-lg border">
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-3 w-20 mb-1" />
                <Skeleton className="h-3 w-24" />
              </div>
            ))}
          </div>
        ) : queues.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {queues.slice(0, 6).map((queue, index) => (
              <QueueCard key={queue.name} queue={queue} index={index} />
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No queues found on this server</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
