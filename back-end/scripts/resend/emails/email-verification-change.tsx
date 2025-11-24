import React from "react";
import EmailVerification from "../../../src/services/email/templates/email-verification";
import { emailConfig } from "../../../src/config";

const { frontendUrl } = emailConfig;

export default function EmailVerificationChangePreview() {
  return (
    <EmailVerification
      email="jane.smith@newcompany.com"
      userName="Jane Smith"
      token="def456uvw123"
      type="EMAIL_CHANGE"
      frontendUrl={frontendUrl}
      expiryHours={12}
    />
  );
}
