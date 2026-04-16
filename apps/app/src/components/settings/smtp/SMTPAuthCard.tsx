import { useTranslation } from "react-i18next";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import type { SMTPFormValues } from "./types";

interface SMTPAuthCardProps {
  values: Pick<SMTPFormValues, "user" | "pass">;
  onChange: (patch: Partial<SMTPFormValues>) => void;
}

/**
 * Basic username/password authentication card. Admins using OAuth2
 * instead (see `SMTPOAuth2Card`) leave these blank.
 */
export function SMTPAuthCard({ values, onChange }: SMTPAuthCardProps) {
  const { t } = useTranslation("smtp");

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="px-4 py-3 bg-muted/30 border-b border-border">
        <h2 className="title-section">{t("authentication")}</h2>
        <p className="text-sm text-muted-foreground">
          {t("authenticationDescription")}
        </p>
      </div>
      <div className="p-4 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="smtp-user">{t("user")}</Label>
          <Input
            id="smtp-user"
            placeholder={t("userPlaceholder")}
            value={values.user}
            onChange={(e) => onChange({ user: e.target.value })}
            autoComplete="off"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="smtp-pass">{t("pass")}</Label>
          <Input
            id="smtp-pass"
            type="password"
            placeholder={t("passPlaceholder")}
            value={values.pass}
            onChange={(e) => onChange({ pass: e.target.value })}
            autoComplete="new-password"
          />
        </div>
      </div>
    </div>
  );
}
