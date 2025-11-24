import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ApiError } from "@/lib/api/types";
import { Loader2, Settings, Lock, Crown } from "lucide-react";
import { useWorkspace } from "@/hooks/useWorkspace";
import {
  useWorkspaceThresholds,
  useUpdateWorkspaceThresholds,
} from "@/hooks/useApi";

interface AlertThresholds {
  memory: {
    warning: number;
    critical: number;
  };
  disk: {
    warning: number;
    critical: number;
  };
  fileDescriptors: {
    warning: number;
    critical: number;
  };
  sockets: {
    warning: number;
    critical: number;
  };
  processes: {
    warning: number;
    critical: number;
  };
  queueMessages: {
    warning: number;
    critical: number;
  };
  unackedMessages: {
    warning: number;
    critical: number;
  };
  consumerUtilization: {
    warning: number;
  };
  connections: {
    warning: number;
    critical: number;
  };
  runQueue: {
    warning: number;
    critical: number;
  };
}

interface AlertsConfigureModalProps {
  isOpen: boolean;
  onClose: () => void;
  serverId: string;
}

export function AlertsConfigureModal({
  isOpen,
  onClose,
}: AlertsConfigureModalProps) {
  const { workspace } = useWorkspace();
  const [formData, setFormData] = useState<Partial<AlertThresholds>>({});

  // Query for current thresholds
  const { data: thresholdsData, isLoading } = useWorkspaceThresholds(isOpen);

  // Update form data when thresholds load
  useEffect(() => {
    if (thresholdsData?.thresholds) {
      setFormData(thresholdsData.thresholds);
    }
  }, [thresholdsData]);

  // Mutation for updating thresholds
  const updateThresholdsMutation = useUpdateWorkspaceThresholds();

  const canModify = thresholdsData?.canModify ?? false;

  const handleInputChange = (
    category: keyof AlertThresholds,
    type: "warning" | "critical",
    value: string
  ) => {
    const numericValue = parseFloat(value);
    if (isNaN(numericValue)) return;

    setFormData((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [type]: numericValue,
      },
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canModify) {
      toast.error("Please upgrade to modify alert thresholds");
      return;
    }
    updateThresholdsMutation.mutate(formData as AlertThresholds, {
      onSuccess: () => {
        toast.success("Alert thresholds updated successfully");
        onClose();
      },
      onError: (error: ApiError) => {
        toast.error(error.message || "Failed to update thresholds");
      },
    });
  };

  const resetToDefaults = () => {
    if (thresholdsData?.defaults) {
      setFormData(thresholdsData.defaults);
    }
  };

  const ThresholdCard = ({
    title,
    description,
    category,
    warning,
    critical,
    unit = "%",
    disabled = false,
  }: {
    title: string;
    description: string;
    category: keyof AlertThresholds;
    warning: number;
    critical: number;
    unit?: string;
    disabled?: boolean;
  }) => (
    <Card className={disabled ? "opacity-50" : ""}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">{title}</CardTitle>
          {disabled && <Lock className="h-4 w-4 text-muted-foreground" />}
        </div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor={`${category}-warning`} className="text-xs">
              Warning
            </Label>
            <div className="flex items-center gap-1">
              <Input
                id={`${category}-warning`}
                type="number"
                value={warning}
                onChange={(e) =>
                  handleInputChange(category, "warning", e.target.value)
                }
                disabled={disabled || !canModify}
                className="h-8 text-xs"
              />
              <span className="text-xs text-muted-foreground">{unit}</span>
            </div>
          </div>
          <div>
            <Label htmlFor={`${category}-critical`} className="text-xs">
              Critical
            </Label>
            <div className="flex items-center gap-1">
              <Input
                id={`${category}-critical`}
                type="number"
                value={critical}
                onChange={(e) =>
                  handleInputChange(category, "critical", e.target.value)
                }
                disabled={disabled || !canModify}
                className="h-8 text-xs"
              />
              <span className="text-xs text-muted-foreground">{unit}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Don't render if workspace is not loaded
  if (!workspace?.id) {
    return null;
  }

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configure Alert Thresholds</DialogTitle>
            <DialogDescription>Loading thresholds...</DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configure Alert Thresholds
          </DialogTitle>
          <DialogDescription>
            Customize alert thresholds for your RabbitMQ monitoring system.
            {!canModify && (
              <span className="block mt-2 text-amber-600">
                <Crown className="h-4 w-4 inline mr-1" />
                Upgrade to Developer or Enterprise plan to customize thresholds
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Node Health Thresholds */}
          <div>
            <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
              Node Health Thresholds
              <Badge variant="secondary">System Resources</Badge>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ThresholdCard
                title="Memory Usage"
                description="Memory consumption percentage"
                category="memory"
                warning={formData.memory?.warning ?? 80}
                critical={formData.memory?.critical ?? 95}
                unit="%"
                disabled={!canModify}
              />
              <ThresholdCard
                title="Disk Space"
                description="Free disk space percentage"
                category="disk"
                warning={formData.disk?.warning ?? 15}
                critical={formData.disk?.critical ?? 10}
                unit="% free"
                disabled={!canModify}
              />
              <ThresholdCard
                title="File Descriptors"
                description="File descriptor usage percentage"
                category="fileDescriptors"
                warning={formData.fileDescriptors?.warning ?? 80}
                critical={formData.fileDescriptors?.critical ?? 90}
                unit="%"
                disabled={!canModify}
              />
              <ThresholdCard
                title="Sockets"
                description="Socket usage percentage"
                category="sockets"
                warning={formData.sockets?.warning ?? 80}
                critical={formData.sockets?.critical ?? 90}
                unit="%"
                disabled={!canModify}
              />
            </div>
          </div>

          {/* Queue Health Thresholds */}
          <div>
            <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
              Queue Health Thresholds
              <Badge variant="secondary">Message Processing</Badge>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ThresholdCard
                title="Queue Messages"
                description="Total messages in queue"
                category="queueMessages"
                warning={formData.queueMessages?.warning ?? 10000}
                critical={formData.queueMessages?.critical ?? 50000}
                unit="msgs"
                disabled={!canModify}
              />
              <ThresholdCard
                title="Unacked Messages"
                description="Unacknowledged messages count"
                category="unackedMessages"
                warning={formData.unackedMessages?.warning ?? 1000}
                critical={formData.unackedMessages?.critical ?? 5000}
                unit="msgs"
                disabled={!canModify}
              />
            </div>
          </div>

          {/* Performance Thresholds */}
          <div>
            <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
              Performance Thresholds
              <Badge variant="secondary">System Performance</Badge>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ThresholdCard
                title="Erlang Processes"
                description="Erlang process usage percentage"
                category="processes"
                warning={formData.processes?.warning ?? 80}
                critical={formData.processes?.critical ?? 90}
                unit="%"
                disabled={!canModify}
              />
              <ThresholdCard
                title="Run Queue"
                description="Erlang run queue length"
                category="runQueue"
                warning={formData.runQueue?.warning ?? 10}
                critical={formData.runQueue?.critical ?? 20}
                unit="tasks"
                disabled={!canModify}
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={resetToDefaults}
              disabled={!canModify || updateThresholdsMutation.isPending}
            >
              Reset to Defaults
            </Button>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={updateThresholdsMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!canModify || updateThresholdsMutation.isPending}
                className="bg-gradient-button hover:bg-gradient-button-hover text-white"
              >
                {updateThresholdsMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
