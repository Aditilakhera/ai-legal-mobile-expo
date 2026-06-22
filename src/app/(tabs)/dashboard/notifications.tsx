import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// @ts-ignore
// eslint-disable-next-line import/no-unresolved
import { Ionicons } from '@expo/vector-icons';
import { useAuthGuard } from '@/navigation/guards';
import { useNotificationStore } from '@/store/notifications';
import { formatDate } from '@/utils/formatters';
import { NotificationInboxItem } from '@/types';
import { useRouter } from 'expo-router';
import { useToastContext } from '@/providers';

export default function NotificationsScreen() {
  useAuthGuard();
  const router = useRouter();
  const { showToast } = useToastContext();
  const {
    notifications,
    isLoading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
  } = useNotificationStore();

  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchNotifications(true);
    setIsRefreshing(false);
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      showToast('success', 'Inbox Read', 'All notifications marked as read.');
    } catch (e) {
      showToast('error', 'Action Failed', 'Failed to mark notifications as read.');
    }
  };

  const handleDeleteNotification = async (id: string) => {
    try {
      await deleteNotification(id);
      showToast('success', 'Alert Removed', 'Notification deleted successfully.');
    } catch (e) {
      showToast('error', 'Action Failed', 'Failed to delete notification.');
    }
  };

  const handlePressNotification = async (item: NotificationInboxItem) => {
    if (!item.isRead) {
      await markAsRead(item.id);
    }

    // Retrieve deep link destination url
    const url = item.data?.url || (item as any).url;
    if (url) {
      // Standardize scheme to relative router path
      let path = url.replace('ailegalmobile://', '/').replace('ailegalmobile:', '');
      if (!path.startsWith('/')) {
        path = '/' + path;
      }
      console.log('[Notifications] Routing to deep link path:', path);
      try {
        router.push(path as any);
      } catch (e) {
        console.warn('[Notifications] Deep link navigation failed:', path, e);
      }
    }
  };

  const getNotificationIcon = (type: NotificationInboxItem['type']) => {
    switch (type) {
      case 'success':
        return { name: 'checkmark-circle', color: '#10B981', bg: '#E6F4EA' };
      case 'error':
        return { name: 'close-circle', color: '#EF4444', bg: '#FCE8E6' };
      case 'alert':
        return { name: 'warning', color: '#F59E0B', bg: '#FEF7E0' };
      case 'update':
        return { name: 'sync-circle', color: '#6D5DFC', bg: '#EEECFF' };
      case 'promo':
        return { name: 'gift', color: '#8B5CF6', bg: '#F3E8FF' };
      default:
        return { name: 'information-circle', color: '#3B82F6', bg: '#EBF5FF' };
    }
  };

  const renderItem = ({ item }: { item: NotificationInboxItem }) => {
    const config = getNotificationIcon(item.type);
    
    return (
      <Pressable
        style={({ pressed }) => [
          styles.card,
          !item.isRead && styles.cardUnread,
          pressed && styles.cardPressed,
        ]}
        onPress={() => handlePressNotification(item)}
        accessibilityRole="button"
        accessibilityLabel={`Notification: ${item.title}. ${item.desc}`}
      >
        <View style={[styles.iconContainer, { backgroundColor: config.bg }]}>
          <Ionicons name={config.name} size={20} color={config.color} />
        </View>

        <View style={styles.content}>
          <View style={styles.cardHeader}>
            <Text
              style={[
                styles.cardTitle,
                !item.isRead && styles.cardTitleUnread,
              ]}
              numberOfLines={1}
            >
              {item.title}
            </Text>
            <Text style={styles.timeText}>{formatDate(item.time) || item.time}</Text>
          </View>
          <Text style={styles.descText} numberOfLines={2}>
            {item.desc}
          </Text>
        </View>

        {/* Unread indicator dot & Delete Action button */}
        <View style={styles.actionColumn}>
          {!item.isRead && (
            <View style={styles.unreadDot} />
          )}
          <Pressable
            onPress={() => handleDeleteNotification(item.id)}
            style={({ pressed }) => [styles.deleteBtn, pressed && styles.deleteBtnPressed]}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel="Delete notification"
          >
            <Ionicons name="trash-outline" size={15} color="#EF4444" />
          </Pressable>
        </View>
      </Pressable>
    );
  };

  const renderEmptyState = () => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconWrapper}>
          <Ionicons name="notifications-off-outline" size={44} color="#9CA3AF" />
        </View>
        <Text style={styles.emptyTitle}>All Caught Up!</Text>
        <Text style={styles.emptySubtitle}>
          You have no new alerts or litigation updates at the moment.
        </Text>
      </View>
    );
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header Info Panel */}
      <View style={styles.header}>
        <Pressable
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(tabs)/dashboard');
            }
          }}
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
        >
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </Pressable>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.title}>Inbox Alerts</Text>
          <Text style={styles.subtitle}>
            {unreadCount > 0
              ? `You have ${unreadCount} unread update${unreadCount > 1 ? 's' : ''}`
              : 'Stay synced with case changes'}
          </Text>
        </View>
      </View>

      {/* Bulk Toolbar */}
      {notifications.length > 0 && (
        <View style={styles.toolbar}>
          <Pressable
            onPress={handleMarkAllAsRead}
            disabled={unreadCount === 0}
            style={({ pressed }) => [
              styles.toolbarBtn,
              unreadCount === 0 && styles.toolbarBtnDisabled,
              pressed && styles.toolbarBtnPressed,
            ]}
          >
            <Ionicons
              name="checkmark-done"
              size={16}
              color={unreadCount === 0 ? '#9CA3AF' : '#6D5DFC'}
            />
            <Text
              style={[
                styles.toolbarBtnText,
                unreadCount === 0 && { color: '#9CA3AF' },
              ]}
            >
              Mark all read
            </Text>
          </Pressable>

          <Pressable
            onPress={clearAll}
            style={({ pressed }) => [styles.toolbarBtn, pressed && styles.toolbarBtnPressed]}
          >
            <Ionicons name="trash-outline" size={16} color="#EF4444" />
            <Text style={[styles.toolbarBtnText, { color: '#EF4444' }]}>
              Clear all
            </Text>
          </Pressable>
        </View>
      )}

      {isLoading && notifications.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6D5DFC" />
          <Text style={styles.loadingText}>Fetching inbox alerts...</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListEmptyComponent={renderEmptyState}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={['#6D5DFC']}
              tintColor="#6D5DFC"
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ECECEC',
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    borderRadius: 20,
  },
  headerTitleContainer: {
    flex: 1,
  },
  pressed: {
    opacity: 0.7,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1F2937',
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ECECEC',
    backgroundColor: '#F9FAFB',
  },
  toolbarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  toolbarBtnPressed: {
    backgroundColor: '#F3F4F6',
  },
  toolbarBtnDisabled: {
    opacity: 0.5,
  },
  toolbarBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6D5DFC',
  },
  listContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 100 : 80,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ECECEC',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  cardUnread: {
    backgroundColor: '#F9FBFD',
    borderColor: '#E1EDF7',
  },
  cardPressed: {
    opacity: 0.9,
    backgroundColor: '#F9FAFB',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
    flex: 1,
    marginRight: 8,
  },
  cardTitleUnread: {
    fontWeight: '700',
    color: '#1F2937',
  },
  timeText: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  descText: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  actionColumn: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginLeft: 12,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6D5DFC',
  },
  deleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#FFF5F5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  deleteBtnPressed: {
    opacity: 0.7,
    backgroundColor: '#FEE2E2',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 60,
  },
  emptyIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
});
