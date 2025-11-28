import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  AlertCircle,
  ChevronUp,
  Edit,
  Server,
  Trash2,
  User,
} from "lucide-react";
import { toast } from "sonner";

import { RabbitMQUser } from "@/lib/api/userTypes";
import { formatTagsDisplay, formatVhostsDisplay } from "@/lib/formatTags";

import { AppSidebar } from "@/components/AppSidebar";
import { NoServerConfigured } from "@/components/NoServerConfigured";
import { PageLoader } from "@/components/PageLoader";
import { PlanUpgradeModal } from "@/components/plans/PlanUpgradeModal";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PlanBadge } from "@/components/ui/PlanBadge";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AddUserButton } from "@/components/users/AddUserButton";
import { DeleteUserModal } from "@/components/users/DeleteUserModal";

import { useAuth } from "@/contexts/AuthContextDefinition";
import { useServerContext } from "@/contexts/ServerContext";

import { useDeleteUser, useServers, useUsers, useVHosts } from "@/hooks/useApi";

export default function UsersPage() {
  const { serverId } = useParams<{ serverId: string }>();
  const { selectedServerId, hasServers } = useServerContext();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: serversData } = useServers();
  const servers = serversData?.servers || [];

  const [deleteUser, setDeleteUser] = useState<RabbitMQUser | null>(null);
  const [filterRegex, setFilterRegex] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserTags, setNewUserTags] = useState("");
  const [newUserVhost, setNewUserVhost] = useState("/");
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const currentServerId = serverId || selectedServerId;
  // Validate that the server actually exists
  const serverExists = currentServerId
    ? servers.some((s) => s.id === currentServerId)
    : false;

  const {
    data: usersData,
    isLoading,
    error,
  } = useUsers(currentServerId, serverExists);

  const { data: vhostsData } = useVHosts(currentServerId, serverExists);

  const deleteUserMutation = useDeleteUser();

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
                  <PlanBadge />
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
                              <div
                                className={`w-2 h-2 rounded-full ${user.password_hash && user.password_hash.trim() ? "bg-green-500" : "bg-red-500"}`}
                              ></div>
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
                        placeholder="administrator"
                        className="w-full"
                      />
                      <div className="mt-2 text-sm text-muted-foreground">
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
                        </span>{" "}
                        |{" "}
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
                        </span>{" "}
                        |{" "}
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
                        </span>{" "}
                        |{" "}
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
                        </span>{" "}
                        |{" "}
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
                        </span>{" "}
                        |{" "}
                        <span
                          className="font-medium cursor-pointer hover:text-foreground transition-colors"
                          onClick={() => {
                            setNewUserTags("");
                          }}
                        >
                          None
                        </span>
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
                      <AddUserButton
                        serverId={currentServerId}
                        onSuccess={() => {
                          setNewUserName("");
                          setNewUserPassword("");
                          setNewUserTags("");
                          setNewUserVhost("/");
                        }}
                        initialName={newUserName}
                        initialPassword={newUserPassword}
                        initialTags={newUserTags}
                        initialVhost={newUserVhost}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Modals */}

              {deleteUser && (
                <DeleteUserModal
                  isOpen={true}
                  onClose={() => setDeleteUser(null)}
                  user={deleteUser}
                  onConfirm={async () => {
                    try {
                      await deleteUserMutation.mutateAsync({
                        serverId: currentServerId!,
                        username: deleteUser.name,
                      });
                      toast.success("User deleted successfully");
                      setDeleteUser(null);
                    } catch (error) {
                      toast.error(
                        error instanceof Error
                          ? error.message
                          : "Failed to delete user"
                      );
                    }
                  }}
                  isLoading={deleteUserMutation.isPending}
                />
              )}

              <PlanUpgradeModal
                isOpen={showUpgradeModal}
                onClose={() => setShowUpgradeModal(false)}
                feature="User Management"
              />
            </div>
          </main>
        </div>
      </SidebarProvider>
    </TooltipProvider>
  );
}
