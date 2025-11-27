/**
 * Utility functions for routing visualization
 */

import {
  Position,
  Size,
  ExchangeNode,
  QueueNode,
  Binding,
  ExchangeType,
  LayoutConfig,
} from "./types";

/**
 * Calculate distance between two positions
 */
export const calculateDistance = (pos1: Position, pos2: Position): number => {
  const dx = pos2.x - pos1.x;
  const dy = pos2.y - pos1.y;
  return Math.sqrt(dx * dx + dy * dy);
};

/**
 * Calculate the center point of a node
 */
export const getNodeCenter = (node: ExchangeNode | QueueNode): Position => {
  return {
    x: node.position.x + node.size.width / 2,
    y: node.position.y + node.size.height / 2,
  };
};

/**
 * Check if a point is inside a rectangle
 */
export const isPointInNode = (
  point: Position,
  node: ExchangeNode | QueueNode
): boolean => {
  return (
    point.x >= node.position.x &&
    point.x <= node.position.x + node.size.width &&
    point.y >= node.position.y &&
    point.y <= node.position.y + node.size.height
  );
};

/**
 * Generate a smooth path between two points for message animation
 */
export const generateSmoothPath = (
  start: Position,
  end: Position,
  curvature = 0.3
): Position[] => {
  const path: Position[] = [];
  const steps = 20;

  // Calculate control points for bezier curve
  const midX = (start.x + end.x) / 2;
  const midY = (start.y + end.y) / 2;
  const offsetX = (end.y - start.y) * curvature;
  const offsetY = (start.x - end.x) * curvature;

  const cp1 = { x: midX + offsetX, y: midY + offsetY };
  const cp2 = { x: midX - offsetX, y: midY - offsetY };

  // Generate bezier curve points
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x =
      Math.pow(1 - t, 3) * start.x +
      3 * Math.pow(1 - t, 2) * t * cp1.x +
      3 * (1 - t) * Math.pow(t, 2) * cp2.x +
      Math.pow(t, 3) * end.x;

    const y =
      Math.pow(1 - t, 3) * start.y +
      3 * Math.pow(1 - t, 2) * t * cp1.y +
      3 * (1 - t) * Math.pow(t, 2) * cp2.y +
      Math.pow(t, 3) * end.y;

    path.push({ x, y });
  }

  return path;
};

/**
 * Get exchange type color
 */
export const getExchangeTypeColor = (type: ExchangeType): string => {
  const colors = {
    direct: "#3b82f6", // blue
    topic: "#10b981", // emerald
    headers: "#f59e0b", // amber
    fanout: "#ef4444", // red
  };
  return colors[type];
};

/**
 * Get exchange type icon
 */
export const getExchangeTypeIcon = (type: ExchangeType): string => {
  const icons = {
    direct: "→",
    topic: "🌟",
    headers: "📋",
    fanout: "📡",
  };
  return icons[type];
};

/**
 * Auto-layout nodes using force-directed algorithm
 */
