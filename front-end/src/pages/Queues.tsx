import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
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
} from "lucide-react";
import { AddServerForm } from "@/components/AddServerForm";
import { useServerContext } from "@/contexts/ServerContext";
import { useQueues } from "@/hooks/useApi";
import { Queue } from "@/lib/api";

const Queues = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const { selectedServerId } = useServerContext();
  const {
    data: queuesData,
    isLoading,
    refetch,
  } = useQueues(selectedServerId || "");

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
                <AddServerForm />
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
                <AddServerForm
                  trigger={
                    <Button
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add Server
                    </Button>
                  }
                />
                <Button variant="outline" className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Send Message
                  <Badge className="ml-2 bg-purple-100 text-purple-700">
                    PRO
                  </Badge>
                </Button>
                <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Add Queue
                  <Badge className="ml-2 bg-white/20 text-white">PRO</Badge>
                </Button>
              </div>
            </div>

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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => refetch()}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Refresh
                  </Button>
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
                                <Button size="sm" variant="outline">
                                  View
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-red-600 hover:text-red-700"
                                >
                                  Purge
                                </Button>
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
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Queues;
