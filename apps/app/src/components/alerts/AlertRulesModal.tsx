import { useState } from "react";
import { useTranslation } from "react-i18next";

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

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alertDialog";
import { Badge } from "@/components/ui/badge";
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

import {
  useAlertRules,
  useCreateAlertRule,
  useDeleteAlertRule,
  useUpdateAlertRule,
} from "@/hooks/queries/useAlerts";

const ALERT_TYPE_KEYS: { value: AlertType; key: string }[] = [
  { value: "QUEUE_DEPTH", key: "rules.type.queueDepth" },
  { value: "MESSAGE_RATE", key: "rules.type.messageRate" },
  { value: "CONSUMER_COUNT", key: "rules.type.consumerCount" },
  { value: "MEMORY_USAGE", key: "rules.type.memoryUsage" },
  { value: "DISK_USAGE", key: "rules.type.diskUsage" },
  { value: "CONNECTION_COUNT", key: "rules.type.connectionCount" },
  { value: "CHANNEL_COUNT", key: "rules.type.channelCount" },
  { value: "NODE_DOWN", key: "rules.type.nodeDown" },
  { value: "EXCHANGE_ERROR", key: "rules.type.exchangeError" },
];

const OPERATOR_KEYS: { value: ComparisonOperator; key: string }[] = [
  { value: "GREATER_THAN", key: "rules.operator.greaterThan" },
  { value: "LESS_THAN", key: "rules.operator.lessThan" },
  { value: "EQUALS", key: "rules.operator.equals" },
  { value: "NOT_EQUALS", key: "rules.operator.notEquals" },
];

const SEVERITY_KEYS: { value: AlertSeverity; key: string }[] = [
  { value: "LOW", key: "rules.severity.low" },
  { value: "MEDIUM", key: "rules.severity.medium" },
  { value: "HIGH", key: "rules.severity.high" },
  { value: "CRITICAL", key: "rules.severity.critical" },
];

interface AlertRuleFormProps {
  rule?: AlertRule;
  onClose: () => void;
  onSuccess: () => void;
}

