import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  LayoutAnimation,
  UIManager,
  Modal,
  Dimensions,
  TouchableWithoutFeedback,
  TouchableOpacity,
  Keyboard,
  Clipboard,
  Share,
  Animated,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
// @ts-ignore
// eslint-disable-next-line import/no-unresolved
import { Ionicons } from '@expo/vector-icons';
import { useToastContext, useThemeContext } from '@/providers';
import { useAuthGuard } from '@/navigation/guards';
import { streamAIResponse } from '@/api/client';
import { ChatService } from '@/services/chat.service';
import { Shadows, Radius, Spacing } from '@/theme';
import { ChatMessage, ChatAttachment } from '@/types';
import { ChatMessageBubble, ChatComposer, ChatWelcome } from '@/components/ui/chat';
import { AttachmentBottomSheet } from '@/components/ui/bottomSheets/AttachmentBottomSheet';
import { CustomCameraModal } from '@/components/ui/legal/CustomCameraModal';
import { useAttachmentHandler } from '@/hooks/use-attachment-handler';

const { width, height } = Dimensions.get('window');

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Simulated Forensic Mocks List
const MOCK_EVIDENCE_FILES = [
  {
    id: 'whatsapp',
    name: 'whatsapp_chat_export_case902.txt',
    type: 'text/plain',
    size: 1024 * 128, // 128 KB
    detectedType: 'WhatsApp Chat Export',
    url: 'https://ailegal.com/evidence/whatsapp_chat_export_case902.txt',
  },
  {
    id: 'medical',
    name: 'medical_report_injury_audit.pdf',
    type: 'application/pdf',
    size: 1024 * 1024 * 1.5, // 1.5 MB
    detectedType: 'Medical Report',
    url: 'https://ailegal.com/evidence/medical_report_injury_audit.pdf',
  },
  {
    id: 'bank',
    name: 'bank_statement_q1_unusual.xlsx',
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    size: 1024 * 340, // 340 KB
    detectedType: 'Bank Statement',
    url: 'https://ailegal.com/evidence/bank_statement_q1_unusual.xlsx',
  },
  {
    id: 'video',
    name: 'surveillance_video_cam4.mp4',
    type: 'video/mp4',
    size: 1024 * 1024 * 12.4, // 12.4 MB
    detectedType: 'Video Evidence',
    url: 'https://ailegal.com/evidence/surveillance_video_cam4.mp4',
  },
  {
    id: 'witness',
    name: 'witness_statement_signed.pdf',
    type: 'application/pdf',
    size: 1024 * 670, // 670 KB
    detectedType: 'Witness Statement',
    url: 'https://ailegal.com/evidence/witness_statement_signed.pdf',
  },
  {
    id: 'zip',
    name: 'compressed_dossier_photos.zip',
    type: 'application/zip',
    size: 1024 * 1024 * 8.5, // 8.5 MB
    detectedType: 'Compressed Dossier',
    url: 'https://ailegal.com/evidence/compressed_dossier_photos.zip',
  },
];

// Helper functions for search term highlighting
const renderWithSearchHighlight = (text: string, searchQuery: string) => {
  if (!searchQuery) return text;
  const escaped = searchQuery.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? (
      <Text key={i} style={{ backgroundColor: '#FDE047', color: '#1F2937', fontWeight: '700' }}>
        {part}
      </Text>
    ) : (
      part
    )
  );
};

