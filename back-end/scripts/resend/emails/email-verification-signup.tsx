import React from "react";
import EmailVerification from "../../../src/services/email/templates/email-verification";
import { emailConfig } from "../../../src/config";

const { frontendUrl } = emailConfig;

export default function EmailVerificationSignupPreview() {
  return (
    <EmailVerification
      email="john.doe@example.com"
      userName="John Doe"
      token="def456uvw123"
      type="SIGNUP"
      frontendUrl={frontendUrl}
      expiryHours={24}
    />
  );
}
