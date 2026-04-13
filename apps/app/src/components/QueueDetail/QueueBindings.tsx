import { useTranslation } from "react-i18next";

import { Link2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface Binding {
  source: string;
  vhost: string;
  destination: string;
  destination_type: string;
  routing_key: string;
  arguments: { [key: string]: unknown };
  properties_key: string;
}

interface QueueBindingsProps {
  bindingsData:
    | {
        totalBindings: number;
        bindings: Binding[];
      }
    | undefined;
  bindingsLoading: boolean;
}

function BindingRow({ binding }: { binding: Binding }) {
  const { t } = useTranslation("queues");
  const hasArgs = Object.keys(binding.arguments).length > 0;
  const exchangeName = binding.source || t("spyDefaultExchange");
  const routingKey = binding.routing_key || "";

  return (
    <div className="px-4 py-3">
      {/* Main line: exchange → destination  routing: key */}
      <div className="flex items-center gap-2 text-sm font-mono">
        <span className="text-primary font-medium truncate">
          {exchangeName}
        </span>
        <span className="text-muted-foreground shrink-0">&rarr;</span>
        <span className="text-foreground font-medium truncate">
          {binding.destination}
        </span>
        {routingKey && (
          <span className="text-muted-foreground truncate">
            {t("routingKey").toLowerCase()}: {routingKey}
          </span>
        )}
        <span className="text-xs text-muted-foreground ml-auto shrink-0">
          {binding.vhost}
        </span>
      </div>

      {/* Extra details shown directly below */}
      {(hasArgs || binding.properties_key) && (
        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground font-mono">
          {hasArgs &&
            Object.entries(binding.arguments).map(([key, value]) => (
              <span key={key}>
                {key}:{" "}
                <span className="text-foreground">
                  {typeof value === "string" ? value : JSON.stringify(value)}
                </span>
              </span>
            ))}
          {binding.properties_key && (
            <span>properties: {binding.properties_key}</span>
          )}
        </div>
      )}
    </div>
  );
}

export function QueueBindings({
  bindingsData,
  bindingsLoading,
}: QueueBindingsProps) {
  const { t } = useTranslation("queues");

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 bg-muted/30 border-b border-border">
        <h3 className="title-section">{t("queueBindings")}</h3>
        <Badge variant="secondary">{bindingsData?.totalBindings || 0}</Badge>
      </div>
      {bindingsLoading ? (
        <div className="p-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : bindingsData?.bindings?.length === 0 ? (
        <div className="text-center py-8">
          <Link2 className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <h4 className="text-lg font-semibold text-foreground mb-2">
            {t("noBindings")}
          </h4>
          <p className="text-muted-foreground">{t("noBindingsDesc")}</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {bindingsData?.bindings?.map((binding, index) => (
            <BindingRow
              key={`${binding.source}-${binding.routing_key}-${index}`}
              binding={binding}
            />
          ))}
        </div>
      )}
    </div>
  );
}
