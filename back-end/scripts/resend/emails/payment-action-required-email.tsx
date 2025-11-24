import React from "react";
import PaymentActionRequiredEmail from "../../../src/services/email/templates/payment-action-required-email";
import { emailConfig } from "../../../src/config";

const { frontendUrl } = emailConfig;

export default function PaymentActionRequiredEmailPreview() {
  return (
    <PaymentActionRequiredEmail
      name="Jennifer Adams"
      workspaceName="MessageFlow Analytics"
      plan="DEVELOPER"
      invoiceUrl="https://billing.stripe.com/invoice/acct_xxx/in_xxx"
      amount="29.00"
      currency="USD"
      frontendUrl={frontendUrl}
    />
  );
}
