export interface AddServerFormData {
  name: string;
  host: string;
  port: number;
  amqpPort: number;
  username: string;
  password: string;
  vhost: string;
  useHttps: boolean;
}

export interface ConnectionStatus {
  status: "idle" | "success" | "error";
  message?: string;
  details?: {
    version?: string;
    cluster_name?: string;
  };
}

export interface Server {
  id: string;
  name: string;
  host: string;
  port: number;
  amqpPort: number;
  username: string;
  vhost: string;
  useHttps: boolean;
}

export interface AddServerFormProps {
  onServerAdded?: () => void;
  onServerUpdated?: () => void;
  trigger?: React.ReactNode;
  server?: Server; // For edit mode
  mode?: "add" | "edit";
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}
