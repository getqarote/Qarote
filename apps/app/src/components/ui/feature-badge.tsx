import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface FeatureBadgeProps {
  label: string;
  tooltip: string;
}

export function FeatureBadge({ label, tooltip }: FeatureBadgeProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="outline"
          className="text-[10px] px-1.5 py-0 h-4 font-medium shrink-0 cursor-default leading-none"
        >
          {label}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}
