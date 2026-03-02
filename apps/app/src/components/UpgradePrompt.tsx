/**
 * Upgrade Prompt Component
 * Shows a non-dismissible overlay prompting users to activate a license
 */

import { useNavigate } from "react-router";

import { AlertCircle, Lock } from "lucide-react";

import {
  getFeatureDescription,
  isCloudMode,
  type PremiumFeature,
} from "@/lib/featureFlags";

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
  const navigate = useNavigate();
  const featureName = getFeatureDescription(feature);
  const cloud = isCloudMode();
  const defaultMessage = cloud
    ? `Upgrade your plan to unlock ${featureName}.`
    : `Activate a license to unlock ${featureName}.`;

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
              <p className="text-sm font-medium">License Required</p>
              <p className="text-sm text-muted-foreground">
                {cloud
                  ? "This feature requires an upgraded plan. View available plans to unlock it."
                  : "This feature requires an active license. Activate a license in Settings to unlock it."}
              </p>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex gap-2">
          {cloud ? (
            <>
              <Button
                className="flex-1 bg-gradient-button hover:bg-gradient-button-hover text-white"
                onClick={() => navigate("/plans")}
              >
                View Plans
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  window.open("https://qarote.io/contact", "_blank");
                }}
              >
                Contact Sales
              </Button>
            </>
          ) : (
            <>
              <Button
                className="flex-1 bg-gradient-button hover:bg-gradient-button-hover text-white"
                onClick={() => navigate("/settings/license")}
              >
                Activate License
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  window.open("https://qarote.io/pricing", "_blank");
                }}
              >
                Purchase License
              </Button>
            </>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
