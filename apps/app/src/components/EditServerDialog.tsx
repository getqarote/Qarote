import { useEffect, useState } from "react";

import { Loader2, Save, TestTube } from "lucide-react";
import { toast } from "sonner";

import { Server } from "@/lib/api/types";

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { useTestConnection, useUpdateServer } from "@/hooks/api/useServer";
import { useWorkspace } from "@/hooks/ui/useWorkspace";

interface EditServerDialogProps {
  server: Server;
  isOpen: boolean;
  onClose: () => void;
  onServerUpdated: () => void;
}

interface ServerFormData {
  name: string;
  host: string;
  port: number;
  username: string;
  password: string;
  vhost: string;
  useSSL: boolean;
  managementPort: number;
}

export function EditServerDialog({
  server,
  isOpen,
  onClose,
  onServerUpdated,
}: EditServerDialogProps) {
  const [formData, setFormData] = useState<ServerFormData>({
    name: "",
    host: "",
    port: 5672,
    username: "",
    password: "",
    vhost: "/",
    useSSL: false,
    managementPort: 15672,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [connectionStatus, setConnectionStatus] = useState<{
    success: boolean;
    message: string;
    version?: string;
  } | null>(null);

  const { workspace } = useWorkspace();
  const updateServerMutation = useUpdateServer();
  const testConnectionMutation = useTestConnection();

  // Initialize form data when dialog opens
  useEffect(() => {
    if (isOpen && server) {
      setFormData({
        name: server.name,
        host: server.host,
        port: server.amqpPort,
        username: server.username,
        password: "", // Don't pre-fill password for security
        vhost: server.vhost,
        useSSL: server.useHttps,
        managementPort: server.port,
      });
      setErrors({});
      setConnectionStatus(null);
    }
  }, [isOpen, server]);

  const handleInputChange = (
    field: keyof ServerFormData,
    value: string | number | boolean
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Server name is required";
    }
    if (!formData.host.trim()) {
      newErrors.host = "Host is required";
    }
    if (!formData.port || formData.port < 1 || formData.port > 65535) {
      newErrors.port = "Port must be between 1 and 65535";
    }
    if (!formData.username.trim()) {
      newErrors.username = "Username is required";
    }
    if (!formData.vhost.trim()) {
      newErrors.vhost = "Virtual host is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleTestConnection = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      if (!workspace?.id) {
        throw new Error("Workspace ID is required");
      }
      const result = await testConnectionMutation.mutateAsync({
        workspaceId: workspace.id,
        host: formData.host,
        port: formData.managementPort,
        username: formData.username,
        password: formData.password || "current_password", // Use placeholder since we don't have access to current password
        vhost: formData.vhost,
        useHttps: formData.useSSL,
        amqpPort: formData.port,
      });

      setConnectionStatus(result);

      if (result.success) {
        toast.success("Connection test successful!");
      } else {
        toast.error(`Connection test failed: ${result.message}`);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Connection test failed";
      setConnectionStatus({
        success: false,
        message: errorMessage,
      });
      toast.error(errorMessage);
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      if (!workspace?.id) {
        throw new Error("Workspace ID is required");
      }
      await updateServerMutation.mutateAsync({
        workspaceId: workspace.id,
        id: server.id,
        name: formData.name,
        host: formData.host,
        port: formData.managementPort,
        amqpPort: formData.port,
        username: formData.username,
        password: formData.password || undefined, // Only send password if changed
        vhost: formData.vhost,
        useHttps: formData.useSSL,
      });

      onServerUpdated();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to update server";
      toast.error(errorMessage);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Server</DialogTitle>
          <DialogDescription>
            Update the server configuration. Leave password empty to keep the
            current password.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Server Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Server Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              placeholder="Production RabbitMQ"
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name}</p>
            )}
          </div>

          {/* Host */}
          <div className="space-y-2">
            <Label htmlFor="host">Host</Label>
            <Input
              id="host"
              value={formData.host}
              onChange={(e) => handleInputChange("host", e.target.value)}
              placeholder="localhost"
            />
            {errors.host && (
              <p className="text-sm text-red-500">{errors.host}</p>
            )}
          </div>

          {/* Port and Management Port */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="port">AMQP Port</Label>
              <Input
                id="port"
                type="number"
                value={formData.port}
                onChange={(e) =>
                  handleInputChange("port", parseInt(e.target.value) || 0)
                }
                placeholder="5672"
              />
              {errors.port && (
                <p className="text-sm text-red-500">{errors.port}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="managementPort">Management Port</Label>
              <Input
                id="managementPort"
                type="number"
                value={formData.managementPort}
                onChange={(e) =>
                  handleInputChange(
                    "managementPort",
                    parseInt(e.target.value) || 0
                  )
                }
                placeholder="15672"
              />
            </div>
          </div>

          {/* Credentials */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => handleInputChange("username", e.target.value)}
                placeholder="admin"
              />
              {errors.username && (
                <p className="text-sm text-red-500">{errors.username}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => handleInputChange("password", e.target.value)}
                placeholder="Leave empty to keep current"
              />
            </div>
          </div>

          {/* Virtual Host */}
          <div className="space-y-2">
            <Label htmlFor="vhost">Virtual Host</Label>
            <Input
              id="vhost"
              value={formData.vhost}
              onChange={(e) => handleInputChange("vhost", e.target.value)}
              placeholder="/"
            />
            {errors.vhost && (
              <p className="text-sm text-red-500">{errors.vhost}</p>
            )}
          </div>

          {/* SSL Configuration */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="useSSL"
              checked={formData.useSSL}
              onCheckedChange={(checked) =>
                handleInputChange("useSSL", !!checked)
              }
            />
            <Label htmlFor="useSSL">Enable SSL/TLS</Label>
          </div>

          {/* Connection Status */}
          {connectionStatus && (
            <div
              className={`p-3 rounded-lg ${
                connectionStatus.success
                  ? "bg-green-50 border border-green-200"
                  : "bg-red-50 border border-red-200"
              }`}
            >
              <p
                className={`text-sm font-medium ${
                  connectionStatus.success ? "text-green-800" : "text-red-800"
                }`}
              >
                {connectionStatus.success
                  ? "✅ Connection Successful"
                  : "❌ Connection Failed"}
              </p>
              <p
                className={`text-xs mt-1 ${
                  connectionStatus.success ? "text-green-600" : "text-red-600"
                }`}
              >
                {connectionStatus.message}
              </p>
              {connectionStatus.version && (
                <p className="text-xs text-green-600 mt-1">
                  RabbitMQ Version: {connectionStatus.version}
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleTestConnection}
            disabled={testConnectionMutation.isPending}
          >
            {testConnectionMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <TestTube className="mr-2 h-4 w-4" />
                Test Connection
              </>
            )}
          </Button>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={updateServerMutation.isPending}
          >
            {updateServerMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Update Server
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
