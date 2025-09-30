import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Settings,
  MemoryStick,
  HardDrive,
  FileText,
  MessageSquare,
  Users,
  Info,
  Crown,
  Loader2,
} from "lucide-react";
import { AlertThresholds } from "@/types/alerts";
import {
  useWorkspaceThresholds,
  useUpdateWorkspaceThresholds,
} from "@/hooks/useApi";
import { useUser } from "@/hooks/useUser";
import { useAlertsModal } from "@/hooks/useAlertsModal";

const thresholdSchema = z
  .object({
    memory: z.object({
      warning: z.number().min(1).max(100),
      critical: z.number().min(1).max(100),
    }),
    disk: z.object({
      warning: z.number().min(1).max(100),
      critical: z.number().min(1).max(100),
    }),
    fileDescriptors: z.object({
      warning: z.number().min(1).max(100),
      critical: z.number().min(1).max(100),
    }),
    queueMessages: z.object({
      warning: z.number().min(1),
      critical: z.number().min(1),
    }),
    connections: z.object({
      warning: z.number().min(1),
      critical: z.number().min(1),
    }),
  })
  .refine(
    (data) => {
      // Ensure critical thresholds are higher than warning thresholds
      return (
        data.memory.critical > data.memory.warning &&
        data.disk.critical > data.disk.warning &&
        data.fileDescriptors.critical > data.fileDescriptors.warning &&
        data.queueMessages.critical > data.queueMessages.warning &&
        data.connections.critical > data.connections.warning
      );
    },
    {
      message: "Critical thresholds must be higher than warning thresholds",
    }
  );

type ThresholdFormData = z.infer<typeof thresholdSchema>;

interface AlertThresholdsModalProps {
  children?: React.ReactNode;
}

