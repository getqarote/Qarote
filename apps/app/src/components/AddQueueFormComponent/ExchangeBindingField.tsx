import { UseFormReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";

import {
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

import { type AddQueueFormData } from "@/schemas";

import { DEFAULT_EXCHANGE, NO_BINDING } from "./constants";
import type { Exchange } from "./types";

interface ExchangeBindingFieldProps {
  form: UseFormReturn<AddQueueFormData>;
  exchanges: Exchange[];
}

const EXCHANGE_DOT_CLASS: Record<string, string> = {
  direct: "bg-success",
  fanout: "bg-info",
  topic: "bg-warning",
  headers: "bg-muted-foreground",
};

export const ExchangeBindingField = ({
  form,
  exchanges,
}: ExchangeBindingFieldProps) => {
  const { t } = useTranslation("queues");
  const bindValue = form.watch("bindToExchange");
  const hasBinding = !!bindValue && bindValue !== NO_BINDING;

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-foreground">
        {t("exchangeBinding")}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="bindToExchange"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("exchange")}</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value || NO_BINDING}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t("selectExchange")} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={NO_BINDING}>
                    <span className="text-muted-foreground">
                      {t("noBinding")}
                    </span>
                  </SelectItem>
                  {exchanges.length > 0 ? (
                    exchanges.map((ex) => (
                      <SelectItem
                        key={ex.name || "__default__"}
                        value={ex.name || DEFAULT_EXCHANGE}
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
                            {ex.name || "(default)"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {ex.type}
                          </span>
                        </div>
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="__no_exchanges__" disabled>
                      {t("noExchangesAvailable")}
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
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("routingKey")}</FormLabel>
              <FormControl>
                <Input
                  placeholder={t("routingKeyPlaceholder")}
                  disabled={!hasBinding}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
};
