import { useTranslation } from "react-i18next";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import type { SMTPFormValues } from "./types";

interface SMTPServerCardProps {
  values: Pick<SMTPFormValues, "host" | "port" | "fromEmail">;
  onChange: (patch: Partial<SMTPFormValues>) => void;
}

/**
 * Server configuration card — SMTP host, port, and From address.
 * The host + port pair sit side-by-side because they're a single
 * conceptual unit (where to connect), and the From address gets
 * its own row because it's a different concern (what address
 * shows up in the recipient's inbox).
 */
export function SMTPServerCard({ values, onChange }: SMTPServerCardProps) {
  const { t } = useTranslation("smtp");

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="px-4 py-3 bg-muted/30 border-b border-border">
        <h2 className="title-section">{t("server")}</h2>
        <p className="text-sm text-muted-foreground">
          {t("serverDescription")}
        </p>
      </div>
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="smtp-host">{t("host")}</Label>
            <Input
              id="smtp-host"
              placeholder={t("hostPlaceholder")}
              value={values.host}
              onChange={(e) => onChange({ host: e.target.value })}
              autoComplete="off"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="smtp-port">{t("port")}</Label>
            <Input
              id="smtp-port"
              type="number"
              value={values.port}
              onChange={(e) => onChange({ port: Number(e.target.value) })}
              className="font-mono tabular-nums"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="from-email">{t("fromEmail")}</Label>
          <Input
            id="from-email"
            type="email"
            placeholder={t("fromEmailPlaceholder")}
            value={values.fromEmail}
            onChange={(e) => onChange({ fromEmail: e.target.value })}
            autoComplete="off"
          />
        </div>
      </div>
    </div>
  );
}
