import { useState } from "react";
import { Navigate } from "react-router";

import { usePostHog } from "@posthog/react";
import {
  CheckCircle,
  ExternalLink,
  KeyRound,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { UserRole } from "@/lib/api";
import { isSelfHostedMode } from "@/lib/featureFlags";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

import { useAuth } from "@/contexts/AuthContextDefinition";

import {
  useActivateLicense,
  useDeactivateLicense,
  useLicenseStatus,
} from "@/hooks/queries/useLicenseManagement";

const LicenseSection = () => {
  const { user } = useAuth();
  const posthog = usePostHog();
  const [licenseKey, setLicenseKey] = useState("");

  const { data: status, isLoading } = useLicenseStatus();

  const activateMutation = useActivateLicense({
    onSuccess: (data) => {
      posthog?.capture("license_activated", { tier: data.tier });
      toast.success(`License activated — ${data.tier} tier`);
      setLicenseKey("");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to activate license");
    },
  });

  const deactivateMutation = useDeactivateLicense({
    onSuccess: () => {
      toast.success("License deactivated");
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

  if (!isSelfHostedMode() || (user && user.role !== UserRole.ADMIN)) {
    return <Navigate to="/settings/profile" replace />;
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const hasLicense = status?.active && status.license;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <KeyRound className="h-6 w-6" />
        <h2 className="text-xl font-semibold">License</h2>
      </div>

      {/* Current License Status */}
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b border-border">
          <div>
            <h2 className="title-section flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-muted-foreground" />
              License Status
            </h2>
            <p className="text-sm text-muted-foreground">
              {hasLicense
                ? "Your instance has an active license with premium features enabled."
                : "Activate a license to unlock premium features."}
            </p>
          </div>
          {hasLicense ? (
            <Badge className="bg-success-muted text-success hover:bg-success-muted">
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

        {hasLicense && status.license && (
          <div className="p-4">
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
          </div>
        )}

        {hasLicense && (
          <div className="px-4 py-3 border-t border-border">
            <Button
              variant="destructive-outline"
              size="sm"
              onClick={handleDeactivate}
              disabled={deactivateMutation.isPending}
            >
              {deactivateMutation.isPending
                ? "Deactivating..."
                : "Deactivate License"}
            </Button>
          </div>
        )}
      </div>

      {/* Activate License */}
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="px-4 py-3 bg-muted/30 border-b border-border">
          <h2 className="title-section">
            {hasLicense ? "Replace License" : "Activate License"}
          </h2>
          <p className="text-sm text-muted-foreground">
            Paste your license key below. You can get one from the{" "}
            <a
              href={`${import.meta.env.VITE_PORTAL_URL}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-1"
            >
              Qarote Portal
              <ExternalLink className="h-3 w-3" />
            </a>
            .
          </p>
        </div>
        <div className="p-4">
          <Textarea
            placeholder="Paste your license key here (eyJ...)"
            value={licenseKey}
            onChange={(e) => setLicenseKey(e.target.value)}
            rows={4}
            className="font-mono text-sm"
          />
        </div>
        <div className="flex justify-between px-4 py-3 border-t border-border">
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
            <Button variant="ghost" size="sm" onClick={() => setLicenseKey("")}>
              Clear
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default LicenseSection;
