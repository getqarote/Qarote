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
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Plus,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  List,
} from "lucide-react";
import { useCreateQueue, useExchanges } from "@/hooks/useApi";
import { useToast } from "@/hooks/use-toast";

interface AddQueueFormProps {
  trigger?: React.ReactNode;
  serverId?: string;
}

export function AddQueueForm({ trigger, serverId }: AddQueueFormProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [durable, setDurable] = useState(true);
  const [autoDelete, setAutoDelete] = useState(false);
  const [exclusive, setExclusive] = useState(false);
  const [maxLength, setMaxLength] = useState("");
  const [messageTtl, setMessageTtl] = useState("");
  const [bindToExchange, setBindToExchange] = useState("");
  const [routingKey, setRoutingKey] = useState("");
  const [isAdvancedExpanded, setIsAdvancedExpanded] = useState(false);

  const createQueueMutation = useCreateQueue();
  const { toast } = useToast();

  // Fetch exchanges for binding options
  const { data: exchangesData } = useExchanges(serverId || "");
  const exchanges = exchangesData?.exchanges || [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!serverId) {
      toast({
        title: "Error",
        description: "No server selected",
        variant: "destructive",
      });
      return;
    }

    if (!name.trim()) {
      toast({
        title: "Error",
        description: "Queue name is required",
        variant: "destructive",
      });
      return;
    }

    // Build queue arguments
    const queueArguments: Record<string, unknown> = {};
    if (maxLength) {
      queueArguments["x-max-length"] = parseInt(maxLength);
    }
    if (messageTtl) {
      queueArguments["x-message-ttl"] = parseInt(messageTtl) * 1000; // Convert to milliseconds
    }

    createQueueMutation.mutate(
      {
        serverId,
        name: name.trim(),
        durable,
        autoDelete,
        exclusive,
        arguments: queueArguments,
        bindToExchange:
          bindToExchange && bindToExchange !== "none"
            ? bindToExchange
            : undefined,
        routingKey,
      },
      {
        onSuccess: (data) => {
          setOpen(false);

          // Create detailed success message
          let description = `Queue "${name}" has been created successfully.`;

          if (data.bound && data.exchange) {
            description += ` It has been bound to exchange "${
              data.exchange === "default" ? "(Default)" : data.exchange
            }"`;
            if (data.routingKey) {
              description += ` with routing key "${data.routingKey}"`;
            }
            description += ".";
          } else if (bindToExchange && bindToExchange !== "none") {
            description += " Note: No exchange binding was configured.";
          }

          toast({
            title: "Queue created successfully",
            description,
          });

          // Reset form
          setName("");
          setDurable(true);
          setAutoDelete(false);
          setExclusive(false);
          setMaxLength("");
          setMessageTtl("");
          setBindToExchange("");
          setRoutingKey("");
          setIsAdvancedExpanded(false);
        },
        onError: (error) => {
          // Extract user-friendly error message based on the error type
          let title = "Failed to create queue";
          let description = "An error occurred while creating the queue.";

          if (error.message) {
            // Handle specific error cases with user-friendly messages
            if (error.message.includes("already exists")) {
              title = "Queue already exists";
              description = `A queue named "${name}" already exists. Please choose a different name.`;
            } else if (
              error.message.includes("Exchange") &&
              error.message.includes("does not exist")
            ) {
              title = "Exchange not found";
              description = `The exchange "${bindToExchange}" does not exist. Please select a valid exchange or create it first.`;
            } else if (error.message.includes("Server not found")) {
              title = "Server error";
              description =
                "The selected RabbitMQ server was not found or you don't have access to it.";
            } else {
              // Use the original error message but make it more user-friendly
              description = error.message;
            }
          }

          toast({
            title,
            description,
            variant: "destructive",
          });
        },
      }
    );
  };

  const defaultTrigger = (
    <Button size="sm" className="gap-2">
      <Plus className="h-4 w-4" />
      Add Queue
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <List className="h-5 w-5" />
            Create New Queue
          </DialogTitle>
          <DialogDescription>
            Create a new RabbitMQ queue with optional binding to an exchange.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Queue Name */}
          <div className="space-y-2">
            <Label htmlFor="queueName">Queue Name *</Label>
            <Input
              id="queueName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., email.notifications, user.events"
              required
            />
          </div>

          {/* Queue Properties */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">Queue Properties</Label>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="durable"
                  checked={durable}
                  onCheckedChange={(checked) => setDurable(!!checked)}
                />
                <Label htmlFor="durable" className="text-sm font-normal">
                  Durable
                </Label>
                <span className="text-xs text-gray-500">
                  (Queue survives server restarts)
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="autoDelete"
                  checked={autoDelete}
                  onCheckedChange={(checked) => setAutoDelete(!!checked)}
                />
                <Label htmlFor="autoDelete" className="text-sm font-normal">
                  Auto-delete
                </Label>
                <span className="text-xs text-gray-500">
                  (Queue is deleted when last consumer unsubscribes)
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="exclusive"
                  checked={exclusive}
                  onCheckedChange={(checked) => setExclusive(!!checked)}
                />
                <Label htmlFor="exclusive" className="text-sm font-normal">
                  Exclusive
                </Label>
                <span className="text-xs text-gray-500">
                  (Queue can only be used by one connection)
                </span>
              </div>
            </div>
          </div>

          {/* Exchange Binding */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">
              Exchange Binding (Optional)
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="exchange">Exchange</Label>
                <Select
                  value={bindToExchange}
                  onValueChange={setBindToExchange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an exchange..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      <span className="text-gray-500">No binding</span>
                    </SelectItem>
                    {exchanges.length > 0 ? (
                      exchanges.map((ex) => (
                        <SelectItem
                          key={ex.name || "__default__"}
                          value={ex.name || "default"}
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
                <Input
                  id="routingKey"
                  value={routingKey}
                  onChange={(e) => setRoutingKey(e.target.value)}
                  placeholder="e.g., user.created, logs.info"
                  disabled={!bindToExchange || bindToExchange === "none"}
                />
              </div>
            </div>

            {bindToExchange && bindToExchange !== "none" && (
              <Alert className="border-blue-200 bg-blue-50">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  The queue will be bound to exchange "
                  {bindToExchange === "default" ? "(Default)" : bindToExchange}"
                  {routingKey && ` with routing key "${routingKey}"`}.
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Advanced Options */}
          <Collapsible
            open={isAdvancedExpanded}
            onOpenChange={setIsAdvancedExpanded}
          >
            <CollapsibleTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                className="flex items-center gap-2 p-0 h-auto"
              >
                {isAdvancedExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                Advanced Options
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="maxLength">Max Length</Label>
                  <Input
                    id="maxLength"
                    type="number"
                    value={maxLength}
                    onChange={(e) => setMaxLength(e.target.value)}
                    placeholder="e.g., 10000"
                    min="1"
                  />
                  <span className="text-xs text-gray-500">
                    Maximum number of messages in queue
                  </span>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="messageTtl">Message TTL (seconds)</Label>
                  <Input
                    id="messageTtl"
                    type="number"
                    value={messageTtl}
                    onChange={(e) => setMessageTtl(e.target.value)}
                    placeholder="e.g., 3600"
                    min="1"
                  />
                  <span className="text-xs text-gray-500">
                    Time messages live in queue before expiring
                  </span>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Submit Buttons */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={createQueueMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createQueueMutation.isPending}>
              {createQueueMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Queue
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
