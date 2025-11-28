/**
 * Interactive exchange node component for routing visualization
 */

import React from "react";

import { Badge } from "@/components/ui/badge";

import { ExchangeNode as ExchangeNodeType } from "./types";
import {
  formatNumber,
  getExchangeTypeColor,
  getExchangeTypeIcon,
} from "./utils";

interface ExchangeNodeProps {
  node: ExchangeNodeType;
  isSelected: boolean;
  isDragging: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onClick: (e: React.MouseEvent) => void;
  showMetrics?: boolean;
}

export const ExchangeNode: React.FC<ExchangeNodeProps> = ({
  node,
  isSelected,
  isDragging,
  onMouseDown,
  onClick,
  showMetrics = true,
}) => {
  const typeColor = getExchangeTypeColor(node.type);
  const typeIcon = getExchangeTypeIcon(node.type);

  return (
    <div
      className={`
        absolute border-2 rounded-xl bg-white shadow-lg transition-all duration-200 cursor-move
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
        borderColor: isSelected ? typeColor : undefined,
      }}
      onMouseDown={onMouseDown}
      onClick={onClick}
    >
      {/* Header */}
      <div
        className="h-8 rounded-t-lg flex items-center justify-center text-white font-medium text-sm"
        style={{ backgroundColor: typeColor }}
      >
        <span className="mr-1">{typeIcon}</span>
        <span className="capitalize">{node.type}</span>
      </div>

      {/* Content */}
      <div className="p-3 space-y-2">
        {/* Exchange Name */}
        <div
          className="font-semibold text-gray-800 text-sm truncate"
          title={node.name}
        >
          {node.name}
        </div>

        {/* Active Indicator */}
        {node.isActive && (
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-green-600 font-medium">Active</span>
          </div>
        )}

        {/* Metrics */}
        {showMetrics && (
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">Messages:</span>
              <Badge variant="secondary" className="text-xs">
                {formatNumber(node.messageCount)}
              </Badge>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">Bindings:</span>
              <Badge variant="outline" className="text-xs">
                {node.bindings.length}
              </Badge>
            </div>
          </div>
        )}

        {/* Routing Keys Preview */}
        {node.routingKeys.length > 0 && (
          <div className="mt-2">
            <div className="text-xs text-gray-500 mb-1">Keys:</div>
            <div className="flex flex-wrap gap-1">
              {node.routingKeys.slice(0, 2).map((key, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="text-xs px-1 py-0"
                >
                  {key.length > 8 ? `${key.substring(0, 8)}...` : key}
                </Badge>
              ))}
              {node.routingKeys.length > 2 && (
                <Badge variant="outline" className="text-xs px-1 py-0">
                  +{node.routingKeys.length - 2}
                </Badge>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Message Count Indicator */}
      {node.messageCount > 0 && (
        <div
          className="absolute -top-2 -right-2 w-6 h-6 rounded-full text-white text-xs font-bold flex items-center justify-center"
          style={{ backgroundColor: typeColor }}
        >
          {node.messageCount > 99 ? "99+" : node.messageCount}
        </div>
      )}

      {/* Connection Points */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Input point (left) */}
        <div
          className="absolute w-3 h-3 bg-blue-500 rounded-full border-2 border-white -left-1.5 top-1/2 transform -translate-y-1/2"
          style={{ pointerEvents: "auto" }}
        />

        {/* Output points (right) */}
        <div
          className="absolute w-3 h-3 bg-green-500 rounded-full border-2 border-white -right-1.5 top-1/2 transform -translate-y-1/2"
          style={{ pointerEvents: "auto" }}
        />
      </div>
    </div>
  );
};
