/**
 * AI Legal Mobile - Navigation UI Elements
 * Provides Top Header Bars, Back triggers, and Profile/Alert buttons.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ViewStyle } from 'react-native';
import { router } from 'expo-router';
import { useThemeContext } from '@/providers';
import { Spacing, Radius, Shadows } from '@/theme';
import { Badge } from '../badges';

export interface TopBarProps {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
  rightActions?: React.ReactNode[];
  style?: ViewStyle;
}

/**
 * Custom Top App Header Bar.
 */
export const TopBar: React.FC<TopBarProps> = ({
  title,
  showBack = false,
  onBack,
  rightActions = [],
  style,
}) => {
  const { theme } = useThemeContext();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (router.canGoBack()) {
      router.back();
    }
  };

  return (
    <View style={[styles.topBar, { backgroundColor: theme.surface, borderBottomColor: theme.border }, Shadows.navigation, style]}>
      <View style={styles.leftContainer}>
        {showBack && (
          <TouchableOpacity
            onPress={handleBack}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Text style={{ fontSize: 20, color: theme.primary }}>◀</Text>
          </TouchableOpacity>
        )}
        <Text style={[styles.title, { color: theme.textPrimary }]} numberOfLines={1}>
          {title}
        </Text>
      </View>
      <View style={styles.rightContainer}>
        {rightActions.map((action, idx) => (
          <View key={idx} style={{ marginLeft: Spacing[12] }}>
            {action}
          </View>
        ))}
      </View>
    </View>
  );
};

/**
 * Standard Back Button.
 */
export const BackButton: React.FC<{ onPress?: () => void }> = ({ onPress }) => {
  const { theme } = useThemeContext();
  return (
    <TouchableOpacity
      onPress={onPress || (() => router.canGoBack() && router.back())}
      style={styles.backButton}
      accessibilityRole="button"
      accessibilityLabel="Go Back"
    >
      <Text style={{ fontSize: 15, color: theme.primary, fontWeight: '700' }}>◀ Back</Text>
    </TouchableOpacity>
  );
};

/**
 * Profile Button Avatar.
 */
export interface ProfileButtonProps {
  avatarUrl?: string;
  onPress: () => void;
  size?: number;
}

export const ProfileButton: React.FC<ProfileButtonProps> = ({
  avatarUrl,
  onPress,
  size = 36,
}) => {
  const { theme } = useThemeContext();

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.profileBtn,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: theme.surfaceVariant,
          borderColor: theme.border,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel="Profile settings"
    >
      {avatarUrl ? (
        <Image
          source={{ uri: avatarUrl }}
          style={{ width: '100%', height: '100%', borderRadius: size / 2 }}
        />
      ) : (
        <Text style={{ fontSize: size * 0.5 }}>👤</Text>
      )}
    </TouchableOpacity>
  );
};

/**
 * Notification bell icon with unread indicator badge.
 */
export interface NotificationButtonProps {
  unreadCount?: number;
  onPress: () => void;
}

export const NotificationButton: React.FC<NotificationButtonProps> = ({
  unreadCount = 0,
  onPress,
}) => {
  const { theme } = useThemeContext();

  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.iconBtn}
      accessibilityRole="button"
      accessibilityLabel="Notifications"
    >
      <Text style={{ fontSize: 22, color: theme.textSecondary }}>🔔</Text>
      {unreadCount > 0 && (
        <Badge
          isDot={unreadCount === 0}
          label={unreadCount > 9 ? '9+' : unreadCount}
          variant="danger"
          style={styles.navBadge}
        />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  topBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[16],
    borderBottomWidth: 1,
    alignSelf: 'stretch',
  },
  leftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: Spacing[8],
    padding: Spacing[8],
    minWidth: 32,
    minHeight: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  profileBtn: {
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  iconBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
    minWidth: 16,
    height: 16,
    borderRadius: Radius.full,
  },
});

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNotificationStore } from '@/store/notifications';
// @ts-ignore
// eslint-disable-next-line import/no-unresolved
import { Ionicons } from '@expo/vector-icons';
import { Pressable } from 'react-native';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  leftAction?: React.ReactNode;
  rightActions?: React.ReactNode[];
  hideNotifications?: boolean;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  leftAction,
  rightActions = [],
  hideNotifications = false,
}) => {
  const insets = useSafeAreaInsets();
  const unreadCount = useNotificationStore((s) => s.getUnreadCount());
  const fetchNotifications = useNotificationStore((s) => s.fetchNotifications);

  React.useEffect(() => {
    fetchNotifications(true);
    const interval = setInterval(() => {
      fetchNotifications(true);
    }, 15000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  return (
    <View
      style={{
        paddingTop: insets.top > 0 ? insets.top + 8 : 12,
        paddingBottom: 10,
        paddingHorizontal: 16,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#ECECEC',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
        {leftAction ? <View style={{ marginRight: 10 }}>{leftAction}</View> : null}
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: '#1F2937' }} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={{ fontSize: 11, color: '#4B5563', marginTop: 1, fontWeight: '500' }} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {rightActions.map((action, idx) => (
          <View key={idx} style={{ marginRight: 8 }}>
            {action}
          </View>
        ))}

        {!hideNotifications && (
          <Pressable
            onPress={() => router.push('/(tabs)/notifications')}
            style={({ pressed }) => [
              {
                width: 36,
                height: 36,
                justifyContent: 'center',
                alignItems: 'center',
                borderRadius: 18,
              },
              pressed && { backgroundColor: '#F3F4F6' },
            ]}
            accessibilityLabel="Open Notifications"
            accessibilityRole="button"
          >
            <Ionicons name="notifications-outline" size={22} color="#1F2937" />
            {unreadCount > 0 && (
              <View
                style={{
                  position: 'absolute',
                  top: 2,
                  right: 2,
                  minWidth: 15,
                  height: 15,
                  borderRadius: 7.5,
                  backgroundColor: '#EF4444',
                  justifyContent: 'center',
                  alignItems: 'center',
                  paddingHorizontal: 2,
                  borderWidth: 1,
                  borderColor: '#FFFFFF',
                }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 8, fontWeight: '800', textAlign: 'center' }}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
          </Pressable>
        )}
      </View>
    </View>
  );
};

