import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronDown, Plus } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
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
import { Textarea } from "@/components/ui/textarea";

import { useVHostContext } from "@/contexts/VHostContextDefinition";

import { useCreateOrUpdatePolicy } from "@/hooks/queries/useRabbitMQ";
import { useWorkspace } from "@/hooks/ui/useWorkspace";

import type { PolicyListItem } from "./types";

const KNOWN_DEFINITION_KEYS: Array<{
  key: string;
  description: string;
  example: string;
}> = [
  {
    key: "ha-mode",
    description: "High availability mode (all | exactly | nodes)",
    example: '"all"',
  },
  {
    key: "ha-params",
    description: "HA params: number of replicas or node list",
    example: "2",
  },
  {
    key: "ha-sync-mode",
    description: "How replicas sync (automatic | manual)",
    example: '"automatic"',
  },
  {
    key: "message-ttl",
    description: "Message TTL in milliseconds",
    example: "60000",
  },
  {
    key: "expires",
    description: "Queue/exchange TTL in milliseconds",
    example: "300000",
  },
  {
    key: "max-length",
    description: "Max number of messages in queue",
    example: "10000",
  },
  {
    key: "max-length-bytes",
    description: "Max total size of messages in bytes",
    example: "104857600",
  },
  {
    key: "overflow",
    description: "Behaviour on overflow (drop-head | reject-publish)",
    example: '"drop-head"',
  },
  {
    key: "dead-letter-exchange",
    description: "Exchange for dead-lettered messages",
    example: '"dlx.exchange"',
  },
  {
    key: "dead-letter-routing-key",
    description: "Routing key for dead-lettered messages",
    example: '"dlq.key"',
  },
  {
    key: "federation-upstream",
    description: "Federation upstream name",
    example: '"upstream-name"',
  },
  {
    key: "federation-upstream-set",
    description: "Federation upstream set name",
    example: '"all"',
  },
  {
    key: "alternate-exchange",
    description: "Fallback exchange for unroutable messages",
    example: '"alt.exchange"',
  },
  {
    key: "queue-mode",
    description: "Queue storage mode (lazy | default)",
    example: '"lazy"',
  },
  {
    key: "delivery-limit",
    description: "Max delivery attempts before dead-lettering (quorum)",
    example: "5",
  },
];

const policyFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  pattern: z.string().min(1, "Pattern is required"),
  applyTo: z.enum(["queues", "exchanges", "all"]),
  priority: z.coerce.number().int().min(0),
  definitionJson: z.string().superRefine((val, ctx) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(val);
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "errors.json.invalid",
      });
      return;
    }
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "errors.json.notObject",
      });
      return;
    }
    if (Object.keys(parsed as object).length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "errors.json.empty",
      });
    }
  }),
});

type PolicyFormData = z.infer<typeof policyFormSchema>;

interface PolicyFormProps {
  serverId: string;
  trigger?: React.ReactNode;
  initialValues?: PolicyListItem;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
}

