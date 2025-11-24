import React from "react";
import WelcomeBackEmail from "../../../src/services/email/templates/welcome-back-email";
import { emailConfig } from "../../../src/config";

const { frontendUrl } = emailConfig;

export default function WelcomeBackEmailPreview() {
  return (
    <WelcomeBackEmail
      userName="Michael Chen"
      workspaceName="TechStart Solutions"
      plan="DEVELOPER"
      billingInterval="monthly"
      previousCancelDate="2025-07-15"
      frontendUrl={frontendUrl}
    />
  );
}
