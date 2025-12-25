import {
  AlertTriangle,
  CheckCircle,
  Clock,
  MessageSquare,
  RefreshCw,
  TrendingUp,
} from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { useFeedbackStats } from "@/hooks/queries/useFeedback";

interface StatsCardProps {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color?: string;
}

function StatsCard({
  title,
  value,
  icon: Icon,
  color = "text-blue-600",
}: StatsCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-3xl font-bold">{value}</p>
          </div>
          <Icon className={`w-8 h-8 ${color}`} />
        </div>
      </CardContent>
    </Card>
  );
}

interface CategoryStatsProps {
  title: string;
  data: Record<string, number>;
  colorMap: Record<string, string>;
}

function CategoryStats({ title, data, colorMap }: CategoryStatsProps) {
  const total = Object.values(data).reduce((sum, count) => sum + count, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {Object.entries(data).map(([key, count]) => {
          const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
          return (
            <div key={key} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={colorMap[key] || ""}>
                    {key.replace(/_/g, " ")}
                  </Badge>
                  <span className="text-sm text-gray-600">{count}</span>
                </div>
                <span className="text-sm text-gray-500">{percentage}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export function FeedbackStats() {
  const {
    data: statsData,
    isLoading: loading,
    error: queryError,
    refetch,
  } = useFeedbackStats();

  const stats = statsData?.stats || null;
  const error = queryError
    ? queryError instanceof Error
      ? queryError.message
      : "Failed to load statistics"
    : null;

  const statusColorMap = {
    OPEN: "text-red-600 border-red-200",
    IN_PROGRESS: "text-yellow-600 border-yellow-200",
    RESOLVED: "text-green-600 border-green-200",
    CLOSED: "text-gray-600 border-gray-200",
  };

  const typeColorMap = {
    BUG: "text-red-600 border-red-200",
    FEATURE: "text-blue-600 border-blue-200",
    IMPROVEMENT: "text-purple-600 border-purple-200",
    GENERAL: "text-gray-600 border-gray-200",
  };

  const priorityColorMap = {
    HIGH: "text-red-600 border-red-200",
    MEDIUM: "text-yellow-600 border-yellow-200",
    LOW: "text-green-600 border-green-200",
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Feedback Statistics</h2>
            <p className="text-gray-600">
              Overview of all feedback submissions
            </p>
          </div>
          <Skeleton className="h-10 w-24" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-40 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Feedback Statistics</h2>
            <p className="text-gray-600">
              Overview of all feedback submissions
            </p>
          </div>
          <Button onClick={() => refetch()} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>

        <Alert variant="destructive">
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>
            Failed to load feedback statistics: {error}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Feedback Statistics</h2>
            <p className="text-gray-600">
              Overview of all feedback submissions
            </p>
          </div>
          <Button onClick={() => refetch()} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-gray-500">No feedback data available</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Feedback Statistics</h2>
          <p className="text-gray-600">Overview of all feedback submissions</p>
        </div>
        <Button onClick={loadStats} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Feedback"
          value={stats.total}
          icon={MessageSquare}
          color="text-blue-600"
        />
        <StatsCard
          title="Open Items"
          value={stats.byStatus.OPEN || 0}
          icon={Clock}
          color="text-red-600"
        />
        <StatsCard
          title="In Progress"
          value={stats.byStatus.IN_PROGRESS || 0}
          icon={TrendingUp}
          color="text-yellow-600"
        />
        <StatsCard
          title="Resolved"
          value={stats.byStatus.RESOLVED + stats.byStatus.CLOSED || 0}
          icon={CheckCircle}
          color="text-green-600"
        />
      </div>

      {/* Detailed Breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <CategoryStats
          title="By Status"
          data={stats.byStatus}
          colorMap={statusColorMap}
        />
        <CategoryStats
          title="By Type"
          data={stats.byType}
          colorMap={typeColorMap}
        />
        <CategoryStats
          title="By Priority"
          data={stats.byPriority}
          colorMap={priorityColorMap}
        />
      </div>
    </div>
  );
}
