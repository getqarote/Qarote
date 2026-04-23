import React, { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";

import { AdvancedExchangeProperties } from "@/components/AddExchangeFormComponent/AdvancedExchangeProperties";
import { normalizeArgValue } from "@/components/AddExchangeFormComponent/constants";
import { ExchangeArgumentsBuilder } from "@/components/AddExchangeFormComponent/ExchangeArgumentsBuilder";
import { ExchangePreviewCard } from "@/components/AddExchangeFormComponent/ExchangePreviewCard";
import { ExchangeTypePreset } from "@/components/AddExchangeFormComponent/ExchangeTypePreset";
import type { ArgRow } from "@/components/AddExchangeFormComponent/types";
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

import { useCreateExchange } from "@/hooks/queries/useRabbitMQ";
import { useToast } from "@/hooks/ui/useToast";
import { useWorkspace } from "@/hooks/ui/useWorkspace";

import { type AddExchangeFormData, addExchangeSchema } from "@/schemas";

interface AddExchangeFormProps {
  trigger?: React.ReactNode;
  serverId: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
}

type Mode = "quick" | "advanced";

export function AddExchangeForm({
  trigger,
  serverId,
  open: openProp,
  onOpenChange,
  onSuccess,
}: AddExchangeFormProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("quick");
  const [rows, setRows] = useState<ArgRow[]>([]);

  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : internalOpen;
  const setOpen = (next: boolean) => {
    if (isControlled) {
      onOpenChange?.(next);
    } else {
      setInternalOpen(next);
    }
  };

  const createExchangeMutation = useCreateExchange();
  const { toast } = useToast();
  const { workspace } = useWorkspace();
  const { selectedVHost } = useVHostContext();
  const { t } = useTranslation("exchanges");

  const form = useForm<AddExchangeFormData>({
    resolver: zodResolver(addExchangeSchema),
    mode: "onChange",
    defaultValues: {
      name: "",
      type: "direct",
      durable: true,
      autoDelete: false,
      internal: false,
    },
  });

  const name = useWatch({ control: form.control, name: "name" });
  const type = useWatch({ control: form.control, name: "type" });
  const durable = useWatch({ control: form.control, name: "durable" });
  const autoDelete = useWatch({ control: form.control, name: "autoDelete" });
  const internal = useWatch({ control: form.control, name: "internal" });

  const previewRows = useMemo(() => rows, [rows]);

  const resetAll = () => {
    form.reset({
      name: "",
      type: "direct",
      durable: true,
      autoDelete: false,
      internal: false,
    });
    setRows([]);
    setMode("quick");
  };

  const onSubmit = (data: AddExchangeFormData) => {
    if (!serverId) {
      toast({
        title: t("toast.error"),
        description: t("toast.noServerSelected"),
        variant: "destructive",
      });
      return;
    }
    if (!workspace?.id) {
      toast({
        title: t("toast.error"),
        description: t("toast.workspaceRequired"),
        variant: "destructive",
      });
      return;
    }

    const finalArguments: Record<string, unknown> = {};
    for (const row of rows) {
      if (!row.key) continue;
      const value = normalizeArgValue(row.key, row.value);
      if (value === undefined) continue;
      finalArguments[row.key] = value;
    }

    createExchangeMutation.mutate(
      {
        serverId,
        workspaceId: workspace.id,
        name: data.name.trim(),
        type: data.type,
        durable: data.durable,
        auto_delete: data.autoDelete,
        internal: data.internal,
        arguments: finalArguments,
        vhost: selectedVHost
          ? encodeURIComponent(selectedVHost)
          : encodeURIComponent("/"),
      } as Parameters<typeof createExchangeMutation.mutate>[0],
      {
        onSuccess: () => {
          setOpen(false);
          toast({
            title: t("toast.exchangeCreated"),
            description: t("toast.exchangeCreatedDesc", { name: data.name }),
          });
          resetAll();
          onSuccess?.();
        },
        onError: (error) => {
          let title = t("toast.failedToCreate");
          let description = t("toast.createError");

          if (error.message) {
            if (error.message.toLowerCase().includes("already exists")) {
              title = t("toast.alreadyExists");
              description = t("toast.alreadyExistsDesc", { name: data.name });
            } else if (error.message.includes("amq.")) {
              title = t("toast.error");
              description = t("toast.amqPrefixReserved");
            } else if (error.message.includes("Server not found")) {
              title = t("toast.serverError");
              description = t("toast.serverErrorDesc");
            } else {
              description = error.message;
            }
          }

          toast({ title, description, variant: "destructive" });
        },
      }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      form.handleSubmit(onSubmit)();
    }
  };

  const defaultTrigger = (
    <Button size="sm" className="gap-2">
      <Plus className="h-4 w-4" />
      {t("addExchange")}
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
      {trigger !== null && (
        <DialogTrigger asChild>{trigger ?? defaultTrigger}</DialogTrigger>
      )}
      <DialogContent className="sm:max-w-xl lg:max-w-2xl max-h-[90vh] flex flex-col bg-card">
        <DialogHeader className="shrink-0">
          <DialogTitle>{t("createNewExchange")}</DialogTitle>
          <DialogDescription>{t("createNewExchangeDesc")}</DialogDescription>
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
                    <FormLabel>{t("exchangeNameLabel")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t("exchangeNamePlaceholder")}
                        autoFocus
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <ExchangeTypePreset
                      value={field.value}
                      onChange={field.onChange}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              {mode === "advanced" && (
                <>
                  <AdvancedExchangeProperties form={form} />
                  <ExchangeArgumentsBuilder rows={rows} onChange={setRows} />
                </>
              )}

              <ExchangePreviewCard
                name={name}
                type={type}
                durable={durable}
                autoDelete={autoDelete}
                internal={internal}
                rows={previewRows}
              />
            </form>
          </Form>
        </div>

        <DialogFooter className="flex gap-2 shrink-0 pt-6 border-t border-border">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={createExchangeMutation.isPending}
          >
            {t("cancel")}
          </Button>
          <Button
            type="submit"
            onClick={form.handleSubmit(onSubmit)}
            disabled={createExchangeMutation.isPending}
            className="btn-primary"
          >
            {createExchangeMutation.isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                {t("creating")}
              </>
            ) : (
              t("createExchange")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
