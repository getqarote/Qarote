/**
 * Payment API Client for Stripe integration
 */

import { UserPlan } from "@/types/plans";

import { BaseApiClient } from "./baseClient";

export interface CreateCheckoutSessionRequest {
  plan: UserPlan;
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
    plan: UserPlan;
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
  };
  subscription: {
    id: string;
    status: string;
    stripeCustomerId: string;
    stripeSubscriptionId: string;
    plan: UserPlan;
    canceledAt: string | null;
    isRenewalAfterCancel: boolean;
    previousCancelDate: string | null;
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

export interface CancelSubscriptionRequest {
  cancelImmediately?: boolean;
  reason?: string;
  feedback?: string;
}

export interface CancelSubscriptionResponse {
  success: boolean;
  subscription: {
    id: string;
    status: string;
    cancelAtPeriodEnd: boolean;
    currentPeriodEnd: string;
    canceledAt: string | null;
  };
  message: string;
}

export class PaymentApiClient extends BaseApiClient {
  constructor(baseUrl?: string) {
    super(baseUrl);
  }

  /**
   * Create a Stripe checkout session for plan upgrade
   */
  async createCheckoutSession(
    workspaceId: string,
    data: CreateCheckoutSessionRequest
  ): Promise<CreateCheckoutSessionResponse> {
    return this.request<CreateCheckoutSessionResponse>(
      `/workspaces/${workspaceId}/payments/checkout`,
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
  }

  /**
   * Create a Stripe customer portal session for subscription management
   */
  async createPortalSession(workspaceId: string): Promise<{ url: string }> {
    return this.request<{ url: string }>(
      `/workspaces/${workspaceId}/payments/portal`,
      {
        method: "POST",
      }
    );
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
    workspaceId: string,
    limit = 20,
    offset = 0
  ): Promise<PaymentHistoryResponse> {
    return this.request<PaymentHistoryResponse>(
      `/workspaces/${workspaceId}/payments/payments?limit=${limit}&offset=${offset}`
    );
  }

  /**
   * Get comprehensive billing overview including usage, subscription, and payment details
   */
  async getBillingOverview(
    workspaceId: string
  ): Promise<BillingOverviewResponse> {
    return this.request<BillingOverviewResponse>(
      `/workspaces/${workspaceId}/payments/billing/overview`
    );
  }

  /**
   * Create a billing portal session for subscription management
   */
  async createBillingPortalSession(
    workspaceId: string
  ): Promise<{ url: string }> {
    return this.request<{ url: string }>(
      `/workspaces/${workspaceId}/payments/billing/portal`,
      {
        method: "POST",
      }
    );
  }

  /**
   * Cancel current subscription
   */
  async cancelSubscription(
    workspaceId: string,
    data: CancelSubscriptionRequest
  ): Promise<CancelSubscriptionResponse> {
    return this.request<CancelSubscriptionResponse>(
      `/workspaces/${workspaceId}/payments/billing/cancel`,
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
  }

  /**
   * Renew/reactivate subscription (redirect to checkout or billing portal)
   */
  async renewSubscription(
    workspaceId: string,
    plan: UserPlan,
    billingInterval: "monthly" | "yearly" = "monthly"
  ): Promise<{ url: string }> {
    // Use the checkout flow to renew with the same plan
    return this.createCheckoutSession(workspaceId, {
      plan,
      billingInterval,
    });
  }
}
