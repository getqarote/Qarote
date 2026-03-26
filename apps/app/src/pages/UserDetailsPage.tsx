import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router";

import { AlertCircle, ArrowLeft, HelpCircle, Pencil } from "lucide-react";
import { toast } from "sonner";

import { UserRole } from "@/lib/api";

import { AppSidebar } from "@/components/AppSidebar";
import { PageError } from "@/components/PageError";
import { PageLoader } from "@/components/PageLoader";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
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
import { DeleteUserModal } from "@/components/users/DeleteUserModal";
import { EditUserModal } from "@/components/users/EditUserModal";

import { useAuth } from "@/contexts/AuthContextDefinition";
import { useServerContext } from "@/contexts/ServerContext";

import {
  useDeleteUser,
  useDeleteUserPermissions,
  useSetUserPermissions,
  useUser,
} from "@/hooks/queries/useRabbitMQUsers";
import { useVHosts } from "@/hooks/queries/useRabbitMQVHosts";
import { useServers } from "@/hooks/queries/useServer";
import { useWorkspace } from "@/hooks/ui/useWorkspace";

export default function UserDetailsPage() {
  const { t } = useTranslation("users");
  const { serverId, username } = useParams<{
    serverId?: string;
    username: string;
  }>();
  const { selectedServerId } = useServerContext();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Form states for setting permissions
  // null means "use derived default from data", string means "user explicitly chose this"
  const [selectedVHostOverride, setSelectedVHostOverride] = useState<
    string | null
  >(null);
  const [configureRegexp, setConfigureRegexp] = useState(".*");
  const [writeRegexp, setWriteRegexp] = useState(".*");
  const [readRegexp, setReadRegexp] = useState(".*");

  const { data: serversData } = useServers();
  const servers = serversData?.servers || [];

  const currentServerId = serverId || selectedServerId;
  const decodedUsername = decodeURIComponent(username || "");
  // Validate that the server actually exists
  const currentServer = currentServerId
    ? servers.find((s) => s.id === currentServerId)
    : undefined;
  const serverExists = !!currentServer;

  // Check if this is the connection user (the account Qarote uses to connect)
  const isConnectionUser = currentServer?.username === decodedUsername;

  const {
    data: userData,
    isLoading,
    error,
    refetch,
  } = useUser(currentServerId, decodedUsername, serverExists);

  // Check if this is a protected user (e.g., AWS-managed system accounts)
  const isProtectedUser = userData?.user?.tags?.includes("protected") ?? false;

  // Fetch available virtual hosts for the dropdown
  const { data: vhostsData, isLoading: vhostsLoading } = useVHosts(
    currentServerId,
    serverExists
  );

  // Derive the default vhost from loaded data
  const derivedDefaultVHost = useMemo(() => {
    if (vhostsData?.vhosts?.length > 0) {
      // If user has existing permissions, default to the first permission's vhost
      if (userData?.permissions?.length > 0) {
        return userData.permissions[0].vhost;
      }
      // Check if "/" exists in the vhosts, otherwise use the first available
      const hasDefaultVhost = vhostsData.vhosts.some(
        (vhost) => vhost.name === "/"
      );
      return hasDefaultVhost ? "/" : vhostsData.vhosts[0].name;
    }
    return "/";
  }, [vhostsData, userData?.permissions]);

  const selectedVHost = selectedVHostOverride ?? derivedDefaultVHost;
  const setSelectedVHost = setSelectedVHostOverride;

  const deleteUserMutation = useDeleteUser();
  const setPermissionsMutation = useSetUserPermissions();
  const clearPermissionsMutation = useDeleteUserPermissions();
  const { workspace } = useWorkspace();

  // Redirect non-admin users
  if (user?.role !== UserRole.ADMIN) {
    return (
      <SidebarProvider>
        <div className="page-layout">
          <AppSidebar />
          <main className="main-content-scrollable">
            <div className="content-container-large">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{t("accessDenied")}</AlertDescription>
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
          <main className="main-content-scrollable">
            <div className="content-container-large">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{t("selectServer")}</AlertDescription>
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
          <main className="main-content-scrollable">
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
              <PageError
                message={`${t("failedToLoad")}: ${(error as Error).message}`}
                onRetry={() => refetch()}
              />
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
          <main className="main-content-scrollable">
            <div className="content-container-large">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{t("notFound")}</AlertDescription>
              </Alert>
            </div>
          </main>
        </div>
      </SidebarProvider>
    );
  }

  const handleSetPermissions = async () => {
    if (!workspace?.id) {
      toast.error(t("requiredWorkspace"));
      return;
    }
    try {
      await setPermissionsMutation.mutateAsync({
        serverId: currentServerId!,
        workspaceId: workspace.id,
        username: decodedUsername,
        vhost: selectedVHost,
        configure: configureRegexp,
        write: writeRegexp,
        read: readRegexp,
      });
      toast.success(t("permissionsSet"));
      // Clear the form fields
      setSelectedVHost(null);
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
          <main className="main-content-scrollable">
            <div className="max-w-6xl mx-auto space-y-8">
              {/* Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-2 min-w-0">
                  <SidebarTrigger className="mr-2 mt-1" />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate("/users")}
                    className="mr-2 flex items-center gap-1 shrink-0"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h1 className="title-page">
                        {t("userPrefix", { name: decodedUsername })}
                      </h1>
                      {userDetails.tags &&
                        userDetails.tags.length > 0 &&
                        userDetails.tags.map((tag) => (
                          <Badge key={tag} variant="secondary">
                            {tag}
                          </Badge>
                        ))}
                      <Badge variant="outline">
                        {userDetails.password_hash
                          ? t("passwordSet")
                          : t("noPassword")}
                      </Badge>
                    </div>
                    {(isConnectionUser || isProtectedUser) && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {isConnectionUser
                          ? t("cannotModifyConnectionUser")
                          : t("cannotModifyProtectedUser")}
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  onClick={() => setShowEditModal(true)}
                  disabled={isConnectionUser || isProtectedUser}
                  className="btn-primary text-white flex items-center gap-2 shrink-0"
                  title={
                    isConnectionUser
                      ? t("cannotModifyConnectionUser")
                      : isProtectedUser
                        ? t("cannotModifyProtectedUser")
                        : undefined
                  }
                >
                  <Pencil className="h-4 w-4" />
                  {t("common:edit")}
                </Button>
              </div>

              {/* User Limits (if any) */}
              {userDetails.limits &&
                (userDetails.limits.max_connections !== undefined ||
                  userDetails.limits.max_channels !== undefined) && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">
                        {t("limitsLabel")}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-8">
                        {userDetails.limits.max_connections !== undefined && (
                          <div>
                            <div className="text-sm text-muted-foreground mb-1">
                              {t("maxConnections")}
                            </div>
                            <div className="text-lg font-medium">
                              {userDetails.limits.max_connections}
                            </div>
                          </div>
                        )}
                        {userDetails.limits.max_channels !== undefined && (
                          <div>
                            <div className="text-sm text-muted-foreground mb-1">
                              {t("maxChannels")}
                            </div>
                            <div className="text-lg font-medium">
                              {userDetails.limits.max_channels}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

              {/* Permissions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {t("permissions")}{" "}
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
                          <TableHead>{t("virtualHost")}</TableHead>
                          <TableHead>{t("configureRegexp")}</TableHead>
                          <TableHead>{t("writeRegexp")}</TableHead>
                          <TableHead>{t("readRegexp")}</TableHead>
                          <TableHead className="w-[100px]">
                            {t("common:actions")}
                          </TableHead>
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
                                    if (!workspace?.id) {
                                      toast.error(t("requiredWorkspace"));
                                      return;
                                    }
                                    await clearPermissionsMutation.mutateAsync({
                                      serverId: currentServerId!,
                                      workspaceId: workspace.id,
                                      username: decodedUsername,
                                      vhost: permission.vhost,
                                    });
                                    toast.success(t("permissionsCleared"));
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
                                  ? t("clearing")
                                  : t("clear")}
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
                              {t("noPermissions")}
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Set Permission */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {t("setPermission")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-4 max-w-lg">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        {t("virtualHost")}
                      </label>
                      <Select
                        value={selectedVHost}
                        onValueChange={(value) => setSelectedVHost(value)}
                        disabled={vhostsLoading}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {vhostsData?.vhosts?.map((vhost) => (
                            <SelectItem key={vhost.name} value={vhost.name}>
                              {vhost.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <label className="text-sm font-medium mb-2 cursor-help flex items-center gap-1">
                            {t("configureRegexp")}
                            <HelpCircle className="h-3 w-3 text-muted-foreground" />
                          </label>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <p>
                            Regular expression pattern controlling which
                            resources the user can configure (create/delete
                            queues, exchanges, bindings). Use ".*" for full
                            access or specific patterns like "^myqueue.*" for
                            resources starting with "myqueue".
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
                            {t("writeRegexp")}
                            <HelpCircle className="h-3 w-3 text-muted-foreground" />
                          </label>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <p>
                            Regular expression pattern controlling which
                            exchanges and routing keys the user can publish
                            messages to. Use ".*" for full publish access or
                            patterns like "^logs.*" for specific routing keys.
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
                            {t("readRegexp")}
                            <HelpCircle className="h-3 w-3 text-muted-foreground" />
                          </label>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <p>
                            Regular expression pattern controlling which queues
                            the user can consume messages from (read/get
                            operations). Use ".*" for full read access or
                            patterns like "^user_.*" for queues starting with
                            "user_".
                          </p>
                        </TooltipContent>
                      </Tooltip>
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
                          ? t("setting")
                          : t("setPermission")}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Danger zone */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg text-red-600">
                    {t("dangerZone")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="destructive"
                    onClick={() => setShowDeleteModal(true)}
                    disabled={
                      decodedUsername === "admin" ||
                      isConnectionUser ||
                      isProtectedUser
                    }
                    title={
                      isConnectionUser
                        ? t("cannotModifyConnectionUser")
                        : isProtectedUser
                          ? t("cannotModifyProtectedUser")
                          : undefined
                    }
                  >
                    {t("deleteUser")}
                  </Button>
                  {isConnectionUser ? (
                    <p className="text-sm text-muted-foreground mt-2">
                      {t("cannotModifyConnectionUser")}
                    </p>
                  ) : isProtectedUser ? (
                    <p className="text-sm text-muted-foreground mt-2">
                      {t("cannotModifyProtectedUser")}
                    </p>
                  ) : (
                    decodedUsername === "admin" && (
                      <p className="text-sm text-muted-foreground mt-2">
                        {t("cannotDeleteAdmin")}
                      </p>
                    )
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
                      if (!workspace?.id) {
                        toast.error(t("requiredWorkspace"));
                        return;
                      }
                      await deleteUserMutation.mutateAsync({
                        serverId: currentServerId!,
                        workspaceId: workspace.id,
                        username: decodedUsername,
                      });
                      toast.success(t("deleteSuccess"));
                      navigate("/users");
                    } catch (error) {
                      toast.error(
                        error instanceof Error
                          ? error.message
                          : t("deleteError")
                      );
                    }
                  }}
                  isLoading={deleteUserMutation.isPending}
                />
              )}

              {showEditModal && userDetails && (
                <EditUserModal
                  isOpen={showEditModal}
                  onClose={() => setShowEditModal(false)}
                  serverId={currentServerId!}
                  user={userDetails}
                />
              )}
            </div>
          </main>
        </div>
      </SidebarProvider>
    </TooltipProvider>
  );
}
