import { useTranslation } from "react-i18next";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
    <Card>
      <CardHeader>
        <CardTitle>{t("authentication")}</CardTitle>
        <CardDescription>{t("authenticationDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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
      </CardContent>
    </Card>
  );
}
