import { logger } from "@/core/logger";

interface AuditEvent {
  action: string;
  userId?: string;
  email?: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
  details?: Record<string, unknown>;
}

class AuditService {
  /**
   * Log password-related security events
   */
  static async logPasswordEvent(
    event: Omit<AuditEvent, "timestamp">
  ): Promise<void> {
    const auditEvent: AuditEvent = {
      ...event,
      timestamp: new Date(),
    };

    // Log to structured logger for audit trail
    logger.info(
      {
        audit: true,
        action: auditEvent.action,
        userId: auditEvent.userId,
        email: auditEvent.email,
        ipAddress: auditEvent.ipAddress,
        userAgent: auditEvent.userAgent,
        details: auditEvent.details,
      },
      `[AUDIT] ${auditEvent.action}`
    );

    // In production, you might also want to:
    // 1. Store in a separate audit database
    // 2. Send to a SIEM system
    // 3. Create alerts for suspicious patterns
  }

  /**
   * Log password reset request
   */
  static async logPasswordResetRequest(
    email: string,
    ipAddress?: string,
    userAgent?: string,
    success: boolean = true
  ): Promise<void> {
    await this.logPasswordEvent({
      action: success
        ? "password_reset_requested"
        : "password_reset_request_failed",
      email,
      ipAddress,
      userAgent,
      details: { success },
    });
  }

  /**
   * Log password reset completion
   */
  static async logPasswordResetCompleted(
    userId: string,
    email: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.logPasswordEvent({
      action: "password_reset_completed",
      userId,
      email,
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log password change
   */
  static async logPasswordChange(
    userId: string,
    email: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.logPasswordEvent({
      action: "password_changed",
      userId,
      email,
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log failed password reset attempts
   */
  static async logPasswordResetFailed(
    token: string,
    reason: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.logPasswordEvent({
      action: "password_reset_failed",
      ipAddress,
      userAgent,
      details: {
        tokenPrefix: token.substring(0, 8) + "...", // Don't log full token
        reason,
      },
    });
  }
}

export const auditService = AuditService;
