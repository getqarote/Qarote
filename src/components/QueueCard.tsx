
import { Badge } from "@/components/ui/badge";

interface Queue {
  name: string;
  messages: number;
  consumers: number;
  status: string;
}

interface QueueCardProps {
  queue: Queue;
  index: number;
}

export const QueueCard = ({ queue, index }: QueueCardProps) => {
  return (
    <div 
      className="p-4 bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-100 hover:shadow-md transition-all duration-300 animate-fade-in"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-gray-900 truncate">{queue.name}</h3>
        <Badge 
          variant="secondary" 
          className="bg-green-100 text-green-700 hover:bg-green-100"
        >
          {queue.status}
        </Badge>
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">{queue.messages.toLocaleString()} messages</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-blue-600 font-medium">{queue.consumers} consumers</span>
        </div>
      </div>
    </div>
  );
};
