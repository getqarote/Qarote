import { useState } from "react";

import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import type {
  AlertSeverity,
  AlertType,
  ComparisonOperator,
  CreateAlertRuleInput,
} from "@/lib/api/alertTypes";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

import { useServerContext } from "@/contexts/ServerContext";

import { useCreateAlertRule } from "@/hooks/queries/useAlerts";

const ALERT_TYPES: { value: AlertType; label: string }[] = [
  { value: "QUEUE_DEPTH", label: "Queue Depth" },
  { value: "MESSAGE_RATE", label: "Message Rate" },
  { value: "CONSUMER_COUNT", label: "Consumer Count" },
  { value: "MEMORY_USAGE", label: "Memory Usage" },
  { value: "DISK_USAGE", label: "Disk Usage" },
  { value: "CONNECTION_COUNT", label: "Connection Count" },
  { value: "CHANNEL_COUNT", label: "Channel Count" },
  { value: "NODE_DOWN", label: "Node Down" },
  { value: "EXCHANGE_ERROR", label: "Exchange Error" },
];

const OPERATORS: { value: ComparisonOperator; label: string }[] = [
  { value: "GREATER_THAN", label: "Greater Than" },
  { value: "LESS_THAN", label: "Less Than" },
  { value: "EQUALS", label: "Equals" },
  { value: "NOT_EQUALS", label: "Not Equals" },
];

const SEVERITIES: { value: AlertSeverity; label: string }[] = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "CRITICAL", label: "Critical" },
];

interface CreateAlertRuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CreateAlertRuleModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateAlertRuleModalProps) {
  const { selectedServerId } = useServerContext();
  const [formData, setFormData] = useState<CreateAlertRuleInput>({
    name: "",
    description: "",
    type: "QUEUE_DEPTH",
    threshold: 0,
    operator: "GREATER_THAN",
    severity: "MEDIUM",
    enabled: true,
    serverId: selectedServerId || "",
  });

  const createMutation = useCreateAlertRule();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedServerId) {
      toast.error("Please select a server first");
      return;
    }

    try {
      const createData: CreateAlertRuleInput = {
        ...formData,
        serverId: selectedServerId,
        description: formData.description || undefined,
      };
      await createMutation.mutateAsync(createData);
      toast.success("Alert rule created successfully");
      onSuccess?.();
      onClose();
      // Reset form
      setFormData({
        name: "",
        description: "",
        type: "QUEUE_DEPTH",
        threshold: 0,
        operator: "GREATER_THAN",
        severity: "MEDIUM",
        enabled: true,
        serverId: selectedServerId,
      });
    } catch (error) {
      let errorMessage = "Failed to create alert rule";
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === "object" && error !== null) {
        const err = error as Record<string, unknown>;
        errorMessage =
          (err.message as string) ||
          (err.error as string) ||
          JSON.stringify(err);
      }
      toast.error(errorMessage);
    }
  };

  if (!selectedServerId) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Alert Rule</DialogTitle>
          <DialogDescription>
            Create a custom alert rule to monitor specific RabbitMQ metrics
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
              placeholder="e.g., High Queue Depth Alert"
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={formData.description || ""}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Optional description"
            />
          </div>

          <div>
            <Label htmlFor="type">Alert Type *</Label>
            <Select
              value={formData.type}
              onValueChange={(value) =>
                setFormData({ ...formData, type: value as AlertType })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALERT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="operator">Operator *</Label>
              <Select
                value={formData.operator}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    operator: value as ComparisonOperator,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OPERATORS.map((op) => (
                    <SelectItem key={op.value} value={op.value}>
                      {op.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="threshold">Threshold *</Label>
              <Input
                id="threshold"
                type="number"
                min="0"
                step="0.01"
                value={formData.threshold}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    threshold: parseFloat(e.target.value) || 0,
                  })
                }
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="severity">Severity *</Label>
            <Select
              value={formData.severity}
              onValueChange={(value) =>
                setFormData({ ...formData, severity: value as AlertSeverity })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SEVERITIES.map((sev) => (
                  <SelectItem key={sev.value} value={sev.value}>
                    {sev.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="enabled"
              checked={formData.enabled}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, enabled: checked })
              }
            />
            <Label htmlFor="enabled">Enabled</Label>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending}
              className="btn-primary"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Rule
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