const parseInlineStyles = (text: string, isUserText: boolean, theme: any, searchQuery: string) => {
  if (!text) return null;

  const parts = text.split(/\*\*([\s\S]*?)\*\*/g);
  return parts.map((part, index) => {
    const isBold = index % 2 === 1;

    const subParts = part.split(/`([^`]+)`/g);
    const subElements = subParts.map((subPart, subIdx) => {
      const isInlineCode = subIdx % 2 === 1;
      if (isInlineCode) {
        return (
          <Text
            key={`${index}-${subIdx}`}
            style={{
              fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
              fontSize: 13,
              backgroundColor: isUserText ? 'rgba(0, 0, 0, 0.15)' : 'rgba(16, 185, 129, 0.08)',
              color: isUserText ? '#FFFFFF' : '#10B981',
              paddingHorizontal: 4,
              borderRadius: 4,
            }}
          >
            {renderWithSearchHighlight(subPart, searchQuery)}
          </Text>
        );
      }

      const citationParts = subPart.split(/(\[\d+\])/g);
      return citationParts.map((citPart, citIdx) => {
        const isCit = citPart.match(/^\[\d+\]$/);
        if (isCit) {
          return (
            <Text
              key={`${index}-${subIdx}-${citIdx}`}
              style={{
                color: isUserText ? '#EEECFF' : '#10B981',
                fontWeight: '700',
                textDecorationLine: 'underline',
                fontSize: 13,
              }}
            >
              {citPart}
            </Text>
          );
        }
        return renderWithSearchHighlight(citPart, searchQuery);
      });
    });

    return (
      <Text key={index} style={isBold ? { fontWeight: '700' } : undefined}>
        {subElements}
      </Text>
    );
  });
};

const CustomMarkdownText: React.FC<{ content: string; isUser: boolean; searchQuery: string; theme: any }> = ({
  content,
  isUser,
  searchQuery,
  theme,
}) => {
  if (!content) return null;

  const lines = content.split('\n');
  const renderedElements: React.ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Headers
    const headerMatch = trimmed.match(/^(#{1,6})\s+(.*)/);
    if (headerMatch) {
      const level = headerMatch[1].length;
      const headerText = headerMatch[2];
      const fontSize = level === 1 ? 18 : level === 2 ? 16 : 14;
      renderedElements.push(
        <Text
          key={i}
          style={{
            fontSize,
            fontWeight: '700',
            marginTop: 8,
            marginBottom: 4,
            color: isUser ? '#FFFFFF' : theme.textPrimary,
          }}
        >
          {parseInlineStyles(headerText, isUser, theme, searchQuery)}
        </Text>
      );
      continue;
    }

    // Bullet items
    if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
      const bulletContent = trimmed.slice(2);
      renderedElements.push(
        <View key={i} style={{ flexDirection: 'row', paddingLeft: 6, marginVertical: 2, alignItems: 'flex-start' }}>
          <Text style={{ fontSize: 14, color: isUser ? '#FFFFFF' : theme.textPrimary, marginRight: 6 }}>•</Text>
          <Text style={{ flex: 1, fontSize: 14, lineHeight: 20, color: isUser ? '#FFFFFF' : theme.textPrimary }}>
            {parseInlineStyles(bulletContent, isUser, theme, searchQuery)}
          </Text>
        </View>
      );
      continue;
    }

    // Numbered items
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (numMatch) {
      const num = numMatch[1];
      const listContent = numMatch[2];
      renderedElements.push(
        <View key={i} style={{ flexDirection: 'row', paddingLeft: 6, marginVertical: 2, alignItems: 'flex-start' }}>
          <Text style={{ fontSize: 14, color: isUser ? '#FFFFFF' : theme.textPrimary, marginRight: 6, fontWeight: '700' }}>
            {num}.
          </Text>
          <Text style={{ flex: 1, fontSize: 14, lineHeight: 20, color: isUser ? '#FFFFFF' : theme.textPrimary }}>
            {parseInlineStyles(listContent, isUser, theme, searchQuery)}
          </Text>
        </View>
      );
      continue;
    }

    // Plain-text custom headings (e.g. ⚖️ FINAL VERDICT, Win Probability)
    const isLegalHeading = (text: string): boolean => {
      const clean = text.replace(/^[^\w\s]*\s*/, '').trim().toLowerCase();
      const headings = [
        'final verdict',
        'simplified explanation',
        'legal analysis',
        'risks & loopholes',
        'enforceability check',
        'what to do next',
        'improved clause (rewrite)',
        'improved clause',
        'law references',
        'legal disclaimer',
        'win probability',
        'case strength',
        'positive factors',
        'negative factors',
        'judicial outlook',
        'possible outcome',
        'risk analysis',
        'immediate actions',
        'tactical plan',
        'opponent strategy',
        'counter strategy',
        'courtroom strategy',
        'filing strategy',
        'evidence strategy',
        'evidence summary',
        'evidence classification',
        'admissibility',
        'strength analysis',
        'missing evidence',
        'contradictions',
        'weaknesses',
        'recommendations',
        'overall evidence strength',
        'clause',
        'risk level',
        'why risk exists',
        'suggested change',
        'original clause',
        'reason for rewrite',
        'legal overview',
        'explanation',
        'relevant sections',
        'landmark judgments',
        'practical application',
        'judicial interpretation',
        'requirement',
        'status',
        'missing compliance',
        'similarities',
        'differences',
        'applicability',
        'strategic advantage',
        'main arguments',
        'supporting facts',
        'counter arguments',
        'rebuttals',
        'cross examination',
        'closing submission',
        'date',
        'event',
        'legal significance',
        'overall evidence assessment',
        'evidence breakdown',
        'risks, gaps & loopholes',
        'courtroom admissibility check',
        'defense attack strategy',
        'prosecution / user strategy',
        'evidence improvement plan',
        'legal backing',
        'evidence priority',
        'final insight',
        'case position (top summary)',
        'primary arguments (courtroom ready)',
        'strongest argument (highlight)',
        'opposition arguments (prediction)',
        'rebuttal strategy',
        'cross-examination questions',
        'courtroom narrative',
        'argument strategy (how to win)',
        'final closing statement',
        'final outcome (top summary)',
        'win probability breakdown',
        'key reasons (why this outcome)',
        'multi-scenario outcome',
        'scenario 1 — worst case',
        'scenario 1 - worst case',
        'scenario 2 — most likely case',
        'scenario 2 - most likely case',
        'scenario 3 — best case',
        'scenario 3 - best case',
        'case breakpoints (deciding factors)',
        'strategic action plan (lawyer-level)',
        'final strategic position',
        'core strategy (big picture)',
        'step-by-step action plan',
        'phase 1 – immediate actions',
        'phase 1 - immediate actions',
        'phase 2 – evidence strengthening',
        'phase 2 - evidence strengthening',
        'phase 3 – courtroom execution',
        'phase 3 - courtroom execution',
        'risks & defense challenges',
        'counter-strategy',
        'winning argument framework',
        'courtroom focus',
        'high-impact legal moves',
        'success strategy (final execution plan)',
        'key legal elements',
        'landmark case laws',
        'common defenses & loopholes',
        'strategic insight',
        'related legal provisions'
      ];
      return headings.includes(clean);
    };
    if (isLegalHeading(trimmed)) {
      renderedElements.push(
        <Text
          key={i}
          style={{
            fontSize: 18,
            fontWeight: '800',
            marginTop: 16,
            marginBottom: 8,
            color: isUser ? '#FFFFFF' : '#111827',
          }}
        >
          {parseInlineStyles(trimmed, isUser, theme, searchQuery)}
        </Text>
      );
      continue;
    }

    // Normal text lines
    if (trimmed.length > 0) {
      renderedElements.push(
        <Text
          key={i}
          style={{
            fontSize: 14.5,
            lineHeight: 21,
            marginVertical: 3,
            color: isUser ? '#FFFFFF' : theme.textPrimary,
          }}
        >
          {parseInlineStyles(line, isUser, theme, searchQuery)}
        </Text>
      );
    } else {
      renderedElements.push(<View key={i} style={{ height: 6 }} />);
    }
  }

  return <View style={{ alignSelf: 'stretch' }}>{renderedElements}</View>;
};

// Response structured sections definitions for Digital Forensics reports
interface ForensicsSection {
  title: string;
  content: string;
  type:
    | 'summary'
    | 'evType'
    | 'confidence'
    | 'findings'
    | 'dates'
    | 'entities'
    | 'contradictions'
    | 'missing'
    | 'weak'
    | 'strong'
    | 'recommendations'
    | 'steps'
    | 'normal';
}

const parseForensicsResponse = (content: string): ForensicsSection[] => {
  const lines = content.split('\n');
  const sections: ForensicsSection[] = [];
  let currentTitle = '';
  let currentContent: string[] = [];

  const getSectionType = (title: string): ForensicsSection['type'] => {
    const t = title.toLowerCase();
    if (t.includes('summary')) return 'summary';
    if (t.includes('evidence type') || t.includes('type')) return 'evType';
    if (t.includes('confidence')) return 'confidence';
    if (t.includes('findings')) return 'findings';
    if (t.includes('dates') || t.includes('timeline')) return 'dates';
    if (t.includes('people') || t.includes('organizations') || t.includes('locations') || t.includes('entities')) return 'entities';
    if (t.includes('contradictions') || t.includes('inconsistencies')) return 'contradictions';
    if (t.includes('missing')) return 'missing';
    if (t.includes('weak')) return 'weak';
    if (t.includes('strong')) return 'strong';
    if (t.includes('recommendations')) return 'recommendations';
    if (t.includes('steps') || t.includes('next')) return 'steps';
    return 'normal';
  };

  for (const line of lines) {
    const match = line.match(/^(#{1,3})\s+(.*)/);
    if (match) {
      if (currentContent.length > 0 || currentTitle) {
        sections.push({
          title: currentTitle || 'Forensic Brief',
          content: currentContent.join('\n').trim(),
          type: getSectionType(currentTitle),
        });
      }
      currentTitle = match[2].trim();
      currentContent = [];
    } else {
      currentContent.push(line);
    }
  }
  if (currentContent.length > 0 || currentTitle) {
    sections.push({
      title: currentTitle || 'Forensic Brief',
      content: currentContent.join('\n').trim(),
      type: getSectionType(currentTitle),
    });
  }

  if (sections.length === 0) {
    sections.push({
      title: '',
      content: content,
      type: 'normal',
    });
  }

  return sections;
};

const StructuredForensicsView: React.FC<{ content: string; searchQuery: string; theme: any }> = ({
  content,
  searchQuery,
  theme,
}) => {
  const isStructured =
    content.includes('Executive Summary') ||
    content.includes('Evidence Type') ||
    content.includes('Confidence Score') ||
    content.includes('Detected Contradictions') ||
    content.includes('Findings') ||
    content.includes('Timeline') ||
    content.includes('Contradictions');

  if (!isStructured) {
    return <CustomMarkdownText content={content} isUser={false} searchQuery={searchQuery} theme={theme} />;
  }

  const sections = parseForensicsResponse(content);

  return (
    <View style={{ alignSelf: 'stretch', gap: 12 }}>
      {sections.map((sec, index) => {
        if (sec.type === 'confidence') {
          const scoreText = sec.content;
          let confColor = '#10B981'; // Green
          let levelText = 'Highly Admissible';
          let progressVal = 0.9;

          if (scoreText.includes('70') || scoreText.includes('75') || scoreText.toLowerCase().includes('moderate')) {
            confColor = '#F59E0B'; // Amber
            levelText = 'Medium Veracity';
            progressVal = 0.72;
          } else if (scoreText.includes('50') || scoreText.includes('60') || scoreText.toLowerCase().includes('low')) {
            confColor = '#EF4444'; // Red
            levelText = 'Low Veracity / Unverified';
            progressVal = 0.45;
          }

          return (
            <View key={index} style={[styles.forensicsCard, { borderLeftColor: confColor }]}>
              <View style={styles.cardHeaderRow}>
                <Ionicons name="ribbon-outline" size={18} color={confColor} />
                <Text style={[styles.cardTitleText, { color: theme.textPrimary }]}>
                  {sec.title || 'Confidence Score'}
                </Text>
              </View>
              <View style={{ marginTop: 8 }}>
                <Text style={{ fontSize: 13, color: theme.textSecondary, marginBottom: 6 }}>
                  {renderWithSearchHighlight(sec.content, searchQuery)}
                </Text>
                <View style={styles.progressBarBg}>
                  <View style={{ height: '100%', width: `${progressVal * 100}%`, backgroundColor: confColor, borderRadius: 4 }} />
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                  <Text style={{ fontSize: 11, color: theme.textMuted }}>Unverified</Text>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: confColor }}>{levelText}</Text>
                  <Text style={{ fontSize: 11, color: theme.textMuted }}>Certified</Text>
                </View>
              </View>
            </View>
          );
        }

        let borderLeftColor = theme.border;
        let cardIcon = 'finger-print-outline';
        let iconColor = theme.textSecondary;
        let cardBg = theme.surface;

        switch (sec.type) {
          case 'summary':
            borderLeftColor = '#10B981'; // Emerald
            cardIcon = 'search-circle-outline';
            iconColor = '#10B981';
            cardBg = '#F0FDF4';
            break;
          case 'evType':
            borderLeftColor = '#64748B';
            cardIcon = 'folder-open-outline';
            iconColor = '#64748B';
            break;
          case 'findings':
            borderLeftColor = '#208AEF'; // Blue
            cardIcon = 'document-text-outline';
            iconColor = '#208AEF';
            break;
          case 'dates':
            borderLeftColor = '#F59E0B'; // Amber
            cardIcon = 'calendar-outline';
            iconColor = '#F59E0B';
            break;
          case 'contradictions':
            borderLeftColor = '#EF4444'; // Red
            cardIcon = 'alert-circle-outline';
            iconColor = '#EF4444';
            cardBg = '#FFF5F5';
            break;
          case 'weak':
          case 'missing':
            borderLeftColor = '#EF4444';
            cardIcon = 'close-circle-outline';
            iconColor = '#EF4444';
            break;
          case 'strong':
          case 'recommendations':
            borderLeftColor = '#10B981';
            cardIcon = 'checkmark-circle-outline';
            iconColor = '#10B981';
            cardBg = '#F0FDF4';
            break;
          case 'steps':
            borderLeftColor = '#8B5CF6';
            cardIcon = 'git-commit-outline';
            iconColor = '#8B5CF6';
            cardBg = '#F5F3FF';
            break;
        }

        if (sec.type === 'normal') {
          return <CustomMarkdownText key={index} content={sec.content} isUser={false} searchQuery={searchQuery} theme={theme} />;
        }

        return (
          <View key={index} style={[styles.forensicsCard, { borderLeftColor, backgroundColor: cardBg }]}>
            <View style={styles.cardHeaderRow}>
              <Ionicons name={cardIcon as any} size={18} color={iconColor} />
              <Text style={[styles.cardTitleText, { color: theme.textPrimary }]}>{sec.title}</Text>
            </View>
            <View style={{ marginTop: 6 }}>
              <CustomMarkdownText content={sec.content} isUser={false} searchQuery={searchQuery} theme={theme} />
            </View>
          </View>
        );
      })}
    </View>
  );
};

// DICTIONARY OF ACTION SHEETS
const EVIDENCE_ACTIONS = {
  documentAnalysis: [
    { id: 'analyze_pdf', label: 'Analyze PDF', desc: 'Scan and digest document pages', isImmediate: true },
    { id: 'analyze_images', label: 'Analyze Images', desc: 'Verify forensic contents of images', isImmediate: true },
    { id: 'ocr_extraction', label: 'OCR Extraction', desc: 'Convert scanned image text into copyable lines', isImmediate: true },
    { id: 'extract_tables', label: 'Extract Tables', desc: 'Convert structured layout sheets into grid cells', isImmediate: true },
    { id: 'extract_signatures', label: 'Extract Signatures', desc: 'Find and isolate signatures in contracts', isImmediate: true },
    { id: 'extract_stamps', label: 'Extract Stamps', desc: 'Locate legal verification stamps and dates', isImmediate: true },
    { id: 'extract_metadata', label: 'Extract Metadata', desc: 'Read file headers, timestamps, coordinates, and creator', isImmediate: true },
  ],
  investigation: [
    { id: 'timeline_generation', label: 'Timeline Generation', desc: 'Map facts chronologically with calendar logs', isImmediate: true },
    { id: 'people_detection', label: 'People Detection', desc: 'List all individuals mentioned in dossier', isImmediate: true },
    { id: 'org_detection', label: 'Organization Detection', desc: 'Map corporate or governmental units', isImmediate: true },
    { id: 'loc_detection', label: 'Location Detection', desc: 'Extract geographical coordinates and addresses', isImmediate: true },
    { id: 'date_extraction', label: 'Date Extraction', desc: 'List all critical calendar citations', isImmediate: true },
    { id: 'conv_analysis', label: 'Conversation Analysis', desc: 'Analyze conversation tone, messages, and gaps', isImmediate: true },
    { id: 'correlation', label: 'Evidence Correlation', desc: 'Verify how files corroborate or oppose each other', isImmediate: true },
    { id: 'contradiction_detection', label: 'Contradiction Detection', desc: 'Scan for direct text or date lies', isImmediate: true },
    { id: 'relationship_mapping', label: 'Relationship Mapping', desc: 'Build link chart of people and entities', isImmediate: true },
  ],
  legalIntelligence: [
    { id: 'strength_assessment', label: 'Evidence Strength Assessment', desc: 'Verify weight, admissibility, and relevance', isImmediate: true },
    { id: 'missing_evidence', label: 'Missing Evidence', desc: 'List gaps that need further discovery', isImmediate: true },
    { id: 'chain_of_custody', label: 'Chain of Custody Review', desc: 'Verify transfer path and evidence integrity logs', isImmediate: true },
    { id: 'authenticity_check', label: 'Authenticity Check', desc: 'Check metadata modification stamps', isImmediate: true },
    { id: 'forgery_indicators', label: 'Forgery Indicators', desc: 'Scan for image edits or metadata rewrites', isImmediate: true },
    { id: 'compliance_review', label: 'Compliance Review', desc: 'Verify legal acquisition guidelines compliance', isImmediate: true },
  ],
  aiIntelligence: [
    { id: 'summarize_evidence', label: 'Summarize Evidence', desc: 'Quick high-level digest of all documents', isImmediate: true },
    { id: 'investigation_report', label: 'Generate Investigation Report', desc: 'Complete case file summary and facts', isImmediate: true },
    { id: 'court_summary', label: 'Generate Court Summary', desc: 'Prepare visual facts sheet for the judge', isImmediate: true },
    { id: 'client_summary', label: 'Generate Client Summary', desc: 'Explain evidence posture in plain language', isImmediate: true },
    { id: 'cross_questions', label: 'Generate Cross Examination Questions', desc: 'Get questions targeting details and contradictions', isImmediate: true },
    { id: 'suggest_evidence', label: 'Suggest Additional Evidence', desc: 'Identify supportive items to gather', isImmediate: true },
    { id: 'suggest_strategy', label: 'Suggest Legal Strategy', desc: 'Structure arguments around evidence findings', isImmediate: true },
    { id: 'further_investigation', label: 'Suggest Further Investigation', desc: 'Define discovery targets and interviews', isImmediate: true },
  ]
};

// Input-Focused Custom Queries
const INPUT_ACTIONS = [
  { id: 'search_evidence', label: 'Search Evidence', desc: 'Search for phrases in OCR logs', placeholder: 'Search within uploaded evidence...' },
  { id: 'find_keyword', label: 'Find Keyword', desc: 'Locate occurrences of a term', placeholder: 'Enter keyword...' },
  { id: 'explain_page', label: 'Explain Specific Page', desc: 'Detail contents of specific pages', placeholder: 'Enter page number to explain...' },
  { id: 'ask_evidence', label: 'Ask About Evidence', desc: 'Pose specific query regarding case files', placeholder: 'Ask about this evidence...' },
  { id: 'custom_investigation', label: 'Custom Investigation', desc: 'Formulate bespoke forensics requests', placeholder: 'Describe what to investigate...' }
];

// Offline Response Database
const MOCK_ANSWERS: Record<string, string> = {
  ocr_extraction: `# Executive Summary
Forensics optical character characterization completed on scanned receipt.

# Evidence Type
Scanned JPEG Receipt

# Confidence Score: 95% Confidence
Text extracted cleanly with high character classification rates.

# Key Findings
* **Transaction ID:** TXN-908123-B
* **Parties:** ABC Estates Ltd. and Nitin Kumar.
* **Amount Credited:** INR 5,00,000 (Five Lakhs Indian Rupees).
* **Payment Mode:** Cash transaction.
* **Stamp Registry:** Registered stamp of Notary Public, Delhi.

# Next Investigation Steps
* Match transaction ledger timestamp with bank deposit records.`,

  timeline_generation: `# Executive Summary
Chronological sequence mapping events extracted from the evidence package.

# Evidence Type
WhatsApp Log + Medical Audit Timeline

# Confidence Score: 90% Confidence
Chronology matched successfully with metadata timestamps.

# Timeline
* **2026-05-10 10:15 AM:** nitrite payment receipt signed by Nitin Kumar.
* **2026-05-10 04:30 PM:** Complainant sent a WhatsApp ping requesting verification.
* **2026-05-11 02:20 AM:** First physical altercation reported at Saket Metro Market.
* **2026-05-11 05:40 AM:** Complainant admitted to Saket Trauma Centre.
* **2026-05-11 09:00 AM:** Medical report signed by Dr. R. K. Sen.

# Next Investigation Steps
* Verify doctor signature authenticity.`,

  contradiction_detection: `# Executive Summary
Contradiction analysis matching witness statements with digital file logs.

# Evidence Type
WhatsApp Log vs Physical Statements

# Confidence Score: 75% Confidence
Moderate conflicts found in spatial-temporal location claims.

# Detected Contradictions
* **Contradiction 1 (Location):** Complainant claims Nitin Kumar was in Noida at 4:30 PM on May 10. WhatsApp export metadata shows Nitin sent GPS coordinates from Saket Metro, Delhi at 4:32 PM.
* **Contradiction 2 (Altercation Time):** Medical trauma entry notes head injuries occurred around 1:00 AM on May 11, whereas witness statements claim the incident happened after 8:00 AM.

# Weak Evidence
* Witness statements are unsigned and scanned in low resolution.

# Next Investigation Steps
* Demand cell tower log subpoena for Nitin's mobile carrier records.`,

  summarize_evidence: `# Executive Summary
Overview summary of all attached forensic evidence files.

# Evidence Type
Multi-format Evidence Case Dossier

# Confidence Score: 88% Confidence
Files show high internal consistency.

# Key Findings
* Financial statements corroborate payment milestones.
* Chat transcripts establish pre-meditated communication.

# Detected Contradictions
* Inconsistency found regarding payment schedules; bank statements list payment as cleared, while vendor logs mark it as default.

# AI Recommendations
* Summon certified ledger logs under Bankers' Books Act.`,

  investigation_report: `# Executive Summary
Full Forensic Investigation Brief on Nitin Kumar case logs.

# Evidence Type
Digital Forensics Folder

# Confidence Score: 92% Confidence
Document verification complete.

# Key Findings
* Chat logs verify recipient identity.
* Bank ledgers indicate credits mapping exactly to receipt date.

# Detected Contradictions
* Defendant denies receipt of text messages; WhatsApp transcript logs show 'double-blue' checkmark confirmations for all messages.

# AI Recommendations
* Procure original device for digital hardware checksum validation.`
};

export default function EvidenceAnalystScreen() {
  useAuthGuard();
  const router = useRouter();
  const { showToast } = useToastContext();
  const { theme } = useThemeContext();
  const insets = useSafeAreaInsets();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [inputVal, setInputVal] = useState('');
  const [isSending, setIsSending] = useState(false);
  const streamTimerRef = useRef<any>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isCancelledRef = useRef<boolean>(false);

  useEffect(() => {
    return () => {
      if (streamTimerRef.current) clearInterval(streamTimerRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);
  
  const {
    attachments,
    setAttachments,
    isBottomSheetVisible,
    isCameraVisible,
    isUploading,
    showAttachmentOptions,
    hideAttachmentOptions,
    hideCamera,
    handleRemoveAttachment,
    clearAttachments,
    handleSelectOption,
    handleCameraConfirm,
    uploadPendingAttachments,
  } = useAttachmentHandler();

  // Search feature
  const [searchQuery, setSearchQuery] = useState('');

  // Chat History Drawer States
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historySessions, setHistorySessions] = useState<any[]>([]);
  const [searchHistoryQuery, setSearchHistoryQuery] = useState('');
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [renameTitleVal, setRenameTitleVal] = useState('');

  const fetchHistorySessions = async () => {
    try {
      const res = await ChatService.listSessions();
      const sessionList = Array.isArray(res) ? res : (res?.data || []);
      const filtered = sessionList.filter((s: any) => s.activeTool === 'evidenceAnalyst');
      setHistorySessions(filtered);
    } catch (err) {
      console.warn('Failed to fetch chat history:', err);
    }
  };

  useEffect(() => {
    fetchHistorySessions();
  }, [sessionId]);

  const handleSelectSession = async (sId: string) => {
    try {
      setIsHistoryOpen(false);
      const res = await ChatService.getSessionDetails(sId);
      const detailSession = (res as any).data || res;
      if (detailSession) {
        setSessionId(sId);
        setMessages(detailSession.messages || []);
        showToast('success', 'Conversation Loaded', 'Previous chat loaded.');
      }
    } catch (err) {
      console.warn('Failed to load session details:', err);
      showToast('error', 'Load Failed', 'Could not load conversation.');
    }
  };

  const handleDeleteSession = async (sId: string) => {
    try {
      await ChatService.deleteSession(sId);
      setHistorySessions((prev) => prev.filter((s) => s.sessionId !== sId));
      if (sessionId === sId) {
        setSessionId(null);
        setMessages([]);
      }
      showToast('success', 'Conversation Deleted', 'Logs removed.');
    } catch (err) {
      console.warn('Failed to delete session:', err);
      showToast('error', 'Delete Failed', 'Could not delete conversation.');
    }
  };

  const handleRenameConfirm = async (sId: string) => {
    if (renameTitleVal.trim()) {
      try {
        await ChatService.renameSession(sId, renameTitleVal.trim());
        setHistorySessions((prev) =>
          prev.map((s) => (s.sessionId === sId ? { ...s, title: renameTitleVal.trim() } : s))
        );
        setEditingSessionId(null);
        setRenameTitleVal('');
        showToast('success', 'Session Renamed', 'Title updated.');
      } catch (err) {
        console.warn('Failed to rename session:', err);
        showToast('error', 'Rename Failed', 'Could not rename conversation.');
      }
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setSessionId(null);
    clearAttachments();
    setInputVal('');
    showToast('info', 'New Chat', 'New chat conversation started.');
  };

  const filteredHistorySessions = useMemo(() => {
    let list = historySessions;
    if (searchHistoryQuery.trim()) {
      list = historySessions.filter((s) =>
        s.title.toLowerCase().includes(searchHistoryQuery.toLowerCase())
      );
    }
    return [...list].sort((a, b) => b.lastModified - a.lastModified);
  }, [historySessions, searchHistoryQuery]);

  // Actions bottom sheet
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const [actionsSearchQuery, setActionsSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<string[]>(['Timeline Generation', 'OCR Extraction', 'Contradiction Detection']);
  const [recentlyUsed, setRecentlyUsed] = useState<string[]>(['Analyze PDF', 'OCR Extraction', 'Timeline Generation']);

  // UI state for inputs composer
  const [composerPlaceholder, setComposerPlaceholder] = useState('Ask about this evidence...');
  const textInputRef = useRef<TextInput>(null);
  const flatListRef = useRef<FlatList>(null);
  const isAtBottomRef = useRef(true);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const scrollBtnOpacity = useRef(new Animated.Value(0)).current;
  const scrollBtnScale = useRef(new Animated.Value(0.95)).current;
  const hideTimerRef = useRef<any>(null);
  const lastOffsetRef = useRef<number>(0);

  const handleScrollAction = (shouldShow: boolean) => {
    if (shouldShow) {
      if (!showScrollBtn) {
        setShowScrollBtn(true);
        Animated.parallel([
          Animated.timing(scrollBtnOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
          Animated.timing(scrollBtnScale, { toValue: 1, duration: 200, useNativeDriver: true }),
        ]).start();
      }
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      hideTimerRef.current = setTimeout(() => {
        Animated.parallel([
          Animated.timing(scrollBtnOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
          Animated.timing(scrollBtnScale, { toValue: 0.95, duration: 250, useNativeDriver: true }),
        ]).start((result: { finished: boolean }) => {
          if (result.finished) {
            setShowScrollBtn(false);
          }
        });
      }, 2500);
    } else {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
      Animated.parallel([
        Animated.timing(scrollBtnOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.timing(scrollBtnScale, { toValue: 0.95, duration: 250, useNativeDriver: true }),
      ]).start((result: { finished: boolean }) => {
        if (result.finished) {
          setShowScrollBtn(false);
        }
      });
    }
  };

  useEffect(() => {
    if (inputVal.trim() !== '') {
      handleScrollAction(false);
    }
  }, [inputVal]);

  // Expanded bubble states
  const [expandedMessages, setExpandedMessages] = useState<Record<string, boolean>>({});

  // Dynamic Evidence Detection
  const detectedDocTypes = useMemo(() => {
    if (attachments.length === 0) return [];
    return attachments.map((a) => {
      const name = a.name.toLowerCase();
      if (name.includes('whatsapp') || name.includes('chat')) return 'WhatsApp Chat Export';
      if (name.includes('medical') || name.includes('injury')) return 'Medical Report';
      if (name.includes('bank') || name.includes('statement') || name.includes('ledger')) return 'Bank Statement';
      if (name.includes('video') || name.includes('.mp4')) return 'Video Evidence';
      if (name.includes('witness') || name.includes('statement')) return 'Witness Statement';
      if (name.includes('zip') || name.includes('tar')) return 'Compressed Dossier';
      return 'Generic Evidence';
    });
  }, [attachments]);

  // AI Recommendations depending on the uploaded evidence files
  const aiRecommendedActions = useMemo(() => {
    if (detectedDocTypes.length === 0) return [];
    const recommendations: { id: string; label: string; desc: string }[] = [];
    
    if (detectedDocTypes.includes('WhatsApp Chat Export')) {
      recommendations.push(
        { id: 'conv_analysis', label: 'Conversation Summary', desc: 'Summarize chat themes and timings' },
        { id: 'timeline_generation', label: 'Timeline Generation', desc: 'Formulate chronology of alerts' },
        { id: 'contradiction_detection', label: 'Contradiction Detection', desc: 'Compare chat logs with statement timelines' },
        { id: 'people_detection', label: 'People Extraction', desc: 'Identify active participants' }
      );
    }
    if (detectedDocTypes.includes('Medical Report')) {
      recommendations.push(
        { id: 'medical_summary', label: 'Medical Summary', desc: 'Translate medical terms into brief statements' },
        { id: 'timeline_generation', label: 'Injury Timeline', desc: 'Correlate clinical records with incident hours' },
        { id: 'injury_analysis', label: 'Injury Analysis', desc: 'Verify trauma consistency' }
      );
    }
    if (detectedDocTypes.includes('Bank Statement')) {
      recommendations.push(
        { id: 'bank_analysis', label: 'Transaction Analysis', desc: 'Check money deposits and statements' },
        { id: 'timeline_generation', label: 'Financial Timeline', desc: 'Map accounting credits over calendar dates' },
        { id: 'suspicious_txns', label: 'Suspicious Transactions', desc: 'Flag unusual bulk cash movements' }
      );
    }
    if (detectedDocTypes.includes('Video Evidence')) {
      recommendations.push(
        { id: 'video_frame', label: 'Frame Analysis', desc: 'Extract frame timeline markers' },
        { id: 'obj_detection', label: 'Object Detection', desc: 'Verify visible weapons or vehicles' },
        { id: 'timestamp_review', label: 'Timestamp Review', desc: 'Audit camera overlays validity' }
      );
    }

    // Standard fallback recommendations if any files exist
    if (recommendations.length === 0) {
      recommendations.push(
        { id: 'ocr_extraction', label: 'OCR Extraction', desc: 'Pull text logs from files' },
        { id: 'summarize_evidence', label: 'Summarize Evidence', desc: 'General findings brief' }
      );
    }
    
    return recommendations.slice(0, 4); // return top 4
  }, [detectedDocTypes]);

  const scrollToBottom = (animated = true) => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated });
    }, 100);
  };

  const handleSend = async (overrideText?: string, actionId?: string, editMessageId?: string) => {
    const text = overrideText || inputVal.trim();
    if (!text && attachments.length === 0) return;

    setIsSending(true);

    let uploadedAttachments = attachments;
    if (attachments.length > 0 && !editMessageId) {
      try {
        uploadedAttachments = await uploadPendingAttachments();
      } catch (uploadErr) {
        setIsSending(false);
        return;
      }
    }

    // Optimistic user message append / edit replacement
    let userMsgId = `msg_${Date.now()}`;
    let updatedMessages: ChatMessage[] = [];

    if (editMessageId) {
      const msgIdx = messages.findIndex((m) => m.id === editMessageId);
      if (msgIdx !== -1) {
        const editedMsg = {
          ...messages[msgIdx],
          content: text,
          timestamp: Date.now(),
        };
        updatedMessages = [
          ...messages.slice(0, msgIdx),
          editedMsg
        ];
        userMsgId = editMessageId;
      } else {
        const newUserMessage: ChatMessage = {
          id: userMsgId,
          role: 'user',
          content: text,
          timestamp: Date.now(),
          attachments: [],
        };
        updatedMessages = [...messages, newUserMessage];
      }
    } else {
      const newUserMessage: ChatMessage = {
        id: userMsgId,
        role: 'user',
        content: text,
        timestamp: Date.now(),
        attachments: [...uploadedAttachments],
      };
      updatedMessages = [...messages, newUserMessage];
    }

    setMessages(updatedMessages);
    if (!editMessageId) {
      setInputVal('');
      setComposerPlaceholder('Ask about this evidence...');
    }
    scrollToBottom(true);

    const aiMsgId = `msg_ai_${Date.now()}`;
    const placeholderAiMessage: ChatMessage = {
      id: aiMsgId,
      role: 'model',
      content: '',
      timestamp: Date.now() + 1,
      isProcessing: true,
    };

    const finalMessages = [...updatedMessages, placeholderAiMessage];
    setMessages(finalMessages);

    // Keep track of recently used
    if (actionId) {
      const allActs = [
        ...EVIDENCE_ACTIONS.documentAnalysis,
        ...EVIDENCE_ACTIONS.investigation,
        ...EVIDENCE_ACTIONS.legalIntelligence,
        ...EVIDENCE_ACTIONS.aiIntelligence,
        ...aiRecommendedActions
      ];
      const match = allActs.find((a) => a.id === actionId);
      if (match) {
        setRecentlyUsed((prev) => {
          const filtered = prev.filter((n) => n !== match.label);
          return [match.label, ...filtered].slice(0, 3);
        });
      }
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    isCancelledRef.current = false;

    try {
      const currentSessionId = sessionId || `session_forensic_${Date.now()}`;
      setSessionId(currentSessionId);

      const history = finalMessages
        .filter((m) => m.id !== aiMsgId)
        .map((m) => ({ role: m.role, content: m.content }));

      const payload: Record<string, any> = {
        content: text,
        sessionId: currentSessionId,
        activeTool: 'evidenceAnalyst',
        stream: true,
        history,
      };

      if (uploadedAttachments.length > 0 && !editMessageId) {
        payload.document = uploadedAttachments.map((a) => ({
          name: a.name,
          mimeType: a.type,
          base64Data: a.base64Data || '',
          url: a.url,
        }));
      }

      let isFallbackNeeded = true;
      let accumulatedText = '';

      try {
        const stream = streamAIResponse('/chat', payload, controller.signal);
        for await (const token of stream) {
          if (isCancelledRef.current || controller.signal.aborted) {
            break;
          }
          isFallbackNeeded = false;
          accumulatedText += token;
          setMessages((prev) =>
            prev.map((m) => (m.id === aiMsgId ? { ...m, content: accumulatedText } : m))
          );
        }
      } catch (streamErr) {
        console.warn('[EvidenceAnalyst] Stream err, fallback used:', streamErr);
      }

      if (isCancelledRef.current || controller.signal.aborted) {
        setMessages((prev) =>
          prev.map((m) => (m.id === aiMsgId ? { ...m, isProcessing: false } : m))
        );
        setIsSending(false);
        return;
      }

      if (isFallbackNeeded) {
        // Fallback checks
        let key = 'summarize_evidence';
        if (actionId) {
          if (MOCK_ANSWERS[actionId]) {
            key = actionId;
          } else if (actionId.includes('ocr')) {
            key = 'ocr_extraction';
          } else if (actionId.includes('timeline')) {
            key = 'timeline_generation';
          } else if (actionId.includes('contradiction')) {
            key = 'contradiction_detection';
          } else if (actionId.includes('report')) {
            key = 'investigation_report';
          }
        } else {
          if (detectedDocTypes.includes('WhatsApp Chat Export')) key = 'contradiction_detection';
          else if (detectedDocTypes.includes('Medical Report')) key = 'timeline_generation';
          else if (detectedDocTypes.includes('Bank Statement')) key = 'ocr_extraction';
        }

        const fallbackResponse = MOCK_ANSWERS[key] || MOCK_ANSWERS.summarize_evidence;

        const chunks = fallbackResponse.split(' ');
        let curIdx = 0;
        let runningText = '';

        const timer = setInterval(() => {
          if (isCancelledRef.current) {
            clearInterval(timer);
            streamTimerRef.current = null;
            return;
          }
          if (curIdx < chunks.length) {
            runningText += (curIdx === 0 ? '' : ' ') + chunks[curIdx];
            setMessages((prev) =>
              prev.map((m) => (m.id === aiMsgId ? { ...m, content: runningText } : m))
            );
            curIdx += 2;
          } else {
            clearInterval(timer);
            streamTimerRef.current = null;
            setMessages((prev) =>
              prev.map((m) => (m.id === aiMsgId ? { ...m, isProcessing: false } : m))
            );
            setIsSending(false);
            scrollToBottom(true);
          }
        }, 15);
        streamTimerRef.current = timer;

        return;
      }

      setMessages((prev) =>
        prev.map((m) => (m.id === aiMsgId ? { ...m, isProcessing: false } : m))
      );

      setTimeout(async () => {
        try {
          if (isCancelledRef.current || controller.signal.aborted) {
            return;
          }
          const res = await ChatService.getSessionDetails(currentSessionId);
          if (isCancelledRef.current || controller.signal.aborted) {
            return;
          }
          const sess = (res as any).data || res;
          if (sess?.messages) {
            setMessages(sess.messages);
          }
        } catch (e) {
          console.warn('[EvidenceAnalyst] Session details sync error:', e);
        }
      }, 1000);

    } catch (e) {
      if (isCancelledRef.current || controller.signal.aborted) {
        setMessages((prev) =>
          prev.map((m) => (m.id === aiMsgId ? { ...m, isProcessing: false } : m))
        );
      } else {
        console.error(e);
        showToast('error', 'Forensic Audit Failed', 'AI was unable to process case files.');
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiMsgId
              ? {
                  ...m,
                  content: '⚠️ Evidence analysis failed. Please verify connection and try again.',
                  isProcessing: false,
                }
              : m
          )
        );
      }
    } finally {
      setIsSending(false);
      abortControllerRef.current = null;
      scrollToBottom(true);
    }
  };


  // Response utilities
  const handleCopyText = (content: string) => {
    Clipboard.setString(content);
    showToast('success', 'Copied', 'Forensics brief copied to clipboard.');
  };

  const handleExportPDF = (name: string) => {
    showToast('success', 'Forensic Export Success', `${name} analysis saved to case reports.`);
  };

  const handleShareAnalysis = () => {
    showToast('info', 'Share Screen', 'Forensics report sharing initialized.');
  };

  const handleSaveToCase = () => {
    showToast('success', 'Saved', 'Forensic report linked to case dossiers.');
  };

  const handleCancelStream = () => {
    isCancelledRef.current = true;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (streamTimerRef.current) {
      clearInterval(streamTimerRef.current);
      streamTimerRef.current = null;
    }
    setMessages((prev) =>
      prev.map((m) => (m.isProcessing ? { ...m, isProcessing: false } : m))
    );
    setIsSending(false);
  };

  // Action Bottom Sheet execution rules
  const handleExecuteAction = (action: { id: string; label: string; isImmediate: boolean; placeholder?: string }) => {
    setIsActionsOpen(false);
    if (action.isImmediate) {
      let prompt = `Run ${action.label} on case files.`;
      if (attachments.length > 0) {
        prompt = `Run ${action.label} on attached evidence files: ${attachments.map((a) => `"${a.name}"`).join(', ')}.`;
      }
      handleSend(prompt, action.id);
    } else {
      // Focus Input & Update placeholder
      setComposerPlaceholder(action.placeholder || 'Ask about this evidence...');
      setTimeout(() => {
        textInputRef.current?.focus();
      }, 150);
    }
  };

  // Filter actions based on bottom sheet search phrase
  const filteredActions = useMemo(() => {
    const query = actionsSearchQuery.toLowerCase().trim();
    if (!query) return EVIDENCE_ACTIONS;

    const filterList = (list: { id: string; label: string; desc: string; isImmediate: boolean }[]) =>
      list.filter((a) => a.label.toLowerCase().includes(query) || a.desc.toLowerCase().includes(query));

    return {
      documentAnalysis: filterList(EVIDENCE_ACTIONS.documentAnalysis),
      investigation: filterList(EVIDENCE_ACTIONS.investigation),
      legalIntelligence: filterList(EVIDENCE_ACTIONS.legalIntelligence),
      aiIntelligence: filterList(EVIDENCE_ACTIONS.aiIntelligence),
    };
  }, [actionsSearchQuery]);

  const toggleFavorite = (actionLabel: string) => {
    setFavorites((prev) => {
      if (prev.includes(actionLabel)) {
        return prev.filter((a) => a !== actionLabel);
      } else {
        return [...prev, actionLabel];
      }
    });
    showToast('info', 'Favorites Updated', `Favorites checklist updated.`);
  };

  const handleClearWorkspace = () => {
    setMessages([]);
    setSessionId(null);
    setAttachments([]);
    showToast('info', 'Session Reset', 'Evidence workspace logs cleared.');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      {/* APP BAR HEADER */}
      <View style={[styles.header, { borderBottomColor: theme.border, backgroundColor: theme.surface }]}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
        </Pressable>

        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Evidence Analyst</Text>
        </View>

        <View style={styles.headerRightActions}>
          <Pressable onPress={() => setIsHistoryOpen(true)} style={styles.headerBtn}>
            <Ionicons name="time-outline" size={22} color={theme.textPrimary} />
          </Pressable>
          <Pressable onPress={handleNewChat} style={styles.headerBtn}>
            <Ionicons name="add" size={24} color={theme.textPrimary} />
          </Pressable>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        style={{ flex: 1 }}
      >
        {/* CONVERSATION AREA */}
        {messages.length === 0 ? (
          <ChatWelcome 
            title="Evidence Analyst" 
            subtitle="Ask about your evidence..." 
            icon="📂" 
          />
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            onScroll={(e) => {
              const offset = e.nativeEvent.contentOffset.y;
              const contentHeight = e.nativeEvent.contentSize.height;
              const layoutHeight = e.nativeEvent.layoutMeasurement.height;
              const distanceFromBottom = contentHeight - (offset + layoutHeight);
              isAtBottomRef.current = distanceFromBottom <= 50;

              const isScrollingUp = offset < lastOffsetRef.current;
              lastOffsetRef.current = offset;

              if (distanceFromBottom <= 50) {
                handleScrollAction(false);
              } else {
                const shouldShow = isScrollingUp && 
                                   distanceFromBottom > 100 && 
                                   messages.length > 4 && 
                                   inputVal.trim() === '';
                handleScrollAction(shouldShow);
              }
            }}
            onContentSizeChange={() => {
              if (isAtBottomRef.current && !isSending) {
                scrollToBottom(true);
              }
            }}
            onLayout={() => {
              if (!isSending) {
                scrollToBottom(true);
              }
            }}
            renderItem={({ item }) => {
            return (
              <ChatMessageBubble
                message={item}
                aiName="Evidence Analyst"
                aiIcon="📂"
                onCopy={() => {
                  Clipboard.setString(item.content);
                  showToast('success', 'Copied', 'Forensics copied to clipboard.');
                }}
                onShare={async () => {
                  try {
                    await Share.share({ message: item.content });
                  } catch (err) {
                    console.error(err);
                  }
                }}
                onEditMessage={(msgId, newText) => handleSend(newText, undefined, msgId)}
              />
            );
          }}
          ListFooterComponent={null}
        />
      )}

      {showScrollBtn && (
        <Animated.View
          style={[
            styles.scrollDownBtn,
            {
              opacity: scrollBtnOpacity,
              transform: [{ scale: scrollBtnScale }]
            }
          ]}
        >
          <Pressable
            onPress={() => {
              handleScrollAction(false);
              scrollToBottom(true);
            }}
            style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' }}
          >
            <Ionicons name="arrow-down" size={18} color="#000000" />
          </Pressable>
        </Animated.View>
      )}

      {/* FLOATING ACTIVE ATTACHMENTS BAR */}
      {attachments.length > 0 && (
        <View style={styles.attachmentsBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {attachments.map((a) => {
              const fileMock = MOCK_EVIDENCE_FILES.find((f) => f.name === a.name);
              const docType = fileMock?.detectedType || 'Evidence';
              return (
                <View key={a.name} style={styles.attachmentChip}>
                  <Ionicons name="document-text" size={16} color="#10B981" />
                  <View style={{ marginHorizontal: 6, maxWidth: 140 }}>
                    <Text style={styles.attachmentName} numberOfLines={1}>
                      {a.name}
                    </Text>
                    <View style={styles.detectedBadge}>
                      <Text style={styles.detectedBadgeText}>{docType}</Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => handleRemoveAttachment(a.name)}>
                    <Ionicons name="close-circle" size={16} color="#EF4444" style={{ marginLeft: 4 }} />
                  </TouchableOpacity>
                </View>
              );
            })}
            <TouchableOpacity style={styles.addMoreBtn} onPress={showAttachmentOptions}>
              <Ionicons name="add" size={16} color="#475569" />
              <Text style={styles.addMoreText}>Add File</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {/* COMPOSER INPUT COMPONENT */}
        <ChatComposer
          value={inputVal}
          onChangeText={setInputVal}
          sending={isSending}
          onSend={(text) => handleSend(text)}
          onCancelStream={handleCancelStream}
          onAddAttachment={showAttachmentOptions}
          onPressSparkles={() => { setActionsSearchQuery(''); setIsActionsOpen(true); }}
          placeholder="Analyze evidence..."
          simulatedVoiceText="Scan these document records to extract critical timeline events."
        />
      </KeyboardAvoidingView>

      <AttachmentBottomSheet
        visible={isBottomSheetVisible}
        onClose={hideAttachmentOptions}
        onSelectOption={handleSelectOption}
      />

      <CustomCameraModal
        visible={isCameraVisible}
        onClose={hideCamera}
        onConfirm={handleCameraConfirm}
      />

      {/* FORENSICS ACTIONS BOTTOM SHEET */}
      <Modal visible={isActionsOpen} animationType="slide" transparent={true} onRequestClose={() => setIsActionsOpen(false)}>
        <TouchableWithoutFeedback onPress={() => setIsActionsOpen(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.bottomSheetContainer, Shadows.modal]}>
                <View style={styles.bottomSheetDragHandle} />

                <View style={styles.bottomSheetHeader}>
                  <Text style={styles.bottomSheetTitle}>Forensic AI Actions</Text>
                  <TouchableOpacity onPress={() => setIsActionsOpen(false)}>
                    <Ionicons name="close-circle" size={24} color="#94A3B8" />
                  </TouchableOpacity>
                </View>

                {/* Actions filter search input */}
                <View style={styles.sheetSearchContainer}>
                  <Ionicons name="search" size={18} color="#94A3B8" style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.sheetSearchInput}
                    placeholder="Search actions (e.g. OCR, timeline)..."
                    value={actionsSearchQuery}
                    onChangeText={setActionsSearchQuery}
                  />
                  {actionsSearchQuery ? (
                    <TouchableOpacity onPress={() => setActionsSearchQuery('')}>
                      <Ionicons name="close" size={18} color="#94A3B8" />
                    </TouchableOpacity>
                  ) : null}
                </View>

                <ScrollView style={styles.bottomSheetContent} showsVerticalScrollIndicator={false}>
                  {/* Recently Used (if no search active) */}
                  {!actionsSearchQuery && (
                    <>
                      <Text style={styles.categoryHeading}>⭐ Recently Used</Text>
                      <View style={styles.actionsGrid}>
                        {recentlyUsed.map((label, idx) => (
                          <TouchableOpacity
                            key={idx}
                            style={styles.recentActionItem}
                            onPress={() => {
                              const item = [...EVIDENCE_ACTIONS.documentAnalysis, ...EVIDENCE_ACTIONS.investigation, ...EVIDENCE_ACTIONS.legalIntelligence, ...EVIDENCE_ACTIONS.aiIntelligence].find((a) => a.label === label);
                              if (item) handleExecuteAction(item);
                            }}
                          >
                            <Ionicons name="time-outline" size={14} color="#64748B" style={{ marginRight: 4 }} />
                            <Text style={styles.recentActionText}>{label}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>

                      {/* Favorites */}
                      <Text style={styles.categoryHeading}>❤️ Favorites</Text>
                      <View style={styles.actionsGrid}>
                        {favorites.map((label, idx) => (
                          <TouchableOpacity
                            key={idx}
                            style={[styles.recentActionItem, { borderColor: '#10B981' }]}
                            onPress={() => {
                              const item = [...EVIDENCE_ACTIONS.documentAnalysis, ...EVIDENCE_ACTIONS.investigation, ...EVIDENCE_ACTIONS.legalIntelligence, ...EVIDENCE_ACTIONS.aiIntelligence].find((a) => a.label === label);
                              if (item) handleExecuteAction(item);
                            }}
                          >
                            <Ionicons name="star" size={12} color="#10B981" style={{ marginRight: 4 }} />
                            <Text style={[styles.recentActionText, { color: '#10B981' }]}>{label}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </>
                  )}

                  {/* AI Recommended Actions (changes based on active document type) */}
                  {!actionsSearchQuery && (
                    <>
                      <Text style={styles.categoryHeading}>🤖 AI Recommended</Text>
                      {aiRecommendedActions.length > 0 ? (
                        <View style={styles.actionsList}>
                          {aiRecommendedActions.map((action) => (
                            <TouchableOpacity key={action.id} style={styles.actionListItem} onPress={() => handleExecuteAction({ ...action, isImmediate: true })}>
                              <View style={styles.actionListIcon}>
                                <Ionicons name="sparkles" size={16} color="#10B981" />
                              </View>
                              <View style={{ flex: 1, marginLeft: 12 }}>
                                <Text style={styles.actionListTitle}>{action.label}</Text>
                                <Text style={styles.actionListDesc}>{action.desc}</Text>
                              </View>
                              <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
                            </TouchableOpacity>
                          ))}
                        </View>
                      ) : (
                        <View style={styles.actionsEmpty}>
                          <Text style={styles.actionsEmptyText}>Please attach evidence files to activate context-aware recommended checks.</Text>
                        </View>
                      )}
                    </>
                  )}

                  {/* Document Analysis Category */}
                  {filteredActions.documentAnalysis.length > 0 && (
                    <>
                      <Text style={styles.categoryHeading}>📄 Document Analysis</Text>
                      <View style={styles.actionsList}>
                        {filteredActions.documentAnalysis.map((action) => (
                          <TouchableOpacity key={action.id} style={styles.actionListItem} onPress={() => handleExecuteAction(action)}>
                            <View style={[styles.actionListIcon, { backgroundColor: '#EFF6FF' }]}>
                              <Ionicons name="document-text-outline" size={16} color="#3B82F6" />
                            </View>
                            <View style={{ flex: 1, marginLeft: 12 }}>
                              <Text style={styles.actionListTitle}>{action.label}</Text>
                              <Text style={styles.actionListDesc}>{action.desc}</Text>
                            </View>
                            <TouchableOpacity onPress={() => toggleFavorite(action.label)} style={{ padding: 4 }}>
                              <Ionicons name={favorites.includes(action.label) ? "star" : "star-outline"} size={18} color="#F59E0B" />
                            </TouchableOpacity>
                            <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
                          </TouchableOpacity>
                        ))}
                      </View>
                    </>
                  )}

                  {/* Investigation Category */}
                  {filteredActions.investigation.length > 0 && (
                    <>
                      <Text style={styles.categoryHeading}>🔍 Investigation & Forensics</Text>
                      <View style={styles.actionsList}>
                        {filteredActions.investigation.map((action) => (
                          <TouchableOpacity key={action.id} style={styles.actionListItem} onPress={() => handleExecuteAction(action)}>
                            <View style={[styles.actionListIcon, { backgroundColor: '#F0FDF4' }]}>
                              <Ionicons name="search-outline" size={16} color="#10B981" />
                            </View>
                            <View style={{ flex: 1, marginLeft: 12 }}>
                              <Text style={styles.actionListTitle}>{action.label}</Text>
                              <Text style={styles.actionListDesc}>{action.desc}</Text>
                            </View>
                            <TouchableOpacity onPress={() => toggleFavorite(action.label)} style={{ padding: 4 }}>
                              <Ionicons name={favorites.includes(action.label) ? "star" : "star-outline"} size={18} color="#F59E0B" />
                            </TouchableOpacity>
                            <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
                          </TouchableOpacity>
                        ))}
                      </View>
                    </>
                  )}

                  {/* Input-required Actions */}
                  {!actionsSearchQuery && (
                    <>
                      <Text style={styles.categoryHeading}>⌨️ Search & Query Inputs</Text>
                      <View style={styles.actionsList}>
                        {INPUT_ACTIONS.map((action) => (
                          <TouchableOpacity key={action.id} style={styles.actionListItem} onPress={() => handleExecuteAction({ ...action, isImmediate: false })}>
                            <View style={[styles.actionListIcon, { backgroundColor: '#FFFBEB' }]}>
                              <Ionicons name="chatbox-ellipses-outline" size={16} color="#F59E0B" />
                            </View>
                            <View style={{ flex: 1, marginLeft: 12 }}>
                              <Text style={styles.actionListTitle}>{action.label}</Text>
                              <Text style={styles.actionListDesc}>{action.desc}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
                          </TouchableOpacity>
                        ))}
                      </View>
                    </>
                  )}

                  {/* Legal Intelligence Category */}
                  {filteredActions.legalIntelligence.length > 0 && (
                    <>
                      <Text style={styles.categoryHeading}>⚖️ Legal Intelligence</Text>
                      <View style={styles.actionsList}>
                        {filteredActions.legalIntelligence.map((action) => (
                          <TouchableOpacity key={action.id} style={styles.actionListItem} onPress={() => handleExecuteAction(action)}>
                            <View style={[styles.actionListIcon, { backgroundColor: '#FEF2F2' }]}>
                              <Ionicons name="ribbon-outline" size={16} color="#EF4444" />
                            </View>
                            <View style={{ flex: 1, marginLeft: 12 }}>
                              <Text style={styles.actionListTitle}>{action.label}</Text>
                              <Text style={styles.actionListDesc}>{action.desc}</Text>
                            </View>
                            <TouchableOpacity onPress={() => toggleFavorite(action.label)} style={{ padding: 4 }}>
                              <Ionicons name={favorites.includes(action.label) ? "star" : "star-outline"} size={18} color="#F59E0B" />
                            </TouchableOpacity>
                            <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
                          </TouchableOpacity>
                        ))}
                      </View>
                    </>
                  )}

                  {/* AI Intelligence Category */}
                  {filteredActions.aiIntelligence.length > 0 && (
                    <>
                      <Text style={styles.categoryHeading}>🤖 AI Intelligence</Text>
                      <View style={styles.actionsList}>
                        {filteredActions.aiIntelligence.map((action) => (
                          <TouchableOpacity key={action.id} style={styles.actionListItem} onPress={() => handleExecuteAction(action)}>
                            <View style={[styles.actionListIcon, { backgroundColor: '#F5F3FF' }]}>
                              <Ionicons name="construct-outline" size={16} color="#8B5CF6" />
                            </View>
                            <View style={{ flex: 1, marginLeft: 12 }}>
                              <Text style={styles.actionListTitle}>{action.label}</Text>
                              <Text style={styles.actionListDesc}>{action.desc}</Text>
                            </View>
                            <TouchableOpacity onPress={() => toggleFavorite(action.label)} style={{ padding: 4 }}>
                              <Ionicons name={favorites.includes(action.label) ? "star" : "star-outline"} size={18} color="#F59E0B" />
                            </TouchableOpacity>
                            <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
                          </TouchableOpacity>
                        ))}
                      </View>
                    </>
                  )}

                  <View style={{ height: 40 }} />
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Sliding Sidebar History modal drawer */}
      <Modal
        visible={isHistoryOpen}
        animationType="none"
        transparent={true}
        onRequestClose={() => setIsHistoryOpen(false)}
      >
        <View style={styles.drawerOverlay}>
          {/* Semi-transparent backdrop */}
          <Pressable style={{ flex: 1 }} onPress={() => setIsHistoryOpen(false)} />

          {/* Sidebar Drawer container */}
          <View style={styles.drawerContainer}>
            <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
              <View style={styles.drawerHeader}>
                <Text style={styles.drawerTitle}>Chat Logs History</Text>
                <Pressable onPress={() => setIsHistoryOpen(false)}>
                  <Ionicons name="close" size={24} color={theme.textPrimary} />
                </Pressable>
              </View>

              <Pressable
                style={styles.drawerNewChatBtn}
                onPress={() => {
                  handleNewChat();
                  setIsHistoryOpen(false);
                }}
              >
                <Ionicons name="add" size={18} color="#FFFFFF" />
                <Text style={styles.drawerNewChatBtnText}>New Conversation</Text>
              </Pressable>

              <View style={styles.drawerSearchContainer}>
                <Ionicons name="search" size={16} color="#94A3B8" style={{ marginRight: 6 }} />
                <TextInput
                  placeholder="Search chats..."
                  placeholderTextColor="#94A3B8"
                  value={searchHistoryQuery}
                  onChangeText={setSearchHistoryQuery}
                  style={styles.drawerSearchInput}
                />
              </View>

              <ScrollView style={styles.drawerList}>
                {filteredHistorySessions.length === 0 ? (
                  <Text style={styles.drawerEmptyText}>No previous chats logged.</Text>
                ) : (
                  filteredHistorySessions.map((item) => (
                    <View
                      key={item.sessionId}
                      style={[
                        styles.drawerItem,
                        sessionId === item.sessionId && styles.drawerItemActive,
                      ]}
                    >
                      <Pressable
                        style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 12 }}
                        onPress={() => handleSelectSession(item.sessionId)}
                      >
                        <Ionicons
                          name="chatbox-ellipses-outline"
                          size={16}
                          color={sessionId === item.sessionId ? '#10B981' : theme.textSecondary}
                          style={{ marginRight: 10 }}
                        />

                        {editingSessionId === item.sessionId ? (
                          <TextInput
                            style={styles.drawerRenameInput}
                            value={renameTitleVal}
                            onChangeText={setRenameTitleVal}
                            autoFocus={true}
                            onBlur={() => handleRenameConfirm(item.sessionId)}
                            onSubmitEditing={() => handleRenameConfirm(item.sessionId)}
                          />
                        ) : (
                          <View style={styles.drawerItemTextContainer}>
                            <Text
                              style={[
                                styles.drawerItemText,
                                sessionId === item.sessionId && styles.drawerItemTextActive,
                              ]}
                              numberOfLines={1}
                            >
                              {item.title}
                            </Text>
                            <Text style={styles.drawerItemSubtext}>
                              {new Date(item.lastModified).toLocaleDateString()} at {new Date(item.lastModified).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </Text>
                          </View>
                        )}
                      </Pressable>

                      <View style={{ flexDirection: 'row', alignItems: 'center', paddingRight: 6 }}>
                        <Pressable
                          onPress={() => {
                            setEditingSessionId(item.sessionId);
                            setRenameTitleVal(item.title);
                          }}
                          style={styles.drawerActionIcon}
                        >
                          <Ionicons name="create-outline" size={16} color={theme.textSecondary} />
                        </Pressable>
                        <Pressable
                          onPress={() => handleDeleteSession(item.sessionId)}
                          style={styles.drawerActionIcon}
                        >
                          <Ionicons name="trash-outline" size={16} color="#EF4444" />
                        </Pressable>
                      </View>
                    </View>
                  ))
                )}
              </ScrollView>
            </SafeAreaView>
          </View>
        </View>
      </Modal>
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
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  headerBtn: {
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 19,
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
    color: '#94A3B8',
    marginTop: 1,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    height: 38,
    borderRadius: 19,
    paddingHorizontal: 16,
    fontSize: 14,
    marginHorizontal: 10,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingBottom: 24,
  },
  welcomeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  welcomeIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  welcomeText: {
    fontSize: 14.5,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '500',
  },
  bubbleContainer: {
    flexDirection: 'row',
    marginVertical: 8,
    alignSelf: 'stretch',
  },
  userAlign: {
    justifyContent: 'flex-end',
    paddingLeft: 40,
  },
  aiAlign: {
    justifyContent: 'flex-start',
    paddingRight: 40,
  },
  aiAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    maxWidth: '100%',
  },
  collapsedOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 10,
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
    ...Shadows.md,
  },
  expandButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10B981',
  },
  collapseToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    alignSelf: 'center',
    gap: 4,
  },
  collapseToggleText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10B981',
  },
  msgAttachments: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  msgAttachChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  msgAttachName: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
    maxWidth: 120,
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: 6,
    gap: 12,
    flexWrap: 'wrap',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    gap: 4,
  },
  actionBtnLabel: {
    fontSize: 11.5,
    color: '#475569',
    fontWeight: '600',
  },
  followUpRow: {
    marginTop: 8,
  },
  followUpChip: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  followUpChipText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
  },
  forensicsCard: {
    borderLeftWidth: 4,
    borderRadius: 8,
    padding: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginVertical: 4,
    alignSelf: 'stretch',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardTitleText: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  progressBarBg: {
    height: 8,
    width: '100%',
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  attachmentsBar: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
  },
  attachmentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  attachmentName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065F46',
  },
  detectedBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#D1FAE5',
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 1,
    marginTop: 1,
  },
  detectedBadgeText: {
    fontSize: 9,
    color: '#065F46',
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  addMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#94A3B8',
    borderStyle: 'dashed',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    gap: 4,
  },
  addMoreText: {
    fontSize: 11.5,
    color: '#475569',
    fontWeight: '700',
  },
  composerContainer: {
    borderTopWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
  },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  composerOptionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  composerInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 14,
    backgroundColor: '#F8FAFC',
    maxHeight: 100,
  },
  micBtnActive: {
    backgroundColor: '#EF4444',
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.7,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    maxHeight: height * 0.7,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 10,
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 16.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 14,
  },
  mockList: {
    gap: 8,
  },
  mockFileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
  },
  customMockItem: {
    backgroundColor: '#FFFFFF',
    borderStyle: 'dashed',
    borderColor: '#94A3B8',
  },
  mockFileName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#1E293B',
  },
  mockFileDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  bottomSheetContainer: {
    width: '100%',
    height: height * 0.75,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  bottomSheetDragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  bottomSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    marginBottom: 12,
  },
  bottomSheetTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  bottomSheetContent: {
    flex: 1,
  },
  sheetSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 10,
  },
  sheetSearchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    padding: 0,
  },
  categoryHeading: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 14,
    marginBottom: 8,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  recentActionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  recentActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  actionsList: {
    gap: 8,
  },
  actionListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  actionListIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionListTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  actionListDesc: {
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 1,
  },
  actionsEmpty: {
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  actionsEmptyText: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
  },
  scrollDownBtn: {
    position: 'absolute',
    bottom: 96,
    left: '50%',
    marginLeft: -21,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#ECECEC',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 4,
    zIndex: 999,
  },
  drawerOverlay: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  drawerContainer: {
    width: width * 0.8,
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRightWidth: 1,
    borderRightColor: '#ECECEC',
    paddingHorizontal: 16,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ECECEC',
  },
  drawerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1F2937',
  },
  drawerNewChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 10,
    borderRadius: 8,
    marginVertical: 12,
    gap: 6,
  },
  drawerNewChatBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  drawerSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ECECEC',
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 12,
  },
  drawerSearchInput: {
    flex: 1,
    fontSize: 13,
    color: '#1F2937',
    padding: 0,
  },
  drawerList: {
    flex: 1,
  },
  drawerEmptyText: {
    fontSize: 12.5,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 24,
    fontStyle: 'italic',
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    marginBottom: 4,
    backgroundColor: 'transparent',
  },
  drawerItemActive: {
    backgroundColor: '#E6F4EA',
  },
  drawerItemTextContainer: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
  },
  drawerItemText: {
    fontSize: 13,
    color: '#4B5563',
    fontWeight: '500',
  },
  drawerItemTextActive: {
    color: '#10B981',
    fontWeight: '700',
  },
  drawerItemSubtext: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 2,
  },
  drawerRenameInput: {
    fontSize: 13,
    color: '#1F2937',
    fontWeight: '600',
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: '#10B981',
    padding: 0,
  },
  drawerActionIcon: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
    marginLeft: 4,
  },
});
