import { useState } from "react";
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

import { VHost } from "@/lib/api/vhostTypes";

import { AddVirtualHostButton } from "@/components/AddVirtualHostButton";
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
import { CreateVHostModal } from "@/components/vhosts/CreateVHostModal";
import { DeleteVHostModal } from "@/components/vhosts/DeleteVHostModal";

import { useAuth } from "@/contexts/AuthContextDefinition";
import { useServerContext } from "@/contexts/ServerContext";

import { useDeleteVHost, useVHosts } from "@/hooks/queries/useRabbitMQVHosts";
import { useServers } from "@/hooks/queries/useServer";
import { useWorkspace } from "@/hooks/ui/useWorkspace";

export default function VHostsPage() {
  const { serverId } = useParams<{ serverId: string }>();
  const { selectedServerId, hasServers } = useServerContext();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: serversData } = useServers();
  const servers = serversData?.servers || [];

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deleteVHost, setDeleteVHost] = useState<VHost | null>(null);
  const [filterRegex, setFilterRegex] = useState("");
  const [newVHostName, setNewVHostName] = useState("");
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
              title="Virtual Hosts"
              description="Add a RabbitMQ server connection to manage virtual hosts and namespace isolation."
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
                  <h1 className="title-page">Virtual Hosts</h1>
                  <p className="text-gray-500">
                    Manage RabbitMQ virtual hosts and namespace isolation
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
                      Please select a RabbitMQ server to manage virtual hosts.
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
                  Failed to load virtual hosts: {(error as Error).message}
                </AlertDescription>
              </Alert>
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
                  <h1 className="title-page">Virtual Hosts</h1>
                  <p className="text-gray-500">
                    Manage RabbitMQ virtual hosts and namespace isolation
                  </p>
                </div>
                <Badge variant="secondary" className="ml-2">
                  {vhosts.length}
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

            {/* VHosts Table */}
            <Card className="border-0 shadow-md bg-card">
              <CardHeader>
                <CardTitle className="text-lg">Virtual Hosts</CardTitle>
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
                        <TableHead>Users</TableHead>
                        <TableHead>
                          <div className="flex items-center gap-1">
                            Ready
                            <ChevronUp className="h-3 w-3" />
                          </div>
                        </TableHead>
                        <TableHead>
                          <div className="flex items-center gap-1">
                            Unacked
                            <ChevronUp className="h-3 w-3" />
                          </div>
                        </TableHead>
                        <TableHead>
                          <div className="flex items-center gap-1">
                            Total
                            <ChevronUp className="h-3 w-3" />
                          </div>
                        </TableHead>
                        <TableHead className="w-[100px]">Actions</TableHead>
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
                              <Database className="h-4 w-4" />
                              {vhost.name}
                              {vhost.protected_from_deletion && (
                                <Badge
                                  variant="secondary"
                                  className="text-xs flex items-center gap-1"
                                  title="Protected from deletion"
                                >
                                  <Lock className="w-3 h-3" />
                                </Badge>
                              )}
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

            {/* Add Virtual Host Form */}
            <Card className="border-0 shadow-md bg-card">
              <CardHeader>
                <CardTitle className="text-lg">Add virtual host</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-4">
                  <div className="flex-1">
                    <label
                      htmlFor="vhost-name"
                      className="block text-sm font-medium mb-2"
                    >
                      Name
                    </label>
                    <Input
                      id="vhost-name"
                      value={newVHostName}
                      onChange={(e) => setNewVHostName(e.target.value)}
                      placeholder="Enter virtual host name"
                      className="max-w-md"
                    />
                  </div>
                  <AddVirtualHostButton
                    serverId={currentServerId}
                    onSuccess={() => setNewVHostName("")}
                    initialName={newVHostName}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Modals */}
            <CreateVHostModal
              isOpen={showCreateModal}
              onClose={() => setShowCreateModal(false)}
              serverId={currentServerId}
              initialName={newVHostName}
              onSuccess={() => setNewVHostName("")}
            />

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
                    toast.success("Virtual host deleted successfully");
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
