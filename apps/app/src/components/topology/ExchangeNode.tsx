import { memo } from "react";

import { Handle, type NodeProps, Position } from "@xyflow/react";
import { Activity, GitBranch, Hash, Radio, Share2 } from "lucide-react";

import type { ExchangeNodeData } from "@/lib/topology/layout";

// Type distinction in the topology view comes from the icon (GitBranch /
// Radio / Share2 / Hash) and the type label below the name. The card chrome
// itself stays neutral so the topology canvas reads as a single coherent
// design system surface, not a rainbow of arbitrary type colors.
const exchangeTypeIcons: Record<string, typeof GitBranch> = {
  direct: GitBranch,
  fanout: Radio,
  topic: Share2,
  headers: Hash,
};

function ExchangeNodeComponent({ data }: NodeProps) {
  const nodeData = data as unknown as ExchangeNodeData;
  const Icon = exchangeTypeIcons[nodeData.exchangeType] || Activity;

  return (
    <div className="rounded-lg border-2 border-border bg-card p-3 shadow-sm min-w-[200px]">
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-muted-foreground"
      />
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4 shrink-0 text-muted-foreground" />
        <span className="font-semibold text-sm truncate" title={nodeData.label}>
          {nodeData.label}
        </span>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="capitalize">{nodeData.exchangeType}</span>
        {nodeData.internal && (
          <span className="text-muted-foreground">(internal)</span>
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
        className="!bg-muted-foreground"
      />
    </div>
  );
}

export const ExchangeNode = memo(ExchangeNodeComponent);
