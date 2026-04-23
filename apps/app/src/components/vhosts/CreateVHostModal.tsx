import React, { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { VHostPreviewCard } from "@/components/AddVirtualHostFormComponent/VHostPreviewCard";
import { VHostTypePreset } from "@/components/AddVirtualHostFormComponent/VHostTypePreset";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

import { useCreateVHost } from "@/hooks/queries/useRabbitMQVHosts";
import { useWorkspace } from "@/hooks/ui/useWorkspace";

import { type CreateVHostForm, createVHostSchema } from "@/schemas";

interface CreateVHostModalProps {
  isOpen: boolean;
  onClose: () => void;
  serverId: string;
  initialName?: string;
  onSuccess?: () => void;
}

type Mode = "quick" | "advanced";

export function CreateVHostModal({
  isOpen,
  onClose,
  serverId,
  initialName = "",
  onSuccess,
}: CreateVHostModalProps) {
  const { t } = useTranslation("vhosts");
  const { workspace } = useWorkspace();
  const [mode, setMode] = useState<Mode>("quick");

  const form = useForm<CreateVHostForm>({
    resolver: zodResolver(createVHostSchema),
    mode: "onChange",
    defaultValues: {
      name: initialName,
      description: "",
      defaultQueueType: undefined,
      tracing: false,
    },
  });

  // Sync `initialName` from props without resetting user edits if they've
  // already started typing. We only force-set when the dialog opens fresh.
  useEffect(() => {
    if (isOpen && initialName) {
      form.setValue("name", initialName);
    }
  }, [initialName, isOpen, form]);

  const createVHostMutation = useCreateVHost();

  const name = useWatch({ control: form.control, name: "name" });
  const defaultQueueType = useWatch({
    control: form.control,
    name: "defaultQueueType",
  });
  const tracing = useWatch({ control: form.control, name: "tracing" });

  const resetAll = () => {
    form.reset({
      name: "",
      description: "",
      defaultQueueType: undefined,
      tracing: false,
    });
    setMode("quick");
  };

  const handleClose = () => {
    resetAll();
    onClose();
  };

  const onSubmit = (data: CreateVHostForm) => {
    if (!workspace?.id) {
      toast.error(t("toast.workspaceRequired"));
      return;
    }

    createVHostMutation.mutate(
      {
        serverId,
        workspaceId: workspace.id,
        name: data.name.trim(),
        description: data.description,
        // Map camelCase form field to API's snake_case contract at the edge.
        default_queue_type: data.defaultQueueType,
        tracing: data.tracing,
      },
      {
        onSuccess: () => {
          toast.success(t("toast.vhostCreatedDesc", { name: data.name }));
          resetAll();
          onSuccess?.();
          onClose();
        },
        onError: (error) => {
          const message = error?.message ?? "";
          if (message.toLowerCase().includes("already exists")) {
            toast.error(t("toast.alreadyExistsDesc", { name: data.name }));
            return;
          }
          if (
            message.includes("Server not found") ||
            message.includes("access denied")
          ) {
            toast.error(t("toast.serverErrorDesc"));
            return;
          }
          toast.error(message || t("createError"));
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

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(next) => {
        if (!next) handleClose();
      }}
    >
      <DialogContent className="sm:max-w-xl lg:max-w-2xl max-h-[90vh] flex flex-col bg-card">
        <DialogHeader className="shrink-0">
          <DialogTitle>{t("createVhost")}</DialogTitle>
          <DialogDescription>{t("createVhostDescription")}</DialogDescription>
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
                    <FormLabel>{t("name")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t("namePlaceholder")}
                        autoFocus
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>{t("nameDescription")}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="defaultQueueType"
                render={({ field }) => (
                  <FormItem>
                    <VHostTypePreset
                      value={field.value}
                      onChange={field.onChange}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              {mode === "advanced" && (
                <>
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("description")}</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder={t("descriptionPlaceholder")}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="tracing"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start gap-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            id="vhost-tracing"
                            className="mt-0.5"
                          />
                        </FormControl>
                        <label
                          htmlFor="vhost-tracing"
                          className="flex flex-col gap-0.5 cursor-pointer"
                        >
                          <span className="text-sm font-medium text-foreground">
                            {t("enableTracing")}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {t("enableTracingDescription")}
                          </span>
                        </label>
                      </FormItem>
                    )}
                  />
                </>
              )}

              <VHostPreviewCard
                name={name}
                defaultQueueType={defaultQueueType}
                tracing={tracing}
              />
            </form>
          </Form>
        </div>

        <DialogFooter className="flex gap-2 shrink-0 pt-6 border-t border-border">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={createVHostMutation.isPending}
          >
            {t("cancel")}
          </Button>
          <Button
            type="submit"
            onClick={form.handleSubmit(onSubmit)}
            disabled={createVHostMutation.isPending}
            className="btn-primary"
          >
            {createVHostMutation.isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                {t("creating")}
              </>
            ) : (
              t("create")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
