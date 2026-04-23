import { useTranslation } from "react-i18next";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import type { SMTPFormValues } from "./types";

interface SMTPOAuth2CardProps {
  values: Pick<
    SMTPFormValues,
    "service" | "oauthClientId" | "oauthClientSecret" | "oauthRefreshToken"
  >;
  onChange: (patch: Partial<SMTPFormValues>) => void;
}

/**
 * OAuth2 configuration card for providers that don't accept plain
 * username/password authentication (most notably Gmail + Google
 * Workspace). Admins who use OAuth2 fill this instead of the
 * `SMTPAuthCard` fields. Links out to nodemailer's OAuth2 docs
 * because the setup is involved enough to warrant the hop.
 */
export function SMTPOAuth2Card({ values, onChange }: SMTPOAuth2CardProps) {
  const { t } = useTranslation("smtp");

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="px-4 py-3 bg-muted/30 border-b border-border">
        <h2 className="title-section">{t("oauth2")}</h2>
        <p className="text-sm text-muted-foreground">
          {t("oauth2DescriptionPrefix")}{" "}
          <a
            href="https://nodemailer.com/smtp/oauth2/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline underline-offset-2 hover:text-primary/80"
          >
            {t("oauth2DescriptionLink")}
          </a>
          {t("oauth2DescriptionSuffix")}
        </p>
      </div>
      <div className="p-4 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="smtp-service">{t("service")}</Label>
          <Input
            id="smtp-service"
            placeholder={t("servicePlaceholder")}
            value={values.service}
            onChange={(e) => onChange({ service: e.target.value })}
            autoComplete="off"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="oauth-client-id">{t("oauthClientId")}</Label>
          <Input
            id="oauth-client-id"
            placeholder={t("oauthClientIdPlaceholder")}
            value={values.oauthClientId}
            onChange={(e) => onChange({ oauthClientId: e.target.value })}
            autoComplete="off"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="oauth-client-secret">{t("oauthClientSecret")}</Label>
          <Input
            id="oauth-client-secret"
            type="password"
            placeholder={t("oauthClientSecretPlaceholder")}
            value={values.oauthClientSecret}
            onChange={(e) => onChange({ oauthClientSecret: e.target.value })}
            autoComplete="new-password"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="oauth-refresh-token">{t("oauthRefreshToken")}</Label>
          <Input
            id="oauth-refresh-token"
            type="password"
            placeholder={t("oauthRefreshTokenPlaceholder")}
            value={values.oauthRefreshToken}
            onChange={(e) => onChange({ oauthRefreshToken: e.target.value })}
            autoComplete="new-password"
          />
        </div>
      </div>
    </div>
  );
}
