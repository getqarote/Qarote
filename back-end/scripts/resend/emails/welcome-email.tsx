import React from "react";
import WelcomeEmail from "../../../src/services/email/templates/welcome-email";
import { emailConfig } from "../../../src/config";

const { frontendUrl } = emailConfig;

export default function WelcomeEmailPreview() {
  return (
    <WelcomeEmail
      name="John Doe"
      workspaceName="Acme Corporation"
      plan="DEVELOPER"
      frontendUrl={frontendUrl}
    />
  );
}
