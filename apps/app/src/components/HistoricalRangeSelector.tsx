import { Clock } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type HistoricalRange = 6 | 24 | 72 | 168;

const RANGE_OPTIONS: Array<{
  value: HistoricalRange;
  label: string;
  isPremium: boolean;
}> = [
  { value: 6, label: "6h", isPremium: false },
  { value: 24, label: "24h", isPremium: true },
  { value: 72, label: "3d", isPremium: true },
  { value: 168, label: "7d", isPremium: true },
];

interface HistoricalRangeSelectorProps {
  value: HistoricalRange;
  onValueChange: (value: HistoricalRange) => void;
  isPremium: boolean;
  className?: string;
}

export const HistoricalRangeSelector = ({
  value,
  onValueChange,
  isPremium,
  className = "",
}: HistoricalRangeSelectorProps) => {
  const handleValueChange = (raw: string) => {
    onValueChange(Number(raw) as HistoricalRange);
  };

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <Clock className="w-3 h-3 text-muted-foreground" />
      <Select value={String(value)} onValueChange={handleValueChange}>
        <SelectTrigger className="w-28 h-7 text-xs">
          <SelectValue placeholder="Select range" />
        </SelectTrigger>
        <SelectContent>
          {RANGE_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={String(opt.value)}>
              <span className="flex items-center gap-1.5">
                {opt.label}
                {opt.isPremium && !isPremium && (
                  <span className="text-[10px] font-medium text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 px-1 rounded">
                    Pro
                  </span>
                )}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
