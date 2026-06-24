import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
// @ts-ignore
import { Ionicons } from '@expo/vector-icons';
import { useToastContext, useThemeContext } from '@/providers';
import { CaseService } from '@/services/case.service';
import { StorageService } from '@/services/storage.service';
import { CaseSummary } from '@/types';
import { Shadows } from '@/theme';

const { width, height } = Dimensions.get('window');

interface CaseSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  activeCaseId: string | null;
  onSelectCase: (caseId: string) => void;
}

export const CaseSelectionModal: React.FC<CaseSelectionModalProps> = ({
  visible,
  onClose,
  activeCaseId,
  onSelectCase,
}) => {
  const { theme } = useThemeContext();
  const { showToast } = useToastContext();

  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [recentIds, setRecentIds] = useState<string[]>([]);

  // Fetch Cases and local storage lists
  const loadData = async () => {
    setLoading(true);
    try {
      const res = await CaseService.listCases();
      const caseList = Array.isArray(res) ? res : (res?.data || []);
      setCases(caseList);

      // Load Pinned IDs
      const savedPinned = await StorageService.getItem('@pinned_cases');
      if (savedPinned) {
        setPinnedIds(JSON.parse(savedPinned));
      }

      // Load Recent IDs
      const savedRecent = await StorageService.getItem('@recent_cases');
      if (savedRecent) {
        setRecentIds(JSON.parse(savedRecent));
      }
    } catch (err) {
      console.warn('Failed to load cases:', err);
      showToast('error', 'Fetch Failed', 'Unable to retrieve cases.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      loadData();
      setSearchQuery('');
    }
  }, [visible]);

  // Handle Pin toggle
  const togglePin = async (e: any, caseId: string) => {
    e.stopPropagation(); // Prevent card click / select
    let updatedPinned: string[] = [];
    if (pinnedIds.includes(caseId)) {
      updatedPinned = pinnedIds.filter((id) => id !== caseId);
      showToast('info', 'Case Unpinned', 'Removed case from pinned items.');
    } else {
      updatedPinned = [...pinnedIds, caseId];
      showToast('success', 'Case Pinned', 'Added case to pinned items.');
    }
    setPinnedIds(updatedPinned);
    await StorageService.setItem('@pinned_cases', JSON.stringify(updatedPinned));
  };

  // Handle selection of a case
  const handleSelect = async (caseId: string) => {
    // Add to recent list
    let updatedRecents = [caseId, ...recentIds.filter((id) => id !== caseId)];
    // Limit to 5 recents
    updatedRecents = updatedRecents.slice(0, 5);
    setRecentIds(updatedRecents);
    await StorageService.setItem('@recent_cases', JSON.stringify(updatedRecents));

    onSelectCase(caseId);
    onClose();
  };

  // Filter cases based on search term
  const filteredCases = useMemo(() => {
    if (!searchQuery.trim()) return cases;
    const query = searchQuery.toLowerCase().trim();
    return cases.filter((c) => {
      const name = (c.name || '').toLowerCase();
      const client = (c.clientName || '').toLowerCase();
      const opponent = (c.opponentName || '').toLowerCase();
      const type = (c.caseType || '').toLowerCase();
      const court = ((c as any).courtName || (c as any).jurisdiction || '').toLowerCase();
      return (
        name.includes(query) ||
        client.includes(query) ||
        opponent.includes(query) ||
        type.includes(query) ||
        court.includes(query)
      );
    });
  }, [cases, searchQuery]);

  // Split cases into categorized lists
  const pinnedCases = useMemo(() => {
    return filteredCases.filter((c) => pinnedIds.includes(c._id));
  }, [filteredCases, pinnedIds]);

  const recentCases = useMemo(() => {
    // Exclude cases that are already in the pinned list to avoid duplication
    return filteredCases.filter((c) => recentIds.includes(c._id) && !pinnedIds.includes(c._id));
  }, [filteredCases, recentIds, pinnedIds]);

  const allOtherCases = useMemo(() => {
    return filteredCases.filter((c) => !pinnedIds.includes(c._id) && !recentIds.includes(c._id));
  }, [filteredCases, pinnedIds, recentIds]);

  // Color helper functions
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Urgent':
      case 'Critical':
        return { text: '#EF4444', bg: 'rgba(239, 68, 68, 0.08)', border: '#FCA5A5' };
      case 'High':
        return { text: '#F59E0B', bg: 'rgba(245, 158, 11, 0.08)', border: '#FCD34D' };
      case 'Medium':
        return { text: '#3B82F6', bg: 'rgba(59, 130, 246, 0.08)', border: '#93C5FD' };
      default:
        return { text: '#10B981', bg: 'rgba(16, 185, 129, 0.08)', border: '#6EE7B7' };
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return { text: '#10B981', bg: 'rgba(16, 185, 129, 0.1)' };
      case 'Closed':
        return { text: '#6B7280', bg: 'rgba(107, 114, 128, 0.1)' };
      default:
        return { text: '#F59E0B', bg: 'rgba(245, 158, 11, 0.1)' };
    }
  };

  const renderCaseCard = (c: CaseSummary) => {
    const isSelected = activeCaseId === c._id;
    const isPinned = pinnedIds.includes(c._id);
    const pStyle = getPriorityColor(c.priority);
    const sStyle = getStatusColor(c.status);
    const courtName = (c as any).courtName || (c as any).jurisdiction || 'District Court';

    return (
      <TouchableOpacity
        key={c._id}
        style={[
          styles.card,
          { backgroundColor: theme.surface, borderColor: isSelected ? '#8A5CF5' : theme.border },
          isSelected && styles.cardSelected,
        ]}
        onPress={() => handleSelect(c._id)}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleContainer}>
            <Text style={[styles.cardTitle, { color: theme.textPrimary }]} numberOfLines={1}>
              {c.name}
            </Text>
            {c.caseType ? (
              <View style={[styles.typeBadge, { backgroundColor: theme.surfaceVariant }]}>
                <Text style={[styles.typeBadgeText, { color: theme.textSecondary }]}>{c.caseType}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity onPress={(e) => togglePin(e, c._id)} style={styles.pinBtn}>
              <Ionicons name={isPinned ? 'pin' : 'pin-outline'} size={18} color={isPinned ? '#8A5CF5' : '#94A3B8'} />
            </TouchableOpacity>
            {isSelected && <Ionicons name="checkmark-circle" size={20} color="#8A5CF5" style={{ marginLeft: 4 }} />}
          </View>
        </View>

        <View style={styles.cardDetailRow}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Client</Text>
            <Text style={[styles.detailValue, { color: theme.textSecondary }]} numberOfLines={1}>
              {c.clientName || 'N/A'}
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Objector</Text>
            <Text style={[styles.detailValue, { color: theme.textSecondary }]} numberOfLines={1}>
              {c.opponentName || 'N/A'}
            </Text>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        <View style={styles.cardFooter}>
          <View style={styles.footerLeft}>
            <Ionicons name="library-outline" size={12} color={theme.textMuted} style={{ marginRight: 4 }} />
            <Text style={[styles.courtText, { color: theme.textSecondary }]} numberOfLines={1}>
              {courtName}
            </Text>
          </View>
          <View style={styles.footerRight}>
            <View style={[styles.pill, { backgroundColor: pStyle.bg, borderColor: pStyle.border, borderWidth: 1 }]}>
              <Text style={[styles.pillText, { color: pStyle.text }]}>{c.priority}</Text>
            </View>
            <View style={[styles.pill, { backgroundColor: sStyle.bg }]}>
              <Text style={[styles.pillText, { color: sStyle.text }]}>{c.status}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />

        <View style={[styles.modalContainer, Shadows.modal, { backgroundColor: theme.background }]}>
          <View style={styles.dragHandle} />

          <View style={styles.modalHeader}>
            <View style={styles.titleRow}>
              <Ionicons name="folder-open" size={22} color="#8A5CF5" style={{ marginRight: 8 }} />
              <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Choose Case Workspace</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close-circle" size={24} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* Search bar */}
          <View style={[styles.searchContainer, { backgroundColor: theme.surfaceVariant }]}>
            <Ionicons name="search" size={18} color="#94A3B8" style={{ marginRight: 8 }} />
            <TextInput
              style={[styles.searchInput, { color: theme.textPrimary }]}
              placeholder="Search case, client, court, or type..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close" size={18} color="#94A3B8" />
              </TouchableOpacity>
            ) : null}
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#8A5CF5" />
              <Text style={{ marginTop: 12, color: theme.textSecondary }}>Fetching case dossiers...</Text>
            </View>
          ) : (
            <ScrollView style={styles.scrollList} showsVerticalScrollIndicator={false}>
              {filteredCases.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="briefcase-outline" size={48} color="#94A3B8" />
                  <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No matching cases found.</Text>
                </View>
              ) : (
                <>
                  {/* Pinned Cases Section */}
                  {pinnedCases.length > 0 ? (
                    <View style={styles.section}>
                      <Text style={styles.sectionHeader}>📌 Pinned Cases</Text>
                      {pinnedCases.map(renderCaseCard)}
                    </View>
                  ) : null}

                  {/* Recent Cases Section */}
                  {recentCases.length > 0 ? (
                    <View style={styles.section}>
                      <Text style={styles.sectionHeader}>🕒 Recent Cases</Text>
                      {recentCases.map(renderCaseCard)}
                    </View>
                  ) : null}

                  {/* All Other Cases Section */}
                  {allOtherCases.length > 0 ? (
                    <View style={styles.section}>
                      <Text style={styles.sectionHeader}>
                        {pinnedCases.length > 0 || recentCases.length > 0 ? '📂 All Cases' : '📂 Available Cases'}
                      </Text>
                      {allOtherCases.map(renderCaseCard)}
                    </View>
                  ) : null}
                </>
              )}
              <View style={{ height: 40 }} />
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    width: '100%',
    height: height * 0.85,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  closeBtn: {
    padding: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 8 : 4,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  scrollList: {
    flex: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 14,
    marginTop: 10,
  },
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
  },
  cardSelected: {
    backgroundColor: 'rgba(138, 92, 245, 0.04)',
    borderWidth: 1.5,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    maxWidth: '70%',
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pinBtn: {
    padding: 4,
  },
  cardDetailRow: {
    flexDirection: 'row',
    marginBottom: 10,
    gap: 16,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 9,
    color: '#94A3B8',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  courtText: {
    fontSize: 11,
    fontWeight: '500',
  },
  footerRight: {
    flexDirection: 'row',
    gap: 6,
  },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  pillText: {
    fontSize: 10,
    fontWeight: '700',
  },
});
