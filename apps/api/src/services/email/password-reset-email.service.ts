import React from "react";

import { CoreEmailService } from "./core-email.service";
import { PasswordResetEmail } from "./templates/password-reset-email";

import { tEmail } from "@/i18n";

class PasswordResetEmailService {
  /**
   * Send password reset email
   */
  static async sendPasswordResetEmail(
    to: string,
    resetToken: string,
    tokenExpiresAt: Date,
    userName?: string,
    locale: string = "en"
  ): Promise<void> {
    const expiresAt = tokenExpiresAt.toLocaleString("en-US", {
      timeZone: "UTC",
    });

    const { frontendUrl } = CoreEmailService.getConfig();

    const emailTemplate = React.createElement(PasswordResetEmail, {
      userName,
      expiresAt,
      frontendUrl,
      token: resetToken,
    });

    await CoreEmailService.sendEmail({
      to,
      subject: tEmail(locale, "subjects.resetPassword"),
      template: emailTemplate,
      emailType: "password-reset",
      context: {
        userName,
        resetToken: resetToken.substring(0, 8) + "...", // Log partial token for debugging
      },
    });
  }
}

export const passwordResetEmailService = PasswordResetEmailService;
