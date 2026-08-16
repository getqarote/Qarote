import { memo } from "react";

import { Handle, type NodeProps, Position } from "@xyflow/react";
import { Inbox } from "lucide-react";

import { type QueueNodeData, queueTone } from "@/lib/topology/layout";

// queueTone() returns good | amber | red (Information Expert — the rule lives
// with the data). Map it to the .tnode severity vocabulary: a backlog with no
// consumer is `crit`, an idle queue with no consumer is `warn`, healthy is `ok`.
const TONE_CLASS = { good: "ok", amber: "warn", red: "crit" } as const;

function QueueNodeComponent({ data }: NodeProps) {
  const nodeData = data as unknown as QueueNodeData;
  const tone = TONE_CLASS[queueTone(nodeData)];

  return (
    <div className={`tnode tnode--${tone}`}>
      <Handle type="target" position={Position.Left} />
      <div className="tnode__head">
        <div className="tnode__ic">
          <Inbox size={15} aria-hidden="true" />
        </div>
        <div className="tnode__main">
          <div className="tnode__name" title={nodeData.label}>
            {nodeData.label}
          </div>
          <div className="tnode__type">
            <span
              className={`tnode__dot tnode__dot--${tone}`}
              aria-hidden="true"
            />
            <span className="tnode__kind">{nodeData.queueType}</span>
          </div>
        </div>
      </div>
      <div
        className={`tnode__foot${tone === "crit" ? " tnode__foot--crit" : tone === "warn" ? " tnode__foot--warn" : ""}`}
      >
        <span className="v">
          {nodeData.messages.toLocaleString()} msg
          {nodeData.messages !== 1 ? "s" : ""}
        </span>
        <span className="v">{nodeData.consumerCount} cons.</span>
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

export const QueueNode = memo(QueueNodeComponent);
