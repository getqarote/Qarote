import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
import { useToast } from "@/hooks/useToast";
import { addQueueSchema, type AddQueueFormData } from "@/schemas/forms";

interface AddQueueFormProps {
  trigger?: React.ReactNode;
  serverId?: string;
  onSuccess?: () => void; // Callback for successful queue creation
}

export function AddQueueForm({
  trigger,
  serverId,
  onSuccess,
}: AddQueueFormProps) {
  const [open, setOpen] = useState(false);
  const [isAdvancedExpanded, setIsAdvancedExpanded] = useState(false);

  const createQueueMutation = useCreateQueue();
  const { toast } = useToast();

  // Initialize form with react-hook-form
  const form = useForm<AddQueueFormData>({
    resolver: zodResolver(addQueueSchema),
    defaultValues: {
      name: "",
      durable: true,
      autoDelete: false,
      exclusive: false,
      maxLength: "",
      messageTtl: "",
      bindToExchange: "",
      routingKey: "",
    },
  });

  // Fetch exchanges for binding options
  const { data: exchangesData } = useExchanges(serverId || "");
  const exchanges = exchangesData?.exchanges || [];

  const onSubmit = (data: AddQueueFormData) => {
    if (!serverId) {
      toast({
        title: "Error",
        description: "No server selected",
        variant: "destructive",
      });
      return;
    }

    // Build queue arguments
    const queueArguments: Record<string, unknown> = {};
    if (data.maxLength) {
      queueArguments["x-max-length"] = parseInt(data.maxLength);
    }
    if (data.messageTtl) {
      queueArguments["x-message-ttl"] = parseInt(data.messageTtl) * 1000; // Convert to milliseconds
    }

    createQueueMutation.mutate(
      {
        serverId,
        name: data.name.trim(),
        durable: data.durable,
        autoDelete: data.autoDelete,
        exclusive: data.exclusive,
        arguments: queueArguments,
        bindToExchange:
          data.bindToExchange && data.bindToExchange !== "none"
            ? data.bindToExchange
            : undefined,
        routingKey: data.routingKey,
      },
      {
        onSuccess: (response) => {
          setOpen(false);

          // Create detailed success message
          let description = `Queue "${data.name}" has been created successfully.`;

          if (response.bound && response.exchange) {
            description += ` It has been bound to exchange "${
              response.exchange === "default" ? "(Default)" : response.exchange
            }"`;
            if (response.routingKey) {
              description += ` with routing key "${response.routingKey}"`;
            }
            description += ".";
          } else if (data.bindToExchange && data.bindToExchange !== "none") {
            description += " Note: No exchange binding was configured.";
          }

          toast({
            title: "Queue created successfully",
            description,
          });

          // Reset form
          form.reset({
            name: "",
            durable: true,
            autoDelete: false,
            exclusive: false,
            maxLength: "",
            messageTtl: "",
            bindToExchange: "",
            routingKey: "",
          });
          setIsAdvancedExpanded(false);

          // Call the success callback to refresh queue data
          onSuccess?.();
        },
        onError: (error) => {
          // Extract user-friendly error message based on the error type
          let title = "Failed to create queue";
          let description = "An error occurred while creating the queue.";

          if (error.message) {
            // Handle specific error cases with user-friendly messages
            if (error.message.includes("already exists")) {
              title = "Queue already exists";
              description = `A queue named "${data.name}" already exists. Please choose a different name.`;
            } else if (
              error.message.includes("Exchange") &&
              error.message.includes("does not exist")
            ) {
              title = "Exchange not found";
              description = `The exchange "${data.bindToExchange}" does not exist. Please select a valid exchange or create it first.`;
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

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Queue Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Queue Name *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., email.notifications, user.events"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Queue Properties */}
            <div className="space-y-4">
              <FormLabel className="text-sm font-medium">
                Queue Properties
              </FormLabel>
              <div className="space-y-3">
                <FormField
                  control={form.control}
                  name="durable"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="text-sm font-normal">
                          Durable
                        </FormLabel>
                        <span className="text-xs text-gray-500">
                          (Queue survives server restarts)
                        </span>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="autoDelete"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="text-sm font-normal">
                          Auto-delete
                        </FormLabel>
                        <span className="text-xs text-gray-500">
                          (Queue is deleted when last consumer unsubscribes)
                        </span>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="exclusive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="text-sm font-normal">
                          Exclusive
                        </FormLabel>
                        <span className="text-xs text-gray-500">
                          (Queue can only be used by one connection)
                        </span>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Exchange Binding */}
            <div className="space-y-4">
              <FormLabel className="text-sm font-medium">
                Exchange Binding (Recommended)
              </FormLabel>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="bindToExchange"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Exchange</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select an exchange..." />
                          </SelectTrigger>
                        </FormControl>
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
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="routingKey"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Routing Key</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., user.created, logs.info"
                          disabled={
                            !form.watch("bindToExchange") ||
                            form.watch("bindToExchange") === "none"
                          }
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {form.watch("bindToExchange") &&
                form.watch("bindToExchange") !== "none" && (
                  <Alert className="border-blue-200 bg-blue-50">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      The queue will be bound to exchange "
                      {form.watch("bindToExchange") === "default"
                        ? "(Default)"
                        : form.watch("bindToExchange")}
                      "
                      {form.watch("routingKey") &&
                        ` with routing key "${form.watch("routingKey")}"`}
                      .
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
                  <FormField
                    control={form.control}
                    name="maxLength"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Max Length</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="e.g., 10000"
                            min="1"
                            {...field}
                          />
                        </FormControl>
                        <span className="text-xs text-gray-500">
                          Maximum number of messages in queue
                        </span>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="messageTtl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Message TTL (seconds)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="e.g., 3600"
                            min="1"
                            {...field}
                          />
                        </FormControl>
                        <span className="text-xs text-gray-500">
                          Time messages live in queue before expiring
                        </span>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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
              <Button
                type="submit"
                disabled={
                  createQueueMutation.isPending || !form.formState.isValid
                }
              >
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
        </Form>
      </DialogContent>
    </Dialog>
  );
}
