/**
 * Shared "mint an agent key" form — the single source of truth for minting
 * machine API keys, used both by Settings → Agent Access (inline) and the
 * cockpit "Connect your agent" dialog. Calls `onMinted(secret, name)` with
 * the one-time plaintext secret on success; the caller owns the reveal
 * dialog and clears the secret from its own state.
 */

import { useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { QuotaUsageWidget } from "@/components/llm/QuotaUsageWidget";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radioGroup";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useApiKeys } from "@/hooks/queries/useApiKeys";

// "never" is the sentinel for no-expiry in the form select; mapped to null
// on submit (the API treats null as never-expires).
const EXPIRY_OPTIONS = ["30", "90", "365", "never"] as const;
type ExpiryOption = (typeof EXPIRY_OPTIONS)[number];

const mintSchema = z.object({
  // .trim() runs as a transform BEFORE the min/max checks so a
  // whitespace-only name fails validation instead of silently passing.
  name: z.string().trim().min(1).max(80),
  mode: z.enum(["read", "explain"]),
  expiry: z.enum(EXPIRY_OPTIONS),
});

type MintFormValues = z.infer<typeof mintSchema>;

interface ScopeOptionProps {
  value: "read" | "explain";
  label: string;
  consequence: string;
}

function ScopeOption({ value, label, consequence }: ScopeOptionProps) {
  // Wrapping label clicks bubble to the contained RadioGroupItem
  // automatically. Avoid `htmlFor` + matching `id` on the item — the
  // double-binding triggers two activations on some browsers.
  return (
    <label className="flex items-start gap-2 rounded border p-3 cursor-pointer hover:bg-accent/40">
      <RadioGroupItem value={value} className="mt-0.5" />
      <div>
        <div className="font-medium text-sm">{label}</div>
        <div className="text-xs text-muted-foreground mt-0.5">
          {consequence}
        </div>
      </div>
    </label>
  );
}

export function MintAgentKeyForm({
  workspaceId,
  onMinted,
}: {
  workspaceId: string;
  onMinted: (secret: string, name: string) => void;
}) {
  const { t } = useTranslation("settings");
  const { mint } = useApiKeys(workspaceId);

  const form = useForm<MintFormValues>({
    resolver: zodResolver(mintSchema),
    defaultValues: { name: "", mode: "read", expiry: "90" },
  });

  // useWatch over form.watch: React Compiler can memoize this safely.
  const mode = useWatch({ control: form.control, name: "mode" });
  const expiry = useWatch({ control: form.control, name: "expiry" });

  const onSubmit = form.handleSubmit((values) => {
    if (!workspaceId) return;
    const expiresInDays =
      values.expiry === "never" ? null : Number(values.expiry);

    mint.mutate(
      {
        workspaceId,
        name: values.name,
        mode: values.mode,
        expiresInDays,
      },
      {
        onSuccess: (data) => {
          onMinted(data.key, data.name);
          form.reset();
        },
        onError: (err) => {
          toast.error(err.message || t("agentAccess.mint.failed"));
        },
      }
    );
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="agent-key-name">
          {t("agentAccess.mint.nameLabel")}
        </Label>
        <Input
          id="agent-key-name"
          autoComplete="off"
          placeholder={t("agentAccess.mint.namePlaceholder")}
          {...form.register("name")}
        />
        {form.formState.errors.name && (
          <p className="text-destructive text-xs">
            {/* zodResolver sets `type` to the zod issue code: "too_big" for
                the max(80) violation, "too_small" for the empty/min case. */}
            {form.formState.errors.name.type === "too_big"
              ? t("agentAccess.mint.nameTooLong")
              : t("agentAccess.mint.nameRequired")}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label>{t("agentAccess.mint.scopeLabel")}</Label>
        <RadioGroup
          value={mode}
          onValueChange={(v) =>
            form.setValue("mode", v as MintFormValues["mode"])
          }
          className="grid grid-cols-1 sm:grid-cols-2 gap-2"
        >
          <ScopeOption
            value="read"
            label={t("agentAccess.mint.scopeRead")}
            consequence={t("agentAccess.mint.scopeReadConsequence")}
          />
          <ScopeOption
            value="explain"
            label={t("agentAccess.mint.scopeExplain")}
            consequence={t("agentAccess.mint.scopeExplainConsequence")}
          />
        </RadioGroup>
        {mode === "explain" && (
          <div className="mt-2">
            <QuotaUsageWidget />
          </div>
        )}
      </div>

      <div className="space-y-1">
        <Label htmlFor="agent-key-expiry">
          {t("agentAccess.mint.expiryLabel")}
        </Label>
        <Select
          value={expiry}
          onValueChange={(v) => form.setValue("expiry", v as ExpiryOption)}
        >
          <SelectTrigger id="agent-key-expiry">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="30">{t("agentAccess.mint.expiry30")}</SelectItem>
            <SelectItem value="90">{t("agentAccess.mint.expiry90")}</SelectItem>
            <SelectItem value="365">
              {t("agentAccess.mint.expiry365")}
            </SelectItem>
            <SelectItem value="never">
              {t("agentAccess.mint.expiryNever")}
            </SelectItem>
          </SelectContent>
        </Select>
        {expiry === "never" && (
          <p className="text-xs text-amber-700 dark:text-amber-400 flex items-start gap-1 mt-1">
            <AlertTriangle
              className="h-4 w-4 mt-0.5 shrink-0"
              aria-hidden="true"
            />
            <span>{t("agentAccess.mint.expiryNeverWarning")}</span>
          </p>
        )}
      </div>

      <Button type="submit" disabled={mint.isPending || !workspaceId}>
        {mint.isPending
          ? t("agentAccess.mint.pending")
          : t("agentAccess.mint.submit")}
      </Button>
    </form>
  );
}
