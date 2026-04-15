import { useState } from "react";
import { useForm } from "react-hook-form";
import { Trans, useTranslation } from "react-i18next";

import { zodResolver } from "@hookform/resolvers/zod";
import { Bell, Info, Loader2, Pencil, Search, Trash2 } from "lucide-react";
import { AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";

import type {
  AlertRule,
  AlertSeverity,
  AlertType,
  ComparisonOperator,
  UpdateAlertRuleInput,
} from "@/lib/api/alertTypes";
import { cn } from "@/lib/utils";

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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { useServerContext } from "@/contexts/ServerContext";

import {
  useAlertRules,
  useCreateAlertRule,
  useDeleteAlertRule,
  useUpdateAlertRule,
} from "@/hooks/queries/useAlerts";

import {
  ALERT_PERCENTAGE_TYPES,
  type AlertRuleFormValues,
  alertRuleSchema,
} from "@/schemas";

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

const SEVERITY_DOT: Record<string, string> = {
  LOW: "bg-blue-500",
  MEDIUM: "bg-yellow-500",
  HIGH: "bg-orange-500",
  CRITICAL: "bg-red-500",
};

const SEVERITY_BADGE: Record<string, string> = {
  LOW: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300",
  MEDIUM:
    "border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-300",
  HIGH: "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-300",
  CRITICAL:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300",
};

const SEVERITY_BORDER: Record<string, string> = {
  LOW: "border-l-blue-500",
  MEDIUM: "border-l-yellow-500",
  HIGH: "border-l-orange-500",
  CRITICAL: "border-l-red-500",
};

function getThresholdHintKey(type: AlertType): string {
  if ((ALERT_PERCENTAGE_TYPES as Set<string>).has(type))
    return "rules.form.thresholdHintPercent";
  if (type === "MESSAGE_RATE") return "rules.form.thresholdHintMsgRate";
  if (type === "NODE_DOWN") return "rules.form.thresholdHintNodeDown";
  return "rules.form.thresholdHintCount";
}

function getOperatorSymbol(operator: ComparisonOperator): string {
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
}

function formatCondition(rule: AlertRule): string {
  const symbol = getOperatorSymbol(rule.operator);
  const isPercent = (ALERT_PERCENTAGE_TYPES as Set<string>).has(rule.type);
  return `${symbol} ${rule.threshold}${isPercent ? "%" : ""}`;
}

// ---------------------------------------------------------------------------
// AlertRuleForm
// ---------------------------------------------------------------------------

interface AlertRuleFormProps {
  rule?: AlertRule;
  onClose: () => void;
  onSuccess: () => void;
}

function AlertRuleForm({ rule, onClose, onSuccess }: AlertRuleFormProps) {
  const { t } = useTranslation("alerts");
  const { selectedServerId } = useServerContext();

  const isDefault = rule?.isDefault ?? false;

  const form = useForm<AlertRuleFormValues>({
    resolver: zodResolver(alertRuleSchema),
    defaultValues: {
      name: rule?.name ?? "",
      description: rule?.description ?? "",
      type: rule?.type ?? "QUEUE_DEPTH",
      threshold: rule?.threshold ?? 0,
      operator: rule?.operator ?? "GREATER_THAN",
      severity: rule?.severity ?? "MEDIUM",
      enabled: rule?.enabled ?? true,
    },
  });

  const createMutation = useCreateAlertRule();
  const updateMutation = useUpdateAlertRule();
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const watchedType = form.watch("type");

  const onSubmit = async (data: AlertRuleFormValues) => {
    if (!selectedServerId) {
      toast.error(t("rules.toast.selectServer"));
      return;
    }

    try {
      if (rule) {
        const updateData: UpdateAlertRuleInput = isDefault
          ? {
              threshold: data.threshold,
              severity: data.severity,
              enabled: data.enabled,
            }
          : {
              name: data.name,
              description: data.description || undefined,
              type: data.type,
              threshold: data.threshold,
              operator: data.operator,
              severity: data.severity,
              enabled: data.enabled,
            };
        await updateMutation.mutateAsync({ id: rule.id, ...updateData });
        toast.success(t("rules.toast.updateSuccess"));
      } else {
        await createMutation.mutateAsync({
          name: data.name,
          description: data.description || undefined,
          type: data.type,
          threshold: data.threshold,
          operator: data.operator,
          severity: data.severity,
          enabled: data.enabled,
          serverId: selectedServerId,
        });
        toast.success(t("rules.toast.createSuccess"));
      }
      onSuccess();
      onClose();
    } catch (error) {
      let message = rule
        ? t("rules.toast.updateError")
        : t("rules.toast.createError");
      if (error instanceof Error) {
        message = error.message;
      } else if (typeof error === "object" && error !== null) {
        const err = error as Record<string, unknown>;
        message =
          (err.message as string) ||
          (err.error as string) ||
          JSON.stringify(err);
      }
      toast.error(message);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      form.handleSubmit(onSubmit)();
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-4"
        onKeyDown={handleKeyDown}
      >
        {isDefault && (
          <div className="flex items-start gap-2 rounded-md border border-border bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground">
            <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" aria-hidden />
            <span>{t("rules.form.isDefaultNote")}</span>
          </div>
        )}

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("rules.form.name")}</FormLabel>
              <FormControl>
                <Input
                  placeholder={t("rules.form.namePlaceholder")}
                  disabled={isDefault}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("rules.form.description")}</FormLabel>
              <FormControl>
                <Textarea
                  placeholder={t("rules.form.descriptionPlaceholder")}
                  disabled={isDefault}
                  rows={2}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("rules.form.alertType")}</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value}
                disabled={isDefault}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {ALERT_TYPE_KEYS.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {t(type.key)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="operator"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("rules.form.operator")}</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  disabled={isDefault}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {OPERATOR_KEYS.map((op) => (
                      <SelectItem key={op.value} value={op.value}>
                        {t(op.key)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="threshold"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("rules.form.threshold")}</FormLabel>
                <FormControl>
                  <Input type="number" min="0" step="any" {...field} />
                </FormControl>
                <FormDescription className="text-xs">
                  {t(getThresholdHintKey(watchedType))}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="severity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("rules.form.severity")}</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {SEVERITY_KEYS.map((sev) => (
                    <SelectItem key={sev.value} value={sev.value}>
                      <span className="flex items-center gap-2">
                        <span
                          className={cn(
                            "h-2 w-2 rounded-full shrink-0",
                            SEVERITY_DOT[sev.value]
                          )}
                          aria-hidden
                        />
                        {t(sev.key)}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="enabled"
          render={({ field }) => (
            <FormItem className="flex items-center gap-3 space-y-0">
              <FormControl>
                <Switch
                  id="enabled"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <FormLabel htmlFor="enabled" className="cursor-pointer">
                {t("rules.form.enabled")}
              </FormLabel>
            </FormItem>
          )}
        />

        <DialogFooter className="pt-2">
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
        </DialogFooter>
      </form>
    </Form>
  );
}

// ---------------------------------------------------------------------------
// AlertRulesModal
// ---------------------------------------------------------------------------

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
  const [query, setQuery] = useState("");

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
    const severityKey = SEVERITY_KEYS.find((s) => s.value === severity);
    return (
      <Badge
        variant="outline"
        className={cn(
          "gap-1.5",
          SEVERITY_BADGE[severity] ?? "border-border text-muted-foreground"
        )}
      >
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full shrink-0",
            SEVERITY_DOT[severity] ?? "bg-muted-foreground"
          )}
          aria-hidden
        />
        {severityKey ? t(severityKey.key) : severity}
      </Badge>
    );
  };

  const serverRules =
    alertRules?.filter((rule) => rule.serverId === selectedServerId) ?? [];

  const hasQuery = query.trim().length > 0;

  const filteredRules = serverRules.filter((rule) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    const typeEntry = ALERT_TYPE_KEYS.find((at) => at.value === rule.type);
    return (
      rule.name.toLowerCase().includes(q) ||
      rule.type.toLowerCase().includes(q) ||
      (typeEntry ? t(typeEntry.key).toLowerCase().includes(q) : false)
    );
  });

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("rules.title")}</DialogTitle>
            <DialogDescription>{t("rules.description")}</DialogDescription>
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
            ) : (
              <div className="space-y-3">
                {/* Toolbar: search + create */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder={t("rules.searchPlaceholder")}
                      className="pl-9"
                    />
                  </div>
                  <Button
                    onClick={handleCreate}
                    className="btn-primary shrink-0"
                  >
                    {t("rules.createRule")}
                  </Button>
                </div>

                {/* No rules exist yet */}
                {serverRules.length === 0 && (
                  <div className="text-center py-8">
                    <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">
                      {t("rules.noRules")}
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      {t("rules.noRulesDescription")}
                    </p>
                    <Button onClick={handleCreate} variant="outline">
                      {t("rules.createFirstRule")}
                    </Button>
                  </div>
                )}

                {/* Search returned no results */}
                {serverRules.length > 0 &&
                  filteredRules.length === 0 &&
                  hasQuery && (
                    <div className="text-center py-8">
                      <Search className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                      <p className="font-medium mb-1">{t("rules.noResults")}</p>
                      <p className="text-sm text-muted-foreground">
                        {t("rules.noResultsDescription")}
                      </p>
                    </div>
                  )}

                {/* Rules list */}
                {filteredRules.map((rule) => {
                  const typeEntry = ALERT_TYPE_KEYS.find(
                    (at) => at.value === rule.type
                  );
                  return (
                    <div
                      key={rule.id}
                      className={cn(
                        "flex items-start justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors border-l-4",
                        SEVERITY_BORDER[rule.severity] ?? "border-l-border"
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <h4 className="font-medium">{rule.name}</h4>
                          {getSeverityBadge(rule.severity)}
                          {rule.enabled ? (
                            <Badge variant="outline" className="text-success">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              {t("rules.badge.enabled")}
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-muted-foreground"
                            >
                              <XCircle className="h-3 w-3 mr-1" />
                              {t("rules.badge.disabled")}
                            </Badge>
                          )}
                          {rule.isDefault && (
                            <Badge variant="secondary">
                              {t("rules.badge.default")}
                            </Badge>
                          )}
                        </div>
                        {rule.description && (
                          <p className="text-sm text-muted-foreground mb-2">
                            {rule.description}
                          </p>
                        )}
                        <div className="text-sm text-muted-foreground space-y-0.5">
                          <div>
                            <span className="font-medium">
                              {t("rules.detail.type")}
                            </span>{" "}
                            {typeEntry ? t(typeEntry.key) : rule.type}
                          </div>
                          <div>
                            <span className="font-medium">
                              {t("rules.detail.condition")}
                            </span>{" "}
                            {formatCondition(rule)}
                          </div>
                          <div>
                            <span className="font-medium">
                              {t("rules.detail.server")}
                            </span>{" "}
                            {rule.server.name}
                          </div>
                          {rule._count && rule._count.alerts > 0 && (
                            <div>
                              <span className="font-medium">
                                {t("rules.detail.activeAlerts")}
                              </span>{" "}
                              {rule._count.alerts}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4 shrink-0">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(rule)}
                              aria-label={t("rules.actions.edit")}
                            >
                              <Pencil className="h-4 w-4" aria-hidden="true" />
                              <span className="hidden sm:inline ml-2">
                                {t("rules.actions.edit")}
                              </span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {t("rules.actions.edit")}
                          </TooltipContent>
                        </Tooltip>
                        {!rule.isDefault && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteClick(rule)}
                                disabled={deleteMutation.isPending}
                                aria-label={t("rules.actions.delete")}
                              >
                                <Trash2
                                  className="h-4 w-4 text-destructive"
                                  aria-hidden="true"
                                />
                                <span className="hidden sm:inline ml-2 text-destructive">
                                  {t("rules.actions.delete")}
                                </span>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {t("rules.actions.delete")}
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Create / Edit form modal */}
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

      {/* Delete confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("rules.delete.title")}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <span>
                <Trans
                  i18nKey="alerts:rules.delete.confirmation"
                  values={{ name: ruleToDelete?.name }}
                  components={{ strong: <strong /> }}
                />
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRuleToDelete(null)}>
              {t("rules.form.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive hover:bg-destructive/90"
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
