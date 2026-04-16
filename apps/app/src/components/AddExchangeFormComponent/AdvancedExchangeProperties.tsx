import { UseFormReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { Checkbox } from "@/components/ui/checkbox";
import { FormControl, FormField, FormItem } from "@/components/ui/form";

import { type AddExchangeFormData } from "@/schemas";

interface AdvancedExchangePropertiesProps {
  form: UseFormReturn<AddExchangeFormData>;
}

const FIELDS: Array<{
  name: "durable" | "autoDelete" | "internal";
  labelKey: string;
  descKey: string;
}> = [
  { name: "durable", labelKey: "durable", descKey: "durableDesc" },
  { name: "autoDelete", labelKey: "autoDelete", descKey: "autoDeleteDesc" },
  { name: "internal", labelKey: "internal", descKey: "internalDesc" },
];

export const AdvancedExchangeProperties = ({
  form,
}: AdvancedExchangePropertiesProps) => {
  const { t } = useTranslation("exchanges");

  return (
    <div className="space-y-3">
      <div className="space-y-0.5">
        <p className="text-sm font-medium text-foreground">
          {t("exchangePropertiesCustom")}
        </p>
        <p className="text-xs text-muted-foreground">
          {t("exchangePropertiesCustomDesc")}
        </p>
      </div>
      <div className="space-y-2">
        {FIELDS.map((f) => (
          <FormField
            key={f.name}
            control={form.control}
            name={f.name}
            render={({ field }) => (
              <FormItem className="flex flex-row items-start gap-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    id={`exchange-prop-${f.name}`}
                    className="mt-0.5"
                  />
                </FormControl>
                <label
                  htmlFor={`exchange-prop-${f.name}`}
                  className="flex flex-col gap-0.5 cursor-pointer"
                >
                  <span className="text-sm font-medium text-foreground">
                    {t(f.labelKey)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {t(f.descKey)}
                  </span>
                </label>
              </FormItem>
            )}
          />
        ))}
      </div>
    </div>
  );
};
