import { useState, useEffect, useRef, Suspense, lazy } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ArrowLeft,
  MessageSquare,
  Users,
  Database,
  RefreshCw,
  Clock,
  HardDrive,
  Activity,
  Settings,
  Trash2,
  Send,
  Eye,
  Plus,
  HelpCircle,
} from "lucide-react";
import { PurgeQueueDialog } from "@/components/PurgeQueueDialog";
import { SendMessageDialog } from "@/components/SendMessageDialog";
import { AddQueueForm } from "@/components/AddQueueForm";
import { useServerContext } from "@/contexts/ServerContext";
import { useQueue, useQueueConsumers } from "@/hooks/useApi";
import { Queue } from "@/lib/api";

// Lazy load MessageBrowser since it's only shown when user wants to browse messages
const MessageBrowser = lazy(() => import("@/components/MessageBrowser"));

const QueueDetail = () => {
  const { queueName } = useParams<{ queueName: string }>();
  const navigate = useNavigate();
  const { selectedServerId } = useServerContext();
  const messageBrowserRef = useRef<HTMLDivElement>(null);

  const {
    data: queueData,
    isLoading,
    refetch,
  } = useQueue(selectedServerId || "", queueName || "");

  const {
    data: consumersData,
    isLoading: consumersLoading,
    refetch: refetchConsumers,
  } = useQueueConsumers(selectedServerId || "", queueName || "");

  const queue = queueData?.queue;

  const scrollToMessageBrowser = () => {
    messageBrowserRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  if (!selectedServerId || !queueName) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-gradient-to-br from-slate-50 to-blue-50">
          <AppSidebar />
          <main className="flex-1 p-6 overflow-auto">
            <div className="max-w-7xl mx-auto space-y-6">
              <div className="text-center py-12">
                <MessageSquare className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                  Queue Not Found
                </h2>
                <p className="text-gray-600 mb-4">
                  Please select a server and queue to view details.
                </p>
                <Button onClick={() => navigate("/queues")}>
                  Back to Queues
                </Button>
              </div>
            </div>
          </main>
        </div>
      </SidebarProvider>
    );
  }

  const getStatusBadge = (queue: Queue) => {
    if (queue.consumers > 0) {
      return <Badge className="bg-green-100 text-green-700">Running</Badge>;
    }
    if (queue.messages > 0) {
      return <Badge className="bg-yellow-100 text-yellow-700">Waiting</Badge>;
    }
    return <Badge variant="outline">Idle</Badge>;
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDuration = (timestamp: string | null) => {
    if (!timestamp) return "Never";
    const diff = Date.now() - new Date(timestamp).getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h ago`;
    if (hours > 0) return `${hours}h ${minutes % 60}m ago`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s ago`;
    return `${seconds}s ago`;
  };

  return (
    <TooltipProvider>
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-gradient-to-br from-slate-50 to-blue-50">
          <AppSidebar />
          <main className="flex-1 p-6 overflow-auto">
            <div className="max-w-7xl mx-auto space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <SidebarTrigger />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate("/queues")}
                    className="flex items-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Queues
                  </Button>
                  <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                      {queueName}
                    </h1>
                    <p className="text-gray-600 mt-1">
                      Queue details and management
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <SendMessageDialog
                    serverId={selectedServerId}
                    defaultRoutingKey={queueName}
                    trigger={
                      <Button
                        variant="outline"
                        className="flex items-center gap-2"
                      >
                        <Send className="w-4 h-4" />
                        Send Message
                      </Button>
                    }
                  />
                  <AddQueueForm
                    serverId={selectedServerId}
                    trigger={
                      <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 flex items-center gap-2">
                        <Plus className="w-4 h-4" />
                        Add Queue
                      </Button>
                    }
                  />
                  <Button
                    variant="outline"
                    onClick={scrollToMessageBrowser}
                    className="flex items-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    Browse Messages
                  </Button>
                  <PurgeQueueDialog
                    queueName={queueName}
                    messageCount={queue?.messages || 0}
                    onSuccess={() => refetch()}
                    trigger={
                      <Button
                        variant="outline"
                        className="flex items-center gap-2 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                        Purge Queue
                      </Button>
                    }
                  />
                </div>
              </div>

              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Card
                      key={i}
                      className="border-0 shadow-md bg-white/80 backdrop-blur-sm"
                    >
                      <CardContent className="p-6">
                        <Skeleton className="h-12 w-full mb-2" />
                        <Skeleton className="h-6 w-3/4" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : queue ? (
                <>
                  {/* Status and Quick Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Card className="border-0 shadow-md bg-white/80 backdrop-blur-sm">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-600">Status</p>
                            {getStatusBadge(queue)}
                          </div>
                          <Activity className="w-8 h-8 text-blue-600" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-0 shadow-md bg-white/80 backdrop-blur-sm">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-600">
                              Total Messages
                            </p>
                            <p className="text-2xl font-bold text-gray-900">
                              {queue.messages.toLocaleString()}
                            </p>
                          </div>
                          <MessageSquare className="w-8 h-8 text-green-600" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-0 shadow-md bg-white/80 backdrop-blur-sm">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-600">Consumers</p>
                            <p className="text-2xl font-bold text-gray-900">
                              {queue.consumers}
                            </p>
                          </div>
                          <Users className="w-8 h-8 text-purple-600" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-0 shadow-md bg-white/80 backdrop-blur-sm">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-600">
                              Memory Usage
                            </p>
                            <p className="text-2xl font-bold text-gray-900">
                              {formatBytes(queue.memory)}
                            </p>
                          </div>
                          <HardDrive className="w-8 h-8 text-orange-600" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Detailed Message Statistics */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="border-0 shadow-md bg-white/80 backdrop-blur-sm">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Database className="w-5 h-5" />
                          Message Statistics
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-600">Ready</p>
                            <p className="text-xl font-bold text-blue-600">
                              {queue.messages_ready.toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">
                              Unacknowledged
                            </p>
                            <p className="text-xl font-bold text-orange-600">
                              {queue.messages_unacknowledged.toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">In RAM</p>
                            <p className="text-xl font-bold text-green-600">
                              {queue.messages_ram?.toLocaleString() || "0"}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Persistent</p>
                            <p className="text-xl font-bold text-purple-600">
                              {queue.messages_persistent?.toLocaleString() ||
                                "0"}
                            </p>
                          </div>
                        </div>
                        <div className="pt-4 border-t">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-600">
                                Publish Rate
                              </span>
                              <Tooltip>
                                <TooltipTrigger>
                                  <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <div className="text-xs">
                                    Average rate of messages published to the
                                    queue.
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-600">
                                Deliver Rate
                              </span>
                              <Tooltip>
                                <TooltipTrigger>
                                  <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <div className="text-xs">
                                    Average rate of messages delivered to
                                    consumers.
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4 mt-2">
                            <div>
                              <p className="text-sm text-gray-600">
                                Publish Rate
                              </p>
                              <p className="text-lg font-semibold">
                                {queue.message_stats?.publish_details?.rate?.toFixed(
                                  2
                                ) || "0.00"}{" "}
                                msg/s
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">
                                Deliver Rate
                              </p>
                              <p className="text-lg font-semibold">
                                {queue.message_stats?.deliver_details?.rate?.toFixed(
                                  2
                                ) || "0.00"}{" "}
                                msg/s
                              </p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-0 shadow-md bg-white/80 backdrop-blur-sm">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Settings className="w-5 h-5" />
                          Queue Configuration
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-600">VHost</p>
                            <Badge variant="outline" className="font-mono">
                              {queue.vhost}
                            </Badge>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Node</p>
                            <Badge variant="outline" className="font-mono">
                              {queue.node}
                            </Badge>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Type</p>
                            <Badge variant="outline">{queue.type}</Badge>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">State</p>
                            <Badge className="bg-green-100 text-green-700">
                              {queue.state}
                            </Badge>
                          </div>
                        </div>
                        <div className="pt-4 border-t">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">
                                Durable
                              </span>
                              <Badge
                                variant={queue.durable ? "default" : "outline"}
                              >
                                {queue.durable ? "Yes" : "No"}
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">
                                Auto Delete
                              </span>
                              <Badge
                                variant={
                                  queue.auto_delete ? "destructive" : "outline"
                                }
                              >
                                {queue.auto_delete ? "Yes" : "No"}
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">
                                Exclusive
                              </span>
                              <Badge
                                variant={
                                  queue.exclusive ? "default" : "outline"
                                }
                              >
                                {queue.exclusive ? "Yes" : "No"}
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">
                                Policy
                              </span>
                              <Badge variant="outline">
                                {queue.policy || "None"}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Additional Details */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="border-0 shadow-md bg-white/80 backdrop-blur-sm">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Clock className="w-5 h-5" />
                          Timing Information
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <p className="text-sm text-gray-600">Idle Since</p>
                          <p className="text-lg font-semibold">
                            {formatDuration(queue.idle_since)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Last Message</p>
                          <p className="text-lg font-semibold">
                            {formatDuration(queue.head_message_timestamp)}
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-0 shadow-md bg-white/80 backdrop-blur-sm">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Activity className="w-5 h-5" />
                          Performance Metrics
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-600">
                              Consumer Utilization
                            </p>
                            <p className="text-lg font-semibold">
                              {queue.consumer_utilisation?.toFixed(1) || "0.0"}%
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Reductions</p>
                            <p className="text-lg font-semibold">
                              {queue.reductions?.toLocaleString() || "0"}
                            </p>
                          </div>
                        </div>
                        <div className="pt-4 border-t">
                          <div>
                            <p className="text-sm text-gray-600">
                              Message Bytes
                            </p>
                            <p className="text-lg font-semibold">
                              {formatBytes(queue.message_bytes || 0)}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Consumer Details Section */}
                  <Card className="border-0 shadow-md bg-white/80 backdrop-blur-sm">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                          <Users className="w-5 h-5" />
                          Active Consumers ({consumersData?.totalConsumers || 0}
                          )
                        </CardTitle>
                        <Button
                          onClick={() => {
                            refetchConsumers();
                          }}
                          size="sm"
                          variant="outline"
                        >
                          <RefreshCw
                            className={`w-4 h-4 mr-2 ${
                              consumersLoading ? "animate-spin" : ""
                            }`}
                          />
                          Refresh
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {consumersLoading ? (
                        <div className="space-y-3">
                          {[1, 2, 3].map((i) => (
                            <Skeleton key={i} className="h-16 w-full" />
                          ))}
                        </div>
                      ) : consumersData?.consumers?.length === 0 ? (
                        <div className="text-center py-8">
                          <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            No Active Consumers
                          </h3>
                          <p className="text-gray-600">
                            This queue currently has no active consumers.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {consumersData?.consumers?.map((consumer, index) => (
                            <div
                              key={consumer.consumer_tag}
                              className="border rounded-lg p-4 bg-gradient-to-r from-gray-50 to-gray-100"
                            >
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                  <Badge
                                    variant="outline"
                                    className="font-mono text-xs"
                                  >
                                    {consumer.consumer_tag}
                                  </Badge>
                                  <div className="flex items-center gap-2">
                                    {consumer.ack_required && (
                                      <Badge
                                        variant="secondary"
                                        className="text-xs"
                                      >
                                        ACK
                                      </Badge>
                                    )}
                                    {consumer.exclusive && (
                                      <Badge
                                        variant="secondary"
                                        className="text-xs"
                                      >
                                        Exclusive
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                <div className="text-xs text-gray-500">
                                  Channel #{consumer.channel_details.number}
                                </div>
                              </div>

                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                                <div>
                                  <span className="text-gray-500">
                                    Connection:
                                  </span>
                                  <div
                                    className="font-medium truncate"
                                    title={
                                      consumer.channel_details.connection_name
                                    }
                                  >
                                    {consumer.channel_details.connection_name}
                                  </div>
                                </div>
                                <div>
                                  <span className="text-gray-500">Client:</span>
                                  <div className="font-medium">
                                    {consumer.channel_details.peer_host}:
                                    {consumer.channel_details.peer_port}
                                  </div>
                                </div>
                                <div>
                                  <span className="text-gray-500">
                                    Prefetch:
                                  </span>
                                  <div className="font-medium">
                                    {consumer.prefetch_count || "Unlimited"}
                                  </div>
                                </div>
                                <div>
                                  <span className="text-gray-500">
                                    Arguments:
                                  </span>
                                  <div className="font-medium">
                                    {Object.keys(consumer.arguments).length > 0
                                      ? `${
                                          Object.keys(consumer.arguments).length
                                        } args`
                                      : "None"}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Message Browser */}
                  <div ref={messageBrowserRef}>
                    <Suspense
                      fallback={
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <Eye className="h-5 w-5" />
                              Message Browser
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="flex items-center justify-center py-8">
                              <div className="flex items-center gap-2">
                                <RefreshCw className="h-4 w-4 animate-spin" />
                                <span className="text-sm text-gray-500">
                                  Loading message browser...
                                </span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      }
                    >
                      <MessageBrowser
                        queueName={queueName}
                        serverId={selectedServerId}
                      />
                    </Suspense>
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <MessageSquare className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                    Queue Not Found
                  </h2>
                  <p className="text-gray-600 mb-4">
                    The queue "{queueName}" could not be found.
                  </p>
                  <Button onClick={() => navigate("/queues")}>
                    Back to Queues
                  </Button>
                </div>
              )}
            </div>
          </main>
        </div>
      </SidebarProvider>
    </TooltipProvider>
  );
};

export default QueueDetail;
