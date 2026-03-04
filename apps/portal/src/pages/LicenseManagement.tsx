import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { format } from "date-fns";
import { CheckCircle, Copy, XCircle } from "lucide-react";
import { toast } from "sonner";

import { trpc } from "@/lib/trpc/client";
import { type License } from "@/lib/types";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const LicenseManagement = () => {
  const { data, isLoading } = trpc.license.getLicenses.useQuery();
  const { t } = useTranslation("portal");

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = (text: string, licenseId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(licenseId);
    toast.success(t("licenseManagement.copiedToClipboard"));
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (isLoading) {
    return <div>{t("licenseManagement.loadingLicenses")}</div>;
  }

  const licenses = data?.licenses || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{t("licenseManagement.title")}</h1>
          <p className="text-muted-foreground mt-2">
            {t("licenseManagement.description")}
          </p>
        </div>
        <Link to="/purchase">
          <Button>{t("licenseManagement.purchaseNew")}</Button>
        </Link>
      </div>

      {licenses.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {t("licenseManagement.noLicenses")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {licenses.map((license: License) => (
            <Card key={license.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {license.tier} {t("licenseManagement.license")}
                      {license.isActive ? (
                        <CheckCircle className="h-5 w-5 icon-success" />
                      ) : (
                        <XCircle className="h-5 w-5 icon-destructive" />
                      )}
                    </CardTitle>
                    <CardDescription>
                      {license.expiresAt
                        ? t("licenseManagement.expires", {
                            date: format(new Date(license.expiresAt), "PPP"),
                          })
                        : t("licenseManagement.noExpiration")}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      {t("licenseManagement.licenseKey")}
                    </label>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="flex-1 px-3 py-2 bg-muted rounded-md text-sm font-mono break-all max-h-24 overflow-y-auto">
                        {license.jwtContent ?? license.licenseKey}
                      </code>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() =>
                          copyToClipboard(
                            license.jwtContent ?? license.licenseKey,
                            license.id
                          )
                        }
                      >
                        {copiedId === license.id ? (
                          <CheckCircle className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default LicenseManagement;
