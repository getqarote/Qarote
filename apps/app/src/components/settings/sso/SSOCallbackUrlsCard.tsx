import { useTranslation } from "react-i18next";

import { Copy } from "lucide-react";

import { Button } from "@/components/ui/button";

import { copyToClipboard } from "./ssoHelpers";
import type { SSOProviderType } from "./types";

interface SSOCallbackUrlsCardProps {
  type: SSOProviderType;
  /**
   * OIDC callback URL. Empty string when no provider exists yet
   * (setup mode before first save) — in that case, the card
   * returns null so we don't ship a card full of empty chrome.
   */
  oidcCallbackUrl: string;
  /**
   * SAML2 ACS URL. Same empty-string semantics as `oidcCallbackUrl`.
   */
  samlAcsUrl: string;
}

/**
 * Shows the callback URLs the operator must register at their IdP.
 * Returns **null** when neither URL is available yet — the previous
 * version shipped a card containing a single "save first" sentence,
 * which was chrome without content. Now the card only appears once
 * there's something actionable inside.
 *
 * In edit mode this card renders prominently near the top of the
 * form — operators editing existing SSO config usually came here
 * to copy these values into their IdP, not to change fields.
 */
export function SSOCallbackUrlsCard({
  type,
  oidcCallbackUrl,
  samlAcsUrl,
}: SSOCallbackUrlsCardProps) {
  const { t } = useTranslation("sso");

  const hasAnyUrl = Boolean(oidcCallbackUrl || samlAcsUrl);
  if (!hasAnyUrl) return null;

  const activeUrl = type === "oidc" ? oidcCallbackUrl : samlAcsUrl;
  const activeLabel =
    type === "oidc" ? t("oidcCallbackLabel") : t("samlAcsLabel");

  if (!activeUrl) return null;

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="px-4 py-3 bg-muted/30 border-b border-border">
        <h2 className="title-section">{t("urls")}</h2>
        <p className="text-sm text-muted-foreground">{t("urlsDescription")}</p>
      </div>
      <div className="p-4">
        <UrlRow label={activeLabel} url={activeUrl} />
      </div>
    </div>
  );
}

function UrlRow({ label, url }: { label: string; url: string }) {
  const { t } = useTranslation("sso");

  return (
    <div className="space-y-2">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="flex items-center gap-2">
        <code className="flex-1 rounded-md border bg-muted/50 px-3 py-2 text-xs font-mono break-all text-foreground">
          {url}
        </code>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0"
          onClick={() => copyToClipboard(url, t)}
          aria-label={t("copyToClipboard")}
        >
          <Copy className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
          {t("copyToClipboard")}
        </Button>
      </div>
    </div>
  );
}
