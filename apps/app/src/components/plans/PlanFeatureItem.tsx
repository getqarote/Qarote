import { ReactNode } from "react";

import { PixelCheck } from "@/components/ui/pixel-check";

interface PlanFeatureItemProps {
  label: ReactNode;
  /**
   * Optional secondary detail rendered below the label in muted
   * text. Used for capacity limits ("Up to 5", "Unlimited") under
   * countable features like "RabbitMQ Servers".
   */
  detail?: ReactNode;
  /**
   * Optional "Soon" badge label. When present, a small outlined
   * badge appears next to the feature label. Used for `coming_soon`
   * features like role-based access in progress.
   */
  soonLabel?: string;
}

/**
 * A single row in a plan card's feature list. Check icon + label,
 * optional detail below, optional "Soon" badge. Pure presentation.
 */
export function PlanFeatureItem({
  label,
  detail,
  soonLabel,
}: PlanFeatureItemProps) {
  return (
    <li className="flex items-start gap-3">
      <div className="mt-1.5 w-3.5 shrink-0 flex items-start">
        <PixelCheck
          className="h-[0.7rem] w-auto shrink-0 text-success"
          aria-hidden="true"
        />
      </div>
      <div className="flex-1">
        <span className="text-sm text-foreground flex items-center gap-2">
          {label}
          {soonLabel && (
            <span className="font-medium px-1 border border-border text-muted-foreground text-[0.65rem]">
              {soonLabel}
            </span>
          )}
        </span>
        {detail && (
          <p className="text-xs text-muted-foreground mt-1">{detail}</p>
        )}
      </div>
    </li>
  );
}
