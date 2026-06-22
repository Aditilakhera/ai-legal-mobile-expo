import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  Dimensions,
  TouchableWithoutFeedback,
  useWindowDimensions,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
// @ts-ignore
// eslint-disable-next-line import/no-unresolved
import { Ionicons } from '@expo/vector-icons';
import { useAuthGuard } from '@/navigation/guards';
import { useToastContext } from '@/providers';
import { CaseService } from '@/services/case.service';
import { WorkspaceService } from '@/services/workspace.service';
import { CaseWorkspace } from '@/types';
import { Shadows } from '@/theme';
import { PageHeader } from '@/components/ui';

// Strict Light Theme Design Tokens
const theme = {
  background: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceVariant: '#F8FAFC',
  primary: '#6D5DFC',
  primaryDark: '#5B4EDB',
  primaryLight: '#EEECFF',
  accent: '#4F8CFF',
  border: '#ECECEC',
  divider: '#F1F5F9',
  textPrimary: '#1F2937',
  textSecondary: '#4B5563',
  textMuted: '#9CA3AF',
  placeholder: '#9CA3AF',
  success: '#10B981',
  successLight: '#E6F4EA',
  successBorder: '#CEEAD6',
  successText: '#137333',
  warning: '#F59E0B',
  warningLight: '#FEF7E0',
  warningBorder: '#FFE0B2',
  warningText: '#B06000',
  danger: '#EF4444',
  dangerLight: '#FCE8E6',
  dangerBorder: '#FAD2CF',
  dangerText: '#C5221F',
  info: '#3B82F6',
  overlay: 'rgba(15, 23, 42, 0.4)',
};

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Persist user view preference during the app session
let sessionViewMode: 'list' | 'grid' = 'list';

