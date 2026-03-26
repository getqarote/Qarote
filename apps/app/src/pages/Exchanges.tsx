import { useState } from "react";
import { useTranslation } from "react-i18next";

import {
  Activity,
  ArrowUpDown,
  Filter,
  GitBranch,
  Hash,
  Link2,
  Radio,
  RefreshCw,
  Server,
  Share2,
  Shuffle,
  Trash2,
} from "lucide-react";

import { UserRole } from "@/lib/api";
import { logger } from "@/lib/logger";

import { AddExchangeButton } from "@/components/AddExchangeButton";
import { AppSidebar } from "@/components/AppSidebar";
import CreateExchangeDialog from "@/components/ExchangeManagement";
import { NoServerConfigured } from "@/components/NoServerConfigured";
import { PlanUpgradeModal } from "@/components/plans/PlanUpgradeModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { useAuth } from "@/contexts/AuthContextDefinition";
import { useServerContext } from "@/contexts/ServerContext";
import { useVHostContext } from "@/contexts/VHostContextDefinition";

import { useDeleteExchange, useExchanges } from "@/hooks/queries/useRabbitMQ";
import { useToast } from "@/hooks/ui/useToast";
import { useWorkspace } from "@/hooks/ui/useWorkspace";

import { ApiErrorWithCode } from "@/types/apiErrors";

