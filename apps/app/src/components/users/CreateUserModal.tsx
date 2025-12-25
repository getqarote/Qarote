import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";

import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { type CreateUserFormData, createUserSchema } from "@/schemas";

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  serverId: string;
  initialName?: string;
  onSuccess?: () => void;
}

export function CreateUserModal({
  isOpen,
  onClose,
  serverId,
  initialName = "",
  onSuccess,
}: CreateUserModalProps) {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      username: initialName,
      password: "",
      tags: "",
    },
  });

  // Update form when initialName changes
  useEffect(() => {
    if (initialName) {
      setValue("username", initialName);
    }
  }, [initialName, setValue]);

  const createUserMutation = useCreateUser();

  // Handle success/error
  useEffect(() => {
    if (createUserMutation.isSuccess) {
      queryClient.invalidateQueries({ queryKey: ["users", serverId] });
      toast.success("User created successfully");
      reset();
      onSuccess?.();
      onClose();
    }
    if (createUserMutation.isError) {
      toast.error(createUserMutation.error?.message || "Failed to create user");
    }
  }, [
    createUserMutation.isSuccess,
    createUserMutation.isError,
    createUserMutation.error,
  ]);

  const onSubmit = (data: CreateUserFormData) => {
    createUserMutation.mutate(data);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create User</DialogTitle>
          <DialogDescription>
            Add a new RabbitMQ user to the server.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              {...register("username")}
              placeholder="Enter username"
            />
            {errors.username && (
              <p className="text-sm text-red-600">{errors.username.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              {...register("password")}
              placeholder="Enter password"
            />
            {errors.password && (
              <p className="text-sm text-red-600">{errors.password.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags (optional)</Label>
            <Input
              id="tags"
              {...register("tags")}
              placeholder="e.g., administrator, monitoring"
            />
            {errors.tags && (
              <p className="text-sm text-red-600">{errors.tags.message}</p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={createUserMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createUserMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {createUserMutation.isPending ? "Creating..." : "Create User"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
