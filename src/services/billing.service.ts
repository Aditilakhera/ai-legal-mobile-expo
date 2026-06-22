/**
 * AI Legal Mobile - Billing & Credits Service
 * Connects with pricing details, credit limits, subscriptions, and payment processes.
 */

import { apiClient } from '../api/client';
import { API_ENDPOINTS } from '../constants';
import { ApiResponse } from '../types';

export interface SubscriptionStatus {
  plan: 'Basic' | 'Pro' | 'Enterprise';
  status: 'Active' | 'Expired' | 'Pending';
  expiryDate: string | null;
  creditsBalance: number;
}

export interface CreditTransaction {
  id: string;
  action: string;
  description: string;
  credits: number;
  balanceAfter: number;
  timestamp: string;
}

export class BillingService {
  /**
   * Fetch current subscription profile details for logged in user.
   */
  static async getSubscriptionStatus(): Promise<ApiResponse<SubscriptionStatus>> {
    const response = await apiClient.get(API_ENDPOINTS.Subscription.Status);
    return response.data;
  }

  /**
   * Retrieves active credits balance.
   */
  static async getCreditsBalance(): Promise<ApiResponse<{ credits: number }>> {
    const response = await apiClient.get(API_ENDPOINTS.Subscription.UserCredits);
    return response.data;
  }

  /**
   * Fetch logs of user credits consumption.
   */
  static async getCreditHistory(): Promise<ApiResponse<CreditTransaction[]>> {
    const response = await apiClient.get(API_ENDPOINTS.Subscription.CreditHistory);
    return response.data;
  }

  /**
   * Initializes pricing plan payment capture token.
   */
  static async purchasePlan(planId: string): Promise<ApiResponse<{ checkoutUrl: string; transactionId: string }>> {
    const response = await apiClient.post(API_ENDPOINTS.Subscription.PurchasePlan, { planId });
    return response.data;
  }

  /**
   * Verify third-party checkout callback transaction signature.
   */
  static async verifyPayment(payload: {
    transactionId: string;
    paymentToken: string;
  }): Promise<ApiResponse<{ success: boolean; subscription: SubscriptionStatus }>> {
    const response = await apiClient.post(API_ENDPOINTS.Subscription.VerifyPayment, payload);
    return response.data;
  }
}
