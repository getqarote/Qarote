import React from "react";
import { UpgradeConfirmationEmail } from "../../../src/services/email/templates/upgrade-confirmation-email";
import { emailConfig } from "../../../src/config";

const { frontendUrl } = emailConfig;

export default function UpgradeConfirmationEnterprisePreview() {
  return (
    <UpgradeConfirmationEmail
      userName="Emma Rodriguez"
      workspaceName="Global Logistics Corp"
      plan="ENTERPRISE"
      billingInterval="monthly"
      frontendUrl={frontendUrl}
    />
  );
}
