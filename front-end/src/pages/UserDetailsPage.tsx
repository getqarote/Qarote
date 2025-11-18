import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AlertCircle, ArrowLeft, HelpCircle } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PageLoader } from "@/components/PageLoader";
import { ConnectionStatus } from "@/components/ConnectionStatus";
import { useServerContext } from "@/contexts/ServerContext";
import { useAuth } from "@/contexts/AuthContextDefinition";
import { formatTagsDisplay } from "@/lib/formatTags";
import { DeleteUserModal } from "@/components/users/DeleteUserModal";
import { toast } from "sonner";
import {
  useServers,
  useUser,
  useVHosts,
  useDeleteUser,
  useUpdateUser,
  useSetUserPermissions,
  useDeleteUserPermissions,
} from "@/hooks/useApi";

export default function UserDetailsPage() {
  const { serverId, username } = useParams<{
    serverId?: string;
    username: string;
  }>();
  const { selectedServerId } = useServerContext();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Form states for updating user
  const [newPassword, setNewPassword] = useState("");
  const [newTags, setNewTags] = useState("");
  const [removePassword, setRemovePassword] = useState(false);

  // Form states for setting permissions
  const [selectedVHost, setSelectedVHost] = useState("/");
  const [configureRegexp, setConfigureRegexp] = useState(".*");
  const [writeRegexp, setWriteRegexp] = useState(".*");
  const [readRegexp, setReadRegexp] = useState(".*");

  const { data: serversData } = useServers();
  const servers = serversData?.servers || [];

  const currentServerId = serverId || selectedServerId;
  const decodedUsername = decodeURIComponent(username || "");
  // Validate that the server actually exists
  const serverExists = currentServerId
    ? servers.some((s) => s.id === currentServerId)
    : false;

  const {
    data: userData,
    isLoading,
    error,
  } = useUser(currentServerId, decodedUsername, serverExists);

  // Fetch available virtual hosts for the dropdown
  const { data: vhostsData, isLoading: vhostsLoading } = useVHosts(
    currentServerId,
    serverExists
  );

  // Update selected vhost when vhosts data is loaded
  useEffect(() => {
    if (vhostsData?.vhosts?.length > 0 && selectedVHost === "/") {
      // If user has existing permissions, default to the first permission's vhost
      if (userData?.permissions?.length > 0) {
        setSelectedVHost(userData.permissions[0].vhost);
      } else {
        // Check if "/" exists in the vhosts, otherwise use the first available
        const hasDefaultVhost = vhostsData.vhosts.some(
          (vhost) => vhost.name === "/"
        );
        if (hasDefaultVhost) {
          setSelectedVHost("/");
        } else {
          setSelectedVHost(vhostsData.vhosts[0].name);
        }
      }
    }
  }, [vhostsData, userData?.permissions, selectedVHost]);

  const deleteUserMutation = useDeleteUser();
  const updateUserMutation = useUpdateUser();
  const setPermissionsMutation = useSetUserPermissions();
  const clearPermissionsMutation = useDeleteUserPermissions();

  // Redirect non-admin users
  if (user?.role !== "ADMIN") {
    return (
      <SidebarProvider>
        <div className="page-layout">
          <AppSidebar />
          <main className="main-content">
            <div className="container mx-auto">
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

  if (!currentServerId) {
    return (
      <SidebarProvider>
        <div className="page-layout">
          <AppSidebar />
          <main className="main-content">
            <div className="container mx-auto">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Please select a server to view user details.
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
        <div className="page-layout">
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
        <div className="page-layout">
          <AppSidebar />
          <main className="main-content">
            <div className="container mx-auto">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Failed to load user details: {(error as Error).message}
                </AlertDescription>
              </Alert>
            </div>
          </main>
        </div>
      </SidebarProvider>
    );
  }

  const userDetails = userData?.user;
  const permissions = userData?.permissions || [];

  if (!userDetails) {
    return (
      <SidebarProvider>
        <div className="page-layout">
          <AppSidebar />
          <main className="main-content">
            <div className="container mx-auto">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>User not found.</AlertDescription>
              </Alert>
            </div>
          </main>
        </div>
      </SidebarProvider>
    );
  }

  const handleUpdateUser = () => {
    const updateData: {
      password?: string;
      tags?: string;
      removePassword?: boolean;
    } = {};

    if (removePassword) {
      updateData.removePassword = true;
      // When removing password only, preserve existing tags if no new tags are provided
      // RabbitMQ requires at least one field besides password_hash to be present
      if (newTags === "" && userDetails?.tags) {
        // Normalize tags array to comma-separated string format for RabbitMQ API
        const normalizedTags = userDetails.tags
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0)
          .join(",");
        if (normalizedTags) {
          updateData.tags = normalizedTags;
        }
      }
    } else if (newPassword) {
      updateData.password = newPassword;
    }

    if (newTags !== "") {
      updateData.tags = newTags;
    }

    if (Object.keys(updateData).length > 0) {
      updateUserMutation
        .mutateAsync({
          serverId: currentServerId!,
          username: decodedUsername,
          data: updateData,
        })
        .then(() => {
          toast.success("User updated successfully");
          setNewPassword("");
          setNewTags("");
          setRemovePassword(false);
        })
        .catch((error: Error) => {
          toast.error(error.message || "Failed to update user");
        });
    }
  };

  const handleSetPermissions = async () => {
    try {
      await setPermissionsMutation.mutateAsync({
        serverId: currentServerId!,
        username: decodedUsername,
        data: {
          vhost: selectedVHost,
          configure: configureRegexp,
          write: writeRegexp,
          read: readRegexp,
        },
      });
      toast.success("Permissions set successfully");
      // Clear the form fields
      setSelectedVHost("/");
      setConfigureRegexp(".*");
      setWriteRegexp(".*");
      setReadRegexp(".*");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to set permissions"
      );
    }
  };

  return (
    <TooltipProvider>
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
                    onClick={() => navigate("/users")}
                    className="mr-2 flex items-center gap-1"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <h1 className="title-page">User / {decodedUsername}</h1>
                </div>
                <ConnectionStatus />
              </div>

              {/* User Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">
                        Tags
                      </div>
                      <div className="text-lg font-medium">
                        {formatTagsDisplay(userDetails.tags)}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">
                        Has password
                      </div>
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full ${userDetails.password_hash ? "bg-green-500" : "bg-red-500"}`}
                        ></div>
                        <span>{userDetails.password_hash ? "Yes" : "No"}</span>
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
                      {permissions.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Virtual Host</TableHead>
                          <TableHead>Configure regexp</TableHead>
                          <TableHead>Write regexp</TableHead>
                          <TableHead>Read regexp</TableHead>
                          <TableHead className="w-[100px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {permissions.map((permission, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">
                              {permission.vhost}
                            </TableCell>
                            <TableCell>{permission.configure}</TableCell>
                            <TableCell>{permission.write}</TableCell>
                            <TableCell>{permission.read}</TableCell>
                            <TableCell>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                  try {
                                    await clearPermissionsMutation.mutateAsync({
                                      serverId: currentServerId!,
                                      username: decodedUsername,
                                      vhost: permission.vhost,
                                    });
                                    toast.success(
                                      "Permissions cleared successfully"
                                    );
                                  } catch (error) {
                                    toast.error(
                                      error instanceof Error
                                        ? error.message
                                        : "Failed to clear permissions"
                                    );
                                  }
                                }}
                                disabled={clearPermissionsMutation.isPending}
                              >
                                {clearPermissionsMutation.isPending
                                  ? "CLEARING..."
                                  : "CLEAR"}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        {permissions.length === 0 && (
                          <TableRow>
                            <TableCell
                              colSpan={5}
                              className="text-center text-muted-foreground"
                            >
                              No permissions set
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Set Permission and Update User */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:items-stretch">
                {/* Set permission */}
                <Card className="flex flex-col">
                  <CardHeader>
                    <CardTitle className="text-lg">Set permission</CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <div className="flex flex-col gap-4 h-full">
                      <div className="flex-1 space-y-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Virtual host
                          </label>
                          <select
                            className="w-full p-2 border rounded-md bg-background"
                            value={selectedVHost}
                            onChange={(e) => setSelectedVHost(e.target.value)}
                            disabled={vhostsLoading}
                          >
                            {vhostsLoading ? (
                              <option value="/">Loading...</option>
                            ) : (
                              vhostsData?.vhosts?.map((vhost) => (
                                <option key={vhost.name} value={vhost.name}>
                                  {vhost.name}
                                </option>
                              )) || <option value="/">/</option>
                            )}
                          </select>
                        </div>
                        <div>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <label className="text-sm font-medium mb-2 cursor-help flex items-center gap-1">
                                Configure regexp
                                <HelpCircle className="h-3 w-3 text-muted-foreground" />
                              </label>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs">
                              <p>
                                Regular expression pattern controlling which
                                resources the user can configure (create/delete
                                queues, exchanges, bindings). Use ".*" for full
                                access or specific patterns like "^myqueue.*"
                                for resources starting with "myqueue".
                              </p>
                            </TooltipContent>
                          </Tooltip>
                          <Input
                            value={configureRegexp}
                            onChange={(e) => setConfigureRegexp(e.target.value)}
                            placeholder=".*"
                          />
                        </div>
                        <div>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <label className="text-sm font-medium mb-2 cursor-help flex items-center gap-1">
                                Write regexp
                                <HelpCircle className="h-3 w-3 text-muted-foreground" />
                              </label>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs">
                              <p>
                                Regular expression pattern controlling which
                                exchanges and routing keys the user can publish
                                messages to. Use ".*" for full publish access or
                                patterns like "^logs.*" for specific routing
                                keys.
                              </p>
                            </TooltipContent>
                          </Tooltip>
                          <Input
                            value={writeRegexp}
                            onChange={(e) => setWriteRegexp(e.target.value)}
                            placeholder=".*"
                          />
                        </div>
                        <div>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <label className="text-sm font-medium mb-2 cursor-help flex items-center gap-1">
                                Read regexp
                                <HelpCircle className="h-3 w-3 text-muted-foreground" />
                              </label>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs">
                              <p>
                                Regular expression pattern controlling which
                                queues the user can consume messages from
                                (read/get operations). Use ".*" for full read
                                access or patterns like "^user_.*" for queues
                                starting with "user_".
                              </p>
                            </TooltipContent>
                          </Tooltip>
                          <Input
                            value={readRegexp}
                            onChange={(e) => setReadRegexp(e.target.value)}
                            placeholder=".*"
                          />
                        </div>
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

                {/* Update user */}
                <Card className="flex flex-col">
                  <CardHeader>
                    <CardTitle className="text-lg">Update user</CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <div className="flex flex-col gap-4 h-full">
                      <div className="flex-1 space-y-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id="remove-password"
                              checked={removePassword}
                              onChange={(e) =>
                                setRemovePassword(e.target.checked)
                              }
                            />
                            <label
                              htmlFor="remove-password"
                              className="text-sm font-medium"
                            >
                              Remove password
                            </label>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Password
                          </label>
                          <Input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Leave empty to only update tags"
                            disabled={removePassword}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Tags
                          </label>
                          <Input
                            value={newTags}
                            onChange={(e) => setNewTags(e.target.value)}
                            placeholder="administrator"
                          />
                          <div className="mt-2 text-sm text-muted-foreground">
                            <span
                              className="font-medium cursor-pointer hover:text-foreground transition-colors"
                              onClick={() => {
                                const tag = "administrator";
                                if (newTags.trim()) {
                                  setNewTags(newTags + ", " + tag);
                                } else {
                                  setNewTags(tag);
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
                                if (newTags.trim()) {
                                  setNewTags(newTags + ", " + tag);
                                } else {
                                  setNewTags(tag);
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
                                if (newTags.trim()) {
                                  setNewTags(newTags + ", " + tag);
                                } else {
                                  setNewTags(tag);
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
                                if (newTags.trim()) {
                                  setNewTags(newTags + ", " + tag);
                                } else {
                                  setNewTags(tag);
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
                                if (newTags.trim()) {
                                  setNewTags(newTags + ", " + tag);
                                } else {
                                  setNewTags(tag);
                                }
                              }}
                            >
                              Impersonator
                            </span>{" "}
                            |{" "}
                            <span
                              className="font-medium cursor-pointer hover:text-foreground transition-colors"
                              onClick={() => {
                                setNewTags("");
                              }}
                            >
                              None
                            </span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <Button
                          className="btn-primary"
                          onClick={handleUpdateUser}
                          disabled={updateUserMutation.isPending}
                        >
                          {updateUserMutation.isPending
                            ? "Updating..."
                            : "Update user"}
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
                    disabled={decodedUsername === "admin"}
                  >
                    Delete user
                  </Button>
                  {decodedUsername === "admin" && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Cannot delete the admin user
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Modals */}
              {showDeleteModal && userDetails && (
                <DeleteUserModal
                  isOpen={showDeleteModal}
                  onClose={() => setShowDeleteModal(false)}
                  user={userDetails}
                  onConfirm={async () => {
                    try {
                      await deleteUserMutation.mutateAsync({
                        serverId: currentServerId!,
                        username: decodedUsername,
                      });
                      toast.success("User deleted successfully");
                      navigate("/users");
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
            </div>
          </main>
        </div>
      </SidebarProvider>
    </TooltipProvider>
  );
}
