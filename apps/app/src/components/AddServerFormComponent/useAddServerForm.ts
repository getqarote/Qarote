import { useCallback, useEffect, useState } from "react";

import { trpc } from "@/lib/trpc/client";

import { useWorkspace } from "@/hooks/ui/useWorkspace";

import type { AddServerFormData, ConnectionStatus, Server } from "./types";

interface UseAddServerFormProps {
  server?: Server;
  mode?: "add" | "edit";
}

export const useAddServerForm = ({
  server,
  mode = "add",
}: UseAddServerFormProps = {}) => {
  const { workspace } = useWorkspace();
  const testConnectionMutation = trpc.rabbitmq.server.testConnection.useMutation();
  const getInitialFormData = useCallback((): AddServerFormData => {
    if (mode === "edit" && server) {
      return {
        name: server.name,
        host: server.host,
        port: server.port,
        amqpPort: server.amqpPort,
        username: server.username,
        password: "", // Don't prefill password for security
        vhost: server.vhost,
        useHttps: server.useHttps,
      };
    }

    return {
      name: "",
      host: "",
      port: 15672, // RabbitMQ Management Plugin default port
      amqpPort: 5672,
      username: "guest",
      password: "guest",
      vhost: "/",
      useHttps: false,
    };
  }, [mode, server]);

  const [formData, setFormData] =
    useState<AddServerFormData>(getInitialFormData());

  const [errors, setErrors] = useState<
    Partial<Record<keyof AddServerFormData, string>>
  >({});

  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    status: "idle",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  // Update form data when server prop changes (for edit mode)
  useEffect(() => {
    if (mode === "edit" && server) {
      setFormData(getInitialFormData());
      setErrors({});
      setConnectionStatus({ status: "idle" });
    }
  }, [server, mode, getInitialFormData]);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof AddServerFormData, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Server name is required";
    }
    if (!formData.host.trim()) {
      newErrors.host = "Host is required";
    }
    if (!formData.port || formData.port <= 0) {
      newErrors.port = "Valid port number is required";
    }
    if (!formData.username.trim()) {
      newErrors.username = "Username is required";
    }
    if (!formData.password.trim()) {
      newErrors.password = "Password is required";
    }
    if (!formData.vhost.trim()) {
      newErrors.vhost = "Virtual host is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (
    field: keyof AddServerFormData,
    value: string | number
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
    // Reset connection status when form changes
    if (connectionStatus.status !== "idle") {
      setConnectionStatus({ status: "idle" });
    }
  };

  const testConnection = async () => {
    if (!validateForm()) return;

    setIsTestingConnection(true);
    setConnectionStatus({ status: "idle" });

    try {
      if (!workspace?.id) {
        throw new Error("Workspace ID is required");
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

  const resetForm = () => {
    setFormData(getInitialFormData());
    setErrors({});
    setConnectionStatus({ status: "idle" });
  };

  return {
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
    testConnection,
    resetForm,
    mode,
    server,
  };
};
