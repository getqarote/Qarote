import { useState } from "react";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PixelChevronDown } from "@/components/ui/pixel-chevron-down";
import { PixelChevronUp } from "@/components/ui/pixel-chevron-up";

import type { CreateUserForm } from "@/schemas";

import {
  detectPresetId,
  USER_PERMISSION_PRESETS,
  type UserPermissionPresetId,
} from "./constants";
import { UserPermissionPresetRow } from "./UserPermissionPresetRow";

interface UserPermissionsCardProps {
  vhost: string;
}

/**
 * Permissions preview card. At rest it shows the active preset +
 * the three regex chips. Customize drops down to full regex editors
 * if the preset row can't express the shape.
 *
 * Uses a neutral surface by default — warning-tinted ones everywhere
 * desensitize the user to real warnings. The card doesn't render
 * severity; `UserTagToggles` does when administrator is selected.
 */
export function UserPermissionsCard({ vhost }: UserPermissionsCardProps) {
  const { t } = useTranslation("users");
  const { watch, setValue } = useFormContext<CreateUserForm>();
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const configure = watch("configure");
  const write = watch("write");
  const read = watch("read");
  const activePreset = detectPresetId(configure, write, read);

  const applyPreset = (id: UserPermissionPresetId) => {
    const preset = USER_PERMISSION_PRESETS.find((p) => p.id === id);
    if (!preset) return;
    setValue("configure", preset.configure, { shouldValidate: true });
    setValue("write", preset.write, { shouldValidate: true });
    setValue("read", preset.read, { shouldValidate: true });
  };

  return (
    <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-3">
      <div className="flex items-start gap-3">
        <ShieldCheck
          className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0"
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-semibold text-foreground">
            {t("permissionsTitle", { vhost })}
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t("permissionsDescription")}
          </p>
        </div>
      </div>

      <div className="pl-7 space-y-3">
        <UserPermissionPresetRow
          activeId={activePreset}
          onSelect={applyPreset}
        />

        {!advancedOpen ? (
          <div className="flex items-center justify-between gap-3">
            <dl className="grid grid-cols-3 gap-3 flex-1">
              <PermissionSummaryItem
                label={t("permissionConfigureLabel")}
                value={configure}
              />
              <PermissionSummaryItem
                label={t("permissionWriteLabel")}
                value={write}
              />
              <PermissionSummaryItem
                label={t("permissionReadLabel")}
                value={read}
              />
            </dl>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setAdvancedOpen(true)}
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground shrink-0"
            >
              <PixelChevronDown
                className="h-3 w-auto shrink-0 mr-1"
                aria-hidden
              />
              {t("permissionsAdvancedToggle")}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <FormField
              name="configure"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">
                    {t("permissionConfigureLabel")}
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      className="font-mono text-sm h-8"
                      placeholder=".*"
                      spellCheck={false}
                      autoCorrect="off"
                      autoCapitalize="off"
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    {t("permissionConfigureHint")}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              name="write"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">
                    {t("permissionWriteLabel")}
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      className="font-mono text-sm h-8"
                      placeholder=".*"
                      spellCheck={false}
                      autoCorrect="off"
                      autoCapitalize="off"
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    {t("permissionWriteHint")}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              name="read"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">
                    {t("permissionReadLabel")}
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      className="font-mono text-sm h-8"
                      placeholder=".*"
                      spellCheck={false}
                      autoCorrect="off"
                      autoCapitalize="off"
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    {t("permissionReadHint")}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <p className="text-[11px] text-muted-foreground">
              {t("regexHint")}
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setAdvancedOpen(false)}
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <PixelChevronUp
                className="h-3 w-auto shrink-0 mr-1"
                aria-hidden
              />
              {t("permissionsAdvancedCollapse")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function PermissionSummaryItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <dt className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1">
        <code className="inline-flex h-5 items-center rounded border border-border bg-background px-1.5 font-mono text-xs font-semibold text-foreground/80">
          {value}
        </code>
      </dd>
    </div>
  );
}
