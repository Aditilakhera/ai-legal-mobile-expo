import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  FlatList,
  Platform,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
// @ts-ignore
import { Ionicons } from '@expo/vector-icons';
import { useToastContext, useThemeContext } from '@/providers';
import { useUserStore } from '@/store/user';
import { apiClient } from '@/api/client';
import * as DocumentPicker from 'expo-document-picker';
import { Shadows, Radius, Spacing } from '@/theme';

const { width } = Dimensions.get('window');

interface KnowledgeDoc {
  _id: string;
  filename: string;
  size?: number;
  category: string;
  status: 'Pending' | 'Indexing' | 'Active' | 'Error';
  totalChunks?: number;
  uploadDate: string;
  isActive?: boolean;
}

export default function RAGKnowledgeBaseScreen() {
  const router = useRouter();
  const { showToast } = useToastContext();
  const { theme, isDark } = useThemeContext();
  const insets = useSafeAreaInsets();
  const profile = useUserStore((s) => s.profile);

  // Admin Check
  const isAdmin = useMemo(() => {
    return profile?.role === 'admin' || 
           profile?.email?.toLowerCase().trim() === 'aditi@uwo24.com' ||
           profile?.email?.toLowerCase().trim() === 'admin@uwo24.com';
  }, [profile]);

  // States
  const [documents, setDocuments] = useState<KnowledgeDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState('');
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Drag and Drop Handlers (for Web deployment compatibility)
  const handleDragOver = (e: any) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = async (e: any) => {
    e.preventDefault();
    setIsDragOver(false);

    if (Platform.OS !== 'web') return;

    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      setSelectedFile({
        uri: URL.createObjectURL(file),
        name: file.name,
        size: file.size,
        mimeType: file.type,
        file: file,
      });
      showToast('success', 'File Dropped', file.name);
    }
  };
  
  // Test Panel States
  const [testQuery, setTestQuery] = useState('');
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<{
    answer: string;
    chunks: { title: string; snippet: string; score: string }[];
  } | null>(null);

  // Load documents on mount
  useEffect(() => {
    if (isAdmin) {
      loadDocuments();
    }
  }, [isAdmin]);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/knowledge/list');
      if (res.data && res.data.success && res.data.data) {
        // Filter only documents belonging to PRODUCT_GUIDE
        const allDocs = res.data.data.documents || [];
        const filtered = allDocs.filter((d: any) => d.category === 'PRODUCT_GUIDE');
        setDocuments(filtered);
      }
    } catch (err: any) {
      console.warn('Failed to load documents:', err);
      showToast('error', 'Fetch Error', 'Failed to retrieve knowledge base list.');
    } finally {
      setLoading(false);
    }
  };

  // Stats Calculations
  const stats = useMemo(() => {
    const totalDocs = documents.length;
    const totalChunks = documents.reduce((acc, doc) => acc + (doc.totalChunks || 0), 0);
    const totalSizeBytes = documents.reduce((acc, doc) => acc + (doc.size || 0), 0);
    const storageUsed = totalSizeBytes > 1024 * 1024
      ? `${(totalSizeBytes / (1024 * 1024)).toFixed(2)} MB`
      : `${(totalSizeBytes / 1024).toFixed(1)} KB`;
    
    return {
      totalDocs,
      totalChunks,
      storageUsed,
      lastUpdated: documents.length > 0 
        ? new Date(documents[0].uploadDate).toLocaleDateString()
        : 'Never',
    };
  }, [documents]);

  // Search Filter
  const filteredDocuments = useMemo(() => {
    if (!searchQuery) return documents;
    return documents.filter(doc => 
      doc.filename.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [documents, searchQuery]);

  // Document Picker
  const handleSelectFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain',
          'text/markdown',
          'application/json',
          'text/csv',
          'text/html'
        ],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedFile(result.assets[0]);
        showToast('info', 'File Selected', result.assets[0].name);
      }
    } catch (err) {
      showToast('error', 'Picker Error', 'Failed to select document.');
    }
  };

  // Upload Document
  const handleUpload = async () => {
    if (!selectedFile) {
      Alert.alert('Selection Required', 'Please select a document first.');
      return;
    }

    setUploading(true);
    setUploadStep('Uploading document...');

    const playSteps = async () => {
      const steps = [
        'Uploading document...',
        'Reading content...',
        'Preparing knowledge...',
        'Building search index...',
        'Finalizing...'
      ];
      for (const step of steps) {
        setUploadStep(step);
        await new Promise((resolve) => setTimeout(resolve, 600));
      }
    };

    try {
      const formData = new FormData();
      if (Platform.OS === 'web' && selectedFile.file) {
        formData.append('file', selectedFile.file, selectedFile.name);
      } else {
        formData.append('file', {
          uri: Platform.OS === 'ios' ? selectedFile.uri.replace('file://', '') : selectedFile.uri,
          name: selectedFile.name,
          type: selectedFile.mimeType || 'application/octet-stream',
        } as any);
      }
      formData.append('category', 'PRODUCT_GUIDE');

      const uploadPromise = apiClient.post('/knowledge/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      // Wait for both upload and visual steps animation
      const [res] = await Promise.all([uploadPromise, playSteps()]);

      if (res.data && res.data.success) {
        setUploadStep('Completed Successfully');
        await new Promise((resolve) => setTimeout(resolve, 600));
        showToast('success', 'Knowledge Added Successfully', 'AI Product Guide can now answer questions using this document.');
        setSelectedFile(null);
        loadDocuments();
      } else {
        throw new Error(res.data.message || 'Ingestion failed');
      }
    } catch (err: any) {
      console.warn('Upload failed:', err);
      showToast('error', 'Upload Failed', err.response?.data?.message || err.message);
    } finally {
      setUploading(false);
      setUploadStep('');
    }
  };

  // Delete Document
  const handleDelete = async (id: string, name: string) => {
    Alert.alert(
      'Delete Document',
      `Are you sure you want to completely remove ${name}? This will remove it from the knowledge base.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await apiClient.delete(`/knowledge/${id}`);
              if (res.data && res.data.success) {
                showToast('success', 'Deleted', 'Document removed from knowledge base.');
                loadDocuments();
              }
            } catch (err) {
              showToast('error', 'Delete Failed', 'Failed to delete knowledge document.');
            }
          }
        }
      ]
    );
  };

  // Reindex Document
  const handleReindex = async (id: string) => {
    try {
      const res = await apiClient.post(`/knowledge/reindex/${id}`);
      if (res.data && res.data.success) {
        showToast('success', 'Processing Started', 'Document indexing and processing started.');
        loadDocuments();
      }
    } catch (err) {
      showToast('error', 'Re-index Failed', 'Failed to trigger re-indexing.');
    }
  };

  // Search Test Query
  const handleSearchTest = async (queryText?: string) => {
    const text = queryText || testQuery;
    if (!text.trim()) return;

    setTestLoading(true);
    setTestResult(null);
    try {
      const res = await apiClient.post('/knowledge/test-query', {
        query: text,
        category: 'PRODUCT_GUIDE',
      });
      if (res.data && res.data.success) {
        setTestResult(res.data);
      }
    } catch (err: any) {
      showToast('error', 'Test Query Failed', 'Failed to get answer from test query.');
    } finally {
      setTestLoading(false);
    }
  };

  // Safe Lock Overlay for non-admins
  if (!isAdmin) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Ionicons name="lock-closed" size={80} color={theme.danger} />
        <Text style={[styles.lockTitle, { color: theme.textPrimary }]}>Access Denied</Text>
        <Text style={[styles.lockDesc, { color: theme.textSecondary }]}>
          Only authorized administrators can manage the AI Product Guide Knowledge.
        </Text>
        <Pressable style={[styles.lockBackBtn, { backgroundColor: theme.primary }]} onPress={() => router.back()}>
          <Text style={styles.lockBackBtnText}>Go Back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      {/* Header Bar */}
      <View style={[styles.header, { borderBottomColor: theme.border, backgroundColor: theme.surface }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
        </Pressable>
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>AI Product Guide Knowledge</Text>
          <Text style={[styles.headerSubtitle, { color: theme.textMuted }]}>AI Product Guide calibrator</Text>
        </View>
        <Pressable onPress={loadDocuments} style={styles.refreshBtn}>
          <Ionicons name="refresh" size={22} color={theme.primary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Statistics Cards */}
        <View style={styles.statsGrid}>
          <View style={[styles.statsCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Ionicons name="documents-outline" size={20} color={theme.primary} />
            <Text style={[styles.statsVal, { color: theme.textPrimary }]}>{stats.totalDocs}</Text>
            <Text style={styles.statsLabel}>Knowledge Files</Text>
          </View>
          <View style={[styles.statsCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Ionicons name="git-merge-outline" size={20} color={theme.primary} />
            <Text style={[styles.statsVal, { color: theme.textPrimary }]}>{stats.totalChunks}</Text>
            <Text style={styles.statsLabel}>Knowledge Sections</Text>
          </View>
          <View style={[styles.statsCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Ionicons name="server-outline" size={20} color={theme.primary} />
            <Text style={[styles.statsVal, { color: theme.textPrimary }]}>{stats.storageUsed}</Text>
            <Text style={styles.statsLabel}>Storage Used</Text>
          </View>
        </View>

        {/* Upload Sources Section */}
        <View style={[styles.sectionCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Upload Knowledge File</Text>
          <Text style={styles.sectionDesc}>
            Ingest FAQs, Release Notes, User Manuals, or Feature Docs to calibrate AI Product Guide.
          </Text>

          <Pressable
            style={[
              styles.pickerArea,
              {
                borderColor: theme.primary,
                backgroundColor: isDragOver ? theme.primaryLight : theme.surfaceVariant,
                borderStyle: isDragOver ? 'solid' : 'dashed',
              }
            ]}
            onPress={handleSelectFile}
            {...({
              onDragOver: handleDragOver,
              onDragLeave: handleDragLeave,
              onDrop: handleDrop
            } as any)}
          >
            <Ionicons name="cloud-upload-outline" size={32} color={theme.primary} />
            <Text style={[styles.pickerText, { color: theme.textPrimary }]}>
              {selectedFile ? selectedFile.name : 'Drag & Drop or Select PDF, DOCX, TXT, MD, CSV, JSON'}
            </Text>
            {selectedFile && (
              <Text style={{ fontSize: 11, color: theme.textMuted, marginTop: 4 }}>
                {(selectedFile.size / 1024).toFixed(1)} KB
              </Text>
            )}
          </Pressable>

          {selectedFile && (
            <Pressable
              style={[styles.uploadBtn, { backgroundColor: theme.primary }]}
              onPress={handleUpload}
              disabled={uploading}
            >
              {uploading ? (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.uploadBtnText}>{uploadStep}</Text>
                </View>
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.uploadBtnText}>Add To Knowledge Base</Text>
                </>
              )}
            </Pressable>
          )}
        </View>

        {/* Test AI Guide Answers Panel */}
        <View style={[styles.sectionCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Test AI Guide Answers</Text>
          <Text style={styles.sectionDesc}>
            Submit test queries to verify document chunk retrieval and answer generation quality.
          </Text>

          <TextInput
            style={[styles.testInput, { borderColor: theme.border, color: theme.textPrimary, backgroundColor: theme.surfaceVariant }]}
            placeholder="Ask a product question (e.g. How do I delete a case?)"
            placeholderTextColor={theme.placeholder}
            value={testQuery}
            onChangeText={setTestQuery}
          />

          {/* Quick Suggestion Pills */}
          <View style={styles.suggestionRow}>
            {['How to create case?', 'Where is Draft Maker?', 'Reminders workflow'].map((item) => (
              <Pressable
                key={item}
                style={[styles.sugPill, { backgroundColor: theme.surfaceVariant }]}
                onPress={() => {
                  setTestQuery(item);
                  handleSearchTest(item);
                }}
              >
                <Text style={[styles.sugPillText, { color: theme.primary }]}>{item}</Text>
              </Pressable>
            ))}
          </View>

          <Pressable
            style={[styles.testBtn, { backgroundColor: theme.primary }]}
            onPress={() => handleSearchTest()}
            disabled={testLoading}
          >
            {testLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.testBtnText}>Ask AI Guide</Text>
            )}
          </Pressable>

          {testResult && (
            <View style={styles.testResultBox}>
              <Text style={[styles.resultHeading, { color: theme.textPrimary }]}>Generated Answer:</Text>
              <Text style={[styles.resultAnswer, { color: theme.textSecondary }]}>{testResult.answer}</Text>

              <Text style={[styles.resultHeading, { color: theme.textPrimary, marginTop: 12 }]}>Matched Knowledge:</Text>
              {testResult.chunks.length === 0 ? (
                <Text style={{ fontStyle: 'italic', fontSize: 12, color: theme.textMuted }}>No matching knowledge retrieved.</Text>
              ) : (
                testResult.chunks.map((chunk, idx) => (
                  <View key={idx} style={[styles.chunkItem, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}>
                    <View style={styles.chunkHeader}>
                      <Text style={[styles.chunkTitle, { color: theme.textPrimary }]} numberOfLines={1}>{chunk.title}</Text>
                      <Text style={[styles.chunkScore, { color: theme.success }]}>Match Quality: {chunk.score}</Text>
                    </View>
                    <Text style={[styles.chunkSnippet, { color: theme.textSecondary }]} numberOfLines={3}>
                      {chunk.snippet}
                    </Text>
                  </View>
                ))
              )}
            </View>
          )}
        </View>

        {/* Knowledge Sources List */}
        <View style={[styles.sectionCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.listHeader}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Indexed Knowledge Files</Text>
            <Text style={[styles.badge, { backgroundColor: theme.primaryLight, color: theme.primary }]}>
              {filteredDocuments.length} total
            </Text>
          </View>

          <TextInput
            style={[styles.searchInput, { borderColor: theme.border, color: theme.textPrimary, backgroundColor: theme.surfaceVariant }]}
            placeholder="Search documents by name..."
            placeholderTextColor={theme.placeholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />

          {loading ? (
            <ActivityIndicator size="large" color={theme.primary} style={{ marginVertical: 30 }} />
          ) : filteredDocuments.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="folder-open-outline" size={40} color={theme.textMuted} />
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>No indexed documents found</Text>
            </View>
          ) : (
            filteredDocuments.map((item) => (
              <View key={item._id} style={[styles.docItem, { borderBottomColor: theme.border }]}>
                <Ionicons name="document-text" size={24} color={theme.primary} style={{ marginRight: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.docName, { color: theme.textPrimary }]} numberOfLines={1}>
                    {item.filename}
                  </Text>
                  <Text style={styles.docDetails}>
                    {item.totalChunks || 0} sections • {item.size ? `${(item.size / 1024).toFixed(1)} KB` : 'N/A'} • Processing Status:{' '}
                    <Text
                      style={{
                        color:
                          item.status === 'Active'
                            ? theme.success
                            : item.status === 'Indexing'
                            ? '#3B82F6'
                            : theme.danger,
                        fontWeight: '700',
                      }}
                    >
                      {item.status}
                    </Text>
                  </Text>
                </View>

                {/* Document Action row */}
                <View style={styles.actionRow}>
                  <Pressable style={styles.actionBtn} onPress={() => handleReindex(item._id)}>
                    <Ionicons name="sync-outline" size={18} color={theme.primary} />
                  </Pressable>
                  <Pressable style={styles.actionBtn} onPress={() => handleDelete(item._id, item.filename)}>
                    <Ionicons name="trash-outline" size={18} color={theme.danger} />
                  </Pressable>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 4,
  },
  headerTitleContainer: {
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  headerSubtitle: {
    fontSize: 10,
    textTransform: 'uppercase',
    fontWeight: '700',
    letterSpacing: 0.5,
    marginTop: 1,
  },
  refreshBtn: {
    padding: 4,
  },
  scrollContainer: {
    padding: 16,
    gap: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  statsCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  statsVal: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 6,
  },
  statsLabel: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '600',
    marginTop: 2,
  },
  sectionCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    ...Shadows.sm,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  sectionDesc: {
    fontSize: 11,
    color: '#9CA3AF',
    lineHeight: 14,
    marginBottom: 14,
  },
  pickerArea: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: Radius.md,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  pickerText: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 8,
    textAlign: 'center',
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
    height: 42,
  },
  uploadBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  badge: {
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    overflow: 'hidden',
  },
  searchInput: {
    height: 38,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    fontSize: 13,
    marginBottom: 12,
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
  },
  docItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  docName: {
    fontSize: 13,
    fontWeight: '700',
  },
  docDetails: {
    fontSize: 10.5,
    color: '#9CA3AF',
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    padding: 6,
  },
  lockTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginTop: 16,
  },
  lockDesc: {
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 32,
    marginTop: 8,
    lineHeight: 18,
  },
  lockBackBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: Radius.md,
    marginTop: 24,
  },
  lockBackBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  testInput: {
    height: 40,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    fontSize: 13,
    marginBottom: 10,
  },
  suggestionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  sugPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  sugPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  testBtn: {
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  testBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  testResultBox: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#ECECEC',
  },
  resultHeading: {
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 4,
  },
  resultAnswer: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  chunkItem: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: 10,
    marginBottom: 8,
  },
  chunkHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  chunkTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  chunkScore: {
    fontSize: 11,
    fontWeight: '700',
  },
  chunkSnippet: {
    fontSize: 11,
    lineHeight: 14,
  },
});
