import React from "react";
import TrialEndingEmail from "../../../src/services/email/templates/trial-ending-email";
import { emailConfig } from "../../../src/config";

const { frontendUrl } = emailConfig;

export default function TrialEndingEmailPreview() {
  return (
    <TrialEndingEmail
      name="Mark Stevens"
      workspaceName="StartupFlow"
      plan="DEVELOPER"
      trialEndDate="August 29, 2025"
      frontendUrl={frontendUrl}
    />
  );
}
