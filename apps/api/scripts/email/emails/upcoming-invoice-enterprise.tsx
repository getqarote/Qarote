import React from "react";
import UpcomingInvoiceEmail from "../../../src/services/email/templates/upcoming-invoice-email";
import { emailConfig } from "../../../src/config";

const { frontendUrl } = emailConfig;

export default function UpcomingInvoiceEnterprisePreview() {
  return (
    <UpcomingInvoiceEmail
      name="Catherine Lewis"
      workspaceName="Enterprise Message Hub"
      plan="ENTERPRISE"
      amount="199.00"
      currency="USD"
      invoiceDate="September 1, 2025"
      nextBillingDate="September 1, 2025"
      frontendUrl={frontendUrl}
    />
  );
}
