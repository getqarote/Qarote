import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { zodResolver } from "@hookform/resolvers/zod";
import { Edit, Loader2, Server } from "lucide-react";

import { logger } from "@/lib/logger";

import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";

import { useServerContext } from "@/contexts/ServerContext";

import {
  useCreateServer,
  useTestConnection,
  useUpdateServer,
} from "@/hooks/queries/useServer";
import { useUser } from "@/hooks/ui/useUser";
import { useWorkspace } from "@/hooks/ui/useWorkspace";

import { type AddServerFormData, addServerSchema } from "@/schemas";

import { ConnectionStatusDisplay } from "./ConnectionStatusDisplay";
import { Credentials } from "./Credentials";
import { RabbitMqVersionInfo } from "./RabbitMqVersionInfo";
import { ServerDetails } from "./ServerDetails";
import { TestConnectionButton } from "./TestConnectionButton";
import { TunnelHelper } from "./TunnelHelper";
import type { AddServerFormProps, ConnectionStatus } from "./types";

export const AddServerForm = ({
  onServerAdded,
  onServerUpdated,
  trigger,
  server,
  mode = "add",
  isOpen: controlledIsOpen,
  onOpenChange: controlledOnOpenChange,
}: AddServerFormProps) => {
  const { t } = useTranslation("dashboard");
  const { setSelectedServerId } = useServerContext();
  const { refetchPlan } = useUser();
  const { workspace } = useWorkspace();
  const createServerMutation = useCreateServer();
  const updateServerMutation = useUpdateServer();
  const testConnectionMutation = useTestConnection();
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    status: "idle",
  });

  // Use controlled or internal state for dialog open state
  const isOpen =
    controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  const setIsOpen = controlledOnOpenChange || setInternalIsOpen;

  // Initialize form with react-hook-form
  const form = useForm<AddServerFormData>({
    resolver: zodResolver(addServerSchema),
    defaultValues: {
      name: server?.name || "",
      host: server?.host || "",
      port: server?.port || 15672,
      amqpPort: server?.amqpPort || 5672,
      username: server?.username || "guest",
      password: "", // Don't prefill password for security
      vhost: server?.vhost || "/",
      useHttps: server?.useHttps || false,
    },
  });

  // Reset form when server changes (for edit mode)
  useEffect(() => {
    if (mode === "edit" && server) {
      form.reset({
        name: server.name,
        host: server.host,
        port: server.port,
        amqpPort: server.amqpPort,
        username: server.username,
        password: "",
        vhost: server.vhost,
        useHttps: server.useHttps || false,
      });
      setConnectionStatus({ status: "idle" });
    }
  }, [server, mode, form]);

  const testConnection = async () => {
    const isValid = await form.trigger();
    if (!isValid) return;

    const formData = form.getValues();
    setIsTestingConnection(true);
    setConnectionStatus({ status: "idle" });

    try {
      if (!workspace?.id) {
        throw new Error(t("workspaceIdRequired"));
      }
      const result = await testConnectionMutation.mutateAsync({
        workspaceId: workspace.id,
        host: formData.host,
        port: formData.port,
        amqpPort: formData.amqpPort,
        username: formData.username,
        password: formData.password,
        vhost: formData.vhost,
        useHttps: formData.useHttps,
      });

      if (result.success) {
        setConnectionStatus({
          status: "success",
          message: t("connectionSuccessful"),
          details: {
            version: result.version,
            cluster_name: result.cluster_name,
          },
        });
      } else {
        setConnectionStatus({
          status: "error",
          message: result.message || t("connectionFailed"),
        });
      }
    } catch (error) {
      setConnectionStatus({
        status: "error",
        message:
          error instanceof Error ? error.message : t("connectionTestFailed"),
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const onSubmit = async (data: AddServerFormData) => {
    setIsLoading(true);

    try {
      if (!workspace?.id) {
        throw new Error(t("workspaceIdRequired"));
      }
      if (mode === "edit" && server) {
        // Update existing server
        await updateServerMutation.mutateAsync({
          workspaceId: workspace.id,
          id: server.id,
          name: data.name,
          host: data.host,
          port: data.port,
          amqpPort: data.amqpPort,
          username: data.username,
          password: data.password,
          vhost: data.vhost,
          useHttps: data.useHttps,
        });

        // Close dialog
        setIsOpen(false);

        // Notify parent component
        onServerUpdated?.();
      } else {
        // Create new server
        const result = await createServerMutation.mutateAsync({
          workspaceId: workspace.id,
          name: data.name,
          host: data.host,
          port: data.port,
          amqpPort: data.amqpPort,
          username: data.username,
          password: data.password,
          vhost: data.vhost,
          useHttps: data.useHttps,
        });

        // Set this as the selected server (only for new servers)
        setSelectedServerId(result.server.id);

        // Refresh user plan data to update server limits
        await refetchPlan();

        // Close dialog
        setIsOpen(false);

        // Notify parent component
        onServerAdded?.();
      }

      // Reset form and status
      form.reset();
      setConnectionStatus({ status: "idle" });
    } catch (error) {
      setConnectionStatus({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : mode === "edit"
              ? t("failedToUpdateServer")
              : t("failedToCreateServer"),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    form.reset();
    setConnectionStatus({ status: "idle" });
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) {
          resetForm();
        }
      }}
    >
      {/* Only render trigger if not in controlled mode */}
      {controlledIsOpen === undefined && (
        <DialogTrigger asChild>
          {trigger || (
            <Button className="btn-primary rounded-none">
              {t("addServer")}
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[700px] lg:max-w-[800px] max-h-[90vh] flex flex-col bg-card">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            {mode === "edit" ? (
              <>
                <Edit className="h-5 w-5" />
                {t("editRabbitMQServer")}
              </>
            ) : (
              <>
                <Server className="h-5 w-5" />
                {t("addRabbitMQServer")}
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {mode === "edit"
              ? t("editServerFormDescription")
              : t("addServerFormDescription")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 pb-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <RabbitMqVersionInfo />

              <ServerDetails form={form} mode={mode} />

              <TunnelHelper form={form} />

              <Credentials form={form} />

              <ConnectionStatusDisplay
                connectionStatus={connectionStatus}
                onUpgrade={() => {
                  // Navigate to upgrade page or show upgrade modal
                  // For now, we'll just log - this can be enhanced later
                  logger.info("Upgrade plan requested");
                }}
              />
            </form>
          </Form>
        </div>

        <DialogFooter className="flex gap-2 shrink-0 pt-6 border-t border-border">
          <TestConnectionButton
            onTestConnection={testConnection}
            isTestingConnection={isTestingConnection}
            isLoading={isLoading}
          />
          <Button
            type="submit"
            onClick={form.handleSubmit(onSubmit)}
            disabled={isLoading || isTestingConnection}
            className="btn-primary rounded-none"
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {mode === "edit" ? t("updateServer") : t("addServer")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
