import type { GateErrorPayload } from "@/lib/feature-gate/types";

export interface ConnectionStatus {
  status: "idle" | "success" | "error";
  message?: string;
  /**
   * Structured gate payload extracted from the thrown error at the catch
   * boundary via `readGateError`. Storing the narrow shape (instead of
   * the raw `unknown`) keeps `TRPCClientError` cause chains and request
   * payloads from being retained on form state and serialised by
   * downstream loggers.
   */
  gate?: GateErrorPayload;
  details?: {
    version?: string;
    cluster_name?: string;
  };
}

interface Server {
  id: string;
  name: string;
  host: string;
  port: number;
  amqpPort: number;
  username: string;
  vhost: string;
  useHttps: boolean;
  /**
   * Free-text environment tag (`prod`, `staging`, `dev`, …) consumed
   * by the RBAC Phase 3 `server.environment` resource-scope predicate.
   * Nullable — empty means "no environment tag set".
   */
  environment?: string | null;
}

export interface AddServerFormProps {
  onServerAdded?: () => void;
  onServerUpdated?: () => void;
  trigger?: React.ReactNode;
  server?: Server; // For edit mode
  mode?: "add" | "edit";
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  isFirstServer?: boolean;
}
