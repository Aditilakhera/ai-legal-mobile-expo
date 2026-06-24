/**
 * AI Legal Mobile - Bottom Tabs Layout
 * Defines navigation tabs: Home, My Cases, AI Assistant, AI Tools, and Profile.
 */

import React, { useEffect } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { Pressable, View, Text, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// @ts-ignore
// eslint-disable-next-line import/no-unresolved
import { Ionicons } from '@expo/vector-icons';
import { useThemeContext } from '@/providers';
import { useNotificationStore } from '@/store/notifications';
import { useChatStore } from '@/store/chat';
import { useTranslation } from '@/localization';

function HeaderNotificationBell() {
  const router = useRouter();
  const { theme } = useThemeContext();
  const fetchNotifications = useNotificationStore((s) => s.fetchNotifications);
  const unreadCount = useNotificationStore((s) => s.getUnreadCount());

  useEffect(() => {
    // Fetch notifications initially to show correct count
    fetchNotifications(true);
    // Setup interval to fetch notifications every 15s to keep the badge synced
    const interval = setInterval(() => {
      fetchNotifications(true);
    }, 15000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  return (
    <Pressable
      onPress={() => router.push('/(tabs)/notifications')}
      style={({ pressed }) => [
        styles.bellContainer,
        pressed && { backgroundColor: theme.hover },
      ]}
      accessibilityLabel="Open Notifications"
      accessibilityRole="button"
    >
      <Ionicons name="notifications-outline" size={24} color={theme.textPrimary} />
      {unreadCount > 0 && (
        <View style={[styles.badge, { borderColor: theme.surface }]}>
          <Text style={styles.badgeText}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

export default function TabsLayout() {
  const { theme, isDark } = useThemeContext();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const isFocusMode = useChatStore((s) => s.isFocusMode);

  // Dynamic tab bar height calculation supporting Android/iOS notches, gesture bar, or button bar
  const bottomPadding = insets.bottom > 0 ? insets.bottom : 8;
  const tabHeight = 60 + bottomPadding;

  return (
    <Tabs
      screenOptions={({ route }) => {
        const hideTab = isFocusMode && route.name === 'chat';
        return {
          tabBarActiveTintColor: theme.primary,
          tabBarInactiveTintColor: theme.textSecondary,
          tabBarHideOnKeyboard: true,
          tabBarStyle: {
            display: hideTab ? 'none' : 'flex',
            backgroundColor: theme.surface,
            borderTopColor: theme.border,
            borderTopWidth: hideTab ? 0 : 1,
            height: hideTab ? 0 : tabHeight,
            paddingBottom: hideTab ? 0 : bottomPadding,
            paddingTop: hideTab ? 0 : 8,
            // Subtle premium shadow
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: -3 },
            shadowOpacity: hideTab ? 0 : (isDark ? 0.2 : 0.04),
            shadowRadius: hideTab ? 0 : 8,
            elevation: hideTab ? 0 : 10,
          },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
        headerStyle: {
          backgroundColor: theme.surface,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
        },
        headerTintColor: theme.textPrimary,
        headerTitleStyle: {
          fontWeight: '800',
          fontSize: 18,
        },
        headerRight: () => <HeaderNotificationBell />,
        tabBarIcon: ({ color, focused }) => {
          let iconName: any;

          if (route.name === 'dashboard') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'cases') {
            iconName = focused ? 'folder-open' : 'folder-open-outline';
          } else if (route.name === 'chat') {
            iconName = focused ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline';
          } else if (route.name === 'tools') {
            iconName = focused ? 'flash' : 'flash-outline';
          } else if (route.name === 'profile') {
            iconName = focused ? 'person' : 'person-outline';
          } else {
            return null;
          }

          return <Ionicons name={iconName} size={22} color={color} />;
        },
      };
    }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          tabBarLabel: t('home.title'),
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="cases"
        options={{
          tabBarLabel: t('cases.title'),
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          tabBarLabel: t('home.aiLegalAssistant'),
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="tools"
        options={{
          tabBarLabel: t('tools.title'),
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarLabel: t('profile.title'),
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          tabBarLabel: 'Notifications',
          headerShown: false,
          href: null,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bellContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderRadius: 20,
  },
  bellContainerPressed: {
    backgroundColor: '#F3F4F6',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    textAlign: 'center',
  },
});
