import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
  Modal,
  ActivityIndicator,
  Dimensions,
  Animated,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
// @ts-ignore
// eslint-disable-next-line import/no-unresolved
import { Ionicons } from '@expo/vector-icons';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { useAuthGuard } from '@/navigation/guards';
import { useUserStore } from '@/store/user';
import { useNotificationStore } from '@/store/notifications';
import { useToastContext } from '@/providers';
import { useThemeContext } from '@/providers/theme-provider';
import { CaseService } from '@/services/case.service';
import { NotificationService } from '@/services/notification.service';
import { CaseWorkspace, NotificationInboxItem } from '@/types';
import { Spacing, Radius, Shadows, Colors } from '@/theme';
import {
  Button,
  TextInput,
  Card,
  Badge,
  Avatar,
  ActionSheet,
  DeleteDialog,
  PageHeader,
} from '@/components/ui';

// Responsive width calculations
const { width: screenWidth } = Dimensions.get('window');
const isTablet = screenWidth >= 768;

// Helper components for redesigned Dashboard Cards
interface DashboardCardProps {
  title: string;
  value: number;
  iconName: string;
  iconColor: string;
  iconBgColor: string;
  helperText: string;
  statusLabel: string;
  statusType: 'neutral' | 'primary' | 'purple' | 'urgent' | 'completed';
  onPress?: () => void;
  isDark: boolean;
  theme: any;
}

const DashboardCard: React.FC<DashboardCardProps> = ({
  title,
  value,
  iconName,
  iconColor,
  iconBgColor,
  helperText,
  statusLabel,
  statusType,
  onPress,
  isDark,
  theme,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const shadowAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0.98,
        useNativeDriver: false,
        tension: 100,
        friction: 10,
      }),
      Animated.timing(shadowAnim, {
        toValue: 0.5,
        duration: 150,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: false,
        tension: 100,
        friction: 10,
      }),
      Animated.timing(shadowAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: false,
      }),
    ]).start();
  };

  // Determine colors based on statusType
  let pillBg = isDark ? '#2D2D3D' : '#F3F4F6';
  let pillTextColor = isDark ? '#9CA3AF' : '#6B7280';

  if (statusType === 'primary') {
    pillBg = isDark ? '#1E3A8A' : '#EBF5FF';
    pillTextColor = isDark ? '#93C5FD' : '#2563EB';
  } else if (statusType === 'purple') {
    pillBg = isDark ? '#4C1D95' : '#F5F3FF';
    pillTextColor = isDark ? '#C084FC' : '#7C3AED';
  } else if (statusType === 'urgent') {
    pillBg = isDark ? '#7F1D1D' : '#FEE2E2';
    pillTextColor = isDark ? '#FCA5A5' : '#EF4444';
  } else if (statusType === 'completed') {
    pillBg = isDark ? '#064E3B' : '#D1FAE5';
    pillTextColor = isDark ? '#6EE7B7' : '#10B981';
  }

  // Determine large number color based on statusType and value
  let valueColor = isDark ? '#F9FAFB' : '#1F2937';
  if (value === 0 && statusType !== 'completed') {
    valueColor = isDark ? '#6B7280' : '#8E8E93';
  } else if (statusType === 'primary') {
    valueColor = isDark ? '#60A5FA' : '#2563EB';
  } else if (statusType === 'purple') {
    valueColor = isDark ? '#A78BFA' : '#7C3AED';
  } else if (statusType === 'urgent') {
    valueColor = isDark ? '#F87171' : '#EF4444';
  } else if (statusType === 'completed') {
    valueColor = isDark ? '#34D399' : '#10B981';
  }

  const interpolatedShadowOpacity = shadowAnim.interpolate({
    inputRange: [0.5, 1],
    outputRange: [0.01, 0.04],
  });

  const cardBgColor = isDark ? '#1E1E24' : '#FFFFFF';
  const cardBorderColor = isDark ? '#2D2D35' : '#F0F0F0';
  const labelColor = isDark ? '#9CA3AF' : '#8E8E93';
  const helperTextColor = isDark ? '#9CA3AF' : '#6B7280';

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={{ width: '48%', marginBottom: 16 }}
    >
      <Animated.View
        style={[
          styles.statCard,
          {
            backgroundColor: cardBgColor,
            borderColor: cardBorderColor,
            transform: [{ scale: scaleAnim }],
            shadowOpacity: interpolatedShadowOpacity,
          },
        ]}
      >
        {/* Top: Circle Icon */}
        <View style={[styles.iconContainer, { backgroundColor: iconBgColor }]}>
          <Ionicons name={iconName} size={22} color={iconColor} />
        </View>

        {/* Middle: Title label + Large Value */}
        <View style={styles.cardContent}>
          <Text style={[styles.statLabel, { color: labelColor }]} numberOfLines={1}>
            {title}
          </Text>
          <Text style={[styles.statValue, { color: valueColor }]}>
            {value}
          </Text>
        </View>

        {/* Bottom: Status Pill & Helper Text */}
        <View style={styles.footerRow}>
          <View style={[styles.statusPill, { backgroundColor: pillBg }]}>
            <Text style={[styles.statusText, { color: pillTextColor }]}>
              {statusLabel}
            </Text>
          </View>
          <Text style={[styles.helperText, { color: helperTextColor }]} numberOfLines={1} ellipsizeMode="tail">
            {helperText}
          </Text>
        </View>
      </Animated.View>
    </Pressable>
  );
};

