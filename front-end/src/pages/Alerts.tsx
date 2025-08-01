import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import logger from "../lib/logger";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { AlertTriangle, CheckCircle, Clock, Plus, Search } from "lucide-react";
import {
  apiClient,
  AlertInstance,
  AlertRule,
  AlertStats,
  AlertStatus,
  AlertSeverity,
} from "@/lib/api";
import { isAlertsEnabled } from "@/lib/alertsFeatureFlag";
import PremiumPageWrapper from "@/components/PremiumPageWrapper";
import { useWorkspace } from "@/contexts/WorkspaceContext";

const AlertDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { workspacePlan } = useWorkspace();
  const [alerts, setAlerts] = useState<AlertInstance[]>([]);
  const [alertRules, setAlertRules] = useState<AlertRule[]>([]);
  const [stats, setStats] = useState<AlertStats | null>(null);
  // const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("alerts");

  // Filters
  const [statusFilter, setStatusFilter] = useState<AlertStatus | "ALL">("ALL");
  const [severityFilter, setSeverityFilter] = useState<AlertSeverity | "ALL">(
    "ALL"
  );
  const [searchTerm, setSearchTerm] = useState("");

  // Check if alerts feature is enabled
  // const alertsEnabled = isAlertsEnabled();

  const loadData = useCallback(async () => {
    // if (!alertsEnabled) return;

    try {
      // setLoading(true);
      const [alertsResponse, rulesResponse, statsResponse] = await Promise.all([
        apiClient.getAlerts({
          status: statusFilter !== "ALL" ? statusFilter : undefined,
          severity: severityFilter !== "ALL" ? severityFilter : undefined,
          limit: 50,
        }),
        apiClient.getAlertRules(),
        apiClient.getAlertStats(),
      ]);

      setAlerts(alertsResponse.alerts);
      setAlertRules(rulesResponse);
      setStats(statsResponse);
    } catch (error) {
      logger.error("Error loading alerts data:", error);
    } finally {
      // setLoading(false);
    }
  }, [statusFilter, severityFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      await apiClient.acknowledgeAlert(alertId);
      loadData(); // Refresh data
    } catch (error) {
      logger.error("Error acknowledging alert:", error);
    }
  };

  const handleResolveAlert = async (alertId: string) => {
    try {
      await apiClient.resolveAlert(alertId);
      loadData(); // Refresh data
    } catch (error) {
      logger.error("Error resolving alert:", error);
    }
  };

  const getSeverityColor = (severity: AlertSeverity) => {
    switch (severity) {
      case "CRITICAL":
        return "destructive";
      case "HIGH":
        return "destructive";
      case "MEDIUM":
        return "default";
      case "LOW":
        return "secondary";
      default:
        return "secondary";
    }
  };

  const getStatusIcon = (status: AlertStatus) => {
    switch (status) {
      case "ACTIVE":
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case "ACKNOWLEDGED":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "RESOLVED":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
  };

  const filteredAlerts = alerts.filter((alert) => {
    const matchesSearch =
      searchTerm === "" ||
      alert.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alert.description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "ALL" || alert.status === statusFilter;
    const matchesSeverity =
      severityFilter === "ALL" || alert.severity === severityFilter;

    return matchesSearch && matchesStatus && matchesSeverity;
  });

  const filteredRules = alertRules.filter((rule) => {
    return (
      searchTerm === "" ||
      rule.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (rule.description &&
        rule.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  });

  // if (loading) {
  //   return (
  //     <SidebarProvider>
  //       <div className="page-layout">
  //         <AppSidebar />
  //         <main className="main-content-scrollable">
  //           <div className="max-w-7xl mx-auto">
  //             <div className="flex justify-center p-8">Loading...</div>
  //           </div>
  //         </main>
  //       </div>
  //     </SidebarProvider>
  //   );
  // }

  return (
    <SidebarProvider>
      <div className="page-layout">
        <AppSidebar />

        <PremiumPageWrapper
          workspacePlan={workspacePlan}
          feature="Alerts Dashboard"
          featureDescription="Monitor and manage RabbitMQ alerts with real-time statistics, rules, and actions."
          requiredPlan="Developer or higher"
        >
          <main className="main-content-scrollable">
            <div className="content-container-large">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <SidebarTrigger />
                  <div>
                    <h1 className="title-page">
                      Alert Dashboard
                    </h1>
                    <p className="text-gray-500">
                      Monitor and manage your RabbitMQ alerts
                    </p>
                  </div>
                </div>
                <Button onClick={() => navigate("/alerts/rules/new")}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Alert Rule
                </Button>
              </div>

              {/* Stats Cards */}
              {stats && (
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-red-600">
                        Active
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.active}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-yellow-600">
                        Acknowledged
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {stats.acknowledged}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-green-600">
                        Resolved
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.resolved}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-red-700">
                        Critical
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.critical}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">
                        Total
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.total}</div>
                    </CardContent>
                  </Card>
                </div>
              )}

              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                  <TabsTrigger value="alerts">Alerts</TabsTrigger>
                  <TabsTrigger value="rules">Alert Rules</TabsTrigger>
                </TabsList>

                {/* Filters */}
                <div className="flex gap-4 my-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <Input
                        placeholder="Search alerts or rules..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <Select
                    value={statusFilter}
                    onValueChange={(value) =>
                      setStatusFilter(value as AlertStatus | "ALL")
                    }
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Status</SelectItem>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="ACKNOWLEDGED">Acknowledged</SelectItem>
                      <SelectItem value="RESOLVED">Resolved</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={severityFilter}
                    onValueChange={(value) =>
                      setSeverityFilter(value as AlertSeverity | "ALL")
                    }
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Severity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Severity</SelectItem>
                      <SelectItem value="CRITICAL">Critical</SelectItem>
                      <SelectItem value="HIGH">High</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="LOW">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <TabsContent value="alerts">
                  <div className="space-y-4">
                    {filteredAlerts.length === 0 ? (
                      <Card>
                        <CardContent className="py-8 text-center">
                          <p className="text-gray-500">No alerts found</p>
                        </CardContent>
                      </Card>
                    ) : (
                      filteredAlerts.map((alert) => (
                        <Card key={alert.id}>
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                {getStatusIcon(alert.status)}
                                <div>
                                  <CardTitle className="text-lg">
                                    {alert.title}
                                  </CardTitle>
                                  <CardDescription>
                                    {alert.description}
                                  </CardDescription>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant={getSeverityColor(alert.severity)}
                                >
                                  {alert.severity}
                                </Badge>
                                <Badge variant="outline">{alert.status}</Badge>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="flex items-center justify-between">
                              <div className="text-sm text-gray-500">
                                <p>
                                  Server:{" "}
                                  {alert.alertRule?.server.name || "Unknown"}
                                </p>
                                <p>
                                  Created:{" "}
                                  {formatDistanceToNow(
                                    new Date(alert.createdAt),
                                    {
                                      addSuffix: true,
                                    }
                                  )}
                                </p>
                                {alert.value !== undefined &&
                                  alert.threshold !== undefined && (
                                    <p>
                                      Value: {alert.value} / Threshold:{" "}
                                      {alert.threshold}
                                    </p>
                                  )}
                              </div>
                              <div className="flex gap-2">
                                {alert.status === "ACTIVE" && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      handleAcknowledgeAlert(alert.id)
                                    }
                                  >
                                    Acknowledge
                                  </Button>
                                )}
                                {(alert.status === "ACTIVE" ||
                                  alert.status === "ACKNOWLEDGED") && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleResolveAlert(alert.id)}
                                  >
                                    Resolve
                                  </Button>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="rules">
                  <div className="space-y-4">
                    {filteredRules.length === 0 ? (
                      <Card>
                        <CardContent className="py-8 text-center">
                          <p className="text-gray-500">No alert rules found</p>
                          <Button
                            className="mt-4"
                            onClick={() => navigate("/alerts/rules/new")}
                          >
                            Create Your First Alert Rule
                          </Button>
                        </CardContent>
                      </Card>
                    ) : (
                      filteredRules.map((rule) => (
                        <Card key={rule.id}>
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <div>
                                <CardTitle className="text-lg">
                                  {rule.name}
                                </CardTitle>
                                <CardDescription>
                                  {rule.description || "No description"}
                                </CardDescription>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant={getSeverityColor(rule.severity)}
                                >
                                  {rule.severity}
                                </Badge>
                                <Badge
                                  variant={
                                    rule.enabled ? "default" : "secondary"
                                  }
                                >
                                  {rule.enabled ? "Enabled" : "Disabled"}
                                </Badge>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="flex items-center justify-between">
                              <div className="text-sm text-gray-500">
                                <p>Type: {rule.type.replace("_", " ")}</p>
                                <p>Server: {rule.server.name}</p>
                                <p>
                                  Threshold: {rule.threshold} (
                                  {rule.operator
                                    .replace("_", " ")
                                    .toLowerCase()}
                                  )
                                </p>
                                {rule._count && (
                                  <p>Active Alerts: {rule._count.alerts}</p>
                                )}
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    navigate(`/alerts/rules/${rule.id}/edit`)
                                  }
                                >
                                  Edit
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    navigate(`/alerts/rules/${rule.id}`)
                                  }
                                >
                                  View
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </main>
        </PremiumPageWrapper>
      </div>
    </SidebarProvider>
  );
};

export default AlertDashboard;
