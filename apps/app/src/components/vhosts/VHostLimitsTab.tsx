import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";

import { zodResolver } from "@hookform/resolvers/zod";
import { Edit, Plus, Settings, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { VHostLimits } from "@/lib/api/vhostTypes";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  useDeleteVHostLimit,
  useSetVHostLimit,
} from "@/hooks/queries/useRabbitMQVHosts";
import { useWorkspace } from "@/hooks/ui/useWorkspace";

import {
  type EditLimitValueForm,
  editLimitValueSchema,
  type LimitForm,
  limitSchema,
} from "@/schemas";

interface VHostLimitsTabProps {
  serverId: string;
  vhostName: string;
  limits: VHostLimits;
}

const limitLabels = {
  "max-connections": "Max Connections",
  "max-queues": "Max Queues",
  "max-channels": "Max Channels",
};

const limitDescriptions = {
  "max-connections": "Maximum number of connections allowed",
  "max-queues": "Maximum number of queues allowed",
  "max-channels": "Maximum number of channels allowed",
};

export function VHostLimitsTab({
  serverId,
  vhostName,
  limits,
}: VHostLimitsTabProps) {
  const queryClient = useQueryClient();
  const { workspace } = useWorkspace();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingLimit, setEditingLimit] = useState<{
    type: string;
    value: number;
  } | null>(null);

  const form = useForm<LimitForm>({
    resolver: zodResolver(limitSchema),
    defaultValues: {
      limitType: "max-connections",
      value: 100,
    },
  });

  const editForm = useForm<EditLimitValueForm>({
    resolver: zodResolver(editLimitValueSchema),
  });

  const setLimitMutation = useSetVHostLimit();
  const deleteLimitMutation = useDeleteVHostLimit();

  // Handle success/error for setLimit
  useEffect(() => {
    if (setLimitMutation.isSuccess) {
      queryClient.invalidateQueries({
        queryKey: ["vhost", serverId, vhostName],
      });
      toast.success("Limit set successfully");
      form.reset();
      setShowAddModal(false);
    }
    if (setLimitMutation.isError) {
      toast.error(setLimitMutation.error?.message || "Failed to set limit");
    }
  }, [
    setLimitMutation.isSuccess,
    setLimitMutation.isError,
    setLimitMutation.error,
  ]);

  // Handle success/error for deleteLimit
  useEffect(() => {
    if (deleteLimitMutation.isSuccess) {
      queryClient.invalidateQueries({
        queryKey: ["vhost", serverId, vhostName],
      });
      toast.success("Limit removed successfully");
    }
    if (deleteLimitMutation.isError) {
      toast.error(
        deleteLimitMutation.error?.message || "Failed to remove limit"
      );
    }
  }, [
    deleteLimitMutation.isSuccess,
    deleteLimitMutation.isError,
    deleteLimitMutation.error,
  ]);

  const onSubmit = (data: LimitForm) => {
    if (!workspace?.id) {
      toast.error("Workspace ID is required");
      return;
    }
    setLimitMutation.mutate({
      serverId,
      workspaceId: workspace.id,
      vhostName,
      limitType: data.limitType,
      value: data.value,
    });
  };

  const onEditSubmit = (data: { value: number }) => {
    if (!editingLimit || !workspace?.id) {
      return;
    }
    setLimitMutation.mutate({
      serverId,
      workspaceId: workspace.id,
      vhostName,
      limitType: editingLimit.type as
        | "max-connections"
        | "max-queues"
        | "max-channels",
      value: data.value,
    });
  };

  const limitEntries = Object.entries(limits).filter(
    ([_, value]) => value !== undefined
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Virtual Host Limits
            </CardTitle>
            <CardDescription>
              Configure resource limits for this virtual host
            </CardDescription>
          </div>
          <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Limit
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add Resource Limit</DialogTitle>
                <DialogDescription>
                  Set a resource limit for this virtual host.
                </DialogDescription>
              </DialogHeader>

              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={form.control}
                    name="limitType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Limit Type</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select limit type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="max-connections">
                              Max Connections
                            </SelectItem>
                            <SelectItem value="max-queues">
                              Max Queues
                            </SelectItem>
                            <SelectItem value="max-channels">
                              Max Channels
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="value"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Limit Value</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            {...field}
                            onChange={(e) =>
                              field.onChange(parseInt(e.target.value) || 0)
                            }
                          />
                        </FormControl>
                        <FormDescription>
                          Maximum allowed value for this resource
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        form.reset();
                        setShowAddModal(false);
                      }}
                      disabled={setLimitMutation.isPending}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={setLimitMutation.isPending}>
                      {setLimitMutation.isPending ? "Setting..." : "Set Limit"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {limitEntries.length === 0 ? (
          <div className="text-center py-8">
            <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No Limits
            </h3>
            <p className="text-gray-600 mb-4">
              No resource limits have been configured for this virtual host.
            </p>
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Limit
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Limit Type</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-[150px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {limitEntries.map(([limitType, value]) => (
                <TableRow key={limitType}>
                  <TableCell className="font-medium">
                    {limitLabels[limitType as keyof typeof limitLabels] ||
                      limitType}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{value}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {limitDescriptions[
                      limitType as keyof typeof limitDescriptions
                    ] || "Custom limit"}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingLimit({
                            type: limitType,
                            value: value as number,
                          });
                          editForm.reset({ value: value as number });
                        }}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (!workspace?.id) {
                            toast.error("Workspace ID is required");
                            return;
                          }
                          deleteLimitMutation.mutate({
                            serverId,
                            workspaceId: workspace.id,
                            vhostName,
                            limitType: limitType as
                              | "max-connections"
                              | "max-queues"
                              | "max-channels",
                          });
                        }}
                        disabled={deleteLimitMutation.isPending}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Edit Limit Modal */}
      <Dialog
        open={!!editingLimit}
        onOpenChange={(open) => !open && setEditingLimit(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Limit</DialogTitle>
            <DialogDescription>
              Update the value for{" "}
              {editingLimit &&
                limitLabels[editingLimit.type as keyof typeof limitLabels]}
            </DialogDescription>
          </DialogHeader>

          <Form {...editForm}>
            <form
              onSubmit={editForm.handleSubmit(onEditSubmit)}
              className="space-y-4"
            >
              <FormField
                control={editForm.control}
                name="value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Limit Value</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseInt(e.target.value) || 0)
                        }
                      />
                    </FormControl>
                    <FormDescription>
                      Maximum allowed value for this resource
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingLimit(null)}
                  disabled={setLimitMutation.isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={setLimitMutation.isPending}>
                  {setLimitMutation.isPending ? "Updating..." : "Update"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
