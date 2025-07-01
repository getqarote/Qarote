import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useNodeMemoryDetails } from "@/hooks/useApi";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Info,
  Zap,
  Lock,
  RefreshCw,
} from "lucide-react";

interface NodeMemoryDetailsProps {
  serverId: string;
  nodeName: string;
  onClose?: () => void;
}

export function NodeMemoryDetails({
  serverId,
  nodeName,
  onClose,
}: NodeMemoryDetailsProps) {
  const { workspacePlan, planData } = useWorkspace();
  const {
    data,
    isLoading: loading,
    error: queryError,
  } = useNodeMemoryDetails(serverId, nodeName);

  const error = queryError ? (queryError as Error).message : null;

  // Get plan features for memory access control
  const planFeatures = planData.planFeatures;
  const canViewAdvanced = planFeatures.canViewAdvancedMemoryMetrics || false;
  const canViewExpert = planFeatures.canViewExpertMemoryMetrics || false;
  const canViewTrends = planFeatures.canViewMemoryTrends || false;
  const canViewOptimization = planFeatures.canViewMemoryOptimization || false;

  // TODO: from backend
  const formatBytes = (bytes: number): string => {
    const units = ["B", "KB", "MB", "GB", "TB"];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  };

  // TODO: from backend
  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case "Good":
        return "text-green-600 bg-green-100";
      case "Warning":
        return "text-yellow-600 bg-yellow-100";
      case "Critical":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const PlanUpgradeCard = ({
    feature,
    requiredPlan,
  }: {
    feature: string;
    requiredPlan: string;
  }) => (
    <Card className="border-dashed border-gray-300">
      <CardContent className="flex items-center justify-center p-6">
        <div className="text-center">
          <Lock className="h-8 w-8 mx-auto mb-2 text-gray-400" />
          <p className="text-sm text-gray-600 mb-2">
            {feature} requires {requiredPlan} plan
          </p>
          <p className="text-xs text-gray-500">
            Current plan: {planFeatures.displayName || workspacePlan}
          </p>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Memory Details - {nodeName}</CardTitle>
            {onClose && (
              <Button variant="outline" size="sm" onClick={onClose}>
                Close
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            Loading memory details...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Memory Details - {nodeName}</CardTitle>
            {onClose && (
              <Button variant="outline" size="sm" onClick={onClose}>
                Close
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Memory Details - {data.node.name}
              {data.node.running ? (
                <Badge
                  variant="default"
                  className="bg-green-100 text-green-800"
                >
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Running
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Stopped
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Uptime: {formatUptime(data.node.uptime)}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {onClose && (
              <Button variant="outline" size="sm" onClick={onClose}>
                Close
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="immediate" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="immediate">
              <Info className="h-4 w-4 mr-2" />
              Immediate Value
            </TabsTrigger>
            <TabsTrigger value="advanced" disabled={!canViewAdvanced}>
              <TrendingUp className="h-4 w-4 mr-2" />
              Advanced
              {!canViewAdvanced && <Lock className="h-3 w-3 ml-1" />}
            </TabsTrigger>
            <TabsTrigger value="expert" disabled={!canViewExpert}>
              <Zap className="h-4 w-4 mr-2" />
              Expert
              {!canViewExpert && <Lock className="h-3 w-3 ml-1" />}
            </TabsTrigger>
            <TabsTrigger value="trends" disabled={!canViewTrends}>
              <TrendingUp className="h-4 w-4 mr-2" />
              Trends
              {!canViewTrends && <Lock className="h-3 w-3 ml-1" />}
            </TabsTrigger>
            <TabsTrigger value="optimization" disabled={!canViewOptimization}>
              <TrendingDown className="h-4 w-4 mr-2" />
              Optimization
              {!canViewOptimization && <Lock className="h-3 w-3 ml-1" />}
            </TabsTrigger>
          </TabsList>

          {/* Immediate Value Tab - Available to all plans */}
          <TabsContent value="immediate" className="space-y-4">
            {data.node.immediate && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Memory Usage</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {data.node.immediate.memoryAlarm && (
                      <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          Memory alarm is active!
                        </AlertDescription>
                      </Alert>
                    )}
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Memory Used</span>
                        <span>
                          {data.node.immediate.memoryUsagePercentage.toFixed(1)}
                          %
                        </span>
                      </div>
                      <Progress
                        value={data.node.immediate.memoryUsagePercentage}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>
                          {formatBytes(data.node.immediate.usedMemory)}
                        </span>
                        <span>
                          {formatBytes(data.node.immediate.totalMemory)}
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Used Memory:</span>
                        <p className="font-medium">
                          {formatBytes(data.node.immediate.usedMemory)}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-600">Free Memory:</span>
                        <p className="font-medium">
                          {formatBytes(data.node.immediate.freeMemory)}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-600">Total Memory:</span>
                        <p className="font-medium">
                          {formatBytes(data.node.immediate.totalMemory)}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-600">
                          Calculation Strategy:
                        </span>
                        <p className="font-medium">
                          {data.node.immediate.memoryCalculationStrategy}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Quick Status</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Node Status</span>
                      <Badge
                        variant={data.node.running ? "default" : "destructive"}
                      >
                        {data.node.running ? "Running" : "Stopped"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">
                        Memory Alarm
                      </span>
                      <Badge
                        variant={
                          data.node.immediate.memoryAlarm
                            ? "destructive"
                            : "default"
                        }
                      >
                        {data.node.immediate.memoryAlarm ? "Active" : "Normal"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Uptime</span>
                      <span className="text-sm font-medium">
                        {formatUptime(data.node.uptime)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* Advanced Tab - Startup and Business plans */}
          <TabsContent value="advanced" className="space-y-4">
            {canViewAdvanced && data.node.advanced ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* File Descriptors */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      File Descriptors
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Usage</span>
                        <span>
                          {data.node.advanced.fileDescriptors.usagePercentage.toFixed(
                            1
                          )}
                          %
                        </span>
                      </div>
                      <Progress
                        value={
                          data.node.advanced.fileDescriptors.usagePercentage
                        }
                      />
                      <div className="text-xs text-gray-500">
                        {data.node.advanced.fileDescriptors.used} /{" "}
                        {data.node.advanced.fileDescriptors.total}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Sockets */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Sockets</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Usage</span>
                        <span>
                          {data.node.advanced.sockets.usagePercentage.toFixed(
                            1
                          )}
                          %
                        </span>
                      </div>
                      <Progress
                        value={data.node.advanced.sockets.usagePercentage}
                      />
                      <div className="text-xs text-gray-500">
                        {data.node.advanced.sockets.used} /{" "}
                        {data.node.advanced.sockets.total}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Processes */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Processes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Usage</span>
                        <span>
                          {data.node.advanced.processes.usagePercentage.toFixed(
                            1
                          )}
                          %
                        </span>
                      </div>
                      <Progress
                        value={data.node.advanced.processes.usagePercentage}
                      />
                      <div className="text-xs text-gray-500">
                        {data.node.advanced.processes.used} /{" "}
                        {data.node.advanced.processes.total}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Garbage Collection */}
                <Card className="md:col-span-2 lg:col-span-3">
                  <CardHeader>
                    <CardTitle className="text-base">
                      Garbage Collection
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">GC Count:</span>
                        <p className="font-medium">
                          {data.node.advanced.garbageCollection.gcCount.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-600">Bytes Reclaimed:</span>
                        <p className="font-medium">
                          {formatBytes(
                            data.node.advanced.garbageCollection
                              .gcBytesReclaimed
                          )}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-600">GC Rate:</span>
                        <p className="font-medium">
                          {data.node.advanced.garbageCollection.gcRate.toFixed(
                            2
                          )}
                          /s
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <PlanUpgradeCard
                feature="Advanced Memory Metrics"
                requiredPlan="Startup or Business"
              />
            )}
          </TabsContent>

          {/* Expert Tab - Business plan only */}
          <TabsContent value="expert" className="space-y-4">
            {canViewExpert && data.node.expert ? (
              <div className="space-y-4">
                {/* I/O Metrics */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">I/O Metrics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Read Count:</span>
                        <p className="font-medium">
                          {data.node.expert.ioMetrics.readCount.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-600">Read Bytes:</span>
                        <p className="font-medium">
                          {formatBytes(data.node.expert.ioMetrics.readBytes)}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-600">Write Count:</span>
                        <p className="font-medium">
                          {data.node.expert.ioMetrics.writeCount.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-600">Write Bytes:</span>
                        <p className="font-medium">
                          {formatBytes(data.node.expert.ioMetrics.writeBytes)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Database Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">
                        Mnesia Database
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">
                            RAM Transactions:
                          </span>
                          <p className="font-medium">
                            {data.node.expert.mnesia.ramTransactions.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-600">
                            Disk Transactions:
                          </span>
                          <p className="font-medium">
                            {data.node.expert.mnesia.diskTransactions.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Message Store</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Read Count:</span>
                          <p className="font-medium">
                            {data.node.expert.messageStore.readCount.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-600">Write Count:</span>
                          <p className="font-medium">
                            {data.node.expert.messageStore.writeCount.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* System Metrics */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">System Metrics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Run Queue:</span>
                        <p className="font-medium">
                          {data.node.expert.systemMetrics.runQueue}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-600">Processors:</span>
                        <p className="font-medium">
                          {data.node.expert.systemMetrics.processors}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-600">Context Switches:</span>
                        <p className="font-medium">
                          {data.node.expert.systemMetrics.contextSwitches.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <PlanUpgradeCard
                feature="Expert Memory Metrics"
                requiredPlan="Business"
              />
            )}
          </TabsContent>

          {/* Trends Tab - Startup and Business plans */}
          <TabsContent value="trends" className="space-y-4">
            {canViewTrends && data.node.trends ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Memory Usage Trends
                  </CardTitle>
                  <CardDescription>
                    Rate of change for various metrics (per second)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <span className="text-gray-600">Memory Usage Rate:</span>
                      <span
                        className={`font-medium flex items-center ${
                          data.node.trends.memoryUsageRate > 0
                            ? "text-red-600"
                            : data.node.trends.memoryUsageRate < 0
                              ? "text-green-600"
                              : "text-gray-600"
                        }`}
                      >
                        {data.node.trends.memoryUsageRate > 0 ? (
                          <TrendingUp className="h-4 w-4 mr-1" />
                        ) : data.node.trends.memoryUsageRate < 0 ? (
                          <TrendingDown className="h-4 w-4 mr-1" />
                        ) : null}
                        {formatBytes(
                          Math.abs(data.node.trends.memoryUsageRate)
                        )}
                        /s
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <span className="text-gray-600">FD Usage Rate:</span>
                      <span
                        className={`font-medium ${
                          data.node.trends.fdUsageRate > 0
                            ? "text-red-600"
                            : "text-green-600"
                        }`}
                      >
                        {data.node.trends.fdUsageRate.toFixed(2)}/s
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <span className="text-gray-600">Socket Usage Rate:</span>
                      <span
                        className={`font-medium ${
                          data.node.trends.socketUsageRate > 0
                            ? "text-red-600"
                            : "text-green-600"
                        }`}
                      >
                        {data.node.trends.socketUsageRate.toFixed(2)}/s
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <PlanUpgradeCard
                feature="Memory Trends"
                requiredPlan="Startup or Business"
              />
            )}
          </TabsContent>

          {/* Optimization Tab - Startup and Business plans */}
          <TabsContent value="optimization" className="space-y-4">
            {canViewOptimization && data.node.optimization ? (
              <div className="space-y-4">
                {/* Overall Health */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      Overall Health
                      <Badge
                        className={getHealthColor(
                          data.node.optimization.overallHealth
                        )}
                      >
                        {data.node.optimization.overallHealth}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {data.node.optimization.warnings.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm text-yellow-800">
                          Warnings:
                        </h4>
                        {data.node.optimization.warnings.map(
                          (warning, index) => (
                            <Alert
                              key={index}
                              variant="default"
                              className="border-yellow-200 bg-yellow-50"
                            >
                              <AlertTriangle className="h-4 w-4 text-yellow-600" />
                              <AlertDescription className="text-yellow-800">
                                {warning}
                              </AlertDescription>
                            </Alert>
                          )
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Suggestions */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Optimization Suggestions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {data.node.optimization.suggestions.map(
                        (suggestion, index) => (
                          <div
                            key={index}
                            className="flex items-start gap-2 p-3 bg-blue-50 rounded border border-blue-200"
                          >
                            <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                            <span className="text-sm text-blue-800">
                              {suggestion}
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Recommendations */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Tuning Recommendations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Memory Tuning:</span>
                        <Badge
                          variant={
                            data.node.optimization.recommendations.memoryTuning
                              ? "destructive"
                              : "default"
                          }
                        >
                          {data.node.optimization.recommendations.memoryTuning
                            ? "Recommended"
                            : "Not Needed"}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">
                          Connection Optimization:
                        </span>
                        <Badge
                          variant={
                            data.node.optimization.recommendations
                              .connectionOptimization
                              ? "destructive"
                              : "default"
                          }
                        >
                          {data.node.optimization.recommendations
                            .connectionOptimization
                            ? "Recommended"
                            : "Not Needed"}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">FD Tuning:</span>
                        <Badge
                          variant={
                            data.node.optimization.recommendations
                              .fileDescriptorTuning
                              ? "destructive"
                              : "default"
                          }
                        >
                          {data.node.optimization.recommendations
                            .fileDescriptorTuning
                            ? "Recommended"
                            : "Not Needed"}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">
                          Process Limit Increase:
                        </span>
                        <Badge
                          variant={
                            data.node.optimization.recommendations
                              .processLimitIncrease
                              ? "destructive"
                              : "default"
                          }
                        >
                          {data.node.optimization.recommendations
                            .processLimitIncrease
                            ? "Recommended"
                            : "Not Needed"}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <PlanUpgradeCard
                feature="Memory Optimization"
                requiredPlan="Startup or Business"
              />
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
