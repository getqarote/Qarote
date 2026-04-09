import { useTranslation } from "react-i18next";

import { AlertCircle, Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { copyToClipboard } from "./ssoHelpers";
import type { SSOProviderType } from "./types";

interface SSOCallbackUrlsCardProps {
  type: SSOProviderType;
  /**
   * OIDC callback URL. Empty string when no provider exists yet
   * (setup mode before first save) — the card shows a "save first"
   * placeholder in that case.
   */
  oidcCallbackUrl: string;
  /**
   * SAML2 ACS URL. Same empty-string semantics as `oidcCallbackUrl`.
   */
  samlAcsUrl: string;
}

/**
 * Displays the callback URLs the operator must register at their
 * IdP. Has two render modes:
 *
 *   - **Pre-save** (no URLs yet, because the provider doesn't exist):
 *     shows a muted placeholder telling the operator to save first
 *   - **Post-save**: shows the appropriate URL for the current type
 *     (OIDC or SAML) inside a `<code>` block with a copy button
 *
 * The card renders nothing at all when there's no API URL configured,
 * because the URLs would be empty and the copy button would be
 * meaningless.
 */
export function SSOCallbackUrlsCard({
  type,
  oidcCallbackUrl,
  samlAcsUrl,
}: SSOCallbackUrlsCardProps) {
  const { t } = useTranslation("sso");

  const hasAnyUrl = Boolean(oidcCallbackUrl || samlAcsUrl);
  const activeUrl = type === "oidc" ? oidcCallbackUrl : samlAcsUrl;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("urls")}</CardTitle>
        <CardDescription>{t("urlsDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        {!hasAnyUrl ? (
          <p className="text-sm text-muted-foreground">
            {t("urlsAfterSave", {
              defaultValue:
                "Callback URLs will be available after saving your provider configuration.",
            })}
          </p>
        ) : (
          <div className="rounded-lg border p-4 space-y-3 bg-muted/50">
            <div className="flex items-center gap-2 text-sm font-medium">
              <AlertCircle className="h-4 w-4" aria-hidden="true" />
              {t("registerInIdP")}
            </div>
            {activeUrl && <UrlRow url={activeUrl} />}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function UrlRow({ url }: { url: string }) {
  const { t } = useTranslation("sso");

  return (
    <div className="flex items-center gap-2">
      <code className="text-xs bg-background px-2 py-1 rounded flex-1 font-mono break-all">
        {url}
      </code>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0"
        onClick={() => copyToClipboard(url, t)}
        aria-label={t("copyToClipboard")}
      >
        <Copy className="h-3.5 w-3.5" aria-hidden="true" />
      </Button>
    </div>
  );
}
