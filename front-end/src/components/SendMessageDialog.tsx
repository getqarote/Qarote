import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Send,
  Settings,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  MessageSquare,
} from "lucide-react";
import { usePublishMessage, useExchanges, useQueues } from "@/hooks/useApi";
import { useToast } from "@/hooks/use-toast";

interface SendMessageDialogProps {
  trigger?: React.ReactNode;
  serverId?: string;
  defaultExchange?: string;
  defaultRoutingKey?: string;
}

export function SendMessageDialog({
  trigger,
  serverId,
  defaultExchange = "",
  defaultRoutingKey = "",
}: SendMessageDialogProps) {
  const [open, setOpen] = useState(false);
  const [exchange, setExchange] = useState(defaultExchange);
  const [routingKey, setRoutingKey] = useState(defaultRoutingKey);
  const [payload, setPayload] = useState(
    JSON.stringify({ message: "Hello World!", timestamp: Date.now() }, null, 2)
  );
  const [isPropertiesExpanded, setIsPropertiesExpanded] = useState(false);

  // Message properties
  const [deliveryMode, setDeliveryMode] = useState("2"); // Persistent by default
  const [priority, setPriority] = useState("");
  const [expiration, setExpiration] = useState("");
  const [contentType, setContentType] = useState("application/json");
  const [correlationId, setCorrelationId] = useState("");
  const [replyTo, setReplyTo] = useState("");
  const [messageId, setMessageId] = useState("");
  const [headers, setHeaders] = useState("");

  const publishMutation = usePublishMessage();
  const { toast } = useToast();

  // Fetch exchanges and queues for selection
  const { data: exchangesData } = useExchanges(serverId);
  const { data: queuesData } = useQueues(serverId);

  // Filter out exchanges with empty names and ensure they're valid
  const exchanges =
    exchangesData?.exchanges?.filter(
      (ex) => ex.name && ex.name.trim() !== ""
    ) || [];
  const queues = queuesData?.queues || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!serverId || !exchange || !payload) {
      return;
    }

    // Parse headers if provided
    let parsedHeaders = {};
    if (headers.trim()) {
      try {
        parsedHeaders = JSON.parse(headers);
      } catch (error) {
        console.error("Invalid headers JSON:", error);
        return;
      }
    }

    // Build properties object
    const properties: Record<string, unknown> = {
      delivery_mode: parseInt(deliveryMode),
    };

    if (priority) properties.priority = parseInt(priority);
    if (expiration) properties.expiration = expiration;
    if (contentType) properties.content_type = contentType;
    if (correlationId) properties.correlation_id = correlationId;
    if (replyTo) properties.reply_to = replyTo;
    if (messageId) properties.message_id = messageId;
    if (Object.keys(parsedHeaders).length > 0)
      properties.headers = parsedHeaders;

    publishMutation.mutate(
      {
        serverId,
        exchange,
        routingKey,
        payload,
        properties,
      },
      {
        onSuccess: (data) => {
          setOpen(false);
          toast({
            title: "Message sent successfully",
            description: `Message published to exchange "${exchange}"${
              routingKey ? ` with routing key "${routingKey}"` : ""
            }.${
              data.routed
                ? " Message was routed to queues."
                : " Message was not routed (no matching queues)."
            }`,
          });
          // Reset form
          setExchange(defaultExchange);
          setRoutingKey(defaultRoutingKey);
          setPayload(
            JSON.stringify(
              { message: "Hello World!", timestamp: Date.now() },
              null,
              2
            )
          );
          setIsPropertiesExpanded(false);
          setPriority("");
          setExpiration("");
          setCorrelationId("");
          setReplyTo("");
          setMessageId("");
          setHeaders("");
        },
        onError: (error) => {
          toast({
            title: "Failed to send message",
            description:
              error.message || "An error occurred while sending the message.",
            variant: "destructive",
          });
        },
      }
    );
  };

  const formatPayload = () => {
    try {
      const parsed = JSON.parse(payload);
      setPayload(JSON.stringify(parsed, null, 2));
    } catch (error) {
      // If it's not valid JSON, leave it as is
    }
  };

  const defaultTrigger = (
    <Button size="sm" className="gap-2">
      <Send className="h-4 w-4" />
      Send Message
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Send Message to Exchange
          </DialogTitle>
          <DialogDescription>
            Publish a message to a RabbitMQ exchange with optional routing key
            and properties.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Exchange and Routing Key */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="exchange">Exchange *</Label>
              <Select value={exchange} onValueChange={setExchange} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select an exchange..." />
                </SelectTrigger>
                <SelectContent>
                  {exchanges.length > 0 ? (
                    exchanges.map((ex) => (
                      <SelectItem
                        key={ex.name || "(Default)"}
                        value={ex.name || "(Default)"}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-2 h-2 rounded-full ${
                              ex.type === "direct"
                                ? "bg-green-500"
                                : ex.type === "fanout"
                                ? "bg-blue-500"
                                : ex.type === "topic"
                                ? "bg-orange-500"
                                : ex.type === "headers"
                                ? "bg-purple-500"
                                : "bg-gray-500"
                            }`}
                          />
                          <span className="font-medium">
                            {ex.name || "(Default)"}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {ex.type}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="__no_exchanges__" disabled>
                      No exchanges available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="routingKey">Routing Key</Label>
              <div className="flex gap-2">
                <Input
                  id="routingKey"
                  value={routingKey}
                  onChange={(e) => setRoutingKey(e.target.value)}
                  placeholder="e.g., user.created, logs.info"
                  list="routingKeySuggestions"
                  className="flex-1"
                />
                {(() => {
                  const selectedExchange = exchanges.find(
                    (ex) => ex.name === exchange
                  );
                  if (
                    selectedExchange?.type === "direct" &&
                    queues.length > 0
                  ) {
                    return (
                      <Select onValueChange={setRoutingKey}>
                        <SelectTrigger className="w-[120px]">
                          <SelectValue placeholder="Quick select" />
                        </SelectTrigger>
                        <SelectContent>
                          {queues.slice(0, 10).map((queue) => (
                            <SelectItem key={queue.name} value={queue.name}>
                              {queue.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    );
                  }
                  return null;
                })()}
              </div>
              <datalist id="routingKeySuggestions">
                {/* Suggestions from queue names */}
                {queues.slice(0, 10).map((queue) => (
                  <option key={queue.name} value={queue.name} />
                ))}
                {/* Common routing key patterns */}
                <option value="user.created" />
                <option value="user.updated" />
                <option value="user.deleted" />
                <option value="order.created" />
                <option value="order.updated" />
                <option value="notification.email" />
                <option value="notification.sms" />
                <option value="logs.info" />
                <option value="logs.error" />
                <option value="events.system" />
              </datalist>
            </div>
          </div>

          {/* Exchange Type Info */}
          {exchange &&
            (() => {
              const selectedExchange = exchanges.find(
                (ex) => ex.name === exchange
              );
              if (!selectedExchange) return null;

              const getExchangeInfo = (type: string) => {
                switch (type) {
                  case "direct":
                    return {
                      description:
                        "Messages are routed to queues based on an exact match between routing key and binding key.",
                      routingKeyHelp:
                        "Use exact queue names or specific routing keys.",
                    };
                  case "fanout":
                    return {
                      description:
                        "Messages are routed to all bound queues, ignoring the routing key.",
                      routingKeyHelp:
                        "Routing key is ignored for fanout exchanges.",
                    };
                  case "topic":
                    return {
                      description:
                        "Messages are routed based on wildcard matches between routing key and binding pattern.",
                      routingKeyHelp:
                        'Use patterns like "user.created", "logs.*", "events.#".',
                    };
                  case "headers":
                    return {
                      description:
                        "Messages are routed based on header values rather than routing key.",
                      routingKeyHelp:
                        "Routing key is typically ignored. Use message headers instead.",
                    };
                  default:
                    return {
                      description: "Custom exchange type.",
                      routingKeyHelp:
                        "Refer to exchange-specific documentation.",
                    };
                }
              };

              const info = getExchangeInfo(selectedExchange.type);

              return (
                <Alert className="border-blue-200 bg-blue-50">
                  <MessageSquare className="h-4 w-4" />
                  <AlertDescription className="space-y-2">
                    <div>
                      <strong>
                        {selectedExchange.type.charAt(0).toUpperCase() +
                          selectedExchange.type.slice(1)}{" "}
                        Exchange:
                      </strong>{" "}
                      {info.description}
                    </div>
                    <div className="text-sm text-blue-700">
                      <strong>Routing Key:</strong> {info.routingKeyHelp}
                    </div>
                    {selectedExchange.bindings &&
                      selectedExchange.bindings.length > 0 && (
                        <div className="text-sm text-blue-700">
                          <strong>Bound to:</strong>{" "}
                          {selectedExchange.bindings.length} queue
                          {selectedExchange.bindings.length !== 1 ? "s" : ""}
                        </div>
                      )}
                  </AlertDescription>
                </Alert>
              );
            })()}

          {/* Message Payload */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="payload">Message Payload *</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={formatPayload}
              >
                Format JSON
              </Button>
            </div>
            <Textarea
              id="payload"
              value={payload}
              onChange={(e) => setPayload(e.target.value)}
              placeholder="Enter your message payload..."
              className="min-h-[120px] font-mono text-sm"
              required
            />
          </div>

          <Separator />

          {/* Advanced Properties */}
          <Collapsible
            open={isPropertiesExpanded}
            onOpenChange={setIsPropertiesExpanded}
          >
            <CollapsibleTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                className="flex items-center justify-between w-full p-0 h-auto"
              >
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Message Properties
                  <Badge variant="secondary" className="text-xs">
                    Optional
                  </Badge>
                </div>
                {isPropertiesExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="deliveryMode">Delivery Mode</Label>
                  <Select value={deliveryMode} onValueChange={setDeliveryMode}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Transient (1)</SelectItem>
                      <SelectItem value="2">Persistent (2)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="priority">Priority (0-255)</Label>
                  <Input
                    id="priority"
                    type="number"
                    min="0"
                    max="255"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contentType">Content Type</Label>
                  <Input
                    id="contentType"
                    value={contentType}
                    onChange={(e) => setContentType(e.target.value)}
                    placeholder="application/json"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expiration">Expiration (ms)</Label>
                  <Input
                    id="expiration"
                    value={expiration}
                    onChange={(e) => setExpiration(e.target.value)}
                    placeholder="60000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="correlationId">Correlation ID</Label>
                  <Input
                    id="correlationId"
                    value={correlationId}
                    onChange={(e) => setCorrelationId(e.target.value)}
                    placeholder="req-123456"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="replyTo">Reply To</Label>
                  <Input
                    id="replyTo"
                    value={replyTo}
                    onChange={(e) => setReplyTo(e.target.value)}
                    placeholder="response.queue"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="messageId">Message ID</Label>
                <Input
                  id="messageId"
                  value={messageId}
                  onChange={(e) => setMessageId(e.target.value)}
                  placeholder="msg-123456"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="headers">Custom Headers (JSON)</Label>
                <Textarea
                  id="headers"
                  value={headers}
                  onChange={(e) => setHeaders(e.target.value)}
                  placeholder='{"x-custom-header": "value", "x-retry-count": 3}'
                  className="font-mono text-sm"
                  rows={3}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Error/Success Messages */}
          {publishMutation.isError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {publishMutation.error?.message || "Failed to send message"}
              </AlertDescription>
            </Alert>
          )}

          {publishMutation.isSuccess && (
            <Alert className="border-green-200 bg-green-50 text-green-800">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Message sent successfully to exchange "{exchange}"
                {routingKey && ` with routing key "${routingKey}"`}
              </AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={publishMutation.isPending || !exchange || !payload}
              className="gap-2"
            >
              {publishMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Send Message
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
