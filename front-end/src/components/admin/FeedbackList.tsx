import { useState, useEffect, useCallback } from "react";
import logger from "../../lib/logger";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Search,
  Filter,
  RefreshCw,
  Eye,
  AlertTriangle,
  MessageSquare,
} from "lucide-react";
import { apiClient } from "@/lib/api/client";
import type { Feedback } from "@/types/feedback";
import type {
  FeedbackFilters,
  FeedbackListResponse,
} from "@/lib/api/feedbackClient";
import { format } from "date-fns";

interface FeedbackListProps {
  onSelectFeedback: (id: string) => void;
  selectedFeedbackId: string | null;
}

function FeedbackRow({
  feedback,
  isSelected,
  onSelect,
}: {
  feedback: Feedback;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const statusColors = {
    OPEN: "bg-red-100 text-red-800 border-red-200",
    IN_PROGRESS: "bg-yellow-100 text-yellow-800 border-yellow-200",
    RESOLVED: "bg-green-100 text-green-800 border-green-200",
    CLOSED: "bg-gray-100 text-gray-800 border-gray-200",
  };

  const typeColors = {
    BUG: "bg-red-100 text-red-800 border-red-200",
    FEATURE: "bg-blue-100 text-blue-800 border-blue-200",
    IMPROVEMENT: "bg-purple-100 text-purple-800 border-purple-200",
    GENERAL: "bg-gray-100 text-gray-800 border-gray-200",
  };

  const priorityColors = {
    HIGH: "bg-red-100 text-red-800 border-red-200",
    MEDIUM: "bg-yellow-100 text-yellow-800 border-yellow-200",
    LOW: "bg-green-100 text-green-800 border-green-200",
  };

  return (
    <TableRow
      className={`cursor-pointer hover:bg-gray-50 ${
        isSelected ? "bg-blue-50 border-blue-200" : ""
      }`}
      onClick={onSelect}
    >
      <TableCell className="font-medium">
        <div className="space-y-1">
          <div className="font-medium text-sm">{feedback.title}</div>
          <div className="text-xs text-gray-500 truncate max-w-[200px]">
            {feedback.description}
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant="outline" className={typeColors[feedback.type]}>
          {feedback.type}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge variant="outline" className={statusColors[feedback.status]}>
          {feedback.status.replace("_", " ")}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge variant="outline" className={priorityColors[feedback.priority]}>
          {feedback.priority}
        </Badge>
      </TableCell>
      <TableCell className="text-sm text-gray-600">
        {feedback.email || "Anonymous"}
      </TableCell>
      <TableCell className="text-sm text-gray-600">
        {format(new Date(feedback.createdAt), "MMM d, yyyy")}
      </TableCell>
      <TableCell>
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
        >
          <Eye className="w-4 h-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
}

export function FeedbackList({
  onSelectFeedback,
  selectedFeedbackId,
}: FeedbackListProps) {
  const [feedbackData, setFeedbackData] = useState<FeedbackListResponse | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FeedbackFilters>({
    page: 1,
    limit: 10,
  });
  const [searchTerm, setSearchTerm] = useState("");

  const loadFeedback = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.getFeedback(filters);
      setFeedbackData(response);
    } catch (err) {
      logger.error("Failed to load feedback:", err);
      setError(err instanceof Error ? err.message : "Failed to load feedback");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadFeedback();
  }, [loadFeedback]);

  const handleFilterChange = (
    key: keyof FeedbackFilters,
    value: string | number | undefined
  ) => {
    setFilters((prev) => {
      const newPage =
        key !== "page" ? 1 : typeof value === "number" ? value : 1;
      return {
        ...prev,
        [key]: value || undefined,
        page: newPage,
      };
    });
  };

  const handleSearch = () => {
    // In a real implementation, you might want to add search functionality to the API
    // For now, we'll just refresh the data
    loadFeedback();
  };

  const totalPages = feedbackData?.pagination.pages || 0;
  const currentPage = feedbackData?.pagination.page || 1;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Feedback Management</h2>
            <p className="text-gray-600">Review and manage user feedback</p>
          </div>
          <Skeleton className="h-10 w-24" />
        </div>

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Feedback Management</h2>
            <p className="text-gray-600">Review and manage user feedback</p>
          </div>
          <Button onClick={loadFeedback} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>

        <Alert variant="destructive">
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>Failed to load feedback: {error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Feedback Management</h2>
          <p className="text-gray-600">Review and manage user feedback</p>
        </div>
        <Button onClick={loadFeedback} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="flex gap-2">
                <Input
                  placeholder="Search feedback..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
                <Button onClick={handleSearch} size="sm">
                  <Search className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select
                value={filters.status || "all"}
                onValueChange={(value) =>
                  handleFilterChange(
                    "status",
                    value === "all" ? undefined : value
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="OPEN">Open</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="RESOLVED">Resolved</SelectItem>
                  <SelectItem value="CLOSED">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Type</label>
              <Select
                value={filters.type || "all"}
                onValueChange={(value) =>
                  handleFilterChange(
                    "type",
                    value === "all" ? undefined : value
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="BUG">Bug</SelectItem>
                  <SelectItem value="FEATURE">Feature</SelectItem>
                  <SelectItem value="IMPROVEMENT">Improvement</SelectItem>
                  <SelectItem value="GENERAL">General</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Priority</label>
              <Select
                value={filters.priority || "all"}
                onValueChange={(value) =>
                  handleFilterChange(
                    "priority",
                    value === "all" ? undefined : value
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="LOW">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feedback Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Feedback Items
            </CardTitle>
            <div className="text-sm text-gray-600">
              {feedbackData?.pagination.total || 0} items total
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!feedbackData?.feedback.length ? (
            <div className="text-center py-8">
              <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No feedback items found</p>
              <p className="text-sm text-gray-400 mt-1">
                Try adjusting your filters or check back later
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Feedback</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {feedbackData.feedback.map((feedback) => (
                    <FeedbackRow
                      key={feedback.id}
                      feedback={feedback}
                      isSelected={selectedFeedbackId === feedback.id}
                      onSelect={() => onSelectFeedback(feedback.id)}
                    />
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-6 flex justify-center">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() =>
                            handleFilterChange(
                              "page",
                              Math.max(1, currentPage - 1)
                            )
                          }
                          className={
                            currentPage <= 1
                              ? "pointer-events-none opacity-50"
                              : "cursor-pointer"
                          }
                        />
                      </PaginationItem>

                      {[...Array(Math.min(5, totalPages))].map((_, i) => {
                        const page = i + 1;
                        return (
                          <PaginationItem key={page}>
                            <PaginationLink
                              onClick={() => handleFilterChange("page", page)}
                              isActive={currentPage === page}
                              className="cursor-pointer"
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      })}

                      {totalPages > 5 && (
                        <PaginationItem>
                          <PaginationEllipsis />
                        </PaginationItem>
                      )}

                      <PaginationItem>
                        <PaginationNext
                          onClick={() =>
                            handleFilterChange(
                              "page",
                              Math.min(totalPages, currentPage + 1)
                            )
                          }
                          className={
                            currentPage >= totalPages
                              ? "pointer-events-none opacity-50"
                              : "cursor-pointer"
                          }
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
