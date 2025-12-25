import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { AlertCircle, ArrowLeft, Lock } from "lucide-react";
import { toast } from "sonner";

import { AppSidebar } from "@/components/AppSidebar";
import { ConnectionStatus } from "@/components/ConnectionStatus";
import { PageLoader } from "@/components/PageLoader";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DeleteVHostModal } from "@/components/vhosts/DeleteVHostModal";
import { EditVHostModal } from "@/components/vhosts/EditVHostModal";

import { useAuth } from "@/contexts/AuthContextDefinition";
import { useServerContext } from "@/contexts/ServerContext";

import { useUsers } from "@/hooks/queries/useRabbitMQUsers";
import {
  useDeleteVHost,
  useDeleteVHostPermissions,
  useSetVHostLimit,
  useSetVHostPermissions,
  useVHost,
} from "@/hooks/queries/useRabbitMQVHosts";
import { useServers } from "@/hooks/queries/useServer";
import { useWorkspace } from "@/hooks/ui/useWorkspace";

export default function VHostDetailsPage() {
  const { serverId, vhostName } = useParams<{
    serverId?: string;
    vhostName: string;
  }>();
  const { selectedServerId } = useServerContext();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Form states
  const [selectedUser, setSelectedUser] = useState("admin");
  const [configureRegexp, setConfigureRegexp] = useState(".*");
  const [writeRegexp, setWriteRegexp] = useState(".*");
  const [readRegexp, setReadRegexp] = useState(".*");
  const [maxConnections, setMaxConnections] = useState("");
  const [maxQueues, setMaxQueues] = useState("");

  const { data: serversData } = useServers();
  const servers = serversData?.servers || [];

  const currentServerId = serverId || selectedServerId;
  const decodedVHostName = decodeURIComponent(vhostName || "");
  // Validate that the server actually exists
  const serverExists = currentServerId
    ? servers.some((s) => s.id === currentServerId)
    : false;

  const {
    data: vhostData,
    isLoading,
    error,
  } = useVHost(currentServerId, decodedVHostName, serverExists);

  // Fetch users for the permission form
  const { data: usersData } = useUsers(currentServerId, serverExists);

  const deleteVHostMutation = useDeleteVHost();
  const setPermissionsMutation = useSetVHostPermissions();
  const setLimitsMutation = useSetVHostLimit();
  const clearPermissionsMutation = useDeleteVHostPermissions();
  const { workspace } = useWorkspace();

  // Set default user when users are loaded
  useEffect(() => {
    if (usersData?.users?.length && !selectedUser) {
      setSelectedUser(usersData.users[0].name);
    }
  }, [usersData, selectedUser]);

  // Handle form submissions
  const handleSetPermissions = async () => {
    if (!selectedUser || !configureRegexp || !writeRegexp || !readRegexp) {
      toast.error("Please fill in all permission fields");
      return;
    }
    if (!workspace?.id) {
      toast.error("Workspace ID is required");
      return;
    }
    try {
      await setPermissionsMutation.mutateAsync({
        serverId: currentServerId!,
        workspaceId: workspace.id,
        vhostName: decodedVHostName,
        username: selectedUser,
        configure: configureRegexp,
        write: writeRegexp,
        read: readRegexp,
      });
      toast.success("Permissions set successfully");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to set permissions"
      );
    }
  };

  const handleSetLimits = async () => {
    if (!maxConnections && !maxQueues) {
      toast.error("Please set at least one limit");
      return;
    }
    if (!workspace?.id) {
      toast.error("Workspace ID is required");
      return;
    }
    try {
      const promises = [];
      if (maxConnections) {
        promises.push(
          setLimitsMutation.mutateAsync({
            serverId: currentServerId!,
            workspaceId: workspace.id,
            vhostName: decodedVHostName,
            limitType: "max-connections",
            value: parseInt(maxConnections),
          })
        );
      }
      if (maxQueues) {
        promises.push(
          setLimitsMutation.mutateAsync({
            serverId: currentServerId!,
            workspaceId: workspace.id,
            vhostName: decodedVHostName,
            limitType: "max-queues",
            value: parseInt(maxQueues),
          })
        );
      }
      await Promise.all(promises);
      toast.success("Limits set successfully");
      setMaxConnections("");
      setMaxQueues("");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to set limits"
      );
    }
  };

  const handleClearPermissions = async (username: string) => {
    if (!workspace?.id) {
      toast.error("Workspace ID is required");
      return;
    }
    try {
      await clearPermissionsMutation.mutateAsync({
        serverId: currentServerId!,
        workspaceId: workspace.id,
        vhostName: decodedVHostName,
        username,
      });
      toast.success("Permissions cleared successfully");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to clear permissions"
      );
    }
  };

  // Redirect non-admin users
  if (user?.role !== "ADMIN") {
    return (
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          <AppSidebar />
          <main className="main-content">
            <div className="container mx-auto">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Access denied. Virtual host management is only available to
                  administrators.
                </AlertDescription>
              </Alert>
            </div>
          </main>
        </div>
      </SidebarProvider>
    );
  }

  if (!currentServerId) {
    return (
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          <AppSidebar />
          <main className="main-content">
            <div className="container mx-auto">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Please select a server to view virtual host details.
                </AlertDescription>
              </Alert>
            </div>
          </main>
        </div>
      </SidebarProvider>
    );
  }

  if (isLoading) {
    return (
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          <AppSidebar />
          <main className="flex-1">
            <PageLoader />
          </main>
        </div>
      </SidebarProvider>
    );
  }

  if (error) {
    return (
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          <AppSidebar />
          <main className="main-content">
            <div className="container mx-auto">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Failed to load virtual host details:{" "}
                  {(error as Error).message}
                </AlertDescription>
              </Alert>
            </div>
          </main>
        </div>
      </SidebarProvider>
    );
  }

  const vhost = vhostData?.vhost;

  if (!vhost) {
    return (
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          <AppSidebar />
          <main className="main-content">
            <div className="container mx-auto">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Virtual host not found.</AlertDescription>
              </Alert>
            </div>
          </main>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="page-layout">
        <AppSidebar />
        <main className="main-content">
          <div className="max-w-6xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SidebarTrigger className="mr-2" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/vhosts")}
                  className="mr-2 flex items-center gap-1"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-2">
                  <h1 className="title-page">
                    Virtual host / {decodedVHostName}
                  </h1>
                  {vhost.protected_from_deletion && (
                    <Badge
                      variant="secondary"
                      className="flex items-center gap-1"
                      title="This vhost is protected from deletion"
                    >
                      <Lock className="w-3 h-3" />
                      Protected
                    </Badge>
                  )}
                </div>
              </div>
              <ConnectionStatus />
            </div>

            {/* Message stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Virtual host stats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-8">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">
                      Queues
                    </div>
                    <div className="text-lg font-medium">
                      {vhost.stats?.queueCount || 0}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">
                      Exchanges
                    </div>
                    <div className="text-lg font-medium">
                      {vhost.stats?.exchangeCount || 0}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">
                      Total Messages
                    </div>
                    <div className="text-lg font-medium">
                      {vhost.stats?.totalMessages || 0}
                    </div>
                  </div>
                </div>
                {vhost.message_stats && (
                  <div className="mt-6 pt-6 border-t">
                    <h4 className="text-sm font-medium mb-4">
                      Message Statistics
                    </h4>
                    <div className="grid grid-cols-3 gap-8">
                      {vhost.message_stats.publish !== undefined && (
                        <div>
                          <div className="text-sm text-muted-foreground mb-1">
                            Published
                          </div>
                          <div className="text-lg font-medium">
                            {vhost.message_stats.publish.toLocaleString()}
                          </div>
                          {vhost.message_stats.publish_details && (
                            <div className="text-xs text-muted-foreground">
                              {vhost.message_stats.publish_details.rate.toFixed(
                                2
                              )}
                              /s
                            </div>
                          )}
                        </div>
                      )}
                      {vhost.message_stats.deliver !== undefined && (
                        <div>
                          <div className="text-sm text-muted-foreground mb-1">
                            Delivered
                          </div>
                          <div className="text-lg font-medium">
                            {vhost.message_stats.deliver.toLocaleString()}
                          </div>
                          {vhost.message_stats.deliver_details && (
                            <div className="text-xs text-muted-foreground">
                              {vhost.message_stats.deliver_details.rate.toFixed(
                                2
                              )}
                              /s
                            </div>
                          )}
                        </div>
                      )}
                      {vhost.message_stats.ack !== undefined && (
                        <div>
                          <div className="text-sm text-muted-foreground mb-1">
                            Acknowledged
                          </div>
                          <div className="text-lg font-medium">
                            {vhost.message_stats.ack.toLocaleString()}
                          </div>
                          {vhost.message_stats.ack_details && (
                            <div className="text-xs text-muted-foreground">
                              {vhost.message_stats.ack_details.rate.toFixed(2)}
                              /s
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Limits */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Limits</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">
                      Max connections
                    </div>
                    <div className="text-lg font-medium">
                      {vhost.limits?.[0]?.value?.["max-connections"] || "-"}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">
                      Max queues
                    </div>
                    <div className="text-lg font-medium">
                      {vhost.limits?.[0]?.value?.["max-queues"] || "-"}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Permissions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Permissions{" "}
                  <Badge variant="secondary" className="ml-2">
                    {vhostData?.vhost?.permissions?.length || 0}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Configure regexp</TableHead>
                        <TableHead>Write regexp</TableHead>
                        <TableHead>Read regexp</TableHead>
                        <TableHead className="w-[100px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {vhostData?.vhost?.permissions?.length ? (
                        vhostData.vhost.permissions.map((permission, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">
                              {permission.user}
                            </TableCell>
                            <TableCell>{permission.configure}</TableCell>
                            <TableCell>{permission.write}</TableCell>
                            <TableCell>{permission.read}</TableCell>
                            <TableCell>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  handleClearPermissions(permission.user)
                                }
                                disabled={clearPermissionsMutation.isPending}
                              >
                                {clearPermissionsMutation.isPending
                                  ? "Clearing..."
                                  : "CLEAR"}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell
                            colSpan={5}
                            className="text-center text-muted-foreground"
                          >
                            No permissions set for this virtual host
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Set permission and Set limits */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Set permission */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Set permission</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        User
                      </label>
                      <select
                        className="w-full p-2 border rounded-md bg-background"
                        value={selectedUser}
                        onChange={(e) => setSelectedUser(e.target.value)}
                      >
                        {usersData?.users?.map((user) => (
                          <option key={user.name} value={user.name}>
                            {user.name}
                          </option>
                        )) || <option value="admin">admin</option>}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Configure regexp
                      </label>
                      <Input
                        value={configureRegexp}
                        onChange={(e) => setConfigureRegexp(e.target.value)}
                        placeholder=".*"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Write regexp
                      </label>
                      <Input
                        value={writeRegexp}
                        onChange={(e) => setWriteRegexp(e.target.value)}
                        placeholder=".*"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Read regexp
                      </label>
                      <Input
                        value={readRegexp}
                        onChange={(e) => setReadRegexp(e.target.value)}
                        placeholder=".*"
                      />
                    </div>
                    <div>
                      <Button
                        className="btn-primary"
                        onClick={handleSetPermissions}
                        disabled={setPermissionsMutation.isPending}
                      >
                        {setPermissionsMutation.isPending
                          ? "Setting..."
                          : "Set permission"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Set limits */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Set limits</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Max connections
                      </label>
                      <Input
                        type="number"
                        min="0"
                        value={maxConnections}
                        onChange={(e) => setMaxConnections(e.target.value)}
                        placeholder="Leave empty for no limit"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Max queues
                      </label>
                      <Input
                        type="number"
                        min="0"
                        value={maxQueues}
                        onChange={(e) => setMaxQueues(e.target.value)}
                        placeholder="Leave empty for no limit"
                      />
                    </div>
                    <div>
                      <Button
                        className="btn-primary"
                        onClick={handleSetLimits}
                        disabled={setLimitsMutation.isPending}
                      >
                        {setLimitsMutation.isPending
                          ? "Setting..."
                          : "Set limits"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Danger zone */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-red-600">
                  Danger zone
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  variant="destructive"
                  onClick={() => setShowDeleteModal(true)}
                  disabled={vhost.name === "/"}
                >
                  Delete vhost
                </Button>
                {vhost.name === "/" && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Cannot delete the default virtual host
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Modals */}
            {showEditModal && (
              <EditVHostModal
                isOpen={showEditModal}
                onClose={() => setShowEditModal(false)}
                serverId={currentServerId}
                vhost={vhost}
              />
            )}

            {showDeleteModal && (
              <DeleteVHostModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                vhost={vhost}
                onConfirm={async () => {
                  try {
                    if (!workspace?.id) {
                      toast.error("Workspace ID is required");
                      return;
                    }
                    await deleteVHostMutation.mutateAsync({
                      serverId: currentServerId!,
                      workspaceId: workspace.id,
                      vhostName: decodedVHostName,
                    });
                    toast.success("Virtual host deleted successfully");
                    navigate("/vhosts");
                  } catch (error) {
                    toast.error(
                      error instanceof Error
                        ? error.message
                        : "Failed to delete virtual host"
                    );
                  }
                }}
                isLoading={deleteVHostMutation.isPending}
              />
            )}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
