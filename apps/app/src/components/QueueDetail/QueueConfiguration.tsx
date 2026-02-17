import { Settings } from "lucide-react";

import { Queue } from "@/lib/api";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface QueueConfigurationProps {
  queue: Queue;
}

export function QueueConfiguration({ queue }: QueueConfigurationProps) {
  return (
    <Card className="border-0 shadow-md bg-card backdrop-blur-xs">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Queue Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">VHost</p>
            <Badge variant="outline" className="font-mono">
              {queue.vhost}
            </Badge>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Node</p>
            <Badge variant="outline" className="font-mono">
              {queue.node}
            </Badge>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Type</p>
            <Badge variant="outline">{queue.type}</Badge>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">State</p>
            <Badge className="bg-green-100 text-green-700">{queue.state}</Badge>
          </div>
        </div>
        <div className="pt-4 border-t">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Durable</span>
              <Badge variant={queue.durable ? "default" : "outline-solid"}>
                {queue.durable ? "Yes" : "No"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Auto Delete</span>
              <Badge
                variant={queue.auto_delete ? "destructive" : "outline-solid"}
              >
                {queue.auto_delete ? "Yes" : "No"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Exclusive</span>
              <Badge variant={queue.exclusive ? "default" : "outline-solid"}>
                {queue.exclusive ? "Yes" : "No"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Policy</span>
              <Badge variant="outline">{queue.policy || "None"}</Badge>
            </div>
            {queue.storage_version && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Storage Version
                </span>
                <Badge variant="outline">
                  {queue.storage_version === 1 ? "Classic" : "CQv2"}
                </Badge>
              </div>
            )}
            {queue.internal && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Internal</span>
                <Badge variant="secondary">Yes</Badge>
              </div>
            )}
            {queue.internal && queue.internal_owner && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Internal Owner
                </span>
                <Badge variant="outline" className="font-mono">
                  {queue.internal_owner}
                </Badge>
              </div>
            )}
          </div>
        </div>

        {/* Queue Arguments Section */}
        {/* {queue.arguments && Object.keys(queue.arguments).length > 0 && ( */}
        <div className="pt-4 border-t">
          <h4 className="text-sm font-medium text-foreground mb-3">
            Arguments
          </h4>
          <div className="space-y-2">
            {Object.entries(queue.arguments)
              .filter(([, value]) => value !== undefined && value !== null)
              .map(([key, value]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-sm font-mono text-muted-foreground">
                    {key}:
                  </span>
                  <Badge
                    variant={
                      key.startsWith("x-") ? "secondary" : "outline-solid"
                    }
                    className="font-mono"
                  >
                    {typeof value === "boolean"
                      ? value
                        ? "true"
                        : "false"
                      : typeof value === "number"
                        ? value.toString()
                        : String(value)}
                  </Badge>
                </div>
              ))}
          </div>
        </div>
        {/* )} */}
      </CardContent>
    </Card>
  );
}
