import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { zodResolver } from "@hookform/resolvers/zod";
import { Database } from "lucide-react";
import { toast } from "sonner";

import { apiClient } from "@/lib/api";
import { VHost } from "@/lib/api/vhostTypes";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Textarea } from "@/components/ui/textarea";

import { useWorkspace } from "@/hooks/useWorkspace";

import { editVHostSchema } from "@/schemas/vhost";
import { type EditVHostForm } from "@/schemas/vhost";

interface EditVHostModalProps {
  isOpen: boolean;
  onClose: () => void;
  serverId: string;
  vhost: VHost;
}

export function EditVHostModal({
  isOpen,
  onClose,
  serverId,
  vhost,
}: EditVHostModalProps) {
  const queryClient = useQueryClient();
  const { workspace } = useWorkspace();

  const form = useForm<EditVHostForm>({
    resolver: zodResolver(editVHostSchema),
    defaultValues: {
      description: vhost.description || "",
      tracing: vhost.tracing || false,
    },
  });

  const updateVHostMutation = useMutation({
    mutationFn: (data: EditVHostForm) => {
      if (!workspace?.id) {
        throw new Error("Workspace ID is required");
      }
      return apiClient.updateVHost(serverId, vhost.name, data, workspace.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["vhost", serverId, vhost.name],
      });
      queryClient.invalidateQueries({ queryKey: ["vhosts", serverId] });
      toast.success("Virtual host updated successfully");
      onClose();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update virtual host");
    },
  });

  const onSubmit = (data: EditVHostForm) => {
    updateVHostMutation.mutate(data);
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Edit Virtual Host
          </DialogTitle>
          <DialogDescription>
            Update the configuration for{" "}
            <strong>{vhost.name === "/" ? "Default" : vhost.name}</strong>{" "}
            virtual host.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Description of the virtual host purpose"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tracing"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Enable Tracing</FormLabel>
                    <FormDescription>
                      Enable message tracing for this virtual host
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={updateVHostMutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateVHostMutation.isPending}>
                {updateVHostMutation.isPending ? "Updating..." : "Update"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
