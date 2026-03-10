import { memo } from "react";

import { Handle, type NodeProps, Position } from "@xyflow/react";
import { Activity, GitBranch, Hash, Radio, Share2 } from "lucide-react";

import type { ExchangeNodeData } from "@/lib/topology/layout";

const exchangeTypeColors: Record<string, string> = {
  direct: "border-blue-500 bg-blue-50 dark:bg-blue-950/30",
  fanout: "border-green-500 bg-green-50 dark:bg-green-950/30",
  topic: "border-purple-500 bg-purple-50 dark:bg-purple-950/30",
  headers: "border-orange-500 bg-orange-50 dark:bg-orange-950/30",
};

const exchangeTypeIcons: Record<string, typeof GitBranch> = {
  direct: GitBranch,
  fanout: Radio,
  topic: Share2,
  headers: Hash,
};

function ExchangeNodeComponent({ data }: NodeProps) {
  const nodeData = data as unknown as ExchangeNodeData;
  const colorClass =
    exchangeTypeColors[nodeData.exchangeType] ||
    "border-gray-400 bg-gray-50 dark:bg-gray-900/30";
  const Icon = exchangeTypeIcons[nodeData.exchangeType] || Activity;

  return (
    <div
      className={`rounded-lg border-2 p-3 shadow-sm min-w-[200px] ${colorClass}`}
    >
      <Handle type="target" position={Position.Left} className="!bg-gray-400" />
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4 shrink-0" />
        <span className="font-semibold text-sm truncate" title={nodeData.label}>
          {nodeData.label}
        </span>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="capitalize">{nodeData.exchangeType}</span>
        {nodeData.internal && (
          <span className="text-orange-600">(internal)</span>
        )}
      </div>
      {nodeData.bindingCount > 0 && (
        <div className="text-xs text-muted-foreground mt-1">
          {nodeData.bindingCount} binding
          {nodeData.bindingCount !== 1 ? "s" : ""}
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

export const ExchangeNode = memo(ExchangeNodeComponent);
