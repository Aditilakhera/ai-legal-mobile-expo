/**
 * AI Legal Mobile - Notifications Manager Hook
 * Configures push tokens registration, socket event streaming, and native deep linking redirects.
 */

import { useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';
import * as Device from 'expo-device';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { useNotificationStore } from '@/store/notifications';
import { useAuthStore } from '@/store/auth';
import { useUserStore } from '@/store/user';
import { useToastContext } from '@/providers';
import { initSocket, disconnectSocket } from '@/services/socket.service';
import { NotificationService } from '@/services/notification.service';
import { NotificationInboxItem } from '@/types';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

let Notifications: any = null;
if (!isExpoGo && Platform.OS !== 'web') {
  try {
    Notifications = require('expo-notifications');
    // Handle foreground notification display rules
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch (e) {
    console.warn('[useNotificationsManager] Failed to load expo-notifications:', e);
  }
}

export function useNotificationsManager() {
  const router = useRouter();
  const { showToast } = useToastContext();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const token = useAuthStore((s) => s.token);
  const profile = useUserStore((s) => s.profile);
  const { fetchNotifications, notifications } = useNotificationStore();

  const notificationListener = useRef<any>(null);
  const responseListener = useRef<any>(null);

  // Helper to parse dynamic deep linking paths
  const handleDeepLink = useCallback((url: string) => {
    if (!url) return;
    let path = url.replace('ailegalmobile://', '/').replace('ailegalmobile:', '');
    if (!path.startsWith('/')) {
      path = '/' + path;
    }
    console.log('[Deep Link] Parsing deep link destination:', path);
    try {
      router.push(path as any);
    } catch (e) {
      console.warn('[Deep Link] Failed routing to path:', path, e);
    }
  }, [router]);

  // 1. Setup Push Notifications permissions & token acquisition
  useEffect(() => {
    if (!isAuthenticated || !token || !profile) return;

    async function configurePushNotifications() {
      if (Platform.OS === 'web' || !Notifications) return;

      if (!Device.isDevice) {
        console.log('[Push Notification] Simulator detected or Expo Go client. Skipping push registration.');
        return;
      }

      try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus !== 'granted') {
          console.warn('[Push Notification] Notifications permission denied.');
          return;
        }

        const projectId =
          Constants.expoConfig?.extra?.eas?.projectId ??
          Constants.easConfig?.projectId;

        if (!projectId) {
          console.warn('[Push Notification] EAS Project ID missing. Skipping push registration in development.');
          return;
        }

        const pushToken = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
        console.log('[Push Notification] Push Token received:', pushToken);

        // Register push token with Express backend user profile
        await NotificationService.registerPushToken(pushToken);

        // Setup Notification Channel for Android
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#6D5DFC',
          });
        }
      } catch (err) {
        console.warn('[Push Notification] Registration failed (non-fatal):', err);
      }
    }

    configurePushNotifications();
  }, [isAuthenticated, token, profile]);

  // 2. Setup Socket.io real-time notifications synchronization
  useEffect(() => {
    if (!isAuthenticated || !token || !profile) {
      disconnectSocket();
      return;
    }

    const userId = profile._id || profile.id;
    if (!userId) return;

    // Connect to WebSocket gateway
    const socket = initSocket(token, userId);

    socket.on('new_notification', (newNotif: NotificationInboxItem) => {
      console.log('[Socket] Live notification received:', newNotif);

      // Instantly refresh unread counts
      fetchNotifications(true);

      // Render custom Premium Toast alert in foreground
      showToast(
        newNotif.type === 'error' ? 'error' : 'success',
        newNotif.title,
        newNotif.desc
      );
    });

    return () => {
      socket.off('new_notification');
    };
  }, [isAuthenticated, token, profile, fetchNotifications, showToast]);

  // 3. Listen to Expo system push events (Foreground / Background / Cold starts)
  useEffect(() => {
    if (!isAuthenticated || !Notifications) return;

    // Triggered when push is received while the app is in the foreground
    notificationListener.current = Notifications.addNotificationReceivedListener((notification: any) => {
      console.log('[Push Notification] Received in foreground:', notification);
      fetchNotifications(true); // Pull fresh items silently
    });

    // Triggered when user taps a push notification in background / closed state
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response: any) => {
      console.log('[Push Notification] Notification tapped by user:', response);
      const url = response.notification.request.content.data?.url as string;
      if (url) {
        handleDeepLink(url);
      }
    });

    // Handle closed app cold start notifications
    Notifications.getLastNotificationResponseAsync().then((response: any) => {
      if (response) {
        console.log('[Push Notification] App cold started via notification tap:', response);
        const url = response.notification.request.content.data?.url as string;
        if (url) {
          // Delay to ensure router navigation is ready
          setTimeout(() => handleDeepLink(url), 1000);
        }
      }
    });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [isAuthenticated, fetchNotifications, handleDeepLink]);

  // 4. Synchronize app launcher badging dynamically
  useEffect(() => {
    if (!isAuthenticated) return;

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    if (Platform.OS !== 'web' && Notifications) {
      Notifications.setBadgeCountAsync(unreadCount).catch((err: any) => {
        console.warn('[Badge Management] Failed to set badge count:', err);
      });
    }
  }, [notifications, isAuthenticated]);
}
