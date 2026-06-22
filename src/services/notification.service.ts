/**
 * AI Legal Mobile - Push Notification & Alerts Service
 * Manages APNs/FCM tokens registrations and badge settings.
 */

import { apiClient } from '../api/client';
import { API_ENDPOINTS } from '../constants';
import { ApiResponse, NotificationInboxItem } from '../types';

export class NotificationService {
  /**
   * Registers Expo/FCM push token with the user profile on backend.
   */
  static async registerPushToken(pushToken: string): Promise<ApiResponse<{ success: boolean }>> {
    const response = await apiClient.post(`${API_ENDPOINTS.Notifications}/register-token`, {
      token: pushToken,
    });
    return response.data;
  }

  /**
   * Fetch active notifications from user's inbox list.
   */
  static async getNotifications(): Promise<ApiResponse<NotificationInboxItem[]>> {
    const response = await apiClient.get(API_ENDPOINTS.Notifications);
    return response.data;
  }

  /**
   * Mark specific notification item as read.
   */
  static async markAsRead(notificationId: string): Promise<ApiResponse<{ success: boolean }>> {
    const response = await apiClient.put(`${API_ENDPOINTS.Notifications}/${notificationId}/read`);
    return response.data;
  }

  /**
   * Marks all notifications as read.
   */
  static async markAllAsRead(): Promise<ApiResponse<{ success: boolean }>> {
    const response = await apiClient.put(`${API_ENDPOINTS.Notifications}/read-all`);
    return response.data;
  }

  /**
   * Deletes a specific notification from active user's inbox list.
   */
  static async deleteNotification(notificationId: string): Promise<ApiResponse<{ success: boolean }>> {
    const response = await apiClient.delete(`${API_ENDPOINTS.Notifications}/${notificationId}`);
    return response.data;
  }

  /**
   * Clears all alerts from active user's inbox list.
   */
  static async clearAllNotifications(): Promise<ApiResponse<{ success: boolean }>> {
    const response = await apiClient.delete(API_ENDPOINTS.Notifications);
    return response.data;
  }
}
