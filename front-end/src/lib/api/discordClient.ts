/**
 * Discord API Client
 * Handles Discord community integration
 */

import { BaseApiClient } from "./baseClient";

export interface DiscordJoinResponse {
  success: boolean;
  discordJoined: boolean;
  discordJoinedAt: string | null;
}

export interface DiscordStatusResponse {
  discordJoined: boolean;
  discordJoinedAt: string | null;
}

export class DiscordApiClient extends BaseApiClient {
  /**
   * Mark user as having joined Discord
   */
  async markJoined(): Promise<DiscordJoinResponse> {
    return this.request<DiscordJoinResponse>("/discord/join", {
      method: "POST",
    });
  }

  /**
   * Get user's Discord join status
   */
  async getStatus(): Promise<DiscordStatusResponse> {
    return this.request<DiscordStatusResponse>("/discord/status", {
      method: "GET",
    });
  }
}
