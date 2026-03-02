import { logger } from "@/core/logger";
import { retryWithBackoff } from "@/core/retry";

import { CoreStripeService, stripe } from "./core.service";

export class StripePaymentService {
  /**
   * Get upcoming invoice for subscription
   */
  static async getUpcomingInvoice(subscriptionId: string) {
    try {
      logger.info({ subscriptionId }, "Retrieving upcoming invoice");

      const invoice = await retryWithBackoff(
        () =>
          stripe.invoices.createPreview({
            subscription: subscriptionId,
          }),
        {
          maxRetries: 3,
          retryDelayMs: 1_000,
          timeoutMs: 10_000,
        },
        "stripe"
      );

      logger.info(
        {
          subscriptionId,
          amount: invoice.amount_due,
        },
        "Upcoming invoice retrieved successfully"
      );

      return invoice;
    } catch (error) {
      CoreStripeService.logStripeError(error, "get_upcoming_invoice", {
        subscriptionId,
      });
      throw error;
    }
  }

  /**
   * Get payment method details
   */
  static async getPaymentMethod(paymentMethodId: string) {
    try {
      logger.info({ paymentMethodId }, "Retrieving payment method");

      const paymentMethod = await retryWithBackoff(
        () => stripe.paymentMethods.retrieve(paymentMethodId),
        {
          maxRetries: 3,
          retryDelayMs: 1_000,
          timeoutMs: 10_000,
        },
        "stripe"
      );

      logger.info(
        {
          paymentMethodId,
          type: paymentMethod.type,
        },
        "Payment method retrieved successfully"
      );

      return paymentMethod;
    } catch (error) {
      CoreStripeService.logStripeError(error, "get_payment_method", {
        paymentMethodId,
      });
      throw error;
    }
  }

  /**
   * Get payment history for customer
   */
  static async getPaymentHistory(customerId: string, limit = 100) {
    try {
      logger.info({ customerId, limit }, "Retrieving Stripe payment history");

      const invoices = await retryWithBackoff(
        () =>
          stripe.invoices.list({
            customer: customerId,
            limit,
            status: "paid",
          }),
        {
          maxRetries: 3,
          retryDelayMs: 1_000,
          timeoutMs: 10_000,
        },
        "stripe"
      );

      logger.info(
        {
          customerId,
          invoiceCount: invoices.data.length,
        },
        "Stripe payment history retrieved successfully"
      );

      return invoices;
    } catch (error) {
      CoreStripeService.logStripeError(error, "get_payment_history", {
        customerId,
        limit,
      });
      throw error;
    }
  }

  /**
   * Get invoice history for customer
   */
  static async getInvoiceHistory(customerId: string, limit = 100) {
    try {
      logger.info({ customerId, limit }, "Retrieving Stripe invoice history");

      const invoices = await retryWithBackoff(
        () =>
          stripe.invoices.list({
            customer: customerId,
            limit,
          }),
        {
          maxRetries: 3,
          retryDelayMs: 1_000,
          timeoutMs: 10_000,
        },
        "stripe"
      );

      logger.info(
        {
          customerId,
          invoiceCount: invoices.data.length,
        },
        "Stripe invoice history retrieved successfully"
      );

      return invoices;
    } catch (error) {
      CoreStripeService.logStripeError(error, "get_invoice_history", {
        customerId,
        limit,
      });
      throw error;
    }
  }
}
