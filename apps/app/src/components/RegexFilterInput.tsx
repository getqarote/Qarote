import { useTranslation } from "react-i18next";

import { Input } from "@/components/ui/input";

interface RegexFilterInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

/**
 * Regex filter input used on list pages. The operator types a pattern
 * and the list filters case-insensitively; invalid regexes fall back
 * to a substring match (see `filterByRegex`). Kept as a small component
 * so the input width and spacing stay consistent across Users, VHosts,
 * and any future list page.
 */
export function RegexFilterInput({
  value,
  onChange,
  placeholder,
}: RegexFilterInputProps) {
  const { t } = useTranslation("common");

  return (
    <Input
      placeholder={placeholder ?? t("filter")}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="max-w-xs"
    />
  );
}
