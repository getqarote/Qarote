import { logger } from "@/core/logger";
import { stripe, CoreStripeService } from "./core.service";

export class StripePaymentService {
  /**
   * Get upcoming invoice for subscription
   */
  static async getUpcomingInvoice(subscriptionId: string) {
    try {
      logger.info({ subscriptionId }, "Retrieving upcoming invoice");

      const invoice = await stripe.invoices.retrieveUpcoming({
        subscription: subscriptionId,
      });

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

      const paymentMethod =
        await stripe.paymentMethods.retrieve(paymentMethodId);

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

      const invoices = await stripe.invoices.list({
        customer: customerId,
        limit,
        status: "paid",
      });

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

      const invoices = await stripe.invoices.list({
        customer: customerId,
        limit,
      });

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
