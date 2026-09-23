import React from "react";

import { CoreEmailService, EmailResult } from "./core-email.service";
import {
  InternalNewSignupEmail,
  InternalNewSignupEmailProps,
} from "./templates/internal-new-signup-email";

interface NewSignupEmailParams extends InternalNewSignupEmailProps {
  /** Internal recipient (Qarote ops), never the user who signed up. */
  to: string;
}

/**
 * Internal ops emails — Qarote notifying itself about business events.
 *
 * Pure send surface, like the other `*EmailService` classes: the outbox
 * dispatcher calls it, it never enqueues. Enqueue policy lives in
 * `services/notification/new-signup-notification.ts`.
 */
export class InternalEmailService {
  static async sendNewSignupEmail(
    params: NewSignupEmailParams
  ): Promise<EmailResult> {
    const { to, ...templateProps } = params;

    const template = React.createElement(InternalNewSignupEmail, templateProps);

    return CoreEmailService.sendEmail({
      to,
      // Internal audience of one — no i18n bundle, the subject is a literal.
      subject: `New Qarote signup — ${params.signupEmail}`,
      template,
      emailType: "internal_new_signup",
      context: {
        userId: params.userId,
        signupMethod: params.signupMethod,
      },
    });
  }
}
