import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { AddServerForm } from "@/components/AddServerForm";
import { NoServerConfigured } from "@/components/NoServerConfigured";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Network,
  Users,
  Activity,
  RefreshCw,
  Server,
  ArrowUpDown,
  Zap,
  Eye,
  Link,
} from "lucide-react";
import { useConnections, useChannels } from "@/hooks/useApi";
import { useServerContext } from "@/contexts/ServerContext";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const Connections = () => {
  const { selectedServerId, hasServers } = useServerContext();
  const [expandedConnections, setExpandedConnections] = useState<Set<string>>(
    new Set()
  );

  const {
    data: connectionsData,
    isLoading: connectionsLoading,
    error: connectionsError,
    refetch: refetchConnections,
  } = useConnections(selectedServerId || "");

  const {
    data: channelsData,
    isLoading: channelsLoading,
    error: channelsError,
    refetch: refetchChannels,
  } = useChannels(selectedServerId || "");

  const handleRefresh = () => {
    refetchConnections();
    refetchChannels();
  };

  const toggleConnection = (connectionName: string) => {
    const newExpanded = new Set(expandedConnections);
    if (newExpanded.has(connectionName)) {
      newExpanded.delete(connectionName);
    } else {
      newExpanded.add(connectionName);
    }
    setExpandedConnections(newExpanded);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const getStateColor = (state: string) => {
    switch (state.toLowerCase()) {
      case "running":
        return "bg-green-100 text-green-800";
      case "blocked":
        return "bg-yellow-100 text-yellow-800";
      case "flow":
        return "bg-blue-100 text-blue-800";
      case "closing":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
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
              title="Connections"
              subtitle="Connect to a RabbitMQ server to start monitoring connections"
              description="Add a RabbitMQ server connection to monitor connections and channels."
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
              <div className="flex items-center gap-4">
                <SidebarTrigger />
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                    Connections
                  </h1>
                  <p className="text-gray-500">
                    Monitor RabbitMQ connections and channels
                  </p>
                </div>
              </div>
              <Card className="border-0 shadow-md bg-white/80 backdrop-blur-sm">
                <CardContent className="p-12">
                  <div className="text-center">
                    <Server className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                      No Server Selected
                    </h2>
                    <p className="text-gray-600">
                      Please select a RabbitMQ server to view connections.
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
                    Connections
                  </h1>
                  <p className="text-gray-500">
                    Monitor RabbitMQ connections and channels
                  </p>
                </div>
              </div>
            </div>

            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="border-0 shadow-md bg-white/80 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Connections
                  </CardTitle>
                  <Network className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {connectionsLoading
                      ? "..."
                      : connectionsData?.totalConnections ?? 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Active client connections
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-md bg-white/80 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Channels
                  </CardTitle>
                  <Zap className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {channelsLoading ? "..." : channelsData?.totalChannels ?? 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Active communication channels
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-md bg-white/80 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Avg Channels/Connection
                  </CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {connectionsLoading || channelsLoading
                      ? "..."
                      : connectionsData?.totalConnections &&
                        connectionsData.totalConnections > 0
                      ? Math.round(
                          ((channelsData?.totalChannels ?? 0) /
                            connectionsData.totalConnections) *
                            10
                        ) / 10
                      : 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Channels per connection
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Connections Table */}
            <Card className="border-0 shadow-md bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Network className="h-5 w-5" />
                  Active Connections
                </CardTitle>
              </CardHeader>
              <CardContent>
                {connectionsError ? (
                  <div className="text-center py-8">
                    <div className="text-red-600 mb-2">
                      Failed to load connections: {connectionsError.message}
                    </div>
                  </div>
                ) : connectionsLoading ? (
                  <div className="text-center py-8">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
                    <p>Loading connections...</p>
                  </div>
                ) : connectionsData?.connections?.length === 0 ? (
                  <div className="text-center py-8">
                    <Network className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      No Active Connections
                    </h3>
                    <p className="text-gray-600">
                      There are currently no active connections to this RabbitMQ
                      server.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {connectionsData?.connections?.map((connection) => (
                      <Collapsible key={connection.name}>
                        <div className="border rounded-lg">
                          <CollapsibleTrigger asChild>
                            <div
                              className="flex items-center justify-between p-4 hover:bg-gray-50 cursor-pointer"
                              onClick={() => toggleConnection(connection.name)}
                            >
                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                  <Link className="h-4 w-4 text-blue-600" />
                                  <span className="font-medium">
                                    {connection.name}
                                  </span>
                                </div>
                                <Badge
                                  className={getStateColor(connection.state)}
                                >
                                  {connection.state}
                                </Badge>
                                <div className="flex items-center gap-1 text-sm text-gray-600">
                                  <Users className="h-3 w-3" />
                                  {connection.user}
                                </div>
                                <div className="flex items-center gap-1 text-sm text-gray-600">
                                  <Server className="h-3 w-3" />
                                  {connection.node}
                                </div>
                              </div>
                              <div className="flex items-center gap-4 text-sm">
                                <div className="text-center">
                                  <div className="font-medium">
                                    {connection.channelCount}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    Channels
                                  </div>
                                </div>
                                <div className="text-center">
                                  <div className="font-medium">
                                    {formatBytes(connection.recv_oct)}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    Received
                                  </div>
                                </div>
                                <div className="text-center">
                                  <div className="font-medium">
                                    {formatBytes(connection.send_oct)}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    Sent
                                  </div>
                                </div>
                                <ArrowUpDown className="h-4 w-4 text-gray-400" />
                              </div>
                            </div>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="border-t p-4">
                              <div className="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                  <h4 className="font-medium mb-2">
                                    Connection Details
                                  </h4>
                                  <div className="space-y-1 text-sm">
                                    <div>
                                      <span className="text-gray-500">
                                        Protocol:
                                      </span>{" "}
                                      {connection.protocol}
                                    </div>
                                    <div>
                                      <span className="text-gray-500">
                                        Virtual Host:
                                      </span>{" "}
                                      {connection.vhost}
                                    </div>
                                    <div>
                                      <span className="text-gray-500">
                                        Packets Received:
                                      </span>{" "}
                                      {connection.recv_cnt.toLocaleString()}
                                    </div>
                                    <div>
                                      <span className="text-gray-500">
                                        Packets Sent:
                                      </span>{" "}
                                      {connection.send_cnt.toLocaleString()}
                                    </div>
                                  </div>
                                </div>
                                <div>
                                  <h4 className="font-medium mb-2">
                                    Traffic Statistics
                                  </h4>
                                  <div className="space-y-1 text-sm">
                                    <div>
                                      <span className="text-gray-500">
                                        Bytes Received:
                                      </span>{" "}
                                      {formatBytes(connection.recv_oct)}
                                    </div>
                                    <div>
                                      <span className="text-gray-500">
                                        Bytes Sent:
                                      </span>{" "}
                                      {formatBytes(connection.send_oct)}
                                    </div>
                                    <div>
                                      <span className="text-gray-500">
                                        Active Channels:
                                      </span>{" "}
                                      {connection.channelCount}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {connection.channelDetails?.length > 0 && (
                                <div>
                                  <h4 className="font-medium mb-3 flex items-center gap-2">
                                    <Zap className="h-4 w-4" />
                                    Active Channels (
                                    {connection.channelDetails.length})
                                  </h4>
                                  <div className="grid gap-3">
                                    {connection.channelDetails.map(
                                      (channel) => (
                                        <div
                                          key={channel.name}
                                          className="border rounded-lg p-3 bg-gradient-to-r from-gray-50 to-gray-100"
                                        >
                                          <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-3">
                                              <Badge
                                                variant="outline"
                                                className="font-mono"
                                              >
                                                #{channel.number}
                                              </Badge>
                                              <span className="font-medium text-sm">
                                                {channel.name}
                                              </span>
                                              <Badge
                                                className={getStateColor(
                                                  channel.state
                                                )}
                                              >
                                                {channel.state}
                                              </Badge>
                                            </div>
                                            <div className="text-xs text-gray-500">
                                              {
                                                channel.connection_details
                                                  ?.peer_host
                                              }
                                              :
                                              {
                                                channel.connection_details
                                                  ?.peer_port
                                              }
                                            </div>
                                          </div>

                                          <div className="grid grid-cols-3 gap-4 text-xs">
                                            <div>
                                              <span className="text-gray-500">
                                                User:
                                              </span>
                                              <div className="font-medium">
                                                {channel.user}
                                              </div>
                                            </div>
                                            <div>
                                              <span className="text-gray-500">
                                                VHost:
                                              </span>
                                              <div className="font-medium">
                                                {channel.vhost}
                                              </div>
                                            </div>
                                            <div>
                                              <span className="text-gray-500">
                                                Node:
                                              </span>
                                              <div className="font-medium">
                                                {channel.node}
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      )
                                    )}
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
    </SidebarProvider>
  );
};

export default Connections;
