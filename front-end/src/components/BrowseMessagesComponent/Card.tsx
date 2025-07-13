import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  MessageSquare,
  ChevronDown,
  ChevronRight,
  Code,
  FileText,
} from "lucide-react";

interface ExtendedMessage {
  queueName?: string;
  payload?: string;
  routing_key?: string;
  properties?: {
    timestamp?: number;
    content_encoding?: string;
    message_id?: string;
    type?: string;
    content_type?: string;
    user_id?: string;
    app_id?: string;
    correlation_id?: string;
    reply_to?: string;
    headers?: Record<string, unknown>;
    [key: string]: unknown;
  };
}

interface MessageCardProps {
  message: ExtendedMessage;
  index: number;
  isExpanded: boolean;
  onToggleExpanded: (index: number) => void;
  formatPayload: (payload: string, encoding?: string) => string;
  getPayloadType: (payload: string, encoding?: string) => string;
}

export const MessageCard = ({
  message,
  index,
  isExpanded,
  onToggleExpanded,
  formatPayload,
  getPayloadType,
}: MessageCardProps) => {
  return (
    <Collapsible open={isExpanded} onOpenChange={() => onToggleExpanded(index)}>
      <Card className="border border-gray-200 hover:shadow-md transition-all duration-200">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <MessageSquare className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">
                      Queue: {message.queueName}
                    </p>
                    <Badge variant="outline" className="text-xs">
                      {getPayloadType(
                        message.payload || "",
                        message.properties?.content_encoding
                      )}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500">
                    Size: {message.payload?.length || 0} bytes
                    {message.properties?.timestamp && (
                      <span className="ml-2">
                        •{" "}
                        {new Date(
                          message.properties.timestamp
                        ).toLocaleString()}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            <Separator className="mb-4" />
            <Tabs defaultValue="payload" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger
                  value="payload"
                  className="flex items-center gap-2"
                >
                  <Code className="h-4 w-4" />
                  Payload
                </TabsTrigger>
                <TabsTrigger
                  value="properties"
                  className="flex items-center gap-2"
                >
                  <FileText className="h-4 w-4" />
                  Properties
                </TabsTrigger>
              </TabsList>
              <TabsContent value="payload" className="mt-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <pre className="text-sm whitespace-pre-wrap font-mono overflow-x-auto">
                    {formatPayload(
                      message.payload || "",
                      message.properties?.content_encoding
                    )}
                  </pre>
                </div>
              </TabsContent>
              <TabsContent value="properties" className="mt-4">
                <div className="space-y-3">
                  {message.properties &&
                  Object.keys(message.properties).length > 0 ? (
                    Object.entries(message.properties).map(([key, value]) => (
                      <div key={key} className="flex items-start gap-2">
                        <Badge variant="outline" className="text-xs font-mono">
                          {key}
                        </Badge>
                        <code className="text-sm bg-gray-100 px-2 py-1 rounded flex-1">
                          {typeof value === "object"
                            ? JSON.stringify(value, null, 2)
                            : String(value)}
                        </code>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-sm">
                      No properties available
                    </p>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};
