import { useState } from "react";
import { Navigate } from "react-router";

import {
  CheckCircle,
  ExternalLink,
  KeyRound,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { isSelfHostedMode } from "@/lib/featureFlags";
import { trpc } from "@/lib/trpc/client";

import { AppSidebar } from "@/components/AppSidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Textarea } from "@/components/ui/textarea";

import { useAuth } from "@/contexts/AuthContextDefinition";

function LicensePage() {
  const { user } = useAuth();
  const [licenseKey, setLicenseKey] = useState("");

  const utils = trpc.useUtils();

  const { data: status, isLoading } = trpc.selfhostedLicense.status.useQuery(
    undefined,
    {
      enabled: isSelfHostedMode(),
      staleTime: 30_000,
    }
  );

  const activateMutation = trpc.selfhostedLicense.activate.useMutation({
    onSuccess: (data) => {
      toast.success(`License activated — ${data.tier} tier`);
      setLicenseKey("");
      utils.selfhostedLicense.status.invalidate();
      utils.public.getFeatureFlags.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to activate license");
    },
  });

  const deactivateMutation = trpc.selfhostedLicense.deactivate.useMutation({
    onSuccess: () => {
      toast.success("License deactivated");
      utils.selfhostedLicense.status.invalidate();
      utils.public.getFeatureFlags.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to deactivate license");
    },
  });

  const handleActivate = () => {
    const trimmed = licenseKey.trim();
    if (!trimmed) {
      toast.error("Please paste a license key");
      return;
    }
    activateMutation.mutate({ licenseKey: trimmed });
  };

  const handleDeactivate = () => {
    deactivateMutation.mutate();
  };

  // Only accessible in self-hosted mode by admin users
  if (!isSelfHostedMode() || (user && user.role !== "ADMIN")) {
    return <Navigate to="/" replace />;
  }

  if (isLoading) {
    return (
      <SidebarProvider>
        <div className="page-layout">
          <AppSidebar />
          <main className="main-content-scrollable">
            <div className="container mx-auto p-6">
              <p className="text-muted-foreground">Loading...</p>
            </div>
          </main>
        </div>
      </SidebarProvider>
    );
  }

  const hasLicense = status?.active && status.license;

  return (
    <SidebarProvider>
      <div className="page-layout">
        <AppSidebar />
        <main className="main-content-scrollable">
          <div className="container mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <KeyRound className="h-8 w-8" />
              <h1 className="title-page">License</h1>
            </div>

            {/* Current License Status */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-muted-foreground" />
                    <CardTitle>License Status</CardTitle>
                  </div>
                  {hasLicense ? (
                    <Badge variant="default" className="bg-green-600">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      <XCircle className="h-3 w-3 mr-1" />
                      No License
                    </Badge>
                  )}
                </div>
                <CardDescription>
                  {hasLicense
                    ? "Your instance has an active license with premium features enabled."
                    : "Activate a license to unlock premium features."}
                </CardDescription>
              </CardHeader>

              {hasLicense && status.license && (
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Tier</p>
                      <p className="font-medium">{status.license.tier}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Expires</p>
                      <p className="font-medium">
                        {new Date(status.license.expiresAt).toLocaleDateString(
                          undefined,
                          {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          }
                        )}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Features</p>
                      <div className="flex flex-wrap gap-1">
                        {status.license.features.map((f) => (
                          <Badge key={f} variant="outline" className="text-xs">
                            {f.replace(/_/g, " ")}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              )}

              {hasLicense && (
                <CardFooter>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDeactivate}
                    disabled={deactivateMutation.isPending}
                  >
                    {deactivateMutation.isPending
                      ? "Deactivating..."
                      : "Deactivate License"}
                  </Button>
                </CardFooter>
              )}
            </Card>

            {/* Activate License */}
            <Card>
              <CardHeader>
                <CardTitle>
                  {hasLicense ? "Replace License" : "Activate License"}
                </CardTitle>
                <CardDescription>
                  Paste your license key below. You can get one from the{" "}
                  <a
                    href="https://qarote.io/portal"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1"
                  >
                    Qarote Portal
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  .
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Paste your license key here (eyJ...)"
                  value={licenseKey}
                  onChange={(e) => setLicenseKey(e.target.value)}
                  rows={4}
                  className="font-mono text-sm"
                />
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button
                  onClick={handleActivate}
                  disabled={!licenseKey.trim() || activateMutation.isPending}
                >
                  {activateMutation.isPending
                    ? "Activating..."
                    : hasLicense
                      ? "Replace License"
                      : "Activate License"}
                </Button>
                {licenseKey && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setLicenseKey("")}
                  >
                    Clear
                  </Button>
                )}
              </CardFooter>
            </Card>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}

export default LicensePage;