const Exchanges = () => {
  const { t } = useTranslation("exchanges");
  const { user } = useAuth();
  const isAdmin = user?.role === UserRole.ADMIN;
  const { selectedServerId, hasServers } = useServerContext();
  const { selectedVHost } = useVHostContext();
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
  } = useExchanges(selectedServerId, selectedVHost);

  const deleteExchangeMutation = useDeleteExchange();
  const { workspace } = useWorkspace();

  const handleDeleteExchange = async (exchangeName: string) => {
    if (!selectedServerId || !workspace?.id) return;

    try {
      await deleteExchangeMutation.mutateAsync({
        serverId: selectedServerId,
        workspaceId: workspace.id,
        exchangeName,
        ifUnused: forceDelete ? undefined : true,
        vhost: selectedVHost
          ? encodeURIComponent(selectedVHost)
          : encodeURIComponent("/"),
      });

      toast({
        title: t("common:success"),
        description: t("deleteSuccess", { exchangeName }),
      });

      setDeleteDialogOpen(false);
      setExchangeToDelete("");
      setForceDelete(false);
    } catch (error) {
      logger.error("Failed to delete exchange:", error);

      // Extract error message and code
      let errorMessage = t("deleteError");
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
          title: t("cannotDeleteExchange"),
          description: errorMessage,
          variant: "destructive",
        });
      } else {
        toast({
          title: t("common:error"),
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
              title={t("noServerTitle")}
              description={t("noServerDescription")}
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
              </div>
              <div className="flex items-center gap-4">
                {isAdmin && (
                  <AddExchangeButton
                    onAddClick={() => setShowCreateExchangeModal(true)}
                  />
                )}
              </div>
            </div>

            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              <Card className="border-0 shadow-md bg-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {t("totalExchanges")}
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
                    {t("activeExchanges")}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-md bg-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {t("direct")}
                  </CardTitle>
                  <GitBranch className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {exchangesLoading
                      ? "..."
                      : (exchangesData?.exchangeTypes?.direct ?? 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t("pointToPointRouting")}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-md bg-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {t("fanout")}
                  </CardTitle>
                  <Radio className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {exchangesLoading
                      ? "..."
                      : (exchangesData?.exchangeTypes?.fanout ?? 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t("broadcastRouting")}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-md bg-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {t("topic")}
                  </CardTitle>
                  <Share2 className="h-4 w-4 text-purple-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {exchangesLoading
                      ? "..."
                      : (exchangesData?.exchangeTypes?.topic ?? 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t("patternRouting")}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-md bg-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {t("totalBindings")}
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
                    {t("exchangeQueueBindings")}
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
                    {t("exchangesTitle")}
                  </CardTitle>
                  <Tabs
                    value={selectedExchangeType}
                    onValueChange={setSelectedExchangeType}
                  >
                    <TabsList>
                      <TabsTrigger value="all">{t("all")}</TabsTrigger>
                      <TabsTrigger value="direct">{t("direct")}</TabsTrigger>
                      <TabsTrigger value="fanout">{t("fanout")}</TabsTrigger>
                      <TabsTrigger value="topic">{t("topic")}</TabsTrigger>
                      <TabsTrigger value="headers">{t("headers")}</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </CardHeader>
              <CardContent>
                {exchangesError ? (
                  <div className="text-center py-8">
                    <div className="text-red-600 mb-2">
                      {t("failedToLoad")}: {exchangesError.message}
                    </div>
                  </div>
                ) : exchangesLoading ? (
                  <div className="text-center py-8">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
                    <p>{t("loadingExchanges")}</p>
                  </div>
                ) : filteredExchanges.length === 0 ? (
                  <div className="text-center py-8">
                    <Activity className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {selectedExchangeType === "all"
                        ? t("noExchangesFound")
                        : t("noExchangesOfType", {
                            type: selectedExchangeType,
                          })}
                    </h3>
                    <p className="text-gray-600">
                      {selectedExchangeType === "all"
                        ? t("noExchangesDesc")
                        : t("noExchangesOfTypeDesc", {
                            type: selectedExchangeType,
                          })}
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
                                <div className="flex items-center gap-2 min-w-0 max-w-[300px]">
                                  {getExchangeIcon(exchange.type)}
                                  <span
                                    className="font-medium truncate"
                                    title={exchange.name || "(Default)"}
                                  >
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
                                      {t("durable")}
                                    </Badge>
                                  )}
                                  {exchange.auto_delete && (
                                    <Badge
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      {t("autoDelete")}
                                    </Badge>
                                  )}
                                  {exchange.internal && (
                                    <Badge
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      {t("internal")}
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
                                    {t("bindings")}
                                  </div>
                                </div>
                                {exchange.message_stats?.publish_in !==
                                  undefined && (
                                  <div className="text-center">
                                    <div className="font-medium">
                                      {exchange.message_stats.publish_in}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {t("messagesIn")}
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
                                      {t("messagesOut")}
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
                                    {t("exchangesTitle")}
                                  </h4>
                                  <div className="space-y-1 text-sm">
                                    <div>
                                      <span className="text-gray-500">
                                        {t("type")}:
                                      </span>{" "}
                                      {exchange.type}
                                    </div>
                                    <div>
                                      <span className="text-gray-500">
                                        {t("vhost")}:
                                      </span>{" "}
                                      {exchange.vhost}
                                    </div>
                                    <div>
                                      <span className="text-gray-500">
                                        {t("durable")}:
                                      </span>{" "}
                                      {exchange.durable
                                        ? t("common:yes")
                                        : t("common:no")}
                                    </div>
                                    <div>
                                      <span className="text-gray-500">
                                        {t("autoDelete")}:
                                      </span>{" "}
                                      {exchange.auto_delete
                                        ? t("common:yes")
                                        : t("common:no")}
                                    </div>
                                    <div>
                                      <span className="text-gray-500">
                                        {t("internal")}:
                                      </span>{" "}
                                      {exchange.internal
                                        ? t("common:yes")
                                        : t("common:no")}
                                    </div>
                                    {exchange.policy && (
                                      <div>
                                        <span className="text-gray-500">
                                          {t("policy")}:
                                        </span>{" "}
                                        <Badge
                                          variant="outline"
                                          className="ml-1"
                                        >
                                          {exchange.policy}
                                        </Badge>
                                      </div>
                                    )}
                                    {exchange.user_who_performed_action && (
                                      <div>
                                        <span className="text-gray-500">
                                          Last Action By:
                                        </span>{" "}
                                        <span className="font-mono text-xs">
                                          {exchange.user_who_performed_action}
                                        </span>
                                      </div>
                                    )}
                                    {exchange.arguments &&
                                      Object.keys(exchange.arguments).length >
                                        0 && (
                                        <div>
                                          <span className="text-gray-500">
                                            {t("arguments")}:
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
                                    {t("messagesPublishedIn")}
                                  </h4>
                                  <div className="space-y-1 text-sm">
                                    <div>
                                      <span className="text-gray-500">
                                        {t("messagesPublishedIn")}:
                                      </span>{" "}
                                      {exchange.message_stats?.publish_in ??
                                        "N/A"}
                                    </div>
                                    <div>
                                      <span className="text-gray-500">
                                        {t("messagesPublishedOut")}:
                                      </span>{" "}
                                      {exchange.message_stats?.publish_out ??
                                        "N/A"}
                                    </div>
                                    <div>
                                      <span className="text-gray-500">
                                        {t("totalBindings")}:
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
                                  {t("deleteExchange")}
                                </Button>
                              </div>

                              {exchange.bindings?.length > 0 && (
                                <div>
                                  <h4 className="font-medium mb-2">
                                    {t("bindings")} ({exchange.bindings.length})
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
                                            {t("arguments")}
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
            <DialogTitle>{t("deleteTitle")}</DialogTitle>
            <DialogDescription>
              {t("deleteDescription", { exchangeName: exchangeToDelete })}
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
              {t("forceDelete")}
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
              {t("common:cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleDeleteExchange(exchangeToDelete)}
              disabled={deleteExchangeMutation.isPending}
            >
              {deleteExchangeMutation.isPending
                ? t("deleting")
                : forceDelete
                  ? t("forceDeleteExchange")
                  : t("deleteExchange")}
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