export const autoLayoutNodes = (
  exchanges: ExchangeNode[],
  queues: QueueNode[],
  bindings: Binding[],
  _config: LayoutConfig
): { exchanges: ExchangeNode[]; queues: QueueNode[] } => {
  const allNodes = [...exchanges, ...queues];
  const nodeMap = new Map(allNodes.map((node) => [node.id, node]));

  // Initialize positions if not set
  allNodes.forEach((node, index) => {
    if (!node.position.x && !node.position.y) {
      const angle = (2 * Math.PI * index) / allNodes.length;
      const radius = 200;
      node.position = {
        x: 400 + radius * Math.cos(angle),
        y: 300 + radius * Math.sin(angle),
      };
    }
  });

  // Force-directed layout simulation
  const iterations = 100;
  const k = Math.sqrt((800 * 600) / allNodes.length); // Optimal distance
  const c = 0.1; // Cooling factor

  for (let iter = 0; iter < iterations; iter++) {
    const forces = new Map<string, Position>();

    // Initialize forces
    allNodes.forEach((node) => {
      forces.set(node.id, { x: 0, y: 0 });
    });

    // Repulsive forces between all nodes
    for (let i = 0; i < allNodes.length; i++) {
      for (let j = i + 1; j < allNodes.length; j++) {
        const node1 = allNodes[i];
        const node2 = allNodes[j];
        const center1 = getNodeCenter(node1);
        const center2 = getNodeCenter(node2);
        const distance = calculateDistance(center1, center2);

        if (distance > 0) {
          const force = (k * k) / distance;
          const dx = (center1.x - center2.x) / distance;
          const dy = (center1.y - center2.y) / distance;

          const force1 = forces.get(node1.id)!;
          const force2 = forces.get(node2.id)!;

          force1.x += force * dx;
          force1.y += force * dy;
          force2.x -= force * dx;
          force2.y -= force * dy;
        }
      }
    }

    // Attractive forces for connected nodes
    bindings.forEach((binding) => {
      const exchange = nodeMap.get(binding.exchangeId);
      const queue = nodeMap.get(binding.queueId);

      if (exchange && queue) {
        const center1 = getNodeCenter(exchange);
        const center2 = getNodeCenter(queue);
        const distance = calculateDistance(center1, center2);

        if (distance > 0) {
          const force = (distance * distance) / k;
          const dx = (center2.x - center1.x) / distance;
          const dy = (center2.y - center1.y) / distance;

          const force1 = forces.get(exchange.id)!;
          const force2 = forces.get(queue.id)!;

          force1.x += force * dx;
          force1.y += force * dy;
          force2.x -= force * dx;
          force2.y -= force * dy;
        }
      }
    });

    // Apply forces with cooling
    const temperature = (1 - iter / iterations) * c;
    allNodes.forEach((node) => {
      const force = forces.get(node.id)!;
      const displacement = Math.sqrt(force.x * force.x + force.y * force.y);

      if (displacement > 0) {
        const limitedDisplacement = Math.min(displacement, temperature * 100);
        node.position.x += (force.x / displacement) * limitedDisplacement;
        node.position.y += (force.y / displacement) * limitedDisplacement;

        // Keep nodes within bounds
        node.position.x = Math.max(50, Math.min(750, node.position.x));
        node.position.y = Math.max(50, Math.min(550, node.position.y));
      }
    });
  }

  return {
    exchanges: exchanges,
    queues: queues,
  };
};

/**
 * Check if routing key matches exchange pattern
 */
export const matchesRoutingPattern = (
  routingKey: string,
  pattern: string,
  exchangeType: ExchangeType
): boolean => {
  switch (exchangeType) {
    case "direct":
      return routingKey === pattern;

    case "topic": {
      // Convert topic pattern to regex
      const regexPattern = pattern
        .replace(/\./g, "\\.")
        .replace(/\*/g, "[^.]*")
        .replace(/#/g, ".*");
      const regex = new RegExp(`^${regexPattern}$`);
      return regex.test(routingKey);
    }

    case "fanout":
      return true; // Fanout ignores routing key

    case "headers":
      // Headers exchange matching would require header comparison
      // This is simplified for the visualization
      return true;

    default:
      return false;
  }
};

/**
 * Format large numbers for display
 */
export const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K";
  }
  return num.toString();
};

/**
 * Generate random message for simulation
 */
export const generateRandomMessage = (routingKey: string) => {
  const messageTypes = ["order", "notification", "update", "alert", "log"];
  const randomType =
    messageTypes[Math.floor(Math.random() * messageTypes.length)];

  return {
    body: JSON.stringify({
      type: randomType,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      data: `Sample ${randomType} message`,
    }),
    headers: {
      "content-type": "application/json",
      "message-id": Math.random().toString(36).substr(2, 9),
      "routing-key": routingKey,
    },
    properties: {
      deliveryMode: 2,
      priority: Math.floor(Math.random() * 10),
    },
  };
};

/**
 * Calculate optimal node size based on content
 */
export const calculateNodeSize = (
  name: string,
  type: "exchange" | "queue"
): Size => {
  const baseWidth = type === "exchange" ? 120 : 100;
  const baseHeight = type === "exchange" ? 80 : 60;

  // Add extra width for longer names
  const extraWidth = Math.max(0, (name.length - 10) * 6);

  return {
    width: baseWidth + extraWidth,
    height: baseHeight,
  };
};

/**
 * Debounce function for performance optimization
 */
export const debounce = <T extends (...args: unknown[]) => void>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};
