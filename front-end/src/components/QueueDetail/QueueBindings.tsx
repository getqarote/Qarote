import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link2 } from "lucide-react";

interface QueueBindingsProps {
  bindingsData:
    | {
        totalBindings: number;
        bindings: Array<{
          source: string;
          vhost: string;
          destination: string;
          destination_type: string;
          routing_key: string;
          arguments: { [key: string]: unknown };
          properties_key: string;
        }>;
      }
    | undefined;
  bindingsLoading: boolean;
}

export function QueueBindings({
  bindingsData,
  bindingsLoading,
}: QueueBindingsProps) {
  return (
    <Card className="border-0 shadow-md bg-card-unified backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Link2 className="w-5 h-5" />
            Queue Bindings ({bindingsData?.totalBindings || 0})
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {bindingsLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : bindingsData?.bindings?.length === 0 ? (
          <div className="text-center py-8">
            <Link2 className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No Bindings Found
            </h3>
            <p className="text-gray-600">
              This queue is not bound to any exchanges.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {bindingsData?.bindings?.map((binding, index) => (
              <div
                key={`${binding.source}-${binding.routing_key}-${index}`}
                className="border rounded-lg p-4 bg-gradient-to-r from-blue-50 to-indigo-50"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="font-mono text-xs">
                      {binding.source || "(default)"}
                    </Badge>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">→</span>
                      <Badge variant="secondary" className="text-xs">
                        {binding.destination_type}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">{binding.vhost}</div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-gray-500">Routing Key:</span>
                    <div className="font-medium font-mono">
                      {binding.routing_key || "(empty)"}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500">Destination:</span>
                    <div
                      className="font-medium truncate"
                      title={binding.destination}
                    >
                      {binding.destination}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500">Arguments:</span>
                    <div className="font-medium">
                      {Object.keys(binding.arguments).length > 0 ? (
                        <div className="space-y-1">
                          {Object.entries(binding.arguments).map(
                            ([key, value]) => (
                              <div key={key} className="text-xs">
                                <span className="text-gray-600">{key}:</span>{" "}
                                <span className="font-mono">
                                  {typeof value === "string"
                                    ? value
                                    : JSON.stringify(value)}
                                </span>
                              </div>
                            )
                          )}
                        </div>
                      ) : (
                        "None"
                      )}
                    </div>
                  </div>
                </div>

                {binding.properties_key && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <span className="text-xs text-gray-500">
                      Properties Key:
                    </span>
                    <div className="text-xs font-mono text-gray-700">
                      {binding.properties_key}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
