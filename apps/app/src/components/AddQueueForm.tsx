import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertCircle,
  ChevronDown,
  ChevronRight,
  List,
  Plus,
} from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { useVHostContext } from "@/contexts/VHostContextDefinition";

import { useCreateQueue, useExchanges } from "@/hooks/queries/useRabbitMQ";
import { useToast } from "@/hooks/ui/useToast";
import { useWorkspace } from "@/hooks/ui/useWorkspace";

import { type AddQueueFormData, addQueueSchema } from "@/schemas";

interface AddQueueFormProps {
  trigger?: React.ReactNode;
  serverId: string;
  onSuccess?: () => void; // Callback for successful queue creation
}

export function AddQueueForm({
  trigger,
  serverId,
  onSuccess,
}: AddQueueFormProps) {
  const [open, setOpen] = useState(false);
  const [isAdvancedExpanded, setIsAdvancedExpanded] = useState(false);
  const [arguments_, setArguments] = useState("");

  const createQueueMutation = useCreateQueue();
  const { toast } = useToast();
  const { workspace } = useWorkspace();
  const { selectedVHost } = useVHostContext();
  const { t } = useTranslation("queues");

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
  const { data: exchangesData } = useExchanges(serverId);
  const exchanges = exchangesData?.exchanges || [];

  const onSubmit = (data: AddQueueFormData) => {
    if (!serverId) {
      toast({
        title: t("toast.error"),
        description: t("toast.noServerSelected"),
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

    // Parse additional arguments if provided
    let parsedArguments = {};
    if (arguments_.trim()) {
      try {
        parsedArguments = JSON.parse(arguments_);
      } catch {
        toast({
          title: t("toast.invalidJson"),
          description: t("toast.invalidJsonDesc"),
          variant: "destructive",
        });
        return;
      }
    }

    // Merge all arguments
    const finalArguments = { ...queueArguments, ...parsedArguments };

    if (!workspace?.id) {
      toast({
        title: t("toast.error"),
        description: t("toast.workspaceRequired"),
        variant: "destructive",
      });
      return;
    }

    createQueueMutation.mutate(
      {
        serverId,
        workspaceId: workspace.id,
        name: data.name.trim(),
        durable: data.durable,
        autoDelete: data.autoDelete,
        exclusive: data.exclusive,
        arguments: finalArguments,
        vhost: selectedVHost
          ? encodeURIComponent(selectedVHost)
          : encodeURIComponent("/"),
      },
      {
        onSuccess: () => {
          setOpen(false);

          toast({
            title: t("toast.queueCreated"),
            description: t("toast.queueCreatedDesc", { name: data.name }),
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
          setArguments("");
          setIsAdvancedExpanded(false);

          // Call the success callback to refresh queue data
          onSuccess?.();
        },
        onError: (error) => {
          // Extract user-friendly error message based on the error type
          let title = t("toast.failedToCreate");
          let description = t("toast.createError");

          if (error.message) {
            // Handle specific error cases with user-friendly messages
            if (error.message.includes("already exists")) {
              title = t("toast.alreadyExists");
              description = t("toast.alreadyExistsDesc", { name: data.name });
            } else if (
              error.message.includes("Exchange") &&
              error.message.includes("does not exist")
            ) {
              title = t("toast.exchangeNotFound");
              description = t("toast.exchangeNotFoundDesc", {
                exchange: data.bindToExchange,
              });
            } else if (error.message.includes("Server not found")) {
              title = t("toast.serverError");
              description = t("toast.serverErrorDesc");
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
      {t("addQueue")}
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <List className="h-5 w-5" />
            {t("createNewQueue")}
          </DialogTitle>
          <DialogDescription>{t("createNewQueueDesc")}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Queue Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("queueNameLabel")}</FormLabel>
                  <FormControl>
                    <Input placeholder={t("queueNamePlaceholder")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Queue Properties */}
            <div className="space-y-4">
              <FormLabel className="text-sm font-medium">
                {t("queueProperties")}
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
                          {t("durable")}
                        </FormLabel>
                        <span className="text-xs text-gray-500">
                          {" "}
                          {t("durableDesc")}
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
                          {t("autoDelete")}
                        </FormLabel>
                        <span className="text-xs text-gray-500">
                          {" "}
                          {t("autoDeleteDesc")}
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
                          {t("exclusive")}
                        </FormLabel>
                        <span className="text-xs text-gray-500">
                          {" "}
                          {t("exclusiveDesc")}
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
                {t("exchangeBinding")}
              </FormLabel>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="bindToExchange"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("exchange")}</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t("selectExchange")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">
                            <span className="text-gray-500">
                              {t("noBinding")}
                            </span>
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
                              {t("noExchangesAvailable")}
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
                      <FormLabel>{t("routingKey")}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t("routingKeyPlaceholder")}
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
                      {t("bindingAlert", {
                        exchange:
                          form.watch("bindToExchange") === "default"
                            ? "(Default)"
                            : form.watch("bindToExchange"),
                      })}
                      {form.watch("routingKey") &&
                        t("bindingAlertWithKey", {
                          key: form.watch("routingKey"),
                        })}
                      .
                    </AlertDescription>
                  </Alert>
                )}
            </div>

            {/* Arguments Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Label className="text-base font-medium">
                  {t("arguments")}
                </Label>
              </div>
              <Textarea
                value={arguments_}
                onChange={(e) => setArguments(e.target.value)}
                placeholder='{ "key": value }'
                disabled={createQueueMutation.isPending}
                className="min-h-[120px] font-mono text-sm focus:ring-2 focus:ring-orange-200 focus:border-orange-400 focus:ring-offset-0"
              />
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">
                  {t("availableOptions")}
                </p>
                <div className="flex flex-wrap gap-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => {
                            const newArg = '"x-max-length": 10000';
                            const currentValue = arguments_.trim();
                            if (currentValue === "") {
                              setArguments(`{ ${newArg} }`);
                            } else if (currentValue === "{}") {
                              setArguments(`{ ${newArg} }`);
                            } else {
                              // Add to existing JSON
                              const cleanValue = currentValue.replace(/}$/, "");
                              const separator = cleanValue.endsWith("{")
                                ? ""
                                : ", ";
                              setArguments(
                                `${cleanValue}${separator}${newArg} }`
                              );
                            }
                          }}
                          className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-orange-100 text-gray-700 hover:text-orange-800 rounded-md border hover:border-orange-300 transition-colors"
                        >
                          x-max-length
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="z-50">
                        <p className="max-w-xs">{t("tooltipMaxLength")}</p>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => {
                            const newArg = '"x-message-ttl": 3600000';
                            const currentValue = arguments_.trim();
                            if (currentValue === "") {
                              setArguments(`{ ${newArg} }`);
                            } else if (currentValue === "{}") {
                              setArguments(`{ ${newArg} }`);
                            } else {
                              const cleanValue = currentValue.replace(/}$/, "");
                              const separator = cleanValue.endsWith("{")
                                ? ""
                                : ", ";
                              setArguments(
                                `${cleanValue}${separator}${newArg} }`
                              );
                            }
                          }}
                          className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-orange-100 text-gray-700 hover:text-orange-800 rounded-md border hover:border-orange-300 transition-colors"
                        >
                          x-message-ttl
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="z-50">
                        <p className="max-w-xs">{t("tooltipMessageTtl")}</p>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => {
                            const newArg = '"x-expires": 1800000';
                            const currentValue = arguments_.trim();
                            if (currentValue === "") {
                              setArguments(`{ ${newArg} }`);
                            } else if (currentValue === "{}") {
                              setArguments(`{ ${newArg} }`);
                            } else {
                              const cleanValue = currentValue.replace(/}$/, "");
                              const separator = cleanValue.endsWith("{")
                                ? ""
                                : ", ";
                              setArguments(
                                `${cleanValue}${separator}${newArg} }`
                              );
                            }
                          }}
                          className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-orange-100 text-gray-700 hover:text-orange-800 rounded-md border hover:border-orange-300 transition-colors"
                        >
                          x-expires
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="z-50">
                        <p className="max-w-xs">{t("tooltipExpires")}</p>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => {
                            const newArg = '"x-max-priority": 10';
                            const currentValue = arguments_.trim();
                            if (currentValue === "") {
                              setArguments(`{ ${newArg} }`);
                            } else if (currentValue === "{}") {
                              setArguments(`{ ${newArg} }`);
                            } else {
                              const cleanValue = currentValue.replace(/}$/, "");
                              const separator = cleanValue.endsWith("{")
                                ? ""
                                : ", ";
                              setArguments(
                                `${cleanValue}${separator}${newArg} }`
                              );
                            }
                          }}
                          className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-orange-100 text-gray-700 hover:text-orange-800 rounded-md border hover:border-orange-300 transition-colors"
                        >
                          x-max-priority
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="z-50">
                        <p className="max-w-xs">{t("tooltipMaxPriority")}</p>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => {
                            const newArg = '"x-overflow": "reject-publish"';
                            const currentValue = arguments_.trim();
                            if (currentValue === "") {
                              setArguments(`{ ${newArg} }`);
                            } else if (currentValue === "{}") {
                              setArguments(`{ ${newArg} }`);
                            } else {
                              const cleanValue = currentValue.replace(/}$/, "");
                              const separator = cleanValue.endsWith("{")
                                ? ""
                                : ", ";
                              setArguments(
                                `${cleanValue}${separator}${newArg} }`
                              );
                            }
                          }}
                          className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-orange-100 text-gray-700 hover:text-orange-800 rounded-md border hover:border-orange-300 transition-colors"
                        >
                          x-overflow
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="z-50">
                        <p className="max-w-xs">{t("tooltipOverflow")}</p>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => {
                            const newArg =
                              '"x-dead-letter-exchange": "dlx-exchange"';
                            const currentValue = arguments_.trim();
                            if (currentValue === "") {
                              setArguments(`{ ${newArg} }`);
                            } else if (currentValue === "{}") {
                              setArguments(`{ ${newArg} }`);
                            } else {
                              const cleanValue = currentValue.replace(/}$/, "");
                              const separator = cleanValue.endsWith("{")
                                ? ""
                                : ", ";
                              setArguments(
                                `${cleanValue}${separator}${newArg} }`
                              );
                            }
                          }}
                          className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-orange-100 text-gray-700 hover:text-orange-800 rounded-md border hover:border-orange-300 transition-colors"
                        >
                          x-dead-letter-exchange
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="z-50">
                        <p className="max-w-xs">
                          {t("tooltipDeadLetterExchange")}
                        </p>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => {
                            const newArg =
                              '"x-dead-letter-routing-key": "dlx.routing.key"';
                            const currentValue = arguments_.trim();
                            if (currentValue === "") {
                              setArguments(`{ ${newArg} }`);
                            } else if (currentValue === "{}") {
                              setArguments(`{ ${newArg} }`);
                            } else {
                              const cleanValue = currentValue.replace(/}$/, "");
                              const separator = cleanValue.endsWith("{")
                                ? ""
                                : ", ";
                              setArguments(
                                `${cleanValue}${separator}${newArg} }`
                              );
                            }
                          }}
                          className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-orange-100 text-gray-700 hover:text-orange-800 rounded-md border hover:border-orange-300 transition-colors"
                        >
                          x-dead-letter-routing-key
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="z-50">
                        <p className="max-w-xs">
                          {t("tooltipDeadLetterRoutingKey")}
                        </p>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => {
                            const newArg = '"x-single-active-consumer": true';
                            const currentValue = arguments_.trim();
                            if (currentValue === "") {
                              setArguments(`{ ${newArg} }`);
                            } else if (currentValue === "{}") {
                              setArguments(`{ ${newArg} }`);
                            } else {
                              const cleanValue = currentValue.replace(/}$/, "");
                              const separator = cleanValue.endsWith("{")
                                ? ""
                                : ", ";
                              setArguments(
                                `${cleanValue}${separator}${newArg} }`
                              );
                            }
                          }}
                          className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-orange-100 text-gray-700 hover:text-orange-800 rounded-md border hover:border-orange-300 transition-colors"
                        >
                          x-single-active-consumer
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="z-50">
                        <p className="max-w-xs">
                          {t("tooltipSingleActiveConsumer")}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
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
                  {t("advancedOptions")}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="maxLength"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("maxLength")}</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="e.g., 10000"
                            min="1"
                            {...field}
                          />
                        </FormControl>
                        <span className="text-xs text-gray-500">
                          {t("maxLengthDesc")}
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
                        <FormLabel>{t("messageTtl")}</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="e.g., 3600"
                            min="1"
                            {...field}
                          />
                        </FormControl>
                        <span className="text-xs text-gray-500">
                          {t("messageTtlDesc")}
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
                {t("cancel")}
              </Button>
              <Button
                type="submit"
                disabled={
                  createQueueMutation.isPending || !form.formState.isValid
                }
                className="bg-linear-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white"
              >
                {createQueueMutation.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    {t("creating")}
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    {t("createQueue")}
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
