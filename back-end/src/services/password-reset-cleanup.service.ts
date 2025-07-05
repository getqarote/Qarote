import { prisma } from "@/core/prisma";
import { logger } from "@/core/logger";

export class PasswordResetCleanupService {
  /**
   * Clean up expired password reset tokens
   * Should be called periodically (e.g., via cron job)
   */
  static async cleanupExpiredTokens(): Promise<void> {
    try {
      const result = await prisma.passwordReset.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: new Date() } }, // Expired tokens
            { used: true }, // Already used tokens older than 1 day
          ],
        },
      });

      if (result.count > 0) {
        logger.info(
          { deletedCount: result.count },
          "Cleaned up expired password reset tokens"
        );
      }
    } catch (error) {
      logger.error(
        { error },
        "Failed to clean up expired password reset tokens"
      );
    }
  }

  /**
   * Get statistics about password reset tokens
   */
  static async getTokenStats(): Promise<{
    total: number;
    expired: number;
    used: number;
    pending: number;
  }> {
    const now = new Date();

    const [total, expired, used, pending] = await Promise.all([
      prisma.passwordReset.count(),
      prisma.passwordReset.count({
        where: { expiresAt: { lt: now } },
      }),
      prisma.passwordReset.count({
        where: { used: true },
      }),
      prisma.passwordReset.count({
        where: {
          used: false,
          expiresAt: { gte: now },
        },
      }),
    ]);

    return { total, expired, used, pending };
  }
}

export const passwordResetCleanupService = PasswordResetCleanupService;
