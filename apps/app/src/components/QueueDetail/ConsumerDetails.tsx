import { Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  return (
    <Card className="border-0 shadow-md bg-card backdrop-blur-xs">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Active Consumers ({consumersData?.totalConsumers || 0})
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {consumersLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : consumersData?.consumers?.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No Active Consumers
            </h3>
            <p className="text-muted-foreground">
              This queue currently has no active consumers.
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
                          Exclusive
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Channel #{consumer.channel_details.number}
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-muted-foreground">Connection:</span>
                    <div
                      className="font-medium truncate"
                      title={consumer.channel_details.connection_name}
                    >
                      {consumer.channel_details.connection_name}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Client:</span>
                    <div className="font-medium">
                      {consumer.channel_details.peer_host}:
                      {consumer.channel_details.peer_port}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Prefetch:</span>
                    <div className="font-medium">
                      {consumer.prefetch_count || "Unlimited"}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Arguments:</span>
                    <div className="font-medium">
                      {Object.keys(consumer.arguments).length > 0
                        ? `${Object.keys(consumer.arguments).length} args`
                        : "None"}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
