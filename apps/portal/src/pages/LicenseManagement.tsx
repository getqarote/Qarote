import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router";

import { differenceInDays, format, formatDistanceToNow } from "date-fns";
import {
  AlertTriangle,
  Bell,
  Check,
  CheckCheck,
  Copy,
  Download,
  Lock,
  RefreshCw,
  Server,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { track } from "@/lib/analytics";
import { getDateFnsLocale } from "@/lib/dateFnsLocale";
import { type License } from "@/lib/types";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { useLicenses, useRegenerateLicense } from "@/hooks/queries/useLicenses";

// A license is "expiring soon" when it is still active but within this window.
const EXPIRING_SOON_DAYS = 30;

type LicenseStatus = "active" | "expiring" | "expired";

const getLicenseStatus = (license: License): LicenseStatus => {
  if (!license.isActive) return "expired";
  const days = differenceInDays(new Date(license.expiresAt), new Date());
  return days <= EXPIRING_SOON_DAYS ? "expiring" : "active";
};

const LicenseManagement = () => {
  const { data, isLoading, isError, refetch } = useLicenses();
  const { t, i18n } = useTranslation("portal");
  const dateLocale = getDateFnsLocale(i18n.language);
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const [confirmingRegenId, setConfirmingRegenId] = useState<string | null>(
    null
  );
  const regenerate = useRegenerateLicense();

  const handleRegenerate = (licenseId: string) => {
    regenerate.mutate(
      { licenseId },
      {
        onSuccess: () => {
          try {
            track("license_key_regenerated");
          } catch {
            // non-blocking analytics
          }
          toast.success(t("licenseManagement.regenerate.success"));
          setConfirmingRegenId(null);
          // Refetch so the card shows the freshly-rotated JWT.
          refetch();
        },
        onError: () => {
          toast.error(t("licenseManagement.regenerate.failed"));
        },
      }
    );
  };

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
        try {
          track("license_key_copied");
        } catch {
          // non-blocking analytics
        }
        toast.success(t("licenseManagement.copiedToClipboard"));
        setCopiedId(licenseId);
        setTimeout(() => setCopiedId(null), 2000);
      })
      .catch(() => {
        toast.error(t("licenseManagement.copyFailed"));
      });
  };

  const downloadKey = (text: string) => {
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "qarote-license.jwt";
    anchor.click();
    URL.revokeObjectURL(url);
    try {
      track("license_key_downloaded");
    } catch {
      // non-blocking analytics
    }
  };

  const toggleKey = (licenseId: string) => {
    const isExpanding = !expandedKeys.has(licenseId);
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(licenseId)) next.delete(licenseId);
      else next.add(licenseId);
      return next;
    });
    try {
      track("license_key_revealed", {
        action: isExpanding ? "show" : "hide",
      });
    } catch {
      // non-blocking analytics
    }
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
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <p className="font-medium">{t("licenseManagement.noLicenses")}</p>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {t("licenseManagement.noLicensesValue")}
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
            const status = getLicenseStatus(license);
            const validUntil = format(new Date(license.expiresAt), "PPP", {
              locale: dateLocale,
            });
            const daysLeft = differenceInDays(
              new Date(license.expiresAt),
              new Date()
            );

            return (
              <Card key={license.id}>
                <CardHeader>
                  <div className="space-y-1.5">
                    <CardTitle className="flex items-center gap-2">
                      {t("licenseManagement.licenseOfTier", {
                        tier: tierLabel,
                      })}
                      {status === "active" && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-success bg-success/10 px-2 py-0.5 rounded-full">
                          <ShieldCheck className="h-3 w-3" />
                          {t("licenseManagement.status.active")}
                        </span>
                      )}
                      {status === "expiring" && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-warning bg-warning/10 px-2 py-0.5 rounded-full">
                          <Bell className="h-3 w-3" />
                          {t("licenseManagement.status.expiring")}
                        </span>
                      )}
                      {status === "expired" && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-destructive bg-destructive/10 px-2 py-0.5 rounded-full">
                          <XCircle className="h-3 w-3" />
                          {t("licenseManagement.status.expired")}
                        </span>
                      )}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {t("licenseManagement.cardSubtitle", { id: license.id })}
                    </p>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {status === "expiring" && (
                    <div className="rounded-md bg-warning/5 border border-warning/30 px-4 py-3 flex items-center justify-between gap-4">
                      <div className="flex items-start gap-2.5">
                        <Bell className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                        <p className="text-sm text-foreground">
                          {t("licenseManagement.expiringNudge", {
                            count: Math.max(daysLeft, 0),
                            date: validUntil,
                          })}
                        </p>
                      </div>
                      <Link to="/purchase">
                        <Button size="sm" className="shrink-0">
                          {t("licenseManagement.renewLicense")}
                        </Button>
                      </Link>
                    </div>
                  )}

                  {status === "expired" && (
                    <div className="rounded-md bg-destructive/5 border border-destructive/20 px-4 py-3 flex items-center justify-between gap-4">
                      <div className="flex items-start gap-2.5">
                        <Lock className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                        <p className="text-sm text-destructive">
                          {license.expiresAt
                            ? t("licenseManagement.expiredNudge", {
                                date: validUntil,
                              })
                            : t("licenseManagement.expiredNoDate")}
                        </p>
                      </div>
                      <Link to="/purchase">
                        <Button
                          size="sm"
                          variant="outline"
                          className="shrink-0"
                        >
                          {t("licenseManagement.renewNow")}
                        </Button>
                      </Link>
                    </div>
                  )}

                  <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2 text-sm">
                    <div className="flex justify-between gap-4 border-b border-border py-1.5">
                      <dt className="text-muted-foreground">
                        {t("licenseManagement.meta.tier")}
                      </dt>
                      <dd className="font-medium">{tierLabel}</dd>
                    </div>
                    <div className="flex justify-between gap-4 border-b border-border py-1.5">
                      <dt className="text-muted-foreground">
                        {t("licenseManagement.meta.validUntil")}
                      </dt>
                      <dd className="font-medium">{validUntil}</dd>
                    </div>
                    <div className="flex justify-between gap-4 border-b border-border py-1.5">
                      <dt className="text-muted-foreground">
                        {t("licenseManagement.meta.issued")}
                      </dt>
                      <dd className="font-medium">
                        {format(new Date(license.createdAt), "PPP", {
                          locale: dateLocale,
                        })}
                      </dd>
                    </div>
                    {license.lastValidatedAt && (
                      <div className="flex justify-between gap-4 border-b border-border py-1.5">
                        <dt className="text-muted-foreground">
                          {t("licenseManagement.meta.lastValidated")}
                        </dt>
                        <dd
                          className="font-medium"
                          title={formatDistanceToNow(
                            new Date(license.lastValidatedAt),
                            { addSuffix: true, locale: dateLocale }
                          )}
                        >
                          {format(new Date(license.lastValidatedAt), "PPP", {
                            locale: dateLocale,
                          })}
                        </dd>
                      </div>
                    )}
                  </dl>

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
                      <div className="flex shrink-0 gap-2 mt-0.5">
                        <Button
                          variant="outline"
                          size="icon"
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
                        <Button
                          variant="outline"
                          size="icon"
                          aria-label={t("licenseManagement.downloadKey")}
                          onClick={() => downloadKey(keyValue)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {status !== "expired" &&
                    (confirmingRegenId === license.id ? (
                      <div className="rounded-md border border-warning/30 bg-warning/5 px-4 py-3 space-y-2.5">
                        <p className="text-sm text-foreground">
                          {t("licenseManagement.regenerate.warning")}
                        </p>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleRegenerate(license.id)}
                            disabled={regenerate.isPending}
                          >
                            {regenerate.isPending && (
                              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                            )}
                            {regenerate.isPending
                              ? t("licenseManagement.regenerate.pending")
                              : t("licenseManagement.regenerate.confirm")}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setConfirmingRegenId(null)}
                            disabled={regenerate.isPending}
                          >
                            {t("licenseManagement.regenerate.cancel")}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setConfirmingRegenId(license.id)}
                      >
                        <RefreshCw className="h-4 w-4" />
                        {t("licenseManagement.regenerate.button")}
                      </Button>
                    ))}

                  <p className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Server className="h-3.5 w-3.5 shrink-0" />
                    <span>
                      {t("licenseManagement.pasteInstruction")}{" "}
                      <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-foreground">
                        {t("licenseManagement.pasteLocation")}
                      </code>
                    </span>
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
