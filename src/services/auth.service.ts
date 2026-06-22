/**
 * AI Legal Mobile - Authentication Service
 * Service proxies for handling logins, signups, password resets, and token refreshes.
 */

import { apiClient } from '../api/client';
import { API_ENDPOINTS } from '../constants';
import { ApiResponse } from '../types';

export class AuthService {
  /**
   * Submit credentials to login.
   */
  static async login(payload: Record<string, any>): Promise<ApiResponse<{ token: string; user: any }>> {
    const response = await apiClient.post(API_ENDPOINTS.Auth.Login, payload);
    return {
      success: true,
      data: {
        token: response.data.token,
        user: response.data,
      },
      message: response.data.message || 'LoggedIn Successfully',
    };
  }

  /**
   * Register a new user account.
   */
  static async signup(payload: Record<string, any>): Promise<ApiResponse<{ message: string; token: string; email: string }>> {
    const response = await apiClient.post(API_ENDPOINTS.Auth.Signup, payload);
    return {
      success: true,
      data: {
        message: response.data.message,
        token: response.data.token,
        email: response.data.email,
      },
      message: response.data.message || 'Verification code sent successfully',
    };
  }

  /**
   * Verify email via verification OTP code.
   */
  static async verifyEmail(payload: { email: string; code: string }): Promise<ApiResponse<{ success: boolean; token: string; user: any }>> {
    const response = await apiClient.post(API_ENDPOINTS.Auth.VerifyEmail, payload);
    return {
      success: true,
      data: {
        success: true,
        token: response.data.token,
        user: response.data,
      },
      message: response.data.message || 'Email verified successfully',
    };
  }

  /**
   * Resend verification OTP code to email.
   */
  static async resendCode(email: string): Promise<ApiResponse<{ success: boolean }>> {
    const response = await apiClient.post(API_ENDPOINTS.Auth.ResendCode, { email });
    return {
      success: true,
      data: { success: true },
      message: response.data.message || 'Verification code resent successfully',
    };
  }

  /**
   * Trigger forgot-password flow.
   */
  static async forgotPassword(email: string): Promise<ApiResponse<{ message: string }>> {
    const response = await apiClient.post(API_ENDPOINTS.Auth.ForgotPassword, { email });
    return {
      success: true,
      data: { message: response.data.message },
      message: response.data.message || 'OTP Sent Successfully',
    };
  }

  /**
   * Reset password with valid token and password.
   */
  static async resetPassword(payload: Record<string, any>): Promise<ApiResponse<{ success: boolean }>> {
    const response = await apiClient.post(API_ENDPOINTS.Auth.ResetPasswordOtp, payload);
    return {
      success: true,
      data: { success: true },
      message: response.data.message || 'Password updated successfully',
    };
  }

  /**
   * Perform token refresh workflow.
   */
  static async refreshSession(refreshToken: string): Promise<{ token: string; refreshToken: string }> {
    // Backend doesn't support refresh tokens, so this is a local fallback
    return { token: refreshToken, refreshToken };
  }
}
