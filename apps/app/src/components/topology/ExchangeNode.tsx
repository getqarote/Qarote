import { memo } from "react";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation("topology");
  const nodeData = data as unknown as ExchangeNodeData;
  const Icon = exchangeTypeIcons[nodeData.exchangeType] || Activity;

  // Exchanges carry no per-queue severity — they render neutral (tnode--ex),
  // with the carrot-soft icon tile reserved for them.
  return (
    <div className="tnode tnode--ex">
      <Handle type="target" position={Position.Left} />
      <div className="tnode__head">
        <div className="tnode__ic">
          <Icon size={15} aria-hidden="true" />
        </div>
        <div className="tnode__main">
          <div className="tnode__name" title={nodeData.label}>
            {nodeData.label}
          </div>
          <div className="tnode__type">
            <span className="tnode__kind">{nodeData.exchangeType}</span>
            {nodeData.bindingCount > 0 && (
              <span className="tnode__tag">
                {t("node.bindings", { count: nodeData.bindingCount })}
              </span>
            )}
            {nodeData.internal && <span className="tnode__tag">internal</span>}
          </div>
        </div>
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

export const ExchangeNode = memo(ExchangeNodeComponent);
