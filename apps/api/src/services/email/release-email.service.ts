/**
 * Release notification email. CE, because the release-notifier cron that
 * sends it is CE — it lived in the EE notification service only by grouping,
 * and nothing in it is EE: the template and CoreEmailService are both CE.
 */

import { DeploymentService } from "@/services/deployment/deployment.service";
import {
  CoreEmailService,
  EmailResult,
} from "@/services/email/core-email.service";
import UpdateAvailableEmail from "@/services/email/templates/update-available-email";

import { tEmail } from "@/i18n";

interface UpdateAvailableEmailParams {
  to: string;
  currentVersion: string;
  latestVersion: string;
  latestTagName: string;
  locale?: string;
}

export class ReleaseEmailService {
  static async sendUpdateAvailableEmail(
    params: UpdateAvailableEmailParams
  ): Promise<EmailResult> {
    const {
      to,
      currentVersion,
      latestVersion,
      latestTagName,
      locale = "en",
    } = params;

    const releaseUrl = `https://github.com/getqarote/Qarote/releases/tag/${latestTagName}`;

    // Get deployment-specific update instructions
    const deploymentInfo = await DeploymentService.getUpdateInstructions();

    const { frontendUrl } = CoreEmailService.getConfig();

    const template = UpdateAvailableEmail({
      currentVersion,
      latestVersion,
      releaseUrl,
      updateInstructions: deploymentInfo.instructions,
      frontendUrl,
      locale,
    });

    return CoreEmailService.sendEmail({
      to,
      subject: tEmail(locale, "subjects.updateAvailable", { latestVersion }),
      template,
      emailType: "update_available",
      context: {
        currentVersion,
        latestVersion,
        deploymentMethod: deploymentInfo.method,
      },
    });
  }
}
