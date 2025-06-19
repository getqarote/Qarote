import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scrollArea";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { isLogsEnabled } from "@/lib/logsFeatureFlag";
import {
  FileText,
  Search,
  Filter,
  Clock,
  User,
  Activity,
  MessageSquare,
  AlertTriangle,
  Server,
  Trash2,
  Plus,
  Crown,
  Sparkles,
} from "lucide-react";
import PremiumPageWrapper from "@/components/PremiumPageWrapper";
import { WorkspacePlan } from "@/lib/plans/planUtils";

// Mock data for demonstration (this will be replaced with API calls in the future)
const mockLogs = [
  {
    id: "1",
    timestamp: "2025-06-16T10:30:00Z",
    userId: "user-1",
    userName: "John Doe",
    userEmail: "john.doe@company.com",
    action: "SEND_MESSAGE",
    resource: "order-processing-queue",
    details: "Sent message to queue 'order-processing-queue'",
    severity: "info" as const,
    serverId: "server-1",
    serverName: "Production RabbitMQ",
  },
  {
    id: "2",
    timestamp: "2025-06-16T10:25:00Z",
    userId: "user-2",
    userName: "Jane Smith",
    userEmail: "jane.smith@company.com",
    action: "CREATE_QUEUE",
    resource: "user-notifications",
    details: "Created new queue 'user-notifications' with durable=true",
    severity: "info" as const,
    serverId: "server-1",
    serverName: "Production RabbitMQ",
  },
  {
    id: "3",
    timestamp: "2025-06-16T10:20:00Z",
    userId: "user-1",
    userName: "John Doe",
    userEmail: "john.doe@company.com",
    action: "PURGE_QUEUE",
    resource: "failed-orders",
    details: "Purged 42 messages from queue 'failed-orders'",
    severity: "warning" as const,
    serverId: "server-1",
    serverName: "Production RabbitMQ",
  },
  {
    id: "4",
    timestamp: "2025-06-16T10:15:00Z",
    userId: "user-3",
    userName: "Bob Wilson",
    userEmail: "bob.wilson@company.com",
    action: "CREATE_ALERT",
    resource: "High Queue Depth Alert",
    details: "Created alert rule for queue depth > 1000 messages",
    severity: "info" as const,
    serverId: "server-2",
    serverName: "Staging RabbitMQ",
  },
  {
    id: "5",
    timestamp: "2025-06-16T10:10:00Z",
    userId: "user-2",
    userName: "Jane Smith",
    userEmail: "jane.smith@company.com",
    action: "DELETE_QUEUE",
    resource: "temp-processing",
    details: "Deleted queue 'temp-processing'",
    severity: "error" as const,
    serverId: "server-1",
    serverName: "Production RabbitMQ",
  },
  {
    id: "6",
    timestamp: "2025-06-16T10:05:00Z",
    userId: "user-4",
    userName: "Alice Brown",
    userEmail: "alice.brown@company.com",
    action: "CREATE_EXCHANGE",
    resource: "event-router",
    details: "Created topic exchange 'event-router'",
    severity: "info" as const,
    serverId: "server-1",
    serverName: "Production RabbitMQ",
  },
];

const severityConfig = {
  info: {
    color: "bg-blue-100 text-blue-700 border-blue-200",
    icon: Activity,
  },
  warning: {
    color: "bg-yellow-100 text-yellow-700 border-yellow-200",
    icon: AlertTriangle,
  },
  error: {
    color: "bg-red-100 text-red-700 border-red-200",
    icon: AlertTriangle,
  },
};

const actionConfig = {
  SEND_MESSAGE: { icon: MessageSquare, label: "Send Message" },
  CREATE_QUEUE: { icon: Plus, label: "Create Queue" },
  DELETE_QUEUE: { icon: Trash2, label: "Delete Queue" },
  PURGE_QUEUE: { icon: Trash2, label: "Purge Queue" },
  CREATE_ALERT: { icon: AlertTriangle, label: "Create Alert" },
  CREATE_EXCHANGE: { icon: Activity, label: "Create Exchange" },
  DELETE_EXCHANGE: { icon: Trash2, label: "Delete Exchange" },
  CREATE_BINDING: { icon: Activity, label: "Create Binding" },
  DELETE_BINDING: { icon: Trash2, label: "Delete Binding" },
  LOGIN: { icon: User, label: "Login" },
  LOGOUT: { icon: User, label: "Logout" },
};

