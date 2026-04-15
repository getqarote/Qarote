import { useMemo } from "react";
import { UseFormReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { AlertCircle, CheckCircle2 } from "lucide-react";

import { cn } from "@/lib/utils";

import {
  FormControl,
  FormField,
  FormItem,
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

import { type SendMessageFormData } from "@/schemas";

import { CONTENT_ENCODINGS, CONTENT_TYPES } from "./constants";
import { LabelWithTooltip } from "./LabelWithTooltip";

interface MessagePropertiesSectionsProps {
  form: UseFormReturn<SendMessageFormData>;
}

const SectionHeading = ({ children }: { children: React.ReactNode }) => (
  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
    {children}
  </h4>
);

export const MessagePropertiesSections = ({
  form,
}: MessagePropertiesSectionsProps) => {
  const { t } = useTranslation("exchanges");
  const headers = form.watch("headers");

  const headersStatus = useMemo(() => {
    if (!headers?.trim()) return null;
    try {
      const parsed = JSON.parse(headers);
      if (
        typeof parsed !== "object" ||
        parsed === null ||
        Array.isArray(parsed)
      ) {
        return { valid: false as const, message: "Must be a JSON object" };
      }
      return { valid: true as const };
    } catch (e) {
      return {
        valid: false as const,
        message: e instanceof Error ? e.message : "Invalid JSON",
      };
    }
  }, [headers]);

  return (
    <div className="space-y-6">
      {/* Delivery */}
      <section className="space-y-3">
        <SectionHeading>{t("sendMessage.sectionDelivery")}</SectionHeading>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="deliveryMode"
            render={({ field }) => (
              <FormItem>
                <LabelWithTooltip
                  htmlFor="deliveryMode"
                  label={t("sendMessage.deliveryModeLabel")}
                  tooltip={t("sendMessage.deliveryModeTooltip")}
                />
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger id="deliveryMode">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="1">
                      {t("sendMessage.transient")}
                    </SelectItem>
                    <SelectItem value="2">
                      {t("sendMessage.persistent")}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <FormItem>
                <LabelWithTooltip
                  htmlFor="priority"
                  label={t("sendMessage.priorityLabel")}
                  tooltip={t("sendMessage.priorityTooltip")}
                  side="left"
                />
                <FormControl>
                  <Input
                    {...field}
                    id="priority"
                    type="number"
                    min="0"
                    max="255"
                    placeholder="0"
                    className="font-mono text-sm"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="expiration"
          render={({ field }) => (
            <FormItem>
              <LabelWithTooltip
                htmlFor="expiration"
                label={t("sendMessage.expirationLabel")}
                tooltip={t("sendMessage.expirationTooltip")}
              />
              <FormControl>
                <Input
                  {...field}
                  id="expiration"
                  placeholder="60000"
                  className="font-mono text-sm"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </section>

      {/* Content */}
      <section className="space-y-3">
        <SectionHeading>{t("sendMessage.sectionContent")}</SectionHeading>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="contentType"
            render={({ field }) => (
              <FormItem>
                <LabelWithTooltip
                  htmlFor="contentType"
                  label={t("sendMessage.contentTypeLabel")}
                  tooltip={t("sendMessage.contentTypeTooltip")}
                />
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger id="contentType">
                      <SelectValue
                        placeholder={t("sendMessage.contentTypePlaceholder")}
                      />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {CONTENT_TYPES.map((ct) => (
                      <SelectItem key={ct} value={ct} className="font-mono">
                        {ct}
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
            name="contentEncoding"
            render={({ field }) => (
              <FormItem>
                <LabelWithTooltip
                  htmlFor="contentEncoding"
                  label={t("sendMessage.contentEncodingLabel")}
                  tooltip={t("sendMessage.contentEncodingTooltip")}
                  side="left"
                />
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger id="contentEncoding">
                      <SelectValue
                        placeholder={t(
                          "sendMessage.contentEncodingPlaceholder"
                        )}
                      />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {CONTENT_ENCODINGS.map((enc) => (
                      <SelectItem
                        key={enc}
                        value={enc}
                        className={enc === "none" ? "" : "font-mono"}
                      >
                        {enc === "none" ? t("sendMessage.encodingNone") : enc}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="headers"
          render={({ field }) => (
            <FormItem>
              <LabelWithTooltip
                htmlFor="headers"
                label={t("sendMessage.headersLabel")}
                tooltip={t("sendMessage.headersTooltip")}
              />
              <FormControl>
                <Textarea
                  {...field}
                  id="headers"
                  placeholder='{"x-custom-header": "value", "x-retry-count": 3}'
                  className="font-mono text-sm"
                  rows={3}
                />
              </FormControl>
              {headersStatus && (
                <p
                  className={cn(
                    "flex items-center gap-1.5 text-xs",
                    headersStatus.valid ? "text-success" : "text-destructive"
                  )}
                >
                  {headersStatus.valid ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {t("sendMessage.jsonValid")}
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-3.5 w-3.5" />
                      <span className="truncate">
                        {t("sendMessage.jsonInvalid", {
                          message: headersStatus.message,
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
      </section>

      {/* Identity & tracing */}
      <section className="space-y-3">
        <SectionHeading>{t("sendMessage.sectionIdentity")}</SectionHeading>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="messageType"
            render={({ field }) => (
              <FormItem>
                <LabelWithTooltip
                  htmlFor="messageType"
                  label={t("sendMessage.messageTypeLabel")}
                  tooltip={t("sendMessage.messageTypeTooltip")}
                />
                <FormControl>
                  <Input
                    {...field}
                    id="messageType"
                    placeholder="order.created"
                    className="font-mono text-sm"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="correlationId"
            render={({ field }) => (
              <FormItem>
                <LabelWithTooltip
                  htmlFor="correlationId"
                  label={t("sendMessage.correlationIdLabel")}
                  tooltip={t("sendMessage.correlationIdTooltip")}
                  side="left"
                />
                <FormControl>
                  <Input
                    {...field}
                    id="correlationId"
                    placeholder="req-123456"
                    className="font-mono text-sm"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="messageId"
            render={({ field }) => (
              <FormItem>
                <LabelWithTooltip
                  htmlFor="messageId"
                  label={t("sendMessage.messageIdLabel")}
                  tooltip={t("sendMessage.messageIdTooltip")}
                />
                <FormControl>
                  <Input
                    {...field}
                    id="messageId"
                    placeholder="msg-123456"
                    className="font-mono text-sm"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="replyTo"
            render={({ field }) => (
              <FormItem>
                <LabelWithTooltip
                  htmlFor="replyTo"
                  label={t("sendMessage.replyToLabel")}
                  tooltip={t("sendMessage.replyToTooltip")}
                  side="left"
                />
                <FormControl>
                  <Input
                    {...field}
                    id="replyTo"
                    placeholder="response.queue"
                    className="font-mono text-sm"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="appId"
          render={({ field }) => (
            <FormItem>
              <LabelWithTooltip
                htmlFor="appId"
                label={t("sendMessage.appIdLabel")}
                tooltip={t("sendMessage.appIdTooltip")}
              />
              <FormControl>
                <Input
                  {...field}
                  id="appId"
                  placeholder="my-app-v1.0"
                  className="font-mono text-sm"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </section>
    </div>
  );
};
