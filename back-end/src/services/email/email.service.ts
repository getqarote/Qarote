// Re-export all email services and types for backward compatibility
export {
  AuthEmailService,
  SendInvitationEmailParams,
  SendVerificationEmailParams,
  SendWelcomeEmailParams,
} from "./auth-email.service";
export {
  BillingEmailService,
  UpgradeConfirmationEmailParams,
  WelcomeBackEmailParams,
} from "./billing-email.service";
export { CoreEmailService, EmailResult } from "./core-email.service";
export {
  AlertNotificationEmailParams,
  NotificationEmailService,
  PaymentActionRequiredEmailParams,
  PaymentConfirmationEmailParams,
  TrialEndingEmailParams,
  UpcomingInvoiceEmailParams,
} from "./notification-email.service";

// Import services for internal use
import { AuthEmailService } from "./auth-email.service";
import { BillingEmailService } from "./billing-email.service";
import { NotificationEmailService } from "./notification-email.service";

/**
 * Main EmailService class that provides all email functionality
 * This maintains backward compatibility while delegating to specialized services
 */
export class EmailService {
  // Authentication emails
  static sendInvitationEmail = AuthEmailService.sendInvitationEmail;
  static sendWelcomeEmail = AuthEmailService.sendWelcomeEmail;
  static sendVerificationEmail = AuthEmailService.sendVerificationEmail;

  // Billing emails
  static sendUpgradeConfirmationEmail =
    BillingEmailService.sendUpgradeConfirmationEmail;
  static sendWelcomeBackEmail = BillingEmailService.sendWelcomeBackEmail;

  // Notification emails
  static sendTrialEndingEmail = NotificationEmailService.sendTrialEndingEmail;
  static sendPaymentActionRequiredEmail =
    NotificationEmailService.sendPaymentActionRequiredEmail;
  static sendUpcomingInvoiceEmail =
    NotificationEmailService.sendUpcomingInvoiceEmail;
  static sendPaymentFailedEmail =
    NotificationEmailService.sendPaymentFailedEmail;
  static sendPaymentConfirmationEmail =
    NotificationEmailService.sendPaymentConfirmationEmail;
  static sendAlertNotificationEmail =
    NotificationEmailService.sendAlertNotificationEmail;
}
