import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Trans, useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";

import { zodResolver } from "@hookform/resolvers/zod";
import { Database } from "lucide-react";
import { toast } from "sonner";

import { VHost } from "@/lib/api/vhostTypes";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import { useUpdateVHost } from "@/hooks/queries/useRabbitMQVHosts";
import { useWorkspace } from "@/hooks/ui/useWorkspace";

import { type EditVHostForm, editVHostSchema } from "@/schemas";

interface EditVHostModalProps {
  isOpen: boolean;
  onClose: () => void;
  serverId: string;
  vhost: VHost;
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
      default_queue_type: (["classic", "quorum", "stream"] as const).includes(
        vhost.default_queue_type as "classic" | "quorum" | "stream"
      )
        ? (vhost.default_queue_type as "classic" | "quorum" | "stream")
        : undefined,
      tracing: vhost.tracing || false,
    },
  });

  const updateVHostMutation = useUpdateVHost();

  // Handle success/error
  useEffect(() => {
    if (updateVHostMutation.isSuccess) {
      queryClient.invalidateQueries({
        queryKey: ["vhost", serverId, vhost.name],
      });
      queryClient.invalidateQueries({ queryKey: ["vhosts", serverId] });
      toast.success(t("updateSuccess"));
      onClose();
    }
    if (updateVHostMutation.isError) {
      toast.error(updateVHostMutation.error?.message || t("updateError"));
    }
  }, [
    updateVHostMutation.isSuccess,
    updateVHostMutation.isError,
    updateVHostMutation.error,
  ]);

  const onSubmit = (data: EditVHostForm) => {
    if (!workspace?.id) {
      toast.error(t("workspaceRequired"));
      return;
    }
    updateVHostMutation.mutate({
      serverId,
      workspaceId: workspace.id,
      vhostName: vhost.name,
      ...data,
    });
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            {t("editVhost")}
          </DialogTitle>
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
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
              name="default_queue_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("defaultQueueType")}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("serverDefault")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="classic">
                        {t("queueTypeClassic")}
                      </SelectItem>
                      <SelectItem value="quorum">
                        {t("queueTypeQuorum")}
                      </SelectItem>
                      <SelectItem value="stream">
                        {t("queueTypeStream")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {t("defaultQueueTypeDescription")}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tracing"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>{t("enableTracing")}</FormLabel>
                    <FormDescription>
                      {t("enableTracingDescription")}
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            <DialogFooter>
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
                className="btn-primary text-white"
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
