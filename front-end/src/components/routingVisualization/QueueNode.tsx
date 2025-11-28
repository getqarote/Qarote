/**
 * Interactive queue node component for routing visualization
 */

import React from "react";

import { CheckCircle, Clock, MessageSquare, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";

import { QueueNode as QueueNodeType } from "./types";
import { formatNumber } from "./utils";

interface QueueNodeProps {
  node: QueueNodeType;
  isSelected: boolean;
  isDragging: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onClick: (e: React.MouseEvent) => void;
  showMetrics?: boolean;
}

export const QueueNode: React.FC<QueueNodeProps> = ({
  node,
  isSelected,
  isDragging,
  onMouseDown,
  onClick,
  showMetrics = true,
}) => {
  const getQueueStatusColor = () => {
    if (!node.isActive) return "bg-gray-500";
    if (node.messagesReady > 100) return "bg-red-500";
    if (node.messagesReady > 50) return "bg-yellow-500";
    return "bg-green-500";
  };

  const getQueueHealthScore = () => {
    const total = node.messagesReady + node.messagesUnacknowledged;
    if (total === 0) return 100;
    return Math.max(0, 100 - (node.messagesUnacknowledged / total) * 100);
  };

  return (
    <div
      className={`
        absolute border-2 rounded-lg bg-white shadow-lg transition-all duration-200 cursor-move
        ${
          isSelected
            ? "border-blue-500 shadow-blue-200"
            : "border-gray-300 hover:border-gray-400"
        }
        ${isDragging ? "scale-105 shadow-xl" : ""}
        ${node.isActive ? "ring-2 ring-green-300" : ""}
      `}
      style={{
        left: node.position.x,
        top: node.position.y,
        width: node.size.width,
        height: node.size.height,
      }}
      onMouseDown={onMouseDown}
      onClick={onClick}
    >
      {/* Header */}
      <div className="h-6 bg-indigo-600 rounded-t-lg flex items-center justify-center text-white font-medium text-xs">
        <MessageSquare className="w-3 h-3 mr-1" />
        Queue
      </div>

      {/* Content */}
      <div className="p-2 space-y-2">
        {/* Queue Name */}
        <div
          className="font-semibold text-gray-800 text-sm truncate"
          title={node.name}
        >
          {node.name}
        </div>

        {/* Status Indicators */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <div
              className={`w-2 h-2 rounded-full ${getQueueStatusColor()} ${
                node.isActive ? "animate-pulse" : ""
              }`}
            ></div>
            <span className="text-xs text-gray-600">
              {node.isActive ? "Active" : "Inactive"}
            </span>
          </div>

          {node.consumerCount > 0 && (
            <div className="flex items-center gap-1">
              <Users className="w-3 h-3 text-gray-500" />
              <span className="text-xs text-gray-600">
                {node.consumerCount}
              </span>
            </div>
          )}
        </div>

        {/* Metrics */}
        {showMetrics && (
          <div className="space-y-1">
            <div className="grid grid-cols-2 gap-1 text-xs">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-blue-500" />
                <span className="text-gray-500">Ready:</span>
              </div>
              <Badge variant="secondary" className="text-xs justify-self-end">
                {formatNumber(node.messagesReady)}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-1 text-xs">
              <div className="flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-yellow-500" />
                <span className="text-gray-500">Unack:</span>
              </div>
              <Badge variant="outline" className="text-xs justify-self-end">
                {formatNumber(node.messagesUnacknowledged)}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-1 text-xs">
              <span className="text-gray-500">Total:</span>
              <Badge variant="default" className="text-xs justify-self-end">
                {formatNumber(node.messageCount)}
              </Badge>
            </div>
          </div>
        )}

        {/* Health Bar */}
        <div className="mt-2">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-gray-500">Health</span>
            <span className="text-xs font-medium text-gray-700">
              {Math.round(getQueueHealthScore())}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full transition-all duration-300 ${
                getQueueHealthScore() > 80
                  ? "bg-green-500"
                  : getQueueHealthScore() > 60
                    ? "bg-yellow-500"
                    : "bg-red-500"
              }`}
              style={{ width: `${getQueueHealthScore()}%` }}
            />
          </div>
        </div>
      </div>

      {/* Message Count Indicator */}
      {node.messageCount > 0 && (
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-indigo-600 rounded-full text-white text-xs font-bold flex items-center justify-center">
          {node.messageCount > 99 ? "99+" : node.messageCount}
        </div>
      )}

      {/* Overflow Warning */}
      {node.messagesReady > 1000 && (
        <div className="absolute -top-1 -left-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
          <span className="text-white text-xs">!</span>
        </div>
      )}

      {/* Connection Point */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Input point (left) */}
        <div
          className="absolute w-3 h-3 bg-indigo-600 rounded-full border-2 border-white -left-1.5 top-1/2 transform -translate-y-1/2"
          style={{ pointerEvents: "auto" }}
        />
      </div>
    </div>
  );
};
