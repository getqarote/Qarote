import React, { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";

import { zodResolver } from "@hookform/resolvers/zod";
import { Send } from "lucide-react";
import { toast } from "sonner";

import { logger } from "@/lib/logger";

import { ExchangeRoutingField } from "@/components/SendMessageDialogComponent/ExchangeRoutingField";
import { MessagePropertiesSections } from "@/components/SendMessageDialogComponent/MessagePropertiesSections";
import { PayloadField } from "@/components/SendMessageDialogComponent/PayloadField";
import { PublishPreviewCard } from "@/components/SendMessageDialogComponent/PublishPreviewCard";
import { RoutingErrorPanel } from "@/components/SendMessageDialogComponent/RoutingErrorPanel";
import type { RoutingError } from "@/components/SendMessageDialogComponent/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TooltipProvider } from "@/components/ui/tooltip";

import { useVHostContext } from "@/contexts/VHostContextDefinition";

import { queryKeys } from "@/hooks/queries/queryKeys";
import {
  useExchanges,
  usePublishMessage,
  useQueues,
} from "@/hooks/queries/useRabbitMQ";
import { useWorkspace } from "@/hooks/ui/useWorkspace";

import { type SendMessageFormData, sendMessageSchema } from "@/schemas";

type FormMode = "quick" | "advanced";

interface SendMessageDialogProps {
  trigger?: React.ReactNode;
  serverId: string;
  defaultExchange?: string;
  defaultRoutingKey?: string;
  queueName?: string;
  mode?: "exchange" | "queue";
  onSuccess?: () => void;
}

const buildDefaultPayload = () =>
  JSON.stringify({ message: "Hello World!", timestamp: Date.now() }, null, 2);

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
  const [formMode, setFormMode] = useState<FormMode>("quick");
  const [routingError, setRoutingError] = useState<RoutingError | null>(null);

  const publishMutation = usePublishMessage();
  const queryClient = useQueryClient();
  const { workspace } = useWorkspace();
  const { selectedVHost } = useVHostContext();

  const form = useForm<SendMessageFormData>({
    resolver: zodResolver(sendMessageSchema),
    mode: "onChange",
    defaultValues: {
      exchange: defaultExchange,
      routingKey: defaultRoutingKey,
      payload: buildDefaultPayload(),
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

  const { data: exchangesData } = useExchanges(serverId, selectedVHost);
  const { data: queuesData } = useQueues(serverId);

  const exchanges =
    exchangesData?.exchanges?.filter(
      (ex) => ex.name && ex.name.trim() !== ""
    ) || [];
  const queues = queuesData?.queues || [];

  const exchange = useWatch({ control: form.control, name: "exchange" });
  const routingKey = useWatch({ control: form.control, name: "routingKey" });
  const payload = useWatch({ control: form.control, name: "payload" });
  const contentType = useWatch({ control: form.control, name: "contentType" });
  const deliveryMode = useWatch({
    control: form.control,
    name: "deliveryMode",
  });
  const priority = useWatch({ control: form.control, name: "priority" });
  const expiration = useWatch({ control: form.control, name: "expiration" });
  const correlationId = useWatch({
    control: form.control,
    name: "correlationId",
  });
  const replyTo = useWatch({ control: form.control, name: "replyTo" });
  const messageId = useWatch({ control: form.control, name: "messageId" });
  const appId = useWatch({ control: form.control, name: "appId" });
  const messageType = useWatch({ control: form.control, name: "messageType" });
  const headers = useWatch({ control: form.control, name: "headers" });
  const contentEncoding = useWatch({
    control: form.control,
    name: "contentEncoding",
  });

  // Count non-default properties for preview
  const propertiesCount = useMemo(() => {
    let count = 0;
    if (priority) count++;
    if (expiration) count++;
    if (contentType && contentType !== "application/json") count++;
    if (contentEncoding && contentEncoding !== "none") count++;
    if (correlationId) count++;
    if (replyTo) count++;
    if (messageId) count++;
    if (appId) count++;
    if (messageType) count++;
    if (headers?.trim()) count++;
    return count;
  }, [
    priority,
    expiration,
    contentType,
    contentEncoding,
    correlationId,
    replyTo,
    messageId,
    appId,
    messageType,
    headers,
  ]);

  const resetForm = () => {
    form.reset({
      exchange: defaultExchange,
      routingKey: defaultRoutingKey,
      payload: buildDefaultPayload(),
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
    setFormMode("quick");
    setRoutingError(null);
  };

  const handlePublishError = (error: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    response?: { data?: any };
    message?: string;
  }) => {
    if (error.response?.data) {
      const errorData = error.response.data;
      if (errorData.routed === false && errorData.suggestions) {
        setRoutingError({
          message: (errorData.error ||
            errorData.message ||
            t("sendMessage.notRoutedTitle")) as string,
          suggestions: (errorData.suggestions || []) as string[],
          details: errorData.details as RoutingError["details"],
        });
        toast.error(t("sendMessage.notRoutedTitle"), {
          description: (errorData.error ||
            errorData.message ||
            t("sendMessage.notRoutedDescription")) as string,
        });
        return;
      }
    }

    setRoutingError(null);
    let errorMessage = error.message || t("sendMessage.errorDefault");
    if (error.response?.data?.message) {
      errorMessage = error.response.data.message as string;
    }
    toast.error(t("sendMessage.failedTitle"), {
      description: errorMessage,
    });
  };

  const handleRefreshAfterSuccess = async () => {
    try {
      if (serverId) {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.queues(serverId),
        });
      }
      onSuccess?.();
    } catch (error) {
      logger.error("SendMessageDialog: Error during cache refresh:", error);
      onSuccess?.();
    }
  };

  const applySuggestedSettings = (suggestion: string) => {
    if (
      suggestion.includes("default exchange") ||
      suggestion.includes("Consider using")
    ) {
      form.setValue("exchange", "");
      if (queueName) form.setValue("routingKey", queueName);
      setRoutingError(null);
      toast(t("sendMessage.settingsAppliedTitle"), {
        description: t("sendMessage.settingsAppliedDefault"),
      });
    } else if (suggestion.includes("routing key") && queues.length > 0) {
      form.setValue("routingKey", queues[0].name);
      toast(t("sendMessage.settingsAppliedTitle"), {
        description: t("sendMessage.settingsAppliedRoutingKey", {
          queueName: queues[0].name,
        }),
      });
    } else if (
      suggestion.includes("Verify that a queue is bound") &&
      queues.length > 0
    ) {
      const currentRoutingKey = form.getValues("routingKey");
      const matchingQueue = queues.find((q) => q.name === currentRoutingKey);
      if (!matchingQueue) {
        form.setValue("routingKey", queues[0].name);
        toast(t("sendMessage.settingsAppliedTitle"), {
          description: t("sendMessage.settingsAppliedExisting", {
            queueName: queues[0].name,
          }),
        });
      }
    }
  };

  const formatPayload = () => {
    try {
      const current = form.getValues("payload");
      const parsed = JSON.parse(current);
      form.setValue("payload", JSON.stringify(parsed, null, 2));
    } catch (error) {
      logger.error("Invalid JSON payload:", error);
    }
  };

  const onSubmit = async (data: SendMessageFormData) => {
    if (!serverId) return;
    if (mode === "queue" && !queueName) return;
    if (mode === "exchange" && !data.exchange) return;
    if (!data.payload) return;

    if (!workspace?.id) {
      toast.error(t("sendMessage.errorTitle"), {
        description: t("sendMessage.workspaceRequired"),
      });
      return;
    }

    let parsedHeaders: Record<string, unknown> = {};
    if (data.headers?.trim()) {
      try {
        parsedHeaders = JSON.parse(data.headers);
      } catch (error) {
        logger.error("Invalid headers JSON:", error);
        toast.error(t("sendMessage.invalidConfigTitle"), {
          description: t("sendMessage.invalidHeadersJson"),
        });
        return;
      }
    }

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

    const sharedPayload = {
      serverId,
      workspaceId: workspace.id,
      message: data.payload,
      properties: Object.keys(properties).length > 0 ? properties : undefined,
      vhost: selectedVHost
        ? encodeURIComponent(selectedVHost)
        : encodeURIComponent("/"),
    };

    if (mode === "queue" && queueName) {
      publishMutation.mutate(
        {
          ...sharedPayload,
          queueName,
          exchange: "",
          routingKey: data.routingKey || queueName,
        },
        {
          onSuccess: (resData) => {
            if (resData.routed) {
              setRoutingError(null);
              setOpen(false);
              toast(t("sendMessage.successTitle"), {
                description: t("sendMessage.successQueueDescription", {
                  exchange: resData.exchange || "default",
                  routingKey: resData.routingKey,
                  queueName,
                  messageLength: resData.messageLength,
                }),
              });
              resetForm();
              handleRefreshAfterSuccess();
            } else {
              setRoutingError({
                message: resData.error || t("sendMessage.notRoutedDescription"),
                suggestions: resData.suggestions || [],
                details: resData.details,
              });
              toast.error(t("sendMessage.notRoutedTitle"), {
                description:
                  resData.error || t("sendMessage.notRoutedDescription"),
              });
            }
          },
          onError: handlePublishError,
        }
      );
    } else if (mode === "exchange" && data.exchange) {
      publishMutation.mutate(
        {
          ...sharedPayload,
          queueName: data.routingKey || "",
          exchange: data.exchange,
          routingKey: data.routingKey,
        },
        {
          onSuccess: (resData) => {
            if (resData.routed) {
              setRoutingError(null);
              setOpen(false);
              toast(t("sendMessage.successTitle"), {
                description: t("sendMessage.successExchangeDescription", {
                  exchange: resData.exchange,
                  routingKey: resData.routingKey,
                  messageLength: resData.messageLength,
                }),
              });
              resetForm();
              handleRefreshAfterSuccess();
            } else {
              setRoutingError({
                message: resData.error || t("sendMessage.notRoutedDescription"),
                suggestions: resData.suggestions || [],
                details: resData.details,
              });
              toast.error(t("sendMessage.notRoutedTitle"), {
                description:
                  resData.error || t("sendMessage.notRoutedDescription"),
              });
            }
          },
          onError: handlePublishError,
        }
      );
    } else {
      toast.error(t("sendMessage.invalidConfigTitle"), {
        description:
          mode === "queue"
            ? t("sendMessage.invalidConfigQueue")
            : t("sendMessage.invalidConfigExchange"),
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      form.handleSubmit(onSubmit)();
    }
  };

  const submitDisabled =
    publishMutation.isPending || !payload || (mode === "exchange" && !exchange);

  const defaultTrigger = (
    <Button size="sm" className="gap-2">
      <Send className="h-4 w-4" />
      {t("sendMessage.triggerButton")}
    </Button>
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) resetForm();
      }}
    >
      <DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>
      <DialogContent
        className="sm:max-w-2xl lg:max-w-3xl max-h-[90vh] flex flex-col bg-card"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <TooltipProvider delayDuration={300}>
          <DialogHeader className="shrink-0">
            <DialogTitle>
              {mode === "queue"
                ? t("sendMessage.dialogTitleQueue", { queueName })
                : t("sendMessage.dialogTitle")}
            </DialogTitle>
            <DialogDescription>
              {mode === "queue"
                ? t("sendMessage.dialogDescriptionQueue")
                : t("sendMessage.dialogDescription")}
            </DialogDescription>
          </DialogHeader>

          <div
            className="flex-1 overflow-y-auto px-6 pb-6"
            onKeyDown={handleKeyDown}
          >
            {routingError && (
              <RoutingErrorPanel
                routingError={routingError}
                onApplySuggestion={applySuggestedSettings}
                onDismiss={() => setRoutingError(null)}
              />
            )}

            {mode === "exchange" && (
              <Tabs
                value={formMode}
                onValueChange={(v) => setFormMode(v as FormMode)}
                className="mb-6"
              >
                <TabsList>
                  <TabsTrigger value="quick">
                    {t("sendMessage.quickSend")}
                  </TabsTrigger>
                  <TabsTrigger value="advanced">
                    {t("sendMessage.advancedSend")}
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            )}

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                {mode === "exchange" ? (
                  <ExchangeRoutingField
                    form={form}
                    exchanges={exchanges}
                    queues={queues}
                  />
                ) : (
                  <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm text-foreground">
                    {t("sendMessage.publishingToQueue", { queueName })}
                  </div>
                )}

                <PayloadField
                  form={form}
                  contentType={contentType}
                  onFormat={formatPayload}
                />

                {(formMode === "advanced" || mode === "queue") && (
                  <MessagePropertiesSections form={form} />
                )}

                <PublishPreviewCard
                  mode={mode}
                  exchange={exchange}
                  routingKey={routingKey}
                  queueName={queueName}
                  payload={payload}
                  deliveryMode={deliveryMode}
                  propertiesCount={propertiesCount}
                />
              </form>
            </Form>
          </div>

          <DialogFooter className="flex gap-2 shrink-0 pt-6 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={publishMutation.isPending}
            >
              {t("sendMessage.cancel")}
            </Button>
            <Button
              type="submit"
              onClick={form.handleSubmit(onSubmit)}
              disabled={submitDisabled}
              className="btn-primary"
            >
              {publishMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                  {t("sendMessage.sending")}
                </>
              ) : (
                t("sendMessage.sendMessage")
              )}
            </Button>
          </DialogFooter>
        </TooltipProvider>
      </DialogContent>
    </Dialog>
  );
}