const Logs = () => {
  // Check if logs feature is enabled
  const logsEnabled = isLogsEnabled();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("all");
  const [selectedAction, setSelectedAction] = useState<string>("all");
  const [selectedUser, setSelectedUser] = useState<string>("all");

  // Filter logs based on search criteria
  const filteredLogs = useMemo(() => {
    if (!logsEnabled) return [];

    return mockLogs.filter((log) => {
      const matchesSearch =
        log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.resource.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.serverName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesSeverity =
        selectedSeverity === "all" || log.severity === selectedSeverity;
      const matchesAction =
        selectedAction === "all" || log.action === selectedAction;
      const matchesUser = selectedUser === "all" || log.userId === selectedUser;

      return matchesSearch && matchesSeverity && matchesAction && matchesUser;
    });
  }, [logsEnabled, searchTerm, selectedSeverity, selectedAction, selectedUser]);

  // Get unique values for filters
  const uniqueActions = Array.from(new Set(mockLogs.map((log) => log.action)));
  const uniqueUsers = Array.from(
    new Set(mockLogs.map((log) => ({ id: log.userId, name: log.userName })))
  );

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  // If logs are not enabled, show coming soon page

  const workspacePlan = WorkspacePlan.FREE;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-slate-50 to-blue-50">
        <AppSidebar />

        <PremiumPageWrapper
          workspacePlan={workspacePlan}
          feature="Logs Activity Tracking"
          featureDescription="Gain insights into user actions and system events with detailed activity logs."
          requiredPlan="Freelance or higher"
        >
          <main className="flex-1 overflow-auto">
            {/* Hero Header */}
            <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 text-white">
              <div className="px-6 py-8">
                <div className="flex items-center gap-4 mb-6">
                  <SidebarTrigger className="text-white hover:bg-white/20" />
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                      <FileText className="h-8 w-8" />
                    </div>
                    <div>
                      <h1 className="text-3xl font-bold flex items-center gap-3">
                        Activity Logs
                        <Badge className="bg-white/20 text-white border-white/30">
                          <Crown className="w-3 h-3 mr-1" />
                          PREMIUM
                        </Badge>
                      </h1>
                      <p className="text-indigo-100 text-lg">
                        Track all user actions and system events across your
                        RabbitMQ infrastructure
                      </p>
                    </div>
                  </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card className="bg-white/10 backdrop-blur-sm border-white/20">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Activity className="h-8 w-8 text-white" />
                        <div>
                          <p className="text-2xl font-bold text-white">
                            {filteredLogs.length}
                          </p>
                          <p className="text-indigo-100 text-sm">
                            Total Events
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-white/10 backdrop-blur-sm border-white/20">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <User className="h-8 w-8 text-white" />
                        <div>
                          <p className="text-2xl font-bold text-white">
                            {uniqueUsers.length}
                          </p>
                          <p className="text-indigo-100 text-sm">
                            Active Users
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-white/10 backdrop-blur-sm border-white/20">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="h-8 w-8 text-white" />
                        <div>
                          <p className="text-2xl font-bold text-white">
                            {
                              filteredLogs.filter(
                                (log) =>
                                  log.severity === "warning" ||
                                  log.severity === "error"
                              ).length
                            }
                          </p>
                          <p className="text-indigo-100 text-sm">
                            Critical Actions
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-white/10 backdrop-blur-sm border-white/20">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Clock className="h-8 w-8 text-white" />
                        <div>
                          <p className="text-2xl font-bold text-white">24h</p>
                          <p className="text-indigo-100 text-sm">Time Range</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>

            {/* Filters Section */}
            <div className="p-6">
              <Card className="mb-6 border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Filter className="h-5 w-5 text-indigo-600" />
                    Filters & Search
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-gray-700 mb-2 block">
                        Search Events
                      </label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Search by user, action, resource..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">
                        Severity
                      </label>
                      <Select
                        value={selectedSeverity}
                        onValueChange={setSelectedSeverity}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="All severities" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Severities</SelectItem>
                          <SelectItem value="info">Info</SelectItem>
                          <SelectItem value="warning">Warning</SelectItem>
                          <SelectItem value="error">Error</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">
                        Action Type
                      </label>
                      <Select
                        value={selectedAction}
                        onValueChange={setSelectedAction}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="All actions" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Actions</SelectItem>
                          {uniqueActions.map((action) => (
                            <SelectItem key={action} value={action}>
                              {actionConfig[action as keyof typeof actionConfig]
                                ?.label || action}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">
                        User
                      </label>
                      <Select
                        value={selectedUser}
                        onValueChange={setSelectedUser}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="All users" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Users</SelectItem>
                          {uniqueUsers.map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Logs List */}
              <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-indigo-600" />
                      Activity Logs
                      <Badge variant="outline" className="ml-2">
                        {filteredLogs.length} events
                      </Badge>
                    </CardTitle>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Sparkles className="h-4 w-4" />
                      <span>Real-time updates</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {filteredLogs.length > 0 ? (
                    <ScrollArea className="h-[600px]">
                      <div className="space-y-4">
                        {filteredLogs.map((log, index) => {
                          const SeverityIcon =
                            severityConfig[log.severity].icon;
                          const ActionIcon =
                            actionConfig[
                              log.action as keyof typeof actionConfig
                            ]?.icon || Activity;

                          return (
                            <div key={log.id}>
                              <div className="flex items-start gap-4 p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                                <div className="flex-shrink-0">
                                  <div
                                    className={`p-2 rounded-lg ${
                                      severityConfig[log.severity].color
                                    }`}
                                  >
                                    <SeverityIcon className="h-4 w-4" />
                                  </div>
                                </div>

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-2">
                                    <ActionIcon className="h-4 w-4 text-gray-600" />
                                    <span className="font-medium text-gray-900">
                                      {actionConfig[
                                        log.action as keyof typeof actionConfig
                                      ]?.label || log.action}
                                    </span>
                                    <Badge
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      {log.resource}
                                    </Badge>
                                    <Badge
                                      className={
                                        severityConfig[log.severity].color
                                      }
                                    >
                                      {log.severity}
                                    </Badge>
                                  </div>

                                  <p className="text-gray-700 mb-2">
                                    {log.details}
                                  </p>

                                  <div className="flex items-center gap-4 text-sm text-gray-500">
                                    <div className="flex items-center gap-1">
                                      <User className="h-3 w-3" />
                                      <span>{log.userName}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Server className="h-3 w-3" />
                                      <span>{log.serverName}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      <span>
                                        {formatTimestamp(log.timestamp)}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              {index < filteredLogs.length - 1 && (
                                <Separator className="my-2" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  ) : (
                    <div className="text-center py-12">
                      <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        No logs found
                      </h3>
                      <p className="text-gray-500 mb-4">
                        {searchTerm ||
                        selectedSeverity !== "all" ||
                        selectedAction !== "all" ||
                        selectedUser !== "all"
                          ? "No logs match your current filters."
                          : "No activity logs available."}
                      </p>
                      {(searchTerm ||
                        selectedSeverity !== "all" ||
                        selectedAction !== "all" ||
                        selectedUser !== "all") && (
                        <Button
                          variant="outline"
                          onClick={() => {
                            setSearchTerm("");
                            setSelectedSeverity("all");
                            setSelectedAction("all");
                            setSelectedUser("all");
                          }}
                        >
                          Clear Filters
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </main>
        </PremiumPageWrapper>
      </div>
    </SidebarProvider>
  );
};

export default Logs;
