import { Rabbit } from "lucide-react";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { useUser } from "@/hooks/ui/useUser";

interface PlanBadgeProps {
  size?: "sm" | "md" | "lg";
}

export function PlanBadge({ size = "md" }: PlanBadgeProps) {
  const { planData } = useUser();

  const planFeatures = planData?.planFeatures;

  const sizeClasses = {
    sm: "p-1.5",
    md: "p-2",
    lg: "p-2.5",
  };

  const iconSizes = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  // Map plan colors explicitly so Tailwind can detect the classes at build time
  // (dynamic classes from the backend would be purged otherwise).
  const planColorMap: Record<string, string> = {
    "text-primary-foreground bg-muted-foreground":
      "text-primary-foreground bg-muted-foreground",
    "text-white bg-info": "text-white bg-info",
    "text-white bg-muted": "text-white bg-muted",
  };
  const color =
    planColorMap[planFeatures?.color ?? ""] ||
    "text-primary-foreground bg-muted-foreground";
  const displayName = planFeatures?.displayName || "Free";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={`flex items-center justify-center ${color} rounded-full ${sizeClasses[size]} shadow-xs border border-white/20 backdrop-blur-xs cursor-default`}
        >
          <Rabbit className={iconSizes[size]} />
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>{displayName}</p>
      </TooltipContent>
    </Tooltip>
  );
}
