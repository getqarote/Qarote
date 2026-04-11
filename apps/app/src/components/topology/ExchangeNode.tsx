import { memo } from "react";

import { Handle, type NodeProps, Position } from "@xyflow/react";
import { Activity, GitBranch, Hash, Radio, Share2 } from "lucide-react";

import type { ExchangeNodeData } from "@/lib/topology/layout";

const exchangeTypeIcons: Record<string, typeof GitBranch> = {
  direct: GitBranch,
  fanout: Radio,
  topic: Share2,
  headers: Hash,
};

function ExchangeNodeComponent({ data }: NodeProps) {
  const nodeData = data as unknown as ExchangeNodeData;
  const Icon = exchangeTypeIcons[nodeData.exchangeType] || Activity;
  const isSynthetic = nodeData.label === "(default)";

  return (
    <div
      className={`rounded-md border bg-card shadow-sm min-w-[180px] transition-colors ${
        isSynthetic
          ? "border-dashed border-muted-foreground/40"
          : "border-border cursor-pointer hover:border-foreground/30"
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-muted-foreground !w-2 !h-2"
      />
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <div className="shrink-0 rounded bg-muted p-1.5">
          <Icon className="w-3.5 h-3.5 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <div
            className="font-mono text-sm font-medium truncate leading-tight"
            title={nodeData.label}
          >
            {nodeData.label}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[11px] text-muted-foreground capitalize">
              {nodeData.exchangeType}
            </span>
            {nodeData.internal && (
              <span className="text-[10px] text-muted-foreground bg-muted rounded px-1 py-px">
                internal
              </span>
            )}
          </div>
        </div>
      </div>
      {nodeData.bindingCount > 0 && (
        <div className="border-t border-border px-3 py-1.5 text-[11px] text-muted-foreground">
          {nodeData.bindingCount} binding
          {nodeData.bindingCount !== 1 ? "s" : ""}
        </div>
      )}
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-muted-foreground !w-2 !h-2"
      />
    </div>
  );
}

export const ExchangeNode = memo(ExchangeNodeComponent);
