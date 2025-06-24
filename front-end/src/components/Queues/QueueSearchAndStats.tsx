import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { QueueMetrics } from "./QueueMetrics";
import { Queue } from "@/lib/api";

interface QueueSearchAndStatsProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  queues: Queue[];
}

export function QueueSearchAndStats({
  searchTerm,
  onSearchChange,
  queues,
}: QueueSearchAndStatsProps) {
  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="flex-1">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search queues by name or vhost..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 bg-white/80 backdrop-blur-sm"
          />
        </div>
      </div>
      <QueueMetrics queues={queues} />
    </div>
  );
}
