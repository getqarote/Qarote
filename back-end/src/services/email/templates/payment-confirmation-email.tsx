import React from "react";

interface PaymentConfirmationEmailProps {
  userName: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  frontendUrl: string;
}

export const PaymentConfirmationEmail: React.FC<
  PaymentConfirmationEmailProps
> = ({ userName, amount, currency, paymentMethod, frontendUrl }) => {
  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount);
  };

  const formatPaymentMethod = (method: string) => {
    switch (method.toLowerCase()) {
      case "card":
        return "Credit/Debit Card";
      case "bank_account":
        return "Bank Account";
      case "sepa_debit":
        return "SEPA Direct Debit";
      case "ideal":
        return "iDEAL";
      case "sofort":
        return "Sofort";
      default:
        return method.charAt(0).toUpperCase() + method.slice(1);
    }
  };

  return (
    <div
      style={{
        fontFamily: "Arial, sans-serif",
        maxWidth: "600px",
        margin: "0 auto",
        backgroundColor: "#ffffff",
        borderRadius: "8px",
        overflow: "hidden",
        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
      }}
    >
      {/* Header */}
      <div
        style={{
          backgroundColor: "#10b981",
          padding: "32px 24px",
          textAlign: "center",
        }}
      >
        <h1
          style={{
            color: "#ffffff",
            margin: 0,
            fontSize: "28px",
            fontWeight: "bold",
          }}
        >
          ✅ Payment Confirmed
        </h1>
      </div>

      {/* Content */}
      <div style={{ padding: "32px 24px" }}>
        <h2
          style={{
            color: "#1f2937",
            marginBottom: "16px",
            fontSize: "20px",
          }}
        >
          Hello {userName},
        </h2>

        <p
          style={{
            color: "#6b7280",
            fontSize: "16px",
            lineHeight: "1.6",
            marginBottom: "24px",
          }}
        >
          Great news! Your payment has been successfully processed.
        </p>

        {/* Payment Details */}
        <div
          style={{
            backgroundColor: "#f9fafb",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            padding: "20px",
            marginBottom: "24px",
          }}
        >
          <h3
            style={{
              color: "#1f2937",
              margin: "0 0 16px 0",
              fontSize: "18px",
            }}
          >
            Payment Details
          </h3>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "8px",
            }}
          >
            <span style={{ color: "#6b7280" }}>Amount:</span>
            <span style={{ color: "#1f2937", fontWeight: "bold" }}>
              {formatAmount(amount, currency)}
            </span>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "8px",
            }}
          >
            <span style={{ color: "#6b7280" }}>Payment Method:</span>
            <span style={{ color: "#1f2937", fontWeight: "bold" }}>
              {formatPaymentMethod(paymentMethod)}
            </span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#6b7280" }}>Status:</span>
            <span
              style={{
                color: "#10b981",
                fontWeight: "bold",
                backgroundColor: "#d1fae5",
                padding: "4px 8px",
                borderRadius: "4px",
                fontSize: "14px",
              }}
            >
              ✅ Completed
            </span>
          </div>
        </div>

        <p
          style={{
            color: "#6b7280",
            fontSize: "16px",
            lineHeight: "1.6",
            marginBottom: "24px",
          }}
        >
          Thank you for your payment! You can continue using RabbitHQ without
          any interruptions.
        </p>

        {/* CTA Button */}
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <a
            href={`${frontendUrl}/dashboard`}
            style={{
              display: "inline-block",
              padding: "14px 28px",
              backgroundColor: "#3b82f6",
              color: "#ffffff",
              textDecoration: "none",
              borderRadius: "8px",
              fontWeight: "bold",
              fontSize: "16px",
              transition: "background-color 0.2s",
            }}
          >
            Go to Dashboard
          </a>
        </div>

        <p
          style={{
            color: "#9ca3af",
            fontSize: "14px",
            lineHeight: "1.5",
            marginBottom: "0",
          }}
        >
          If you have any questions about this payment, please don't hesitate to
          contact our support team.
        </p>
      </div>

      {/* Footer */}
      <div
        style={{
          backgroundColor: "#f9fafb",
          padding: "20px 24px",
          borderTop: "1px solid #e5e7eb",
          textAlign: "center",
        }}
      >
        <p
          style={{
            color: "#9ca3af",
            fontSize: "12px",
            margin: "0 0 8px 0",
          }}
        >
          This is an automated message from RabbitHQ
        </p>
        <p
          style={{
            color: "#9ca3af",
            fontSize: "12px",
            margin: "0",
          }}
        >
          © 2024 RabbitHQ. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default PaymentConfirmationEmail;
