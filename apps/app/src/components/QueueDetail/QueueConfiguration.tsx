import { Queue } from "@/lib/api";

import { Badge } from "@/components/ui/badge";

interface QueueConfigurationProps {
  queue: Queue;
}

export function QueueConfiguration({ queue }: QueueConfigurationProps) {
  const args = Object.entries(queue.arguments).filter(
    ([, value]) => value !== undefined && value !== null
  );

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="px-4 py-3 bg-muted/30 border-b border-border">
        <h3 className="title-section">Queue Configuration</h3>
      </div>
      <div className="p-4 space-y-4">
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
        </div>
        <div className="pt-4 border-t border-border">
          <div className="grid grid-cols-2 gap-4">
            {/* Durable / Exclusive are configuration toggles, not status —
                "Yes" doesn't deserve the brand-orange `default` badge variant
                (which renders as bg-primary). Demoted to `secondary` so the
                "Yes" state has visible weight without using the brand color
                for a non-status signal.

                Auto Delete keeps `destructive` when true because auto-delete
                = "queue is destroyed when the last consumer disconnects" =
                real data-loss risk worth highlighting. */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Durable</span>
              <Badge variant={queue.durable ? "secondary" : "outline"}>
                {queue.durable ? "Yes" : "No"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Auto Delete</span>
              <Badge variant={queue.auto_delete ? "destructive" : "outline"}>
                {queue.auto_delete ? "Yes" : "No"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Exclusive</span>
              <Badge variant={queue.exclusive ? "secondary" : "outline"}>
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

        {/* Queue Arguments — only render when there are arguments */}
        {args.length > 0 && (
          <div className="pt-4 border-t border-border">
            <h4 className="text-sm font-medium text-foreground mb-3">
              Arguments
            </h4>
            <div className="space-y-2">
              {args.map(([key, value]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-sm font-mono text-muted-foreground">
                    {key}:
                  </span>
                  <Badge
                    variant={key.startsWith("x-") ? "secondary" : "outline"}
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
        )}
      </div>
    </div>
  );
}
