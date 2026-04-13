import { useTranslation } from "react-i18next";

import { Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface ConsumerDetailsProps {
  consumersData:
    | {
        totalConsumers: number;
        consumers: Array<{
          consumer_tag: string;
          ack_required: boolean;
          exclusive: boolean;
          prefetch_count: number;
          arguments: Record<string, unknown>;
          channel_details: {
            number: number;
            connection_name: string;
            peer_host: string;
            peer_port: number;
          };
        }>;
      }
    | undefined;
  consumersLoading: boolean;
}

export function ConsumerDetails({
  consumersData,
  consumersLoading,
}: ConsumerDetailsProps) {
  const { t } = useTranslation("queues");

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 bg-muted/30 border-b border-border">
        <h3 className="title-section">{t("activeConsumers")}</h3>
        <Badge variant="secondary">{consumersData?.totalConsumers || 0}</Badge>
      </div>
      <div className="p-4">
        {consumersLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : consumersData?.consumers?.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <h4 className="text-lg font-semibold text-foreground mb-2">
              {t("noActiveConsumers")}
            </h4>
            <p className="text-muted-foreground">
              {t("noActiveConsumersDesc")}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {consumersData?.consumers?.map((consumer) => (
              <div
                key={consumer.consumer_tag}
                className="border rounded-lg p-4 bg-card"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="font-mono text-xs">
                      {consumer.consumer_tag}
                    </Badge>
                    <div className="flex items-center gap-2">
                      {consumer.ack_required && (
                        <Badge variant="secondary" className="text-xs">
                          ACK
                        </Badge>
                      )}
                      {consumer.exclusive && (
                        <Badge variant="secondary" className="text-xs">
                          {t("exclusive")}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t("channelNumber", {
                      number: consumer.channel_details.number,
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-muted-foreground">
                      {t("connection")}:
                    </span>
                    <div
                      className="font-medium truncate"
                      title={consumer.channel_details.connection_name}
                    >
                      {consumer.channel_details.connection_name}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">
                      {t("client")}:
                    </span>
                    <div className="font-medium">
                      {consumer.channel_details.peer_host}:
                      {consumer.channel_details.peer_port}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">
                      {t("prefetch")}:
                    </span>
                    <div className="font-medium">
                      {consumer.prefetch_count || t("unlimited")}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">
                      {t("arguments")}:
                    </span>
                    <div className="font-medium">
                      {Object.keys(consumer.arguments).length > 0
                        ? t("argsCount", {
                            count: Object.keys(consumer.arguments).length,
                          })
                        : t("none")}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
