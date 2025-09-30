import { Crown } from "lucide-react";
import { useUser } from "@/hooks/useUser";

interface PlanBadgeProps {
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
}

export function PlanBadge({ size = "md", showIcon = true }: PlanBadgeProps) {
  const { planData } = useUser();

  const planFeatures = planData?.planFeatures;

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

  // Get display name and color from backend data, with fallbacks
  const displayName = planFeatures?.displayName || "Free";
  const color = planFeatures?.color || "text-white bg-gray-600";

  return (
    <div
      className={`flex items-center gap-2 ${color} rounded-full ${sizeClasses[size]} font-medium shadow-sm border border-white/20 backdrop-blur-sm`}
    >
      {showIcon && <Crown className={`${iconSizes[size]} text-yellow-500`} />}
      <span>{displayName}</span>
    </div>
  );
}
