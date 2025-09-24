/**
 * Control panel for the routing visualization
 */

import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Play,
  Pause,
  RotateCcw,
  Download,
  Settings,
  Eye,
  EyeOff,
  Zap,
  GitBranch,
  Activity,
} from "lucide-react";
import { VisualizationSettings, ExchangeType, FilterOptions } from "./types";

interface VisualizationControlsProps {
  settings: VisualizationSettings;
  onSettingsChange: (settings: VisualizationSettings) => void;
  filterOptions: FilterOptions;
  onFilterChange: (filters: FilterOptions) => void;
  isSimulationRunning: boolean;
  onToggleSimulation: () => void;
  onResetLayout: () => void;
  onExport: () => void;
  metrics: {
    totalNodes: number;
    activeConnections: number;
    messagesPerSecond: number;
    routingSuccessRate: number;
  };
}

export const VisualizationControls: React.FC<VisualizationControlsProps> = ({
  settings,
  onSettingsChange,
  filterOptions,
  onFilterChange,
  isSimulationRunning,
  onToggleSimulation,
  onResetLayout,
  onExport,
  metrics,
}) => {
  const exchangeTypeColors = {
    direct: "bg-blue-500",
    topic: "bg-emerald-500",
    headers: "bg-amber-500",
    fanout: "bg-red-500",
  };

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <GitBranch className="w-5 h-5 text-indigo-600" />
          <h2 className="font-semibold text-gray-800">Routing Controls</h2>
        </div>

        {/* Main Controls */}
        <div className="flex gap-2">
          <Button
            variant={isSimulationRunning ? "destructive" : "default"}
            size="sm"
            onClick={onToggleSimulation}
            className="flex-1"
          >
            {isSimulationRunning ? (
              <>
                <Pause className="w-4 h-4 mr-1" />
                Stop
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-1" />
                Simulate
              </>
            )}
          </Button>

          <Button variant="outline" size="sm" onClick={onResetLayout}>
            <RotateCcw className="w-4 h-4" />
          </Button>

          <Button variant="outline" size="sm" onClick={onExport}>
            <Download className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Real-time Metrics */}
        <Card className="m-4 mb-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Live Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <div className="text-gray-500">Nodes</div>
                <div className="font-semibold">{metrics.totalNodes}</div>
              </div>
              <div>
                <div className="text-gray-500">Active</div>
                <div className="font-semibold text-green-600">
                  {metrics.activeConnections}
                </div>
              </div>
              <div>
                <div className="text-gray-500">Msg/sec</div>
                <div className="font-semibold">
                  {metrics.messagesPerSecond.toFixed(1)}
                </div>
              </div>
              <div>
                <div className="text-gray-500">Success</div>
                <div className="font-semibold text-blue-600">
                  {metrics.routingSuccessRate.toFixed(1)}%
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Display Settings */}
        <Card className="m-4 mb-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Display
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Toggle Controls */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm text-gray-700">Message Flow</label>
                <Switch
                  checked={settings.showMessageFlow}
                  onCheckedChange={(checked) =>
                    onSettingsChange({ ...settings, showMessageFlow: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm text-gray-700">Bindings</label>
                <Switch
                  checked={settings.showBindings}
                  onCheckedChange={(checked) =>
                    onSettingsChange({ ...settings, showBindings: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm text-gray-700">Statistics</label>
                <Switch
                  checked={settings.showStatistics}
                  onCheckedChange={(checked) =>
                    onSettingsChange({ ...settings, showStatistics: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm text-gray-700">Inactive Nodes</label>
                <Switch
                  checked={settings.showInactiveNodes}
                  onCheckedChange={(checked) =>
                    onSettingsChange({
                      ...settings,
                      showInactiveNodes: checked,
                    })
                  }
                />
              </div>
            </div>

            <Separator />

            {/* Animation Speed */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm text-gray-700">Animation Speed</label>
                <Badge variant="outline" className="text-xs">
                  {settings.animationSpeed}x
                </Badge>
              </div>
              <Slider
                value={[settings.animationSpeed]}
                onValueChange={([value]) =>
                  onSettingsChange({ ...settings, animationSpeed: value })
                }
                min={0.1}
                max={3}
                step={0.1}
                className="w-full"
              />
            </div>

            {/* Node Spacing */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm text-gray-700">Node Spacing</label>
                <Badge variant="outline" className="text-xs">
                  {settings.nodeSpacing}px
                </Badge>
              </div>
              <Slider
                value={[settings.nodeSpacing]}
                onValueChange={([value]) =>
                  onSettingsChange({ ...settings, nodeSpacing: value })
                }
                min={50}
                max={200}
                step={10}
                className="w-full"
              />
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card className="m-4 mb-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Exchange Types */}
            <div className="space-y-2">
              <label className="text-sm text-gray-700">Exchange Types</label>
              <div className="grid grid-cols-2 gap-2">
                {(
                  ["direct", "topic", "headers", "fanout"] as ExchangeType[]
                ).map((type) => (
                  <div
                    key={type}
                    className={`
                      p-2 rounded border cursor-pointer transition-all text-center text-xs font-medium
                      ${
                        filterOptions.exchangeTypes.includes(type)
                          ? `${exchangeTypeColors[type]} text-white`
                          : "border-gray-300 bg-gray-50 text-gray-600 hover:bg-gray-100"
                      }
                    `}
                    onClick={() => {
                      const newTypes = filterOptions.exchangeTypes.includes(
                        type
                      )
                        ? filterOptions.exchangeTypes.filter((t) => t !== type)
                        : [...filterOptions.exchangeTypes, type];
                      onFilterChange({
                        ...filterOptions,
                        exchangeTypes: newTypes,
                      });
                    }}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Other Filters */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm text-gray-700">Empty Queues</label>
                <Switch
                  checked={filterOptions.showEmptyQueues}
                  onCheckedChange={(checked) =>
                    onFilterChange({
                      ...filterOptions,
                      showEmptyQueues: checked,
                    })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm text-gray-700">
                  Unbound Exchanges
                </label>
                <Switch
                  checked={filterOptions.showUnboundExchanges}
                  onCheckedChange={(checked) =>
                    onFilterChange({
                      ...filterOptions,
                      showUnboundExchanges: checked,
                    })
                  }
                />
              </div>
            </div>

            {/* Message Count Threshold */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm text-gray-700">Min Messages</label>
                <Badge variant="outline" className="text-xs">
                  {filterOptions.messageCountThreshold}
                </Badge>
              </div>
              <Slider
                value={[filterOptions.messageCountThreshold]}
                onValueChange={([value]) =>
                  onFilterChange({
                    ...filterOptions,
                    messageCountThreshold: value,
                  })
                }
                min={0}
                max={1000}
                step={10}
                className="w-full"
              />
            </div>
          </CardContent>
        </Card>

        {/* Layout Options */}
        <Card className="m-4 mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Layout</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm text-foreground">Auto Layout</label>
              <Switch
                checked={settings.autoLayout}
                onCheckedChange={(checked) =>
                  onSettingsChange({ ...settings, autoLayout: checked })
                }
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-foreground">Theme</label>
              <Select
                value={settings.theme}
                onValueChange={(value: "light" | "dark") =>
                  onSettingsChange({ ...settings, theme: value })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
