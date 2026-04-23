import { useMemo } from "react";
import { UseFormReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { AlertCircle, CheckCircle2 } from "lucide-react";

import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";

import { type SendMessageFormData } from "@/schemas";

import { LabelWithTooltip } from "./LabelWithTooltip";

interface PayloadFieldProps {
  form: UseFormReturn<SendMessageFormData>;
  contentType: string;
  onFormat: () => void;
}

export const PayloadField = ({
  form,
  contentType,
  onFormat,
}: PayloadFieldProps) => {
  const { t } = useTranslation("exchanges");
  const payload = form.watch("payload");
  const isJson = contentType === "application/json";

  const jsonStatus = useMemo(() => {
    if (!isJson || !payload?.trim()) return null;
    try {
      JSON.parse(payload);
      return { valid: true as const };
    } catch (e) {
      return {
        valid: false as const,
        message: e instanceof Error ? e.message : "Invalid JSON",
      };
    }
  }, [isJson, payload]);

  return (
    <FormField
      control={form.control}
      name="payload"
      render={({ field }) => (
        <FormItem>
          <div className="flex items-center justify-between">
            <LabelWithTooltip
              htmlFor="payload"
              label={t("sendMessage.payloadLabel")}
              tooltip={t("sendMessage.payloadTooltip")}
            />
            {isJson && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onFormat}
                disabled={!jsonStatus?.valid}
              >
                {t("sendMessage.formatJson")}
              </Button>
            )}
          </div>
          <FormControl>
            <Textarea
              {...field}
              id="payload"
              placeholder={t("sendMessage.payloadPlaceholder")}
              className="min-h-[140px] font-mono text-sm"
              required
            />
          </FormControl>
          {isJson && jsonStatus && (
            <p
              className={cn(
                "flex items-center gap-1.5 text-xs",
                jsonStatus.valid ? "text-success" : "text-destructive"
              )}
            >
              {jsonStatus.valid ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {t("sendMessage.jsonValid")}
                </>
              ) : (
                <>
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span className="truncate">
                    {t("sendMessage.jsonInvalid", {
                      message: jsonStatus.message,
                    })}
                  </span>
                </>
              )}
            </p>
          )}
          <FormMessage />
        </FormItem>
      )}
    />
  );
};
