import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Network } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { ConnectionRow } from "./ConnectionRow";
import type { ConnectionListItem } from "./types";

interface ConnectionsListProps {
  connections: ConnectionListItem[];
  isLoading: boolean;
}

/**
 * Card-wrapped list of active connections. Handles three render states:
 *   - loading  → five row-shaped skeletons
 *   - empty    → friendly "no active connections" explainer
 *   - populated → `ConnectionRow` per connection, each expandable
 *
 * Expansion state is owned here (a local `Set<string>` keyed by
 * connection name) because which rows are open is pure presentation
 * state. Connection names in RabbitMQ are `host:port -> host:port`
 * which is already unique per server — no composite key needed.
 */
export function ConnectionsList({
  connections,
  isLoading,
}: ConnectionsListProps) {
  const { t } = useTranslation("connections");
  const [expandedNames, setExpandedNames] = useState<Set<string>>(new Set());

  const toggleExpanded = (name: string, isOpen: boolean) => {
    setExpandedNames((prev) => {
      const next = new Set(prev);
      if (isOpen) {
        next.add(name);
      } else {
        next.delete(name);
      }
      return next;
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="title-section flex items-center gap-2">
          <Network className="h-5 w-5" aria-hidden="true" />
          {t("activeConnections")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        ) : connections.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-4">
            {connections.map((connection) => (
              <ConnectionRow
                key={connection.name}
                connection={connection}
                isOpen={expandedNames.has(connection.name)}
                onOpenChange={(open) => toggleExpanded(connection.name, open)}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  const { t } = useTranslation("connections");
  return (
    <div className="text-center py-8">
      <Network
        className="h-16 w-16 text-muted-foreground mx-auto mb-4"
        aria-hidden="true"
      />
      <h3 className="text-lg font-semibold text-foreground mb-2">
        {t("noActiveConnections")}
      </h3>
      <p className="text-muted-foreground">{t("noActiveConnectionsDesc")}</p>
    </div>
  );
}
