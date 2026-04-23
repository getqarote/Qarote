// Re-export all email services and types for backward compatibility

// Import services for internal use
import { AuthEmailService } from "./auth-email.service";
import { BillingEmailService } from "./billing-email.service";
import { LicenseEmailService } from "./license-email.service";


/**
 * Main EmailService class that provides all email functionality
 * This maintains backward compatibility while delegating to specialized services
 */
export class EmailService {
  // Authentication emails
  static sendInvitationEmail = AuthEmailService.sendInvitationEmail;
  static sendOrgInvitationEmail = AuthEmailService.sendOrgInvitationEmail;
  static sendWelcomeEmail = AuthEmailService.sendWelcomeEmail;
  static sendVerificationEmail = AuthEmailService.sendVerificationEmail;

  // Billing emails
  static sendUpgradeConfirmationEmail =
    BillingEmailService.sendUpgradeConfirmationEmail;
  static sendWelcomeBackEmail = BillingEmailService.sendWelcomeBackEmail;


  // License emails
  static sendLicenseDeliveryEmail =
    LicenseEmailService.sendLicenseDeliveryEmail;
  static sendLicenseRenewalEmail = LicenseEmailService.sendLicenseRenewalEmail;
  static sendLicenseExpirationReminderEmail =
    LicenseEmailService.sendLicenseExpirationReminderEmail;
  static sendLicenseExpiredEmail = LicenseEmailService.sendLicenseExpiredEmail;
  static sendLicensePaymentFailedEmail =
    LicenseEmailService.sendLicensePaymentFailedEmail;
  static sendLicenseCancellationEmail =
    LicenseEmailService.sendLicenseCancellationEmail;
}
