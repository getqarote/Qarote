import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { ArrowDown, ArrowUp, ArrowUpDown, Network } from "lucide-react";

import { ChannelRow } from "./ChannelRow";
import type { ChannelListItem } from "./types";

type SortField = "name" | "number" | "unacknowledged" | "vhost" | "user";
type SortDir = "asc" | "desc";

interface ChannelsListProps {
  channels: ChannelListItem[];
}

export function ChannelsList({ channels }: ChannelsListProps) {
  const { t } = useTranslation("channels");
  const [expandedNames, setExpandedNames] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>("unacknowledged");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const toggleExpanded = (name: string, isOpen: boolean) => {
    setExpandedNames((prev) => {
      const next = new Set(prev);
      if (isOpen) next.add(name);
      else next.delete(name);
      return next;
    });
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir(
        field === "name" || field === "vhost" || field === "user"
          ? "asc"
          : "desc"
      );
    }
  };

  const sorted = useMemo(() => {
    const copy = [...channels];
    const dir = sortDir === "asc" ? 1 : -1;
    copy.sort((a, b) => {
      switch (sortField) {
        case "name":
          return (
            dir *
            a.connection_details.name.localeCompare(b.connection_details.name)
          );
        case "number":
          return dir * (a.number - b.number);
        case "unacknowledged":
          return (
            dir *
            ((a.messages_unacknowledged ?? 0) -
              (b.messages_unacknowledged ?? 0))
          );
        case "vhost":
          return dir * a.vhost.localeCompare(b.vhost);
        case "user":
          return dir * a.user.localeCompare(b.user);
        default:
          return 0;
      }
    });
    return copy;
  }, [channels, sortField, sortDir]);

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <div className="flex items-center px-4 py-2 border-b border-border bg-muted/30 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <SortHeader
          label={t("connection")}
          field="name"
          currentField={sortField}
          currentDir={sortDir}
          onToggle={toggleSort}
          className="flex-1 min-w-0"
        />
        <SortHeader
          label={t("user")}
          field="user"
          currentField={sortField}
          currentDir={sortDir}
          onToggle={toggleSort}
          className="w-24 hidden sm:flex"
        />
        <SortHeader
          label={t("unacked")}
          field="unacknowledged"
          currentField={sortField}
          currentDir={sortDir}
          onToggle={toggleSort}
          className="w-20 justify-end"
        />
        {/* Spacer for expand chevron */}
        <div className="w-8" />
      </div>

      {channels.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="divide-y divide-border">
          {sorted.map((channel) => (
            <ChannelRow
              key={channel.name}
              channel={channel}
              isOpen={expandedNames.has(channel.name)}
              onOpenChange={(open) => toggleExpanded(channel.name, open)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SortHeader({
  label,
  field,
  currentField,
  currentDir,
  onToggle,
  className = "",
}: {
  label: string;
  field: SortField;
  currentField: SortField;
  currentDir: SortDir;
  onToggle: (field: SortField) => void;
  className?: string;
}) {
  const isActive = currentField === field;
  return (
    <button
      type="button"
      onClick={() => onToggle(field)}
      className={`inline-flex items-center gap-1 hover:text-foreground transition-colors ${
        isActive ? "text-foreground" : ""
      } ${className}`}
    >
      {label}
      {isActive ? (
        currentDir === "asc" ? (
          <ArrowUp className="h-3 w-3" />
        ) : (
          <ArrowDown className="h-3 w-3" />
        )
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-40" />
      )}
    </button>
  );
}

function EmptyState() {
  const { t } = useTranslation("channels");
  return (
    <div className="py-12 text-center">
      <Network
        className="h-10 w-10 text-muted-foreground mx-auto mb-3"
        aria-hidden="true"
      />
      <h2 className="text-sm font-medium text-foreground mb-1">
        {t("noActiveChannels")}
      </h2>
      <p className="text-sm text-muted-foreground">
        {t("noActiveChannelsDesc")}
      </p>
    </div>
  );
}
