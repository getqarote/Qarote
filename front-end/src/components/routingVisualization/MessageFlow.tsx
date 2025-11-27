/**
 * Animated message flow component for routing visualization
 */

import React, { useEffect, useState } from "react";
import {
  MessageFlow as MessageFlowType,
  Position,
  ExchangeType,
} from "./types";
import { getExchangeTypeColor } from "./utils";

interface MessageFlowProps {
  flow: MessageFlowType;
  exchangeType: ExchangeType;
  onComplete?: (flowId: string) => void;
  animationSpeed?: number;
}

export const MessageFlow: React.FC<MessageFlowProps> = ({
  flow,
  exchangeType,
  onComplete,
  animationSpeed = 1,
}) => {
  const [currentPosition, setCurrentPosition] = useState<Position>({
    x: 0,
    y: 0,
  });
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (flow.path.length === 0) return;

    const animate = () => {
      const pathIndex = Math.floor(flow.progress * (flow.path.length - 1));
      const nextIndex = Math.min(pathIndex + 1, flow.path.length - 1);

      if (pathIndex < flow.path.length) {
        const current = flow.path[pathIndex];
        const next = flow.path[nextIndex];
        const localProgress =
          flow.progress * (flow.path.length - 1) - pathIndex;

        setCurrentPosition({
          x: current.x + (next.x - current.x) * localProgress,
          y: current.y + (next.y - current.y) * localProgress,
        });
      }

      if (flow.progress >= 1) {
        setTimeout(() => {
          setIsVisible(false);
          onComplete?.(flow.id);
        }, 500);
      }
    };

    animate();
  }, [flow.progress, flow.path, flow.id, onComplete]);

  if (!isVisible || flow.path.length === 0) return null;

  const getStatusColor = () => {
    switch (flow.status) {
      case "routing":
        return getExchangeTypeColor(exchangeType) || "#3b82f6";
      case "delivered":
        return "#10b981";
      case "failed":
        return "#ef4444";
      default:
        return "#6b7280";
    }
  };

  const getStatusIcon = () => {
    switch (flow.status) {
      case "routing":
        return "📤";
      case "delivered":
        return "✅";
      case "failed":
        return "❌";
      default:
        return "📄";
    }
  };

  return (
    <>
      {/* Message Path Trail */}
      <svg
        className="absolute inset-0 pointer-events-none"
        style={{ zIndex: 10 }}
      >
        <defs>
          <linearGradient
            id={`gradient-${flow.id}`}
            x1="0%"
            y1="0%"
            x2="100%"
            y2="0%"
          >
            <stop offset="0%" stopColor={getStatusColor()} stopOpacity="0.2" />
            <stop offset="50%" stopColor={getStatusColor()} stopOpacity="0.6" />
            <stop
              offset="100%"
              stopColor={getStatusColor()}
              stopOpacity="0.2"
            />
          </linearGradient>
        </defs>

        <path
          d={`M ${flow.path.map((p) => `${p.x},${p.y}`).join(" L ")}`}
          stroke={`url(#gradient-${flow.id})`}
          strokeWidth="3"
          fill="none"
          strokeDasharray="5,5"
          className="animate-pulse"
        />
      </svg>

      {/* Animated Message */}
      <div
        className="absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-100 ease-linear"
        style={{
          left: currentPosition.x,
          top: currentPosition.y,
          zIndex: 20,
        }}
      >
        {/* Message Bubble */}
        <div
          className={`
            relative w-8 h-8 rounded-full shadow-lg border-2 border-white
            flex items-center justify-center text-white text-sm font-bold
            animate-bounce
            ${flow.status === "failed" ? "animate-ping" : ""}
          `}
          style={{
            backgroundColor: getStatusColor(),
            animation:
              flow.status === "routing" ? "pulse 1s infinite" : undefined,
          }}
        >
          <span className="text-xs">{getStatusIcon()}</span>
        </div>

        {/* Message Info Tooltip */}
        <div
          className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black bg-opacity-80 text-white text-xs rounded whitespace-nowrap opacity-0 hover:opacity-100 transition-opacity pointer-events-none"
          style={{ zIndex: 30 }}
        >
          <div>Key: {flow.routingKey}</div>
          <div>Status: {flow.status}</div>
          <div>Progress: {Math.round(flow.progress * 100)}%</div>
          {/* Arrow */}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-transparent border-t-black"></div>
        </div>

        {/* Progress Ring */}
        <div className="absolute inset-0 -m-1">
          <svg className="w-10 h-10 transform -rotate-90">
            <circle
              cx="20"
              cy="20"
              r="18"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
              className="text-gray-300"
            />
            <circle
              cx="20"
              cy="20"
              r="18"
              stroke={getStatusColor()}
              strokeWidth="2"
              fill="none"
              strokeDasharray={`${2 * Math.PI * 18}`}
              strokeDashoffset={`${2 * Math.PI * 18 * (1 - flow.progress)}`}
              className="transition-all duration-300"
            />
          </svg>
        </div>

        {/* Spark Effects for Active Messages */}
        {flow.status === "routing" && (
          <div className="absolute inset-0">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 bg-yellow-400 rounded-full animate-ping"
                style={{
                  left: `${50 + Math.sin(Date.now() / 1000 + i * 2) * 20}%`,
                  top: `${50 + Math.cos(Date.now() / 1000 + i * 2) * 20}%`,
                  animationDelay: `${i * 200}ms`,
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Message Metadata Card (visible on hover) */}
      <div
        className="absolute bg-white border border-gray-300 rounded-lg shadow-lg p-3 text-xs opacity-0 hover:opacity-100 transition-opacity pointer-events-none"
        style={{
          left: currentPosition.x + 20,
          top: currentPosition.y - 40,
          zIndex: 25,
          minWidth: "200px",
        }}
      >
        <div className="space-y-1">
          <div className="font-semibold text-gray-800">Message Details</div>
          <div>
            <span className="text-gray-500">ID:</span> {flow.id.substring(0, 8)}
            ...
          </div>
          <div>
            <span className="text-gray-500">Routing Key:</span>{" "}
            {flow.routingKey}
          </div>
          <div>
            <span className="text-gray-500">Status:</span>
            <span
              className={`ml-1 px-1 py-0.5 rounded text-xs ${
                flow.status === "delivered"
                  ? "bg-green-100 text-green-800"
                  : flow.status === "failed"
                    ? "bg-red-100 text-red-800"
                    : "bg-blue-100 text-blue-800"
              }`}
            >
              {flow.status}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Time:</span>{" "}
            {new Date(flow.timestamp).toLocaleTimeString()}
          </div>
          {flow.message && (
            <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
              <div className="font-medium">Body:</div>
              <div className="truncate">
                {flow.message.body.substring(0, 50)}...
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
