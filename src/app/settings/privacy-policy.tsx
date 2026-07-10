import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Share,
  Clipboard,
  Alert,
  Linking,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
// @ts-ignore
import { Ionicons } from '@expo/vector-icons';
import { useToastContext, useThemeContext } from '@/providers';

const { width } = Dimensions.get('window');

interface PolicySection {
  id: string;
  title: string;
  content: string | (() => React.ReactNode);
}

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  const { showToast } = useToastContext();
  const { theme } = useThemeContext();

  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    'intro': true,
    'collect': true
  });

  const toggleSection = (id: string) => {
    setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopyLink = () => {
    Clipboard.setString('https://aisa24.com/privacy-policy');
    showToast('success', 'Link Copied', 'Privacy Policy link copied to clipboard.');
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: 'View the official AI LEGAL™ Privacy Policy here: https://aisa24.com/privacy-policy',
        title: 'AI LEGAL™ Privacy Policy'
      });
    } catch (err) {
      console.warn(err);
    }
  };

  const handleEmailPress = () => {
    Linking.openURL('mailto:admin@uwo24.com').catch(() => {
      Alert.alert('Error', 'Could not open mail client. Contact admin@uwo24.com directly.');
    });
  };

  const handleWebsitePress = () => {
    Linking.openURL('https://aisa24.com').catch(() => {
      Alert.alert('Error', 'Could not open browser.');
    });
  };

  // Structured Sections
  const sections: PolicySection[] = useMemo(() => [
    {
      id: 'intro',
      title: '1. Introduction',
      content: 'AI LEGAL™ is an advanced, enterprise-grade AI-powered legal assistant designed specifically for legal professionals, practicing advocates, businesses, and individual litigants. The application provides an integrated suite of intelligence features including the AI Legal Assistant, Contract Analysis, Contract Drafting, Evidence Intelligence, Evidence Copilot, Case Research, Legal Document Generation, and Legal Strategy Assistance. By using this service, you acknowledge that your data will be processed in accordance with this policy.'
    },
    {
      id: 'collect',
      title: '2. Information We Collect',
      content: 'AI LEGAL™ only collects and processes data that is strictly necessary to perform requested AI features and operational tasks. The types of data we may collect include:\n\n' +
        '• Account Credentials: Name, Email Address, and authentication records.\n' +
        '• Uploaded Evidence Files: Images, PDF documents, legal transcripts, text files, audio clips, and video records submitted for forensic analysis.\n' +
        '• Interactive Inputs: Voice queries, audio inputs, and streaming AI Chat History.\n' +
        '• Device & Diagnostic Logs: Device model, operating system version, crash analytics, and application performance data.\n\n' +
        'All ingested documents are processed under secure tunnels and are never shared or processed for advertising purposes.'
    },
    {
      id: 'permissions',
      title: '3. Permissions Used',
      content: () => (
        <View style={styles.tableContainer}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={[styles.tableHeaderText, { width: '30%' }]}>Permission</Text>
            <Text style={[styles.tableHeaderText, { width: '70%' }]}>Purpose & Core Usage</Text>
          </View>
          
          <View style={styles.tableRow}>
            <Text style={[styles.tableCellBold, { width: '30%' }]}>Camera</Text>
            <Text style={[styles.tableCell, { width: '70%' }]}>Capture document layouts, physical papers, and scanned evidence details in real-time.</Text>
          </View>
          
          <View style={styles.tableRow}>
            <Text style={[styles.tableCellBold, { width: '30%' }]}>Microphone</Text>
            <Text style={[styles.tableCell, { width: '70%' }]}>Enable speech recognition for voice searches, hands-free queries, and voice evidence recording.</Text>
          </View>
          
          <View style={styles.tableRow}>
            <Text style={[styles.tableCellBold, { width: '30%' }]}>Photos & Storage</Text>
            <Text style={[styles.tableCell, { width: '70%' }]}>Upload existing legal files, PDFs, videos, and media formats from device storage into the analyst workspace.</Text>
          </View>
          
          <View style={styles.tableRow}>
            <Text style={[styles.tableCellBold, { width: '30%' }]}>Notifications</Text>
            <Text style={[styles.tableCell, { width: '70%' }]}>Deliver real-time alerts, completed AI document analysis status, and compliance warnings.</Text>
          </View>
          
          <View style={styles.tableRow}>
            <Text style={[styles.tableCellBold, { width: '30%' }]}>Internet</Text>
            <Text style={[styles.tableCell, { width: '70%' }]}>Establish encrypted connections to secure AI models and query servers for analysis generation.</Text>
          </View>
        </View>
      )
    },
    {
      id: 'usage',
      title: '4. How Your Information Is Used',
      content: 'Uploaded information is processed to execute specific requested actions. We use your details only for:\n\n' +
        '• AI Analysis & Case Assistance\n' +
        '• Forensic Evidence Verification & Metadata Extraction\n' +
        '• Legal Document Generation & Contract Review\n' +
        '• Secure Cloud Communication & Performance Improvement\n' +
        '• Defending against Fraud, Intrusion, and Abuse\n\n' +
        'We enforce strict data policies: we NEVER sell user data, dossiers, or legal files to third parties, advertising brokers, or marketing networks.'
    },
    {
      id: 'disclaimer',
      title: '5. AI Compliance Disclaimer',
      content: 'All responses, calculations, contract reviews, and precedent lists generated by AI LEGAL™ are automated informational suggestions. AI may occasionally make errors or produce inaccurate results. The outputs do not constitute licensed legal advice and do not establish an attorney-client relationship. Users must independently verify all legal references, document drafts, and case analyses before taking legal, business, or litigation decisions. AI LEGAL™ is an assistant platform and does not replace the counsel of a registered legal practitioner.'
    },
    {
      id: 'security',
      title: '6. Data Security Practices',
      content: 'We employ enterprise-grade security protocols to protect user data, including:\n\n' +
        '• End-to-end encryption in transit via HTTPS/TLS 1.3 tunnels.\n' +
        '• AES-256 encryption at rest for all database collections and uploaded files.\n' +
        '• Rigid database Access Control Lists (ACLs) to prevent unauthorized internal or external leaks.\n' +
        '• Secure authentication servers validating session signatures.'
    },
    {
      id: 'thirdparty',
      title: '7. Third Party Service Integrations',
      content: 'AI LEGAL™ coordinates with verified technology infrastructure suppliers to deliver premium processing. Verified active integrations include:\n\n' +
        '• Google Gemini API & OpenAI API (Secure AI language parsing and embeddings generation)\n' +
        '• Firebase Cloud Infrastructure (Alert notifications and authentication tokens)\n' +
        '• MongoDB Atlas (Secure database collections and user settings storage)\n' +
        '• Expo Services & Google Play Services (Application lifecycle telemetry and sandbox updates)'
    },
    {
      id: 'retention',
      title: '8. Data Retention Policy',
      content: 'User files, legal dossiers, and chats remain in our active cloud storage until explicitly deleted by the user or until account termination. User-initiated deletions immediately queue data for erasure. Backup logs are purged within standard secure backup retention cycles (30 days max).'
    },
    {
      id: 'deletion',
      title: '9. Permanent Account Deletion',
      content: 'Users maintain the right to permanently purge their account and all associated data. Initiating "Permanent Account Deletion" deletes your advocate dossier, cases, AI chats, uploaded evidence files, and settings permanently from database nodes. This operation is irreversible.'
    },
    {
      id: 'children',
      title: '10. Children\'s Privacy',
      content: 'AI LEGAL™ is a professional workflow assistant and is not intended for use by children under the legal age. We do not intentionally compile information from children.'
    },
    {
      id: 'updates',
      title: '11. Policy Changes',
      content: 'We may modify this privacy document from time to time. If major changes are introduced, we will alert you via email or platform notification systems prior to changes taking effect.'
    },
    {
      id: 'contact',
      title: '12. Contact Information',
      content: () => (
        <View style={styles.contactContainer}>
          <TouchableOpacity onPress={handleEmailPress} style={styles.contactRow}>
            <Ionicons name="mail" size={16} color="#6D5DFC" style={{ marginRight: 8 }} />
            <Text style={styles.contactText}>admin@uwo24.com</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleWebsitePress} style={styles.contactRow}>
            <Ionicons name="globe" size={16} color="#6D5DFC" style={{ marginRight: 8 }} />
            <Text style={styles.contactText}>https://aisa24.com</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/settings/report-bug')} style={styles.contactRow}>
            <Ionicons name="chatbox" size={16} color="#6D5DFC" style={{ marginRight: 8 }} />
            <Text style={styles.contactText}>Support Helpdesk Center</Text>
          </TouchableOpacity>
          <Text style={styles.versionText}>Application version: v1.2.0 (Build 402)</Text>
        </View>
      )
    }
  ], [router]);

  // Handle Search Filtering & Highlight
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return sections;
    
    const q = searchQuery.toLowerCase();
    return sections.filter(sec => {
      const matchTitle = sec.title.toLowerCase().includes(q);
      let matchContent = false;
      if (typeof sec.content === 'string') {
        matchContent = sec.content.toLowerCase().includes(q);
      }
      return matchTitle || matchContent;
    });
  }, [searchQuery, sections]);

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top']}>
      {/* Sticky Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Privacy Policy</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleCopyLink} style={styles.actionIcon}>
            <Ionicons name="link-outline" size={20} color="#0F172A" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleShare} style={styles.actionIcon}>
            <Ionicons name="share-social-outline" size={20} color="#0F172A" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main content */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.pageTitle}>Privacy Policy</Text>
        <Text style={styles.lastUpdated}>Last Updated: July 10, 2026</Text>
        <Text style={styles.introParagraph}>
          AI LEGAL™ takes client confidentiality and data security with absolute seriousness. This document outlines how we ingest, process, store, and protect your data.
        </Text>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={16} color="#64748B" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search within policy..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.trim() !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Accordion Sections */}
        {filteredSections.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="search" size={32} color="#94A3B8" style={{ marginBottom: 8 }} />
            <Text style={styles.emptyStateText}>No matching sections found.</Text>
          </View>
        ) : (
          filteredSections.map(sec => {
            const isExpanded = expandedSections[sec.id] || searchQuery.trim() !== '';
            return (
              <View key={sec.id} style={styles.card}>
                <TouchableOpacity
                  style={styles.cardHeader}
                  onPress={() => toggleSection(sec.id)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cardTitle}>{sec.title}</Text>
                  <Ionicons
                    name={isExpanded ? "chevron-up" : "chevron-down"}
                    size={16}
                    color="#6D5DFC"
                  />
                </TouchableOpacity>

                {isExpanded && (
                  <View style={styles.cardContent}>
                    {typeof sec.content === 'string' ? (
                      <Text style={styles.cardText}>{sec.content}</Text>
                    ) : (
                      sec.content()
                    )}
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionIcon: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  lastUpdated: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 16,
    fontWeight: '500',
  },
  introParagraph: {
    fontSize: 13.5,
    color: '#334155',
    lineHeight: 20,
    marginBottom: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
    marginBottom: 24,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    padding: 0,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 13,
    color: '#64748B',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F8FAFC',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0F172A',
    flex: 1,
    marginRight: 10,
  },
  cardContent: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  cardText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 20,
  },
  // Table Styling
  tableContainer: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    padding: 10,
  },
  tableHeader: {
    backgroundColor: '#EDE7FF',
  },
  tableHeaderText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#475569',
  },
  tableCellBold: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  tableCell: {
    fontSize: 11,
    color: '#475569',
    lineHeight: 15,
  },
  // Contact styling
  contactContainer: {
    gap: 12,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactText: {
    fontSize: 13,
    color: '#6D5DFC',
    fontWeight: '600',
  },
  versionText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 8,
  }
});
