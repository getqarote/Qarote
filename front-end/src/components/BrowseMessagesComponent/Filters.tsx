import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Filter, Search, Star, MessageSquare } from "lucide-react";

interface Queue {
  name: string;
  messages: number;
}

interface MessageFiltersProps {
  selectedQueue: string;
  setSelectedQueue: (queue: string) => void;
  messageCount: number;
  setMessageCount: (count: number) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  queues: Queue[];
  filteredMessagesLength: number;
  totalMessagesLength: number;
  isLoadingMessages: boolean;
}

export const MessageFilters = ({
  selectedQueue,
  setSelectedQueue,
  messageCount,
  setMessageCount,
  searchTerm,
  setSearchTerm,
  queues,
  filteredMessagesLength,
  totalMessagesLength,
  isLoadingMessages,
}: MessageFiltersProps) => {
  return (
    <Card className="mb-6 border-0 shadow-lg bg-white/80 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-purple-600" />
              Message Filters
            </CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              Filter and search across your message queues
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Queue Filter
            </label>
            <Select value={selectedQueue} onValueChange={setSelectedQueue}>
              <SelectTrigger>
                <SelectValue placeholder="Select queue..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-yellow-500" />
                    All Queues
                  </div>
                </SelectItem>
                {queues.map((queue) => (
                  <SelectItem key={queue.name} value={queue.name}>
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-blue-500" />
                      {queue.name}
                      <Badge variant="outline" className="ml-auto">
                        {queue.messages}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Message Count
            </label>
            <Select
              value={messageCount.toString()}
              onValueChange={(value) => setMessageCount(parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 messages</SelectItem>
                <SelectItem value="20">20 messages</SelectItem>
                <SelectItem value="50">50 messages</SelectItem>
                <SelectItem value="100">100 messages</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-2">
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Search Messages
              {searchTerm && (
                <span className="ml-2 text-xs text-blue-600">
                  ({filteredMessagesLength} of {totalMessagesLength} messages)
                </span>
              )}
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by content, queue, properties, headers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`pl-10 ${
                  searchTerm ? "ring-2 ring-blue-500 border-blue-500" : ""
                }`}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  title="Clear search"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