export default function CasesScreen() {
  useAuthGuard();
  const router = useRouter();
  const { showToast } = useToastContext();
  const { width } = useWindowDimensions();

  // Layout View State
  const [viewMode, setViewModeState] = useState<'list' | 'grid'>(sessionViewMode);

  const numColumns = useMemo(() => {
    if (viewMode === 'list') return 1;
    return width > 600 ? 3 : 2;
  }, [viewMode, width]);

  const setViewMode = (mode: 'list' | 'grid') => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    sessionViewMode = mode;
    setViewModeState(mode);
  };

  // Data state
  const [cases, setCases] = useState<CaseWorkspace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Search & Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [courtFilter, setCourtFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [sortOption, setSortOption] = useState<'lastUpdated' | 'createdDate' | 'name'>('lastUpdated');

  // Modal control states
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [isNewCaseModalOpen, setIsNewCaseModalOpen] = useState(false);
  const [isActionSheetOpen, setIsActionSheetOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  // Selection states for actions
  const [selectedCase, setSelectedCase] = useState<CaseWorkspace | null>(null);
  const [editingCaseId, setEditingCaseId] = useState<string | null>(null);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);

  // Create/Edit form state
  const [form, setForm] = useState({
    clientName: '',
    courtName: '',
    caseType: '',
    otherCaseType: '',
    accused: '',
    summary: '',
    priority: 'Medium' as 'Low' | 'Medium' | 'High' | 'Urgent',
  });
  
  // Validation errors
  const [formErrors, setFormErrors] = useState({
    clientName: '',
    caseType: '',
    otherCaseType: '',
  });

  // Fetch cases from backend
  const fetchCases = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const res = await CaseService.listCases();
      
      // Support both raw arrays and wrapped response payload shapes
      const casesData = Array.isArray(res) ? res : (res?.data || []);
      // Filter to only include legal cases
      const filtered = (casesData as CaseWorkspace[]).filter((p) => p.isLegalCase);
      setCases(filtered);
    } catch (err: any) {
      console.error('[CASES SCREEN] Fetch error:', err);
      showToast('error', 'Sync Failed', 'Failed to retrieve your case folders.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  // Extract unique courts and case types dynamically for filters list
  const uniqueCourts = useMemo(() => {
    const list = cases.map((c) => c.courtName).filter(Boolean) as string[];
    return Array.from(new Set(list));
  }, [cases]);

  const uniqueCaseTypes = useMemo(() => {
    const list = cases.map((c) => c.caseType).filter(Boolean) as string[];
    return Array.from(new Set(list));
  }, [cases]);

  // Get early upcoming hearing date for a case
  const getNextHearingDate = (c: CaseWorkspace) => {
    if (!c.hearings || c.hearings.length === 0) return 'None';
    const upcoming = c.hearings.filter((h) => h.status === 'Upcoming' && h.date);
    if (upcoming.length === 0) return 'None';

    const sorted = [...upcoming].sort((a, b) => {
      const dateA = new Date(a.date || 0).getTime();
      const dateB = new Date(b.date || 0).getTime();
      return dateA - dateB;
    });

    const earliestDate = sorted[0].date;
    if (!earliestDate) return 'None';
    return new Date(earliestDate).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Archive / Restore case handler
  const handleToggleArchive = async (c: CaseWorkspace) => {
    const newStatus = c.status === 'Archived' ? 'Active' : 'Archived';
    setIsActionSheetOpen(false);
    
    try {
      await CaseService.updateCase(c._id, { status: newStatus });
      showToast('success', newStatus === 'Archived' ? 'Case Archived' : 'Case Restored', 'Case status updated successfully.');
      fetchCases(true);
    } catch (err) {
      console.error('[CASES SCREEN] toggle archive error:', err);
      showToast('error', 'Status Error', 'Failed to update case archive status.');
    }
  };

  // Delete case handler
  const handleDeleteCase = async () => {
    if (!selectedCase) return;
    setIsDeleteConfirmOpen(false);

    try {
      await CaseService.deleteCase(selectedCase._id);
      showToast('success', 'Case Purged', 'Case folder deleted permanently.');
      setSelectedCase(null);
      fetchCases(true);
    } catch (err) {
      console.error('[CASES SCREEN] delete case error:', err);
      showToast('error', 'Deletion Error', 'Failed to delete litigation folder.');
    }
  };

  // Open Edit form modal
  const handleOpenEditModal = (c: CaseWorkspace) => {
    setIsActionSheetOpen(false);
    setEditingCaseId(c._id);

    const standardTypes = ['Civil Case', 'Criminal Case', 'Divorce Case', 'Property Dispute', 'Corporate Legal', 'Consumer Court', 'Labor Dispute'];
    const isOther = c.caseType && !standardTypes.includes(c.caseType);

    setForm({
      clientName: c.clientName || '',
      courtName: c.courtName || '',
      caseType: isOther ? 'Other' : (c.caseType || ''),
      otherCaseType: isOther ? c.caseType || '' : '',
      accused: c.opponentName || c.accused || '',
      summary: c.summary || c.caseSummary || '',
      priority: c.priority || 'Medium',
    });
    setFormErrors({ clientName: '', caseType: '', otherCaseType: '' });
    setIsNewCaseModalOpen(true);
  };

  // Open Create modal
  const handleOpenCreateModal = () => {
    setEditingCaseId(null);
    setForm({
      clientName: '',
      courtName: '',
      caseType: '',
      otherCaseType: '',
      accused: '',
      summary: '',
      priority: 'Medium',
    });
    setFormErrors({ clientName: '', caseType: '', otherCaseType: '' });
    setIsNewCaseModalOpen(true);
  };

  // Form submit (create or update case)
  const handleSubmitForm = async () => {
    // Validate fields
    let isValid = true;
    const errors = { clientName: '', caseType: '', otherCaseType: '' };

    if (!form.clientName.trim()) {
      errors.clientName = 'Client name is required.';
      isValid = false;
    }

    if (!form.caseType) {
      errors.caseType = 'Case type is required.';
      isValid = false;
    }

    if (form.caseType === 'Other' && !form.otherCaseType.trim()) {
      errors.otherCaseType = 'Enter custom case type.';
      isValid = false;
    }

    setFormErrors(errors);
    if (!isValid) return;

    setIsNewCaseModalOpen(false);

    try {
      const caseName = form.accused.trim()
        ? `${form.clientName.trim()} vs ${form.accused.trim()}`
        : `${form.clientName.trim()} Case`;
      const finalCaseType = form.caseType === 'Other' ? form.otherCaseType.trim() : form.caseType;

      const payload: Partial<CaseWorkspace> = {
        name: caseName,
        clientName: form.clientName.trim(),
        opponentName: form.accused.trim(),
        accused: form.accused.trim(), // backward compat
        caseType: finalCaseType,
        summary: form.summary.trim(),
        courtName: form.courtName.trim(),
        priority: form.priority,
        isLegalCase: true,
      };

      if (editingCaseId) {
        await CaseService.updateCase(editingCaseId, payload);
        showToast('success', 'Case Updated', 'Litigation parameters synchronized.');
      } else {
        const newCaseRes = await CaseService.createCase(payload);
        const newCase = (newCaseRes as any).data || newCaseRes;
        showToast('success', 'Case Created', 'New case folder added to list.');
        
        // Trigger auto background intelligence analysis
        if (newCase?._id) {
          WorkspaceService.triggerAutoAnalysis(newCase._id).catch((err) => {
            console.warn('[CASES] Background auto-analysis failed (non-critical):', err);
          });
        }
      }
      fetchCases(true);
    } catch (err) {
      console.error('[CASES SCREEN] save case error:', err);
      showToast('error', 'Operation Failed', 'Failed to save case details.');
      setIsNewCaseModalOpen(true);
    }
  };

  // Client side Search, Filter & Sort calculations
  const processedCases = useMemo(() => {
    let result = [...cases];

    // Search query match (name, client, opponent, court, type)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter((c) => {
        const nameMatch = c.name?.toLowerCase().includes(query);
        const clientMatch = c.clientName?.toLowerCase().includes(query);
        const opponentMatch = (c.opponentName || c.accused || '').toLowerCase().includes(query);
        const courtMatch = (c.courtName || '').toLowerCase().includes(query);
        const typeMatch = c.caseType?.toLowerCase().includes(query);
        return nameMatch || clientMatch || opponentMatch || courtMatch || typeMatch;
      });
    }

    // Status filter
    if (statusFilter !== 'All') {
      result = result.filter((c) => c.status === statusFilter);
    }

    // Priority filter
    if (priorityFilter !== 'All') {
      result = result.filter((c) => c.priority === priorityFilter);
    }

    // Court filter
    if (courtFilter !== 'All') {
      result = result.filter((c) => c.courtName === courtFilter);
    }

    // Case type filter
    if (typeFilter !== 'All') {
      result = result.filter((c) => c.caseType === typeFilter);
    }

    // Sort order
    result.sort((a, b) => {
      if (sortOption === 'name') {
        return (a.name || '').localeCompare(b.name || '');
      } else if (sortOption === 'createdDate') {
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      } else {
        // lastUpdated
        return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
      }
    });

    return result;
  }, [cases, searchQuery, statusFilter, priorityFilter, courtFilter, typeFilter, sortOption]);

  // Determine active filters count for HUD rendering
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (statusFilter !== 'All') count++;
    if (priorityFilter !== 'All') count++;
    if (courtFilter !== 'All') count++;
    if (typeFilter !== 'All') count++;
    return count;
  }, [statusFilter, priorityFilter, courtFilter, typeFilter]);

  const averageStrength = useMemo(() => {
    const active = cases.filter(c => c.status === 'Active' || !c.status);
    let sum = 0;
    let count = 0;
    active.forEach((c) => {
      const strength = c.intelligence?.strengthScore;
      if (strength !== undefined) {
        sum += strength;
        count++;
      }
    });
    return count > 0 ? Math.round(sum / count) : 75;
  }, [cases]);

  const categoryAnalytics = useMemo(() => {
    const active = cases.filter(c => c.status === 'Active' || !c.status);
    const map: Record<string, number> = {};
    active.forEach((c) => {
      const cat = c.caseType || 'General Civil';
      map[cat] = (map[cat] || 0) + 1;
    });
    const totalActive = active.length;
    return Object.keys(map)
      .map((key) => ({
        name: key,
        count: map[key],
        percentage: Math.round((map[key] / totalActive) * 100) || 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
  }, [cases]);

  const currentTab = useMemo(() => {
    if (statusFilter === 'Active') return 'active';
    if (statusFilter === 'Archived') return 'archived';
    if (statusFilter === 'Closed') return 'completed';
    return 'recent';
  }, [statusFilter]);



  // Format Status Badge
  const renderStatusBadge = (status: string) => {
    let stylesBadge = {};
    let stylesText = {};

    switch (status) {
      case 'Active':
        stylesBadge = { backgroundColor: theme.successLight, borderColor: theme.successBorder };
        stylesText = { color: theme.successText };
        break;
      case 'Closed':
        stylesBadge = { backgroundColor: theme.divider, borderColor: theme.border };
        stylesText = { color: theme.textSecondary };
        break;
      case 'Archived':
      default:
        stylesBadge = { backgroundColor: theme.warningLight, borderColor: theme.warningBorder };
        stylesText = { color: theme.warningText };
        break;
    }

    return (
      <View style={[styles.badge, stylesBadge]}>
        <Text style={[styles.badgeText, stylesText]}>{status}</Text>
      </View>
    );
  };

  // Format Priority Badge
  const renderPriorityBadge = (priority: string) => {
    let badgeColor = theme.textMuted;
    if (priority === 'Urgent') badgeColor = theme.danger;
    else if (priority === 'High') badgeColor = theme.warning;
    else if (priority === 'Medium') badgeColor = theme.info;
    else if (priority === 'Low') badgeColor = theme.success;

    return (
      <View style={[styles.priorityPill, { borderColor: badgeColor }]}>
        <Text style={[styles.priorityPillText, { color: badgeColor }]}>{priority}</Text>
      </View>
    );
  };

  // Clear all filters HUD trigger
  const handleClearAllFilters = () => {
    setStatusFilter('All');
    setPriorityFilter('All');
    setCourtFilter('All');
    setTypeFilter('All');
  };

  // Case item card renderer
  const renderCaseCard = ({ item }: { item: CaseWorkspace }) => {
    const isGrid = viewMode === 'grid';

    if (isGrid) {
      const maxWidth = (numColumns === 1 ? '100%' : `${100 / numColumns - 1.5}%`) as any;
      return (
        <View style={[styles.gridCard, { maxWidth }, Shadows.sm]}>
          <View style={styles.gridCardHeader}>
            <View style={styles.gridCardTitleContainer}>
              <Text style={styles.gridCardEmoji}>📁</Text>
              <TouchableOpacity onPress={() => router.push(`/workspace/${item._id}` as any)} style={{ flex: 1 }}>
                <Text style={styles.gridCardTitle} numberOfLines={2}>
                  {item.name}
                </Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              onPress={() => {
                setSelectedCase(item);
                setIsActionSheetOpen(true);
              }}
              style={styles.gridMoreBtn}
              accessibilityLabel="Case actions"
              accessibilityRole="button"
            >
              <Ionicons name="ellipsis-vertical" size={16} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.gridCardBody}>
            <View style={styles.gridMetadataRow}>
              <Text style={styles.gridMetaLabel}>Client</Text>
              <Text style={styles.gridMetaValue} numberOfLines={1}>{item.clientName || 'N/A'}</Text>
            </View>
          </View>

          <View style={styles.gridCardBadgesRow}>
            {renderStatusBadge(item.status)}
            {renderPriorityBadge(item.priority)}
          </View>

          <View style={styles.gridCardFooter}>
            <TouchableOpacity
              onPress={() => router.push(`/workspace/${item._id}` as any)}
              style={styles.gridOpenWorkspaceBtn}
              accessibilityLabel={`Open workspace for ${item.name}`}
              accessibilityRole="button"
            >
              <Text style={styles.gridOpenWorkspaceBtnText} numberOfLines={1}>Open Workspace</Text>
              <Ionicons name="arrow-forward" size={12} color={theme.primary} />
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <View style={[styles.card, Shadows.sm]}>
        <View style={styles.listFolderContainer}>
          <Text style={styles.listFolderEmoji}>📁</Text>
        </View>
        
        <View style={styles.listMainContent}>
          <TouchableOpacity onPress={() => router.push(`/workspace/${item._id}` as any)}>
            <Text style={styles.listCaseName} numberOfLines={1}>
              {item.name}
            </Text>
          </TouchableOpacity>
          <View style={styles.listMetadataRow}>
            <Text style={styles.listMetaText} numberOfLines={1}>
              Client: {item.clientName || 'N/A'}  •  Court: {item.courtName || 'N/A'}
            </Text>
          </View>
          <View style={styles.listBadgesRow}>
            {renderStatusBadge(item.status)}
            {renderPriorityBadge(item.priority)}
          </View>
        </View>

        <View style={styles.listRightSection}>
          <TouchableOpacity
            onPress={() => {
              setSelectedCase(item);
              setIsActionSheetOpen(true);
            }}
            style={styles.listMoreBtn}
            accessibilityLabel="Case actions"
            accessibilityRole="button"
          >
            <Ionicons name="ellipsis-vertical" size={18} color={theme.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push(`/workspace/${item._id}` as any)}
            style={styles.listChevronBtn}
            accessibilityLabel={`Open workspace for ${item.name}`}
            accessibilityRole="button"
          >
            <Ionicons name="chevron-forward" size={18} color={theme.primary} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Skeleton UI card loaders
  const renderSkeletons = () => {
    const isGrid = viewMode === 'grid';
    if (isGrid) {
      const maxWidth = (numColumns === 1 ? '100%' : `${100 / numColumns - 1.5}%`) as any;
      return (
        <ScrollView
          contentContainerStyle={styles.gridListContainer}
          style={styles.skeletonsContainer}
          bounces={false}
        >
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', width: '100%' }}>
            {[1, 2, 3, 4].map((key) => (
              <View key={key} style={[styles.gridCard, styles.skeletonCard, { maxWidth, minHeight: 180 }, Shadows.sm]}>
                <View style={[styles.skeletonLine, { width: '80%', height: 16 }]} />
                <View style={[styles.skeletonLine, { width: '90%', height: 12, marginTop: 14 }]} />
                <View style={[styles.skeletonLine, { width: '60%', height: 12, marginTop: 8 }]} />
                <View style={[styles.skeletonLine, { width: '70%', height: 20, marginTop: 16, borderRadius: 10 }]} />
              </View>
            ))}
          </View>
        </ScrollView>
      );
    }

    return (
      <ScrollView style={styles.skeletonsContainer} bounces={false}>
        {[1, 2, 3].map((key) => (
          <View key={key} style={[styles.card, styles.skeletonCard, Shadows.sm]}>
            <View style={[styles.skeletonLine, { width: '60%', height: 20 }]} />
            <View style={[styles.skeletonLine, { width: '80%', height: 14, marginTop: 16 }]} />
            <View style={[styles.skeletonLine, { width: '50%', height: 14, marginTop: 8 }]} />
            <View style={[styles.skeletonLine, { width: '40%', height: 24, marginTop: 16, borderRadius: 12 }]} />
          </View>
        ))}
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      <PageHeader
        title="My Cases"
        subtitle="Browse and manage litigation folders"
      />
      <SafeAreaView style={{ flex: 1 }} edges={['left', 'right']}>
        {/* Control Bar: Search Input & Filter Button */}
        <View style={styles.controlBar}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={18} color={theme.textMuted} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by client, opponent, court..."
              placeholderTextColor={theme.placeholder}
              value={searchQuery}
              onChangeText={setSearchQuery}
              accessibilityLabel="Search cases"
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearchBtn}>
                <Ionicons name="close-circle" size={16} color={theme.textMuted} />
              </TouchableOpacity>
            ) : null}
          </View>
          <TouchableOpacity
            onPress={() => setIsFilterSheetOpen(true)}
            style={[
              styles.filterBtn,
              activeFiltersCount > 0 && { borderColor: theme.primary, backgroundColor: theme.primaryLight },
            ]}
            accessibilityLabel="Filter and sort options"
            accessibilityRole="button"
          >
            <Ionicons name="options-outline" size={20} color={activeFiltersCount > 0 ? theme.primary : theme.textSecondary} />
            {activeFiltersCount > 0 ? (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFiltersCount}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setIsMoreMenuOpen(true)}
            style={styles.moreMenuBtn}
            accessibilityLabel="More options"
            accessibilityRole="button"
          >
            <Ionicons name="ellipsis-vertical" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>

      {/* View Toggle Bar */}
      <View style={styles.viewToggleBar}>
        <Text style={styles.resultsCountText}>
          {processedCases.length} {processedCases.length === 1 ? 'case folder' : 'case folders'}
        </Text>
        <View style={styles.toggleButtonGroup}>
          <TouchableOpacity
            onPress={() => setViewMode('list')}
            style={[styles.toggleBtn, viewMode === 'list' && styles.toggleBtnActive]}
            accessibilityLabel="Switch to list view"
            accessibilityRole="button"
          >
            <Ionicons
              name="list"
              size={18}
              color={viewMode === 'list' ? theme.primary : theme.textSecondary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setViewMode('grid')}
            style={[styles.toggleBtn, viewMode === 'grid' && styles.toggleBtnActive]}
            accessibilityLabel="Switch to grid view"
            accessibilityRole="button"
          >
            <Ionicons
              name="grid"
              size={16}
              color={viewMode === 'grid' ? theme.primary : theme.textSecondary}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Active Filters HUD Chips */}
      {activeFiltersCount > 0 ? (
        <View style={styles.hudContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hudScroll}>
            {statusFilter !== 'All' ? (
              <View style={styles.chip}>
                <Text style={styles.chipText}>Status: {statusFilter}</Text>
                <TouchableOpacity onPress={() => setStatusFilter('All')} style={styles.chipClose}>
                  <Ionicons name="close" size={14} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>
            ) : null}
            {priorityFilter !== 'All' ? (
              <View style={styles.chip}>
                <Text style={styles.chipText}>Priority: {priorityFilter}</Text>
                <TouchableOpacity onPress={() => setPriorityFilter('All')} style={styles.chipClose}>
                  <Ionicons name="close" size={14} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>
            ) : null}
            {courtFilter !== 'All' ? (
              <View style={styles.chip}>
                <Text style={styles.chipText}>Court: {courtFilter}</Text>
                <TouchableOpacity onPress={() => setCourtFilter('All')} style={styles.chipClose}>
                  <Ionicons name="close" size={14} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>
            ) : null}
            {typeFilter !== 'All' ? (
              <View style={styles.chip}>
                <Text style={styles.chipText}>Type: {typeFilter}</Text>
                <TouchableOpacity onPress={() => setTypeFilter('All')} style={styles.chipClose}>
                  <Ionicons name="close" size={14} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>
            ) : null}
            <TouchableOpacity onPress={handleClearAllFilters} style={styles.clearAllFiltersBtn}>
              <Text style={styles.clearAllFiltersText}>Clear All</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      ) : null}

      {/* Main Content Area */}
      {isLoading ? (
        renderSkeletons()
      ) : (
        <FlatList
          key={`${viewMode}-${numColumns}`}
          data={processedCases}
          numColumns={numColumns}
          keyExtractor={(item) => item._id}
          renderItem={renderCaseCard}
          contentContainerStyle={viewMode === 'grid' ? styles.gridListContainer : styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => fetchCases(true)}
              tintColor={theme.primary}
              colors={[theme.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>📁</Text>
              <Text style={styles.emptyTitle}>No Cases Found</Text>
              <Text style={styles.emptySubtitle}>
                {cases.length === 0
                  ? 'Create your first litigation folder to start leveraging AI-powered legal assists.'
                  : 'No cases match your active search or filters criteria.'}
              </Text>
              <TouchableOpacity
                onPress={cases.length === 0 ? handleOpenCreateModal : handleClearAllFilters}
                style={styles.emptyActionBtn}
              >
                <Text style={styles.emptyActionText}>
                  {cases.length === 0 ? 'Create Case' : 'Clear Filters'}
                </Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Portfolio Analytics Modal */}
      <Modal visible={isAnalyticsOpen} transparent animationType="slide" onRequestClose={() => setIsAnalyticsOpen(false)}>
        <TouchableWithoutFeedback onPress={() => setIsAnalyticsOpen(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={[styles.bottomSheetContainer, Shadows.modal]}>
                <View style={styles.bottomSheetDragHandle} />
                <View style={styles.bottomSheetHeader}>
                  <Text style={styles.bottomSheetTitle}>Portfolio Analytics</Text>
                  <TouchableOpacity onPress={() => setIsAnalyticsOpen(false)} style={styles.bottomSheetClose}>
                    <Ionicons name="close-circle" size={24} color={theme.textSecondary} />
                  </TouchableOpacity>
                </View>

                <View style={[styles.bottomSheetContent, { paddingBottom: 40 }]}>
                  <View style={{ marginBottom: 24 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: theme.textSecondary, marginBottom: 8 }}>
                      Average Case Strength
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <Text style={{ fontSize: 13, color: theme.textSecondary }}>Overall Score</Text>
                      <Text style={{ fontSize: 16, fontWeight: '800', color: theme.primary }}>{averageStrength}%</Text>
                    </View>
                    <View style={{ height: 10, width: '100%', backgroundColor: theme.divider, borderRadius: 5, overflow: 'hidden' }}>
                      <View style={{ height: '100%', width: `${averageStrength}%`, backgroundColor: theme.primary, borderRadius: 5 }} />
                    </View>
                  </View>

                  {categoryAnalytics.length > 0 ? (
                    <View>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: theme.textSecondary, marginBottom: 12 }}>
                        Category Distribution
                      </Text>
                      {categoryAnalytics.map((cat, idx) => (
                        <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.divider }}>
                          <Text style={{ fontSize: 13, color: theme.textSecondary }}>{cat.name}</Text>
                          <Text style={{ fontSize: 13, fontWeight: '600', color: theme.textPrimary }}>
                            {cat.count} ({cat.percentage}%)
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Text style={{ fontSize: 13, color: theme.textMuted, textAlign: 'center', marginTop: 12 }}>
                      No active cases category distribution available.
                    </Text>
                  )}
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* MORE MENU (⋮) OVERFLOW BOTTOM SHEET MODAL */}
      <Modal visible={isMoreMenuOpen} transparent animationType="slide" onRequestClose={() => setIsMoreMenuOpen(false)}>
        <TouchableWithoutFeedback onPress={() => setIsMoreMenuOpen(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={[styles.bottomSheetContainer, Shadows.modal]}>
                <View style={styles.bottomSheetDragHandle} />
                <View style={styles.bottomSheetHeader}>
                  <Text style={styles.bottomSheetTitle}>Case Categories</Text>
                  <TouchableOpacity onPress={() => setIsMoreMenuOpen(false)} style={styles.bottomSheetClose}>
                    <Ionicons name="close-circle" size={24} color={theme.textSecondary} />
                  </TouchableOpacity>
                </View>

                <View style={[styles.bottomSheetContent, { paddingVertical: 12 }]}>
                  {/* Recent Cases */}
                  <TouchableOpacity
                    onPress={() => {
                      setStatusFilter('All');
                      setSortOption('lastUpdated');
                      setIsMoreMenuOpen(false);
                    }}
                    style={[
                      styles.menuItem,
                      currentTab === 'recent' && styles.menuItemSelected
                    ]}
                  >
                    <View style={styles.menuItemLeft}>
                      <Ionicons
                        name="time-outline"
                        size={20}
                        color={currentTab === 'recent' ? theme.primary : theme.textSecondary}
                        style={styles.menuItemIcon}
                      />
                      <Text style={[styles.menuItemText, currentTab === 'recent' && styles.menuItemTextSelected]}>
                        Recent Cases
                      </Text>
                    </View>
                    <View style={[styles.menuItemRight, currentTab === 'recent' && styles.menuItemRightSelected]}>
                      <Text style={[styles.menuItemCount, currentTab === 'recent' && styles.menuItemCountSelected]}>
                        {cases.length}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {/* Active Cases */}
                  <TouchableOpacity
                    onPress={() => {
                      setStatusFilter('Active');
                      setIsMoreMenuOpen(false);
                    }}
                    style={[
                      styles.menuItem,
                      currentTab === 'active' && styles.menuItemSelected
                    ]}
                  >
                    <View style={styles.menuItemLeft}>
                      <Ionicons
                        name="briefcase-outline"
                        size={20}
                        color={currentTab === 'active' ? theme.primary : theme.textSecondary}
                        style={styles.menuItemIcon}
                      />
                      <Text style={[styles.menuItemText, currentTab === 'active' && styles.menuItemTextSelected]}>
                        Active Cases
                      </Text>
                    </View>
                    <View style={[styles.menuItemRight, currentTab === 'active' && styles.menuItemRightSelected]}>
                      <Text style={[styles.menuItemCount, currentTab === 'active' && styles.menuItemCountSelected]}>
                        {cases.filter(c => c.status === 'Active' || !c.status).length}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {/* Completed Cases */}
                  <TouchableOpacity
                    onPress={() => {
                      setStatusFilter('Closed');
                      setIsMoreMenuOpen(false);
                    }}
                    style={[
                      styles.menuItem,
                      currentTab === 'completed' && styles.menuItemSelected
                    ]}
                  >
                    <View style={styles.menuItemLeft}>
                      <Ionicons
                        name="checkmark-done"
                        size={20}
                        color={currentTab === 'completed' ? theme.primary : theme.textSecondary}
                        style={styles.menuItemIcon}
                      />
                      <Text style={[styles.menuItemText, currentTab === 'completed' && styles.menuItemTextSelected]}>
                        Completed Cases
                      </Text>
                    </View>
                    <View style={[styles.menuItemRight, currentTab === 'completed' && styles.menuItemRightSelected]}>
                      <Text style={[styles.menuItemCount, currentTab === 'completed' && styles.menuItemCountSelected]}>
                        {cases.filter(c => c.status === 'Closed').length}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {/* Archived Cases */}
                  <TouchableOpacity
                    onPress={() => {
                      setStatusFilter('Archived');
                      setIsMoreMenuOpen(false);
                    }}
                    style={[
                      styles.menuItem,
                      currentTab === 'archived' && styles.menuItemSelected
                    ]}
                  >
                    <View style={styles.menuItemLeft}>
                      <Ionicons
                        name="archive-outline"
                        size={20}
                        color={currentTab === 'archived' ? theme.primary : theme.textSecondary}
                        style={styles.menuItemIcon}
                      />
                      <Text style={[styles.menuItemText, currentTab === 'archived' && styles.menuItemTextSelected]}>
                        Archived Cases
                      </Text>
                    </View>
                    <View style={[styles.menuItemRight, currentTab === 'archived' && styles.menuItemRightSelected]}>
                      <Text style={[styles.menuItemCount, currentTab === 'archived' && styles.menuItemCountSelected]}>
                        {cases.filter(c => c.status === 'Archived').length}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {/* Portfolio Analytics */}
                  <TouchableOpacity
                    onPress={() => {
                      setIsAnalyticsOpen(true);
                      setIsMoreMenuOpen(false);
                    }}
                    style={styles.menuItem}
                  >
                    <View style={styles.menuItemLeft}>
                      <Ionicons
                        name="bar-chart-outline"
                        size={20}
                        color={theme.textSecondary}
                        style={styles.menuItemIcon}
                      />
                      <Text style={styles.menuItemText}>
                        Portfolio Analytics
                      </Text>
                    </View>
                    <View style={styles.menuItemRight}>
                      <Text style={styles.menuItemCount}>
                        {averageStrength}%
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* FILTER & SORT SLIDE-UP BOTTOM SHEET MODAL */}
      <Modal visible={isFilterSheetOpen} transparent animationType="slide" onRequestClose={() => setIsFilterSheetOpen(false)}>
        <TouchableWithoutFeedback onPress={() => setIsFilterSheetOpen(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={[styles.bottomSheetContainer, Shadows.modal]}>
                <View style={styles.bottomSheetDragHandle} />
                <View style={styles.bottomSheetHeader}>
                  <Text style={styles.bottomSheetTitle}>Filter & Sort Cases</Text>
                  <TouchableOpacity onPress={() => setIsFilterSheetOpen(false)} style={styles.bottomSheetClose}>
                    <Ionicons name="close-circle" size={24} color={theme.textSecondary} />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.bottomSheetContent} showsVerticalScrollIndicator={false}>
                  {/* Sorting Section */}
                  <Text style={styles.filterSectionTitle}>Sort Order</Text>
                  <View style={styles.optionsGrid}>
                    <TouchableOpacity
                      onPress={() => setSortOption('lastUpdated')}
                      style={[styles.optionChip, sortOption === 'lastUpdated' && styles.optionChipSelected]}
                    >
                      <Text style={[styles.optionChipText, sortOption === 'lastUpdated' && styles.optionChipTextSelected]}>
                        Last Updated
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setSortOption('createdDate')}
                      style={[styles.optionChip, sortOption === 'createdDate' && styles.optionChipSelected]}
                    >
                      <Text style={[styles.optionChipText, sortOption === 'createdDate' && styles.optionChipTextSelected]}>
                        Date Created
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setSortOption('name')}
                      style={[styles.optionChip, sortOption === 'name' && styles.optionChipSelected]}
                    >
                      <Text style={[styles.optionChipText, sortOption === 'name' && styles.optionChipTextSelected]}>
                        Case Name
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Status Section */}
                  <Text style={styles.filterSectionTitle}>Case Status</Text>
                  <View style={styles.optionsGrid}>
                    {['All', 'Active', 'Closed', 'Archived'].map((status) => (
                      <TouchableOpacity
                        key={status}
                        onPress={() => setStatusFilter(status)}
                        style={[styles.optionChip, statusFilter === status && styles.optionChipSelected]}
                      >
                        <Text style={[styles.optionChipText, statusFilter === status && styles.optionChipTextSelected]}>
                          {status}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Priority Section */}
                  <Text style={styles.filterSectionTitle}>Case Priority</Text>
                  <View style={styles.optionsGrid}>
                    {['All', 'Low', 'Medium', 'High', 'Urgent'].map((priority) => (
                      <TouchableOpacity
                        key={priority}
                        onPress={() => setPriorityFilter(priority)}
                        style={[styles.optionChip, priorityFilter === priority && styles.optionChipSelected]}
                      >
                        <Text style={[styles.optionChipText, priorityFilter === priority && styles.optionChipTextSelected]}>
                          {priority}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Dynamic Court Section */}
                  {uniqueCourts.length > 0 ? (
                    <>
                      <Text style={styles.filterSectionTitle}>Court Location</Text>
                      <View style={styles.optionsGrid}>
                        <TouchableOpacity
                          onPress={() => setCourtFilter('All')}
                          style={[styles.optionChip, courtFilter === 'All' && styles.optionChipSelected]}
                        >
                          <Text style={[styles.optionChipText, courtFilter === 'All' && styles.optionChipTextSelected]}>
                            All Courts
                          </Text>
                        </TouchableOpacity>
                        {uniqueCourts.map((court) => (
                          <TouchableOpacity
                            key={court}
                            onPress={() => setCourtFilter(court)}
                            style={[styles.optionChip, courtFilter === court && styles.optionChipSelected]}
                          >
                            <Text style={[styles.optionChipText, courtFilter === court && styles.optionChipTextSelected]}>
                              {court}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </>
                  ) : null}

                  {/* Dynamic Case Type Section */}
                  {uniqueCaseTypes.length > 0 ? (
                    <>
                      <Text style={styles.filterSectionTitle}>Litigation Type</Text>
                      <View style={styles.optionsGrid}>
                        <TouchableOpacity
                          onPress={() => setTypeFilter('All')}
                          style={[styles.optionChip, typeFilter === 'All' && styles.optionChipSelected]}
                        >
                          <Text style={[styles.optionChipText, typeFilter === 'All' && styles.optionChipTextSelected]}>
                            All Types
                          </Text>
                        </TouchableOpacity>
                        {uniqueCaseTypes.map((type) => (
                          <TouchableOpacity
                            key={type}
                            onPress={() => setTypeFilter(type)}
                            style={[styles.optionChip, typeFilter === type && styles.optionChipSelected]}
                          >
                            <Text style={[styles.optionChipText, typeFilter === type && styles.optionChipTextSelected]}>
                              {type}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </>
                  ) : null}
                  
                  <View style={{ height: 40 }} />
                </ScrollView>

                <TouchableOpacity onPress={() => setIsFilterSheetOpen(false)} style={styles.applyFiltersBtn}>
                  <Text style={styles.applyFiltersBtnText}>Apply Controls</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* CASE METADATA ACTIONS CONTEXT SHEET */}
      <Modal visible={isActionSheetOpen} transparent animationType="slide" onRequestClose={() => setIsActionSheetOpen(false)}>
        <TouchableWithoutFeedback onPress={() => setIsActionSheetOpen(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={[styles.bottomSheetContainer, Shadows.modal]}>
                <View style={styles.bottomSheetDragHandle} />
                <View style={styles.bottomSheetHeader}>
                  <Text style={[styles.bottomSheetTitle, { fontSize: 16 }]} numberOfLines={1}>
                    {selectedCase?.name || 'Case Options'}
                  </Text>
                  <TouchableOpacity onPress={() => setIsActionSheetOpen(false)} style={styles.bottomSheetClose}>
                    <Ionicons name="close" size={20} color={theme.textSecondary} />
                  </TouchableOpacity>
                </View>

                <View style={styles.actionList}>
                  <TouchableOpacity
                    onPress={() => {
                      setIsActionSheetOpen(false);
                      if (selectedCase) router.push(`/workspace/${selectedCase._id}` as any);
                    }}
                    style={styles.actionItem}
                  >
                    <Text style={styles.actionItemIcon}>⚖️</Text>
                    <Text style={styles.actionItemText}>Open Workspace</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      if (selectedCase) handleOpenEditModal(selectedCase);
                    }}
                    style={styles.actionItem}
                  >
                    <Text style={styles.actionItemIcon}>📝</Text>
                    <Text style={styles.actionItemText}>Edit Case Details</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      if (selectedCase) handleToggleArchive(selectedCase);
                    }}
                    style={styles.actionItem}
                  >
                    <Text style={styles.actionItemIcon}>📁</Text>
                    <Text style={styles.actionItemText}>
                      {selectedCase?.status === 'Archived' ? 'Restore to Active' : 'Archive Case'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      setIsActionSheetOpen(false);
                      setIsDeleteConfirmOpen(true);
                    }}
                    style={[styles.actionItem, { borderBottomWidth: 0 }]}
                  >
                    <Text style={styles.actionItemIcon}>⚠️</Text>
                    <Text style={[styles.actionItemText, { color: theme.danger }]}>Delete Case Permanently</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* CREATE & EDIT CASE DIALOG FORM MODAL */}
      <Modal visible={isNewCaseModalOpen} transparent animationType="slide" onRequestClose={() => setIsNewCaseModalOpen(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.formContainer, Shadows.modal]}>
              <View style={styles.formHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={styles.formIconContainer}>
                    <Ionicons name={editingCaseId ? 'create' : 'add'} size={20} color="#FFFFFF" />
                  </View>
                  <Text style={styles.formTitle}>
                    {editingCaseId ? 'Edit Legal Case' : 'New Legal Case'}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    setIsNewCaseModalOpen(false);
                    setEditingCaseId(null);
                  }}
                  style={styles.bottomSheetClose}
                >
                  <Ionicons name="close" size={22} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {/* Client Name Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    Client Name/ Complainant <Text style={{ color: theme.danger }}>*</Text>
                  </Text>
                  <TextInput
                    style={[styles.input, formErrors.clientName ? { borderColor: theme.danger } : {}]}
                    placeholder="e.g. Mr. A. Kumar"
                    placeholderTextColor={theme.placeholder}
                    value={form.clientName}
                    onChangeText={(val) => setForm({ ...form, clientName: val })}
                  />
                  {formErrors.clientName ? (
                    <Text style={styles.inputErrorText}>{formErrors.clientName}</Text>
                  ) : null}
                </View>

                {/* Court Name Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Court / Forum</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Delhi High Court"
                    placeholderTextColor={theme.placeholder}
                    value={form.courtName}
                    onChangeText={(val) => setForm({ ...form, courtName: val })}
                  />
                </View>

                {/* Accused Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Opponent / Accused</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Mr. Ravi"
                    placeholderTextColor={theme.placeholder}
                    value={form.accused}
                    onChangeText={(val) => setForm({ ...form, accused: val })}
                  />
                </View>

                {/* Case Type Dropdown */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    Case Type <Text style={{ color: theme.danger }}>*</Text>
                  </Text>
                  <View style={styles.chipsSelector}>
                    {[
                      'Civil Case',
                      'Criminal Case',
                      'Divorce Case',
                      'Property Dispute',
                      'Corporate Legal',
                      'Consumer Court',
                      'Labor Dispute',
                      'Other',
                    ].map((type) => (
                      <TouchableOpacity
                        key={type}
                        onPress={() => setForm({ ...form, caseType: type })}
                        style={[styles.selectorChip, form.caseType === type && styles.selectorChipSelected]}
                      >
                        <Text style={[styles.selectorChipText, form.caseType === type && styles.selectorChipTextSelected]}>
                          {type}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {formErrors.caseType ? (
                    <Text style={styles.inputErrorText}>{formErrors.caseType}</Text>
                  ) : null}
                </View>

                {/* Other Case Type input */}
                {form.caseType === 'Other' ? (
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>
                      Enter Custom Case Type <Text style={{ color: theme.danger }}>*</Text>
                    </Text>
                    <TextInput
                      style={[styles.input, formErrors.otherCaseType ? { borderColor: theme.danger } : {}]}
                      placeholder="e.g. Intellectual Property"
                      placeholderTextColor={theme.placeholder}
                      value={form.otherCaseType}
                      onChangeText={(val) => setForm({ ...form, otherCaseType: val })}
                    />
                    {formErrors.otherCaseType ? (
                      <Text style={styles.inputErrorText}>{formErrors.otherCaseType}</Text>
                    ) : null}
                  </View>
                ) : null}

                {/* Priority Selection */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Case Priority</Text>
                  <View style={styles.chipsSelector}>
                    {(['Low', 'Medium', 'High', 'Urgent'] as const).map((pr) => (
                      <TouchableOpacity
                        key={pr}
                        onPress={() => setForm({ ...form, priority: pr })}
                        style={[styles.selectorChip, form.priority === pr && styles.selectorChipSelected]}
                      >
                        <Text style={[styles.selectorChipText, form.priority === pr && styles.selectorChipTextSelected]}>
                          {pr}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Case Summary Textarea */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Case Brief Summary</Text>
                  <TextInput
                    style={[styles.input, styles.textarea]}
                    placeholder="Brief explanation of litigation details, claims, and goals..."
                    placeholderTextColor={theme.placeholder}
                    value={form.summary}
                    onChangeText={(val) => setForm({ ...form, summary: val })}
                    multiline
                    numberOfLines={4}
                  />
                </View>
                
                <View style={{ height: 40 }} />
              </ScrollView>

              <TouchableOpacity onPress={handleSubmitForm} style={styles.formSubmitBtn}>
                <Text style={styles.formSubmitBtnText}>
                  {editingCaseId ? 'Update Case Folder' : 'Create Case Folder'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* DELETE CONFIRMATION DIALOG MODAL */}
      <Modal visible={isDeleteConfirmOpen} transparent animationType="fade" onRequestClose={() => setIsDeleteConfirmOpen(false)}>
        <View style={styles.dialogOverlay}>
          <View style={[styles.dialogContainer, Shadows.modal]}>
            <View style={styles.dialogIconContainer}>
              <Ionicons name="warning" size={32} color={theme.danger} />
            </View>
            <Text style={styles.dialogTitle}>Delete Case Folder?</Text>
            <Text style={styles.dialogDescription}>
              This action cannot be undone. All documents, AI intelligence analysis records, evidence registers, and task backlogs under this case folder will be lost permanently.
            </Text>
            <View style={styles.dialogFooter}>
              <TouchableOpacity onPress={() => setIsDeleteConfirmOpen(false)} style={styles.dialogCancelBtn}>
                <Text style={styles.dialogCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDeleteCase} style={styles.dialogDeleteBtn}>
                <Text style={styles.dialogDeleteText}>Delete Permanently</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* Floating Create Case Button */}
      <TouchableOpacity
        style={styles.floatingCreateBtn}
        onPress={handleOpenCreateModal}
        activeOpacity={0.85}
        accessibilityLabel="New Case"
        accessibilityRole="button"
      >
        <Ionicons name="add" size={24} color="#FFFFFF" />
      </TouchableOpacity>
    </SafeAreaView>
  </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 12,
    color: theme.textSecondary,
    fontWeight: '500',
    marginTop: 2,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 4,
  },
  createBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  controlBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surfaceVariant,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: theme.border,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: theme.textPrimary,
    fontWeight: '500',
    padding: 0,
  },
  clearSearchBtn: {
    padding: 4,
  },
  filterBtn: {
    height: 44,
    width: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.surface,
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: theme.primary,
    borderRadius: 9,
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  filterBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  hudContainer: {
    height: 38,
    marginBottom: 8,
  },
  hudScroll: {
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surfaceVariant,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    paddingLeft: 10,
    paddingRight: 6,
    height: 30,
    gap: 4,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.textPrimary,
  },
  chipClose: {
    padding: 2,
    borderRadius: 4,
  },
  clearAllFiltersBtn: {
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  clearAllFiltersText: {
    fontSize: 12,
    color: theme.primary,
    fontWeight: '700',
  },
  viewToggleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 6,
    marginBottom: 8,
  },
  resultsCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.textSecondary,
  },
  toggleButtonGroup: {
    flexDirection: 'row',
    backgroundColor: theme.surfaceVariant,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 2,
    gap: 2,
  },
  toggleBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleBtnActive: {
    backgroundColor: theme.primaryLight,
  },
  gridListContainer: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 40,
  },
  gridCard: {
    backgroundColor: theme.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 12,
    margin: 6,
    flex: 1,
    minHeight: 130,
    justifyContent: 'space-between',
  },
  gridCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  gridCardTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  gridCardEmoji: {
    fontSize: 16,
    marginTop: 2,
  },
  gridCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.textPrimary,
    lineHeight: 18,
  },
  gridMoreBtn: {
    padding: 2,
    marginRight: -4,
    marginTop: -4,
  },
  gridCardBody: {
    marginTop: 10,
    gap: 6,
  },
  gridMetadataRow: {
    flexDirection: 'column',
    gap: 2,
  },
  gridMetaLabel: {
    fontSize: 10,
    color: theme.textMuted,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  gridMetaValue: {
    fontSize: 12,
    color: theme.textPrimary,
    fontWeight: '600',
  },
  gridCardBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  gridCardFooter: {
    borderTopWidth: 1,
    borderTopColor: theme.divider,
    marginTop: 12,
    paddingTop: 10,
  },
  gridOpenWorkspaceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  gridOpenWorkspaceBtnText: {
    color: theme.primary,
    fontSize: 11,
    fontWeight: '800',
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 40,
    gap: 16,
  },
  card: {
    backgroundColor: theme.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  listFolderContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: theme.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listFolderEmoji: {
    fontSize: 20,
  },
  listMainContent: {
    flex: 1,
    paddingLeft: 12,
  },
  listCaseName: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.textPrimary,
  },
  listMetadataRow: {
    marginTop: 2,
  },
  listMetaText: {
    fontSize: 11,
    color: theme.textSecondary,
    fontWeight: '500',
  },
  listBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  listRightSection: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 8,
    gap: 8,
  },
  listMoreBtn: {
    padding: 4,
  },
  listChevronBtn: {
    padding: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardEmoji: {
    fontSize: 20,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.textPrimary,
  },
  moreBtn: {
    padding: 4,
    marginRight: -4,
    marginTop: -4,
  },
  cardBody: {
    marginTop: 14,
    gap: 8,
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaLabel: {
    width: 95,
    fontSize: 12,
    color: theme.textSecondary,
    fontWeight: '500',
  },
  metaValue: {
    flex: 1,
    fontSize: 12,
    color: theme.textPrimary,
    fontWeight: '600',
  },
  cardBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  priorityPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
    borderWidth: 1,
  },
  priorityPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: theme.divider,
    marginTop: 16,
    paddingTop: 12,
  },
  openWorkspaceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  openWorkspaceBtnText: {
    color: theme.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  skeletonsContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  skeletonCard: {
    marginBottom: 16,
  },
  skeletonLine: {
    backgroundColor: theme.surfaceVariant,
    borderRadius: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 16,
    marginTop: 20,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.textPrimary,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 12,
    color: theme.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    maxWidth: '85%',
  },
  emptyActionBtn: {
    marginTop: 20,
    backgroundColor: theme.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyActionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: theme.overlay,
  },
  bottomSheetContainer: {
    backgroundColor: theme.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    maxHeight: Dimensions.get('window').height * 0.85,
    width: '100%',
    alignItems: 'center',
  },
  bottomSheetDragHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.border,
    marginVertical: 12,
  },
  bottomSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.divider,
  },
  bottomSheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.textPrimary,
  },
  bottomSheetClose: {
    padding: 4,
  },
  bottomSheetContent: {
    width: '100%',
    paddingHorizontal: 24,
  },
  filterSectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 20,
    marginBottom: 10,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
  },
  optionChipSelected: {
    borderColor: theme.primary,
    backgroundColor: theme.primaryLight,
  },
  optionChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.textPrimary,
  },
  optionChipTextSelected: {
    color: theme.primary,
    fontWeight: '700',
  },
  applyFiltersBtn: {
    width: '90%',
    height: 50,
    backgroundColor: theme.primary,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  applyFiltersBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  actionList: {
    width: '100%',
    paddingHorizontal: 24,
    marginTop: 8,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.divider,
    gap: 12,
  },
  actionItemIcon: {
    fontSize: 20,
  },
  actionItemText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.textPrimary,
  },
  formContainer: {
    backgroundColor: theme.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    height: Dimensions.get('window').height * 0.85,
    width: '100%',
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: theme.divider,
  },
  formIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: theme.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.textPrimary,
  },
  formScroll: {
    flex: 1,
    paddingHorizontal: 24,
  },
  inputGroup: {
    marginTop: 18,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    color: theme.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surfaceVariant,
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 16,
    fontSize: 14,
    fontWeight: '600',
    color: theme.textPrimary,
  },
  textarea: {
    height: 100,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  inputErrorText: {
    fontSize: 11,
    color: theme.danger,
    fontWeight: '600',
    marginTop: 4,
    marginLeft: 2,
  },
  chipsSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  selectorChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surfaceVariant,
  },
  selectorChipSelected: {
    borderColor: theme.primary,
    backgroundColor: theme.primaryLight,
  },
  selectorChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.textPrimary,
  },
  selectorChipTextSelected: {
    color: theme.primary,
    fontWeight: '700',
  },
  formSubmitBtn: {
    height: 52,
    backgroundColor: theme.primary,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 24,
    marginVertical: 16,
  },
  formSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  dialogOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.overlay,
    paddingHorizontal: 24,
  },
  dialogContainer: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: theme.surface,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  dialogIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.dangerLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.textPrimary,
    textAlign: 'center',
  },
  dialogDescription: {
    fontSize: 12,
    color: theme.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 8,
    marginBottom: 24,
  },
  dialogFooter: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  dialogCancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: theme.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.border,
  },
  dialogCancelText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.textPrimary,
  },
  dialogDeleteBtn: {
    flex: 1.3,
    height: 44,
    borderRadius: 12,
    backgroundColor: theme.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialogDeleteText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  floatingCreateBtn: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6D5DFC',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6D5DFC',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 99,
  },
  moreMenuBtn: {
    height: 44,
    width: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.surface,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginVertical: 4,
    width: '100%',
  },
  menuItemSelected: {
    backgroundColor: theme.primaryLight,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuItemIcon: {
    marginRight: 2,
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.textPrimary,
  },
  menuItemTextSelected: {
    color: theme.primary,
    fontWeight: '700',
  },
  menuItemRight: {
    backgroundColor: theme.surfaceVariant,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
  },
  menuItemRightSelected: {
    backgroundColor: theme.primary,
  },
  menuItemCount: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.textSecondary,
  },
  menuItemCountSelected: {
    color: '#FFFFFF',
  },
});
