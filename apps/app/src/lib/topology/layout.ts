import dagre from "@dagrejs/dagre";
import type { Edge, Node } from "@xyflow/react";

export interface ExchangeNodeData {
  label: string;
  exchangeType: string;
  internal: boolean;
  messageStatsIn?: number;
  messageStatsOut?: number;
  bindingCount: number;
  vhost: string;
  [key: string]: unknown;
}

export interface QueueNodeData {
  label: string;
  queueType: string;
  state: string;
  messages: number;
  messagesReady: number;
  messagesUnacknowledged: number;
  consumerCount: number;
  memory: number;
  vhost: string;
  [key: string]: unknown;
}

interface TopologyExchange {
  name: string;
  vhost: string;
  type: string;
  internal: boolean;
  bindingCount: number;
  message_stats?: {
    publish_in?: number;
    publish_out?: number;
  };
}

interface TopologyQueue {
  name: string;
  vhost: string;
  type: string;
  state: string;
  messages: number;
  messages_ready: number;
  messages_unacknowledged: number;
  consumers: number;
  memory: number;
}

interface TopologyBinding {
  source: string;
  vhost: string;
  destination: string;
  destination_type: string;
  routing_key: string;
}

interface TopologyConsumer {
  consumer_tag: string;
  queue: { name: string; vhost: string };
}

const NODE_WIDTH = 220;
const NODE_HEIGHT = 100;

export function buildTopologyGraph(
  exchanges: TopologyExchange[],
  queues: TopologyQueue[],
  bindings: TopologyBinding[],
  consumers: TopologyConsumer[]
): { nodes: Node[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "LR", nodesep: 60, ranksep: 120, edgesep: 30 });

  // Build consumer count per queue
  const consumerCountByQueue = new Map<string, number>();
  for (const consumer of consumers) {
    const key = `${encodeURIComponent(consumer.queue.name)}@${encodeURIComponent(consumer.queue.vhost)}`;
    consumerCountByQueue.set(key, (consumerCountByQueue.get(key) || 0) + 1);
  }

  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // Filter out default exchange and internal amq.* exchanges
  const visibleExchanges = exchanges.filter(
    (e) => e.name !== "" && !e.name.startsWith("amq.")
  );

  for (const exchange of visibleExchanges) {
    const id = `exchange:${encodeURIComponent(exchange.name)}@${encodeURIComponent(exchange.vhost)}`;
    g.setNode(id, { width: NODE_WIDTH, height: NODE_HEIGHT });

    nodes.push({
      id,
      type: "exchangeNode",
      position: { x: 0, y: 0 },
      data: {
        label: exchange.name,
        exchangeType: exchange.type,
        internal: exchange.internal,
        messageStatsIn: exchange.message_stats?.publish_in,
        messageStatsOut: exchange.message_stats?.publish_out,
        bindingCount: exchange.bindingCount,
        vhost: exchange.vhost,
      } satisfies ExchangeNodeData,
    });
  }

  for (const queue of queues) {
    const id = `queue:${encodeURIComponent(queue.name)}@${encodeURIComponent(queue.vhost)}`;
    const consumerKey = `${encodeURIComponent(queue.name)}@${encodeURIComponent(queue.vhost)}`;
    g.setNode(id, { width: NODE_WIDTH, height: NODE_HEIGHT });

    nodes.push({
      id,
      type: "queueNode",
      position: { x: 0, y: 0 },
      data: {
        label: queue.name,
        queueType: queue.type,
        state: queue.state,
        messages: queue.messages,
        messagesReady: queue.messages_ready,
        messagesUnacknowledged: queue.messages_unacknowledged,
        consumerCount: consumerCountByQueue.get(consumerKey) || queue.consumers,
        memory: queue.memory,
        vhost: queue.vhost,
      } satisfies QueueNodeData,
    });
  }

  // Build edges from bindings
  const nodeIds = new Set(nodes.map((n) => n.id));
  const edgeSet = new Set<string>();

  for (const binding of bindings) {
    if (!binding.source) continue;

    const sourceId = `exchange:${encodeURIComponent(binding.source)}@${encodeURIComponent(binding.vhost)}`;
    const destPrefix =
      binding.destination_type === "queue" ? "queue" : "exchange";
    const targetId = `${destPrefix}:${encodeURIComponent(binding.destination)}@${encodeURIComponent(binding.vhost)}`;

    if (!nodeIds.has(sourceId) || !nodeIds.has(targetId)) continue;

    const edgeId = `${sourceId}->${targetId}:${binding.routing_key}`;
    if (edgeSet.has(edgeId)) continue;
    edgeSet.add(edgeId);

    g.setEdge(sourceId, targetId);

    edges.push({
      id: edgeId,
      source: sourceId,
      target: targetId,
      label: binding.routing_key || undefined,
      type: "smoothstep",
      animated: true,
      style: { stroke: "#94a3b8" },
      labelStyle: { fontSize: 11, fill: "#475569", fontWeight: 500 },
      labelBgStyle: { fill: "#f8fafc", fillOpacity: 0.9 },
      labelBgPadding: [4, 2] as [number, number],
      labelBgBorderRadius: 4,
    });
  }

  // Add synthetic "(default)" exchange for orphan queues
  // In RabbitMQ, queues are implicitly bound to the default exchange with routing_key = queue name
  const queuesWithIncoming = new Set<string>();
  for (const edge of edges) queuesWithIncoming.add(edge.target);

  const orphanQueues = nodes.filter(
    (n) => n.type === "queueNode" && !queuesWithIncoming.has(n.id)
  );

  if (orphanQueues.length > 0) {
    const vhost = (orphanQueues[0].data as QueueNodeData).vhost;
    const defaultExchangeId = `exchange:__default__@${encodeURIComponent(vhost)}`;
    g.setNode(defaultExchangeId, { width: NODE_WIDTH, height: NODE_HEIGHT });

    nodes.push({
      id: defaultExchangeId,
      type: "exchangeNode",
      position: { x: 0, y: 0 },
      data: {
        label: "(default)",
        exchangeType: "direct",
        internal: false,
        bindingCount: orphanQueues.length,
        vhost,
      } satisfies ExchangeNodeData,
    });

    for (const queue of orphanQueues) {
      const queueData = queue.data as QueueNodeData;
      const edgeId = `${defaultExchangeId}->${queue.id}:${queueData.label}`;
      g.setEdge(defaultExchangeId, queue.id);
      edges.push({
        id: edgeId,
        source: defaultExchangeId,
        target: queue.id,
        label: queueData.label,
        type: "smoothstep",
        animated: true,
        style: { stroke: "#94a3b8", strokeDasharray: "5,5" },
        labelStyle: { fontSize: 11, fill: "#475569", fontWeight: 500 },
        labelBgStyle: { fill: "#f8fafc", fillOpacity: 0.9 },
        labelBgPadding: [4, 2] as [number, number],
        labelBgBorderRadius: 4,
      });
    }
  }

  dagre.layout(g);

  for (const node of nodes) {
    const dagreNode = g.node(node.id);
    if (dagreNode) {
      node.position = {
        x: dagreNode.x - NODE_WIDTH / 2,
        y: dagreNode.y - NODE_HEIGHT / 2,
      };
    }
  }

  return { nodes, edges };
}
