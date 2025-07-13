import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  AlertCircle,
  Clock,
  Database,
  Search,
  Filter,
  ArrowUpDown,
  Crown,
} from "lucide-react";
import {
  useMessageHistory,
  useMessageHistoryAccess,
  useMessageHistoryStats,
} from "@/hooks/useMessageHistory";
import {
  MessageList,
  formatPayload,
  getPayloadType,
} from "@/components/BrowseMessagesComponent";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface MessageHistoryTabProps {
  serverId: string;
  selectedQueue: string;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  expandedMessages: Set<number>;
  onToggleExpanded: (index: number) => void;
}

export function MessageHistoryTab({
  serverId,
  selectedQueue,
  searchTerm,
  setSearchTerm,
  expandedMessages,
  onToggleExpanded,
}: MessageHistoryTabProps) {
  // Search state
  const [historySearchTerm, setHistorySearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [routingKey, setRoutingKey] = useState("");
  const [exchange, setExchange] = useState("");
  const [sortBy, setSortBy] = useState<
    "timestamp" | "queue_name" | "routing_key" | "exchange"
  >("timestamp");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [limit, setLimit] = useState(50);
  const [offset, setOffset] = useState(0);

  // Check access
  const { data: accessData, isLoading: isCheckingAccess } =
    useMessageHistoryAccess(serverId);

  // Fetch message history
  const {
    data: historyData,
    isLoading: isLoadingHistory,
    error: historyError,
  } = useMessageHistory({
    serverId,
    queueName: selectedQueue !== "all" ? selectedQueue : undefined,
    content: historySearchTerm || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    routingKey: routingKey || undefined,
    exchange: exchange || undefined,
    sortBy,
    sortOrder,
    limit,
    offset,
  });

  // Fetch stats
  const { data: statsData } = useMessageHistoryStats(
    serverId,
    selectedQueue !== "all" ? selectedQueue : undefined,
    7
  );

  const canAccessHistory = accessData?.canAccessMessageHistory || false;
  const planLimits = accessData?.planLimits || historyData?.planLimits;

  // Convert historical messages to display format
  const displayMessages = useMemo(() => {
    if (!historyData?.messages) return [];

    return historyData.messages.map((msg) => ({
      payload: msg.payload,
      properties: msg.properties || {},
      routing_key: msg.routingKey || "",
      exchange: msg.exchangeName || "",
      message_count: 0, // Historical messages don't have live count
      redelivered: msg.redelivered,
      timestamp: msg.capturedAt,
      payloadSize: msg.payloadSize,
      contentType: msg.contentType,
    }));
  }, [historyData?.messages]);

  const handleSearch = () => {
    setOffset(0); // Reset pagination when searching
  };

  const handleClearFilters = () => {
    setHistorySearchTerm("");
    setStartDate("");
    setEndDate("");
    setRoutingKey("");
    setExchange("");
    setOffset(0);
  };

  const handlePreviousPage = () => {
    setOffset(Math.max(0, offset - limit));
  };

  const handleNextPage = () => {
    if (historyData?.pagination.hasMore) {
      setOffset(offset + limit);
    }
  };

  // Show loading state
  if (isCheckingAccess) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Clock className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600">Checking access permissions...</p>
        </div>
      </div>
    );
  }

  // Show access denied for free users
  if (!canAccessHistory) {
    return (
      <div className="p-6">
        <Alert>
          <Crown className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <div>
              <strong>Message History is a Premium Feature</strong>
              <p className="text-sm text-gray-600 mt-1">
                Upgrade to Developer plan or higher to access historical message
                data with advanced search capabilities.
              </p>
            </div>
            <Button size="sm" className="ml-4">
              Upgrade Plan
            </Button>
          </AlertDescription>
        </Alert>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Database className="h-4 w-4" />
                Historical Storage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-gray-600">
                Store and search through acknowledged messages for compliance
                and debugging.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Search className="h-4 w-4" />
                Advanced Search
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-gray-600">
                Filter by content, date range, routing key, exchange, and more.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Retention Policies
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-gray-600">
                Configure retention periods from 1 day up to 1 year based on
                your plan.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      {statsData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Total Messages
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsData.stats.totalMessages.toLocaleString()}
              </div>
              <p className="text-xs text-gray-600">
                Last {statsData.stats.timeRange.days} days
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Unique Queues
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsData.stats.uniqueQueues}
              </div>
              <p className="text-xs text-gray-600">With captured messages</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Avg Payload Size
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(statsData.stats.avgPayloadSize / 1024).toFixed(1)}KB
              </div>
              <p className="text-xs text-gray-600">Average size</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Plan Storage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {planLimits?.maxMessageHistoryStorage}GB
              </div>
              <p className="text-xs text-gray-600">Max storage limit</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Advanced Search Filters
          </CardTitle>
          <CardDescription>
            Search through historical messages with advanced filtering options
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Content Search */}
            <div className="space-y-2">
              <Label htmlFor="content-search">Content Search</Label>
              <Input
                id="content-search"
                placeholder="Search in message content..."
                value={historySearchTerm}
                onChange={(e) => setHistorySearchTerm(e.target.value)}
                className="w-full"
              />
            </div>

            {/* Routing Key */}
            <div className="space-y-2">
              <Label htmlFor="routing-key">Routing Key</Label>
              <Input
                id="routing-key"
                placeholder="Filter by routing key..."
                value={routingKey}
                onChange={(e) => setRoutingKey(e.target.value)}
              />
            </div>

            {/* Exchange */}
            <div className="space-y-2">
              <Label htmlFor="exchange">Exchange</Label>
              <Input
                id="exchange"
                placeholder="Filter by exchange..."
                value={exchange}
                onChange={(e) => setExchange(e.target.value)}
              />
            </div>

            {/* Start Date */}
            <div className="space-y-2">
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            {/* End Date */}
            <div className="space-y-2">
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            {/* Sort Options */}
            <div className="space-y-2">
              <Label>Sort By</Label>
              <div className="flex gap-2">
                <Select
                  value={sortBy}
                  onValueChange={(
                    value:
                      | "timestamp"
                      | "queue_name"
                      | "routing_key"
                      | "exchange"
                  ) => setSortBy(value)}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="timestamp">Timestamp</SelectItem>
                    <SelectItem value="queue_name">Queue Name</SelectItem>
                    <SelectItem value="routing_key">Routing Key</SelectItem>
                    <SelectItem value="exchange">Exchange</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                  }
                  className="px-3"
                >
                  <ArrowUpDown className="h-4 w-4" />
                  {sortOrder.toUpperCase()}
                </Button>
              </div>
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                onClick={handleSearch}
                className="flex items-center gap-2"
              >
                <Search className="h-4 w-4" />
                Search
              </Button>
              <Button variant="outline" onClick={handleClearFilters}>
                Clear Filters
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Label htmlFor="limit">Messages per page:</Label>
              <Select
                value={limit.toString()}
                onValueChange={(value) => setLimit(parseInt(value))}
              >
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                  <SelectItem value="200">200</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {historyError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Error loading message history: {historyError.message}
          </AlertDescription>
        </Alert>
      )}

      {/* Results */}
      <div className="space-y-4">
        {/* Results Info */}
        {historyData && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Badge variant="secondary">
                {historyData.pagination.total.toLocaleString()} total messages
              </Badge>
              {historyData.pagination.total > 0 && (
                <span className="text-sm text-gray-600">
                  Showing {offset + 1}-
                  {Math.min(offset + limit, historyData.pagination.total)} of{" "}
                  {historyData.pagination.total}
                </span>
              )}
            </div>

            {/* Pagination */}
            {historyData.pagination.total > limit && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePreviousPage}
                  disabled={offset === 0}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={!historyData.pagination.hasMore}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Message List */}
        <MessageList
          filteredMessages={displayMessages}
          isLoadingMessages={isLoadingHistory}
          expandedMessages={expandedMessages}
          onToggleExpanded={onToggleExpanded}
          formatPayload={formatPayload}
          getPayloadType={getPayloadType}
          searchTerm={historySearchTerm}
          selectedQueue={selectedQueue}
          onClearSearch={() => setHistorySearchTerm("")}
        />
      </div>
    </div>
  );
}
