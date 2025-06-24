import { useState } from "react";
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
import { Loader2, Plus, Server } from "lucide-react";
import { apiClient } from "@/lib/api";
import { useServerContext } from "@/contexts/ServerContext";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/hooks/useApi";

import { ServerDetails } from "./ServerDetails";
import { Credentials } from "./Credentials";
import { SSLConfiguration } from "./SSLConfiguration";
import { ConnectionStatusDisplay } from "./ConnectionStatusDisplay";
import { TestConnectionButton } from "./TestConnectionButton";
import { RabbitMqVersionInfo } from "./RabbitMqVersionInfo";
import { useAddServerForm } from "./useAddServerForm";
import type { AddServerFormProps } from "./types";

export const AddServerForm = ({
  onServerAdded,
  trigger,
}: AddServerFormProps) => {
  const { setSelectedServerId } = useServerContext();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  const {
    formData,
    errors,
    connectionStatus,
    isLoading,
    isTestingConnection,
    setIsLoading,
    setConnectionStatus,
    setFormData,
    setErrors,
    validateForm,
    handleInputChange,
    handleSSLConfigChange,
    testConnection,
    resetForm,
  } = useAddServerForm();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const result = await apiClient.createServer({
        name: formData.name,
        host: formData.host,
        port: formData.port,
        username: formData.username,
        password: formData.password,
        vhost: formData.vhost,
        sslConfig: formData.sslConfig,
      });

      // Set this as the selected server
      setSelectedServerId(result.server.id);

      // Invalidate servers query to refresh the server list
      queryClient.invalidateQueries({ queryKey: queryKeys.servers });

      // Reset form
      setFormData({
        name: "",
        host: "",
        port: 15672,
        username: "guest",
        password: "guest",
        vhost: "/",
        sslConfig: {
          enabled: false,
          verifyPeer: true,
          caCertPath: "",
          clientCertPath: "",
          clientKeyPath: "",
        },
      });
      setConnectionStatus({ status: "idle" });
      setErrors({});

      // Close dialog
      setIsOpen(false);

      // Notify parent component
      onServerAdded?.();
    } catch (error) {
      setConnectionStatus({
        status: "error",
        message:
          error instanceof Error ? error.message : "Failed to create server",
      });
    } finally {
      setIsLoading(false);
    }
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
      <DialogTrigger asChild>
        {trigger || (
          <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            Add Server
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] lg:max-w-[800px] max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Add RabbitMQ Server
          </DialogTitle>
          <DialogDescription>
            Connect to your RabbitMQ server by providing the connection details
            below.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <RabbitMqVersionInfo />

            <ServerDetails
              formData={formData}
              errors={errors}
              onInputChange={handleInputChange}
            />

            <Credentials
              formData={formData}
              errors={errors}
              onInputChange={handleInputChange}
            />

            {/* SSL Configuration */}
            <SSLConfiguration
              sslConfig={formData.sslConfig}
              onSSLConfigChange={handleSSLConfigChange}
            />

            <ConnectionStatusDisplay
              connectionStatus={connectionStatus}
              onUpgrade={() => {
                // Navigate to upgrade page or show upgrade modal
                // For now, we'll just log - this can be enhanced later
                console.log("Upgrade plan requested");
              }}
            />
          </form>
        </div>

        <DialogFooter className="flex gap-2 flex-shrink-0">
          <TestConnectionButton
            onTestConnection={testConnection}
            isTestingConnection={isTestingConnection}
            isLoading={isLoading}
          />
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={isLoading || isTestingConnection}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            Add Server
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
