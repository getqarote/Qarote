import React from "react";
import UpcomingInvoiceEmail from "../../../src/services/email/templates/upcoming-invoice-email";
import { emailConfig } from "../../../src/config";

const { frontendUrl } = emailConfig;

export default function UpcomingInvoiceEmailPreview() {
  return (
    <UpcomingInvoiceEmail
      name="Thomas Brown"
      workspaceName="QueueMaster Pro"
      plan="DEVELOPER"
      amount="29.00"
      currency="USD"
      invoiceDate="September 1, 2025"
      nextBillingDate="September 1, 2025"
      frontendUrl={frontendUrl}
    />
  );
}
