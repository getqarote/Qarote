/**
 * Payment API Client for Stripe integration
 */

import { BaseApiClient } from "./baseClient";
import { WorkspacePlan } from "@/types/plans";

export interface CreateCheckoutSessionRequest {
  plan: WorkspacePlan;
  billingInterval: "monthly" | "yearly";
  successUrl?: string;
  cancelUrl?: string;
}

export interface CreateCheckoutSessionResponse {
  url: string;
}

export interface SubscriptionResponse {
  subscription: {
    id: string;
    status: string;
    plan: WorkspacePlan;
    billingInterval: string;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
  } | null;
}

export interface PaymentHistoryResponse {
  payments: Array<{
    id: string;
    amount: number;
    currency: string;
    status: string;
    description: string;
    paidAt: string;
    receiptUrl?: string;
  }>;
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface BillingOverviewResponse {
  workspace: {
    id: string;
    name: string;
    plan: WorkspacePlan;
  };
  subscription: {
    id: string;
    status: string;
    stripeCustomerId: string;
    stripeSubscriptionId: string;
    createdAt: string;
    updatedAt: string;
  } | null;
  stripeSubscription: {
    id: string;
    status: string;
    current_period_start: number;
    current_period_end: number;
    items: {
      data: Array<{
        price: {
          unit_amount: number;
          recurring: {
            interval: string;
          };
        };
      }>;
    };
  } | null;
  upcomingInvoice: {
    amount_due: number;
    period_end: number;
    lines: {
      data: Array<{
        description: string;
      }>;
    };
  } | null;
  paymentMethod: {
    card: {
      last4: string;
      brand: string;
    };
  } | null;
  currentUsage: {
    servers: number;
    users: number;
    queues: number;
    messagesThisMonth: number;
  };
  recentPayments: Array<{
    id: string;
    amount: number;
    status: string;
    description: string;
    createdAt: string;
  }>;
}

export class PaymentApiClient extends BaseApiClient {
  constructor(baseUrl?: string) {
    super(baseUrl);
  }

  /**
   * Create a Stripe checkout session for plan upgrade
   */
  async createCheckoutSession(
    data: CreateCheckoutSessionRequest
  ): Promise<CreateCheckoutSessionResponse> {
    return this.request<CreateCheckoutSessionResponse>("/payments/checkout", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  /**
   * Create a Stripe customer portal session for subscription management
   */
  async createPortalSession(): Promise<{ url: string }> {
    return this.request<{ url: string }>("/payments/portal", {
      method: "POST",
    });
  }

  /**
   * Get current subscription details
   */
  async getSubscription(): Promise<SubscriptionResponse> {
    return this.request<SubscriptionResponse>("/payments/subscription");
  }

  /**
   * Get payment history with pagination
   */
  async getPaymentHistory(
    limit = 20,
    offset = 0
  ): Promise<PaymentHistoryResponse> {
    return this.request<PaymentHistoryResponse>(
      `/payments/payments?limit=${limit}&offset=${offset}`
    );
  }

  /**
   * Get comprehensive billing overview including usage, subscription, and payment details
   */
  async getBillingOverview(): Promise<BillingOverviewResponse> {
    return this.request<BillingOverviewResponse>("/payments/billing/overview");
  }

  /**
   * Create a billing portal session for subscription management
   */
  async createBillingPortalSession(): Promise<{ url: string }> {
    return this.request<{ url: string }>("/payments/billing/portal", {
      method: "POST",
    });
  }
}