const SkeletonCard: React.FC<{ isDark: boolean }> = ({ isDark }) => {
  const animatedOpacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animatedOpacity, {
          toValue: 0.7,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedOpacity, {
          toValue: 0.3,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [animatedOpacity]);

  const cardBgColor = isDark ? '#1E1E24' : '#FFFFFF';
  const cardBorderColor = isDark ? '#2D2D35' : '#F0F0F0';
  const skeletonBg = isDark ? '#25252D' : '#F7F7F7';
  const skeletonSubBg = isDark ? '#32323C' : '#EBEBEB';

  return (
    <Animated.View
      style={[
        styles.statCardSkeleton,
        {
          backgroundColor: cardBgColor,
          borderColor: cardBorderColor,
          opacity: animatedOpacity,
        },
      ]}
    >
      <View style={[styles.skeletonIcon, { backgroundColor: skeletonSubBg }]} />
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <View style={[styles.skeletonTitle, { backgroundColor: skeletonSubBg }]} />
        <View style={[styles.skeletonValue, { backgroundColor: skeletonSubBg }]} />
      </View>
      <View style={[styles.skeletonFooter, { backgroundColor: skeletonBg }]}>
        <View style={[styles.skeletonPill, { backgroundColor: skeletonSubBg }]} />
        <View style={[styles.skeletonHelper, { backgroundColor: skeletonSubBg }]} />
      </View>
    </Animated.View>
  );
};

export default function DashboardScreen() {
  useAuthGuard();
  const router = useRouter();
  const { theme, isDark } = useThemeContext();
  const { showToast } = useToastContext();
  const insets = useSafeAreaInsets();
  
  const profile = useUserStore((s) => s.profile);
  const userName = profile?.name || 'Counsel';

  const unreadCount = useNotificationStore((s) => s.getUnreadCount());
  const fetchNotifications = useNotificationStore((s) => s.fetchNotifications);

  useEffect(() => {
    fetchNotifications(true);
    const interval = setInterval(() => {
      fetchNotifications(true);
    }, 15000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // State Management
  const [cases, setCases] = useState<CaseWorkspace[]>([]);
  const [notifications, setNotifications] = useState<NotificationInboxItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal / Dropdown / Dialog States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingCase, setEditingCase] = useState<CaseWorkspace | null>(null);
  const [selectedCaseForActions, setSelectedCaseForActions] = useState<CaseWorkspace | null>(null);
  const [isActionSheetOpen, setIsActionSheetOpen] = useState(false);
  const [caseToDeleteId, setCaseToDeleteId] = useState<string | null>(null);

  // Form States
  const [newCaseForm, setNewCaseForm] = useState({
    name: '',
    clientName: '',
    opponentName: '',
    caseType: '',
    courtName: '',
    summary: '',
    priority: 'Medium' as 'Low' | 'Medium' | 'High' | 'Urgent',
  });

  const [currentTime, setCurrentTime] = useState(new Date());

  // Background clock ticker
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Fetch all dashboard data from backend APIs
  const fetchDashboardData = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsSyncing(true);

    try {
      setError(null);
      // Fetch cases (projects) from API
      const casesRes = await CaseService.listCases();
      const casesData = Array.isArray(casesRes) ? casesRes : (casesRes?.data || []);
      setCases(casesData as any);

      // Fetch AI notifications
      const notifsRes = await NotificationService.getNotifications();
      const notifsData = Array.isArray(notifsRes) ? notifsRes : (notifsRes?.data || []);
      setNotifications(notifsData as any);
    } catch (err: any) {
      console.error('[DASHBOARD] Fetching error:', err);
      setError(err.message || 'Failed to fetch current litigation data from the backend.');
      showToast('error', 'Sync Failed', 'Failed to synchronize data with the backend.');
    } finally {
      setIsLoading(false);
      setIsSyncing(false);
    }
  }, [showToast]);

  // Run on mount and establish background synchronization (15 seconds)
  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(() => {
      fetchDashboardData(true);
    }, 15000);
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  // Pull to refresh handler
  const handlePullToRefresh = () => {
    fetchDashboardData(false);
  };

  // Helper date checker for hearings
  const isHearingToday = (dateStr?: string) => {
    if (!dateStr) return false;
    const todayStr = new Date().toISOString().split('T')[0];
    return dateStr.includes(todayStr) || new Date(dateStr).toDateString() === new Date().toDateString();
  };

  // --- Computed Stats (parities with web) ---
  const activeCasesList = useMemo(() => cases.filter((c) => c.status === 'Active' || !c.status), [cases]);
  const archivedCasesList = useMemo(() => cases.filter((c) => c.status === 'Archived'), [cases]);
  const completedCasesList = useMemo(() => cases.filter((c) => c.status === 'Closed'), [cases]);
  const highPriorityCasesList = useMemo(() => activeCasesList.filter((c) => c.priority === 'High' || c.priority === 'Urgent'), [activeCasesList]);

  const totalActiveCases = activeCasesList.length;

  // Compute stats lists
  const todaysHearingsList = useMemo(() => {
    const list: any[] = [];
    activeCasesList.forEach((c) => {
      if (c.hearings && c.hearings.length > 0) {
        c.hearings.forEach((h) => {
          if (isHearingToday(h.date)) {
            list.push({
              caseId: c._id,
              caseName: c.name,
              court: h.courtName || c.opponentName || 'District Court',
              judge: h.notes || 'Presiding Magistrate',
              time: h.time || '10:00 AM',
              title: h.status || 'Scheduled Hearing',
              priority: c.priority || 'Medium',
            });
          }
        });
      }
    });
    return list;
  }, [activeCasesList]);

  const totalTodaysHearingsCount = todaysHearingsList.length;

  const totalPendingDrafts = useMemo(() => {
    return activeCasesList.reduce((acc, c) => acc + (c.documents?.filter(d => d.type === 'Filing' || d.type === 'Other').length || 0), 0);
  }, [activeCasesList]);

  const totalPendingResearch = useMemo(() => {
    return activeCasesList.reduce((acc, c) => acc + (c.research?.length || 0), 0);
  }, [activeCasesList]);

  // Recent cases (sorted by last updated)
  const recentCasesList = useMemo(() => {
    return [...cases].sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
  }, [cases]);

  // Continue working case (last updated active case)
  const continueWorkingCase = useMemo(() => {
    return [...activeCasesList].sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime())[0];
  }, [activeCasesList]);

  // Upcoming deadlines
  const sortedDeadlines = useMemo(() => {
    const list: any[] = [];
    activeCasesList.forEach((c) => {
      if (c.hearings) {
        c.hearings.forEach((h) => {
          if (h.date) {
            const hDate = new Date(h.date);
            if (hDate.getTime() > Date.now() && !isHearingToday(h.date)) {
              list.push({
                caseName: c.name,
                title: `Hearing: ${h.notes || 'Scheduled Docket'}`,
                date: hDate,
                type: 'hearing',
              });
            }
          }
        });
      }
      if (c.facts) {
        c.facts.forEach((f) => {
          if (f.date) {
            const fDate = new Date(f.date);
            if (fDate.getTime() > Date.now()) {
              list.push({
                caseName: c.name,
                title: `Fact Event: ${f.event}`,
                date: fDate,
                type: 'milestone',
              });
            }
          }
        });
      }
    });
    return list.sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, 4);
  }, [activeCasesList]);

  // Case Analytics (Strength)
  const averageStrength = useMemo(() => {
    let sum = 0;
    let count = 0;
    activeCasesList.forEach((c) => {
      const strength = c.intelligence?.strengthScore;
      if (strength !== undefined) {
        sum += strength;
        count++;
      }
    });
    return count > 0 ? Math.round(sum / count) : 75;
  }, [activeCasesList]);

  const categoryAnalytics = useMemo(() => {
    const map: Record<string, number> = {};
    activeCasesList.forEach((c) => {
      const cat = c.caseType || 'General Civil';
      map[cat] = (map[cat] || 0) + 1;
    });
    return Object.keys(map)
      .map((key) => ({
        name: key,
        count: map[key],
        percentage: Math.round((map[key] / totalActiveCases) * 100) || 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
  }, [activeCasesList, totalActiveCases]);

  // AI Insights
  const aiInsightsList = useMemo(() => {
    const list: any[] = [];
    activeCasesList.forEach((c) => {
      if (c.documents && c.documents.length > 0 && c.documents.some((d) => d.tags?.includes('Vulnerable'))) {
        list.push({
          id: `ins-${c._id}-contract`,
          caseName: c.name,
          tip: 'A document uploaded has unlinked contracts with risk flags. Verify limiting dates.',
          type: 'warning',
        });
      }
      if (c.hearings && c.hearings.length > 0 && !c.hearings.some((h) => h.status === 'Completed')) {
        list.push({
          id: `ins-${c._id}-hearings`,
          caseName: c.name,
          tip: 'First hearing is scheduled. Compile case docket binder early to avoid administrative delays.',
          type: 'strategy',
        });
      }
    });

    if (list.length === 0) {
      list.push({
        id: 'ins-def-1',
        caseName: 'Global Recommendation',
        tip: 'AI Strategy recommends checking evidence mappings on commercial recovery filings early.',
        type: 'strategy',
      });
    }
    return list;
  }, [activeCasesList]);

  // Simulation AI activity logs
  const recentAiActivities = useMemo(() => {
    const list: any[] = [];
    recentCasesList.slice(0, 3).forEach((c, idx) => {
      const activities = [
        'AI analyzed contract vulnerabilities & calculated risk score',
        'AI compiled trial docket preparation binder',
        'AI researched matching Supreme Court precedents',
      ];
      list.push({
        caseName: c.name,
        activity: activities[idx % activities.length],
        time: c.updatedAt ? new Date(c.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now',
      });
    });
    return list;
  }, [recentCasesList]);

  // --- Handlers ---
  const handleCreateCase = async () => {
    if (!newCaseForm.name) {
      showToast('error', 'Error', 'Case / Suit Name is required.');
      return;
    }

    try {
      setIsLoading(true);
      const res = await CaseService.createCase({
        name: newCaseForm.name,
        clientName: newCaseForm.clientName,
        opponentName: newCaseForm.opponentName,
        caseType: newCaseForm.caseType,
        courtName: newCaseForm.courtName,
        summary: newCaseForm.summary,
        priority: newCaseForm.priority,
        status: 'Active',
        stage: 'Pre-litigation',
        lawyers: [],
        facts: [],
        legalIssues: [],
        documents: [],
        evidence: [],
        savedPrecedents: [],
        intelligence: {
          strengthScore: 70,
          winProbability: 55,
          riskLevel: 'Medium',
          weakPoints: [],
          missingEvidence: [],
          opponentStrategies: [],
          strategyRecommendations: [],
        },
        tasks: [],
        communicationLogs: [],
        research: [],
        hearings: [],
      });

      if (res.success) {
        showToast('success', 'Success', 'Case folder created successfully.');
        setIsCreateModalOpen(false);
        setNewCaseForm({
          name: '',
          clientName: '',
          opponentName: '',
          caseType: '',
          courtName: '',
          summary: '',
          priority: 'Medium',
        });
        fetchDashboardData(true);
      }
    } catch (err: any) {
      showToast('error', 'Error', err.message || 'Failed to create case folder.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateCase = async () => {
    if (!editingCase || !editingCase.name) {
      showToast('error', 'Error', 'Case Name is required.');
      return;
    }

    try {
      setIsLoading(true);
      const res = await CaseService.updateCase(editingCase._id, {
        name: editingCase.name,
        clientName: editingCase.clientName,
        opponentName: editingCase.opponentName,
        caseType: editingCase.caseType,
        courtName: editingCase.courtName,
        summary: editingCase.summary,
        priority: editingCase.priority,
      });

      if (res.success) {
        showToast('success', 'Success', 'Case details updated.');
        setEditingCase(null);
        fetchDashboardData(true);
      }
    } catch (err: any) {
      showToast('error', 'Error', err.message || 'Failed to update case.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleArchive = useCallback(async (c: CaseWorkspace) => {
    const newStatus = c.status === 'Archived' ? 'Active' : 'Archived';
    try {
      setIsLoading(true);
      const res = await CaseService.updateCase(c._id, { status: newStatus });
      if (res.success) {
        showToast('success', 'Updated', newStatus === 'Archived' ? 'Case folder archived.' : 'Case folder restored.');
        fetchDashboardData(true);
      }
    } catch (err: any) {
      showToast('error', 'Error', err.message || 'Failed to change archive status.');
    } finally {
      setIsLoading(false);
    }
  }, [fetchDashboardData, showToast]);

  const handleDeleteCase = async () => {
    if (!caseToDeleteId) return;

    try {
      setIsLoading(true);
      const res = await CaseService.deleteCase(caseToDeleteId);
      if (res.success) {
        showToast('success', 'Deleted', 'Case folder permanently deleted.');
        setCaseToDeleteId(null);
        fetchDashboardData(true);
      }
    } catch (err: any) {
      showToast('error', 'Error', err.message || 'Failed to delete case.');
    } finally {
      setIsLoading(false);
    }
  };

  const unreadNotificationsCount = useMemo(() => {
    return notifications.filter((n) => !n.isRead).length;
  }, [notifications]);

  // Format header date string
  const formatDateString = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const caseActionItems = useMemo(() => {
    if (!selectedCaseForActions) return [];
    const isArchived = selectedCaseForActions.status === 'Archived';

    return [
      {
        label: 'Open Workspace',
        icon: '⚖️',
        onPress: () => router.push(`/workspace/${selectedCaseForActions._id}` as any),
      },
      {
        label: 'Edit Details',
        icon: '📝',
        onPress: () => setEditingCase({ ...selectedCaseForActions }),
      },
      {
        label: isArchived ? 'Restore Case' : 'Archive Case',
        icon: '📁',
        onPress: () => handleToggleArchive(selectedCaseForActions),
      },
      {
        label: 'Delete Case',
        icon: '🗑️',
        isDestructive: true,
        onPress: () => setCaseToDeleteId(selectedCaseForActions._id),
      },
    ];
  }, [selectedCaseForActions, router, handleToggleArchive]);

  // Loading Screen
  // We allow the dashboard to render immediately so that we can show skeleton loader cards.
  /*
  if (isLoading && cases.length === 0) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading litigation dashboard...</Text>
      </ThemedView>
    );
  }
  */

  return (
    <ThemedView style={styles.container}>
      {/* Refined Home Header with Safe Area and Hierarchical Greeting */}
      <View
        style={{
          paddingTop: insets.top > 0 ? insets.top + 24 : 36, // Proper top padding/safe area for breathing space
          paddingBottom: 20, // Comfortable padding below content
          paddingHorizontal: 20, // Clean breathing margin from screen edges
          backgroundColor: theme.card,
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
        }}
      >
        {/* Top Row: Two-line Greeting and Right-aligned Notification Icon (Vertically Centered) */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <View style={{ flex: 1, marginRight: 16 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: theme.textSecondary, letterSpacing: 0.1 }}>
              Good Morning,
            </Text>
            <Text style={{ fontSize: 24, fontWeight: '800', color: theme.textPrimary, marginTop: 4, letterSpacing: -0.3 }}>
              Advocate {userName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            {isSyncing && (
              <ActivityIndicator size="small" color={theme.primary} />
            )}
            
            <Pressable
              onPress={() => router.push('/(tabs)/notifications')}
              style={({ pressed }) => [
                {
                  width: 44,
                  height: 44,
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderRadius: 22,
                  borderWidth: 1,
                  borderColor: theme.border,
                  backgroundColor: theme.card,
                },
                pressed && { backgroundColor: theme.pressed || '#F3F4F6' },
              ]}
              accessibilityLabel="Open Notifications"
              accessibilityRole="button"
            >
              <Ionicons name="notifications-outline" size={22} color={theme.textPrimary} />
              {unreadCount > 0 && (
                <View
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    minWidth: 16,
                    height: 16,
                    borderRadius: 8,
                    backgroundColor: theme.danger || '#EF4444',
                    justifyContent: 'center',
                    alignItems: 'center',
                    paddingHorizontal: 2,
                    borderWidth: 1.5,
                    borderColor: theme.card,
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontSize: 8, fontWeight: '800', textAlign: 'center' }}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
            </Pressable>
          </View>
        </View>

        {/* Date: Placed below the greeting block with comfortable vertical spacing */}
        <View style={{ marginTop: 12 }}>
          <Text style={{ fontSize: 12, color: theme.textMuted || '#9CA3AF', fontWeight: '500', letterSpacing: 0.1 }}>
            {formatDateString(currentTime)}
          </Text>
        </View>
      </View>
      <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isSyncing && !isLoading}
              onRefresh={handlePullToRefresh}
              colors={[theme.primary]}
              tintColor={theme.primary}
            />
          }
        >
          {error && (
            <View style={[styles.errorAlert, { backgroundColor: theme.surfaceVariant, borderColor: theme.danger }]}>
              <Text style={[styles.errorAlertText, { color: theme.danger }]}>⚠️ {error}</Text>
            </View>
          )}

          {/* 2. Today's Overview */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>{"Today's Overview"}</Text>
            <View style={styles.statsGrid}>
              {isLoading ? (
                <>
                  <SkeletonCard isDark={isDark} />
                  <SkeletonCard isDark={isDark} />
                  <SkeletonCard isDark={isDark} />
                  <SkeletonCard isDark={isDark} />
                </>
              ) : (
                <>
                  <DashboardCard
                    title="Active Cases"
                    value={totalActiveCases}
                    iconName="briefcase-outline"
                    iconColor={isDark ? '#C084FC' : '#7C3AED'}
                    iconBgColor={isDark ? '#3B0764' : '#F5F3FF'}
                    helperText={`${totalActiveCases} Active`}
                    statusLabel={totalActiveCases === 0 ? 'EMPTY' : 'LIVE'}
                    statusType={totalActiveCases === 0 ? 'neutral' : (totalActiveCases > 5 ? 'purple' : 'primary')}
                    onPress={() => router.push('/(tabs)/cases')}
                    isDark={isDark}
                    theme={theme}
                  />

                  <DashboardCard
                    title="Today's Hearings"
                    value={totalTodaysHearingsCount}
                    iconName="calendar-outline"
                    iconColor={isDark ? '#60A5FA' : '#2563EB'}
                    iconBgColor={isDark ? '#1E3A8A' : '#EBF5FF'}
                    helperText={totalTodaysHearingsCount === 0 ? 'Nothing scheduled' : 'Next hearing today'}
                    statusLabel={totalTodaysHearingsCount === 0 ? 'EMPTY' : 'TODAY'}
                    statusType={totalTodaysHearingsCount === 0 ? 'neutral' : 'urgent'}
                    onPress={() => router.push('/(tabs)/cases')}
                    isDark={isDark}
                    theme={theme}
                  />

                  <DashboardCard
                    title="Pending Drafts"
                    value={totalPendingDrafts}
                    iconName="document-text-outline"
                    iconColor={isDark ? '#F97316' : '#EA580C'}
                    iconBgColor={isDark ? '#431407' : '#FFF7ED'}
                    helperText={totalPendingDrafts === 0 ? 'Nothing pending' : 'Requires review'}
                    statusLabel={totalPendingDrafts === 0 ? 'UPDATED' : 'PENDING'}
                    statusType={totalPendingDrafts === 0 ? 'completed' : (totalPendingDrafts > 5 ? 'urgent' : 'primary')}
                    onPress={() => router.push('/(tabs)/tools')}
                    isDark={isDark}
                    theme={theme}
                  />

                  <DashboardCard
                    title="Pending Research"
                    value={totalPendingResearch}
                    iconName="search-outline"
                    iconColor={isDark ? '#4ADE80' : '#16A34A'}
                    iconBgColor={isDark ? '#052E16' : '#F0FDF4'}
                    helperText={totalPendingResearch === 0 ? 'Up to date' : 'Research needed'}
                    statusLabel={totalPendingResearch === 0 ? 'UPDATED' : 'AI GENERATED'}
                    statusType={totalPendingResearch === 0 ? 'completed' : (totalPendingResearch > 5 ? 'purple' : 'primary')}
                    onPress={() => router.push('/(tabs)/tools')}
                    isDark={isDark}
                    theme={theme}
                  />
                </>
              )}
            </View>
          </View>

          {/* 3. Continue Working */}
          {continueWorkingCase && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Continue Working</Text>
              <Pressable
                onPress={() => router.push(`/workspace/${continueWorkingCase._id}` as any)}
                style={({ pressed }) => [
                  styles.continueCard,
                  { backgroundColor: theme.card, borderColor: pressed ? theme.primary : theme.border },
                  Shadows.card,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Continue working on case: ${continueWorkingCase.name}`}
              >
                <View style={styles.continueHeader}>
                  <Badge label="Last Updated Case" variant="info" />
                  <Ionicons name="open-outline" size={18} color={theme.primary} />
                </View>
                <Text style={[styles.continueTitle, { color: theme.textPrimary }]}>{continueWorkingCase.name}</Text>
                <Text style={[styles.continueSummary, { color: theme.textSecondary }]} numberOfLines={2}>
                  {continueWorkingCase.summary || 'No factual summary configured yet.'}
                </Text>
                <View style={[styles.continueFooter, { borderTopColor: theme.divider }]}>
                  <Text style={[styles.continueInfoText, { color: theme.textSecondary }]}>
                    Hearings: <Text style={{ color: theme.textPrimary, fontWeight: '700' }}>{continueWorkingCase.hearings?.length || 0}</Text>
                  </Text>
                  <Text style={[styles.continueInfoText, { color: theme.textSecondary }]}>
                    Evidence: <Text style={{ color: theme.textPrimary, fontWeight: '700' }}>{continueWorkingCase.evidence?.length || 0}</Text>
                  </Text>
                  <Text style={[styles.continueInfoText, { color: theme.textSecondary }]}>
                    Contracts: <Text style={{ color: theme.textPrimary, fontWeight: '700' }}>{continueWorkingCase.documents?.filter(d => d.type === 'Agreement' || d.tags?.includes('Contract'))?.length || 0}</Text>
                  </Text>
                </View>
              </Pressable>
            </View>
          )}

          {/* 4. Quick Actions */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Quick Actions</Text>
            <Card style={styles.quickActionsCard}>
              <Pressable
                onPress={() => setIsCreateModalOpen(true)}
                style={({ pressed }) => [
                  styles.quickActionBtn,
                  { borderColor: theme.border, backgroundColor: pressed ? theme.surfaceVariant : '#FFFFFF' }
                ]}
                accessibilityRole="button"
                accessibilityLabel="New Case"
              >
                <Text style={[styles.quickActionBtnText, { color: theme.textSecondary }]}>NEW CASE</Text>
              </Pressable>
              <Pressable
                onPress={() => router.push('/(tabs)/chat')}
                style={({ pressed }) => [
                  styles.quickActionBtn,
                  { borderColor: theme.border, backgroundColor: pressed ? theme.surfaceVariant : '#FFFFFF' }
                ]}
                accessibilityRole="button"
                accessibilityLabel="AI Legal Assistant"
              >
                <Text style={[styles.quickActionBtnText, { color: theme.textSecondary }]}>AI LEGAL ASSISTANT</Text>
              </Pressable>
            </Card>
          </View>
        </ScrollView>

        {/* ActionSheet Menu for Case List Items */}
        <ActionSheet
          visible={isActionSheetOpen}
          onClose={() => setIsActionSheetOpen(false)}
          title={selectedCaseForActions?.name ? `Options: ${selectedCaseForActions.name}` : 'Case Actions'}
          items={caseActionItems}
        />

        {/* Delete Dialog Confirmation */}
        <DeleteDialog
          visible={caseToDeleteId !== null}
          onConfirm={handleDeleteCase}
          onCancel={() => setCaseToDeleteId(null)}
          title="Delete Case Folder?"
          description="Are you sure you want to permanently delete this case folder? All associated timelines, research, and drafts will be deleted."
        />

        {/* Modal: Create Case Folder */}
        <Modal
          visible={isCreateModalOpen}
          animationType="slide"
          transparent
          onRequestClose={() => setIsCreateModalOpen(false)}
        >
          <View style={[styles.modalOverlay, { backgroundColor: theme.overlay }]}>
            <View style={[styles.modalBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalHeaderTitle, { color: theme.textPrimary }]}>CREATE CASE FOLDER</Text>
                <Pressable onPress={() => setIsCreateModalOpen(false)}>
                  <Text style={{ fontSize: 20, color: theme.textSecondary }}>✕</Text>
                </Pressable>
              </View>

              <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                <TextInput
                  label="Case / Suit Name *"
                  placeholder="e.g. Rajesh Sharma vs Amit Verma"
                  value={newCaseForm.name}
                  onChangeText={(text) => setNewCaseForm({ ...newCaseForm, name: text })}
                  containerStyle={{ marginBottom: 12 }}
                />

                <TextInput
                  label="Client Name"
                  placeholder="Plaintiff Name"
                  value={newCaseForm.clientName}
                  onChangeText={(text) => setNewCaseForm({ ...newCaseForm, clientName: text })}
                  containerStyle={{ marginBottom: 12 }}
                />

                <TextInput
                  label="Opponent Party"
                  placeholder="Defendant Name"
                  value={newCaseForm.opponentName}
                  onChangeText={(text) => setNewCaseForm({ ...newCaseForm, opponentName: text })}
                  containerStyle={{ marginBottom: 12 }}
                />

                <TextInput
                  label="Legal Domain"
                  placeholder="e.g. Commercial Contract Law"
                  value={newCaseForm.caseType}
                  onChangeText={(text) => setNewCaseForm({ ...newCaseForm, caseType: text })}
                  containerStyle={{ marginBottom: 12 }}
                />

                <TextInput
                  label="Presiding Court"
                  placeholder="e.g. Delhi High Court"
                  value={newCaseForm.courtName}
                  onChangeText={(text) => setNewCaseForm({ ...newCaseForm, courtName: text })}
                  containerStyle={{ marginBottom: 12 }}
                />

                <TextInput
                  label="Case Statement Summary"
                  placeholder="Provide brief background facts..."
                  value={newCaseForm.summary}
                  onChangeText={(text) => setNewCaseForm({ ...newCaseForm, summary: text })}
                  multiline
                  numberOfLines={3}
                  containerStyle={{ marginBottom: 16 }}
                />

                {/* Priority Selector buttons */}
                <Text style={[styles.selectorLabel, { color: theme.textSecondary }]}>Priority Status</Text>
                <View style={styles.priorityRow}>
                  {(['Low', 'Medium', 'High', 'Urgent'] as const).map((p) => (
                    <Pressable
                      key={p}
                      onPress={() => setNewCaseForm({ ...newCaseForm, priority: p })}
                      style={[
                        styles.priorityBtn,
                        {
                          borderColor: theme.border,
                          backgroundColor: newCaseForm.priority === p ? theme.primary : 'transparent',
                        },
                      ]}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: '700',
                          color: newCaseForm.priority === p ? '#FFFFFF' : theme.textSecondary,
                        }}
                      >
                        {p}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <Button
                  title="Save Case Folder"
                  variant="primary"
                  onPress={handleCreateCase}
                  style={{ marginTop: 24, marginBottom: 40 }}
                />
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Modal: Edit Case Folder */}
        <Modal
          visible={editingCase !== null}
          animationType="slide"
          transparent
          onRequestClose={() => setEditingCase(null)}
        >
          <View style={[styles.modalOverlay, { backgroundColor: theme.overlay }]}>
            <View style={[styles.modalBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalHeaderTitle, { color: theme.textPrimary }]}>EDIT CASE DETAILS</Text>
                <Pressable onPress={() => setEditingCase(null)}>
                  <Text style={{ fontSize: 20, color: theme.textSecondary }}>✕</Text>
                </Pressable>
              </View>

              {editingCase && (
                <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                  <TextInput
                    label="Case / Suit Name *"
                    placeholder="e.g. Rajesh Sharma vs Amit Verma"
                    value={editingCase.name}
                    onChangeText={(text) => setEditingCase({ ...editingCase, name: text })}
                    containerStyle={{ marginBottom: 12 }}
                  />

                  <TextInput
                    label="Client Name"
                    placeholder="Plaintiff Name"
                    value={editingCase.clientName || ''}
                    onChangeText={(text) => setEditingCase({ ...editingCase, clientName: text })}
                    containerStyle={{ marginBottom: 12 }}
                  />

                  <TextInput
                    label="Opponent Party"
                    placeholder="Defendant Name"
                    value={editingCase.opponentName || ''}
                    onChangeText={(text) => setEditingCase({ ...editingCase, opponentName: text })}
                    containerStyle={{ marginBottom: 12 }}
                  />

                  <TextInput
                    label="Legal Domain"
                    placeholder="e.g. Commercial Contract Law"
                    value={editingCase.caseType || ''}
                    onChangeText={(text) => setEditingCase({ ...editingCase, caseType: text })}
                    containerStyle={{ marginBottom: 12 }}
                  />

                  <TextInput
                    label="Presiding Court"
                    placeholder="e.g. Delhi High Court"
                    value={editingCase.courtName || ''}
                    onChangeText={(text) => setEditingCase({ ...editingCase, courtName: text })}
                    containerStyle={{ marginBottom: 12 }}
                  />

                  <TextInput
                    label="Case Statement Summary"
                    placeholder="Provide brief background facts..."
                    value={editingCase.summary || ''}
                    onChangeText={(text) => setEditingCase({ ...editingCase, summary: text })}
                    multiline
                    numberOfLines={3}
                    containerStyle={{ marginBottom: 16 }}
                  />

                  {/* Priority Selector buttons */}
                  <Text style={[styles.selectorLabel, { color: theme.textSecondary }]}>Priority Status</Text>
                  <View style={styles.priorityRow}>
                    {(['Low', 'Medium', 'High', 'Urgent'] as const).map((p) => (
                      <Pressable
                        key={p}
                        onPress={() => setEditingCase({ ...editingCase, priority: p })}
                        style={[
                          styles.priorityBtn,
                          {
                            borderColor: theme.border,
                            backgroundColor: editingCase.priority === p ? theme.primary : 'transparent',
                          },
                        ]}
                      >
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: '700',
                            color: editingCase.priority === p ? '#FFFFFF' : theme.textSecondary,
                          }}
                        >
                          {p}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  <Button
                    title="Save Changes"
                    variant="primary"
                    onPress={handleUpdateCase}
                    style={{ marginTop: 24, marginBottom: 40 }}
                  />
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>

      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing[24],
  },
  loadingText: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: Spacing[12],
  },
  headerContainer: {
    paddingHorizontal: Spacing[20],
    paddingVertical: Spacing[12],
    borderBottomWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flex: 1,
    marginRight: Spacing[12],
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  greetingText: {
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 22,
  },
  spinner: {
    marginLeft: 8,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  newCaseHeaderBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  newCaseHeaderBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  scrollContent: {
    paddingHorizontal: Spacing[20],
    paddingTop: Spacing[16],
    paddingBottom: Spacing[40],
    maxWidth: isTablet ? 720 : undefined,
    alignSelf: isTablet ? 'center' : undefined,
    width: '100%',
  },
  errorAlert: {
    padding: Spacing[12],
    borderWidth: 1,
    borderRadius: Radius.md,
    marginBottom: Spacing[16],
  },
  errorAlertText: {
    fontSize: 13,
    fontWeight: '700',
  },
  section: {
    marginBottom: Spacing[24],
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing[12],
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginBottom: Spacing[12],
  },
  titleWithIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing[12],
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '100%',
    height: 140,
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
    justifyContent: 'space-between',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 0,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 30,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: {
    marginTop: 4,
    flex: 1,
    justifyContent: 'center',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 6,
  },
  statusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  helperText: {
    fontSize: 10,
    fontWeight: '600',
    flex: 1,
  },
  statCardSkeleton: {
    width: '48%',
    height: 140,
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
    marginBottom: 16,
    justifyContent: 'space-between',
  },
  skeletonIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  skeletonTitle: {
    height: 10,
    borderRadius: 4,
    width: '70%',
    marginTop: 6,
  },
  skeletonValue: {
    height: 26,
    borderRadius: 6,
    width: '45%',
    marginTop: 4,
  },
  skeletonFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 16,
    width: '100%',
    backgroundColor: 'transparent',
  },
  skeletonPill: {
    width: 45,
    height: 12,
    borderRadius: 6,
  },
  skeletonHelper: {
    width: 60,
    height: 8,
    borderRadius: 4,
    marginLeft: 6,
  },
  continueCard: {
    padding: Spacing[16],
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  continueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  continueTitle: {
    fontSize: 17,
    fontWeight: '900',
    marginTop: Spacing[8],
  },
  continueSummary: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  continueFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    marginTop: Spacing[12],
    paddingTop: Spacing[10],
  },
  continueInfoText: {
    fontSize: 11,
    fontWeight: '600',
  },
  listContainer: {
    gap: Spacing[12],
  },
  listItem: {
    borderWidth: 1,
    borderRadius: Radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  listItemPress: {
    flex: 1,
  },
  listItemContent: {
    padding: Spacing[14],
  },
  listItemTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  listItemSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    marginTop: 6,
  },
  listItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 10,
  },
  listItemOpenBtn: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listItemOpenBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  dotButton: {
    width: 44,
    height: 70,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotButtonText: {
    fontSize: 20,
    fontWeight: '800',
  },
  emptyBox: {
    paddingVertical: Spacing[20],
    paddingHorizontal: Spacing[16],
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 18,
  },
  hearingCard: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing[14],
  },
  hearingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  hearingLeft: {
    flex: 1,
    marginRight: Spacing[8],
  },
  hearingCaseName: {
    fontSize: 14,
    fontWeight: '800',
  },
  hearingDetails: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  hearingTitleText: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
    fontStyle: 'italic',
  },
  hearingBadgeTime: {
    paddingHorizontal: Spacing[8],
    paddingVertical: Spacing[4],
    borderRadius: Radius.sm,
  },
  hearingTimeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  todayOnlyBadge: {
    backgroundColor: '#EEECFF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginLeft: 8,
  },
  todayOnlyBadgeText: {
    color: '#6D5DFC',
    fontSize: 9,
    fontWeight: '800',
  },
  deadlineCard: {
    padding: Spacing[16],
  },
  deadlineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing[10],
    borderBottomWidth: 1,
  },
  deadlineLeft: {
    flex: 1,
    marginRight: Spacing[12],
  },
  deadlineTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  deadlineCase: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
  deadlineDateBadge: {
    paddingHorizontal: Spacing[8],
    paddingVertical: Spacing[4],
    borderRadius: Radius.sm,
  },
  deadlineDateText: {
    fontSize: 10,
    fontWeight: '700',
  },
  analyticsCard: {
    padding: Spacing[16],
  },
  analyticsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing[8],
  },
  analyticsLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  analyticsPercent: {
    fontSize: 14,
    fontWeight: '900',
  },
  progressTrack: {
    height: 8,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: Radius.full,
  },
  distributionList: {
    borderTopWidth: 1,
    marginTop: Spacing[16],
    paddingTop: Spacing[12],
  },
  distHeader: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing[8],
  },
  distRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing[4],
  },
  distName: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  distCount: {
    fontSize: 12,
    fontWeight: '700',
  },
  insightsList: {
    gap: Spacing[12],
  },
  insightCard: {
    padding: Spacing[12],
    borderWidth: 1.5,
    borderRadius: Radius.md,
  },
  insightTip: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  insightBadgeContainer: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  insightBadgeText: {
    color: '#4B5563',
    fontSize: 9,
    fontWeight: '800',
  },
  activityCard: {
    padding: Spacing[16],
  },
  activityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: Spacing[10],
    borderBottomWidth: 1,
  },
  activityText: {
    fontSize: 12,
    fontWeight: '700',
  },
  activityCase: {
    fontSize: 10,
    fontWeight: '800',
    marginTop: 2,
  },
  activityTime: {
    fontSize: 10,
    fontWeight: '600',
    marginLeft: Spacing[8],
  },
  closedCard: {
    padding: Spacing[12],
  },
  closedItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing[6],
    borderBottomWidth: 1,
  },
  closedName: {
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
    marginRight: 6,
  },
  restoreLink: {
    fontSize: 9,
    fontWeight: '800',
  },
  quickActionsCard: {
    padding: Spacing[16],
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  quickActionBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBox: {
    borderTopWidth: 1,
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    padding: Spacing[20],
    height: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing[16],
    paddingBottom: Spacing[10],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#CCCCCC',
  },
  modalHeaderTitle: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },
  modalScroll: {
    flex: 1,
  },
  selectorLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: Spacing[8],
  },
  priorityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing[6],
  },
  priorityBtn: {
    flex: 1,
    height: 38,
    borderWidth: 1.5,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
