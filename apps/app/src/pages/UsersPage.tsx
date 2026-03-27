import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router";

import {
  AlertCircle,
  ChevronUp,
  Edit,
  Server,
  Trash2,
  User,
} from "lucide-react";
import { toast } from "sonner";

import { UserRole } from "@/lib/api";
import { RabbitMQUser } from "@/lib/api/userTypes";

import { AppSidebar } from "@/components/AppSidebar";
import { NoServerConfigured } from "@/components/NoServerConfigured";
import { PageError } from "@/components/PageError";
import { PageLoader } from "@/components/PageLoader";
import { PlanUpgradeModal } from "@/components/plans/PlanUpgradeModal";
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
import { TooltipProvider } from "@/components/ui/tooltip";
import { AddUserButton } from "@/components/users/AddUserButton";
import { DeleteUserModal } from "@/components/users/DeleteUserModal";

import { useAuth } from "@/contexts/AuthContextDefinition";
import { useServerContext } from "@/contexts/ServerContext";

import { useDeleteUser, useUsers } from "@/hooks/queries/useRabbitMQUsers";
import { useServers } from "@/hooks/queries/useServer";
import { useWorkspace } from "@/hooks/ui/useWorkspace";

export default function UsersPage() {
  const { t } = useTranslation("users");
  const { serverId } = useParams<{ serverId: string }>();
  const { selectedServerId, hasServers } = useServerContext();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: serversData } = useServers();
  const servers = serversData?.servers || [];

  const [deleteUser, setDeleteUser] = useState<RabbitMQUser | null>(null);
  const [filterRegex, setFilterRegex] = useState("");
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
    refetch,
  } = useUsers(currentServerId, serverExists);

  const deleteUserMutation = useDeleteUser();
  const { workspace } = useWorkspace();

  // Redirect non-admin users
  if (user?.role !== UserRole.ADMIN) {
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
                <AlertDescription>{t("accessDenied")}</AlertDescription>
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
              title={t("noServerTitle")}
              subtitle={t("pageSubtitle")}
              description={t("noServerDescription")}
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
                  <h1 className="title-page">{t("pageTitle")}</h1>
                  <p className="text-gray-500">{t("pageSubtitle")}</p>
                </div>
              </div>
              <Card className="border-0 shadow-md bg-card">
                <CardContent className="p-12">
                  <div className="text-center">
                    <Server className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                      {t("noServerSelected")}
                    </h2>
                    <p className="text-gray-600">{t("selectServerPrompt")}</p>
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
                    <h1 className="title-page">{t("pageTitle")}</h1>
                    <p className="text-gray-500">{t("pageSubtitle")}</p>
                  </div>
                  <Badge variant="secondary" className="ml-2">
                    {users.length}
                  </Badge>
                </div>
                <AddUserButton serverId={currentServerId} />
              </div>

              {/* Filter */}
              <div className="flex items-center gap-4">
                <Input
                  placeholder={t("common:filter")}
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
                  <CardTitle className="text-lg">{t("title")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[200px]">
                            <div className="flex items-center gap-1">
                              {t("nameCo")}
                              <ChevronUp className="h-3 w-3" />
                            </div>
                          </TableHead>
                          <TableHead>{t("tags")}</TableHead>
                          <TableHead>{t("canAccessVhosts")}</TableHead>
                          <TableHead>{t("hasPassword")}</TableHead>
                          <TableHead className="w-[100px]">
                            {t("common:actions")}
                          </TableHead>
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
                            <TableCell className="font-medium max-w-[300px]">
                              <div className="flex items-center gap-2 min-w-0">
                                <User className="h-4 w-4 shrink-0" />
                                <span className="truncate" title={user.name}>
                                  {user.name}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {user.tags && user.tags.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {user.tags.map((tag) => (
                                    <Badge
                                      key={tag}
                                      variant="secondary"
                                      className="text-xs"
                                    >
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {user.accessibleVhosts &&
                              user.accessibleVhosts.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {user.accessibleVhosts.map((vhost) => (
                                    <Badge
                                      key={vhost}
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      {vhost}
                                    </Badge>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
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
                                {user.name !== "admin" &&
                                  !user.tags?.includes("protected") && (
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

              {/* Modals */}

              {deleteUser && (
                <DeleteUserModal
                  isOpen={true}
                  onClose={() => setDeleteUser(null)}
                  user={deleteUser}
                  onConfirm={async () => {
                    try {
                      if (!workspace?.id) {
                        toast.error(t("requiredWorkspace"));
                        return;
                      }
                      await deleteUserMutation.mutateAsync({
                        serverId: currentServerId!,
                        workspaceId: workspace.id,
                        username: deleteUser.name,
                      });
                      toast.success(t("deleteSuccess"));
                      setDeleteUser(null);
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
