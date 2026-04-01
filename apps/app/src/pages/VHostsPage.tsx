import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router";

import {
  AlertCircle,
  ChevronUp,
  Database,
  Edit,
  Lock,
  Server,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { UserRole } from "@/lib/api";
import { VHost } from "@/lib/api/vhostTypes";

import { AddVirtualHostButton } from "@/components/AddVirtualHostButton";
import { AppSidebar } from "@/components/AppSidebar";
import { NoServerConfigured } from "@/components/NoServerConfigured";
import { PageError } from "@/components/PageError";
import { PlanUpgradeModal } from "@/components/plans/PlanUpgradeModal";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DeleteVHostModal } from "@/components/vhosts/DeleteVHostModal";

import { useAuth } from "@/contexts/AuthContextDefinition";
import { useServerContext } from "@/contexts/ServerContext";

import { useDeleteVHost, useVHosts } from "@/hooks/queries/useRabbitMQVHosts";
import { useServers } from "@/hooks/queries/useServer";
import { useWorkspace } from "@/hooks/ui/useWorkspace";

export default function VHostsPage() {
  const { t } = useTranslation("vhosts");
  const { serverId } = useParams<{ serverId: string }>();
  const { selectedServerId, hasServers } = useServerContext();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: serversData } = useServers();
  const servers = serversData?.servers || [];

  const [deleteVHost, setDeleteVHost] = useState<VHost | null>(null);
  const [filterRegex, setFilterRegex] = useState("");
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const currentServerId = serverId || selectedServerId;
  // Validate that the server actually exists
  const serverExists = currentServerId
    ? servers.some((s) => s.id === currentServerId)
    : false;

  const {
    data: vhostsData,
    isLoading,
    error,
  } = useVHosts(currentServerId, serverExists);

  const deleteVHostMutation = useDeleteVHost();
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
            <div className="content-container-large">
              <div className="flex items-center gap-4">
                <SidebarTrigger />
                <div>
                  <Skeleton className="h-8 w-40 mb-2" />
                  <Skeleton className="h-4 w-56" />
                </div>
              </div>
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-lg" />
                ))}
              </div>
            </div>
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
              <PageError message={t("common:serverConnectionError")} />
            </div>
          </main>
        </div>
      </SidebarProvider>
    );
  }

  const vhosts = vhostsData?.vhosts || [];

  // Filter vhosts based on regex
  const filteredVhosts = vhosts.filter((vhost) => {
    if (!filterRegex) return true;
    try {
      const regex = new RegExp(filterRegex, "i");
      return regex.test(vhost.name);
    } catch {
      return vhost.name.toLowerCase().includes(filterRegex.toLowerCase());
    }
  });

  return (
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
                  {vhosts.length}
                </Badge>
              </div>
              <AddVirtualHostButton serverId={currentServerId} />
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

            {/* VHosts Table */}
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
                            {t("name")}
                            <ChevronUp className="h-3 w-3" />
                          </div>
                        </TableHead>
                        <TableHead>{t("usersCol")}</TableHead>
                        <TableHead>
                          <div className="flex items-center gap-1">
                            {t("ready")}
                            <ChevronUp className="h-3 w-3" />
                          </div>
                        </TableHead>
                        <TableHead>
                          <div className="flex items-center gap-1">
                            {t("unacked")}
                            <ChevronUp className="h-3 w-3" />
                          </div>
                        </TableHead>
                        <TableHead>
                          <div className="flex items-center gap-1">
                            {t("total")}
                            <ChevronUp className="h-3 w-3" />
                          </div>
                        </TableHead>
                        <TableHead className="w-[100px]">
                          {t("common:actions")}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredVhosts.map((vhost) => (
                        <TableRow
                          key={vhost.name}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() =>
                            navigate(
                              `/vhosts/${encodeURIComponent(vhost.name)}`
                            )
                          }
                        >
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <Database className="h-4 w-4 shrink-0" />
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  {vhost.name}
                                  {vhost.protected_from_deletion && (
                                    <Badge
                                      variant="secondary"
                                      className="text-xs flex items-center gap-1"
                                      title={t("protectedFromDeletion")}
                                    >
                                      <Lock className="w-3 h-3" />
                                    </Badge>
                                  )}
                                </div>
                                {vhost.description && (
                                  <p className="text-xs text-muted-foreground font-normal truncate max-w-[300px]">
                                    {vhost.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{vhost.permissionCount || 0}</TableCell>
                          <TableCell>{vhost.messages_ready || 0}</TableCell>
                          <TableCell>
                            {vhost.messages_unacknowledged || 0}
                          </TableCell>
                          <TableCell>{vhost.messages || 0}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(
                                    `/vhosts/${encodeURIComponent(vhost.name)}`
                                  );
                                }}
                                className="h-8 w-8 p-0"
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              {vhost.name !== "/" && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteVHost(vhost);
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

            {deleteVHost && (
              <DeleteVHostModal
                isOpen={true}
                onClose={() => setDeleteVHost(null)}
                vhost={deleteVHost}
                onConfirm={async () => {
                  try {
                    if (!workspace?.id) {
                      toast.error("Workspace ID is required");
                      return;
                    }
                    await deleteVHostMutation.mutateAsync({
                      serverId: currentServerId!,
                      workspaceId: workspace.id,
                      vhostName: deleteVHost.name,
                    });
                    toast.success(t("deleteSuccess"));
                    setDeleteVHost(null);
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

            {/* Plan Upgrade Modal */}
            <PlanUpgradeModal
              isOpen={showUpgradeModal}
              onClose={() => setShowUpgradeModal(false)}
              feature="virtual host creation"
            />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
