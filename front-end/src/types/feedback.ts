export interface FeedbackRequest {
  type: "BUG" | "FEATURE" | "GENERAL" | "IMPROVEMENT";
  category:
    | "UI_UX"
    | "PERFORMANCE"
    | "SECURITY"
    | "FUNCTIONALITY"
    | "DOCUMENTATION"
    | "OTHER";
  title: string;
  description: string;
  priority: "LOW" | "MEDIUM" | "HIGH";
  email?: string;
  metadata?: {
    url: string;
    userAgent: string;
    viewport: string;
    timestamp: string;
  };
}

export interface Feedback extends FeedbackRequest {
  id: string;
  userId?: string;
  workspaceId?: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  createdAt: string;
  updatedAt: string;
  response?: string;
  respondedBy?: string;
  respondedAt?: string;
}

export interface FeedbackStats {
  total: number;
  byType: Record<FeedbackRequest["type"], number>;
  byStatus: Record<Feedback["status"], number>;
  byPriority: Record<FeedbackRequest["priority"], number>;
}
