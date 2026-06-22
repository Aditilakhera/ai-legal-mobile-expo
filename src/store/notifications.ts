/**
 * AI Legal Mobile - Notifications State Store
 * Manages user push alerts, unread status indicators, and notification clearing.
 */

import { create } from 'zustand';
import { NotificationInboxItem } from '../types';
import { NotificationService } from '../services/notification.service';

interface NotificationStoreState {
  notifications: NotificationInboxItem[];
  isLoading: boolean;
  fetchNotifications: (silent?: boolean) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
  getUnreadCount: () => number;
}

export const useNotificationStore = create<NotificationStoreState>((set, get) => ({
  notifications: [],
  isLoading: false,

  fetchNotifications: async (silent = false) => {
    if (!silent) set({ isLoading: true });
    try {
      const res = await NotificationService.getNotifications();
      // Support both raw arrays and wrapped response payload shapes
      const data = Array.isArray(res) ? res : (res?.data || []);
      set({ notifications: data as NotificationInboxItem[] });
    } catch (err) {
      console.error('[NOTIFICATION STORE] fetch error:', err);
    } finally {
      set({ isLoading: false });
    }
  },

  markAsRead: async (id: string) => {
    try {
      await NotificationService.markAsRead(id);
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, isRead: true } : n
        ),
      }));
    } catch (err) {
      console.error('[NOTIFICATION STORE] mark as read error:', err);
    }
  },

  markAllAsRead: async () => {
    try {
      await NotificationService.markAllAsRead();
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
      }));
    } catch (err) {
      console.error('[NOTIFICATION STORE] mark all read error:', err);
    }
  },

  deleteNotification: async (id: string) => {
    try {
      await NotificationService.deleteNotification(id);
      set((state) => ({
        notifications: state.notifications.filter((n) => n.id !== id),
      }));
    } catch (err) {
      console.error('[NOTIFICATION STORE] delete error:', err);
    }
  },

  clearAll: async () => {
    try {
      await NotificationService.clearAllNotifications();
      set({ notifications: [] });
    } catch (err) {
      console.error('[NOTIFICATION STORE] clear all error:', err);
    }
  },

  getUnreadCount: () => {
    return get().notifications.filter((n) => !n.isRead).length;
  },
}));
