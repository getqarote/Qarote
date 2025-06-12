import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2, Plus, CheckCircle, AlertCircle, Server } from "lucide-react";
import { apiClient } from "@/lib/api";
import { useServerContext } from "@/contexts/ServerContext";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/hooks/useApi";

interface AddServerFormData {
  name: string;
  host: string;
  port: number;
  username: string;
  password: string;
  vhost: string;
}

interface AddServerFormProps {
  onServerAdded?: () => void;
  trigger?: React.ReactNode;
}

export const AddServerForm = ({
  onServerAdded,
  trigger,
}: AddServerFormProps) => {
  const { setSelectedServerId } = useServerContext();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{
    status: "idle" | "success" | "error";
    message?: string;
    details?: { version?: string; cluster_name?: string };
  }>({ status: "idle" });

  const [formData, setFormData] = useState<AddServerFormData>({
    name: "",
    host: "",
    port: 15672,
    username: "guest",
    password: "guest",
    vhost: "/",
  });

  const [errors, setErrors] = useState<
    Partial<Record<keyof AddServerFormData, string>>
  >({});

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
      const result = await apiClient.testConnection({
        host: formData.host,
        port: formData.port,
        username: formData.username,
        password: formData.password,
        vhost: formData.vhost,
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
      }); // Set this as the selected server
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

  const resetForm = () => {
    setFormData({
      name: "",
      host: "",
      port: 15672,
      username: "guest",
      password: "guest",
      vhost: "/",
    });
    setErrors({});
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
      <DialogTrigger asChild>
        {trigger || (
          <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            Add Server
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Add RabbitMQ Server
          </DialogTitle>
          <DialogDescription>
            Connect to your RabbitMQ server by providing the connection details
            below.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Server Name</Label>
              <Input
                id="name"
                placeholder="Production RabbitMQ"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                className={errors.name ? "border-red-500" : ""}
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="host">Host</Label>
              <Input
                id="host"
                placeholder="localhost"
                value={formData.host}
                onChange={(e) => handleInputChange("host", e.target.value)}
                className={errors.host ? "border-red-500" : ""}
              />
              {errors.host && (
                <p className="text-sm text-red-500">{errors.host}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="port">Port</Label>
              <Input
                id="port"
                type="number"
                placeholder="15672"
                value={formData.port}
                onChange={(e) =>
                  handleInputChange("port", parseInt(e.target.value) || 15672)
                }
                className={errors.port ? "border-red-500" : ""}
              />
              {errors.port && (
                <p className="text-sm text-red-500">{errors.port}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="vhost">Virtual Host</Label>
              <Input
                id="vhost"
                placeholder="/"
                value={formData.vhost}
                onChange={(e) => handleInputChange("vhost", e.target.value)}
                className={errors.vhost ? "border-red-500" : ""}
              />
              {errors.vhost && (
                <p className="text-sm text-red-500">{errors.vhost}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                placeholder="guest"
                value={formData.username}
                onChange={(e) => handleInputChange("username", e.target.value)}
                className={errors.username ? "border-red-500" : ""}
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
                placeholder="guest"
                value={formData.password}
                onChange={(e) => handleInputChange("password", e.target.value)}
                className={errors.password ? "border-red-500" : ""}
              />
              {errors.password && (
                <p className="text-sm text-red-500">{errors.password}</p>
              )}
            </div>
          </div>

          {/* Connection Status */}
          {connectionStatus.status !== "idle" && (
            <Alert
              className={
                connectionStatus.status === "success"
                  ? "border-green-500"
                  : "border-red-500"
              }
            >
              {connectionStatus.status === "success" ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
              <AlertDescription>
                {connectionStatus.message}
                {connectionStatus.details && (
                  <div className="mt-2 text-sm text-gray-600">
                    <p>RabbitMQ Version: {connectionStatus.details.version}</p>
                    <p>Cluster: {connectionStatus.details.cluster_name}</p>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          <DialogFooter className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={testConnection}
              disabled={isTestingConnection || isLoading}
            >
              {isTestingConnection ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Test Connection
            </Button>
            <Button
              type="submit"
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
        </form>
      </DialogContent>
    </Dialog>
  );
};
