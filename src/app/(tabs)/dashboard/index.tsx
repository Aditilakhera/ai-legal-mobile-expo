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
import { useTranslation, formatRelativeDate, formatTime } from '@/localization';
import { NotificationService } from '@/services/notification.service';
import { CaseWorkspace, NotificationInboxItem } from '@/types';
import { Spacing, Radius, Shadows, Colors } from '@/theme';
import {
  Button,
  TextInput,
  DatePicker,
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
  const styles = getStyles(theme);

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

  const cardBgColor = theme.card;
  const cardBorderColor = theme.border;
  const labelColor = theme.textSecondary;
  const helperTextColor = theme.textSecondary;

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

  const { theme } = useThemeContext();
  const styles = getStyles(theme);
  const cardBgColor = theme.card;
  const cardBorderColor = theme.border;
  const skeletonBg = theme.surface;
  const skeletonSubBg = theme.divider;

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
  const styles = useMemo(() => getStyles(theme), [theme]);
  const { showToast } = useToastContext();
  const insets = useSafeAreaInsets();
  const { t, language } = useTranslation();
  
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
    registrationNumber: '',
    clientName: '',
    clientRole: '',
    objectorOpponent: '',
    opponentName: '',
    opponentRole: '',
    caseType: '',
    customCaseType: '',
    legalDomain: '',
    courtName: '',
    summary: '',
    additionalNotes: '',
    priority: 'Medium' as 'Low' | 'Medium' | 'High' | 'Urgent',
    caseReceivedOn: '',
    countryCode: '+91',
    clientContact: '',
    advocateName: '',
    hearingDate: '',
    stage: 'Pre-litigation' as 'Pre-litigation' | 'Notice' | 'Court' | 'Judgment' | 'Settled',
  });
  const [showCaseTypePicker, setShowCaseTypePicker] = useState(false);
  const [showLegalDomainPicker, setShowLegalDomainPicker] = useState(false);
  const [showClientRolePicker, setShowClientRolePicker] = useState(false);
  const [showOpponentRolePicker, setShowOpponentRolePicker] = useState(false);
  const [showStagePicker, setShowStagePicker] = useState(false);
  const [showCreateDatePicker, setShowCreateDatePicker] = useState<'received' | 'hearing' | null>(null);

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
      showToast('error', t('common.error'), t('cases.caseTitleRequired'));
      return;
    }

    if (!newCaseForm.clientName) {
      showToast('error', t('common.error'), t('cases.clientNameRequired'));
      return;
    }

    if (!newCaseForm.clientContact) {
      showToast('error', t('common.error'), t('cases.clientContactRequired'));
      return;
    }

    if (!newCaseForm.caseType) {
      showToast('error', t('common.error'), t('cases.caseCategoryRequired'));
      return;
    }

    if (newCaseForm.caseType === 'Custom' && !newCaseForm.customCaseType) {
      showToast('error', t('common.error'), t('cases.enterCustomTypeErr'));
      return;
    }

    const finalCaseType = newCaseForm.caseType === 'Custom' ? newCaseForm.customCaseType : newCaseForm.caseType;

    // Build initial hearing from hearingDate if provided
    const initialHearings: any[] = [];
    if (newCaseForm.hearingDate) {
      initialHearings.push({
        date: newCaseForm.hearingDate,
        status: 'Scheduled',
        title: 'First Hearing',
        notes: '',
      });
    }

    // Build initial lawyer entry from advocate name
    const initialLawyers: any[] = [];
    if (newCaseForm.advocateName) {
      initialLawyers.push({
        name: newCaseForm.advocateName,
        role: 'Advocate',
        contact: newCaseForm.countryCode + newCaseForm.clientContact,
      });
    }

    try {
      setIsLoading(true);
      const res = await CaseService.createCase({
        name: newCaseForm.name,
        registrationNumber: newCaseForm.registrationNumber,
        clientName: newCaseForm.clientName,
        clientRole: newCaseForm.clientRole,
        opponentRole: newCaseForm.opponentRole,
        objectorOpponent: newCaseForm.objectorOpponent,
        opponentName: newCaseForm.opponentName,
        caseType: finalCaseType || newCaseForm.caseType,
        legalDomain: newCaseForm.legalDomain,
        courtName: newCaseForm.courtName,
        caseReceivedOn: newCaseForm.caseReceivedOn,
        countryCode: newCaseForm.countryCode,
        clientContact: newCaseForm.clientContact,
        summary: newCaseForm.summary,
        additionalNotes: newCaseForm.additionalNotes,
        priority: newCaseForm.priority,
        status: 'Active',
        stage: newCaseForm.stage,
        lawyers: initialLawyers,
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
        hearings: initialHearings,
      } as any);

      if (res.success) {
        showToast('success', t('common.success'), t('cases.createSuccess'));
        setIsCreateModalOpen(false);
        setShowCaseTypePicker(false);
        setShowStagePicker(false);
        setShowCreateDatePicker(null);
        setNewCaseForm({
          name: '',
          registrationNumber: '',
          clientName: '',
          objectorOpponent: '',
          opponentName: '',
          caseType: '',
          customCaseType: '',
          legalDomain: '',
          courtName: '',
          summary: '',
          additionalNotes: '',
          priority: 'Medium',
          caseReceivedOn: '',
          countryCode: '+91',
          clientContact: '',
          advocateName: '',
          hearingDate: '',
          stage: 'Pre-litigation',
        });
        fetchDashboardData(true);
      }
    } catch (err: any) {
      showToast('error', t('common.error'), err.message || t('cases.createError'));
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
    let locale = 'en-US';
    if (language === 'Hindi' || language === 'Bilingual') locale = 'hi-IN';
    else if (language === 'Gujarati') locale = 'gu-IN';
    else if (language === 'Marathi') locale = 'mr-IN';
    else if (language === 'Tamil') locale = 'ta-IN';

    try {
      return date.toLocaleDateString(locale, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    } catch (e) {
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    }
  };

  const caseActionItems = useMemo(() => {
    if (!selectedCaseForActions) return [];
    const isArchived = selectedCaseForActions.status === 'Archived';

    return [
      {
        label: t('cases.openWorkspace'),
        icon: '⚖️',
        onPress: () => router.push(`/workspace/${selectedCaseForActions._id}` as any),
      },
      {
        label: t('cases.editDetails'),
        icon: '📝',
        onPress: () => setEditingCase({ ...selectedCaseForActions }),
      },
      {
        label: isArchived ? t('cases.restoreCase') : t('cases.archiveCase'),
        icon: '📁',
        onPress: () => handleToggleArchive(selectedCaseForActions),
      },
      {
        label: t('cases.deleteCase'),
        icon: '🗑️',
        isDestructive: true,
        onPress: () => setCaseToDeleteId(selectedCaseForActions._id),
      },
    ];
  }, [selectedCaseForActions, router, handleToggleArchive, t]);

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
              {t('home.greeting')}
            </Text>
            <Text style={{ fontSize: 24, fontWeight: '800', color: theme.textPrimary, marginTop: 4, letterSpacing: -0.3 }}>
              {t('home.advocate')} {userName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')}
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
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>{t('home.todaysOverview')}</Text>
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
                    title={t('home.activeCases')}
                    value={totalActiveCases}
                    iconName="briefcase-outline"
                    iconColor={isDark ? '#C084FC' : '#7C3AED'}
                    iconBgColor={isDark ? '#3B0764' : '#F5F3FF'}
                    helperText={`${totalActiveCases} ${t('cases.active')}`}
                    statusLabel={totalActiveCases === 0 ? t('cases.emptyStatus') : t('cases.liveStatus')}
                    statusType={totalActiveCases === 0 ? 'neutral' : (totalActiveCases > 5 ? 'purple' : 'primary')}
                    onPress={() => router.push('/(tabs)/cases')}
                    isDark={isDark}
                    theme={theme}
                  />

                  <DashboardCard
                    title={t('home.todaysHearings')}
                    value={totalTodaysHearingsCount}
                    iconName="calendar-outline"
                    iconColor={isDark ? '#60A5FA' : '#2563EB'}
                    iconBgColor={isDark ? '#1E3A8A' : '#EBF5FF'}
                    helperText={totalTodaysHearingsCount === 0 ? t('cases.nothingScheduled') : t('cases.nextHearingToday')}
                    statusLabel={totalTodaysHearingsCount === 0 ? t('cases.emptyStatus') : t('cases.today').toUpperCase()}
                    statusType={totalTodaysHearingsCount === 0 ? 'neutral' : 'urgent'}
                    onPress={() => router.push('/(tabs)/cases')}
                    isDark={isDark}
                    theme={theme}
                  />

                  <DashboardCard
                    title={t('home.pendingDrafts')}
                    value={totalPendingDrafts}
                    iconName="document-text-outline"
                    iconColor={isDark ? '#F97316' : '#EA580C'}
                    iconBgColor={isDark ? '#431407' : '#FFF7ED'}
                    helperText={totalPendingDrafts === 0 ? t('cases.nothingPending') : t('cases.requiresReview')}
                    statusLabel={totalPendingDrafts === 0 ? t('cases.upToDate').toUpperCase() : t('cases.pending').toUpperCase()}
                    statusType={totalPendingDrafts === 0 ? 'completed' : (totalPendingDrafts > 5 ? 'urgent' : 'primary')}
                    onPress={() => router.push('/(tabs)/tools')}
                    isDark={isDark}
                    theme={theme}
                  />

                  <DashboardCard
                    title={t('home.pendingResearch')}
                    value={totalPendingResearch}
                    iconName="search-outline"
                    iconColor={isDark ? '#4ADE80' : '#16A34A'}
                    iconBgColor={isDark ? '#052E16' : '#F0FDF4'}
                    helperText={totalPendingResearch === 0 ? t('cases.upToDate') : t('cases.researchNeeded')}
                    statusLabel={totalPendingResearch === 0 ? t('cases.upToDate').toUpperCase() : t('cases.aiGenerated').toUpperCase()}
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
              <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>{t('home.continueWorking')}</Text>
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
                  <Badge label={t('cases.lastUpdated')} variant="info" />
                  <Ionicons name="open-outline" size={18} color={theme.primary} />
                </View>
                <Text style={[styles.continueTitle, { color: theme.textPrimary }]}>{continueWorkingCase.name}</Text>
                <Text style={[styles.continueSummary, { color: theme.textSecondary }]} numberOfLines={2}>
                  {continueWorkingCase.summary || t('cases.noSummary')}
                </Text>
                <View style={[styles.continueFooter, { borderTopColor: theme.divider }]}>
                  <Text style={[styles.continueInfoText, { color: theme.textSecondary }]}>
                    {t('cases.hearings')}: <Text style={{ color: theme.textPrimary, fontWeight: '700' }}>{continueWorkingCase.hearings?.length || 0}</Text>
                  </Text>
                  <Text style={[styles.continueInfoText, { color: theme.textSecondary }]}>
                    {t('cases.evidence')}: <Text style={{ color: theme.textPrimary, fontWeight: '700' }}>{continueWorkingCase.evidence?.length || 0}</Text>
                  </Text>
                  <Text style={[styles.continueInfoText, { color: theme.textSecondary }]}>
                    {t('cases.contracts')}: <Text style={{ color: theme.textPrimary, fontWeight: '700' }}>{continueWorkingCase.documents?.filter(d => d.type === 'Agreement' || d.tags?.includes('Contract'))?.length || 0}</Text>
                  </Text>
                </View>
              </Pressable>
            </View>
          )}

          {/* 4. Quick Actions */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>{t('home.quickActions')}</Text>
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
                <Text style={[styles.quickActionBtnText, { color: theme.textSecondary }]}>{t('home.newCase')}</Text>
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
                <Text style={[styles.quickActionBtnText, { color: theme.textSecondary }]}>{t('home.aiLegalAssistant')}</Text>
              </Pressable>
            </Card>
          </View>
        </ScrollView>

        {/* ActionSheet Menu for Case List Items */}
        <ActionSheet
          visible={isActionSheetOpen}
          onClose={() => setIsActionSheetOpen(false)}
          title={selectedCaseForActions?.name ? `${t('cases.actions')}: ${selectedCaseForActions.name}` : t('cases.actions')}
          items={caseActionItems}
        />

        {/* Delete Dialog Confirmation */}
        <DeleteDialog
          visible={caseToDeleteId !== null}
          onConfirm={handleDeleteCase}
          onCancel={() => setCaseToDeleteId(null)}
          title={t('cases.deleteFolderTitle')}
          description={t('cases.deleteFolderDesc')}
        />

        {/* Modal: Create Case Folder */}
        <Modal
          visible={isCreateModalOpen}
          animationType="slide"
          transparent
          onRequestClose={() => { setIsCreateModalOpen(false); setShowCaseTypePicker(false); setShowStagePicker(false); setShowCreateDatePicker(null); }}
        >
          <View style={[styles.modalOverlay, { backgroundColor: theme.overlay }]}>
            <View style={[styles.modalBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={[styles.modalHeader, { backgroundColor: theme.primary, borderColor: 'transparent' }]}> 
                <View style={styles.modalHeaderTitleRow}>
                  <View style={styles.modalHeaderIcon}>
                    <Ionicons name="briefcase-outline" size={20} color="#FFFFFF" />
                  </View>
                  <Text style={styles.modalHeaderTitleWhite}>{t('cases.newCaseTitle')}</Text>
                </View>
                <Pressable onPress={() => { setIsCreateModalOpen(false); setShowCaseTypePicker(false); setShowStagePicker(false); setShowCreateDatePicker(null); }}>
                  <Text style={{ fontSize: 20, color: '#FFFFFF' }}>✕</Text>
                </Pressable>
              </View>
              { (showClientRolePicker || showOpponentRolePicker || showCaseTypePicker || showLegalDomainPicker || showStagePicker) && (
                <Pressable
                  style={styles.dropdownOverlay}
                  onPress={() => {
                    setShowClientRolePicker(false);
                    setShowOpponentRolePicker(false);
                    setShowCaseTypePicker(false);
                    setShowLegalDomainPicker(false);
                    setShowStagePicker(false);
                  }}
                />
              ) }
              <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

                {/* ── Section: Case Identity ── */}
                <View style={styles.formSectionHeader}>
                  <View style={[styles.formSectionDot, { backgroundColor: theme.primary }]} />
                  <Text style={[styles.formSectionTitle, { color: theme.textPrimary }]}>{t('cases.sectionCaseIdentity')}</Text>
                </View>

                <TextInput
                  label={t('cases.caseTitle')}
                  placeholder={t('cases.suitNamePlaceholder')}
                  value={newCaseForm.name}
                  onChangeText={(text) => setNewCaseForm({ ...newCaseForm, name: text })}
                  containerStyle={{ marginBottom: 12 }}
                />

                <TextInput
                  label={t('cases.registrationNumber')}
                  placeholder={t('cases.registrationNumberPlaceholder')}
                  value={newCaseForm.registrationNumber}
                  onChangeText={(text) => setNewCaseForm({ ...newCaseForm, registrationNumber: text })}
                  containerStyle={{ marginBottom: 12 }}
                />

                {/* Case Received On - Date Selector */}
                <DatePicker
                  label={t('cases.caseReceivedOn')}
                  placeholder={t('cases.selectDate')}
                  value={newCaseForm.caseReceivedOn}
                  onChangeDate={(date) => setNewCaseForm({ ...newCaseForm, caseReceivedOn: date })}
                  containerStyle={{ marginBottom: 12 }}
                />

                {/* ── Section: Client & Opponent ── */}
                <View style={[styles.formSectionHeader, { marginTop: 8 }]}>
                  <View style={[styles.formSectionDot, { backgroundColor: '#10B981' }]} />
                  <Text style={[styles.formSectionTitle, { color: theme.textPrimary }]}>{t('cases.sectionClientInfo')}</Text>
                </View>

                <View style={styles.clientRoleRow}>
                  <View style={styles.clientRoleField}>
                    <TextInput
                      label={t('cases.clientName')}
                      placeholder={t('cases.clientNamePlaceholder')}
                      value={newCaseForm.clientName}
                      onChangeText={(text) => setNewCaseForm({ ...newCaseForm, clientName: text })}
                      containerStyle={{ marginBottom: 0 }}
                      inputStyle={{ fontSize: 15, fontWeight: '600' }}
                    />
                  </View>
                  <View style={styles.clientRoleField}>
                    <Text style={[styles.label, { color: theme.textSecondary, fontSize: 14, fontWeight: '600', marginBottom: 4 }]}>{t('cases.clientRoleLabel')}</Text>
                    <Pressable
                      onPress={() => { setShowClientRolePicker(!showClientRolePicker); setShowCaseTypePicker(false); setShowLegalDomainPicker(false); setShowStagePicker(false); }}
                      style={[styles.dropdownBtn, styles.dropdownInput, { borderColor: showClientRolePicker ? theme.primary : theme.border, backgroundColor: theme.surface }]}
                    >
                      <Text style={[styles.dropdownBtnText, { color: newCaseForm.clientRole ? theme.textPrimary : theme.placeholder }]}
                      >
                        {newCaseForm.clientRole || t('cases.selectRole')}
                      </Text>
                      <Ionicons name={showClientRolePicker ? 'chevron-up' : 'chevron-down'} size={18} color={theme.textSecondary} />
                    </Pressable>
                    {showClientRolePicker && (
                      <View style={[styles.dropdownList, { borderColor: theme.border, backgroundColor: theme.card }]}> 
                        {(['Petitioner', 'Appellant', 'Application', 'Plaintiff'] as const).map((role) => (
                          <Pressable
                            key={role}
                            onPress={() => { setNewCaseForm({ ...newCaseForm, clientRole: role }); setShowClientRolePicker(false); }}
                            style={[styles.dropdownItem, { borderBottomColor: theme.divider, backgroundColor: newCaseForm.clientRole === role ? (isDark ? 'rgba(108,99,255,0.15)' : '#EBF5FF') : 'transparent' }]}
                          >
                            <Text style={[styles.dropdownItemText, { color: newCaseForm.clientRole === role ? theme.primary : theme.textPrimary }]}>{role}</Text>
                            {newCaseForm.clientRole === role && <Ionicons name="checkmark" size={16} color={theme.primary} />}
                          </Pressable>
                        ))}
                      </View>
                    )}
                  </View>
                </View>

                <View style={styles.clientRoleRow}>
                  <View style={styles.clientRoleField}>
                    <TextInput
                      label={t('cases.opponentName')}
                      placeholder={t('cases.opponentPlaceholder')}
                      value={newCaseForm.opponentName}
                      onChangeText={(text) => setNewCaseForm({ ...newCaseForm, opponentName: text })}
                      containerStyle={{ marginBottom: 0 }}
                      inputStyle={{ fontSize: 15, fontWeight: '600' }}
                    />
                  </View>
                  <View style={styles.clientRoleField}>
                    <Text style={[styles.label, { color: theme.textSecondary, fontSize: 14, fontWeight: '600', marginBottom: 4 }]}>{t('cases.opponentRoleLabel')}</Text>
                    <Pressable
                      onPress={() => { setShowOpponentRolePicker(!showOpponentRolePicker); setShowClientRolePicker(false); setShowCaseTypePicker(false); setShowLegalDomainPicker(false); setShowStagePicker(false); }}
                      style={[styles.dropdownBtn, styles.dropdownInput, { borderColor: showOpponentRolePicker ? theme.primary : theme.border, backgroundColor: theme.surface }]}
                    >
                      <Text style={[styles.dropdownBtnText, { color: newCaseForm.opponentRole ? theme.textPrimary : theme.placeholder }]}
                      >
                        {newCaseForm.opponentRole || t('cases.selectRole')}
                      </Text>
                      <Ionicons name={showOpponentRolePicker ? 'chevron-up' : 'chevron-down'} size={18} color={theme.textSecondary} />
                    </Pressable>
                    {showOpponentRolePicker && (
                      <View style={[styles.dropdownList, { borderColor: theme.border, backgroundColor: theme.card }]}> 
                        {(['Respondent', 'Defendant', 'Respondent Party', 'Accused'] as const).map((role) => (
                          <Pressable
                            key={role}
                            onPress={() => { setNewCaseForm({ ...newCaseForm, opponentRole: role }); setShowOpponentRolePicker(false); }}
                            style={[styles.dropdownItem, { borderBottomColor: theme.divider, backgroundColor: newCaseForm.opponentRole === role ? (isDark ? 'rgba(108,99,255,0.15)' : '#EBF5FF') : 'transparent' }]}
                          >
                            <Text style={[styles.dropdownItemText, { color: newCaseForm.opponentRole === role ? theme.primary : theme.textPrimary }]}>{role}</Text>
                            {newCaseForm.opponentRole === role && <Ionicons name="checkmark" size={16} color={theme.primary} />}
                          </Pressable>
                        ))}
                      </View>
                    )}
                  </View>
                </View>

                {/* Country Code + Client Contact */}
                <Text style={[styles.selectorLabel, { color: theme.textSecondary }]}>{t('cases.clientContact')}</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                  <Pressable
                    style={[styles.countryCodeBtn, { borderColor: theme.border, backgroundColor: theme.surface }]}
                    onPress={() => {
                      const codes = ['+91', '+1', '+44', '+971', '+65', '+61', '+81', '+49', '+33', '+86'];
                      const currIdx = codes.indexOf(newCaseForm.countryCode);
                      setNewCaseForm({ ...newCaseForm, countryCode: codes[(currIdx + 1) % codes.length] });
                    }}
                  >
                    <Text style={{ fontSize: 13, color: theme.textPrimary, fontWeight: '700' }}>{newCaseForm.countryCode}</Text>
                    <Ionicons name="chevron-down" size={12} color={theme.textMuted} />
                  </Pressable>
                  <View style={{ flex: 1 }}>
                    <TextInput
                      label=""
                      placeholder={t('cases.phoneNumberPlaceholder')}
                      value={newCaseForm.clientContact}
                      onChangeText={(text) => setNewCaseForm({ ...newCaseForm, clientContact: text })}
                      keyboardType="phone-pad"
                      containerStyle={{ marginBottom: 0 }}
                    />
                  </View>
                </View>

                <TextInput
                  label={t('cases.opponentParty')}
                  placeholder={t('cases.opponentPlaceholder')}
                  value={newCaseForm.opponentName}
                  onChangeText={(text) => setNewCaseForm({ ...newCaseForm, opponentName: text })}
                  containerStyle={{ marginBottom: 12 }}
                />

                {/* ── Section: Legal Details ── */}
                <View style={[styles.formSectionHeader, { marginTop: 8 }]}>
                  <View style={[styles.formSectionDot, { backgroundColor: '#8B5CF6' }]} />
                  <Text style={[styles.formSectionTitle, { color: theme.textPrimary }]}>{t('cases.sectionLegalDetails')}</Text>
                </View>

                {/* Case Category Dropdown */}
                <Text style={[styles.selectorLabel, { color: theme.textSecondary }]}>{t('cases.caseCategory')}</Text>
                <Pressable
                  onPress={() => { setShowCaseTypePicker(!showCaseTypePicker); setShowStagePicker(false); setShowLegalDomainPicker(false); }}
                  style={[styles.dropdownBtn, { borderColor: showCaseTypePicker ? theme.primary : theme.border, backgroundColor: theme.surface }]}
                >
                  <Text style={[styles.dropdownBtnText, { color: newCaseForm.caseType ? theme.textPrimary : theme.textMuted }]}>
                    {newCaseForm.caseType || t('cases.selectCategory')}
                  </Text>
                  <Ionicons name={showCaseTypePicker ? 'chevron-up' : 'chevron-down'} size={16} color={theme.textSecondary} />
                </Pressable>
                {showCaseTypePicker && (
                  <View style={[styles.dropdownList, { borderColor: theme.border, backgroundColor: theme.card }]}>
                    {(['Civil Case', 'Criminal Case', 'Divorce Case', 'Property Dispute', 'Corporate Legal', 'Consumer Court', 'Labor Dispute', 'Custom'] as const).map((type) => (
                      <Pressable
                        key={type}
                        onPress={() => { setNewCaseForm({ ...newCaseForm, caseType: type }); setShowCaseTypePicker(false); }}
                        style={[styles.dropdownItem, { borderBottomColor: theme.divider, backgroundColor: newCaseForm.caseType === type ? (isDark ? 'rgba(59,130,246,0.15)' : '#EBF5FF') : 'transparent' }]}
                      >
                        <Text style={[styles.dropdownItemText, { color: newCaseForm.caseType === type ? theme.primary : theme.textPrimary }]}>
                          {type === 'Civil Case' ? t('cases.civilCase') : type === 'Criminal Case' ? t('cases.criminalCase') : type === 'Divorce Case' ? t('cases.divorceCase') : type === 'Property Dispute' ? t('cases.propertyDispute') : type === 'Corporate Legal' ? t('cases.corporateLegal') : type === 'Consumer Court' ? t('cases.consumerCourt') : type === 'Labor Dispute' ? t('cases.laborDispute') : t('cases.enterCustomType')}
                        </Text>
                        {newCaseForm.caseType === type && <Ionicons name="checkmark" size={16} color={theme.primary} />}
                      </Pressable>
                    ))}
                  </View>
                )}
                {newCaseForm.caseType === 'Custom' && (
                  <TextInput
                    label={t('cases.enterCustomType')}
                    placeholder={t('cases.customCaseTypePlaceholder')}
                    value={newCaseForm.customCaseType}
                    onChangeText={(text) => setNewCaseForm({ ...newCaseForm, customCaseType: text })}
                    containerStyle={{ marginTop: 8, marginBottom: 12 }}
                  />
                )}

                {/* Legal Domain Dropdown */}
                <Text style={[styles.selectorLabel, { color: theme.textSecondary, marginTop: 6 }]}>{t('cases.legalDomain')}</Text>
                <Pressable
                  onPress={() => { setShowLegalDomainPicker(!showLegalDomainPicker); setShowCaseTypePicker(false); setShowStagePicker(false); }}
                  style={[styles.dropdownBtn, { borderColor: showLegalDomainPicker ? theme.primary : theme.border, backgroundColor: theme.surface }]}
                >
                  <Text style={[styles.dropdownBtnText, { color: newCaseForm.legalDomain ? theme.textPrimary : theme.textMuted }]}>
                    {newCaseForm.legalDomain || t('cases.selectLegalDomain')}
                  </Text>
                  <Ionicons name={showLegalDomainPicker ? 'chevron-up' : 'chevron-down'} size={16} color={theme.textSecondary} />
                </Pressable>
                {showLegalDomainPicker && (
                  <View style={[styles.dropdownList, { borderColor: theme.border, backgroundColor: theme.card }]}> 
                    {(['Civil Law', 'Corporate Law', 'Family Law', 'Criminal Law', 'Property Law', 'Labor Law', 'Tax Law', 'Intellectual Property', 'General'] as const).map((domain) => (
                      <Pressable
                        key={domain}
                        onPress={() => { setNewCaseForm({ ...newCaseForm, legalDomain: domain }); setShowLegalDomainPicker(false); }}
                        style={[styles.dropdownItem, { borderBottomColor: theme.divider, backgroundColor: newCaseForm.legalDomain === domain ? (isDark ? 'rgba(59,130,246,0.15)' : '#EBF5FF') : 'transparent' }]}
                      >
                        <Text style={[styles.dropdownItemText, { color: newCaseForm.legalDomain === domain ? theme.primary : theme.textPrimary }]}>{domain}</Text>
                        {newCaseForm.legalDomain === domain && <Ionicons name="checkmark" size={16} color={theme.primary} />}
                      </Pressable>
                    ))}
                  </View>
                )}

                {/* Stage Dropdown */}
                <Text style={[styles.selectorLabel, { color: theme.textSecondary, marginTop: newCaseForm.caseType ? 12 : 4 }]}>{t('cases.caseStage')}</Text>
                <Pressable
                  onPress={() => { setShowStagePicker(!showStagePicker); setShowCaseTypePicker(false); }}
                  style={[styles.dropdownBtn, { borderColor: showStagePicker ? theme.primary : theme.border, backgroundColor: theme.surface }]}
                >
                  <Text style={[styles.dropdownBtnText, { color: theme.textPrimary }]}>
                    {newCaseForm.stage}
                  </Text>
                  <Ionicons name={showStagePicker ? 'chevron-up' : 'chevron-down'} size={16} color={theme.textSecondary} />
                </Pressable>
                {showStagePicker && (
                  <View style={[styles.dropdownList, { borderColor: theme.border, backgroundColor: theme.card }]}>
                    {(['Pre-litigation', 'Notice', 'Court', 'Judgment', 'Settled'] as const).map((stage) => (
                      <Pressable
                        key={stage}
                        onPress={() => { setNewCaseForm({ ...newCaseForm, stage }); setShowStagePicker(false); }}
                        style={[styles.dropdownItem, { borderBottomColor: theme.divider, backgroundColor: newCaseForm.stage === stage ? (isDark ? 'rgba(59,130,246,0.15)' : '#EBF5FF') : 'transparent' }]}
                      >
                        <Text style={[styles.dropdownItemText, { color: newCaseForm.stage === stage ? theme.primary : theme.textPrimary }]}>{stage}</Text>
                        {newCaseForm.stage === stage && <Ionicons name="checkmark" size={16} color={theme.primary} />}
                      </Pressable>
                    ))}
                  </View>
                )}

                <TextInput
                  label={t('cases.courtJurisdiction')}
                  placeholder={t('cases.courtPlaceholder')}
                  value={newCaseForm.courtName}
                  onChangeText={(text) => setNewCaseForm({ ...newCaseForm, courtName: text })}
                  containerStyle={{ marginTop: 12, marginBottom: 12 }}
                />

                <TextInput
                  label="Assigned Lawyer"
                  placeholder="e.g. Adv. Ramesh Sharma"
                  value={newCaseForm.advocateName}
                  onChangeText={(text) => setNewCaseForm({ ...newCaseForm, advocateName: text })}
                  containerStyle={{ marginBottom: 12 }}
                />

                <TextInput
                  label="Description"
                  placeholder="Provide a concise description of the case, parties and status."
                  value={newCaseForm.additionalNotes}
                  onChangeText={(text) => setNewCaseForm({ ...newCaseForm, additionalNotes: text })}
                  multiline
                  numberOfLines={4}
                  containerStyle={{ marginBottom: 16 }}
                />

                {/* Hearing Date Selector */}
                <Text style={[styles.selectorLabel, { color: theme.textSecondary }]}>{t('cases.firstHearingDate')}</Text>
                <Pressable
                  onPress={() => setShowCreateDatePicker(showCreateDatePicker === 'hearing' ? null : 'hearing')}
                  style={[styles.datePickerBtn, { borderColor: theme.border, backgroundColor: theme.surface }]}
                >
                  <Ionicons name="calendar-outline" size={16} color={theme.textSecondary} />
                  <Text style={[styles.datePickerText, { color: newCaseForm.hearingDate ? theme.textPrimary : theme.textMuted }]}>
                    {newCaseForm.hearingDate || t('cases.selectDate')}
                  </Text>
                  {newCaseForm.hearingDate ? (
                    <Pressable onPress={() => setNewCaseForm({ ...newCaseForm, hearingDate: '' })}>
                      <Ionicons name="close-circle" size={16} color={theme.textMuted} />
                    </Pressable>
                  ) : null}
                </Pressable>
                {showCreateDatePicker === 'hearing' && (
                  <View style={[styles.inlineDatePicker, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    {Array.from({ length: 12 }, (_, m) => (
                      <Pressable
                        key={m}
                        onPress={() => {
                          const d = new Date();
                          d.setMonth(m);
                          const isoDate = `${d.getFullYear()}-${String(m + 1).padStart(2, '0')}-15`;
                          setNewCaseForm({ ...newCaseForm, hearingDate: isoDate });
                          setShowCreateDatePicker(null);
                        }}
                        style={[styles.monthBtn, { borderColor: theme.border }]}
                      >
                        <Text style={{ fontSize: 11, color: theme.textSecondary, fontWeight: '600' }}>
                          {new Date(2000, m).toLocaleString('default', { month: 'short' })}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}

                {/* ── Section: Summary ── */}
                <View style={[styles.formSectionHeader, { marginTop: 12 }]}>
                  <View style={[styles.formSectionDot, { backgroundColor: '#F59E0B' }]} />
                  <Text style={[styles.formSectionTitle, { color: theme.textPrimary }]}>{t('cases.sectionSummary')}</Text>
                </View>

                <TextInput
                  label={t('cases.statementSummary')}
                  placeholder={t('cases.summaryPlaceholder')}
                  value={newCaseForm.summary}
                  onChangeText={(text) => setNewCaseForm({ ...newCaseForm, summary: text })}
                  multiline
                  numberOfLines={3}
                  containerStyle={{ marginBottom: 16 }}
                />

                {/* Priority Selector */}
                <Text style={[styles.selectorLabel, { color: theme.textSecondary }]}>{t('cases.priority')}</Text>
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
                        {p === 'Low' ? t('cases.priorityLow') : p === 'Medium' ? t('cases.priorityMedium') : p === 'High' ? t('cases.priorityHigh') : t('cases.priorityUrgent')}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <TextInput
                  label={t('cases.additionalNotes')}
                  placeholder={t('cases.notesPlaceholder')}
                  value={newCaseForm.additionalNotes}
                  onChangeText={(text) => setNewCaseForm({ ...newCaseForm, additionalNotes: text })}
                  multiline
                  numberOfLines={4}
                  containerStyle={{ marginBottom: 16 }}
                />

                <View style={styles.aiAssistantCard}>
                  <View style={styles.aiHintHeader}>
                    <Ionicons name="sparkles-outline" size={18} color={theme.primary} />
                    <Text style={[styles.aiHintTitle, { color: theme.textPrimary }]}>AI Assistant</Text>
                  </View>
                  <Text style={[styles.aiHintText, { color: theme.textSecondary }]}>Save the case to let AI suggest evidence checklists, hearing briefs, and prioritized actions for this matter.</Text>
                </View>

                <View style={styles.modalActions}>
                  <Button
                    title={t('common.cancel')}
                    variant="outlined"
                    onPress={() => { setIsCreateModalOpen(false); setShowCaseTypePicker(false); setShowStagePicker(false); setShowCreateDatePicker(null); }}
                    style={styles.modalActionButton}
                    textStyle={{ fontWeight: '700' }}
                  />
                  <Button
                    title="Create Legal Case"
                    variant="primary"
                    onPress={handleCreateCase}
                    style={[styles.modalActionButton, styles.primaryActionButton]}
                  />
                </View>
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
                <Text style={[styles.modalHeaderTitle, { color: theme.textPrimary }]}>{t('cases.editDetails')}</Text>
                <Pressable onPress={() => setEditingCase(null)}>
                  <Text style={{ fontSize: 20, color: theme.textSecondary }}>✕</Text>
                </Pressable>
              </View>

              {editingCase && (
                <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                  <TextInput
                    label={t('cases.suitName')}
                    placeholder="e.g. Rajesh Sharma vs Amit Verma"
                    value={editingCase.name}
                    onChangeText={(text) => setEditingCase({ ...editingCase, name: text })}
                    containerStyle={{ marginBottom: 12 }}
                  />

                  <TextInput
                    label={t('cases.clientName')}
                    placeholder="Plaintiff Name"
                    value={editingCase.clientName || ''}
                    onChangeText={(text) => setEditingCase({ ...editingCase, clientName: text })}
                    containerStyle={{ marginBottom: 12 }}
                  />

                  <TextInput
                    label={t('cases.opponentParty')}
                    placeholder="Defendant Name"
                    value={editingCase.opponentName || ''}
                    onChangeText={(text) => setEditingCase({ ...editingCase, opponentName: text })}
                    containerStyle={{ marginBottom: 12 }}
                  />

                  <TextInput
                    label={t('cases.legalDomain')}
                    placeholder="e.g. Commercial Contract Law"
                    value={editingCase.caseType || ''}
                    onChangeText={(text) => setEditingCase({ ...editingCase, caseType: text })}
                    containerStyle={{ marginBottom: 12 }}
                  />

                  <TextInput
                    label={t('cases.presidingCourt')}
                    placeholder="e.g. Delhi High Court"
                    value={editingCase.courtName || ''}
                    onChangeText={(text) => setEditingCase({ ...editingCase, courtName: text })}
                    containerStyle={{ marginBottom: 12 }}
                  />

                  <TextInput
                    label={t('cases.statementSummary')}
                    placeholder="Provide brief background facts..."
                    value={editingCase.summary || ''}
                    onChangeText={(text) => setEditingCase({ ...editingCase, summary: text })}
                    multiline
                    numberOfLines={3}
                    containerStyle={{ marginBottom: 16 }}
                  />

                  {/* Priority Selector buttons */}
                  <Text style={[styles.selectorLabel, { color: theme.textSecondary }]}>{t('cases.priority')}</Text>
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
                          {p === 'Low' ? t('cases.priorityLow') : p === 'Medium' ? t('cases.priorityMedium') : p === 'High' ? t('cases.priorityHigh') : t('cases.priorityUrgent')}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  <Button
                    title={t('cases.saveChanges')}
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

function getStyles(theme: any) {
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
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
    alignItems: 'flex-start',
    gap: Spacing[12],
    marginBottom: Spacing[16],
    padding: Spacing[20],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#CCCCCC',
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    shadowColor: '#6C63FF',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 16 },
    shadowRadius: 24,
    elevation: 10,
  },
  modalHeaderTitle: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },
  modalHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[10],
    flex: 1,
  },
  modalHeaderIcon: {
    width: 38,
    height: 38,
    borderRadius: Radius.xl,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalHeaderTitleWhite: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
  modalBreadcrumb: {
    color: 'rgba(255,255,255,0.84)',
    fontSize: 12,
    marginTop: Spacing[4],
    lineHeight: 18,
    flex: 1,
  },
  modalScroll: {
    flex: 1,
    padding: Spacing[20],
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
  aiAssistantCard: {
    backgroundColor: '#F7F5FF',
    borderRadius: Radius.xl,
    padding: Spacing[16],
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(108, 99, 255, 0.14)',
  },
  aiHintHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[8],
    marginBottom: Spacing[8],
  },
  aiHintTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  aiHintText: {
    fontSize: 13,
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing[12],
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 40,
  },
  modalActionButton: {
    flex: 1,
    height: 50,
    borderRadius: Radius.lg,
  },
  primaryActionButton: {
    shadowColor: '#6C63FF',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 20,
    elevation: 8,
  },
  formSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[8],
    marginBottom: Spacing[12],
    marginTop: Spacing[4],
  },
  formSectionDot: {
    width: 10,
    height: 10,
    borderRadius: Radius.full,
  },
  formSectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  clientRoleRow: {
    flexDirection: 'row',
    gap: Spacing[12],
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  clientRoleField: {
    flex: 1,
    position: 'relative',
    overflow: 'visible',
  },
  dropdownInput: {
    minHeight: 48,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing[12],
    paddingVertical: 0,
    justifyContent: 'center',
  },
  dropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing[12],
    minHeight: 48,
    marginBottom: 0,
  },
  dropdownBtnText: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
    color: '#6B7280',
  },
  datePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[8],
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing[12],
    paddingVertical: Spacing[10],
    marginBottom: Spacing[12],
  },
  datePickerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  inlineDatePicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing[6],
    padding: Spacing[8],
    borderWidth: 1,
    borderRadius: Radius.md,
    marginBottom: Spacing[12],
  },
  monthBtn: {
    paddingHorizontal: Spacing[10],
    paddingVertical: Spacing[6],
    borderWidth: 1,
    borderRadius: Radius.sm,
    minWidth: 44,
    alignItems: 'center',
  },
  dropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing[12],
    paddingVertical: Spacing[10],
    marginBottom: 4,
    minHeight: 48,
  },
  roleDropdownBtn: {
    marginTop: 4,
    paddingVertical: 0,
  },
  dropdownBtnText: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  dropdownList: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    zIndex: 20,
    borderWidth: 1,
    borderRadius: Radius.md,
    overflow: 'hidden',
    marginTop: Spacing[2],
    backgroundColor: '#fff',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[12],
    paddingVertical: Spacing[10],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dropdownItemText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  countryCodeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing[10],
    paddingVertical: Spacing[10],
    minWidth: 64,
    justifyContent: 'center',
  },
});
}
