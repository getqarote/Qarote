import { Badge } from "@/components/ui/badge";
import { Queue } from "@/lib/api";
import { useNavigate } from "react-router-dom";

interface QueueCardProps {
  queue: Queue;
  index: number;
}

export const QueueCard = ({ queue, index }: QueueCardProps) => {
  const navigate = useNavigate();

  const getStatus = () => {
    if (queue.consumers > 0) return "active";
    if (queue.messages > 0) return "waiting";
    return "idle";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-700 hover:bg-green-100";
      case "waiting":
        return "bg-yellow-100 text-yellow-700 hover:bg-yellow-100";
      default:
        return "bg-gray-100 text-gray-700 hover:bg-gray-100";
    }
  };

  const status = getStatus();

  const handleClick = () => {
    navigate(`/queues/${encodeURIComponent(queue.name)}`);
  };

  return (
    <div
      className="p-4 bg-card rounded-lg border border-border hover:shadow-lg hover:border-border transition-all duration-300 animate-fade-in cursor-pointer group"
      style={{ animationDelay: `${index * 100}ms` }}
      onClick={handleClick}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-foreground truncate group-hover:text-blue-600 transition-colors">
          {queue.name}
        </h3>
        <Badge variant="secondary" className={getStatusColor(status)}>
          {status}
        </Badge>
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">
            {queue.messages.toLocaleString()} messages
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-blue-600 font-medium">
            {queue.consumers} consumers
          </span>
        </div>
      </div>
    </div>
  );
};
