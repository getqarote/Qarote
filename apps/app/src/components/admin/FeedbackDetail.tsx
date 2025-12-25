import React, { useEffect, useState } from "react";

import { format } from "date-fns";
import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  Clock,
  ExternalLink,
  Globe,
  MessageSquare,
  Monitor,
  Save,
  Smartphone,
  Trash2,
  User,
  X,
} from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

import {
  useDeleteFeedback,
  useFeedbackById,
  useUpdateFeedback,
} from "@/hooks/queries/useFeedback";

import type { Feedback } from "@/types/feedback";

import logger from "../../lib/logger";

interface FeedbackDetailProps {
  feedbackId: string;
  onClose: () => void;
}

function InfoItem({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
      <Icon className="w-5 h-5 text-gray-600 mt-0.5" />
      <div className="space-y-1">
        <p className="text-sm font-medium text-gray-700">{label}</p>
        <div className="text-sm text-gray-600">{value}</div>
      </div>
    </div>
  );
}

export function FeedbackDetail({ feedbackId, onClose }: FeedbackDetailProps) {
  const [response, setResponse] = useState("");
  const [status, setStatus] = useState<Feedback["status"]>("OPEN");

  const {
    data: feedbackData,
    isLoading: loading,
    error: queryError,
    refetch,
  } = useFeedbackById(feedbackId);

  const updateFeedbackMutation = useUpdateFeedback();
  const deleteFeedbackMutation = useDeleteFeedback();

  const feedback = feedbackData?.feedback || null;
  const error = queryError
    ? queryError instanceof Error
      ? queryError.message
      : "Failed to load feedback"
    : null;

  // Update local state when feedback data changes
  useEffect(() => {
    if (feedback) {
      setStatus(feedback.status);
      setResponse(feedback.response || "");
    }
  }, [feedback]);

  // Handle update success/error
  useEffect(() => {
    if (updateFeedbackMutation.isSuccess) {
      refetch();
    }
    if (updateFeedbackMutation.isError) {
      logger.error("Failed to update feedback:", updateFeedbackMutation.error);
    }
  }, [
    updateFeedbackMutation.isSuccess,
    updateFeedbackMutation.isError,
    updateFeedbackMutation.error,
    refetch,
  ]);

  // Handle delete success/error
  useEffect(() => {
    if (deleteFeedbackMutation.isSuccess) {
      onClose();
    }
    if (deleteFeedbackMutation.isError) {
      logger.error("Failed to delete feedback:", deleteFeedbackMutation.error);
    }
  }, [
    deleteFeedbackMutation.isSuccess,
    deleteFeedbackMutation.isError,
    deleteFeedbackMutation.error,
    onClose,
  ]);

  const handleUpdate = async () => {
    if (!feedback) return;

    updateFeedbackMutation.mutate({
      id: feedback.id,
      status,
      response: response.trim() || undefined,
    });
  };

  const handleDelete = async () => {
    if (!feedback) return;

    if (
      !confirm(
        "Are you sure you want to delete this feedback? This action cannot be undone."
      )
    ) {
      return;
    }

    deleteFeedbackMutation.mutate({ id: feedback.id });
  };

  const statusColors = {
    OPEN: { bg: "bg-red-100", text: "text-red-800", border: "border-red-200" },
    IN_PROGRESS: {
      bg: "bg-yellow-100",
      text: "text-yellow-800",
      border: "border-yellow-200",
    },
    RESOLVED: {
      bg: "bg-green-100",
      text: "text-green-800",
      border: "border-green-200",
    },
    CLOSED: {
      bg: "bg-gray-100",
      text: "text-gray-800",
      border: "border-gray-200",
    },
  };

  const typeColors = {
    BUG: { bg: "bg-red-100", text: "text-red-800", border: "border-red-200" },
    FEATURE: {
      bg: "bg-blue-100",
      text: "text-blue-800",
      border: "border-blue-200",
    },
    IMPROVEMENT: {
      bg: "bg-purple-100",
      text: "text-purple-800",
      border: "border-purple-200",
    },
    GENERAL: {
      bg: "bg-gray-100",
      text: "text-gray-800",
      border: "border-gray-200",
    },
  };

  const priorityColors = {
    HIGH: { bg: "bg-red-100", text: "text-red-800", border: "border-red-200" },
    MEDIUM: {
      bg: "bg-yellow-100",
      text: "text-yellow-800",
      border: "border-yellow-200",
    },
    LOW: {
      bg: "bg-green-100",
      text: "text-green-800",
      border: "border-green-200",
    },
  };

  if (loading) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader className="space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-10 w-10" />
          </div>
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent className="space-y-6">
          <Skeleton className="h-32 w-full" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>
              Failed to load feedback details: {error}
            </AlertDescription>
          </Alert>
          <div className="mt-4 flex gap-2">
            <Button onClick={() => refetch()} variant="outline">
              Try Again
            </Button>
            <Button onClick={onClose} variant="ghost">
              Close
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!feedback) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="p-6 text-center">
          <p className="text-gray-500">Feedback not found</p>
          <Button onClick={onClose} variant="outline" className="mt-4">
            Close
          </Button>
        </CardContent>
      </Card>
    );
  }

  const hasChanges =
    status !== feedback.status || response !== (feedback.response || "");

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-2xl">{feedback.title}</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="ml-auto"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={`${typeColors[feedback.type].bg} ${
                  typeColors[feedback.type].text
                } ${typeColors[feedback.type].border}`}
              >
                {feedback.type}
              </Badge>
              <Badge
                variant="outline"
                className={`${statusColors[feedback.status].bg} ${
                  statusColors[feedback.status].text
                } ${statusColors[feedback.status].border}`}
              >
                {feedback.status.replace("_", " ")}
              </Badge>
              <Badge
                variant="outline"
                className={`${priorityColors[feedback.priority].bg} ${
                  priorityColors[feedback.priority].text
                } ${priorityColors[feedback.priority].border}`}
              >
                {feedback.priority} Priority
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Description */}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Description</h3>
          <Card>
            <CardContent className="p-4">
              <p className="text-gray-700 whitespace-pre-wrap">
                {feedback.description}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Metadata */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoItem
              label="Submitted by"
              value={feedback.email || "Anonymous user"}
              icon={User}
            />
            <InfoItem
              label="Created"
              value={format(new Date(feedback.createdAt), "PPP 'at' p")}
              icon={Calendar}
            />
            <InfoItem
              label="Category"
              value={feedback.category.replace(/_/g, " ")}
              icon={MessageSquare}
            />
            {feedback.updatedAt !== feedback.createdAt && (
              <InfoItem
                label="Last updated"
                value={format(new Date(feedback.updatedAt), "PPP 'at' p")}
                icon={Clock}
              />
            )}
          </div>

          {/* Technical Metadata */}
          {feedback.metadata && (
            <div className="space-y-3">
              <h4 className="font-medium">Technical Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {feedback.metadata.url && (
                  <InfoItem
                    label="Page URL"
                    value={
                      <a
                        href={feedback.metadata.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                      >
                        {feedback.metadata.url}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    }
                    icon={Globe}
                  />
                )}
                {feedback.metadata.userAgent && (
                  <InfoItem
                    label="Browser"
                    value={feedback.metadata.userAgent}
                    icon={Monitor}
                  />
                )}
                {feedback.metadata.viewport && (
                  <InfoItem
                    label="Viewport"
                    value={feedback.metadata.viewport}
                    icon={Smartphone}
                  />
                )}
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Admin Response Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Admin Response</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select
                value={status}
                onValueChange={(value) =>
                  setStatus(value as Feedback["status"])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OPEN">Open</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="RESOLVED">Resolved</SelectItem>
                  <SelectItem value="CLOSED">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Response</label>
            <Textarea
              placeholder="Add your response to this feedback..."
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              rows={4}
            />
          </div>

          {feedback.response &&
            feedback.respondedBy &&
            feedback.respondedAt && (
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-blue-800">
                      <CheckCircle className="w-4 h-4" />
                      <span>Responded by {feedback.respondedBy}</span>
                      <span>•</span>
                      <span>
                        {format(new Date(feedback.respondedAt), "PPP 'at' p")}
                      </span>
                    </div>
                    <p className="text-blue-700">{feedback.response}</p>
                  </div>
                </CardContent>
              </Card>
            )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteFeedbackMutation.isPending}
            className="flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            {deleteFeedbackMutation.isPending ? "Deleting..." : "Delete"}
          </Button>

          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={!hasChanges || updateFeedbackMutation.isPending}
              className="flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {updateFeedbackMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
