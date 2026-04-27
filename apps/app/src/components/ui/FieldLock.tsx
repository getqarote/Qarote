import { useNavigate } from "react-router";

import { Lock } from "lucide-react";

import {
  getFeatureDescription,
  getUpgradePath,
  type PremiumFeature,
} from "@/lib/featureFlags";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface FieldLockProps {
  feature: PremiumFeature;
  children: React.ReactNode;
}

/**
 * Wraps a form field with a lock icon + upgrade tooltip when the feature is
 * not available on the current plan. Children are rendered as-is — callers
 * are responsible for passing disabled={true} to the underlying inputs.
 */
export function FieldLock({ feature, children }: FieldLockProps) {
  const navigate = useNavigate();
  const featureName = getFeatureDescription(feature);
  const upgradePath = getUpgradePath();

  return (
    <div className="relative">
      {children}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={`${featureName} requires upgrade`}
            onClick={() => navigate(upgradePath)}
            className="absolute inset-y-0 right-2 flex items-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <Lock className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p className="text-xs">
            <strong>{featureName}</strong> — requires Developer or Enterprise
            plan.{" "}
            <button
              type="button"
              className="underline cursor-pointer"
              onClick={() => navigate(upgradePath)}
            >
              Upgrade →
            </button>
          </p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
