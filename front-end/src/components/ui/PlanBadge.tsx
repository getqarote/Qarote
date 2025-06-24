import { Crown } from "lucide-react";
import {
  WorkspacePlan,
  getPlanDisplayName,
  getPlanColor,
} from "@/lib/plans/planUtils";

interface PlanBadgeProps {
  workspacePlan: WorkspacePlan;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
}

export function PlanBadge({
  workspacePlan,
  size = "md",
  showIcon = true,
}: PlanBadgeProps) {
  const sizeClasses = {
    sm: "px-2 py-1 text-xs",
    md: "px-3 py-1 text-sm",
    lg: "px-4 py-2 text-base",
  };

  const iconSizes = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  return (
    <div
      className={`flex items-center gap-2 ${getPlanColor(workspacePlan)} rounded-full ${sizeClasses[size]} font-medium shadow-sm border border-white/20 backdrop-blur-sm`}
    >
      {showIcon && <Crown className={`${iconSizes[size]} text-yellow-500`} />}
      <span>{getPlanDisplayName(workspacePlan)}</span>
    </div>
  );
}