export function PolicyForm({
  serverId,
  trigger,
  initialValues,
  open: openProp,
  onOpenChange,
  onSuccess,
}: PolicyFormProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [showHints, setShowHints] = useState(false);

  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : internalOpen;
  const setOpen = (next: boolean) => {
    if (isControlled) onOpenChange?.(next);
    else setInternalOpen(next);
  };

  const { t } = useTranslation("policies");
  const { workspace } = useWorkspace();
  const { selectedVHost } = useVHostContext();
  const mutation = useCreateOrUpdatePolicy();

  const isEditing = !!initialValues;

  const form = useForm<PolicyFormData>({
    resolver: zodResolver(policyFormSchema),
    defaultValues: {
      name: "",
      pattern: ".*",
      applyTo: "all",
      priority: 0,
      definitionJson: "{}",
    },
  });

  useEffect(() => {
    if (open) {
      if (initialValues) {
        form.reset({
          name: initialValues.name,
          pattern: initialValues.pattern,
          applyTo: initialValues["apply-to"],
          priority: initialValues.priority,
          definitionJson: JSON.stringify(initialValues.definition, null, 2),
        });
      } else {
        form.reset({
          name: "",
          pattern: ".*",
          applyTo: "all",
          priority: 0,
          definitionJson: "{}",
        });
      }
    }
  }, [open, initialValues, form]);

  const insertHint = (key: string, example: string) => {
    const current = form.getValues("definitionJson");
    try {
      const parsed = JSON.parse(current);
      if (
        typeof parsed !== "object" ||
        parsed === null ||
        Array.isArray(parsed)
      )
        throw new Error();
      parsed[key] = JSON.parse(example);
      form.setValue("definitionJson", JSON.stringify(parsed, null, 2), {
        shouldValidate: true,
      });
    } catch {
      // If current JSON is invalid, start fresh with the hint
      form.setValue(
        "definitionJson",
        JSON.stringify({ [key]: JSON.parse(example) }, null, 2),
        { shouldValidate: true }
      );
    }
  };

  const onSubmit = (data: PolicyFormData) => {
    if (!serverId || !workspace?.id) {
      toast.error(t("common:error"), {
        description: t("workspaceRequired"),
      });
      return;
    }

    const vhost = selectedVHost ?? "/";

    mutation.mutate(
      {
        serverId,
        workspaceId: workspace.id,
        vhost: encodeURIComponent(vhost),
        name: data.name.trim(),
        pattern: data.pattern,
        applyTo: data.applyTo,
        priority: data.priority,
        definition: JSON.parse(data.definitionJson) as Record<string, unknown>,
      },
      {
        onSuccess: () => {
          setOpen(false);
          toast(isEditing ? t("toast.updated") : t("toast.created"), {
            description: isEditing
              ? t("toast.updatedDesc", { name: data.name })
              : t("toast.createdDesc", { name: data.name }),
          });
          onSuccess?.();
        },
        onError: (error) => {
          toast.error(t("toast.saveFailed"), {
            description: error.message || t("toast.saveError"),
          });
        },
      }
    );
  };

  const defaultTrigger = (
    <Button className="btn-primary">
      <Plus className="h-4 w-4 mr-2" />
      {t("addPolicy")}
    </Button>
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setShowHints(false);
      }}
    >
      {trigger !== null && (
        <DialogTrigger asChild>{trigger ?? defaultTrigger}</DialogTrigger>
      )}
      <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col bg-card">
        <DialogHeader className="shrink-0">
          <DialogTitle>
            {isEditing ? t("editPolicy") : t("createPolicy")}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? t("editPolicyDesc") : t("createPolicyDesc")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 pb-2">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4 pt-2"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("nameLabel")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t("namePlaceholder")}
                        autoFocus={!isEditing}
                        disabled={isEditing}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="pattern"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("patternLabel")}</FormLabel>
                      <FormControl>
                        <Input placeholder=".*" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("priorityLabel")}</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="applyTo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("applyToLabel")}</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="all">{t("applyToAll")}</SelectItem>
                        <SelectItem value="queues">
                          {t("applyToQueues")}
                        </SelectItem>
                        <SelectItem value="exchanges">
                          {t("applyToExchanges")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="definitionJson"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>{t("definitionLabel")}</FormLabel>
                      <button
                        type="button"
                        onClick={() => setShowHints((v) => !v)}
                        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                      >
                        {t("hints")}
                        <ChevronDown
                          className={`h-3 w-3 transition-transform ${showHints ? "rotate-180" : ""}`}
                        />
                      </button>
                    </div>

                    {showHints && (
                      <div className="rounded-md border border-border bg-muted/30 p-3 space-y-1.5 max-h-48 overflow-y-auto">
                        <p className="text-xs text-muted-foreground mb-2">
                          {t("hintsDesc")}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {KNOWN_DEFINITION_KEYS.map(
                            ({ key, description, example }) => (
                              <button
                                key={key}
                                type="button"
                                title={`${description}\nExample: ${example}`}
                                onClick={() => insertHint(key, example)}
                                className="text-xs"
                              >
                                <Badge
                                  variant="outline"
                                  className="cursor-pointer hover:bg-accent transition-colors font-mono"
                                >
                                  {key}
                                </Badge>
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    )}

                    <FormControl>
                      <Textarea
                        className="font-mono text-xs min-h-[120px]"
                        placeholder='{"ha-mode": "all"}'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage>
                      {fieldState.error?.message
                        ? t(fieldState.error.message)
                        : undefined}
                    </FormMessage>
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </div>

        <DialogFooter className="shrink-0 pt-4 border-t border-border">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={mutation.isPending}
          >
            {t("common:cancel")}
          </Button>
          <Button
            type="submit"
            onClick={form.handleSubmit(onSubmit)}
            disabled={mutation.isPending}
            className="btn-primary"
          >
            {mutation.isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                {t("saving")}
              </>
            ) : isEditing ? (
              t("savePolicy")
            ) : (
              t("createPolicy")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
