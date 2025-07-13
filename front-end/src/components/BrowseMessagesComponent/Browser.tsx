import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scrollArea";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  RefreshCw,
  MessageSquare,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  Code,
  FileText,
} from "lucide-react";
import { useBrowseMessages } from "@/hooks/useApi";

interface MessageBrowserProps {
  queueName: string;
  serverId: string;
}

export const MessageBrowser = ({
  queueName,
  serverId,
}: MessageBrowserProps) => {
  const [count, setCount] = useState(10);
  const [expandedMessages, setExpandedMessages] = useState<Set<number>>(
    new Set()
  );

  const {
    data: messagesData,
    isLoading,
    error,
    refetch,
  } = useBrowseMessages(serverId, queueName, count);

  const toggleMessageExpanded = (index: number) => {
    const newExpanded = new Set(expandedMessages);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedMessages(newExpanded);
  };

  const formatPayload = (payload: string): string => {
    try {
      const parsed = JSON.parse(payload);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return payload;
    }
  };

  const getPayloadType = (payload: string): string => {
    try {
      JSON.parse(payload);
      return "JSON";
    } catch {
      return "Text";
    }
  };

  const messages = messagesData?.messages || [];

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            Error Loading Messages
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>
              Failed to load messages: {error.message}
            </AlertDescription>
          </Alert>
          <Button onClick={() => refetch()} className="mt-4" variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Message Browser
          </div>
          <Button
            onClick={() => refetch()}
            disabled={isLoading}
            variant="outline"
            size="sm"
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label htmlFor="count" className="text-sm font-medium">
              Count:
            </label>
            <select
              id="count"
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="px-3 py-1 border rounded-md text-sm"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
          <Badge variant="secondary">{messages.length} messages</Badge>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No messages found in this queue</p>
            <p className="text-sm text-gray-400 mt-2">
              Messages may have been consumed or the queue may be empty
            </p>
          </div>
        ) : (
          <ScrollArea className="h-96">
            <div className="space-y-4">
              {messages.map((message, index) => (
                <Card key={index} className="relative">
                  <Collapsible
                    open={expandedMessages.has(index)}
                    onOpenChange={() => toggleMessageExpanded(index)}
                  >
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                        <CardTitle className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            {expandedMessages.has(index) ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                            <span>Message {index + 1}</span>
                            <Badge variant="outline" className="text-xs">
                              {getPayloadType(message.payload)}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {message.routing_key && (
                              <Badge variant="secondary" className="text-xs">
                                {message.routing_key}
                              </Badge>
                            )}
                            {message.properties?.timestamp && (
                              <span>
                                {new Date(
                                  message.properties.timestamp * 1000
                                ).toLocaleString()}
                              </span>
                            )}
                          </div>
                        </CardTitle>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent>
                        <Tabs defaultValue="payload" className="w-full">
                          <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="payload">Payload</TabsTrigger>
                            <TabsTrigger value="properties">
                              Properties
                            </TabsTrigger>
                          </TabsList>
                          <TabsContent value="payload" className="mt-4">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Code className="h-4 w-4" />
                                <span className="text-sm font-medium">
                                  Message Payload
                                </span>
                              </div>
                              <div className="bg-muted rounded-md p-3">
                                <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
                                  {formatPayload(message.payload)}
                                </pre>
                              </div>
                            </div>
                          </TabsContent>
                          <TabsContent value="properties" className="mt-4">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                <span className="text-sm font-medium">
                                  Message Properties
                                </span>
                              </div>
                              <div className="bg-muted rounded-md p-3">
                                <pre className="text-xs overflow-x-auto">
                                  {JSON.stringify(
                                    message.properties || {},
                                    null,
                                    2
                                  )}
                                </pre>
                              </div>
                              {message.routing_key && (
                                <>
                                  <Separator />
                                  <div>
                                    <span className="text-sm font-medium">
                                      Routing Key:
                                    </span>
                                    <Badge variant="outline" className="ml-2">
                                      {message.routing_key}
                                    </Badge>
                                  </div>
                                </>
                              )}
                            </div>
                          </TabsContent>
                        </Tabs>
                      </CardContent>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default MessageBrowser;
