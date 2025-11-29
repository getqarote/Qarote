import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { format } from "date-fns";
import { CheckCircle, Copy, Download, XCircle } from "lucide-react";
import { toast } from "sonner";

import { type License, licenseClient } from "@/lib/api";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const LicenseManagement = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["licenses"],
    queryFn: () => licenseClient.getLicenses(),
  });

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = (text: string, licenseId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(licenseId);
    toast.success("License key copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownload = async (licenseId: string) => {
    try {
      const blob = await licenseClient.downloadLicense(licenseId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `license-${licenseId}.txt`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("License downloaded");
    } catch (error) {
      toast.error("Failed to download license");
    }
  };

  if (isLoading) {
    return <div>Loading licenses...</div>;
  }

  const licenses = data?.licenses || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">My Licenses</h1>
          <p className="text-muted-foreground mt-2">
            Manage your RabbitHQ self-hosted licenses
          </p>
        </div>
        <Link to="/purchase">
          <Button>Purchase New License</Button>
        </Link>
      </div>

      {licenses.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              You don't have any licenses yet.
            </p>
            <Link to="/purchase">
              <Button>Purchase Your First License</Button>
            </Link>
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
                      {license.tier} License
                      {license.isActive ? (
                        <CheckCircle className="h-5 w-5 icon-success" />
                      ) : (
                        <XCircle className="h-5 w-5 icon-destructive" />
                      )}
                    </CardTitle>
                    <CardDescription>
                      {license.expiresAt
                        ? `Expires: ${format(
                            new Date(license.expiresAt),
                            "PPP"
                          )}`
                        : "No expiration"}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      License Key
                    </label>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="flex-1 px-3 py-2 bg-muted rounded-md text-sm font-mono break-all">
                        {license.licenseKey}
                      </code>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() =>
                          copyToClipboard(license.licenseKey, license.id)
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
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => handleDownload(license.id)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
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
