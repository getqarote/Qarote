import { memo } from "react";

import { Handle, type NodeProps, Position } from "@xyflow/react";
import { AlertTriangle, MessageSquare, Users } from "lucide-react";

import type { QueueNodeData } from "@/lib/topology/layout";

function QueueNodeComponent({ data }: NodeProps) {
  const nodeData = data as unknown as QueueNodeData;

  const stateColor =
    nodeData.state === "running"
      ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30"
      : "border-red-500 bg-red-50 dark:bg-red-950/30";

  return (
    <div
      className={`rounded-lg border-2 p-3 shadow-sm min-w-[200px] cursor-pointer ${stateColor}`}
    >
      <Handle type="target" position={Position.Left} className="!bg-gray-400" />
      <div className="flex items-center gap-2 mb-1">
        <MessageSquare className="w-4 h-4 shrink-0" />
        <span className="font-semibold text-sm truncate" title={nodeData.label}>
          {nodeData.label}
        </span>
      </div>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span title="Total messages">{nodeData.messages} msgs</span>
        <span
          className={`flex items-center gap-1 ${nodeData.consumerCount === 0 ? "text-amber-600 dark:text-amber-400" : ""}`}
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
        <div className="text-xs text-amber-600 dark:text-amber-400 mt-1">
          {nodeData.messagesUnacknowledged} unacked
        </div>
      )}
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-gray-400"
      />
    </div>
  );
}

export const QueueNode = memo(QueueNodeComponent);
