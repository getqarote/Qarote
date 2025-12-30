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
