import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scrollArea";
import { MessageSquare } from "lucide-react";
import { MessageCard } from "./Card";

interface ExtendedMessage {
  queueName?: string;
  payload?: string;
  routing_key?: string;
  properties?: {
    timestamp?: number;
    content_encoding?: string;
    [key: string]: unknown;
  };
}

interface MessageListProps {
  filteredMessages: ExtendedMessage[];
  isLoadingMessages: boolean;
  expandedMessages: Set<number>;
  onToggleExpanded: (index: number) => void;
  formatPayload: (payload: string, encoding?: string) => string;
  getPayloadType: (payload: string, encoding?: string) => string;
  searchTerm?: string;
  selectedQueue: string;
  onClearSearch?: () => void;
}

export const MessageList = ({
  filteredMessages,
  isLoadingMessages,
  expandedMessages,
  onToggleExpanded,
  formatPayload,
  getPayloadType,
  searchTerm,
  selectedQueue,
  onClearSearch,
}: MessageListProps) => {
  const renderLoadingState = () => (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="p-4 border rounded-lg">
          <div className="flex items-start gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-3 w-1/4" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderEmptyState = () => (
    <div className="text-center py-12">
      <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        No messages found
      </h3>
      <p className="text-gray-500 mb-4">
        {searchTerm
          ? "No messages match your search criteria."
          : selectedQueue === "all"
            ? "No messages found in any queue."
            : `No messages found in queue "${selectedQueue}".`}
      </p>
      {searchTerm && onClearSearch && (
        <Button variant="outline" onClick={onClearSearch}>
          Clear Search
        </Button>
      )}
    </div>
  );

  const renderMessagesList = () => (
    <ScrollArea className="h-[600px]">
      <div className="space-y-4">
        {filteredMessages.map((message, index) => (
          <MessageCard
            key={index}
            message={message}
            index={index}
            isExpanded={expandedMessages.has(index)}
            onToggleExpanded={onToggleExpanded}
            formatPayload={formatPayload}
            getPayloadType={getPayloadType}
          />
        ))}
      </div>
    </ScrollArea>
  );

  return (
    <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-blue-600" />
          Messages
          <Badge variant="outline" className="ml-2">
            {filteredMessages.length} found
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoadingMessages
          ? renderLoadingState()
          : filteredMessages.length > 0
            ? renderMessagesList()
            : renderEmptyState()}
      </CardContent>
    </Card>
  );
};
