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

export default function TermsConditionsScreen() {
  const router = useRouter();
  const { showToast } = useToastContext();
  const { theme } = useThemeContext();

  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    'acceptance': true,
    'services': true
  });

  const toggleSection = (id: string) => {
    setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopyLink = () => {
    Clipboard.setString('https://aisa24.com/terms');
    showToast('success', 'Link Copied', 'Terms & Conditions link copied to clipboard.');
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: 'View the official AI LEGAL™ Terms & Conditions here: https://aisa24.com/terms',
        title: 'AI LEGAL™ Terms & Conditions'
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
      id: 'acceptance',
      title: '1. Acceptance of Terms',
      content: 'By installing, accessing, or using the AI LEGAL™ mobile application or cloud-based legal analytics suite, you explicitly agree to comply with and be bound by these Terms & Conditions. If you do not agree to these terms in their entirety, you must immediately terminate use of the application and uninstall it from your device.'
    },
    {
      id: 'eligibility',
      title: '2. Eligibility & Compliance',
      content: 'You represent that you are a registered advocate, legal scholar, business entity, or individual citizen operating under applicable laws. You agree to use the application solely in compliance with relevant court mandates, local bar policies, and code ordinances. Use of this application for unlawful or unauthorized purposes is strictly prohibited.'
    },
    {
      id: 'services',
      title: '3. Services Provided',
      content: 'AI LEGAL™ provides advocates with dynamic artificial intelligence legal solutions, which include:\n\n' +
        '• Evidence Intelligence & Document Verification\n' +
        '• AI Copilot & Precedent Search Engines\n' +
        '• Contract Analyzer & Automated Risk Extraction\n' +
        '• Case Assistant & Cross-Examination Strategizers\n' +
        '• Document Drafting & Legal Writing Aids\n' +
        '• Argument Builder & Judicial Analytics Engines\n' +
        '• Evidence Copilot Chat Workspaces\n\n' +
        'All tools are intended to assist users with case analysis and do not replace final legal checks.'
    },
    {
      id: 'responsibilities',
      title: '4. User Responsibilities & Prohibited Content',
      content: 'Users are strictly responsible for all material uploaded to the platform. You agree NOT to ingest, upload, or transmit:\n\n' +
        '• Illegal or state-restricted documentation.\n' +
        '• Malware, Trojan files, spyware, or viruses designed to damage the platform or servers.\n' +
        '• Copyright-infringing materials, books, or third-party proprietary software.\n' +
        '• Fraudulent, fabricated, or forged legal evidence intended to mislead litigation processes.\n' +
        '• Obscene, abusive, threatening, or offensive content.'
    },
    {
      id: 'limitations',
      title: '5. AI Processing Limitations',
      content: 'AI LEGAL™ uses automated natural language processing and legal neural network algorithms. All generated suggestions, draft frameworks, strategy outputs, and precedent recommendations are advisory templates only. AI outputs may contain inaccuracies, hallucinations, or incomplete case references. AI LEGAL™ does not practice law, is not a licensed law firm, and does not provide formal legal advice. You must independently cross-examine, verify, and validate all outputs before using them in court proceedings or legal agreements.'
    },
    {
      id: 'intellectual',
      title: '6. Intellectual Property Rights',
      content: 'All trademarks, service marks, logo styles, source code, neural models, user interface layouts, database setups, and functional assets of AI LEGAL™ belong exclusively to the application owners and parent operators. You are granted a limited, non-exclusive, non-transferable, revocable license to access the application for professional case assistance.'
    },
    {
      id: 'suspension',
      title: '7. Account Termination & Suspension',
      content: 'We reserve the right to suspend, terminate, or block any user account that violates our terms of use, engages in API rate abuse, attempts server reverse-engineering, or uploads prohibited content. Suspended accounts may be permanently deleted without notice.'
    },
    {
      id: 'liability',
      title: '8. Limitation of Liability',
      content: 'To the maximum extent permitted by law, AI LEGAL™ and its developers, partners, and operators shall not be liable for any legal, financial, professional, or commercial damages, losses, malpractice claims, or business disruptions arising out of your reliance on AI-generated suggestions. The final legal responsibility for all litigation choices and client filings remains solely with the practicing advocate.'
    },
    {
      id: 'governing',
      title: '9. Governing Law & Jurisdiction',
      content: 'These Terms and Conditions shall be governed by, interpreted, and enforced in accordance with the laws of India. Any legal disputes or litigation arising out of or related to these terms shall fall under the exclusive jurisdiction of the competent courts of New Delhi, India.'
    },
    {
      id: 'contact',
      title: '10. Contact Information',
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

  // Handle Search Filtering
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
        <Text style={styles.headerTitle} numberOfLines={1}>Terms & Conditions</Text>
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
        <Text style={styles.pageTitle}>Terms & Conditions</Text>
        <Text style={styles.lastUpdated}>Last Updated: July 10, 2026</Text>
        <Text style={styles.introParagraph}>
          Welcome to AI LEGAL™. These Terms govern your license and legal compliance rules when accessing or uploading case assets.
        </Text>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={16} color="#64748B" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search within terms..."
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