export function AlertThresholdsModal({ children }: AlertThresholdsModalProps) {
  const { userPlan } = useUser();
  const { isThresholdsModalOpen, closeThresholdsModal } = useAlertsModal();

  const { data: thresholdsData, isLoading } = useWorkspaceThresholds();
  const updateThresholds = useUpdateWorkspaceThresholds();

  const form = useForm<ThresholdFormData>({
    resolver: zodResolver(thresholdSchema),
    defaultValues: {
      memory: { warning: 80, critical: 90 },
      disk: { warning: 80, critical: 90 },
      fileDescriptors: { warning: 80, critical: 90 },
      queueMessages: { warning: 1000, critical: 5000 },
      connections: { warning: 100, critical: 500 },
    },
  });

  // Update form when data loads
  useEffect(() => {
    if (thresholdsData?.thresholds) {
      form.reset(thresholdsData.thresholds);
    }
  }, [thresholdsData, form]);

  const canModify = thresholdsData?.canModify ?? false;
  const isPremiumPlan = userPlan === "DEVELOPER" || userPlan === "ENTERPRISE";

  console.log("AlertThresholdsModal debug:", {
    canModify,
    isPremiumPlan,
    userPlan,
    thresholdsData,
    isLoading,
    updateThresholdsPending: updateThresholds.isPending,
  });

  const onSubmit = async (data: ThresholdFormData) => {
    console.log("Form submitted with data:", data);
    console.log("Can modify:", canModify);
    console.log("Update thresholds mutation:", updateThresholds);

    try {
      await updateThresholds.mutateAsync(data as AlertThresholds);
      toast.success("Alert thresholds updated successfully");
      closeThresholdsModal();
    } catch (error) {
      console.error("Error updating thresholds:", error);
      toast.error("Failed to update alert thresholds");
      // Don't close the modal on error so user can retry
    }
  };

  const handleReset = () => {
    if (thresholdsData?.defaults) {
      form.reset(thresholdsData.defaults);
    }
  };

  return (
    <Dialog open={isThresholdsModalOpen} onOpenChange={closeThresholdsModal}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Alert Threshold Configuration
          </DialogTitle>
          <DialogDescription>
            Configure custom alert thresholds for your RabbitMQ monitoring. Set
            warning and critical levels for different system metrics.
          </DialogDescription>
        </DialogHeader>

        {!isPremiumPlan && (
          <Alert>
            <Crown className="h-4 w-4" />
            <AlertDescription>
              Custom alert thresholds are available on Startup and Business
              plans.
              <Button variant="link" className="p-0 ml-2 h-auto">
                Upgrade now
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading threshold settings...</span>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Memory Thresholds */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <MemoryStick className="h-4 w-4" />
                    Memory Usage
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="memory.warning"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Warning Threshold (%)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              max="100"
                              disabled={!canModify}
                              {...field}
                              onChange={(e) =>
                                field.onChange(Number(e.target.value))
                              }
                            />
                          </FormControl>
                          <FormDescription>
                            Alert when memory usage exceeds this percentage
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="memory.critical"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Critical Threshold (%)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              max="100"
                              disabled={!canModify}
                              {...field}
                              onChange={(e) =>
                                field.onChange(Number(e.target.value))
                              }
                            />
                          </FormControl>
                          <FormDescription>
                            Critical alert when memory usage exceeds this
                            percentage
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Disk Thresholds */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <HardDrive className="h-4 w-4" />
                    Disk Usage
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="disk.warning"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Warning Threshold (%)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              max="100"
                              disabled={!canModify}
                              {...field}
                              onChange={(e) =>
                                field.onChange(Number(e.target.value))
                              }
                            />
                          </FormControl>
                          <FormDescription>
                            Alert when disk usage exceeds this percentage
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="disk.critical"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Critical Threshold (%)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              max="100"
                              disabled={!canModify}
                              {...field}
                              onChange={(e) =>
                                field.onChange(Number(e.target.value))
                              }
                            />
                          </FormControl>
                          <FormDescription>
                            Critical alert when disk usage exceeds this
                            percentage
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* File Descriptors Thresholds */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileText className="h-4 w-4" />
                    File Descriptors
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="fileDescriptors.warning"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Warning Threshold (%)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              max="100"
                              disabled={!canModify}
                              {...field}
                              onChange={(e) =>
                                field.onChange(Number(e.target.value))
                              }
                            />
                          </FormControl>
                          <FormDescription>
                            Alert when file descriptor usage exceeds this
                            percentage
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="fileDescriptors.critical"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Critical Threshold (%)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              max="100"
                              disabled={!canModify}
                              {...field}
                              onChange={(e) =>
                                field.onChange(Number(e.target.value))
                              }
                            />
                          </FormControl>
                          <FormDescription>
                            Critical alert when file descriptor usage exceeds
                            this percentage
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Queue Messages Thresholds */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <MessageSquare className="h-4 w-4" />
                    Queue Messages
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="queueMessages.warning"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Warning Threshold (messages)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              disabled={!canModify}
                              {...field}
                              onChange={(e) =>
                                field.onChange(Number(e.target.value))
                              }
                            />
                          </FormControl>
                          <FormDescription>
                            Alert when queue has more than this many messages
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="queueMessages.critical"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Critical Threshold (messages)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              disabled={!canModify}
                              {...field}
                              onChange={(e) =>
                                field.onChange(Number(e.target.value))
                              }
                            />
                          </FormControl>
                          <FormDescription>
                            Critical alert when queue has more than this many
                            messages
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Connections Thresholds */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Users className="h-4 w-4" />
                    Connections
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="connections.warning"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Warning Threshold (connections)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              disabled={!canModify}
                              {...field}
                              onChange={(e) =>
                                field.onChange(Number(e.target.value))
                              }
                            />
                          </FormControl>
                          <FormDescription>
                            Alert when connections exceed this number
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="connections.critical"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Critical Threshold (connections)
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              disabled={!canModify}
                              {...field}
                              onChange={(e) =>
                                field.onChange(Number(e.target.value))
                              }
                            />
                          </FormControl>
                          <FormDescription>
                            Critical alert when connections exceed this number
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-blue-500" />
                  <span className="text-sm text-gray-600">
                    Changes take effect immediately and apply to all alerts
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleReset}
                    disabled={!canModify || isLoading}
                  >
                    Reset to Defaults
                  </Button>
                  <Button
                    type="submit"
                    disabled={!canModify || updateThresholds.isPending}
                  >
                    {updateThresholds.isPending ? (
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
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
