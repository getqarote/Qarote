import { useState, useEffect, useCallback } from "react";
import logger from "../../lib/logger";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  X,
  Globe,
  Monitor,
  Smartphone,
  AlertTriangle,
  CheckCircle,
  Clock,
  MessageSquare,
  Trash2,
  Save,
  User,
  Calendar,
  ExternalLink,
} from "lucide-react";
import { apiClient } from "@/lib/api/client";
import type { Feedback } from "@/types/feedback";
import { format } from "date-fns";

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
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState("");
  const [status, setStatus] = useState<Feedback["status"]>("OPEN");

  const loadFeedback = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getFeedbackById(feedbackId);
      setFeedback(data.feedback);
      setStatus(data.feedback.status);
      setResponse(data.feedback.response || "");
    } catch (err) {
      logger.error("Failed to load feedback:", err);
      setError(err instanceof Error ? err.message : "Failed to load feedback");
    } finally {
      setLoading(false);
    }
  }, [feedbackId]);

  useEffect(() => {
    loadFeedback();
  }, [loadFeedback]);

  const handleUpdate = async () => {
    if (!feedback) return;

    try {
      setUpdating(true);
      await apiClient.updateFeedback(feedback.id, {
        status,
        response: response.trim() || undefined,
      });

      // Reload feedback to get updated data
      await loadFeedback();
    } catch (err) {
      logger.error("Failed to update feedback:", err);
      setError(
        err instanceof Error ? err.message : "Failed to update feedback"
      );
    } finally {
      setUpdating(false);
    }
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

    try {
      setDeleting(true);
      await apiClient.deleteFeedback(feedback.id);
      onClose();
    } catch (err) {
      logger.error("Failed to delete feedback:", err);
      setError(
        err instanceof Error ? err.message : "Failed to delete feedback"
      );
    } finally {
      setDeleting(false);
    }
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
            <Button onClick={loadFeedback} variant="outline">
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
            disabled={deleting}
            className="flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            {deleting ? "Deleting..." : "Delete"}
          </Button>

          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={!hasChanges || updating}
              className="flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {updating ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
