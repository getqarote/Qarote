/**
 * Discourse SSO Integration for RabbitHQ
 * Handles Single Sign-On between RabbitHQ and Discourse community
 */

import crypto from "crypto";

import { logger } from "@/core/logger";

export interface DiscourseUser {
  id: string;
  email: string;
  name: string;
  username: string;
  avatar_url?: string;
}

export interface DiscourseSSOPayload {
  nonce: string;
  email: string;
  name: string;
  username: string;
  external_id: string;
  avatar_url?: string;
  admin?: boolean;
  moderator?: boolean;
  return_sso_url?: string; // Added for incoming SSO requests
}

export class DiscourseSSO {
  private ssoSecret: string;
  private discourseUrl: string;

  constructor(ssoSecret: string, discourseUrl: string) {
    this.ssoSecret = ssoSecret;
    this.discourseUrl = discourseUrl;
  }

  /**
   * Generate SSO URL for redirecting user to Discourse
   */
  // generateSSOUrl(user: DiscourseUser, nonce?: string): string {
  //   const payload: DiscourseSSOPayload = {
  //     nonce: nonce || this.generateNonce(),
  //     email: user.email,
  //     name: user.name,
  //     username: user.username,
  //     external_id: user.id,
  //     avatar_url: user.avatar_url,
  //   };

  //   // Encode payload as base64
  //   const payloadString = Buffer.from(JSON.stringify(payload)).toString(
  //     "base64"
  //   );

  //   // Generate HMAC signature
  //   const signature = crypto
  //     .createHmac("sha256", this.ssoSecret)
  //     .update(payloadString)
  //     .digest("hex");

  //   // Build SSO URL
  //   const ssoUrl = `${this.discourseUrl}/session/sso_provider?sso=${payloadString}&sig=${signature}`;
  //   logger.info({ ssoUrl }, "SSO URL");
  //   return ssoUrl;
  // }

  /**
   * Verify SSO callback from Discourse
   */
  verifySSOCallback(sso: string, sig: string): DiscourseSSOPayload | null {
    try {
      // Verify signature
      const expectedSig = crypto
        .createHmac("sha256", this.ssoSecret)
        .update(sso)
        .digest("hex");

      if (expectedSig !== sig) {
        logger.error("Invalid SSO signature");
        return null;
      }

      const payloadString = Buffer.from(sso, "base64").toString("utf-8");

      // Parse query string to extract nonce and return_sso_url
      const urlParams = new URLSearchParams(payloadString);
      const nonce = urlParams.get("nonce");
      const returnSsoUrl = urlParams.get("return_sso_url");

      if (!nonce) {
        logger.error("No nonce found in SSO payload");
        return null;
      }

      const payload: DiscourseSSOPayload = {
        nonce: nonce,
        email: "", // Will be filled by our response
        name: "", // Will be filled by our response
        username: "", // Will be filled by our response
        external_id: "", // Will be filled by our response
        return_sso_url: returnSsoUrl || "",
      };

      return payload;
    } catch (error) {
      logger.error({ error }, "Error verifying SSO callback");
      return null;
    }
  }

  /**
   * Generate random nonce for SSO
   */
  private generateNonce(): string {
    return crypto.randomBytes(16).toString("hex");
  }

  /**
   * Get Discourse API URL for a specific endpoint
   */
  getApiUrl(endpoint: string): string {
    return `${this.discourseUrl}/api/${endpoint}`;
  }

  /**
   * Generate response URL for DiscourseConnect callback
   * This creates the response payload and redirects back to Discourse
   */
  generateResponseUrl(userData: DiscourseSSOPayload): string {
    // Create the response payload as URL-encoded query string (not JSON)
    const responseParams = new URLSearchParams();
    responseParams.set("nonce", userData.nonce);
    responseParams.set("email", userData.email);
    responseParams.set("name", userData.name);
    responseParams.set("username", userData.username);
    responseParams.set("external_id", userData.external_id);

    if (userData.avatar_url) {
      responseParams.set("avatar_url", userData.avatar_url);
    }
    if (userData.admin !== undefined) {
      responseParams.set("admin", userData.admin.toString());
    }
    if (userData.moderator !== undefined) {
      responseParams.set("moderator", userData.moderator.toString());
    }

    // Encode payload as base64
    const payloadString = Buffer.from(responseParams.toString()).toString(
      "base64"
    );

    logger.debug("Response query string: %s", responseParams.toString());
    logger.debug("Response payload (base64): %s", payloadString);

    // Generate HMAC signature
    const signature = crypto
      .createHmac("sha256", this.ssoSecret)
      .update(payloadString)
      .digest("hex");

    logger.debug("Return SSO URL: %s", userData.return_sso_url);
    logger.debug("Discourse URL: %s", this.discourseUrl);

    // Use the return_sso_url from the original request, or fallback to default
    const returnUrl = `${this.discourseUrl}/session/sso_login`;

    const finalUrl = `${returnUrl}?sso=${payloadString}&sig=${signature}`;
    logger.info(`Final redirect URL: ${finalUrl}`);

    // Build response URL for Discourse
    return finalUrl;
  }

  /**
   * Get Discourse embed URL for widgets
   */
  getEmbedUrl(topicId?: string, categoryId?: string): string {
    let url = `${this.discourseUrl}/embed`;

    if (topicId) {
      url += `?topic=${topicId}`;
    } else if (categoryId) {
      url += `?category=${categoryId}`;
    }

    return url;
  }
}
