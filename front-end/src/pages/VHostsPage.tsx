import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import {
  Database,
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
import { PageLoader } from "@/components/PageLoader";
import { NoServerConfigured } from "@/components/NoServerConfigured";
import { AddVirtualHostButton } from "@/components/AddVirtualHostButton";
import { PlanUpgradeModal } from "@/components/plans/PlanUpgradeModal";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useServerContext } from "@/contexts/ServerContext";
import { useUser } from "@/hooks/useUser";
import { useAuth } from "@/contexts/AuthContextDefinition";
import { apiClient } from "@/lib/api";
import { VHost } from "@/lib/api/vhostTypes";
import { CreateVHostModal } from "@/components/vhosts/CreateVHostModal";
import { DeleteVHostModal } from "@/components/vhosts/DeleteVHostModal";
import { toast } from "sonner";

export default function VHostsPage() {
  const { serverId } = useParams<{ serverId: string }>();
  const { selectedServerId, hasServers } = useServerContext();
  const { workspacePlan, workspace } = useUser();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deleteVHost, setDeleteVHost] = useState<VHost | null>(null);
  const [filterRegex, setFilterRegex] = useState("");
  const [newVHostName, setNewVHostName] = useState("");
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const currentServerId = serverId || selectedServerId;

  const {
    data: vhostsData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["vhosts", currentServerId],
    queryFn: () => {
      if (!workspace?.id) {
        throw new Error("Workspace ID is required");
      }
      return apiClient.getVHosts(currentServerId!, workspace.id);
    },
    enabled: !!currentServerId && !!workspace?.id,
  });

  const deleteVHostMutation = useMutation({
    mutationFn: (vhostName: string) => {
      if (!workspace?.id) {
        throw new Error("Workspace ID is required");
      }
      return apiClient.deleteVHost(currentServerId!, vhostName, workspace.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vhosts", currentServerId] });
      toast.success("Virtual host deleted successfully");
      setDeleteVHost(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete virtual host");
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

  const handleCreateVHost = () => {
    if (!newVHostName.trim()) return;

    // Use the create modal for proper validation
    setShowCreateModal(true);
  };

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
                <PlanBadge workspacePlan={workspacePlan} />
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
                    onUpgradeClick={() => setShowUpgradeModal(true)}
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
                onConfirm={() => deleteVHostMutation.mutate(deleteVHost.name)}
                isLoading={deleteVHostMutation.isPending}
              />
            )}

            {/* Plan Upgrade Modal */}
            <PlanUpgradeModal
              isOpen={showUpgradeModal}
              onClose={() => setShowUpgradeModal(false)}
              currentPlan={workspacePlan}
              feature="virtual host creation"
            />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
