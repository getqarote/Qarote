import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Database,
  ArrowLeft,
  Users,
  Settings,
  Trash2,
  Edit,
  Plus,
  AlertCircle,
  Activity,
  MessageSquare,
  Network,
} from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageLoader } from "@/components/PageLoader";
import { ConnectionStatus } from "@/components/ConnectionStatus";
import { useServerContext } from "@/contexts/ServerContext";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/lib/api";
import { VHost } from "@/lib/api/vhostTypes";
import { DeleteVHostModal } from "@/components/vhosts/DeleteVHostModal";
import { EditVHostModal } from "@/components/vhosts/EditVHostModal";
import { VHostPermissionsTab } from "@/components/vhosts/VHostPermissionsTab";
import { VHostLimitsTab } from "@/components/vhosts/VHostLimitsTab";
import { toast } from "sonner";

export default function VHostDetailsPage() {
  const { serverId, vhostName } = useParams<{
    serverId?: string;
    vhostName: string;
  }>();
  const { selectedServerId } = useServerContext();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Form states
  const [selectedUser, setSelectedUser] = useState("admin");
  const [configureRegexp, setConfigureRegexp] = useState(".*");
  const [writeRegexp, setWriteRegexp] = useState(".*");
  const [readRegexp, setReadRegexp] = useState(".*");
  const [maxConnections, setMaxConnections] = useState("");
  const [maxQueues, setMaxQueues] = useState("");

  const currentServerId = serverId || selectedServerId;
  const decodedVHostName = decodeURIComponent(vhostName || "");

  const {
    data: vhostData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["vhost", currentServerId, decodedVHostName],
    queryFn: () => apiClient.getVHost(currentServerId!, decodedVHostName),
    enabled: !!currentServerId && !!decodedVHostName,
  });

  const deleteVHostMutation = useMutation({
    mutationFn: () => apiClient.deleteVHost(currentServerId!, decodedVHostName),
    onSuccess: () => {
      toast.success("Virtual host deleted successfully");
      navigate("/vhosts");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete virtual host");
    },
  });

  // Redirect non-admin users
  if (user?.role !== "ADMIN") {
    return (
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          <AppSidebar />
          <main className="flex-1 p-6">
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
          <main className="flex-1 p-6">
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
          <main className="flex-1 p-6">
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
          <main className="flex-1 p-6">
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
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <main className="flex-1 p-6">
          <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SidebarTrigger className="mr-2" />
                <h1 className="text-2xl font-bold">
                  Virtual host / {decodedVHostName}
                </h1>
              </div>
              <ConnectionStatus />
            </div>

            {/* Message stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Message stats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-8">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">
                      Ready
                    </div>
                    <div className="text-lg font-medium">
                      {vhost.messages_ready || 0}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">
                      Unacked
                    </div>
                    <div className="text-lg font-medium">
                      {vhost.messages_unacknowledged || 0}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">
                      Total
                    </div>
                    <div className="text-lg font-medium">
                      {vhost.messages || 0}
                    </div>
                  </div>
                </div>
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
                    <div className="text-lg font-medium">-</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">
                      Max queues
                    </div>
                    <div className="text-lg font-medium">-</div>
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
                    2
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
                      <TableRow>
                        <TableCell className="font-medium">admin</TableCell>
                        <TableCell>.*</TableCell>
                        <TableCell>.*</TableCell>
                        <TableCell>.*</TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm">
                            CLEAR
                          </Button>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">
                          {decodedVHostName}
                        </TableCell>
                        <TableCell>.*</TableCell>
                        <TableCell>.*</TableCell>
                        <TableCell>.*</TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm">
                            CLEAR
                          </Button>
                        </TableCell>
                      </TableRow>
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
                      <label className="block text-sm font-medium mb-2">User</label>
                      <select
                        className="w-full p-2 border rounded-md bg-background"
                        value={selectedUser}
                        onChange={(e) => setSelectedUser(e.target.value)}
                      >
                        <option value="admin">admin</option>
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
                      <Button className="bg-green-600 hover:bg-green-700">
                        Set permission
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
                        value={maxQueues}
                        onChange={(e) => setMaxQueues(e.target.value)}
                        placeholder="Leave empty for no limit"
                      />
                    </div>
                    <div>
                      <Button className="bg-green-600 hover:bg-green-700">
                        Set limits
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Danger zone */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-red-600">Danger zone</CardTitle>
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
                onConfirm={() => deleteVHostMutation.mutate()}
                isLoading={deleteVHostMutation.isPending}
              />
            )}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
