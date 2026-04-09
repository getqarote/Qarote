import { useId } from "react";
import { useTranslation } from "react-i18next";

import { isCloudMode } from "@/lib/featureFlags";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SSODomainCardProps {
  value: string;
  onChange: (value: string) => void;
}

/**
 * Email domain routing card, only rendered in cloud mode. Self-hosted
 * deployments don't need this — their SSO is always for a single
 * tenant, so domain routing is meaningless. Returns null in
 * self-hosted mode so the caller can render it unconditionally.
 */
export function SSODomainCard({ value, onChange }: SSODomainCardProps) {
  const { t } = useTranslation("sso");
  const fieldId = useId();

  if (!isCloudMode()) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("displaySettings")}</CardTitle>
        <CardDescription>{t("displaySettingsDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Label htmlFor={`${fieldId}-domain`}>
            {t("domain", { defaultValue: "Email Domain" })}
          </Label>
          <Input
            id={`${fieldId}-domain`}
            placeholder="acme.com"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            {t("domainDescription", {
              defaultValue:
                "Users with this email domain will be routed to your SSO provider.",
            })}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
