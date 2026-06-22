/**
 * AI Legal Mobile - User Management Service
 * Proxies account profile actions, active login sessions, and data portability exports.
 */

import { apiClient } from '../api/client';
import { API_ENDPOINTS } from '../constants';
import { ApiResponse } from '../types';

export interface UserSessionInfo {
  sessionId: string;
  deviceFingerprint: string;
  ipAddress: string;
  lastActive: string;
  isCurrent: boolean;
}

export class UserService {
  /**
   * Fetch list of active logged-in device sessions for user.
   */
  static async getActiveSessions(): Promise<ApiResponse<UserSessionInfo[]>> {
    const response = await apiClient.get(API_ENDPOINTS.User.Sessions);
    return {
      success: true,
      data: response.data,
    };
  }

  /**
   * Revoke/logout a specific device session by ID.
   */
  static async revokeSession(sessionId: string): Promise<ApiResponse<{ success: boolean }>> {
    const response = await apiClient.delete(`${API_ENDPOINTS.User.Sessions}/${sessionId}`);
    return {
      success: true,
      data: response.data,
    };
  }

  /**
   * Request GDPR personal data export package.
   */
  static async exportPersonalData(): Promise<ApiResponse<any>> {
    const response = await apiClient.get(API_ENDPOINTS.User.DataExport);
    return {
      success: true,
      data: response.data,
    };
  }

  /**
   * Completely delete user profile and databases (GDPR Compliance).
   */
  static async deleteAccount(userId: string): Promise<ApiResponse<{ success: boolean }>> {
    const response = await apiClient.delete(`${API_ENDPOINTS.User.DeleteAccount}/${userId}`);
    return {
      success: true,
      data: response.data,
    };
  }
}
