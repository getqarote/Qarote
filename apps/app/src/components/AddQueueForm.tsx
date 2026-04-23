import React, { useMemo, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { AdvancedQueueProperties } from "@/components/AddQueueFormComponent/AdvancedQueueProperties";
import { ArgumentsBuilder } from "@/components/AddQueueFormComponent/ArgumentsBuilder";
import {
  DEFAULT_EXCHANGE,
  NO_BINDING,
  normalizeArgValue,
  QUEUE_PRESETS,
  type QueuePresetId,
  type RabbitMQQueueType,
} from "@/components/AddQueueFormComponent/constants";
import { ExchangeBindingField } from "@/components/AddQueueFormComponent/ExchangeBindingField";
import { QueuePreviewCard } from "@/components/AddQueueFormComponent/QueuePreviewCard";
import { QueueTypePreset } from "@/components/AddQueueFormComponent/QueueTypePreset";
import { RabbitMQQueueTypeSelector } from "@/components/AddQueueFormComponent/RabbitMQQueueTypeSelector";
import type { ArgRow } from "@/components/AddQueueFormComponent/types";
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { useVHostContext } from "@/contexts/VHostContextDefinition";

import { useCreateQueue, useExchanges } from "@/hooks/queries/useRabbitMQ";
import { useWorkspace } from "@/hooks/ui/useWorkspace";

import { type AddQueueFormData, addQueueSchema } from "@/schemas";

interface AddQueueFormProps {
  trigger?: React.ReactNode;
  serverId: string;
  onSuccess?: () => void;
}

type Mode = "quick" | "advanced";

const newRowId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `row-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const rowsFromPreset = (id: QueuePresetId): ArgRow[] => {
  const preset = QUEUE_PRESETS.find((p) => p.id === id);
  if (!preset) return [];
  return preset.args.map((a) => ({ id: newRowId(), ...a }));
};

export function AddQueueForm({
  trigger,
  serverId,
  onSuccess,
}: AddQueueFormProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("quick");
  const [preset, setPreset] = useState<QueuePresetId>("classic");
  const [rows, setRows] = useState<ArgRow[]>([]);
  const [queueType, setQueueType] = useState<RabbitMQQueueType>("default");
  // Harden: track pending type switch requiring confirmation when args exist
  const [pendingTypeSwitch, setPendingTypeSwitch] =
    useState<RabbitMQQueueType | null>(null);
  // Clarify: how many args were cleared on last type switch (shown in locked notice)
  const [clearedArgsCount, setClearedArgsCount] = useState(0);
  const prevQueueTypeRef = useRef<RabbitMQQueueType>("default");

  const createQueueMutation = useCreateQueue();
  const { workspace } = useWorkspace();
  const { selectedVHost } = useVHostContext();
  const { t } = useTranslation("queues");

  const form = useForm<AddQueueFormData>({
    resolver: zodResolver(addQueueSchema),
    mode: "onChange",
    defaultValues: {
      name: "",
      durable: true,
      autoDelete: false,
      exclusive: false,
      bindToExchange: "",
      routingKey: "",
    },
  });

  const { data: exchangesData } = useExchanges(serverId, selectedVHost);
  const exchanges = exchangesData?.exchanges || [];

  const name = useWatch({ control: form.control, name: "name" });
  const durable = useWatch({ control: form.control, name: "durable" });
  const autoDelete = useWatch({ control: form.control, name: "autoDelete" });
  const exclusive = useWatch({ control: form.control, name: "exclusive" });
  const bindToExchange = useWatch({
    control: form.control,
    name: "bindToExchange",
  });
  const routingKey = useWatch({ control: form.control, name: "routingKey" });

  // Memoize for preview to avoid recomputing unnecessarily.
  const previewRows = useMemo(() => rows, [rows]);

  const applyPreset = (id: QueuePresetId) => {
    setPreset(id);
    const p = QUEUE_PRESETS.find((q) => q.id === id);
    if (!p) return;
    form.setValue("durable", p.durable);
    form.setValue("autoDelete", p.autoDelete);
    form.setValue("exclusive", p.exclusive);
    setRows(rowsFromPreset(id));
  };

  /** Apply a type switch and its side-effects (call only when safe to do so). */
  const commitTypeChange = (type: RabbitMQQueueType) => {
    setQueueType(type);
    setPendingTypeSwitch(null);
    if (type === "quorum" || type === "stream") {
      form.setValue("durable", true);
      form.setValue("autoDelete", false);
      form.setValue("exclusive", false);
      // Capture count before clearing so the locked notice can display it.
      setClearedArgsCount(rows.length);
      setPreset("classic");
      setRows([]);
    } else {
      setClearedArgsCount(0);
    }
  };

  const handleQueueTypeChange = (type: RabbitMQQueueType) => {
    // Harden: if switching to a locked type and the user has configured
    // arguments, pause and ask for confirmation before discarding them.
    if ((type === "quorum" || type === "stream") && rows.length > 0) {
      // Only capture the prior type the first time so cancelTypeSwitch
      // always reverts to the original type, not a chained intermediate.
      if (!pendingTypeSwitch) {
        prevQueueTypeRef.current = queueType;
      }
      setQueueType(type); // update the selector immediately so it feels responsive
      setPendingTypeSwitch(type);
      return;
    }
    commitTypeChange(type);
  };

  /** User confirmed they're OK discarding incompatible arguments. */
  const confirmTypeSwitch = () => {
    if (!pendingTypeSwitch) return;
    const type = pendingTypeSwitch;
    setPendingTypeSwitch(null);
    commitTypeChange(type);
  };

  /** User changed their mind — revert the selector to the previous type. */
  const cancelTypeSwitch = () => {
    setQueueType(prevQueueTypeRef.current);
    setPendingTypeSwitch(null);
  };

  const resetAll = () => {
    form.reset({
      name: "",
      durable: true,
      autoDelete: false,
      exclusive: false,
      bindToExchange: "",
      routingKey: "",
    });
    setRows([]);
    setPreset("classic");
    setMode("quick");
    setQueueType("default");
    setPendingTypeSwitch(null);
    setClearedArgsCount(0);
  };

  const onSubmit = (data: AddQueueFormData) => {
    if (!serverId) {
      toast.error(t("toast.error"), {
        description: t("toast.noServerSelected"),
      });
      return;
    }
    if (!workspace?.id) {
      toast.error(t("toast.error"), {
        description: t("toast.workspaceRequired"),
      });
      return;
    }

    // Guard: type-switch confirmation is pending — do not submit yet.
    if (pendingTypeSwitch) return;

    // Build final arguments object from the structured builder rows.
    const finalArguments: Record<string, unknown> = {};
    for (const row of rows) {
      if (!row.key) continue;
      const value = normalizeArgValue(row.key, row.value);
      if (value === undefined) continue;
      finalArguments[row.key] = value;
    }
    if (queueType === "quorum" || queueType === "stream") {
      finalArguments["x-queue-type"] = queueType;
    }

    const bindValue = data.bindToExchange;
    const hasBinding = !!bindValue && bindValue !== NO_BINDING;

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
        // Pass binding info only if present — keeps existing backend contract.
        ...(hasBinding && {
          bindToExchange:
            bindValue === DEFAULT_EXCHANGE ? "" : (bindValue as string),
          routingKey: data.routingKey || "",
        }),
      } as Parameters<typeof createQueueMutation.mutate>[0],
      {
        onSuccess: () => {
          setOpen(false);
          toast(t("toast.queueCreated"), {
            description: t("toast.queueCreatedDesc", { name: data.name }),
          });
          resetAll();
          onSuccess?.();
        },
        onError: (error) => {
          let title = t("toast.failedToCreate");
          let description = t("toast.createError");

          if (error.message) {
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
              description = error.message;
            }
          }

          toast.error(title, { description });
        },
      }
    );
  };

  // Cmd/Ctrl+Enter submit for power users.
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      form.handleSubmit(onSubmit)();
    }
  };

  const defaultTrigger = (
    <Button size="sm" className="gap-2">
      <Plus className="h-4 w-4" />
      {t("addQueue")}
    </Button>
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) resetAll();
      }}
    >
      <DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>
      <DialogContent className="sm:max-w-xl lg:max-w-2xl max-h-[90vh] flex flex-col bg-card">
        <DialogHeader className="shrink-0">
          <DialogTitle>{t("createNewQueue")}</DialogTitle>
          <DialogDescription>{t("createNewQueueDesc")}</DialogDescription>
        </DialogHeader>

        <div
          className="flex-1 overflow-y-auto px-6 pb-6"
          onKeyDown={handleKeyDown}
        >
          <Tabs
            value={mode}
            onValueChange={(v) => setMode(v as Mode)}
            className="mb-6"
          >
            <TabsList>
              <TabsTrigger value="quick">{t("quickCreate")}</TabsTrigger>
              <TabsTrigger value="advanced">{t("advancedCreate")}</TabsTrigger>
            </TabsList>
          </Tabs>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("queueNameLabel")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t("queueNamePlaceholder")}
                        autoFocus
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <RabbitMQQueueTypeSelector
                value={queueType}
                onChange={handleQueueTypeChange}
              />

              {mode === "quick" && (
                <div
                  key={
                    queueType === "quorum" || queueType === "stream"
                      ? "locked"
                      : "preset"
                  }
                  className="animate-in fade-in duration-150"
                >
                  {queueType === "quorum" || queueType === "stream" ? (
                    pendingTypeSwitch ? (
                      // Harden: confirm before discarding existing arguments
                      <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
                        <p className="text-sm font-medium text-foreground">
                          {t("presetSectionTitle")}
                        </p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {t("presetSwitchWarning", {
                            count: rows.length,
                            type:
                              queueType === "quorum"
                                ? t("rabbitTypeQuorum")
                                : t("rabbitTypeStream"),
                          })}
                        </p>
                        <div className="flex gap-4 pt-0.5">
                          <button
                            type="button"
                            onClick={confirmTypeSwitch}
                            className="text-xs font-medium text-foreground hover:underline underline-offset-2"
                          >
                            {t("presetSwitchConfirm")}
                          </button>
                          <button
                            type="button"
                            onClick={cancelTypeSwitch}
                            className="text-xs text-muted-foreground hover:text-foreground"
                          >
                            {t("presetSwitchCancel")}
                          </button>
                        </div>
                      </div>
                    ) : (
                      // Clarify: explain why presets are unavailable
                      <div className="rounded-lg border border-dashed border-border p-3 space-y-1">
                        <p className="text-sm font-medium text-foreground">
                          {t("presetSectionTitle")}
                        </p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {t("presetLockedDesc", {
                            type:
                              queueType === "quorum"
                                ? t("rabbitTypeQuorum")
                                : t("rabbitTypeStream"),
                          })}
                          {clearedArgsCount > 0 && (
                            <>
                              {" "}
                              {t("presetLockedCleared", {
                                count: clearedArgsCount,
                              })}
                            </>
                          )}
                        </p>
                      </div>
                    )
                  ) : (
                    <QueueTypePreset value={preset} onChange={applyPreset} />
                  )}
                </div>
              )}

              <ExchangeBindingField form={form} exchanges={exchanges} />

              {mode === "advanced" && (
                <>
                  <AdvancedQueueProperties form={form} />
                  <ArgumentsBuilder rows={rows} onChange={setRows} />
                </>
              )}

              <QueuePreviewCard
                name={name}
                durable={durable}
                autoDelete={autoDelete}
                exclusive={exclusive}
                bindToExchange={bindToExchange}
                routingKey={routingKey}
                rows={previewRows}
                queueType={queueType}
              />
            </form>
          </Form>
        </div>

        <DialogFooter className="flex gap-2 shrink-0 pt-6 border-t border-border">
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
            onClick={form.handleSubmit(onSubmit)}
            disabled={createQueueMutation.isPending || !!pendingTypeSwitch}
            className="btn-primary"
          >
            {createQueueMutation.isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                {t("creating")}
              </>
            ) : (
              t("createQueue")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
