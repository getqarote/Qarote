import React from "react";
import { useForm } from "react-hook-form";
import { Trans, useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import { VHost } from "@/lib/api/vhostTypes";

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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";

import { useUpdateVHost } from "@/hooks/queries/useRabbitMQVHosts";
import { useWorkspace } from "@/hooks/ui/useWorkspace";

import {
  type EditVHostForm,
  editVHostSchema,
  VHOST_QUEUE_TYPES,
  type VHostQueueType,
} from "@/schemas";

interface EditVHostModalProps {
  isOpen: boolean;
  onClose: () => void;
  serverId: string;
  vhost: VHost;
}

function toVHostQueueType(raw: string | undefined): VHostQueueType | undefined {
  return (VHOST_QUEUE_TYPES as readonly string[]).includes(raw ?? "")
    ? (raw as VHostQueueType)
    : undefined;
}

export function EditVHostModal({
  isOpen,
  onClose,
  serverId,
  vhost,
}: EditVHostModalProps) {
  const { t } = useTranslation("vhosts");
  const queryClient = useQueryClient();
  const { workspace } = useWorkspace();

  const form = useForm<EditVHostForm>({
    resolver: zodResolver(editVHostSchema),
    defaultValues: {
      description: vhost.description || "",
      defaultQueueType: toVHostQueueType(vhost.default_queue_type),
      tracing: vhost.tracing || false,
    },
  });

  const updateVHostMutation = useUpdateVHost();
  const tracingValue = form.watch("tracing");

  const onSubmit = (data: EditVHostForm) => {
    if (!workspace?.id) {
      toast.error(t("toast.workspaceRequired"));
      return;
    }
    updateVHostMutation.mutate(
      {
        serverId,
        workspaceId: workspace.id,
        vhostName: vhost.name,
        description: data.description,
        default_queue_type: data.defaultQueueType,
        tracing: data.tracing,
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: ["vhost", serverId, vhost.name],
          });
          queryClient.invalidateQueries({ queryKey: ["vhosts", serverId] });
          toast.success(t("updateSuccess"));
          onClose();
        },
        onError: (error) => {
          toast.error(error?.message || t("updateError"));
        },
      }
    );
  };

  const handleClose = () => {
    form.reset({
      description: vhost.description || "",
      defaultQueueType: toVHostQueueType(vhost.default_queue_type),
      tracing: vhost.tracing || false,
    });
    onClose();
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("editVhost")}</DialogTitle>
          <DialogDescription>
            <Trans
              i18nKey="vhosts:editVhostDescription"
              values={{
                name: vhost.name === "/" ? t("common:default") : vhost.name,
              }}
              components={{ strong: <strong /> }}
            />
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-5"
            onKeyDown={handleKeyDown}
          >
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
              name="defaultQueueType"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <VHostTypePreset
                      value={field.value}
                      onChange={field.onChange}
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
                <FormItem className="space-y-2">
                  <div className="flex flex-row items-start gap-3">
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
                  </div>
                  {tracingValue && (
                    <div
                      role="alert"
                      className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning-muted px-3 py-2 text-xs text-warning"
                    >
                      <AlertTriangle
                        className="h-3.5 w-3.5 mt-0.5 shrink-0"
                        aria-hidden
                      />
                      <span>{t("enableTracingWarning")}</span>
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={updateVHostMutation.isPending}
              >
                {t("cancel")}
              </Button>
              <Button
                type="submit"
                disabled={updateVHostMutation.isPending}
                className="btn-primary"
              >
                {updateVHostMutation.isPending ? t("updating") : t("update")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
