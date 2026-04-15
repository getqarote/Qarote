import { UseFormReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { MessageSquare } from "lucide-react";

import { cn } from "@/lib/utils";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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

import { type SendMessageFormData } from "@/schemas";

import { EXCHANGE_DOT_CLASS } from "./constants";
import { LabelWithTooltip } from "./LabelWithTooltip";
import type { Exchange, Queue } from "./types";

interface ExchangeRoutingFieldProps {
  form: UseFormReturn<SendMessageFormData>;
  exchanges: Exchange[];
  queues: Queue[];
}

export const ExchangeRoutingField = ({
  form,
  exchanges,
  queues,
}: ExchangeRoutingFieldProps) => {
  const { t } = useTranslation("exchanges");
  const exchangeValue = form.watch("exchange");
  const selectedExchange = exchanges.find((ex) => ex.name === exchangeValue);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="exchange"
          render={({ field }) => (
            <FormItem>
              <LabelWithTooltip
                htmlFor="exchange"
                label={t("sendMessage.exchangeLabel")}
                tooltip={t("sendMessage.exchangeTooltip")}
              />
              <Select
                value={field.value}
                onValueChange={field.onChange}
                required
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue
                      placeholder={t("sendMessage.exchangePlaceholder")}
                    />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {exchanges.length > 0 ? (
                    exchanges.map((ex) => (
                      <SelectItem
                        key={ex.name || "(Default)"}
                        value={ex.name || "(Default)"}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            aria-hidden
                            className={cn(
                              "h-2 w-2 rounded-full",
                              EXCHANGE_DOT_CLASS[ex.type] ??
                                "bg-muted-foreground"
                            )}
                          />
                          <span className="font-medium">
                            {ex.name || "(Default)"}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {ex.type}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="__no_exchanges__" disabled>
                      {t("sendMessage.noExchangesAvailable")}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="routingKey"
          render={({ field }) => {
            const isDirect = selectedExchange?.type === "direct";
            return (
              <FormItem>
                <LabelWithTooltip
                  htmlFor="routingKey"
                  label={t("sendMessage.routingKeyLabel")}
                  tooltip={t("sendMessage.routingKeyTooltip")}
                  side="left"
                />
                <div className="flex gap-2">
                  <FormControl>
                    <Input
                      {...field}
                      id="routingKey"
                      placeholder={t("sendMessage.routingKeyPlaceholder")}
                      className="flex-1 font-mono text-sm"
                    />
                  </FormControl>
                  {isDirect && queues.length > 0 && (
                    <Select onValueChange={field.onChange}>
                      <SelectTrigger className="w-[140px] shrink-0">
                        <SelectValue
                          placeholder={t("sendMessage.quickSelect")}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {queues.slice(0, 10).map((queue) => (
                          <SelectItem
                            key={queue.name}
                            value={queue.name}
                            className="font-mono"
                          >
                            {queue.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <FormMessage />
              </FormItem>
            );
          }}
        />
      </div>

      {selectedExchange && (
        <Alert className="border-info/30 bg-info-muted">
          <MessageSquare className="h-4 w-4" />
          <AlertDescription className="space-y-1.5">
            <div>
              <strong>
                {t("sendMessage.exchangeTypeTitle", {
                  type:
                    selectedExchange.type.charAt(0).toUpperCase() +
                    selectedExchange.type.slice(1),
                })}
              </strong>{" "}
              {t(
                `sendMessage.${selectedExchange.type}Description` as
                  | "sendMessage.directDescription"
                  | "sendMessage.fanoutDescription"
                  | "sendMessage.topicDescription"
                  | "sendMessage.headersDescription",
                { defaultValue: t("sendMessage.defaultDescription") }
              )}
            </div>
            <div className="text-sm text-info">
              <strong>{t("sendMessage.routingKeyInfoLabel")}</strong>{" "}
              {t(
                `sendMessage.${selectedExchange.type}RoutingKeyHelp` as
                  | "sendMessage.directRoutingKeyHelp"
                  | "sendMessage.fanoutRoutingKeyHelp"
                  | "sendMessage.topicRoutingKeyHelp"
                  | "sendMessage.headersRoutingKeyHelp",
                { defaultValue: t("sendMessage.defaultRoutingKeyHelp") }
              )}
            </div>
            {selectedExchange.bindings &&
              selectedExchange.bindings.length > 0 && (
                <div className="text-sm text-info">
                  <strong>{t("sendMessage.boundTo")}</strong>{" "}
                  {t("sendMessage.queues", {
                    count: selectedExchange.bindings.length,
                  })}
                </div>
              )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};
