import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { CaseService } from '@/services/case.service';
import { CaseWorkspace, NotificationInboxItem } from '@/types';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// @ts-ignore
// eslint-disable-next-line import/no-unresolved
import { Ionicons } from '@expo/vector-icons';
import { useAuthGuard } from '@/navigation/guards';
import { useNotificationStore } from '@/store/notifications';
import { useRouter } from 'expo-router';
import { useToastContext } from '@/providers';
import { useTranslation, formatRelativeDate } from '@/utils/localization';

export default function NotificationsScreen() {
  useAuthGuard();
  const router = useRouter();
  const { showToast } = useToastContext();
  const { t, language } = useTranslation();
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
  const [activeCategory, setActiveCategory] = useState<'All' | 'Cases' | 'Alerts' | 'System'>('All');
  const [searchQuery, setSearchQuery] = useState('');

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

  const isHearingTodayOrTomorrow = (dateStr?: string) => {
    if (!dateStr) return { isToday: false, isTomorrow: false };
    const hDate = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    const isToday = hDate.toDateString() === today.toDateString();
    const isTomorrow = hDate.toDateString() === tomorrow.toDateString();
    return { isToday, isTomorrow };
  };

  // Generate dynamic case-driven notifications from real case data
  const virtualNotifications = useMemo(() => {
    const list: any[] = [];
    const activeCases = cases.filter(c => c.status === 'Active' || !c.status);

    activeCases.forEach((c) => {
      // 1. Hearings (Today & Tomorrow & Upcoming)
      if (c.hearings) {
        c.hearings.forEach((h, idx) => {
          if (h.date) {
            const { isToday, isTomorrow } = isHearingTodayOrTomorrow(h.date);
            const hDate = new Date(h.date);
            const isFuture = hDate.getTime() > Date.now();

            if (isToday) {
              list.push({
                id: `v-hearing-today-${c._id}-${idx}`,
                title: `⚖ Hearing Today: ${c.name}`,
                desc: `Court: ${h.courtroom || c.courtName || 'District Court'} • Time: ${h.time || '10:30 AM'}\nPurpose: ${h.purpose || h.title || 'Judicial Proceeding'}`,
                time: h.date,
                type: 'alert',
                category: 'Alerts',
                priority: 'Critical',
                caseName: c.name,
                caseId: c._id,
                isRead: false,
                data: { url: `/workspace/${c._id}?tab=hearings`, caseId: c._id }
              });
            } else if (isTomorrow) {
              list.push({
                id: `v-hearing-tomorrow-${c._id}-${idx}`,
                title: `📅 Hearing Tomorrow: ${c.name}`,
                desc: `Court: ${h.courtroom || c.courtName || 'District Court'} • Time: ${h.time || '10:30 AM'}`,
                time: h.date,
                type: 'alert',
                category: 'Alerts',
                priority: 'High',
                caseName: c.name,
                caseId: c._id,
                isRead: false,
                data: { url: `/workspace/${c._id}?tab=hearings`, caseId: c._id }
              });
            } else if (isFuture) {
              list.push({
                id: `v-hearing-up-${c._id}-${idx}`,
                title: `⚖ Hearing Scheduled: ${c.name}`,
                desc: `Scheduled for ${h.date} at ${h.courtroom || c.courtName || 'Presiding Forum'}.`,
                time: h.date,
                type: 'info',
                category: 'Cases',
                priority: 'Medium',
                caseName: c.name,
                caseId: c._id,
                isRead: true,
                data: { url: `/workspace/${c._id}?tab=hearings`, caseId: c._id }
              });
            }
          }
        });
      }

      // 2. Tasks & Overdue Deadlines
      if (c.tasks) {
        c.tasks.forEach((task, idx) => {
          if (task.deadline && task.status !== 'Completed') {
            const tDate = new Date(task.deadline);
            const isOverdue = tDate.getTime() < Date.now();
            if (isOverdue) {
              list.push({
                id: `v-task-overdue-${c._id}-${idx}`,
                title: `⚠️ Task Overdue: ${task.title}`,
                desc: `Target deadline was ${task.deadline}. Action required immediately for ${c.name}.`,
                time: task.deadline,
                type: 'error',
                category: 'Alerts',
                priority: 'High',
                caseName: c.name,
                caseId: c._id,
                isRead: false,
                data: { url: `/workspace/${c._id}?tab=tasks`, caseId: c._id }
              });
            }
          }
        });
      }

      // 3. Evidence Alerts (Missing documents)
      if (c.intelligence?.missingEvidence && c.intelligence.missingEvidence.length > 0) {
        c.intelligence.missingEvidence.forEach((missingItem: string, idx: number) => {
          list.push({
            id: `v-missing-ev-${c._id}-${idx}`,
            title: `📋 Missing Evidence Alert`,
            desc: `Required: ${missingItem} for case ${c.name}. Complete file upload to strengthen legal score.`,
            time: new Date().toISOString(),
            type: 'alert',
            category: 'Alerts',
            priority: 'High',
            caseName: c.name,
            caseId: c._id,
            isRead: false,
            data: { url: `/workspace/${c._id}?tab=evidence`, caseId: c._id }
          });
        });
      }
    });

    return list;
  }, [cases]);

  // Combine backend notifications and dynamic case notifications
  const allCombined = useMemo(() => {
    const formattedBackend = notifications.map(n => {
      let resolvedCat: 'Cases' | 'Alerts' | 'System' = n.category || 'Cases';
      const titleLower = (n.title || '').toLowerCase();
      if (titleLower.includes('login') || titleLower.includes('password') || titleLower.includes('welcome') || titleLower.includes('backup')) {
        resolvedCat = 'System';
      } else if (titleLower.includes('hearing tomorrow') || titleLower.includes('hearing today') || titleLower.includes('urgent') || titleLower.includes('overdue') || titleLower.includes('missing') || n.type === 'alert' || n.type === 'error') {
        resolvedCat = 'Alerts';
      }
      return {
        ...n,
        category: resolvedCat,
        priority: n.priority || (resolvedCat === 'Alerts' ? 'High' : 'Medium')
      };
    });

    return [...virtualNotifications, ...formattedBackend].sort((a, b) => {
      return new Date(b.time || 0).getTime() - new Date(a.time || 0).getTime();
    });
  }, [notifications, virtualNotifications]);

  // Apply Search and Category Filters
  const filteredNotifications = useMemo(() => {
    let result = allCombined;

    // 1. Category Filter
    if (activeCategory !== 'All') {
      result = result.filter(n => n.category === activeCategory);
    }

    // 2. Search Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(n => 
        (n.title && n.title.toLowerCase().includes(q)) ||
        (n.desc && n.desc.toLowerCase().includes(q)) ||
        (n.caseName && n.caseName.toLowerCase().includes(q))
      );
    }

    return result;
  }, [allCombined, activeCategory, searchQuery]);

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      showToast('success', 'Marked Read', 'All notifications marked as read');
    } catch (e) {
      showToast('error', 'Action Failed', 'Failed to mark notifications read');
    }
  };

  const handleDeleteNotification = async (id: string) => {
    try {
      await deleteNotification(id);
      showToast('success', 'Notification Removed', 'Notification deleted');
    } catch (e) {
      showToast('error', 'Action Failed', 'Failed to delete notification');
    }
  };

  const handlePressNotification = async (item: NotificationInboxItem) => {
    if (!item.isRead) {
      await markAsRead(item.id);
    }

    const url = item.data?.url || (item as any).url;
    if (url) {
      let path = url.replace('ailegalmobile://', '/').replace('ailegalmobile:', '');
      if (!path.startsWith('/')) {
        path = '/' + path;
      }
      try {
        router.push(path as any);
      } catch (e) {
        console.warn('[Notifications] Navigation failed:', path, e);
      }
    }
  };

  const getNotificationIcon = (type: string, category?: string) => {
    if (category === 'System') {
      return { name: 'shield-checkmark', color: '#8B5CF6', bg: '#F3E8FF' };
    }
    switch (type) {
      case 'success':
        return { name: 'checkmark-circle', color: '#10B981', bg: '#E6F4EA' };
      case 'error':
        return { name: 'warning', color: '#EF4444', bg: '#FCE8E6' };
      case 'alert':
        return { name: 'alert-circle', color: '#F59E0B', bg: '#FEF7E0' };
      default:
        return { name: 'briefcase', color: '#3B82F6', bg: '#EBF5FF' };
    }
  };

  const getPriorityBadgeStyle = (priority?: string) => {
    switch (priority) {
      case 'Critical':
        return { bg: '#FEE2E2', text: '#DC2626' };
      case 'High':
        return { bg: '#FFEDD5', text: '#EA580C' };
      case 'Medium':
        return { bg: '#F3E8FF', text: '#7C3AED' };
      case 'Low':
        return { bg: '#E0F2FE', text: '#0284C7' };
      case 'Completed':
        return { bg: '#D1FAE5', text: '#059669' };
      default:
        return { bg: '#F3F4F6', text: '#4B5563' };
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const iconConfig = getNotificationIcon(item.type, item.category);
    const badgeStyle = getPriorityBadgeStyle(item.priority);
    const isVirtual = item.id.startsWith('v-');

    return (
      <Pressable
        style={({ pressed }) => [
          styles.card,
          !item.isRead && styles.cardUnread,
          pressed && styles.cardPressed,
        ]}
        onPress={() => handlePressNotification(item)}
      >
        {/* Left priority border indicator */}
        <View style={[styles.priorityLeftBorder, { backgroundColor: badgeStyle.text }]} />

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
              numberOfLines={1}
            >
              {item.title}
            </Text>
            <Text style={styles.timeText}>{formatRelativeDate(item.time, language) || item.time}</Text>
          </View>

          {item.caseName ? (
            <View style={styles.caseBadge}>
              <Ionicons name="briefcase-outline" size={10} color="#6D5DFC" />
              <Text style={styles.caseBadgeText} numberOfLines={1}>{item.caseName}</Text>
            </View>
          ) : null}

          <Text style={styles.descText} numberOfLines={2}>
            {item.desc}
          </Text>

          <View style={styles.metaFooter}>
            <View style={[styles.priorityTag, { backgroundColor: badgeStyle.bg }]}>
              <Text style={[styles.priorityTagText, { color: badgeStyle.text }]}>{item.priority || 'Medium'}</Text>
            </View>
            <View style={styles.categoryTag}>
              <Text style={styles.categoryTagText}>{item.category || 'Cases'}</Text>
            </View>
          </View>
        </View>

        {/* Action column */}
        <View style={styles.actionColumn}>
          {!item.isRead && <View style={styles.unreadDot} />}
          {!isVirtual && (
            <Pressable
              onPress={() => handleDeleteNotification(item.id)}
              style={({ pressed }) => [styles.deleteBtn, pressed && styles.deleteBtnPressed]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="trash-outline" size={14} color="#EF4444" />
            </Pressable>
          )}
        </View>
      </Pressable>
    );
  };

  const renderEmptyState = () => {
    if (isLoading || isCasesLoading) return null;
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconWrapper}>
          <Ionicons name="notifications-off-outline" size={40} color="#9CA3AF" />
        </View>
        <Text style={styles.emptyTitle}>No Notifications</Text>
        <Text style={styles.emptySubtitle}>
          You have no active notifications in {activeCategory} right now. Complete case tasks or update hearing schedules to receive real-time alerts.
        </Text>
      </View>
    );
  };

  const unreadCount = allCombined.filter((n) => !n.isRead).length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header Info Panel */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.title}>Notifications</Text>
            <Text style={styles.subtitle}>
              Real-time updates, urgent alerts, and case activities
            </Text>
          </View>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unreadCount} New</Text>
            </View>
          )}
        </View>

        {/* Search Input Bar */}
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={16} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by case name, title, event..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
          {searchQuery ? (
            <Pressable onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color="#9CA3AF" />
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* Category Tabs (4 Strict Categories: All, Cases, Alerts, System) */}
      <View style={styles.tabsContainer}>
        {(['All', 'Cases', 'Alerts', 'System'] as const).map((cat) => {
          const catCount = allCombined.filter(n => cat === 'All' || n.category === cat).length;
          return (
            <Pressable
              key={cat}
              onPress={() => setActiveCategory(cat)}
              style={[
                styles.tabBtn,
                activeCategory === cat && styles.tabBtnActive,
              ]}
            >
              <Text
                style={[
                  styles.tabBtnText,
                  activeCategory === cat && styles.tabBtnTextActive,
                ]}
              >
                {cat} ({catCount})
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Toolbar actions */}
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
            size={15}
            color={unreadCount === 0 ? '#9CA3AF' : '#6D5DFC'}
          />
          <Text
            style={[
              styles.toolbarBtnText,
              unreadCount === 0 && { color: '#9CA3AF' },
            ]}
          >
            Mark All Read
          </Text>
        </Pressable>

        <Pressable
          onPress={clearAll}
          style={({ pressed }) => [styles.toolbarBtn, pressed && styles.toolbarBtnPressed]}
        >
          <Ionicons name="trash-outline" size={15} color="#EF4444" />
          <Text style={[styles.toolbarBtnText, { color: '#EF4444' }]}>
            Clear All
          </Text>
        </Pressable>
      </View>

      {(isLoading || isCasesLoading) && filteredNotifications.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6D5DFC" />
          <Text style={styles.loadingText}>Fetching case notifications...</Text>
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
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12.5,
    color: '#6B7280',
    marginTop: 2,
  },
  unreadBadge: {
    backgroundColor: '#EEECFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  unreadBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6D5DFC',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 38,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#1F2937',
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    gap: 8,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  tabBtnActive: {
    backgroundColor: '#6D5DFC',
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  tabBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  toolbarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  toolbarBtnPressed: {
    backgroundColor: '#E5E7EB',
  },
  toolbarBtnDisabled: {
    opacity: 0.4,
  },
  toolbarBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6D5DFC',
  },
  listContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 100 : 80,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  cardUnread: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D1D5DB',
  },
  cardPressed: {
    opacity: 0.95,
    backgroundColor: '#F9FAFB',
  },
  priorityLeftBorder: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    marginLeft: 4,
  },
  content: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  cardTitle: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#374151',
    flex: 1,
    marginRight: 6,
  },
  cardTitleUnread: {
    fontWeight: '700',
    color: '#111827',
  },
  timeText: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  caseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EEECFF',
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 4,
  },
  caseBadgeText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#6D5DFC',
  },
  descText: {
    fontSize: 12.5,
    color: '#4B5563',
    lineHeight: 17,
    marginBottom: 6,
  },
  metaFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  priorityTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  priorityTagText: {
    fontSize: 10,
    fontWeight: '700',
  },
  categoryTag: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6B7280',
  },
  actionColumn: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginLeft: 8,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3B82F6',
  },
  deleteBtn: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: '#FFF5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBtnPressed: {
    backgroundColor: '#FEE2E2',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13.5,
    color: '#6B7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 60,
  },
  emptyIconWrapper: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 19,
  },
});
