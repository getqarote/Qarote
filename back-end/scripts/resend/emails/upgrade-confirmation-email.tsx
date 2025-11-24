import React from "react";
import { UpgradeConfirmationEmail } from "../../../src/services/email/templates/upgrade-confirmation-email";
import { emailConfig } from "../../../src/config";

const { frontendUrl } = emailConfig;

export default function UpgradeConfirmationEmailPreview() {
  return (
    <UpgradeConfirmationEmail
      userName="David Wilson"
      workspaceName="DataFlow Systems"
      plan="DEVELOPER"
      billingInterval="monthly"
      frontendUrl={frontendUrl}
    />
  );
}
