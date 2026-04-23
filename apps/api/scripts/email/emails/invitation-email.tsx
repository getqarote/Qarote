import React from "react";
import { InvitationEmail } from "../../../src/services/email/templates/invitation-email";
import { emailConfig } from "../../../src/config";

const { frontendUrl } = emailConfig;

export default function InvitationEmailPreview() {
  return (
    <InvitationEmail
      inviterName="Lisa Zhang"
      inviterEmail="lisa.zhang@cloudops.com"
      workspaceName="CloudOps Monitoring"
      invitationToken="invite789xyz012"
      frontendUrl={frontendUrl}
    />
  );
}
