import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
// @ts-ignore
// eslint-disable-next-line import/no-unresolved
import { Ionicons } from '@expo/vector-icons';
import { useThemeContext, useToastContext } from '@/providers';
import { CaseService } from '@/services/case.service';
import { CaseWorkspace } from '@/types';
import { ClientConnectModule } from '@/components/ClientConnectModule';
import { PageHeader } from '@/components/ui';

export default function ClientConnectScreen() {
  const router = useRouter();
  const { theme, isDark } = useThemeContext();
  const { showToast } = useToastContext();

  const [cases, setCases] = useState<CaseWorkspace[]>([]);
  const [filteredCases, setFilteredCases] = useState<CaseWorkspace[]>([]);
  const [selectedCase, setSelectedCase] = useState<CaseWorkspace | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Fetch all cases on mount
  useEffect(() => {
    fetchCases();
  }, []);

  const fetchCases = async () => {
    setIsLoading(true);
    try {
      const res = await CaseService.listCases();
      const casesData = Array.isArray(res) ? res : (res?.data || []);
      // Filter active legal cases
      const activeLegalCases = (casesData as CaseWorkspace[]).filter(
        (c) => c.isLegalCase && c.status !== 'Archived'
      );
      setCases(activeLegalCases);
      setFilteredCases(activeLegalCases);
    } catch (err) {
      console.error(err);
      showToast('error', 'Fetch Error', 'Failed to retrieve case folders.');
    } finally {
      setIsLoading(false);
    }
  };

  // Search filter
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredCases(cases);
    } else {
      const query = searchQuery.toLowerCase().trim();
      const filtered = cases.filter(
        (c) =>
          c.name?.toLowerCase().includes(query) ||
          c.clientName?.toLowerCase().includes(query)
      );
      setFilteredCases(filtered);
    }
  }, [searchQuery, cases]);

  // Handler to reload case details when updates happen
  const handleCaseUpdated = async () => {
    if (!selectedCase) return;
    try {
      const res = await CaseService.getCaseDetails(selectedCase._id);
      const updatedCase = (res as any).data || res;
      if (updatedCase) {
        setSelectedCase(updatedCase as CaseWorkspace);
      }
    } catch (e) {
      console.warn('Failed to refresh selected case details:', e);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
        {/* Header Bar */}
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => {
              if (selectedCase) {
                setSelectedCase(null);
                fetchCases(); // refresh cases
              } else {
                router.back();
              }
            }}
          >
            <Ionicons name="arrow-back" size={20} color={theme.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
            {selectedCase ? 'AI Client Connect' : 'Select Case Folder'}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        {isLoading && !selectedCase ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
              Retrieving active case folders...
            </Text>
          </View>
        ) : selectedCase ? (
          <View style={{ flex: 1, padding: 18 }}>
            <ClientConnectModule caseData={selectedCase} onUpdate={handleCaseUpdated} />
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            {/* Search Input */}
            <View style={styles.searchBarContainer}>
              <View style={[styles.searchWrapper, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Ionicons name="search" size={16} color={theme.textMuted} style={styles.searchIcon} />
                <TextInput
                  style={[styles.searchInput, { color: theme.textPrimary }]}
                  placeholder="Search case name or client name..."
                  placeholderTextColor={theme.placeholder}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery ? (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Ionicons name="close-circle" size={16} color={theme.textMuted} />
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>

            {/* Cases List */}
            <FlatList
              data={filteredCases}
              keyExtractor={(item) => item._id}
              contentContainerStyle={{ padding: 18, paddingBottom: 60 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.caseItemCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                  onPress={() => setSelectedCase(item)}
                >
                  <View style={[styles.caseIconWrapper, { backgroundColor: `${theme.primary}12` }]}>
                    <Ionicons name="folder-open" size={20} color={theme.primary} />
                  </View>
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text style={[styles.caseName, { color: theme.textPrimary }]} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={[styles.clientSubText, { color: theme.textSecondary }]}>
                      Client: {item.clientName || 'N/A'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="folder-outline" size={48} color={theme.textMuted} style={{ marginBottom: 10 }} />
                  <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>No Case Folders Found</Text>
                  <Text style={[styles.emptySubtitle, { color: theme.textMuted }]}>
                    Create or index a legal case folder first to begin communication workflows.
                  </Text>
                </View>
              }
            />
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 12,
  },
  searchBarContainer: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 6,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 46,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
  },
  caseItemCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  caseIconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  caseName: {
    fontSize: 14,
    fontWeight: '800',
  },
  clientSubText: {
    fontSize: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});
