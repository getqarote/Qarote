/**
 * Settings → Agent Access section. Owners and admins mint and revoke
 * machine API keys here so external AI agents can call Qarote's MCP
 * endpoint (list incidents, read config findings, and — on EE — get the
 * grounded RCA via explain_incident).
 *
 * Mint form (P2) + copy-once reveal dialog (P3) shipped together — the
 * dialog only renders when the form's mint succeeds, and the parent
 * clears the secret from state inside the dialog's onClose so it can't
 * survive a re-render.
 */

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { AgentKeyRevealDialog } from "@/components/AgentKeyRevealDialog";
import { AgentKeysList } from "@/components/AgentKeysList";
import { QuotaUsageWidget } from "@/components/llm/QuotaUsageWidget";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Skeleton } from "@/components/ui/skeleton";

import { useApiKeys } from "@/hooks/queries/useApiKeys";
import { useWorkspace } from "@/hooks/ui/useWorkspace";

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

const AgentAccessSection = () => {
  const { t } = useTranslation("settings");
  const { workspace } = useWorkspace();
  const workspaceId = workspace?.id ?? "";

  const { list, mint } = useApiKeys(workspaceId);

  // The mint mutation returns the plaintext secret exactly once; we stash
  // it here long enough for the dialog to render, then clear it from
  // state inside the dialog's onClose handler.
  const [revealed, setRevealed] = useState<{
    secret: string;
    name: string;
  } | null>(null);

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
          setRevealed({ secret: data.key, name: data.name });
          form.reset();
        },
        onError: (err) => {
          toast.error(err.message || t("agentAccess.mint.failed"));
        },
      }
    );
  });

  // Scope the loading state to the list area only — never hide the mint
  // form behind a skeleton: a user landing here mid-fetch can already
  // start minting.
  const keys = list.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="title-section">{t("agentAccess.title")}</h2>
        <p className="text-muted-foreground text-sm mt-1">
          {t("agentAccess.description")}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("agentAccess.mint.title")}</CardTitle>
        </CardHeader>
        <CardContent>
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
                  {t("agentAccess.mint.nameRequired")}
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
                onValueChange={(v) =>
                  form.setValue("expiry", v as ExpiryOption)
                }
              >
                <SelectTrigger id="agent-key-expiry">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">
                    {t("agentAccess.mint.expiry30")}
                  </SelectItem>
                  <SelectItem value="90">
                    {t("agentAccess.mint.expiry90")}
                  </SelectItem>
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
        </CardContent>
      </Card>

      {/* AgentKeysList already returns null when there are no enabled keys —
          no separate empty Card needed (the mint form above IS the entry
          point). A muted helper line stands in when the list is empty,
          and a Skeleton fills the area during the initial fetch. */}
      {list.isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : keys.filter((k) => k.enabled).length === 0 ? (
        <p className="text-muted-foreground text-sm">
          {t("agentAccess.empty.description")}
        </p>
      ) : (
        <AgentKeysList workspaceId={workspaceId} />
      )}

      <AgentKeyRevealDialog
        open={revealed !== null}
        secret={revealed?.secret ?? null}
        keyName={revealed?.name ?? ""}
        onClose={() => setRevealed(null)}
      />
    </div>
  );
};

interface ScopeOptionProps {
  value: "read" | "explain";
  label: string;
  consequence: string;
}

const ScopeOption = ({ value, label, consequence }: ScopeOptionProps) => (
  // Wrapping label clicks bubble to the contained RadioGroupItem
  // automatically. Avoid `htmlFor` + matching `id` on the item — the
  // double-binding triggers two activations on some browsers.
  <label className="flex items-start gap-2 rounded border p-3 cursor-pointer hover:bg-accent/40">
    <RadioGroupItem value={value} className="mt-0.5" />
    <div>
      <div className="font-medium text-sm">{label}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{consequence}</div>
    </div>
  </label>
);

export default AgentAccessSection;
