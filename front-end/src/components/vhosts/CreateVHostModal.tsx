import React from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { zodResolver } from "@hookform/resolvers/zod";
import { Database } from "lucide-react";
import { toast } from "sonner";

import { apiClient } from "@/lib/api";

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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { useWorkspace } from "@/hooks/useWorkspace";

import { createVHostSchema } from "@/schemas/vhost";
import { type CreateVHostForm } from "@/schemas/vhost";

interface CreateVHostModalProps {
  isOpen: boolean;
  onClose: () => void;
  serverId: string;
  initialName?: string;
  onSuccess?: () => void;
}

export function CreateVHostModal({
  isOpen,
  onClose,
  serverId,
  initialName = "",
  onSuccess,
}: CreateVHostModalProps) {
  const queryClient = useQueryClient();
  const { workspace } = useWorkspace();

  const form = useForm<CreateVHostForm>({
    resolver: zodResolver(createVHostSchema),
    defaultValues: {
      name: initialName,
      description: "",
      tracing: false,
    },
  });

  // Update form when initialName changes
  React.useEffect(() => {
    if (initialName) {
      form.setValue("name", initialName);
    }
  }, [initialName, form]);

  const createVHostMutation = useMutation({
    mutationFn: (data: CreateVHostForm) => {
      if (!workspace?.id) {
        throw new Error("Workspace ID is required");
      }
      return apiClient.createVHost(
        serverId,
        {
          name: data.name,
          description: data.description,
          tracing: data.tracing,
        },
        workspace.id
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vhosts", serverId] });
      toast.success("Virtual host created successfully");
      form.reset();
      onSuccess?.();
      onClose();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create virtual host");
    },
  });

  const onSubmit = (data: CreateVHostForm) => {
    createVHostMutation.mutate(data);
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
            Create Virtual Host
          </DialogTitle>
          <DialogDescription>
            Create a new virtual host for logical isolation of resources.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., production, staging" {...field} />
                  </FormControl>
                  <FormDescription>
                    Unique name for the virtual host
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
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
                disabled={createVHostMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createVHostMutation.isPending}
                className="btn-primary text-white"
              >
                {createVHostMutation.isPending ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