function AlertRuleForm({ rule, onClose, onSuccess }: AlertRuleFormProps) {
  const { t } = useTranslation("alerts");
  const { selectedServerId } = useServerContext();
  const [formData, setFormData] = useState<CreateAlertRuleInput>({
    name: rule?.name || "",
    description: rule?.description || "",
    type: rule?.type || "QUEUE_DEPTH",
    threshold: rule?.threshold || 0,
    operator: rule?.operator || "GREATER_THAN",
    severity: rule?.severity || "MEDIUM",
    enabled: rule?.enabled ?? true,
    serverId: selectedServerId || "",
  });

  const createMutation = useCreateAlertRule();
  const updateMutation = useUpdateAlertRule();

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedServerId) {
      toast.error(t("rules.toast.selectServer"));
      return;
    }

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
        toast.success(t("rules.toast.updateSuccess"));
      } else {
        const createData: CreateAlertRuleInput = {
          ...formData,
          serverId: selectedServerId,
          description: formData.description || undefined,
        };
        await createMutation.mutateAsync(createData);
        toast.success(t("rules.toast.createSuccess"));
      }
      onSuccess();
      onClose();
    } catch (error) {
      let errorMessage = rule
        ? t("rules.toast.updateError")
        : t("rules.toast.createError");
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
        <Label htmlFor="name">{t("rules.form.name")}</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
          placeholder={t("rules.form.namePlaceholder")}
        />
      </div>

      <div>
        <Label htmlFor="description">{t("rules.form.description")}</Label>
        <Input
          id="description"
          value={formData.description || ""}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
          placeholder={t("rules.form.descriptionPlaceholder")}
        />
      </div>

      <div>
        <Label htmlFor="type">{t("rules.form.alertType")}</Label>
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
            {ALERT_TYPE_KEYS.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {t(type.key)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="operator">{t("rules.form.operator")}</Label>
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
              {OPERATOR_KEYS.map((op) => (
                <SelectItem key={op.value} value={op.value}>
                  {t(op.key)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="threshold">{t("rules.form.threshold")}</Label>
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
        <Label htmlFor="severity">{t("rules.form.severity")}</Label>
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
            {SEVERITY_KEYS.map((sev) => (
              <SelectItem key={sev.value} value={sev.value}>
                {t(sev.key)}
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
        <Label htmlFor="enabled">{t("rules.form.enabled")}</Label>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>
          {t("rules.form.cancel")}
        </Button>
        <Button type="submit" disabled={isSubmitting} className="btn-primary">
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t("rules.form.saving")}
            </>
          ) : rule ? (
            t("rules.form.updateRule")
          ) : (
            t("rules.form.createRule")
          )}
        </Button>
      </div>
    </form>
  );
}

interface AlertRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AlertRulesModal({ isOpen, onClose }: AlertRulesModalProps) {
  const { t } = useTranslation("alerts");
  const { selectedServerId } = useServerContext();
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState<AlertRule | null>(null);

  const { data: alertRules, isLoading } = useAlertRules();
  const deleteMutation = useDeleteAlertRule();

  const handleDeleteClick = (rule: AlertRule) => {
    setRuleToDelete(rule);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!ruleToDelete) return;

    try {
      await deleteMutation.mutateAsync({ id: ruleToDelete.id });
      toast.success(t("rules.toast.deleteSuccess"));
      setShowDeleteConfirm(false);
      setRuleToDelete(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("rules.toast.deleteError")
      );
    }
  };

  const handleEdit = (rule: AlertRule) => {
    setEditingRule(rule);
    setShowFormModal(true);
  };

  const handleCreate = () => {
    setEditingRule(null);
    setShowFormModal(true);
  };

  const handleFormSuccess = () => {
    setShowFormModal(false);
    setEditingRule(null);
  };

  const getSeverityBadge = (severity: AlertSeverity) => {
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
        {SEVERITY_KEYS.find((s) => s.value === severity)
          ? t(SEVERITY_KEYS.find((s) => s.value === severity)!.key)
          : severity}
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

  const filteredRules =
    alertRules?.filter((rule) => rule.serverId === selectedServerId) || [];

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between pr-12">
              <div>
                <DialogTitle>{t("rules.title")}</DialogTitle>
                <DialogDescription>{t("rules.description")}</DialogDescription>
              </div>
              <Button onClick={handleCreate} className="btn-primary">
                <Plus className="h-4 w-4 mr-2" />
                {t("rules.createRule")}
              </Button>
            </div>
          </DialogHeader>

          <div className="mt-4">
            {isLoading ? (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 mx-auto animate-spin text-muted-foreground" />
                <p className="text-muted-foreground mt-2">
                  {t("rules.loading")}
                </p>
              </div>
            ) : !selectedServerId ? (
              <div className="text-center py-8">
                <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {t("rules.selectServer")}
                </p>
              </div>
            ) : filteredRules.length === 0 ? (
              <div className="text-center py-8">
                <Settings className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  {t("rules.noRules")}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {t("rules.noRulesDescription")}
                </p>
                <Button onClick={handleCreate} className="btn-primary">
                  <Plus className="h-4 w-4 mr-2" />
                  {t("rules.createFirstRule")}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredRules.map((rule) => (
                  <div
                    key={rule.id}
                    className="flex items-start justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium">{rule.name}</h4>
                        {getSeverityBadge(rule.severity)}
                        {rule.enabled ? (
                          <Badge variant="outline" className="text-green-600">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            {t("rules.badge.enabled")}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-gray-500">
                            <XCircle className="h-3 w-3 mr-1" />
                            {t("rules.badge.disabled")}
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
                          <span className="font-medium">
                            {t("rules.detail.type")}
                          </span>{" "}
                          {ALERT_TYPE_KEYS.find((at) => at.value === rule.type)
                            ? t(
                                ALERT_TYPE_KEYS.find(
                                  (at) => at.value === rule.type
                                )!.key
                              )
                            : rule.type}
                        </div>
                        <div>
                          <span className="font-medium">
                            {t("rules.detail.condition")}
                          </span>{" "}
                          {getOperatorSymbol(rule.operator)} {rule.threshold}
                        </div>
                        <div>
                          <span className="font-medium">
                            {t("rules.detail.server")}
                          </span>{" "}
                          {rule.server.name}
                        </div>
                        {rule._count && (
                          <div>
                            <span className="font-medium">
                              {t("rules.detail.activeAlerts")}
                            </span>{" "}
                            {rule._count.alerts}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(rule)}
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteClick(rule)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Form Modal */}
      <Dialog
        open={showFormModal}
        onOpenChange={(open) => {
          if (!open) {
            setShowFormModal(false);
            setEditingRule(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRule ? t("rules.editTitle") : t("rules.createRule")}
            </DialogTitle>
            <DialogDescription>
              {editingRule
                ? t("rules.editDescription")
                : t("rules.createDescription")}
            </DialogDescription>
          </DialogHeader>
          <AlertRuleForm
            rule={editingRule || undefined}
            onClose={() => {
              setShowFormModal(false);
              setEditingRule(null);
            }}
            onSuccess={handleFormSuccess}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("rules.delete.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              <span
                dangerouslySetInnerHTML={{
                  __html: t("rules.delete.confirmation", {
                    name: ruleToDelete?.name,
                    interpolation: { escapeValue: true },
                  }),
                }}
              />
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRuleToDelete(null)}>
              {t("rules.form.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("rules.delete.deleting")}
                </>
              ) : (
                t("rules.delete.delete")
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
