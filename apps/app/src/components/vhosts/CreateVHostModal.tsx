import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";

import { zodResolver } from "@hookform/resolvers/zod";
import { Database } from "lucide-react";
import { toast } from "sonner";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

export function CreateVHostModal({
  isOpen,
  onClose,
  serverId,
  initialName = "",
  onSuccess,
}: CreateVHostModalProps) {
  const { t } = useTranslation("vhosts");
  const queryClient = useQueryClient();
  const { workspace } = useWorkspace();

  const form = useForm<CreateVHostForm>({
    resolver: zodResolver(createVHostSchema),
    defaultValues: {
      name: initialName,
      description: "",
      tracing: false,
    },
  });

  // Update form when initialName changes
  useEffect(() => {
    if (initialName) {
      form.setValue("name", initialName);
    }
  }, [initialName, form]);

  const createVHostMutation = useCreateVHost();

  // Handle success/error
  useEffect(() => {
    if (createVHostMutation.isSuccess) {
      queryClient.invalidateQueries({ queryKey: ["vhosts", serverId] });
      toast.success(t("createSuccess"));
      form.reset();
      onSuccess?.();
      onClose();
    }
    if (createVHostMutation.isError) {
      toast.error(createVHostMutation.error?.message || t("createError"));
    }
  }, [
    createVHostMutation.isSuccess,
    createVHostMutation.isError,
    createVHostMutation.error,
  ]);

  const onSubmit = (data: CreateVHostForm) => {
    if (!workspace?.id) {
      toast.error(t("workspaceRequired"));
      return;
    }
    createVHostMutation.mutate({
      serverId,
      workspaceId: workspace.id,
      name: data.name,
      description: data.description,
      default_queue_type: data.default_queue_type,
      tracing: data.tracing,
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
            {t("createVhost")}
          </DialogTitle>
          <DialogDescription>{t("createVhostDescription")}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("name")}</FormLabel>
                  <FormControl>
                    <Input placeholder={t("namePlaceholder")} {...field} />
                  </FormControl>
                  <FormDescription>{t("nameDescription")}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("descriptionOptional")}</FormLabel>
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
                  <FormLabel>{t("defaultQueueTypeOptional")}</FormLabel>
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
                disabled={createVHostMutation.isPending}
              >
                {t("cancel")}
              </Button>
              <Button
                type="submit"
                disabled={createVHostMutation.isPending}
                className="btn-primary text-white"
              >
                {createVHostMutation.isPending ? t("creating") : t("create")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
