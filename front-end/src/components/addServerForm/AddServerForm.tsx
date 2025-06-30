import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import logger from "@/lib/logger";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2, Plus, Server, Edit } from "lucide-react";
import { apiClient } from "@/lib/api";
import { useServerContext } from "@/contexts/ServerContext";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/hooks/useApi";
import { addServerSchema, type AddServerFormData } from "@/schemas/forms";

import { ServerDetails } from "./ServerDetails";
import { Credentials } from "./Credentials";
import { SSLConfiguration } from "./SSLConfiguration";
import { ConnectionStatusDisplay } from "./ConnectionStatusDisplay";
import { TestConnectionButton } from "./TestConnectionButton";
import { RabbitMqVersionInfo } from "./RabbitMqVersionInfo";
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
  const { setSelectedServerId } = useServerContext();
  const queryClient = useQueryClient();
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
      username: server?.username || "guest",
      password: "", // Don't prefill password for security
      vhost: server?.vhost || "/",
      sslConfig: server?.sslConfig || {
        enabled: false,
        verifyPeer: true,
        caCertPath: "",
        clientCertPath: "",
        clientKeyPath: "",
      },
    },
  });

  // Reset form when server changes (for edit mode)
  useEffect(() => {
    if (mode === "edit" && server) {
      form.reset({
        name: server.name,
        host: server.host,
        port: server.port,
        username: server.username,
        password: "",
        vhost: server.vhost,
        sslConfig: server.sslConfig || {
          enabled: false,
          verifyPeer: true,
          caCertPath: "",
          clientCertPath: "",
          clientKeyPath: "",
        },
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
      const result = await apiClient.testConnection({
        host: formData.host,
        port: formData.port,
        username: formData.username,
        password: formData.password,
        vhost: formData.vhost,
        sslConfig: {
          enabled: formData.sslConfig.enabled || false,
          verifyPeer: formData.sslConfig.verifyPeer || true,
          caCertPath: formData.sslConfig.caCertPath || "",
          clientCertPath: formData.sslConfig.clientCertPath || "",
          clientKeyPath: formData.sslConfig.clientKeyPath || "",
        },
      });

      if (result.success) {
        setConnectionStatus({
          status: "success",
          message: "Connection successful!",
          details: {
            version: result.version,
            cluster_name: result.cluster_name,
          },
        });
      } else {
        setConnectionStatus({
          status: "error",
          message: result.message || "Connection failed",
        });
      }
    } catch (error) {
      setConnectionStatus({
        status: "error",
        message:
          error instanceof Error ? error.message : "Connection test failed",
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const onSubmit = async (data: AddServerFormData) => {
    setIsLoading(true);

    try {
      if (mode === "edit" && server) {
        // Update existing server
        const result = await apiClient.updateServer(server.id, {
          name: data.name,
          host: data.host,
          port: data.port,
          username: data.username,
          password: data.password,
          vhost: data.vhost,
          sslConfig: {
            enabled: data.sslConfig.enabled || false,
            verifyPeer: data.sslConfig.verifyPeer || true,
            caCertPath: data.sslConfig.caCertPath || "",
            clientCertPath: data.sslConfig.clientCertPath || "",
            clientKeyPath: data.sslConfig.clientKeyPath || "",
          },
        });

        // Invalidate servers query to refresh the server list
        queryClient.invalidateQueries({ queryKey: queryKeys.servers });

        // Close dialog
        setIsOpen(false);

        // Notify parent component
        onServerUpdated?.();
      } else {
        // Create new server
        const result = await apiClient.createServer({
          name: data.name,
          host: data.host,
          port: data.port,
          username: data.username,
          password: data.password,
          vhost: data.vhost,
          sslConfig: {
            enabled: data.sslConfig.enabled || false,
            verifyPeer: data.sslConfig.verifyPeer || true,
            caCertPath: data.sslConfig.caCertPath || "",
            clientCertPath: data.sslConfig.clientCertPath || "",
            clientKeyPath: data.sslConfig.clientKeyPath || "",
          },
        });

        // Set this as the selected server (only for new servers)
        setSelectedServerId(result.server.id);

        // Invalidate servers query to refresh the server list
        queryClient.invalidateQueries({ queryKey: queryKeys.servers });

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
              ? "Failed to update server"
              : "Failed to create server",
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
            <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Add Server
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[700px] lg:max-w-[800px] max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            {mode === "edit" ? (
              <>
                <Edit className="h-5 w-5" />
                Edit RabbitMQ Server
              </>
            ) : (
              <>
                <Server className="h-5 w-5" />
                Add RabbitMQ Server
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {mode === "edit"
              ? "Update the connection details for your RabbitMQ server."
              : "Connect to your RabbitMQ server by providing the connection details below."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <RabbitMqVersionInfo />

              <ServerDetails form={form} />

              <Credentials form={form} />

              {/* SSL Configuration */}
              <SSLConfiguration form={form} />

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

        <DialogFooter className="flex gap-2 flex-shrink-0">
          <TestConnectionButton
            onTestConnection={testConnection}
            isTestingConnection={isTestingConnection}
            isLoading={isLoading}
          />
          <Button
            type="submit"
            onClick={form.handleSubmit(onSubmit)}
            disabled={isLoading || isTestingConnection}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : mode === "edit" ? (
              <Edit className="h-4 w-4 mr-2" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            {mode === "edit" ? "Update Server" : "Add Server"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
