/**
 * Payment API Client for Stripe integration
 */

import { BaseApiClient } from "./baseClient";
import { WorkspacePlan } from "@/types/plans";

export interface CreateCheckoutSessionRequest {
  plan: WorkspacePlan;
  billingInterval: "monthly" | "yearly";
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
    return this.request<CreateCheckoutSessionResponse>("/payment/checkout", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  /**
   * Create a Stripe customer portal session for subscription management
   */
  async createPortalSession(): Promise<{ url: string }> {
    return this.request<{ url: string }>("/payment/portal", {
      method: "POST",
    });
  }

  /**
   * Get current subscription details
   */
  async getSubscription(): Promise<SubscriptionResponse> {
    return this.request<SubscriptionResponse>("/payment/subscription");
  }

  /**
   * Get payment history with pagination
   */
  async getPaymentHistory(
    limit = 20,
    offset = 0
  ): Promise<PaymentHistoryResponse> {
    return this.request<PaymentHistoryResponse>(
      `/payment/payments?limit=${limit}&offset=${offset}`
    );
  }

  /**
   * Cancel subscription at period end
   */
  async cancelSubscription(): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>("/payment/cancel", {
      method: "POST",
    });
  }

  /**
   * Reactivate a cancelled subscription
   */
  async reactivateSubscription(): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>("/payment/reactivate", {
      method: "POST",
    });
  }
}
