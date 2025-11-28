/**
 * Feedback API Client
 * Handles feedback submission and management
 */

import type {
  Feedback,
  FeedbackRequest,
  FeedbackStats,
} from "@/types/feedback";

import { BaseApiClient } from "./baseClient";

export interface FeedbackListResponse {
  feedback: Feedback[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface FeedbackResponse {
  message: string;
  feedback: Feedback;
}

export interface FeedbackStatsResponse {
  stats: FeedbackStats;
}

export interface FeedbackFilters {
  page?: number;
  limit?: number;
  status?: string;
  type?: string;
  priority?: string;
  workspaceId?: string;
}

export interface UpdateFeedbackRequest {
  status?: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  response?: string;
}

export class FeedbackApiClient extends BaseApiClient {
  /**
   * Submit new feedback
   */
  async submitFeedback(
    feedbackData: FeedbackRequest
  ): Promise<FeedbackResponse> {
    return this.request("/feedback", {
      method: "POST",
      body: JSON.stringify(feedbackData),
    });
  }

  /**
   * Get all feedback with pagination and filters (admin only)
   */
  async getFeedback(filters?: FeedbackFilters): Promise<FeedbackListResponse> {
    const searchParams = new URLSearchParams();

    if (filters?.page) searchParams.set("page", filters.page.toString());
    if (filters?.limit) searchParams.set("limit", filters.limit.toString());
    if (filters?.status) searchParams.set("status", filters.status);
    if (filters?.type) searchParams.set("type", filters.type);
    if (filters?.priority) searchParams.set("priority", filters.priority);
    if (filters?.workspaceId)
      searchParams.set("workspaceId", filters.workspaceId);

    const queryString = searchParams.toString();
    const endpoint = queryString ? `/feedback?${queryString}` : "/feedback";

    return this.request(endpoint);
  }

  /**
   * Get specific feedback by ID (admin only)
   */
  async getFeedbackById(id: string): Promise<{ feedback: Feedback }> {
    return this.request(`/feedback/${id}`);
  }

  /**
   * Update feedback status or add response (admin only)
   */
  async updateFeedback(
    id: string,
    data: UpdateFeedbackRequest
  ): Promise<FeedbackResponse> {
    return this.request(`/feedback/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  /**
   * Delete feedback (admin only)
   */
  async deleteFeedback(id: string): Promise<{ message: string }> {
    return this.request(`/feedback/${id}`, {
      method: "DELETE",
    });
  }

  /**
   * Get feedback statistics (admin only)
   */
  async getFeedbackStats(workspaceId?: string): Promise<FeedbackStatsResponse> {
    const searchParams = new URLSearchParams();
    if (workspaceId) searchParams.set("workspaceId", workspaceId);

    const queryString = searchParams.toString();
    const endpoint = queryString
      ? `/feedback/stats/summary?${queryString}`
      : "/feedback/stats/summary";

    return this.request(endpoint);
  }
}
