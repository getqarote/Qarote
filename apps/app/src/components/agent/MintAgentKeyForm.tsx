/**
 * Shared "mint an agent key" form — the single source of truth for minting
 * machine API keys, used both by Settings → Agent Access and the cockpit
 * "Connect your agent" flow (both via MintAgentKeyDialog). Calls
 * `onMinted(secret, name)` with the one-time plaintext secret on success; the
 * caller owns the reveal dialog and clears the secret from its own state.
 */

import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { qToast } from "@/lib/qToast";

import { QuotaUsageWidget } from "@/components/llm/QuotaUsageWidget";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggleGroup";

import { useApiKeys } from "@/hooks/queries/useApiKeys";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";

// "never" is the sentinel for no-expiry in the form; mapped to null on submit
// (the API treats null as never-expires).
const EXPIRY_OPTIONS = ["30", "90", "365", "never"] as const;
type ExpiryOption = (typeof EXPIRY_OPTIONS)[number];

const mintSchema = z.object({
  // .trim() runs as a transform BEFORE the min/max checks so a whitespace-only
  // name fails validation instead of silently passing.
  name: z.string().trim().min(1).max(80),
  mode: z.enum(["read", "explain"]),
  expiry: z.enum(EXPIRY_OPTIONS),
});

type MintFormValues = z.infer<typeof mintSchema>;

// Segmented control (prototype `.seg`): a bordered track with equal-width
// items; the selected item lifts to bg-card. ToggleGroup gives roving-focus
// keyboard nav and disabled-item skipping for free.
const SEG_CLASS =
  "grid w-full gap-0.5 rounded-full border border-border bg-muted/50 p-[3px]";
const SEG_ITEM =
  "rounded-full px-3 py-1.5 text-[13px] font-medium text-muted-foreground transition-colors data-[state=on]:bg-card data-[state=on]:text-foreground data-[state=on]:shadow-sm disabled:cursor-not-allowed disabled:opacity-50";

