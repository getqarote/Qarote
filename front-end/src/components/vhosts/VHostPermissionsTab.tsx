import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

import { apiClient } from "@/lib/api";
import { VHostPermission } from "@/lib/api/vhostTypes";

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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { useWorkspace } from "@/hooks/useWorkspace";

import { permissionSchema } from "@/schemas/vhost";
import { type PermissionForm } from "@/schemas/vhost";

interface VHostPermissionsTabProps {
  serverId: string;
  vhostName: string;
  permissions: VHostPermission[];
}

export function VHostPermissionsTab({
  serverId,
  vhostName,
  permissions,
}: VHostPermissionsTabProps) {
  const queryClient = useQueryClient();
  const { workspace } = useWorkspace();
  const [showAddModal, setShowAddModal] = useState(false);

  const form = useForm<PermissionForm>({
    resolver: zodResolver(permissionSchema),
    defaultValues: {
      username: "",
      configure: ".*",
      write: ".*",
      read: ".*",
    },
  });

  const addPermissionMutation = useMutation({
    mutationFn: (data: PermissionForm) => {
      if (!workspace?.id) {
        throw new Error("Workspace ID is required");
      }
      return apiClient.setVHostPermissions(
        serverId,
        vhostName,
        data.username,
        {
          username: data.username,
          configure: data.configure,
          write: data.write,
          read: data.read,
        },
        workspace.id
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["vhost", serverId, vhostName],
      });
      toast.success("Permission added successfully");
      form.reset();
      setShowAddModal(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to add permission");
    },
  });

  const deletePermissionMutation = useMutation({
    mutationFn: (username: string) => {
      if (!workspace?.id) {
        throw new Error("Workspace ID is required");
      }
      return apiClient.deleteVHostPermissions(
        serverId,
        vhostName,
        username,
        workspace.id
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["vhost", serverId, vhostName],
      });
      toast.success("Permission deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete permission");
    },
  });

  const onSubmit = (data: PermissionForm) => {
    addPermissionMutation.mutate(data);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              User Permissions
            </CardTitle>
            <CardDescription>
              Manage user access permissions for this virtual host
            </CardDescription>
          </div>
          <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Permission
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add User Permission</DialogTitle>
                <DialogDescription>
                  Grant access permissions for a user to this virtual host.
                </DialogDescription>
              </DialogHeader>

              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter username" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="configure"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Configure Pattern</FormLabel>
                        <FormControl>
                          <Input placeholder=".*" {...field} />
                        </FormControl>
                        <FormDescription>
                          Regex pattern for resources the user can configure
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="write"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Write Pattern</FormLabel>
                        <FormControl>
                          <Input placeholder=".*" {...field} />
                        </FormControl>
                        <FormDescription>
                          Regex pattern for resources the user can write to
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="read"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Read Pattern</FormLabel>
                        <FormControl>
                          <Input placeholder=".*" {...field} />
                        </FormControl>
                        <FormDescription>
                          Regex pattern for resources the user can read from
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
                      disabled={addPermissionMutation.isPending}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={addPermissionMutation.isPending}
                    >
                      {addPermissionMutation.isPending
                        ? "Adding..."
                        : "Add Permission"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {permissions.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No Permissions
            </h3>
            <p className="text-gray-600 mb-4">
              No user permissions have been configured for this virtual host.
            </p>
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Permission
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Configure</TableHead>
                <TableHead>Write</TableHead>
                <TableHead>Read</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {permissions.map((permission) => (
                <TableRow key={permission.user}>
                  <TableCell className="font-medium">
                    {permission.user}
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">
                      {permission.configure}
                    </code>
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">
                      {permission.write}
                    </code>
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">
                      {permission.read}
                    </code>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        deletePermissionMutation.mutate(permission.user)
                      }
                      disabled={deletePermissionMutation.isPending}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
