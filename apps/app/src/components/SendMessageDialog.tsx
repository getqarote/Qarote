import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  HelpCircle,
  MessageSquare,
  Send,
  Settings,
} from "lucide-react";

import { logger } from "@/lib/logger";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { useVHostContext } from "@/contexts/VHostContextDefinition";

import { queryKeys } from "@/hooks/queries/queryKeys";
import {
  useExchanges,
  usePublishMessage,
  useQueues,
} from "@/hooks/queries/useRabbitMQ";
import { useToast } from "@/hooks/ui/useToast";
import { useWorkspace } from "@/hooks/ui/useWorkspace";

import { type SendMessageFormData, sendMessageSchema } from "@/schemas";

interface LabelWithTooltipProps {
  htmlFor: string;
  label: string;
  tooltip: string;
  side?: "top" | "right" | "bottom" | "left";
}

function LabelWithTooltip({
  htmlFor,
  label,
  tooltip,
  side = "right",
}: LabelWithTooltipProps) {
  return (
    <div className="flex items-center gap-1">
      <Label htmlFor={htmlFor}>{label}</Label>
      <Tooltip>
        <TooltipTrigger asChild>
          <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
        </TooltipTrigger>
        <TooltipContent
          side={side}
          sideOffset={5}
          align="start"
          className="max-w-sm z-9999 border shadow-md"
          avoidCollisions={true}
          collisionPadding={20}
          sticky="always"
        >
          <p className="text-sm leading-relaxed">{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

interface SendMessageDialogProps {
  trigger?: React.ReactNode;
  serverId: string;
  defaultExchange?: string;
  defaultRoutingKey?: string;
  queueName?: string; // For direct queue publishing
  mode?: "exchange" | "queue"; // Publishing mode
  onSuccess?: () => void; // Callback for successful message sending
}

export function SendMessageDialog({
  trigger,
  serverId,
  defaultExchange = "",
  defaultRoutingKey = "",
  queueName,
  mode = queueName ? "queue" : "exchange",
  onSuccess,
}: SendMessageDialogProps) {
  const { t } = useTranslation("exchanges");
  const [open, setOpen] = useState(false);
  const [isPropertiesExpanded, setIsPropertiesExpanded] = useState(false);

  // Routing error state
  const [routingError, setRoutingError] = useState<{
    message: string;
    suggestions: string[];
    details?: {
      reason: string;
      exchange: string;
      routingKey: string;
      possibleCauses: string[];
    };
  } | null>(null);

  const publishMutation = usePublishMessage();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { workspace } = useWorkspace();
  const { selectedVHost } = useVHostContext();

  // Initialize form with react-hook-form
  const form = useForm<SendMessageFormData>({
    resolver: zodResolver(sendMessageSchema),
    defaultValues: {
      exchange: defaultExchange,
      routingKey: defaultRoutingKey,
      payload: JSON.stringify(
        { message: "Hello World!", timestamp: Date.now() },
        null,
        2
      ),
      deliveryMode: "2",
      priority: "",
      expiration: "",
      contentType: "application/json",
      contentEncoding: "none",
      correlationId: "",
      replyTo: "",
      messageId: "",
      appId: "",
      messageType: "",
      headers: "",
    },
  });

  // Fetch exchanges and queues for selection
  const { data: exchangesData } = useExchanges(serverId, selectedVHost);
  const { data: queuesData } = useQueues(serverId);

  // Filter out exchanges with empty names and ensure they're valid
  const exchanges =
    exchangesData?.exchanges?.filter(
      (ex) => ex.name && ex.name.trim() !== ""
    ) || [];
  const queues = queuesData?.queues || [];

  // Helper function to handle errors consistently
  const handlePublishError = (error: {
    // TODO: Remove this once we have a better type for the error
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    response?: { data?: any };
    message?: string;
  }) => {
    // Check if this is a routing error from the API response
    if (error.response?.data) {
      const errorData = error.response.data;
      if (errorData.routed === false && errorData.suggestions) {
        // This is a routing error - show detailed information
        setRoutingError({
          message: (errorData.error ||
            errorData.message ||
            t("sendMessage.notRoutedTitle")) as string,
          suggestions: (errorData.suggestions || []) as string[],
          details: errorData.details as {
            reason: string;
            exchange: string;
            routingKey: string;
            possibleCauses: string[];
          },
        });

        toast({
          title: t("sendMessage.notRoutedTitle"),
          description: (errorData.error ||
            errorData.message ||
            t("sendMessage.notRoutedDescription")) as string,
          variant: "destructive",
        });
        return;
      }
    }

    // For other types of errors, clear routing error and show generic message
    setRoutingError(null);

    let errorMessage = error.message || t("sendMessage.errorDefault");

    // Try to extract more specific error information
    if (error.response?.data?.message) {
      errorMessage = error.response.data.message as string;
    }

    toast({
      title: t("sendMessage.failedTitle"),
      description: errorMessage,
      variant: "destructive",
    });
  };

  const onSubmit = async (data: SendMessageFormData) => {
    if (!serverId) {
      return;
    }

    // For queue mode, we need a queue name. For exchange mode, we need exchange.
    if (mode === "queue" && !queueName) {
      return;
    }
    if (mode === "exchange" && !data.exchange) {
      return;
    }
    if (!data.payload) {
      return;
    }

    // Parse headers if provided
    let parsedHeaders = {};
    if (data.headers?.trim()) {
      try {
        parsedHeaders = JSON.parse(data.headers);
      } catch (error) {
        logger.error("Invalid headers JSON:", error);
        return;
      }
    }

    // Build properties object with all supported properties
    const properties: {
      deliveryMode?: number;
      priority?: number;
      expiration?: string;
      contentType?: string;
      contentEncoding?: string;
      correlationId?: string;
      replyTo?: string;
      messageId?: string;
      appId?: string;
      type?: string;
      headers?: Record<string, unknown>;
    } = {};
    if (data.deliveryMode)
      properties.deliveryMode = parseInt(data.deliveryMode);
    if (data.priority) properties.priority = parseInt(data.priority);
    if (data.expiration) properties.expiration = data.expiration;
    if (data.contentType) properties.contentType = data.contentType;
    if (data.contentEncoding && data.contentEncoding !== "none")
      properties.contentEncoding = data.contentEncoding;
    if (data.correlationId) properties.correlationId = data.correlationId;
    if (data.replyTo) properties.replyTo = data.replyTo;
    if (data.messageId) properties.messageId = data.messageId;
    if (data.appId) properties.appId = data.appId;
    if (data.messageType) properties.type = data.messageType;
    if (Object.keys(parsedHeaders).length > 0)
      properties.headers = parsedHeaders;

    if (mode === "queue" && queueName) {
      // Direct queue publishing
      if (!workspace?.id) {
        toast({
          title: t("sendMessage.errorTitle"),
          description: t("sendMessage.workspaceRequired"),
          variant: "destructive",
        });
        return;
      }
      publishMutation.mutate(
        {
          serverId,
          workspaceId: workspace.id,
          queueName,
          message: data.payload,
          exchange: data.exchange || "", // Use default exchange if not specified
          routingKey: data.routingKey || queueName, // Use queue name as routing key if not specified
          properties:
            Object.keys(properties).length > 0 ? properties : undefined,
          vhost: selectedVHost
            ? encodeURIComponent(selectedVHost)
            : encodeURIComponent("/"),
        },
        {
          onSuccess: (data) => {
            logger.info("publishMutation data", data);
            if (data.routed) {
              setRoutingError(null); // Clear any previous routing errors
              setOpen(false);
              toast({
                title: t("sendMessage.successTitle"),
                description: t("sendMessage.successQueueDescription", {
                  exchange: data.exchange || "default",
                  routingKey: data.routingKey,
                  queueName,
                  messageLength: data.messageLength,
                }),
              });
              // Reset form
              resetForm();
              // Call the success callback to refresh queue data
              logger.info(
                "SendMessageDialog: Calling onSuccess callback for queue mode"
              );
              handleRefreshAfterSuccess();
            } else {
              // Message was published but not routed - show detailed error
              setRoutingError({
                message: data.error || t("sendMessage.notRoutedDescription"),
                suggestions: data.suggestions || [],
                details: data.details,
              });

              toast({
                title: t("sendMessage.notRoutedTitle"),
                description:
                  data.error || t("sendMessage.notRoutedDescription"),
                variant: "destructive",
              });
            }
          },
          onError: handlePublishError,
        }
      );
    } else if (mode === "exchange" && data.exchange) {
      // Exchange publishing (now supported)
      if (!workspace?.id) {
        toast({
          title: t("sendMessage.errorTitle"),
          description: t("sendMessage.workspaceRequired"),
          variant: "destructive",
        });
        return;
      }
      publishMutation.mutate(
        {
          serverId,
          workspaceId: workspace.id,
          queueName: data.routingKey || "", // Use routing key as queue name for exchange publishing
          message: data.payload,
          exchange: data.exchange,
          routingKey: data.routingKey,
          properties:
            Object.keys(properties).length > 0 ? properties : undefined,
          vhost: selectedVHost
            ? encodeURIComponent(selectedVHost)
            : encodeURIComponent("/"),
        },
        {
          onSuccess: (data) => {
            if (data.routed) {
              setRoutingError(null); // Clear any previous routing errors
              setOpen(false);
              toast({
                title: t("sendMessage.successTitle"),
                description: t("sendMessage.successExchangeDescription", {
                  exchange: data.exchange,
                  routingKey: data.routingKey,
                  messageLength: data.messageLength,
                }),
              });
              // Reset form
              resetForm();
              // Call the success callback to refresh queue data
              logger.info(
                "SendMessageDialog: Calling onSuccess callback for exchange mode"
              );
              handleRefreshAfterSuccess();
            } else {
              // Message was published but not routed - show detailed error
              setRoutingError({
                message: data.error || t("sendMessage.notRoutedDescription"),
                suggestions: data.suggestions || [],
                details: data.details,
              });

              toast({
                title: t("sendMessage.notRoutedTitle"),
                description:
                  data.error || t("sendMessage.notRoutedDescription"),
                variant: "destructive",
              });
            }
          },
          onError: handlePublishError,
        }
      );
    } else {
      toast({
        title: t("sendMessage.invalidConfigTitle"),
        description:
          mode === "queue"
            ? t("sendMessage.invalidConfigQueue")
            : t("sendMessage.invalidConfigExchange"),
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    form.reset({
      exchange: defaultExchange,
      routingKey: defaultRoutingKey,
      payload: JSON.stringify(
        { message: "Hello World!", timestamp: Date.now() },
        null,
        2
      ),
      deliveryMode: "2",
      priority: "",
      expiration: "",
      contentType: "application/json",
      contentEncoding: "none",
      correlationId: "",
      replyTo: "",
      messageId: "",
      appId: "",
      messageType: "",
      headers: "",
    });
    setIsPropertiesExpanded(false);
    setRoutingError(null); // Clear routing errors
  };

  // Helper function to apply suggested routing settings
  const applySuggestedSettings = (suggestion: string) => {
    if (
      suggestion.includes("default exchange") ||
      suggestion.includes("Consider using")
    ) {
      form.setValue("exchange", "");
      if (queueName) {
        form.setValue("routingKey", queueName);
      }
      setRoutingError(null);
      toast({
        title: t("sendMessage.settingsAppliedTitle"),
        description: t("sendMessage.settingsAppliedDefault"),
      });
    } else if (suggestion.includes("routing key")) {
      // Auto-suggest common routing keys based on available queues
      if (queues.length > 0) {
        form.setValue("routingKey", queues[0].name);
        toast({
          title: t("sendMessage.settingsAppliedTitle"),
          description: t("sendMessage.settingsAppliedRoutingKey", {
            queueName: queues[0].name,
          }),
        });
      }
    } else if (suggestion.includes("Verify that a queue is bound")) {
      // Suggest using an existing queue name as routing key
      if (queues.length > 0) {
        const currentRoutingKey = form.getValues("routingKey");
        const matchingQueue = queues.find((q) => q.name === currentRoutingKey);
        if (!matchingQueue && queues.length > 0) {
          form.setValue("routingKey", queues[0].name);
          toast({
            title: t("sendMessage.settingsAppliedTitle"),
            description: t("sendMessage.settingsAppliedExisting", {
              queueName: queues[0].name,
            }),
          });
        }
      }
    }
  };

  // Enhanced refresh function that invalidates multiple caches
  const handleRefreshAfterSuccess = async () => {
    logger.info(
      "SendMessageDialog: Refreshing data after successful message send, serverId:",
      serverId
    );
    try {
      if (serverId) {
        // Invalidate queues cache to refresh queue data
        await queryClient.invalidateQueries({
          queryKey: queryKeys.queues(serverId),
        });

        // Note: Monthly message count is no longer tracked

        logger.info("SendMessageDialog: Cache invalidation completed");
      }

      // Call the original onSuccess callback if provided
      onSuccess?.();
    } catch (error) {
      logger.error("SendMessageDialog: Error during cache refresh:", error);
      // Still call onSuccess even if cache refresh fails
      onSuccess?.();
    }
  };

  const formatPayload = () => {
    try {
      const currentPayload = form.getValues("payload");
      const parsed = JSON.parse(currentPayload);
      form.setValue("payload", JSON.stringify(parsed, null, 2));
    } catch (error) {
      logger.error("Invalid JSON payload:", error);
    }
  };

  const defaultTrigger = (
    <Button size="sm" className="gap-2">
      <Send className="h-4 w-4" />
      {t("sendMessage.triggerButton")}
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>
      <DialogContent
        className="max-w-4xl max-h-[90vh] overflow-y-auto w-[95vw]"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <TooltipProvider delayDuration={300}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              {t("sendMessage.dialogTitle")}
            </DialogTitle>
            <DialogDescription>
              {t("sendMessage.dialogDescription")}
            </DialogDescription>
          </DialogHeader>

          {/* Routing Error Display */}
          {routingError && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-3">
                  <div className="font-medium">{routingError.message}</div>

                  {routingError.details && (
                    <div className="text-sm space-y-2">
                      <div>
                        <strong>{t("sendMessage.issueLabel")}</strong>{" "}
                        {routingError.details.reason}
                      </div>
                      <div>
                        <strong>{t("sendMessage.exchangeLabel2")}</strong>{" "}
                        {routingError.details.exchange}
                      </div>
                      <div>
                        <strong>{t("sendMessage.routingKeyLabel2")}</strong>{" "}
                        {routingError.details.routingKey}
                      </div>
                    </div>
                  )}

                  {routingError.suggestions.length > 0 && (
                    <div className="space-y-2">
                      <div className="font-medium text-sm">
                        {t("sendMessage.suggestionsTitle")}
                      </div>
                      <div className="space-y-2">
                        {routingError.suggestions.map((suggestion, index) => (
                          <div
                            key={index}
                            className="flex items-start gap-2 text-sm"
                          >
                            <div className="w-1 h-1 bg-current rounded-full mt-2 shrink-0" />
                            <div className="flex-1">{suggestion}</div>
                            {(suggestion.includes("default exchange") ||
                              suggestion.includes("Consider using")) && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  applySuggestedSettings(suggestion)
                                }
                                className="ml-2 text-xs"
                              >
                                {t("sendMessage.apply")}
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {routingError.details?.possibleCauses &&
                    routingError.details.possibleCauses.length > 0 && (
                      <div className="space-y-2">
                        <div className="font-medium text-sm">
                          {t("sendMessage.possibleCausesTitle")}
                        </div>
                        <div className="space-y-1">
                          {routingError.details.possibleCauses.map(
                            (cause, index) => (
                              <div
                                key={index}
                                className="flex items-start gap-2 text-sm text-muted-foreground"
                              >
                                <div className="w-1 h-1 bg-muted-foreground/40 rounded-full mt-2 shrink-0" />
                                <div className="flex-1">{cause}</div>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setRoutingError(null)}
                    className="mt-2"
                  >
                    {t("sendMessage.dismiss")}
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Exchange and Routing Key */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="exchange"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        <LabelWithTooltip
                          htmlFor="exchange"
                          label={t("sendMessage.exchangeLabel")}
                          tooltip={t("sendMessage.exchangeTooltip")}
                        />
                      </FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        required
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={t("sendMessage.exchangePlaceholder")}
                            />
                          </SelectTrigger>
                        </FormControl>
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
                                        ? "bg-success-muted0"
                                        : ex.type === "fanout"
                                          ? "bg-info-muted0"
                                          : ex.type === "topic"
                                            ? "bg-warning-muted"
                                            : ex.type === "headers"
                                              ? "bg-muted"
                                              : "bg-muted0"
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
                              {t("sendMessage.noExchangesAvailable")}
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
                      <FormLabel>
                        <LabelWithTooltip
                          htmlFor="routingKey"
                          label={t("sendMessage.routingKeyLabel")}
                          tooltip={t("sendMessage.routingKeyTooltip")}
                          side="left"
                        />
                      </FormLabel>
                      <div className="flex gap-2">
                        <FormControl>
                          <Input
                            {...field}
                            placeholder={t("sendMessage.routingKeyPlaceholder")}
                            list="routingKeySuggestions"
                            className="flex-1"
                          />
                        </FormControl>
                        {(() => {
                          const exchangeValue = form.watch("exchange");
                          const selectedExchange = exchanges.find(
                            (ex) => ex.name === exchangeValue
                          );
                          if (
                            selectedExchange?.type === "direct" &&
                            queues.length > 0
                          ) {
                            return (
                              <Select onValueChange={field.onChange}>
                                <SelectTrigger className="w-[120px]">
                                  <SelectValue
                                    placeholder={t("sendMessage.quickSelect")}
                                  />
                                </SelectTrigger>
                                <SelectContent>
                                  {queues.slice(0, 10).map((queue) => (
                                    <SelectItem
                                      key={queue.name}
                                      value={queue.name}
                                    >
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
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Exchange Type Info */}
              {(() => {
                const exchangeValue = form.watch("exchange");
                if (!exchangeValue) return null;

                const selectedExchange = exchanges.find(
                  (ex) => ex.name === exchangeValue
                );
                if (!selectedExchange) return null;

                const getExchangeInfo = (type: string) => {
                  switch (type) {
                    case "direct":
                      return {
                        description: t("sendMessage.directDescription"),
                        routingKeyHelp: t("sendMessage.directRoutingKeyHelp"),
                      };
                    case "fanout":
                      return {
                        description: t("sendMessage.fanoutDescription"),
                        routingKeyHelp: t("sendMessage.fanoutRoutingKeyHelp"),
                      };
                    case "topic":
                      return {
                        description: t("sendMessage.topicDescription"),
                        routingKeyHelp: t("sendMessage.topicRoutingKeyHelp"),
                      };
                    case "headers":
                      return {
                        description: t("sendMessage.headersDescription"),
                        routingKeyHelp: t("sendMessage.headersRoutingKeyHelp"),
                      };
                    default:
                      return {
                        description: t("sendMessage.defaultDescription"),
                        routingKeyHelp: t("sendMessage.defaultRoutingKeyHelp"),
                      };
                  }
                };

                const info = getExchangeInfo(selectedExchange.type);

                return (
                  <Alert className="border-info/30 bg-info-muted">
                    <MessageSquare className="h-4 w-4" />
                    <AlertDescription className="space-y-2">
                      <div>
                        <strong>
                          {t("sendMessage.exchangeTypeTitle", {
                            type:
                              selectedExchange.type.charAt(0).toUpperCase() +
                              selectedExchange.type.slice(1),
                          })}
                        </strong>{" "}
                        {info.description}
                      </div>
                      <div className="text-sm text-info">
                        <strong>{t("sendMessage.routingKeyInfoLabel")}</strong>{" "}
                        {info.routingKeyHelp}
                      </div>
                      {selectedExchange.bindings &&
                        selectedExchange.bindings.length > 0 && (
                          <div className="text-sm text-info">
                            <strong>{t("sendMessage.boundTo")}</strong>{" "}
                            {t("sendMessage.queues", {
                              count: selectedExchange.bindings.length,
                            })}
                          </div>
                        )}
                    </AlertDescription>
                  </Alert>
                );
              })()}

              {/* Message Payload */}
              <FormField
                control={form.control}
                name="payload"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>
                        <LabelWithTooltip
                          htmlFor="payload"
                          label={t("sendMessage.payloadLabel")}
                          tooltip={t("sendMessage.payloadTooltip")}
                        />
                      </FormLabel>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={formatPayload}
                      >
                        {t("sendMessage.formatJson")}
                      </Button>
                    </div>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder={t("sendMessage.payloadPlaceholder")}
                        className="min-h-[120px] font-mono text-sm"
                        required
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                      {t("sendMessage.messageProperties")}
                      <Badge variant="secondary" className="text-xs">
                        {t("sendMessage.optional")}
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
                    <FormField
                      control={form.control}
                      name="deliveryMode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            <LabelWithTooltip
                              htmlFor="deliveryMode"
                              label={t("sendMessage.deliveryModeLabel")}
                              tooltip={t("sendMessage.deliveryModeTooltip")}
                            />
                          </FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="1">
                                {t("sendMessage.transient")}
                              </SelectItem>
                              <SelectItem value="2">
                                {t("sendMessage.persistent")}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="priority"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            <LabelWithTooltip
                              htmlFor="priority"
                              label={t("sendMessage.priorityLabel")}
                              tooltip={t("sendMessage.priorityTooltip")}
                              side="left"
                            />
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              min="0"
                              max="255"
                              placeholder="0"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="contentType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            <LabelWithTooltip
                              htmlFor="contentType"
                              label={t("sendMessage.contentTypeLabel")}
                              tooltip={t("sendMessage.contentTypeTooltip")}
                            />
                          </FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue
                                  placeholder={t(
                                    "sendMessage.contentTypePlaceholder"
                                  )}
                                />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="application/json">
                                application/json
                              </SelectItem>
                              <SelectItem value="text/plain">
                                text/plain
                              </SelectItem>
                              <SelectItem value="application/xml">
                                application/xml
                              </SelectItem>
                              <SelectItem value="text/xml">text/xml</SelectItem>
                              <SelectItem value="application/octet-stream">
                                application/octet-stream
                              </SelectItem>
                              <SelectItem value="text/html">
                                text/html
                              </SelectItem>
                              <SelectItem value="text/csv">text/csv</SelectItem>
                              <SelectItem value="application/pdf">
                                application/pdf
                              </SelectItem>
                              <SelectItem value="image/png">
                                image/png
                              </SelectItem>
                              <SelectItem value="image/jpeg">
                                image/jpeg
                              </SelectItem>
                              <SelectItem value="application/protobuf">
                                application/protobuf
                              </SelectItem>
                              <SelectItem value="application/avro">
                                application/avro
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="contentEncoding"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            <LabelWithTooltip
                              htmlFor="contentEncoding"
                              label={t("sendMessage.contentEncodingLabel")}
                              tooltip={t("sendMessage.contentEncodingTooltip")}
                              side="left"
                            />
                          </FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue
                                  placeholder={t(
                                    "sendMessage.contentEncodingPlaceholder"
                                  )}
                                />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">
                                {t("sendMessage.encodingNone")}
                              </SelectItem>
                              <SelectItem value="gzip">gzip</SelectItem>
                              <SelectItem value="deflate">deflate</SelectItem>
                              <SelectItem value="base64">base64</SelectItem>
                              <SelectItem value="compress">compress</SelectItem>
                              <SelectItem value="br">brotli (br)</SelectItem>
                              <SelectItem value="identity">identity</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="expiration"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            <LabelWithTooltip
                              htmlFor="expiration"
                              label={t("sendMessage.expirationLabel")}
                              tooltip={t("sendMessage.expirationTooltip")}
                            />
                          </FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="60000" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="messageType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            <LabelWithTooltip
                              htmlFor="messageType"
                              label={t("sendMessage.messageTypeLabel")}
                              tooltip={t("sendMessage.messageTypeTooltip")}
                              side="left"
                            />
                          </FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="order.created" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="correlationId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            <LabelWithTooltip
                              htmlFor="correlationId"
                              label={t("sendMessage.correlationIdLabel")}
                              tooltip={t("sendMessage.correlationIdTooltip")}
                            />
                          </FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="req-123456" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="replyTo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            <LabelWithTooltip
                              htmlFor="replyTo"
                              label={t("sendMessage.replyToLabel")}
                              tooltip={t("sendMessage.replyToTooltip")}
                              side="left"
                            />
                          </FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="response.queue" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="messageId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            <LabelWithTooltip
                              htmlFor="messageId"
                              label={t("sendMessage.messageIdLabel")}
                              tooltip={t("sendMessage.messageIdTooltip")}
                            />
                          </FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="msg-123456" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="appId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          <LabelWithTooltip
                            htmlFor="appId"
                            label={t("sendMessage.appIdLabel")}
                            tooltip={t("sendMessage.appIdTooltip")}
                          />
                        </FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="my-app-v1.0" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="headers"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          <LabelWithTooltip
                            htmlFor="headers"
                            label={t("sendMessage.headersLabel")}
                            tooltip={t("sendMessage.headersTooltip")}
                          />
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder='{"x-custom-header": "value", "x-retry-count": 3}'
                            className="font-mono text-sm"
                            rows={3}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CollapsibleContent>
              </Collapsible>

              {/* Error/Success Messages */}
              {publishMutation.isError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {publishMutation.error?.message ||
                      t("sendMessage.failedToSend")}
                  </AlertDescription>
                </Alert>
              )}

              {publishMutation.isSuccess && (
                <Alert className="border-success/30 bg-success-muted text-success">
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    {t("sendMessage.successAlertMessage", {
                      exchange: form.getValues("exchange"),
                    })}
                    {form.getValues("routingKey") &&
                      t("sendMessage.successAlertWithRoutingKey", {
                        routingKey: form.getValues("routingKey"),
                      })}
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
                  {t("sendMessage.cancel")}
                </Button>
                <Button
                  type="submit"
                  disabled={
                    publishMutation.isPending ||
                    !form.watch("exchange") ||
                    !form.watch("payload")
                  }
                  className="gap-2 bg-linear-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white"
                >
                  {publishMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      {t("sendMessage.sending")}
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      {t("sendMessage.sendMessage")}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </TooltipProvider>
      </DialogContent>
    </Dialog>
  );
}
