import { useState } from "react";

import {
  AlertTriangle,
  CheckCircle,
  Loader2,
  Plus,
  Settings,
  Trash2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import type {
  AlertRule,
  AlertSeverity,
  AlertType,
  ComparisonOperator,
  CreateAlertRuleInput,
  UpdateAlertRuleInput,
} from "@/lib/api/alertTypes";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

import {
  useAlertRules,
  useCreateAlertRule,
  useDeleteAlertRule,
  useUpdateAlertRule,
} from "@/hooks/queries/useAlerts";

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

const SEVERITIES: { value: AlertSeverity; label: string; color: string }[] = [
  { value: "LOW", label: "Low", color: "bg-blue-500" },
  { value: "MEDIUM", label: "Medium", color: "bg-yellow-500" },
  { value: "HIGH", label: "High", color: "bg-orange-500" },
  { value: "CRITICAL", label: "Critical", color: "bg-red-500" },
];

interface AlertRuleFormProps {
  rule?: AlertRule;
  serverId: string;
  onClose: () => void;
  onSuccess: () => void;
}

function AlertRuleForm({
  rule,
  serverId,
  onClose,
  onSuccess,
}: AlertRuleFormProps) {
  const [formData, setFormData] = useState<CreateAlertRuleInput>({
    name: rule?.name || "",
    description: rule?.description || "",
    type: rule?.type || "QUEUE_DEPTH",
    threshold: rule?.threshold || 0,
    operator: rule?.operator || "GREATER_THAN",
    severity: rule?.severity || "MEDIUM",
    enabled: rule?.enabled ?? true,
    serverId: serverId,
  });

  const createMutation = useCreateAlertRule();
  const updateMutation = useUpdateAlertRule();

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (rule) {
        const updateData: UpdateAlertRuleInput = {
          name: formData.name,
          description: formData.description || undefined,
          type: formData.type,
          threshold: formData.threshold,
          operator: formData.operator,
          severity: formData.severity,
          enabled: formData.enabled,
        };
        await updateMutation.mutateAsync({ id: rule.id, ...updateData });
        toast.success("Alert rule updated successfully");
      } else {
        const createData: CreateAlertRuleInput = {
          ...formData,
          description: formData.description || undefined,
        };
        await createMutation.mutateAsync(createData);
        toast.success("Alert rule created successfully");
      }
      onSuccess();
      onClose();
    } catch (error) {
      let errorMessage = "Failed to save alert rule";
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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Name *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
        <Button type="submit" disabled={isSubmitting} className="btn-primary">
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : rule ? (
            "Update Rule"
          ) : (
            "Create Rule"
          )}
        </Button>
      </div>
    </form>
  );
}

export function AlertRulesManager() {
  const { selectedServerId } = useServerContext();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null);

  const { data: alertRules, isLoading } = useAlertRules();
  const deleteMutation = useDeleteAlertRule();

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this alert rule?")) {
      return;
    }

    try {
      await deleteMutation.mutateAsync({ id });
      toast.success("Alert rule deleted successfully");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete alert rule"
      );
    }
  };

  const getSeverityBadge = (severity: AlertSeverity) => {
    const sev = SEVERITIES.find((s) => s.value === severity);
    return (
      <Badge
        variant={
          severity === "CRITICAL"
            ? "destructive"
            : severity === "HIGH"
              ? "default"
              : "secondary"
        }
      >
        {sev?.label || severity}
      </Badge>
    );
  };

  const getOperatorSymbol = (operator: ComparisonOperator) => {
    switch (operator) {
      case "GREATER_THAN":
        return ">";
      case "LESS_THAN":
        return "<";
      case "EQUALS":
        return "=";
      case "NOT_EQUALS":
        return "≠";
      default:
        return operator;
    }
  };

  if (!selectedServerId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Alert Rules</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Please select a server to manage alert rules
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Alert Rules
            </CardTitle>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Rule
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 mx-auto animate-spin text-muted-foreground" />
              <p className="text-muted-foreground mt-2">
                Loading alert rules...
              </p>
            </div>
          ) : !alertRules || alertRules.length === 0 ? (
            <div className="text-center py-8">
              <Settings className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Alert Rules</h3>
              <p className="text-muted-foreground mb-4">
                Create custom alert rules to monitor specific metrics
              </p>
              <Button
                onClick={() => setShowCreateModal(true)}
                className="btn-primary"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Rule
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {alertRules
                .filter((rule) => rule.serverId === selectedServerId)
                .map((rule) => (
                  <div
                    key={rule.id}
                    className="flex items-start justify-between p-4 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium">{rule.name}</h4>
                        {getSeverityBadge(rule.severity)}
                        {rule.enabled ? (
                          <Badge variant="outline" className="text-green-600">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Enabled
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-gray-500">
                            <XCircle className="h-3 w-3 mr-1" />
                            Disabled
                          </Badge>
                        )}
                      </div>
                      {rule.description && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {rule.description}
                        </p>
                      )}
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div>
                          <span className="font-medium">Type:</span>{" "}
                          {ALERT_TYPES.find((t) => t.value === rule.type)
                            ?.label || rule.type}
                        </div>
                        <div>
                          <span className="font-medium">Condition:</span>{" "}
                          {getOperatorSymbol(rule.operator)} {rule.threshold}
                        </div>
                        {rule._count && (
                          <div>
                            <span className="font-medium">Active Alerts:</span>{" "}
                            {rule._count.alerts}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingRule(rule)}
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(rule.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Modal */}
      <Dialog
        open={showCreateModal || editingRule !== null}
        onOpenChange={(open) => {
          if (!open) {
            setShowCreateModal(false);
            setEditingRule(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRule ? "Edit Alert Rule" : "Create Alert Rule"}
            </DialogTitle>
            <DialogDescription>
              {editingRule
                ? "Update your custom alert rule configuration"
                : "Create a custom alert rule to monitor specific RabbitMQ metrics"}
            </DialogDescription>
          </DialogHeader>
          <AlertRuleForm
            rule={editingRule || undefined}
            serverId={selectedServerId}
            onClose={() => {
              setShowCreateModal(false);
              setEditingRule(null);
            }}
            onSuccess={() => {
              setShowCreateModal(false);
              setEditingRule(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
