/**
 * Discourse SSO Client for RabbitHQ Frontend
 * Handles client-side SSO operations using the main API client
 */

import { logger } from "@/lib/logger";

import { apiClient } from "./api/client";
import type { DiscourseUser } from "./api/discourseClient";

export { type DiscourseUser };

export class DiscourseSSOClient {
  private discourseUrl: string;

  constructor() {
    this.discourseUrl = import.meta.env.VITE_DISCOURSE_URL;
  }

  /**
   * Redirect user to Discourse with SSO
   * According to DiscourseConnect protocol, we redirect to Discourse's SSO endpoint
   */
  async redirectToDiscourse(_user: DiscourseUser): Promise<void> {
    try {
      // Redirect to Discourse's SSO endpoint
      // Discourse will then redirect back to our /discourse/sso page with SSO parameters
      window.location.href = `${this.discourseUrl}/session/sso`;
    } catch (error) {
      logger.error("Error redirecting to Discourse:", error);
      // Fallback: redirect without SSO
      window.open(this.discourseUrl, "_blank");
    }
  }

  /**
   * Open Discourse in new tab
   */
  openDiscourse(): void {
    window.open(this.discourseUrl, "_blank");
  }

  /**
   * Get Discourse embed iframe URL
   */
  async getEmbedUrl(topicId?: string, categoryId?: string): Promise<string> {
    try {
      const response = await apiClient.getDiscourseEmbedUrl(
        topicId,
        categoryId
      );
      return response.embedUrl;
    } catch (error) {
      logger.error("Error getting embed URL:", error);
      // Fallback: return basic embed URL
      let url = `${this.discourseUrl}/embed`;

      if (topicId) {
        url += `?topic=${topicId}`;
      } else if (categoryId) {
        url += `?category=${categoryId}`;
      }

      return url;
    }
  }

  /**
   * Get Discourse topic URL
   */
  getTopicUrl(slug: string, topicId: number): string {
    return `${this.discourseUrl}/t/${slug}/${topicId}`;
  }

  /**
   * Get Discourse category URL
   */
  getCategoryUrl(categorySlug: string): string {
    return `${this.discourseUrl}/c/${categorySlug}`;
  }

  /**
   * Check if user is authenticated
   */
  async checkAuth(): Promise<boolean> {
    try {
      return await apiClient.checkDiscourseAuth();
    } catch {
      return false;
    }
  }

  /**
   * Get community statistics
   */
  async getStats() {
    try {
      return await apiClient.getDiscourseStats();
    } catch (error) {
      logger.error("Error getting community stats:", error);
      return null;
    }
  }

  /**
   * Get recent topics
   */
  async getTopics(limit: number = 5) {
    try {
      return await apiClient.getDiscourseTopics(limit);
    } catch (error) {
      logger.error("Error getting recent topics:", error);
      return { topics: [] };
    }
  }

  /**
   * Get Discourse info
   */
  async getInfo() {
    try {
      return await apiClient.getDiscourseInfo();
    } catch (error) {
      logger.error("Error getting Discourse info:", error);
      return {
        discourseUrl: this.discourseUrl,
        ssoEnabled: false,
        embedEnabled: false,
      };
    }
  }
}
