import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { SendMessageDialog } from "@/components/SendMessageDialog";
import { AddQueueForm } from "@/components/AddQueueForm";
import { PurgeQueueDialog } from "@/components/PurgeQueueDialog";
import { PrivacyNotice, DataStorageWarning } from "@/components/PrivacyNotice";
import { NoServerConfigured } from "@/components/NoServerConfigured";
import { useServerContext } from "@/contexts/ServerContext";
import { useAuth } from "@/contexts/AuthContext";
import { useQueues } from "@/hooks/useApi";
import { Queue } from "@/lib/api";
import {
  canUserAddQueue,
  canUserSendMessages,
  getPlanDisplayName,
  WorkspacePlan,
} from "@/lib/plans/planUtils";
import PlanUpgradeModal from "@/components/plans/PlanUpgradeModal";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  Plus,
  MessageSquare,
  Users,
  Database,
  RefreshCw,
  Crown,
  Lock,
} from "lucide-react";

const Queues = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    selectedServerId,
    hasServers,
    isLoading: serversLoading,
  } = useServerContext();
  const {
    data: queuesData,
    isLoading,
    refetch,
  } = useQueues(selectedServerId || "");

  // Get user's workspace plan - for now we'll default to FREE
  // TODO: Create workspace context to properly fetch workspace data
  const workspacePlan = WorkspacePlan.FREE; // This should come from workspace context
  const canAddQueue = canUserAddQueue(workspacePlan);
  const canSendMessages = canUserSendMessages(workspacePlan);

  const handleAddQueueClick = () => {
    if (canAddQueue) {
      // Original add queue logic - AddQueueForm will handle this
      return;
    } else {
      // Show upgrade modal for Free plan users
      setShowUpgradeModal(true);
    }
  };

  const handleSendMessageClick = () => {
    if (!canSendMessages) {
      setShowUpgradeModal(true);
    }
    // If canSendMessages is true, the SendMessageDialog will handle it
  };

  const queues = useMemo(() => queuesData?.queues || [], [queuesData?.queues]);

  const filteredQueues = useMemo(() => {
    if (!searchTerm) return queues;
    return queues.filter(
      (queue) =>
        queue.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        queue.vhost.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [queues, searchTerm]);

  const getStatusBadge = (queue: Queue) => {
    if (queue.consumers > 0) {
      return <Badge className="bg-green-100 text-green-700">Running</Badge>;
    }
    if (queue.messages > 0) {
      return <Badge className="bg-yellow-100 text-yellow-700">Waiting</Badge>;
    }
    return <Badge variant="outline">Idle</Badge>;
  };

  const getQueueMetrics = (queue: Queue) => {
    return {
      messages: queue.messages,
      consumers: queue.consumers,
      messagesReady: queue.messages_ready,
      messagesUnacked: queue.messages_unacknowledged,
      messageRate: queue.message_stats?.publish_details?.rate || 0,
      consumerUtilisation:
        queue.consumers > 0
          ? Math.min(
              100,
              (queue.message_stats?.deliver_details?.rate || 0) * 10
            )
          : 0,
      memory: queue.memory / (1024 * 1024), // Convert to MB
      vhost: queue.vhost,
      durability: queue.durable ? "durable" : "transient",
      autoDelete: queue.auto_delete,
    };
  };

  if (!hasServers) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-gradient-to-br from-slate-50 to-blue-50">
          <AppSidebar />
          <main className="flex-1 p-6 overflow-auto">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
            </div>
            <NoServerConfigured
              title="Queue Management"
              subtitle="Connect to a RabbitMQ server to start managing queues"
              description="Add a RabbitMQ server connection to view and manage queues across your clusters."
            />
          </main>
        </div>
      </SidebarProvider>
    );
  }

  if (!selectedServerId) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-gradient-to-br from-slate-50 to-blue-50">
          <AppSidebar />
          <main className="flex-1 p-6 overflow-auto">
            <div className="max-w-7xl mx-auto space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <SidebarTrigger />
                  <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                      Queue Management
                    </h1>
                    <p className="text-gray-500">
                      Please select a RabbitMQ server to view queues
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-slate-50 to-blue-50">
        <AppSidebar />
        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <SidebarTrigger />
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                    Queue Management
                  </h1>
                  <p className="text-gray-600 mt-1">
                    Manage and monitor all queues across your clusters
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                {/* Send Message Button with plan restrictions */}
                {canSendMessages ? (
                  <SendMessageDialog
                    serverId={selectedServerId}
                    trigger={
                      <Button
                        variant="outline"
                        className="flex items-center gap-2"
                      >
                        <MessageSquare className="w-4 h-4" />
                        Send Message
                      </Button>
                    }
                  />
                ) : (
                  <Button
                    onClick={handleSendMessageClick}
                    disabled={true}
                    variant="outline"
                    className="flex items-center gap-2 opacity-60 cursor-not-allowed"
                    title="Upgrade to send messages"
                  >
                    <Lock className="w-4 h-4" />
                    Send Message
                    <span className="ml-1 px-2 py-0.5 bg-orange-500 text-white text-xs rounded-full font-bold">
                      Pro
                    </span>
                  </Button>
                )}

                {/* Plan badge */}
                <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full text-sm">
                  <Crown className="w-4 h-4 text-yellow-500" />
                  <span className="font-medium">
                    {getPlanDisplayName(workspacePlan)}
                  </span>
                </div>

                {/* Add Queue Button with plan restrictions */}
                {canAddQueue ? (
                  <AddQueueForm
                    serverId={selectedServerId}
                    trigger={
                      <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 flex items-center gap-2">
                        <Plus className="w-4 h-4" />
                        Add Queue
                      </Button>
                    }
                  />
                ) : (
                  <Button
                    onClick={handleAddQueueClick}
                    disabled={true}
                    className="bg-gray-200 text-gray-400 cursor-not-allowed opacity-60 flex items-center gap-2"
                    title="Upgrade to add queues"
                  >
                    <Lock className="w-4 h-4" />
                    Add Queue
                    <span className="ml-1 px-2 py-0.5 bg-orange-500 text-white text-xs rounded-full font-bold">
                      Pro
                    </span>
                  </Button>
                )}
              </div>
            </div>

            {/* Free plan restriction notices */}
            {(!canAddQueue || !canSendMessages) && (
              <div className="mb-6 space-y-4">
                {!canAddQueue && (
                  <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Crown className="w-5 h-5 text-orange-500" />
                      <div>
                        <p className="font-medium text-orange-900">
                          Queue creation is not available on the Free plan
                        </p>
                        <p className="text-sm text-orange-700 mt-1">
                          Upgrade to Freelance, Startup, or Business plan to
                          create and manage custom queues.
                        </p>
                      </div>
                      <button
                        onClick={() => setShowUpgradeModal(true)}
                        className="ml-auto px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors"
                      >
                        Upgrade Now
                      </button>
                    </div>
                  </div>
                )}

                {!canSendMessages && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <MessageSquare className="w-5 h-5 text-red-500" />
                      <div>
                        <p className="font-medium text-red-900">
                          Message sending is not available on the Free plan
                        </p>
                        <p className="text-sm text-red-700 mt-1">
                          Upgrade to send messages to queues. Freelance:
                          100/month, Startup: 1,000/month, Business: unlimited.
                        </p>
                      </div>
                      <button
                        onClick={() => setShowUpgradeModal(true)}
                        className="ml-auto px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
                      >
                        Upgrade Now
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Privacy Notice */}
            <DataStorageWarning
              isActive={false} // You would check actual user settings here
              dataTypes={[]} // TODO: Fetch actual data types
              retentionDays={0}
              onManageSettings={() => navigate("/privacy-settings")}
            />

            {/* Search and Stats */}
            <div className="flex flex-col lg:flex-row gap-6">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search queues by name or vhost..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-white/80 backdrop-blur-sm"
                  />
                </div>
              </div>
              <div className="flex gap-4">
                <Card className="border-0 shadow-md bg-white/80 backdrop-blur-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Database className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="text-sm text-gray-600">Total Queues</p>
                        <p className="font-bold text-xl">{queues.length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-md bg-white/80 backdrop-blur-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <MessageSquare className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="text-sm text-gray-600">Total Messages</p>
                        <p className="font-bold text-xl">
                          {queues
                            .reduce((sum, q) => sum + q.messages, 0)
                            .toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Queues Table */}
            <Card className="border-0 shadow-md bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold text-gray-900">
                    All Queues
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : filteredQueues.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Queue Name</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Messages</TableHead>
                        <TableHead>Ready</TableHead>
                        <TableHead>Unacked</TableHead>
                        <TableHead>Consumers</TableHead>
                        <TableHead>Rate (msg/s)</TableHead>
                        <TableHead>Memory (MB)</TableHead>
                        <TableHead>VHost</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredQueues.map((queue) => {
                        const metrics = getQueueMetrics(queue);
                        return (
                          <TableRow
                            key={`${queue.name}-${queue.vhost}`}
                            className="hover:bg-gray-50/50"
                          >
                            <TableCell className="font-medium">
                              {queue.name}
                            </TableCell>
                            <TableCell>{getStatusBadge(queue)}</TableCell>
                            <TableCell className="font-mono">
                              {metrics.messages.toLocaleString()}
                            </TableCell>
                            <TableCell className="font-mono text-blue-600">
                              {metrics.messagesReady.toLocaleString()}
                            </TableCell>
                            <TableCell className="font-mono text-orange-600">
                              {metrics.messagesUnacked.toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Users className="w-3 h-3 text-gray-400" />
                                {metrics.consumers}
                              </div>
                            </TableCell>
                            <TableCell className="font-mono">
                              {metrics.messageRate.toFixed(1)}
                            </TableCell>
                            <TableCell className="font-mono">
                              {metrics.memory.toFixed(1)}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className="font-mono text-xs"
                              >
                                {metrics.vhost}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    navigate(
                                      `/queues/${encodeURIComponent(
                                        queue.name
                                      )}`
                                    )
                                  }
                                >
                                  View
                                </Button>
                                <PurgeQueueDialog
                                  queueName={queue.name}
                                  messageCount={queue.messages}
                                  onSuccess={() => refetch()}
                                />
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8">
                    <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">
                      {searchTerm
                        ? `No queues found matching "${searchTerm}"`
                        : "No queues found on this server"}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Plan Upgrade Modal */}
            <PlanUpgradeModal
              isOpen={showUpgradeModal}
              onClose={() => setShowUpgradeModal(false)}
              currentPlan={workspacePlan}
              feature="queue creation"
            />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Queues;
