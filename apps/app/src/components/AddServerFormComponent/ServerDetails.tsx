import { useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PixelChevronDown } from "@/components/ui/pixel-chevron-down";
import { Switch } from "@/components/ui/switch";

import type { AddServerFormData } from "@/schemas";

interface ServerDetailsProps {
  form: UseFormReturn<AddServerFormData>;
  /** When true, render the fields inline without the disclosure toggle. */
  alwaysExpanded?: boolean;
  /** Hide the server name field (shown in step 2 for add mode). */
  hideNameField?: boolean;
  /** Hide the virtual host field (shown in step 2 for add mode). */
  hideVhostField?: boolean;
}

export const ServerDetails = ({
  form,
  alwaysExpanded = false,
  hideNameField = false,
  hideVhostField = false,
}: ServerDetailsProps) => {
  const { t } = useTranslation("dashboard");
  const [expanded, setExpanded] = useState(alwaysExpanded);
  const [showPassword, setShowPassword] = useState(false);

  const isOpen = alwaysExpanded || expanded;

  const fields = (
    <div className="space-y-4">
      {!hideNameField && (
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("serverName")}</FormLabel>
              <FormControl>
                <Input placeholder={t("serverNamePlaceholder")} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      <FormField
        control={form.control}
        name="host"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("host")}</FormLabel>
            <FormControl>
              <Input
                placeholder={t("hostPlaceholder")}
                {...field}
                onChange={(e) => {
                  const value = e.target.value;
                  field.onChange(value);
                  const lowerValue = value.toLowerCase();
                  const isTunnel =
                    lowerValue.includes("ngrok") ||
                    lowerValue.includes("localtunnel") ||
                    lowerValue.includes("loca.lt");

                  if (isTunnel) {
                    form.setValue("useHttps", true);
                    const currentPort = form.getValues("port");
                    if (currentPort === 15672 || currentPort === 15671) {
                      form.setValue("port", 443);
                    }
                  }
                }}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="port"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("managementApiPort")}</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="15672"
                  {...field}
                  onChange={(e) => {
                    const port = parseInt(e.target.value) || 0;
                    field.onChange(port);
                    if ([443, 15671, 8443, 9443].includes(port)) {
                      form.setValue("useHttps", true);
                    } else if ([80, 15672, 8080, 9090].includes(port)) {
                      form.setValue("useHttps", false);
                    }
                  }}
                />
              </FormControl>
              <p className="text-xs text-muted-foreground mt-1">
                {t("managementApiPortHint")}
              </p>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="amqpPort"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("amqpPort")}</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="5672"
                  {...field}
                  onChange={(e) => {
                    const port = parseInt(e.target.value) || 0;
                    field.onChange(port);
                  }}
                />
              </FormControl>
              <p className="text-xs text-muted-foreground mt-1">
                {t("amqpPortHint")}
              </p>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="useHttps"
        render={({ field }) => (
          <FormItem className="flex items-start gap-3 space-y-0 rounded-lg border border-border p-3">
            <FormControl>
              <Switch
                checked={field.value}
                onCheckedChange={field.onChange}
                id="use-https"
              />
            </FormControl>
            <div className="flex flex-col gap-0.5">
              <Label
                htmlFor="use-https"
                className="text-sm font-medium cursor-pointer"
              >
                {t("useHttps")}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t("useHttpsHint")}
              </p>
            </div>
          </FormItem>
        )}
      />

      {!hideVhostField && (
        <FormField
          control={form.control}
          name="vhost"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("virtualHost")}</FormLabel>
              <FormControl>
                <Input placeholder="/" {...field} />
              </FormControl>
              <p className="text-xs text-muted-foreground mt-1">
                {t("virtualHostHint")}
              </p>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      <div className="space-y-3">
        <p className="text-sm font-medium text-foreground">
          {t("authentication")}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("usernameLabel")}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t("usernamePlaceholder")}
                    autoComplete="username"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("passwordLabel")}</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      {...field}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={
                        showPassword ? t("hidePassword") : t("showPassword")
                      }
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>
    </div>
  );

  if (alwaysExpanded) {
    return fields;
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        aria-expanded={isOpen}
      >
        <PixelChevronDown
          className={`h-3 w-auto shrink-0 transition-transform ${isOpen ? "rotate-0" : "-rotate-90"}`}
        />
        {isOpen ? t("manualSetupHide") : t("manualSetupShow")}
      </button>
      {isOpen && <div className="pt-1">{fields}</div>}
    </div>
  );
};
