import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import {
  User,
  AlertCircle,
  Trash2,
  Edit,
  ChevronUp,
  Server,
} from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlanBadge } from "@/components/ui/PlanBadge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PageLoader } from "@/components/PageLoader";
import { ConnectionStatus } from "@/components/ConnectionStatus";
import { NoServerConfigured } from "@/components/NoServerConfigured";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useServerContext } from "@/contexts/ServerContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/lib/api";
import { formatTagsDisplay, formatVhostsDisplay } from "@/lib/formatTags";
import { RabbitMQUser } from "@/lib/api/userTypes";
import { CreateUserModal } from "@/components/users/CreateUserModal";
import { DeleteUserModal } from "@/components/users/DeleteUserModal";
import { toast } from "sonner";

export default function UsersPage() {
  const { serverId } = useParams<{ serverId: string }>();
  const { selectedServerId, hasServers } = useServerContext();
  const { workspacePlan } = useWorkspace();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deleteUser, setDeleteUser] = useState<RabbitMQUser | null>(null);
  const [filterRegex, setFilterRegex] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserTags, setNewUserTags] = useState("");
  const [newUserVhost, setNewUserVhost] = useState("/");

  const currentServerId = serverId || selectedServerId;

  const {
    data: usersData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["users", currentServerId],
    queryFn: () => apiClient.getUsers(currentServerId!),
    enabled: !!currentServerId,
  });

  const { data: vhostsData } = useQuery({
    queryKey: ["vhosts", currentServerId],
    queryFn: () => apiClient.getVHosts(currentServerId!),
    enabled: !!currentServerId,
  });

  const deleteUserMutation = useMutation({
    mutationFn: (username: string) =>
      apiClient.deleteUser(currentServerId!, username),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users", currentServerId] });
      toast.success("User deleted successfully");
      setDeleteUser(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete user");
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: {
      username: string;
      password: string;
      tags?: string;
    }) => {
      // First create the user
      await apiClient.createUser(currentServerId!, data);

      // Then set permissions on the selected virtual host
      await apiClient.setUserPermissions(currentServerId!, data.username, {
        vhost: newUserVhost,
        configure: ".*",
        write: ".*",
        read: ".*",
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users", currentServerId] });
      toast.success("User created successfully");
      setNewUserName("");
      setNewUserPassword("");
      setNewUserTags("");
      setNewUserVhost("/");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create user");
    },
  });

  // Redirect non-admin users
  if (user?.role !== "ADMIN") {
    return (
      <SidebarProvider>
        <div className="page-layout">
          <AppSidebar />
          <main className="main-content-scrollable">
            <div className="content-container-large">
              <div className="flex items-center gap-4">
                <SidebarTrigger />
              </div>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Access denied. User management is only available to
                  administrators.
                </AlertDescription>
              </Alert>
            </div>
          </main>
        </div>
      </SidebarProvider>
    );
  }

  // No servers configured
  if (!hasServers) {
    return (
      <SidebarProvider>
        <div className="page-layout">
          <AppSidebar />
          <main className="main-content-scrollable">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
            </div>
            <NoServerConfigured
              title="Users"
              description="Add a RabbitMQ server connection to manage users and their access permissions."
            />
          </main>
        </div>
      </SidebarProvider>
    );
  }

  if (!currentServerId) {
    return (
      <SidebarProvider>
        <div className="page-layout">
          <AppSidebar />
          <main className="main-content-scrollable">
            <div className="content-container-large">
              <div className="flex items-center gap-4">
                <SidebarTrigger />
                <div>
                  <h1 className="title-page">Users</h1>
                  <p className="text-gray-500">
                    Manage RabbitMQ users and their access permissions
                  </p>
                </div>
              </div>
              <Card className="border-0 shadow-md bg-card">
                <CardContent className="p-12">
                  <div className="text-center">
                    <Server className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                      No Server Selected
                    </h2>
                    <p className="text-gray-600">
                      Please select a RabbitMQ server to manage users.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </SidebarProvider>
    );
  }

  if (isLoading) {
    return (
      <SidebarProvider>
        <div className="page-layout">
          <AppSidebar />
          <main className="main-content-scrollable">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
            </div>
            <PageLoader />
          </main>
        </div>
      </SidebarProvider>
    );
  }

  if (error) {
    return (
      <SidebarProvider>
        <div className="page-layout">
          <AppSidebar />
          <main className="main-content-scrollable">
            <div className="content-container-large">
              <div className="flex items-center gap-4">
                <SidebarTrigger />
              </div>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Failed to load users: {(error as Error).message}
                </AlertDescription>
              </Alert>
            </div>
          </main>
        </div>
      </SidebarProvider>
    );
  }

  const users = usersData?.users || [];

  // Filter users based on regex
  const filteredUsers = users.filter((user) => {
    if (!filterRegex) return true;
    try {
      const regex = new RegExp(filterRegex, "i");
      return regex.test(user.name);
    } catch {
      return user.name.toLowerCase().includes(filterRegex.toLowerCase());
    }
  });

  return (
    <TooltipProvider>
      <SidebarProvider>
        <div className="page-layout">
          <AppSidebar />
          <main className="main-content-scrollable">
            <div className="content-container-large">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <SidebarTrigger />
                  <div>
                    <h1 className="title-page">Users</h1>
                    <p className="text-gray-500">
                      Manage RabbitMQ users and their access permissions
                    </p>
                  </div>
                  <Badge variant="secondary" className="ml-2">
                    {users.length}
                  </Badge>
                </div>
                <div className="flex items-center gap-3">
                  <PlanBadge workspacePlan={workspacePlan} />
                  <ConnectionStatus />
                </div>
              </div>

              {/* Filter */}
              <div className="flex items-center gap-4">
                <Input
                  placeholder="Filter regex"
                  value={filterRegex}
                  onChange={(e) => setFilterRegex(e.target.value)}
                  className="max-w-xs"
                />
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <span>+/-</span>
                </div>
              </div>

              {/* Users Table */}
              <Card className="border-0 shadow-md bg-card">
                <CardHeader>
                  <CardTitle className="text-lg">Users</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[200px]">
                            <div className="flex items-center gap-1">
                              Name
                              <ChevronUp className="h-3 w-3" />
                            </div>
                          </TableHead>
                          <TableHead>Tags</TableHead>
                          <TableHead>Can access virtual hosts</TableHead>
                          <TableHead>Has password</TableHead>
                          <TableHead className="w-[100px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers.map((user) => (
                          <TableRow
                            key={user.name}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() =>
                              navigate(
                                `/users/${encodeURIComponent(user.name)}`
                              )
                            }
                          >
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4" />
                                {user.name}
                              </div>
                            </TableCell>
                            <TableCell>
                              {formatTagsDisplay(user.tags)}
                            </TableCell>
                            <TableCell>
                              {formatVhostsDisplay(user.accessibleVhosts)}
                            </TableCell>
                            <TableCell>
                              <div className="w-2 h-2 rounded-full bg-green-500"></div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(
                                      `/users/${encodeURIComponent(user.name)}`
                                    );
                                  }}
                                  className="h-8 w-8 p-0"
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                                {user.name !== "admin" && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDeleteUser(user);
                                    }}
                                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Add User Form */}
              <Card className="border-0 shadow-md bg-card">
                <CardHeader>
                  <CardTitle className="text-lg">Add user</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-6 max-w-lg">
                    <div>
                      <label
                        htmlFor="user-name"
                        className="block text-sm font-medium mb-2"
                      >
                        Username
                      </label>
                      <Input
                        id="user-name"
                        value={newUserName}
                        onChange={(e) => setNewUserName(e.target.value)}
                        placeholder="briceth"
                        className="w-full"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="user-password"
                        className="block text-sm font-medium mb-2"
                      >
                        Password{" "}
                        <span className="text-muted-foreground">
                          (optional)
                        </span>
                      </label>
                      <Input
                        id="user-password"
                        type="password"
                        value={newUserPassword}
                        onChange={(e) => setNewUserPassword(e.target.value)}
                        placeholder="Leave empty for certificate-based auth"
                        className="w-full"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="user-tags"
                        className="block text-sm font-medium mb-2"
                      >
                        Tags
                      </label>
                      <Input
                        id="user-tags"
                        value={newUserTags}
                        onChange={(e) => setNewUserTags(e.target.value)}
                        placeholder="policymaker, monitoring, management"
                        className="w-full"
                      />
                      <div className="mt-2 text-sm text-muted-foreground">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span
                              className="font-medium cursor-pointer hover:text-foreground transition-colors"
                              onClick={() => {
                                const tag = "administrator";
                                if (newUserTags.trim()) {
                                  setNewUserTags(newUserTags + ", " + tag);
                                } else {
                                  setNewUserTags(tag);
                                }
                              }}
                            >
                              Administrator
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>
                              Full management access to all RabbitMQ features
                            </p>
                          </TooltipContent>
                        </Tooltip>{" "}
                        |{" "}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span
                              className="font-medium cursor-pointer hover:text-foreground transition-colors"
                              onClick={() => {
                                const tag = "policymaker";
                                if (newUserTags.trim()) {
                                  setNewUserTags(newUserTags + ", " + tag);
                                } else {
                                  setNewUserTags(tag);
                                }
                              }}
                            >
                              Policymaker
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>
                              Can set policies and manage
                              vhosts/exchanges/queues
                            </p>
                          </TooltipContent>
                        </Tooltip>{" "}
                        |{" "}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span
                              className="font-medium cursor-pointer hover:text-foreground transition-colors"
                              onClick={() => {
                                const tag = "monitoring";
                                if (newUserTags.trim()) {
                                  setNewUserTags(newUserTags + ", " + tag);
                                } else {
                                  setNewUserTags(tag);
                                }
                              }}
                            >
                              Monitoring
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Read-only access for monitoring and metrics</p>
                          </TooltipContent>
                        </Tooltip>{" "}
                        |{" "}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span
                              className="font-medium cursor-pointer hover:text-foreground transition-colors"
                              onClick={() => {
                                const tag = "management";
                                if (newUserTags.trim()) {
                                  setNewUserTags(newUserTags + ", " + tag);
                                } else {
                                  setNewUserTags(tag);
                                }
                              }}
                            >
                              Management
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Access to the management UI and HTTP API</p>
                          </TooltipContent>
                        </Tooltip>{" "}
                        |{" "}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span
                              className="font-medium cursor-pointer hover:text-foreground transition-colors"
                              onClick={() => {
                                const tag = "impersonator";
                                if (newUserTags.trim()) {
                                  setNewUserTags(newUserTags + ", " + tag);
                                } else {
                                  setNewUserTags(tag);
                                }
                              }}
                            >
                              Impersonator
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Can impersonate other users for connections</p>
                          </TooltipContent>
                        </Tooltip>{" "}
                        |{" "}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span
                              className="font-medium cursor-pointer hover:text-foreground transition-colors"
                              onClick={() => {
                                setNewUserTags("");
                              }}
                            >
                              None
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Regular user with no special privileges</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </div>

                    {/* Virtual Host Access Section */}
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Virtual Host Access
                      </label>
                      <select
                        className="w-full p-2 border rounded-md bg-background"
                        value={newUserVhost}
                        onChange={(e) => setNewUserVhost(e.target.value)}
                      >
                        {vhostsData?.vhosts?.map((vhost) => (
                          <option key={vhost.name} value={vhost.name}>
                            {vhost.name}
                          </option>
                        ))}
                      </select>
                      <div className="mt-1 text-xs text-muted-foreground">
                        User will be granted full permissions (.*) on the
                        selected virtual host
                      </div>
                    </div>

                    <div>
                      <Button
                        onClick={() => {
                          if (!newUserName.trim()) {
                            toast.error("Username is required");
                            return;
                          }
                          createUserMutation.mutate({
                            username: newUserName.trim(),
                            password: newUserPassword.trim() || undefined,
                            tags: newUserTags.trim() || undefined,
                          });
                        }}
                        disabled={
                          createUserMutation.isPending || !newUserName.trim()
                        }
                        className="btn-primary"
                      >
                        {createUserMutation.isPending
                          ? "Adding..."
                          : "Add user"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Modals */}
              <CreateUserModal
                isOpen={showCreateModal}
                onClose={() => {
                  setShowCreateModal(false);
                  setNewUserName("");
                  setNewUserPassword("");
                  setNewUserTags("");
                }}
                serverId={currentServerId}
                initialName={newUserName}
                onSuccess={() => {
                  setNewUserName("");
                  setNewUserPassword("");
                  setNewUserTags("");
                }}
              />

              {deleteUser && (
                <DeleteUserModal
                  isOpen={true}
                  onClose={() => setDeleteUser(null)}
                  user={deleteUser}
                  onConfirm={() => deleteUserMutation.mutate(deleteUser.name)}
                  isLoading={deleteUserMutation.isPending}
                />
              )}
            </div>
          </main>
        </div>
      </SidebarProvider>
    </TooltipProvider>
  );
}
