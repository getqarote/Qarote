
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { MessageSquare, Clock, Activity, Server, Cpu, HardDrive, AlertTriangle, Zap } from "lucide-react";
import { MetricsChart } from "@/components/MetricsChart";
import { QueueCard } from "@/components/QueueCard";
import { ConnectionStatus } from "@/components/ConnectionStatus";
import { RecentAlerts } from "@/components/RecentAlerts";
import { ResourceUsage } from "@/components/ResourceUsage";
import { ConnectedNodes } from "@/components/ConnectedNodes";

const Index = () => {
  const [metrics, setMetrics] = useState({
    messagesPerSec: 15200,
    activeQueues: 127,
    avgLatency: 2.3,
    queueDepth: 8450,
    connectedNodes: 3,
    totalMemory: 12.8,
    cpuUsage: 45.2,
    diskUsage: 67.8
  });

  const [queues] = useState([
    {
      name: "user-notifications",
      messages: 1200,
      consumers: 3,
      status: "active"
    },
    {
      name: "email-queue",
      messages: 845,
      consumers: 2,
      status: "active"
    },
    {
      name: "analytics-events",
      messages: 2800,
      consumers: 5,
      status: "active"
    },
    {
      name: "payment-processing",
      messages: 156,
      consumers: 1,
      status: "active"
    },
    {
      name: "order-fulfillment",
      messages: 524,
      consumers: 2,
      status: "active"
    },
    {
      name: "audit-logs",
      messages: 1890,
      consumers: 1,
      status: "active"
    }
  ]);

  const chartData = [
    { time: '00:00', messages: 12000 },
    { time: '04:00', messages: 14500 },
    { time: '08:00', messages: 11000 },
    { time: '12:00', messages: 18500 },
    { time: '16:00', messages: 16800 },
    { time: '20:00', messages: 15200 },
  ];

  useEffect(() => {
    // Simulate real-time updates
    const interval = setInterval(() => {
      setMetrics(prev => ({
        messagesPerSec: prev.messagesPerSec + Math.floor(Math.random() * 200 - 100),
        activeQueues: prev.activeQueues + Math.floor(Math.random() * 6 - 3),
        avgLatency: Math.max(0.1, prev.avgLatency + (Math.random() * 0.4 - 0.2)),
        queueDepth: Math.max(0, prev.queueDepth + Math.floor(Math.random() * 100 - 50)),
        connectedNodes: prev.connectedNodes,
        totalMemory: Math.max(1, prev.totalMemory + (Math.random() * 0.2 - 0.1)),
        cpuUsage: Math.max(0, Math.min(100, prev.cpuUsage + (Math.random() * 4 - 2))),
        diskUsage: Math.max(0, Math.min(100, prev.diskUsage + (Math.random() * 0.2 - 0.1)))
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

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
                    RabbitMQ GUI Next
                  </h1>
                  <ConnectionStatus />
                </div>
              </div>
              <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
                Refresh Data
              </Button>
            </div>

            {/* Primary Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="hover:shadow-lg transition-all duration-300 border-0 shadow-md bg-white/80 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Messages/sec</CardTitle>
                  <MessageSquare className="h-5 w-5 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-gray-900">
                    {metrics.messagesPerSec.toLocaleString()}
                  </div>
                  <p className="text-xs text-green-600 mt-1">↗ +12.5% from last hour</p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-all duration-300 border-0 shadow-md bg-white/80 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Active Queues</CardTitle>
                  <Activity className="h-5 w-5 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-gray-900">{metrics.activeQueues}</div>
                  <p className="text-xs text-gray-500 mt-1">Across all vhosts</p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-all duration-300 border-0 shadow-md bg-white/80 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Queue Depth</CardTitle>
                  <Zap className="h-5 w-5 text-orange-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-gray-900">{metrics.queueDepth.toLocaleString()}</div>
                  <p className="text-xs text-orange-600 mt-1">Total pending messages</p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-all duration-300 border-0 shadow-md bg-white/80 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Avg Latency</CardTitle>
                  <Clock className="h-5 w-5 text-purple-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-gray-900">{metrics.avgLatency.toFixed(1)}ms</div>
                  <p className="text-xs text-red-500 mt-1">↗ +0.2ms from baseline</p>
                </CardContent>
              </Card>
            </div>

            {/* Secondary Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="hover:shadow-lg transition-all duration-300 border-0 shadow-md bg-white/80 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Connected Nodes</CardTitle>
                  <Server className="h-5 w-5 text-cyan-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">{metrics.connectedNodes}</div>
                  <p className="text-xs text-green-600 mt-1">All nodes healthy</p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-all duration-300 border-0 shadow-md bg-white/80 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">CPU Usage</CardTitle>
                  <Cpu className="h-5 w-5 text-yellow-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">{metrics.cpuUsage.toFixed(1)}%</div>
                  <p className="text-xs text-gray-500 mt-1">Cluster average</p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-all duration-300 border-0 shadow-md bg-white/80 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Memory Usage</CardTitle>
                  <HardDrive className="h-5 w-5 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">{metrics.totalMemory.toFixed(1)} GB</div>
                  <p className="text-xs text-gray-500 mt-1">Total allocated</p>
                </CardContent>
              </Card>
            </div>

            {/* Message Throughput Chart - Full Width */}
            <Card className="border-0 shadow-md bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900">Message Throughput</CardTitle>
                <p className="text-sm text-gray-500">Real-time message flow over the last 24 hours</p>
              </CardHeader>
              <CardContent>
                <MetricsChart data={chartData} />
              </CardContent>
            </Card>

            {/* Active Queues - Full Width Section */}
            <Card className="border-0 shadow-md bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-semibold text-gray-900">Active Queues</CardTitle>
                    <p className="text-sm text-gray-500">Currently processing messages</p>
                  </div>
                  <Button variant="outline" size="sm">
                    View All Queues
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {queues.map((queue, index) => (
                    <QueueCard key={queue.name} queue={queue} index={index} />
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Connected Nodes - Full Width */}
            <ConnectedNodes />

            {/* Bottom Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <RecentAlerts />
              <ResourceUsage metrics={metrics} />
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Index;