export function MintAgentKeyForm({
  workspaceId,
  onMinted,
  onCancel,
}: {
  workspaceId: string;
  onMinted: (secret: string, name: string) => void;
  /** Renders a Cancel button (used when the form lives in a modal). */
  onCancel?: () => void;
}) {
  const { t } = useTranslation("settings");
  const { mint } = useApiKeys(workspaceId);
  // explain scope adds the LLM tool (explain_incident) — plan-gated, never
  // hidden: on community it's a disabled segment with an upgrade hint.
  const { hasFeature } = useFeatureFlags();
  const canExplain = hasFeature("ai_explain_inline");

  const form = useForm<MintFormValues>({
    resolver: zodResolver(mintSchema),
    defaultValues: { name: "", mode: "read", expiry: "90" },
  });

  const name = useWatch({ control: form.control, name: "name" });
  const mode = useWatch({ control: form.control, name: "mode" });
  const expiry = useWatch({ control: form.control, name: "expiry" });

  // Never leave the form on a scope the plan can't mint (e.g. plan downgraded
  // while the modal is open).
  useEffect(() => {
    if (!canExplain && mode === "explain") form.setValue("mode", "read");
  }, [canExplain, mode, form]);

  const onSubmit = form.handleSubmit((values) => {
    if (!workspaceId) return;
    const expiresInDays =
      values.expiry === "never" ? null : Number(values.expiry);

    // Loading toast persists (no auto-dismiss, no close button) until the
    // mutation resolves; the same toast id is then updated in place.
    const minting = qToast({
      severity: "loading",
      title: t("agentAccess.mint.pending"),
    });

    mint.mutate(
      {
        workspaceId,
        name: values.name,
        mode: values.mode,
        expiresInDays,
      },
      {
        onSuccess: (data) => {
          // The success toast ("Key created · View keys") now fires from the
          // reveal dialog's Done button — not here, where it would overlap the
          // open "copy it now" dialog. Just clear the loading toast.
          minting.dismiss();
          onMinted(data.key, data.name);
          form.reset();
        },
        onError: (err) => {
          minting.update({
            severity: "error",
            title: err.message || t("agentAccess.mint.failed"),
          });
        },
      }
    );
  });

  // Hint under the segmented changes with the selected scope; the gated suffix
  // is appended when the plan can't use explain.
  const scopeHint =
    (mode === "read"
      ? t("agentAccess.mint.scopeReadConsequence")
      : t("agentAccess.mint.scopeExplainConsequence")) +
    (canExplain ? "" : t("agentAccess.mint.scopeExplainGated"));

  const mintDisabled = !name?.trim() || mint.isPending || !workspaceId;

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Name */}
      <div className="space-y-1.5">
        <Label htmlFor="agent-key-name">
          {t("agentAccess.mint.nameLabel")}
        </Label>
        <Input
          id="agent-key-name"
          autoFocus
          autoComplete="off"
          placeholder={t("agentAccess.mint.namePlaceholder")}
          {...form.register("name")}
        />
        {form.formState.errors.name && (
          <p className="text-destructive text-xs">
            {/* zodResolver sets `type` to the zod issue code: "too_big" for the
                max(80) violation, "too_small" for the empty/min case. */}
            {form.formState.errors.name.type === "too_big"
              ? t("agentAccess.mint.nameTooLong")
              : t("agentAccess.mint.nameRequired")}
          </p>
        )}
      </div>

      {/* Scope */}
      <div className="space-y-1.5">
        <Label>{t("agentAccess.mint.scopeLabel")}</Label>
        <ToggleGroup
          type="single"
          value={mode}
          onValueChange={(v) =>
            v && form.setValue("mode", v as MintFormValues["mode"])
          }
          aria-label={t("agentAccess.mint.scopeLabel")}
          className={`${SEG_CLASS} grid-cols-2`}
        >
          <ToggleGroupItem value="read" className={SEG_ITEM}>
            {t("agentAccess.mint.scopeRead")}
          </ToggleGroupItem>
          <ToggleGroupItem
            value="explain"
            disabled={!canExplain}
            className={SEG_ITEM}
          >
            {t("agentAccess.mint.scopeExplain")}
          </ToggleGroupItem>
        </ToggleGroup>
        <p className="text-xs text-muted-foreground">{scopeHint}</p>
        {mode === "explain" && (
          <div className="pt-1">
            <QuotaUsageWidget />
          </div>
        )}
      </div>

      {/* Expiry */}
      <div className="space-y-1.5">
        <Label>{t("agentAccess.mint.expiryLabel")}</Label>
        <ToggleGroup
          type="single"
          value={expiry}
          onValueChange={(v) => v && form.setValue("expiry", v as ExpiryOption)}
          aria-label={t("agentAccess.mint.expiryLabel")}
          className={`${SEG_CLASS} grid-cols-4`}
        >
          <ToggleGroupItem value="30" className={SEG_ITEM}>
            {t("agentAccess.mint.expiry30")}
          </ToggleGroupItem>
          <ToggleGroupItem value="90" className={SEG_ITEM}>
            {t("agentAccess.mint.expiry90")}
          </ToggleGroupItem>
          <ToggleGroupItem value="365" className={SEG_ITEM}>
            {t("agentAccess.mint.expiry365")}
          </ToggleGroupItem>
          <ToggleGroupItem value="never" className={SEG_ITEM}>
            {t("agentAccess.mint.expiryNever")}
          </ToggleGroupItem>
        </ToggleGroup>
        <p className="text-xs text-muted-foreground">
          {t("agentAccess.mint.expiryHint")}
        </p>
      </div>

      {/* Footer — Cancel (ghost, grows left) + Mint key (primary, carrot;
          disabled = carrot at reduced opacity via the Button default). */}
      <div className="flex items-center gap-2 pt-2">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={onCancel}
          >
            {t("agentAccess.mint.cancel")}
          </Button>
        )}
        <Button
          type="submit"
          disabled={mintDisabled}
          className={onCancel ? "" : "w-full"}
        >
          {mint.isPending
            ? t("agentAccess.mint.pending")
            : t("agentAccess.mint.submit")}
        </Button>
      </div>
    </form>
  );
}
