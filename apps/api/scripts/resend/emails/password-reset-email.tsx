import React from "react";
import { PasswordResetEmail } from "../../../src/services/email/templates/password-reset-email";
import { emailConfig } from "../../../src/config";

const { frontendUrl } = emailConfig;

export default function PasswordResetEmailPreview() {
  return (
    <PasswordResetEmail
      userName="Alice Cooper"
      expiresAt="August 24, 2025 at 3:00 PM UTC"
      frontendUrl={frontendUrl}
      token="reset123abc456"
    />
  );
}
