import { useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { apiClient } from "@/lib/api";
import { toast } from "sonner";
import { useWorkspace } from "@/hooks/useWorkspace";

const createUserSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
  tags: z.string().optional(),
});

type CreateUserFormData = z.infer<typeof createUserSchema>;

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
  const { workspace } = useWorkspace();

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

  const createUserMutation = useMutation({
    mutationFn: (data: CreateUserFormData) => {
      if (!workspace?.id) {
        throw new Error("Workspace ID is required");
      }
      return apiClient.createUser(
        serverId,
        {
          username: data.username,
          password: data.password,
          tags: data.tags,
        },
        workspace.id
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users", serverId] });
      toast.success("User created successfully");
      reset();
      onSuccess?.();
      onClose();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create user");
    },
  });

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
