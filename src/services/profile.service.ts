/**
 * AI Legal Mobile - Profile Service
 * Manages user profile settings, avatars, and application preferences.
 */

import { apiClient, uploadFileMultipart } from '../api/client';
import { API_ENDPOINTS } from '../constants';
import { ApiResponse, UserProfile } from '../types';

export class ProfileService {
  /**
   * Retrieves active profile profile details.
   */
  static async getProfile(): Promise<ApiResponse<UserProfile>> {
    const response = await apiClient.get(API_ENDPOINTS.User.Profile);
    return {
      success: true,
      data: response.data,
    };
  }

  /**
   * Update user settings or preferences.
   */
  static async updateProfile(updates: Partial<UserProfile>): Promise<ApiResponse<UserProfile>> {
    const response = await apiClient.put(API_ENDPOINTS.User.Profile, updates);
    return {
      success: true,
      data: response.data,
    };
  }

  /**
   * Updates custom profile avatar file.
   */
  static async updateAvatar(fileUri: string, fileName: string, mimeType: string): Promise<ApiResponse<{ avatar: string }>> {
    const response = await uploadFileMultipart<{ success: boolean; avatar: string }>(
      API_ENDPOINTS.User.Avatar,
      fileUri,
      fileName,
      mimeType
    );
    return {
      success: true,
      data: { avatar: response.avatar },
    };
  }

  /**
   * Changes the current user password.
   */
  static async changePassword(email: string, currentPassword: string, newPassword: string): Promise<ApiResponse<any>> {
    const response = await apiClient.post(API_ENDPOINTS.Auth.ResetPasswordEmail, {
      email,
      currentPassword,
      newPassword,
    });
    return {
      success: true,
      data: response.data,
    };
  }

  /**
   * Fetches active sessions for the user.
   */
  static async getSessions(): Promise<ApiResponse<any[]>> {
    const response = await apiClient.get(API_ENDPOINTS.User.Sessions);
    return {
      success: true,
      data: response.data,
    };
  }

  /**
   * Revokes a specific session by ID.
   */
  static async revokeSession(sessionId: string): Promise<ApiResponse<any>> {
    const response = await apiClient.delete(`${API_ENDPOINTS.User.Sessions}/${sessionId}`);
    return {
      success: true,
      data: response.data,
    };
  }

  /**
   * Resets personalization preferences to defaults.
   */
  static async resetPersonalizations(): Promise<ApiResponse<any>> {
    const response = await apiClient.post(`${API_ENDPOINTS.User.Profile}/personalizations/reset`);
    return {
      success: true,
      data: response.data,
    };
  }

  /**
   * Permanently deletes user account.
   */
  static async deleteAccount(userId: string): Promise<ApiResponse<any>> {
    const response = await apiClient.delete(`${API_ENDPOINTS.User.Profile}/${userId}`);
    return {
      success: true,
      data: response.data,
    };
  }
}
