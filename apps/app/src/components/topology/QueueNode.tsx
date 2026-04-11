import { memo } from "react";

import { Handle, type NodeProps, Position } from "@xyflow/react";
import { AlertTriangle, Inbox, Users } from "lucide-react";

import type { QueueNodeData } from "@/lib/topology/layout";

function QueueNodeComponent({ data }: NodeProps) {
  const nodeData = data as unknown as QueueNodeData;

  const isHealthy = nodeData.state === "running";

  return (
    <div
      className={`rounded-md border bg-card shadow-sm min-w-[180px] cursor-pointer transition-colors hover:border-foreground/30 ${
        isHealthy ? "border-border" : "border-destructive/50"
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-muted-foreground !w-2 !h-2"
      />
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <div
          className={`shrink-0 rounded p-1.5 ${
            isHealthy ? "bg-success/15" : "bg-destructive/15"
          }`}
        >
          <Inbox
            className={`w-3.5 h-3.5 ${
              isHealthy ? "text-success" : "text-destructive"
            }`}
          />
        </div>
        <div className="min-w-0">
          <div
            className="font-mono text-sm font-medium truncate leading-tight"
            title={nodeData.label}
          >
            {nodeData.label}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[10px] text-muted-foreground bg-muted rounded px-1 py-px">
              {nodeData.queueType}
            </span>
          </div>
        </div>
      </div>
      <div className="border-t border-border/50 px-3 py-1.5 flex items-center gap-3 text-[11px] text-muted-foreground">
        <span className="font-mono tabular-nums">
          {nodeData.messages} msg{nodeData.messages !== 1 ? "s" : ""}
        </span>
        <span
          className={`flex items-center gap-1 ${
            nodeData.consumerCount === 0 ? "text-warning" : ""
          }`}
        >
          <Users className="w-3 h-3" />
          <span className="font-mono tabular-nums">
            {nodeData.consumerCount}
          </span>
          {nodeData.consumerCount === 0 && (
            <AlertTriangle className="w-3 h-3" />
          )}
        </span>
        {nodeData.messagesUnacknowledged > 0 && (
          <span className="text-warning font-mono tabular-nums">
            {nodeData.messagesUnacknowledged} unacked
          </span>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-muted-foreground !w-2 !h-2"
      />
    </div>
  );
}

export const QueueNode = memo(QueueNodeComponent);
