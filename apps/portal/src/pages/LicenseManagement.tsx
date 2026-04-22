import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router";

import { format, formatDistanceToNow } from "date-fns";
import {
  AlertTriangle,
  Check,
  CheckCheck,
  Copy,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { getDateFnsLocale } from "@/lib/dateFnsLocale";
import { type License } from "@/lib/types";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { useLicenses } from "@/hooks/queries/useLicenses";

const LicenseManagement = () => {
  const { data, isLoading, isError, refetch } = useLicenses();
  const { t, i18n } = useTranslation("portal");
  const dateLocale = getDateFnsLocale(i18n.language);
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

  // Strip ?session_id= from URL after rendering the banner once
  useEffect(() => {
    if (sessionId) {
      window.history.replaceState({}, "", "/licenses");
    }
  }, [sessionId]);

  const copyToClipboard = (text: string, licenseId: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        toast.success(t("licenseManagement.copiedToClipboard"));
        setCopiedId(licenseId);
        setTimeout(() => setCopiedId(null), 2000);
      })
      .catch(() => {
        toast.error(t("licenseManagement.copyFailed"));
      });
  };

  const toggleKey = (licenseId: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(licenseId)) next.delete(licenseId);
      else next.add(licenseId);
      return next;
    });
  };

  if (isLoading) {
    return (
      <div
        className="space-y-6"
        role="status"
        aria-live="polite"
        aria-label={t("licenseManagement.loadingLicenses")}
      >
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-muted rounded animate-pulse" />
            <div className="h-4 w-72 bg-muted rounded animate-pulse" />
          </div>
          <div className="h-9 w-40 bg-muted rounded animate-pulse" />
        </div>
        <div className="grid gap-4">
          {[0, 1].map((i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-6 w-56 bg-muted rounded animate-pulse" />
                <div className="h-4 w-40 bg-muted rounded animate-pulse mt-1" />
              </CardHeader>
              <CardContent>
                <div className="h-4 w-24 bg-muted rounded animate-pulse mb-2" />
                <div className="h-10 w-full bg-muted rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="title-page">{t("licenseManagement.title")}</h1>
            <p className="text-muted-foreground mt-1 max-w-prose">
              {t("licenseManagement.description")}
            </p>
          </div>
          <Link to="/purchase">
            <Button>{t("licenseManagement.purchaseNew")}</Button>
          </Link>
        </div>
        <Card>
          <CardContent className="py-10 text-center space-y-3">
            <AlertTriangle className="h-7 w-7 icon-destructive mx-auto" />
            <p className="font-medium">
              {t("licenseManagement.errorLoadingLicenses")}
            </p>
            <Button variant="outline" onClick={() => refetch()}>
              {t("licenseManagement.retryLoading")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const licenses = data?.licenses ?? [];

  const TIER_LABELS: Record<string, string> = {
    DEVELOPER: t("licenseManagement.tier.developer"),
    ENTERPRISE: t("licenseManagement.tier.enterprise"),
    FREE: t("licenseManagement.tier.free"),
  };

  return (
    <div className="space-y-6">
      {sessionId && (
        <div className="rounded-lg bg-success/10 border border-success/30 px-4 py-3 flex items-start gap-3">
          <CheckCheck className="h-5 w-5 text-success shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-success">
              {t("licenseManagement.purchaseSuccess")}
            </p>
            <p className="text-sm text-success/70 mt-0.5">
              {t("licenseManagement.purchaseSuccessSubtitle")}
            </p>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h1 className="title-page">{t("licenseManagement.title")}</h1>
          <p className="text-muted-foreground mt-1 max-w-prose">
            {t("licenseManagement.description")}
          </p>
        </div>
        {licenses.length > 0 && (
          <Link to="/purchase">
            <Button>{t("licenseManagement.purchaseNew")}</Button>
          </Link>
        )}
      </div>

      {licenses.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center space-y-3">
            <p className="font-medium">{t("licenseManagement.noLicenses")}</p>
            <p className="text-sm text-muted-foreground">
              {t("licenseManagement.noLicensesHint")}
            </p>
            <Link to="/purchase" className="inline-block mt-1">
              <Button>{t("licenseManagement.purchaseNew")}</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {licenses.map((license: License) => {
            const keyValue = license.jwtContent ?? license.licenseKey;
            const isExpanded = expandedKeys.has(license.id);
            const isCopied = copiedId === license.id;
            const tierLabel = TIER_LABELS[license.tier] ?? license.tier;

            return (
              <Card key={license.id}>
                <CardHeader>
                  <div className="space-y-1.5">
                    <CardTitle className="flex items-center gap-2">
                      {tierLabel} {t("licenseManagement.license")}
                      {license.isActive ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-success bg-success/10 px-2 py-0.5 rounded-full">
                          <ShieldCheck className="h-3 w-3" />
                          {t("licenseManagement.status.active")}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-destructive bg-destructive/10 px-2 py-0.5 rounded-full">
                          <XCircle className="h-3 w-3" />
                          {t("licenseManagement.status.inactive")}
                        </span>
                      )}
                    </CardTitle>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-muted-foreground">
                      <span>
                        {license.expiresAt
                          ? t("licenseManagement.expires", {
                              date: format(new Date(license.expiresAt), "PPP", {
                                locale: dateLocale,
                              }),
                            })
                          : t("licenseManagement.noExpiration")}
                      </span>
                      <span>
                        {t("licenseManagement.purchasedOn", {
                          date: format(new Date(license.createdAt), "PPP", {
                            locale: dateLocale,
                          }),
                        })}
                      </span>
                      {license.lastValidatedAt && (
                        <span
                          title={formatDistanceToNow(
                            new Date(license.lastValidatedAt),
                            { addSuffix: true, locale: dateLocale }
                          )}
                        >
                          {t("licenseManagement.lastValidated", {
                            date: format(
                              new Date(license.lastValidatedAt),
                              "PPP",
                              { locale: dateLocale }
                            ),
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!license.isActive && (
                    <div className="rounded-md bg-destructive/5 border border-destructive/20 px-4 py-3 flex items-center justify-between gap-4">
                      <p className="text-sm text-destructive">
                        {license.expiresAt
                          ? t("licenseManagement.expiredOn", {
                              date: format(new Date(license.expiresAt), "PPP", {
                                locale: dateLocale,
                              }),
                            })
                          : t("licenseManagement.expiredNoDate")}
                      </p>
                      <Link to="/purchase">
                        <Button
                          size="sm"
                          variant="outline"
                          className="shrink-0"
                        >
                          {t("licenseManagement.renewLicense")}
                        </Button>
                      </Link>
                    </div>
                  )}

                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {t("licenseManagement.licenseKey")}
                    </p>
                    <div className="flex items-start gap-2 mt-1">
                      <div className="flex-1 space-y-1 min-w-0">
                        <code
                          className={`block px-3 py-2 bg-muted rounded-md text-sm font-mono break-all transition-all duration-200 ${
                            isExpanded ? "" : "max-h-12 overflow-hidden"
                          }`}
                        >
                          {keyValue}
                        </code>
                        <button
                          type="button"
                          onClick={() => toggleKey(license.id)}
                          className="text-xs text-muted-foreground hover:text-foreground transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                        >
                          {isExpanded
                            ? t("licenseManagement.hideKey")
                            : t("licenseManagement.showFullKey")}
                        </button>
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                        className="shrink-0 mt-0.5"
                        aria-label={
                          isCopied
                            ? t("licenseManagement.copiedToClipboard")
                            : t("licenseManagement.copyLicenseKey")
                        }
                        onClick={() => copyToClipboard(keyValue, license.id)}
                      >
                        {isCopied ? (
                          <Check className="h-4 w-4 icon-success" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    {t("licenseManagement.activationGuide")}{" "}
                    <a
                      href="https://qarote.io/docs"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline underline-offset-2 hover:text-foreground transition-colors"
                    >
                      {t("licenseManagement.activationDocsLink")}
                    </a>
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LicenseManagement;
