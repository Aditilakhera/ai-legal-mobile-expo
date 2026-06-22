import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { CaseService } from '@/services/case.service';
import { CaseWorkspace } from '@/types';
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
  const [cases, setCases] = useState<CaseWorkspace[]>([]);
  const [isCasesLoading, setIsCasesLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'All' | 'Hearings' | 'Deadlines' | 'AI'>('All');

  const fetchCasesData = useCallback(async () => {
    try {
      const res = await CaseService.listCases();
      const casesData = Array.isArray(res) ? res : (res?.data || []);
      const filtered = (casesData as CaseWorkspace[]).filter((c) => c.isLegalCase);
      setCases(filtered);
    } catch (err) {
      console.warn('Failed to fetch cases for notifications:', err);
    } finally {
      setIsCasesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    fetchCasesData();
  }, [fetchNotifications, fetchCasesData]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      fetchNotifications(true),
      fetchCasesData()
    ]);
    setIsRefreshing(false);
  };

  const isHearingToday = (dateStr?: string) => {
    if (!dateStr) return false;
    const todayStr = new Date().toISOString().split('T')[0];
    return dateStr.includes(todayStr) || new Date(dateStr).toDateString() === new Date().toDateString();
  };

  const virtualNotifications = useMemo(() => {
    const list: any[] = [];
    const activeCases = cases.filter(c => c.status === 'Active' || !c.status);

    activeCases.forEach((c) => {
      // 1. Hearings (Today & Upcoming)
      if (c.hearings) {
        c.hearings.forEach((h, idx) => {
          if (h.date) {
            const hDate = new Date(h.date);
            const isToday = isHearingToday(h.date);
            const isFuture = hDate.getTime() > Date.now();

            if (isToday) {
              list.push({
                id: `virtual-hearing-today-${c._id}-${idx}`,
                title: `Today's Hearing: ${c.name}`,
                desc: `Time: ${h.time || '10:00 AM'}  •  Court: ${h.courtName || c.courtName || 'District Court'}\nAgenda: ${h.status || 'Scheduled Hearing'}`,
                time: h.date,
                type: 'alert',
                isRead: false,
                url: `/workspace/${c._id}?tab=hearings`,
                category: 'hearings',
              });
            } else if (isFuture) {
              list.push({
                id: `virtual-hearing-upcoming-${c._id}-${idx}`,
                title: `Upcoming Hearing: ${c.name}`,
                desc: `Time: ${h.time || '10:00 AM'}  •  Court: ${h.courtName || c.courtName || 'District Court'}\nAgenda: ${h.status || 'Scheduled Hearing'}`,
                time: h.date,
                type: 'update',
                isRead: true, // Mark system upcoming events read by default
                url: `/workspace/${c._id}?tab=hearings`,
                category: 'hearings',
              });
            }
          }
        });
      }

      // 2. Fact Events / Milestones
      if (c.facts) {
        c.facts.forEach((f, idx) => {
          if (f.date) {
            const fDate = new Date(f.date);
            if (fDate.getTime() > Date.now()) {
              list.push({
                id: `virtual-milestone-${c._id}-${idx}`,
                title: `Milestone: ${f.event}`,
                desc: `Case: ${c.name}`,
                time: f.date,
                type: 'update',
                isRead: true,
                url: `/workspace/${c._id}`,
                category: 'deadlines',
              });
            }
          }
        });
      }

      // 3. Tasks / Deadlines
      if (c.tasks) {
        c.tasks.forEach((t, idx) => {
          if (t.deadline && t.status !== 'Completed') {
            const tDate = new Date(t.deadline);
            if (tDate.getTime() > Date.now()) {
              list.push({
                id: `virtual-task-${c._id}-${idx}`,
                title: `Task Deadline: ${t.title}`,
                desc: `Case: ${c.name}  •  Status: ${t.status || 'Pending'}`,
                time: t.deadline,
                type: 'alert',
                isRead: false,
                url: `/workspace/${c._id}?tab=tasks`,
                category: 'deadlines',
              });
            }
          }
        });
      }
    });

    return list;
  }, [cases]);

  const combinedNotifications = useMemo(() => {
    const storeMapped = notifications.map(n => ({
      ...n,
      category: 'ai' as const,
    }));
    return [...virtualNotifications, ...storeMapped].sort((a, b) => {
      return new Date(b.time || 0).getTime() - new Date(a.time || 0).getTime();
    });
  }, [notifications, virtualNotifications]);

  const filteredNotifications = useMemo(() => {
    if (activeTab === 'Hearings') {
      return combinedNotifications.filter(n => n.category === 'hearings');
    }
    if (activeTab === 'Deadlines') {
      return combinedNotifications.filter(n => n.category === 'deadlines');
    }
    if (activeTab === 'AI') {
      return combinedNotifications.filter(n => n.category === 'ai');
    }
    return combinedNotifications;
  }, [combinedNotifications, activeTab]);

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

  const renderItem = ({ item }: { item: any }) => {
    let iconConfig = getNotificationIcon(item.type);
    if (item.category === 'hearings') {
      iconConfig = { name: 'calendar', color: '#3B82F6', bg: '#EBF5FF' };
    } else if (item.category === 'deadlines') {
      iconConfig = { name: 'flag', color: '#EF4444', bg: '#FCE8E6' };
    }

    const isVirtual = item.id.startsWith('virtual-');
    
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
        <View style={[styles.iconContainer, { backgroundColor: iconConfig.bg }]}>
          <Ionicons name={iconConfig.name as any} size={20} color={iconConfig.color} />
        </View>

        <View style={styles.content}>
          <View style={styles.cardHeader}>
            <Text
              style={[
                styles.cardTitle,
                !item.isRead && styles.cardTitleUnread,
              ]}
              numberOfLines={2}
            >
              {item.title}
            </Text>
            <Text style={styles.timeText}>{formatDate(item.time) || item.time}</Text>
          </View>
          <Text style={styles.descText} numberOfLines={3}>
            {item.desc}
          </Text>
        </View>

        {/* Unread indicator dot & Delete Action button */}
        <View style={styles.actionColumn}>
          {!item.isRead && (
            <View style={styles.unreadDot} />
          )}
          {!isVirtual && (
            <Pressable
              onPress={() => handleDeleteNotification(item.id)}
              style={({ pressed }) => [styles.deleteBtn, pressed && styles.deleteBtnPressed]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel="Delete notification"
            >
              <Ionicons name="trash-outline" size={15} color="#EF4444" />
            </Pressable>
          )}
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

  const unreadCount = combinedNotifications.filter((n) => !n.isRead).length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header Info Panel */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Inbox Alerts</Text>
          <Text style={styles.subtitle}>
            {unreadCount > 0
              ? `You have ${unreadCount} unread update${unreadCount > 1 ? 's' : ''}`
              : 'Stay synced with case changes'}
          </Text>
        </View>
      </View>

      {/* Category Tabs */}
      <View style={styles.tabsContainer}>
        {(['All', 'Hearings', 'Deadlines', 'AI'] as const).map((tab) => (
          <Pressable
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[
              styles.tabBtn,
              activeTab === tab && styles.tabBtnActive,
            ]}
          >
            <Text
              style={[
                styles.tabBtnText,
                activeTab === tab && styles.tabBtnTextActive,
              ]}
            >
              {tab === 'AI' ? 'AI Alerts' : tab === 'Deadlines' ? 'Deadlines' : tab}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Bulk Toolbar */}
      {notifications.length > 0 && activeTab === 'AI' && (
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

      {(isLoading || isCasesLoading) && filteredNotifications.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6D5DFC" />
          <Text style={styles.loadingText}>Fetching inbox alerts...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredNotifications}
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
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ECECEC',
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
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ECECEC',
    gap: 8,
    backgroundColor: '#FFFFFF',
  },
  tabBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  tabBtnActive: {
    backgroundColor: '#EEECFF',
  },
  tabBtnText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#4B5563',
  },
  tabBtnTextActive: {
    color: '#6D5DFC',
    fontWeight: '700',
  },
});
