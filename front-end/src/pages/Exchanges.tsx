import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { NoServerConfigured } from "@/components/NoServerConfigured";
import { PlanBadge } from "@/components/ui/PlanBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  Shuffle,
  RefreshCw,
  Server,
  ArrowUpDown,
  GitBranch,
  Filter,
  Share2,
  Radio,
  Hash,
  Link2,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useExchanges, useDeleteExchange } from "@/hooks/useApi";
import { useServerContext } from "@/contexts/ServerContext";
import { useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/useToast";
import CreateExchangeDialog from "@/components/ExchangeManagement";
import { AddExchangeButton } from "@/components/AddExchangeButton";
import { PlanUpgradeModal } from "@/components/plans/PlanUpgradeModal";
import { ApiErrorWithCode } from "@/types/apiErrors";

const Exchanges = () => {
  const { selectedServerId, hasServers } = useServerContext();
  const { toast } = useToast();
  const [expandedExchanges, setExpandedExchanges] = useState<Set<string>>(
    new Set()
  );
  const [selectedExchangeType, setSelectedExchangeType] =
    useState<string>("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [exchangeToDelete, setExchangeToDelete] = useState<string>("");
  const [forceDelete, setForceDelete] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showCreateExchangeModal, setShowCreateExchangeModal] = useState(false);

  const {
    data: exchangesData,
    isLoading: exchangesLoading,
    error: exchangesError,
  } = useExchanges(selectedServerId);

  const deleteExchangeMutation = useDeleteExchange();

  const handleDeleteExchange = async (exchangeName: string) => {
    if (!selectedServerId) return;

    try {
      await deleteExchangeMutation.mutateAsync({
        serverId: selectedServerId,
        exchangeName,
        options: forceDelete ? {} : { if_unused: true },
      });

      toast({
        title: "Success",
        description: `Exchange "${exchangeName}" has been deleted successfully`,
      });

      setDeleteDialogOpen(false);
      setExchangeToDelete("");
      setForceDelete(false);
    } catch (error) {
      console.error("Failed to delete exchange:", error);

      // Extract error message and code
      let errorMessage = "Failed to delete exchange";
      let errorCode = null;

      if (error instanceof ApiErrorWithCode) {
        errorMessage = error.message;
        errorCode = error.code;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      // Show appropriate toast based on error
      if (
        errorCode === "EXCHANGE_IN_USE" ||
        errorMessage.includes("bindings") ||
        errorMessage.includes("being used")
      ) {
        toast({
          title: "Cannot Delete Exchange",
          description: errorMessage,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    }
  };

  const confirmDeleteExchange = (exchangeName: string) => {
    setExchangeToDelete(exchangeName);
    setDeleteDialogOpen(true);
  };

  const getExchangeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "direct":
        return <GitBranch className="h-4 w-4" />;
      case "fanout":
        return <Radio className="h-4 w-4" />;
      case "topic":
        return <Share2 className="h-4 w-4" />;
      case "headers":
        return <Hash className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getExchangeTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case "direct":
        return "bg-blue-100 text-blue-800";
      case "fanout":
        return "bg-green-100 text-green-800";
      case "topic":
        return "bg-purple-100 text-purple-800";
      case "headers":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getDestinationTypeIcon = (type: string) => {
    return type === "queue" ? (
      <Filter className="h-3 w-3" />
    ) : (
      <Activity className="h-3 w-3" />
    );
  };

  const filteredExchanges =
    exchangesData?.exchanges?.filter((exchange) => {
      if (selectedExchangeType === "all") return true;
      return exchange.type === selectedExchangeType;
    }) || [];

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
              title="Exchanges"
              description="Add a RabbitMQ server connection to manage exchanges and routing."
            />
          </main>
        </div>
      </SidebarProvider>
    );
  }

  if (!selectedServerId) {
    return (
      <SidebarProvider>
        <div className="page-layout">
          <AppSidebar />
          <main className="main-content-scrollable">
            <div className="content-container-large">
              <div className="flex items-center gap-4">
                <SidebarTrigger />
                <div>
                  <h1 className="title-page">Exchanges</h1>
                  <p className="text-gray-500">
                    Manage RabbitMQ exchanges and routing
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
                      Please select a RabbitMQ server to view exchanges.
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
                  <h1 className="title-page">Exchanges</h1>
                  <p className="text-gray-500">
                    Manage RabbitMQ exchanges and routing
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <PlanBadge />
                <AddExchangeButton
                  onUpgradeClick={() => setShowUpgradeModal(true)}
                  onAddClick={() => setShowCreateExchangeModal(true)}
                />
              </div>
            </div>

            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              <Card className="border-0 shadow-md bg-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Exchanges
                  </CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {exchangesLoading
                      ? "..."
                      : (exchangesData?.totalExchanges ?? 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Active exchanges
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-md bg-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Direct</CardTitle>
                  <GitBranch className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {exchangesLoading
                      ? "..."
                      : (exchangesData?.exchangeTypes?.direct ?? 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Point-to-point routing
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-md bg-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Fanout</CardTitle>
                  <Radio className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {exchangesLoading
                      ? "..."
                      : (exchangesData?.exchangeTypes?.fanout ?? 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Broadcast routing
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-md bg-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Topic</CardTitle>
                  <Share2 className="h-4 w-4 text-purple-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {exchangesLoading
                      ? "..."
                      : (exchangesData?.exchangeTypes?.topic ?? 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Pattern routing
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-md bg-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Bindings
                  </CardTitle>
                  <Link2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {exchangesLoading
                      ? "..."
                      : (exchangesData?.totalBindings ?? 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Exchange-queue bindings
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Exchanges Table */}
            <Card className="border-0 shadow-md bg-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Shuffle className="h-5 w-5" />
                    Exchanges
                  </CardTitle>
                  <Tabs
                    value={selectedExchangeType}
                    onValueChange={setSelectedExchangeType}
                  >
                    <TabsList>
                      <TabsTrigger value="all">All</TabsTrigger>
                      <TabsTrigger value="direct">Direct</TabsTrigger>
                      <TabsTrigger value="fanout">Fanout</TabsTrigger>
                      <TabsTrigger value="topic">Topic</TabsTrigger>
                      <TabsTrigger value="headers">Headers</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </CardHeader>
              <CardContent>
                {exchangesError ? (
                  <div className="text-center py-8">
                    <div className="text-red-600 mb-2">
                      Failed to load exchanges: {exchangesError.message}
                    </div>
                  </div>
                ) : exchangesLoading ? (
                  <div className="text-center py-8">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
                    <p>Loading exchanges...</p>
                  </div>
                ) : filteredExchanges.length === 0 ? (
                  <div className="text-center py-8">
                    <Activity className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {selectedExchangeType === "all"
                        ? "No Exchanges Found"
                        : `No ${selectedExchangeType} exchanges`}
                    </h3>
                    <p className="text-gray-600">
                      {selectedExchangeType === "all"
                        ? "There are currently no exchanges configured on this server."
                        : `There are no ${selectedExchangeType} type exchanges configured.`}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredExchanges.map((exchange) => (
                      <Collapsible
                        key={exchange.name}
                        open={expandedExchanges.has(exchange.name)}
                        onOpenChange={(isOpen) => {
                          const newExpanded = new Set(expandedExchanges);
                          if (isOpen) {
                            newExpanded.add(exchange.name);
                          } else {
                            newExpanded.delete(exchange.name);
                          }
                          setExpandedExchanges(newExpanded);
                        }}
                      >
                        <div className="border rounded-lg">
                          <CollapsibleTrigger asChild>
                            <div className="flex items-center justify-between p-4 hover:bg-accent cursor-pointer">
                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                  {getExchangeIcon(exchange.type)}
                                  <span className="font-medium">
                                    {exchange.name || "(Default)"}
                                  </span>
                                </div>
                                <Badge
                                  className={getExchangeTypeColor(
                                    exchange.type
                                  )}
                                >
                                  {exchange.type}
                                </Badge>
                                <div className="flex items-center gap-2 text-sm">
                                  {exchange.durable && (
                                    <Badge
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      Durable
                                    </Badge>
                                  )}
                                  {exchange.auto_delete && (
                                    <Badge
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      Auto-delete
                                    </Badge>
                                  )}
                                  {exchange.internal && (
                                    <Badge
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      Internal
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-4 text-sm">
                                <div className="text-center">
                                  <div className="font-medium">
                                    {exchange.bindingCount}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    Bindings
                                  </div>
                                </div>
                                {exchange.message_stats?.publish_in !==
                                  undefined && (
                                  <div className="text-center">
                                    <div className="font-medium">
                                      {exchange.message_stats.publish_in}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      Messages In
                                    </div>
                                  </div>
                                )}
                                {exchange.message_stats?.publish_out !==
                                  undefined && (
                                  <div className="text-center">
                                    <div className="font-medium">
                                      {exchange.message_stats.publish_out}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      Messages Out
                                    </div>
                                  </div>
                                )}
                                <ArrowUpDown className="h-4 w-4 text-gray-400" />
                              </div>
                            </div>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="border-t p-4">
                              <div className="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                  <h4 className="font-medium mb-2">
                                    Exchange Properties
                                  </h4>
                                  <div className="space-y-1 text-sm">
                                    <div>
                                      <span className="text-gray-500">
                                        Type:
                                      </span>{" "}
                                      {exchange.type}
                                    </div>
                                    <div>
                                      <span className="text-gray-500">
                                        Virtual Host:
                                      </span>{" "}
                                      {exchange.vhost}
                                    </div>
                                    <div>
                                      <span className="text-gray-500">
                                        Durable:
                                      </span>{" "}
                                      {exchange.durable ? "Yes" : "No"}
                                    </div>
                                    <div>
                                      <span className="text-gray-500">
                                        Auto-delete:
                                      </span>{" "}
                                      {exchange.auto_delete ? "Yes" : "No"}
                                    </div>
                                    <div>
                                      <span className="text-gray-500">
                                        Internal:
                                      </span>{" "}
                                      {exchange.internal ? "Yes" : "No"}
                                    </div>
                                    {exchange.arguments &&
                                      Object.keys(exchange.arguments).length >
                                        0 && (
                                        <div>
                                          <span className="text-gray-500">
                                            Arguments:
                                          </span>
                                          <div className="mt-1 p-2 bg-gray-50 rounded text-xs font-mono">
                                            {JSON.stringify(
                                              exchange.arguments,
                                              null,
                                              2
                                            )}
                                          </div>
                                        </div>
                                      )}
                                  </div>
                                </div>
                                <div>
                                  <h4 className="font-medium mb-2">
                                    Message Statistics
                                  </h4>
                                  <div className="space-y-1 text-sm">
                                    <div>
                                      <span className="text-gray-500">
                                        Messages Published In:
                                      </span>{" "}
                                      {exchange.message_stats?.publish_in ??
                                        "N/A"}
                                    </div>
                                    <div>
                                      <span className="text-gray-500">
                                        Messages Published Out:
                                      </span>{" "}
                                      {exchange.message_stats?.publish_out ??
                                        "N/A"}
                                    </div>
                                    <div>
                                      <span className="text-gray-500">
                                        Total Bindings:
                                      </span>{" "}
                                      {exchange.bindingCount}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Delete Exchange Button */}
                              <div className="mb-4">
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() =>
                                    confirmDeleteExchange(exchange.name)
                                  }
                                  disabled={deleteExchangeMutation.isPending}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete Exchange
                                </Button>
                              </div>

                              {exchange.bindings?.length > 0 && (
                                <div>
                                  <h4 className="font-medium mb-2">
                                    Bindings ({exchange.bindings.length})
                                  </h4>
                                  <div className="space-y-2">
                                    {exchange.bindings.map((binding, index) => (
                                      <div
                                        key={`${binding.destination}-${index}`}
                                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                                      >
                                        <div className="flex items-center gap-3">
                                          {getDestinationTypeIcon(
                                            binding.destination_type
                                          )}
                                          <span className="font-medium">
                                            {binding.destination}
                                          </span>
                                          <Badge
                                            variant="outline"
                                            className="text-xs"
                                          >
                                            {binding.destination_type}
                                          </Badge>
                                          {binding.routing_key && (
                                            <div className="text-sm text-gray-600">
                                              Key:{" "}
                                              <code className="bg-gray-200 px-1 rounded text-xs">
                                                {binding.routing_key}
                                              </code>
                                            </div>
                                          )}
                                        </div>
                                        {Object.keys(binding.arguments).length >
                                          0 && (
                                          <div className="text-xs text-gray-500">
                                            {
                                              Object.keys(binding.arguments)
                                                .length
                                            }{" "}
                                            arguments
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Exchange</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the exchange "{exchangeToDelete}"?
              This action cannot be undone and may affect message routing if the
              exchange is currently in use.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center space-x-2 py-4">
            <input
              type="checkbox"
              id="force-delete"
              checked={forceDelete}
              onChange={(e) => setForceDelete(e.target.checked)}
              className="rounded"
            />
            <label
              htmlFor="force-delete"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Force delete (remove even if exchange has bindings)
            </label>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setForceDelete(false);
              }}
              disabled={deleteExchangeMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleDeleteExchange(exchangeToDelete)}
              disabled={deleteExchangeMutation.isPending}
            >
              {deleteExchangeMutation.isPending
                ? "Deleting..."
                : forceDelete
                  ? "Force Delete Exchange"
                  : "Delete Exchange"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CreateExchangeDialog
        serverId={selectedServerId}
        isOpen={showCreateExchangeModal}
        onClose={() => setShowCreateExchangeModal(false)}
      />

      <PlanUpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        feature="Exchange Management"
      />
    </SidebarProvider>
  );
};

export default Exchanges;
