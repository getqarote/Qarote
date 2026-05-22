import "@xyflow/react/dist/style.css";

import { useEffect, useMemo, useState } from "react";

import {
  Background,
  type Edge,
  type Node,
  ReactFlow,
  type ReactFlowInstance,
} from "@xyflow/react";

import { ExchangeNode } from "@/components/topology/ExchangeNode";
import { QueueNode } from "@/components/topology/QueueNode";

const nodeTypes = {
  exchangeNode: ExchangeNode,
  queueNode: QueueNode,
};

interface ScanTopologyCanvasProps {
  nodes: Node[];
  edges: Edge[];
}

export function ScanTopologyCanvas({ nodes, edges }: ScanTopologyCanvasProps) {
  const styledNodes = useMemo(
    () =>
      nodes.map((n) => ({
        ...n,
        style: { ...n.style, opacity: 1, transition: "opacity 0.3s ease" },
      })),
    [nodes]
  );

  // Re-fit viewport whenever the node count changes so progressive stagger
  // keeps the topology centered instead of drifting toward one corner.
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);
  useEffect(() => {
    if (!rfInstance || nodes.length === 0) return;
    const id = window.setTimeout(() => {
      rfInstance.fitView({ padding: 0.2, maxZoom: 1, duration: 250 });
    }, 50);
    return () => window.clearTimeout(id);
  }, [rfInstance, nodes.length]);

  return (
    <div className="h-full w-full rounded-lg overflow-hidden border border-border/40 bg-muted/20">
      <ReactFlow
        nodes={styledNodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onInit={setRfInstance}
        fitView
        fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag={false}
        zoomOnScroll={false}
        zoomOnPinch={false}
        zoomOnDoubleClick={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={24} size={1} className="opacity-30" />
      </ReactFlow>
    </div>
  );
}
