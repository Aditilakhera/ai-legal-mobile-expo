import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  Platform,
  Share,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
// @ts-ignore
// eslint-disable-next-line import/no-unresolved
import { Ionicons } from '@expo/vector-icons';
import { useAuthGuard } from '@/navigation/guards';
import { useToastContext } from '@/providers';

export default function DocumentViewerScreen() {
  useAuthGuard();
  const router = useRouter();
  const { showToast } = useToastContext();
  const params = useLocalSearchParams<{
    id: string;
    docId: string;
    url: string;
    title: string;
    type?: string;
  }>();

  const [isDownloading, setIsDownloading] = useState(false);

  // Mock parsed OCR text contents for standard litigation files
  const mockOcrText = `REGISTERED LEASE DEED & RECOVERY TERMS
This lease agreement is executed on this 15th Day of January, 2025, at New Delhi, by and between:
Advocate client Rajesh Sharma (hereinafter referred to as the Lessor)
AND
Amit Verma, residing at Block C-12, Lajpat Nagar (hereinafter referred to as the Lessee).

WHEREAS the Lessor is the absolute owner of the premises located at Property Shop No. 4, Ground Floor, Connaught Place, New Delhi.
AND WHEREAS the Lessee has agreed to pay a sum of INR 50,000 per month as lease rent, due on the 5th day of each calendar month.
AND WHEREAS default in payment of rent for more than 2 consecutive months shall trigger immediate termination and forfeiture of security deposit.

SIGNED, SEALED AND DELIVERED BY:
Lessor: Rajesh Sharma
Lessee: Amit Verma
Witness 1: Karan Malhotra
Witness 2: Sunita Sen`;

  const handleShare = async () => {
    try {
      await Share.share({
        message: `AI LEGAL Case Workspace - Document: ${params.title || 'Brief File'}\nURL: ${params.url || 'N/A'}`,
        title: params.title || 'Case Document',
      });
      showToast('success', 'Document Shared', 'Document metadata link sent successfully.');
    } catch (err: any) {
      showToast('error', 'Share Failed', 'Failed to initialize system share.');
    }
  };

  const handleDownload = () => {
    setIsDownloading(true);
    setTimeout(() => {
      setIsDownloading(false);
      showToast('success', 'Download Complete', 'File saved locally in Downloads folder.');
    }, 1200);
  };

  const docType = params.type || 'Filing';
  const docTags = ['Dispute', 'Contract', ' दिल्ली कोर्ट', 'Urgent'];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header Bar */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
        >
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>
          {params.title || 'Document Details'}
        </Text>
        <Pressable
          onPress={handleShare}
          style={({ pressed }) => [styles.actionIconButton, pressed && styles.pressed]}
        >
          <Ionicons name="share-outline" size={22} color="#1F2937" />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Document Stats Card */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Document Profile</Text>
          <View style={styles.metaRow}>
            <View style={styles.metaCell}>
              <Text style={styles.metaLabel}>Doc ID</Text>
              <Text style={styles.metaValue} numberOfLines={1}>
                {params.docId || 'doc_abc123'}
              </Text>
            </View>
            <View style={styles.metaCell}>
              <Text style={styles.metaLabel}>Type</Text>
              <Text style={styles.metaValue}>{docType}</Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <View style={styles.metaCell}>
              <Text style={styles.metaLabel}>Upload Date</Text>
              <Text style={styles.metaValue}>15 Jun 2026</Text>
            </View>
            <View style={styles.metaCell}>
              <Text style={styles.metaLabel}>File Size</Text>
              <Text style={styles.metaValue}>1.4 MB</Text>
            </View>
          </View>

          <Text style={styles.metaLabel}>Tags</Text>
          <View style={styles.tagGrid}>
            {docTags.map((tag, i) => (
              <View key={i} style={styles.tagChip}>
                <Text style={styles.tagText}>#{tag}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* OCR Key Data Card */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>AI Extracted Parameters</Text>
          <View style={styles.extractionRow}>
            <Text style={styles.extractLabel}>Lessor/Client:</Text>
            <Text style={styles.extractValue}>Rajesh Sharma</Text>
          </View>
          <View style={styles.extractionRow}>
            <Text style={styles.extractLabel}>Lessee/Opponent:</Text>
            <Text style={styles.extractValue}>Amit Verma</Text>
          </View>
          <View style={styles.extractionRow}>
            <Text style={styles.extractLabel}>Disputed Amount:</Text>
            <Text style={styles.extractValue}>₹5,00,000</Text>
          </View>
          <View style={styles.extractionRow}>
            <Text style={styles.extractLabel}>Execution Date:</Text>
            <Text style={styles.extractValue}>15 Jan 2025</Text>
          </View>
        </View>

        {/* Scrollable OCR Full Text */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Optical Character Scan (OCR)</Text>
          <ScrollView
            nestedScrollEnabled={true}
            style={styles.ocrTextScroll}
            contentContainerStyle={styles.ocrTextContainer}
          >
            <Text style={styles.ocrText}>{mockOcrText}</Text>
          </ScrollView>
        </View>

        {/* Download File Button */}
        <Pressable
          style={({ pressed }) => [
            styles.downloadBtn,
            pressed && styles.downloadBtnPressed,
            isDownloading && styles.downloadBtnDisabled,
          ]}
          onPress={handleDownload}
          disabled={isDownloading}
        >
          {isDownloading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="cloud-download-outline" size={18} color="#FFFFFF" />
              <Text style={styles.downloadBtnText}>Download Original Document</Text>
            </>
          )}
        </Pressable>
      </ScrollView>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ECECEC',
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    flex: 1,
    marginHorizontal: 12,
    textAlign: 'center',
  },
  actionIconButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  pressed: {
    backgroundColor: '#F3F4F6',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 60 : 40,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#ECECEC',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1F2937',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 14,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 16,
  },
  metaCell: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  metaValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4B5563',
  },
  tagGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  tagChip: {
    backgroundColor: '#EEECFF',
    borderColor: '#E1DDFF',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6D5DFC',
  },
  extractionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  extractLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  extractValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
  },
  ocrTextScroll: {
    maxHeight: 200,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  ocrTextContainer: {
    padding: 12,
  },
  ocrText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 12,
    color: '#4B5563',
    lineHeight: 18,
  },
  downloadBtn: {
    backgroundColor: '#6D5DFC',
    borderRadius: 12,
    height: 48,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  downloadBtnPressed: {
    backgroundColor: '#5B4EDB',
  },
  downloadBtnDisabled: {
    opacity: 0.6,
  },
  downloadBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
