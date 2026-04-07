import { memo } from "react";

import { Handle, type NodeProps, Position } from "@xyflow/react";
import { AlertTriangle, MessageSquare, Users } from "lucide-react";

import type { QueueNodeData } from "@/lib/topology/layout";

function QueueNodeComponent({ data }: NodeProps) {
  const nodeData = data as unknown as QueueNodeData;

  // Real semantic state coloring: a queue is either running (healthy) or
  // not (broken). These tokens already handle dark mode via CSS variables,
  // so no dark: variants needed.
  const stateColor =
    nodeData.state === "running"
      ? "border-success bg-success-muted"
      : "border-destructive bg-destructive/10";

  return (
    <div
      className={`rounded-lg border-2 p-3 shadow-sm min-w-[200px] cursor-pointer ${stateColor}`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-muted-foreground"
      />
      <div className="flex items-center gap-2 mb-1">
        <MessageSquare className="w-4 h-4 shrink-0" />
        <span className="font-semibold text-sm truncate" title={nodeData.label}>
          {nodeData.label}
        </span>
      </div>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span title="Total messages">{nodeData.messages} msgs</span>
        <span
          className={`flex items-center gap-1 ${nodeData.consumerCount === 0 ? "text-warning" : ""}`}
          title="Consumers"
        >
          <Users className="w-3 h-3" />
          {nodeData.consumerCount}
          {nodeData.consumerCount === 0 && (
            <AlertTriangle className="w-3 h-3" />
          )}
        </span>
      </div>
      {nodeData.messagesUnacknowledged > 0 && (
        <div className="text-xs text-warning mt-1">
          {nodeData.messagesUnacknowledged} unacked
        </div>
      )}
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-muted-foreground"
      />
    </div>
  );
}

export const QueueNode = memo(QueueNodeComponent);
