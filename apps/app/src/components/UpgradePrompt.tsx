/**
 * Upgrade Prompt Component
 * Shows a non-dismissible overlay prompting users to upgrade to Enterprise Edition
 */

import { AlertCircle, Lock } from "lucide-react";

import { getFeatureDescription, type PremiumFeature } from "@/lib/featureFlags";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface UpgradePromptProps {
  feature: PremiumFeature;
  message?: string;
  className?: string;
}

export function UpgradePrompt({
  feature,
  message,
  className,
}: UpgradePromptProps) {
  const featureName = getFeatureDescription(feature);
  const defaultMessage = `Upgrade to Enterprise Edition to unlock ${featureName}.`;

  return (
    <div
      className={`absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-xs ${className || ""}`}
    >
      <Card className="w-full max-w-md border-2">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Premium Feature</CardTitle>
          </div>
          <CardDescription>{message || defaultMessage}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-3 rounded-lg border bg-muted/50 p-4">
            <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium">Enterprise Edition Required</p>
              <p className="text-sm text-muted-foreground">
                This feature is available in Enterprise Edition. Upgrade to
                unlock workspace management, alerting, and advanced
                integrations.
              </p>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button
            variant="default"
            className="flex-1"
            onClick={() => {
              // Navigate to upgrade page or open upgrade modal
              window.location.href = "/plans";
            }}
          >
            View Plans
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              // Could open a contact/sales modal
              window.open("https://qarote.io/contact", "_blank");
            }}
          >
            Contact Sales
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
