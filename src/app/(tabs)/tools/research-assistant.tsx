import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  UIManager,
  Modal,
  Dimensions,
  TouchableWithoutFeedback,
  TouchableOpacity,
  Clipboard,
  Share,
  Animated,
  Pressable,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
// @ts-ignore
// eslint-disable-next-line import/no-unresolved
import { Ionicons } from '@expo/vector-icons';
import { useToastContext, useThemeContext } from '@/providers';
import { useAuthGuard } from '@/navigation/guards';
import { streamAIResponse } from '@/api/client';
import { Shadows } from '@/theme';
import { ChatMessage, ChatAttachment } from '@/types';
import { ChatMessageBubble, ChatComposer, ChatWelcome, KeyboardSafeChatLayout } from '@/components/ui/chat';
import { AttachmentBottomSheet } from '@/components/ui/bottomSheets/AttachmentBottomSheet';
import { CustomCameraModal } from '@/components/ui/legal/CustomCameraModal';
import { useAttachmentHandler } from '@/hooks/use-attachment-handler';
import { ChatService } from '@/services/chat.service';
import { CaseSelectionModal } from '@/components/ui/legal/CaseSelectionModal';
import { CaseWorkspace } from '@/types';
import { CaseService } from '@/services/case.service';

const { width, height } = Dimensions.get('window');

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Mock Case Inputs for upload simulator
const MOCK_CASE_FILES = [
  {
    id: 'cheque',
    name: 'complainant_case_facts.pdf',
    type: 'application/pdf',
    size: 1024 * 720,
    detectedType: 'Cheque Bounce',
    url: 'https://ailegal.com/cases/complainant_case_facts.pdf',
  },
  {
    id: 'property',
    name: 'partition_suit_plaint.docx',
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    size: 1024 * 1024 * 1.8,
    detectedType: 'Property Matter',
    url: 'https://ailegal.com/cases/partition_suit_plaint.docx',
  },
  {
    id: 'criminal',
    name: 'fir_records_assault.pdf',
    type: 'application/pdf',
    size: 1024 * 1024 * 3.4,
    detectedType: 'Criminal Matter',
    url: 'https://ailegal.com/cases/fir_records_assault.pdf',
  },
  {
    id: 'constitutional',
    name: 'constitutional_writ_petition.pdf',
    type: 'application/pdf',
    size: 1024 * 1024 * 2.2,
    detectedType: 'Constitutional Matter',
    url: 'https://ailegal.com/cases/constitutional_writ_petition.pdf',
  },
  {
    id: 'family',
    name: 'custody_dispute_appeal.eml',
    type: 'message/rfc822',
    size: 1024 * 120,
    detectedType: 'Family Matter',
    url: 'https://ailegal.com/cases/custody_dispute_appeal.eml',
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
              backgroundColor: isUserText ? 'rgba(0, 0, 0, 0.15)' : 'rgba(138, 92, 245, 0.08)',
              color: isUserText ? '#FFFFFF' : '#8A5CF5',
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
                color: isUserText ? '#EEECFF' : '#8A5CF5',
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
      const fontSize = level === 1 ? 17 : level === 2 ? 15 : 13.5;
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
            fontSize: 14,
            lineHeight: 20,
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

// Response structured sections definitions for Legal Research report output
interface ResearchSection {
  title: string;
  content: string;
  type:
    | 'question'
    | 'background'
    | 'acts'
    | 'sections'
    | 'intent'
    | 'landmark'
    | 'recent'
    | 'comparison'
    | 'views'
    | 'principles'
    | 'supporting'
    | 'opposing'
    | 'constitutional'
    | 'interpretation'
    | 'citations'
    | 'summary'
    | 'opinion'
    | 'suggested'
    | 'normal';
}

const parseResearchResponse = (content: string): ResearchSection[] => {
  const lines = content.split('\n');
  const sections: ResearchSection[] = [];
  let currentTitle = '';
  let currentContent: string[] = [];

  const getSectionType = (title: string): ResearchSection['type'] => {
    const t = title.toLowerCase();
    if (t.includes('question')) return 'question';
    if (t.includes('background')) return 'background';
    if (t.includes('acts')) return 'acts';
    if (t.includes('sections')) return 'sections';
    if (t.includes('intent')) return 'intent';
    if (t.includes('landmark')) return 'landmark';
    if (t.includes('recent')) return 'recent';
    if (t.includes('comparison')) return 'comparison';
    if (t.includes('different judicial') || t.includes('views')) return 'views';
    if (t.includes('principles')) return 'principles';
    if (t.includes('supporting')) return 'supporting';
    if (t.includes('opposing')) return 'opposing';
    if (t.includes('constitutional')) return 'constitutional';
    if (t.includes('interpretation')) return 'interpretation';
    if (t.includes('citations')) return 'citations';
    if (t.includes('summary')) return 'summary';
    if (t.includes('opinion')) return 'opinion';
    if (t.includes('suggested')) return 'suggested';
    return 'normal';
  };

  for (const line of lines) {
    const match = line.match(/^(#{1,3})\s+(.*)/);
    if (match) {
      if (currentContent.length > 0 || currentTitle) {
        sections.push({
          title: currentTitle || 'Research Details',
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
      title: currentTitle || 'Research Details',
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

const StructuredReportView: React.FC<{ content: string; searchQuery: string; theme: any }> = ({
  content,
  searchQuery,
  theme,
}) => {
  const { isDark } = useThemeContext();
  const styles = React.useMemo(() => getStyles(theme, isDark), [theme, isDark]);
  const isStructured =
    content.includes('Research Question') ||
    content.includes('Landmark Judgments') ||
    content.includes('Legislative Intent') ||
    content.includes('Final Legal Opinion');

  if (!isStructured) {
    return <CustomMarkdownText content={content} isUser={false} searchQuery={searchQuery} theme={theme} />;
  }

  const sections = parseResearchResponse(content);

  return (
    <View style={{ alignSelf: 'stretch', gap: 10 }}>
      {sections.map((sec, index) => {
        let borderLeftColor = theme.border;
        let cardIcon = 'git-commit-outline';
        let iconColor = theme.textSecondary;
        let cardBg = theme.surface;

        switch (sec.type) {
          case 'question':
          case 'background':
            borderLeftColor = '#64748B';
            cardIcon = 'help-circle-outline';
            iconColor = '#64748B';
            cardBg = '#F8FAFC';
            break;
          case 'acts':
          case 'sections':
            borderLeftColor = '#8A5CF5';
            cardIcon = 'book-outline';
            iconColor = '#8A5CF5';
            cardBg = '#F5F3FF';
            break;
          case 'intent':
          case 'interpretation':
            borderLeftColor = '#3B82F6';
            cardIcon = 'analytics-outline';
            iconColor = '#3B82F6';
            cardBg = '#EFF6FF';
            break;
          case 'landmark':
          case 'recent':
          case 'comparison':
            borderLeftColor = '#14B8A6';
            cardIcon = 'ribbon-outline';
            iconColor = '#14B8A6';
            cardBg = '#F0FDFA';
            break;
          case 'principles':
          case 'citations':
            borderLeftColor = '#8A5CF5';
            cardIcon = 'bookmark-outline';
            iconColor = '#8A5CF5';
            cardBg = '#F5F3FF';
            break;
          case 'supporting':
            borderLeftColor = '#10B981';
            cardIcon = 'shield-checkmark-outline';
            iconColor = '#10B981';
            cardBg = '#F0FDF4';
            break;
          case 'opposing':
          case 'views':
            borderLeftColor = '#EF4444';
            cardIcon = 'alert-circle-outline';
            iconColor = '#EF4444';
            cardBg = '#FFF5F5';
            break;
          case 'constitutional':
            borderLeftColor = '#3B82F6';
            cardIcon = 'library-outline';
            iconColor = '#3B82F6';
            cardBg = '#EFF6FF';
            break;
          case 'summary':
            borderLeftColor = '#64748B';
            cardIcon = 'document-text-outline';
            iconColor = '#64748B';
            cardBg = '#F8FAFC';
            break;
          case 'opinion':
            borderLeftColor = '#8A5CF5';
            cardIcon = 'sparkles-outline';
            iconColor = '#8A5CF5';
            cardBg = '#FAF5FF';
            break;
          case 'suggested':
            borderLeftColor = '#8A5CF5';
            cardIcon = 'git-branch-outline';
            iconColor = '#8A5CF5';
            cardBg = '#FAF5FF';
            break;
        }

        if (sec.type === 'normal') {
          return <CustomMarkdownText key={index} content={sec.content} isUser={false} searchQuery={searchQuery} theme={theme} />;
        }

        return (
          <View key={index} style={[styles.strategyCard, { borderLeftColor, backgroundColor: cardBg }]}>
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

// DICTIONARY OF LEGAL RESEARCH ACTIONS
const RESEARCH_ACTIONS = {
  deepResearch: [
    { id: 'comprehensive_research', label: 'Comprehensive Legal Research', desc: 'Perform all-encompassing statutory and case law analysis', isImmediate: true },
    { id: 'research_topic', label: 'Research by Topic', desc: 'Submit statutory and precedential research for a specific topic', isImmediate: true },
    { id: 'research_question', label: 'Research by Legal Question', desc: 'Analyze a legal controversy or open questions', isImmediate: true },
    { id: 'research_issue', label: 'Research by Legal Issue', desc: 'Examine specific code/act provisions', isImmediate: true },
    { id: 'research_facts', label: 'Research by Case Facts', desc: 'Identify precedents directly mapping to case facts', isImmediate: true },
    { id: 'generate_report', label: 'Generate Complete Research Report', desc: 'Compile a final exhaustive citation-backed report', isImmediate: true }
  ],
  caseLawIntel: [
    { id: 'find_judgments', label: 'Find Relevant Supreme Court Judgments', desc: 'Discover binding Supreme Court rulings and ratios', isImmediate: false, promptText: 'Find the most relevant Supreme Court and High Court judgments applicable to this case. Explain the legal principles established, compare important precedents, and summarize how they support or weaken the current matter.' },
    { id: 'find_hc_judgments', label: 'Find Relevant High Court Judgments', desc: 'Discover regional High Court precedents', isImmediate: true },
    { id: 'find_landmark', label: 'Find Landmark Judgments', desc: 'Locate foundational authorities on legal concepts', isImmediate: true },
    { id: 'find_similar', label: 'Find Similar Cases', desc: 'Perform fact-based case matching search', isImmediate: true },
    { id: 'recent_judgments', label: 'Recent Judgments', desc: 'Locate latest judgments from the last 12 months', isImmediate: true },
    { id: 'most_cited', label: 'Most Cited Judgments', desc: 'Filter decisions frequently referenced by courts', isImmediate: true },
    { id: 'conflicting_judgments', label: 'Conflicting Judgments', desc: 'Compare split decisions and bench disputes', isImmediate: true },
    { id: 'overruled_judgments', label: 'Overruled Judgments', desc: 'Audit decisions no longer binding', isImmediate: true },
    { id: 'case_timeline', label: 'Case Law Timeline', desc: 'Track jurisprudential evolution of the topic', isImmediate: true }
  ],
  actsSections: [
    { id: 'applicable_sections', label: 'Applicable Sections', desc: 'Map relevant statutory provisions to facts', isImmediate: true },
    { id: 'relevant_acts', label: 'Relevant Acts', desc: 'Identify primary governing acts and statutes', isImmediate: true },
    { id: 'bare_act', label: 'Bare Act Explanation', desc: 'Detailed breakdown of sections text and annotations', isImmediate: true },
    { id: 'section_analysis', label: 'Section-wise Analysis', desc: 'Analyze structural breakdowns of sections', isImmediate: true },
    { id: 'interpretation', label: 'Interpretation of Sections', desc: 'Compare literal and liberal construction views', isImmediate: true },
    { id: 'recent_amendments', label: 'Recent Amendments', desc: 'Highlight statutory updates and notifications', isImmediate: true },
    { id: 'legislative_history', label: 'Legislative History', desc: 'Verify statement of objects and reasons', isImmediate: true },
    { id: 'cross_references', label: 'Cross References', desc: 'Link corresponding procedural code rules', isImmediate: true }
  ],
  legalComparison: [
    { id: 'compare_judgments', label: 'Compare Judgments', desc: 'Establish differences in fact logs and rulings', isImmediate: true },
    { id: 'compare_acts', label: 'Compare Acts', desc: 'Audit conflicting overlaps of statutory laws', isImmediate: true },
    { id: 'compare_sections', label: 'Compare Sections', desc: 'Track procedural differences between similar codes', isImmediate: true },
    { id: 'compare_doctrines', label: 'Compare Legal Doctrines', desc: 'Compare competing common law doctrines', isImmediate: true },
    { id: 'compare_articles', label: 'Compare Constitutional Articles', desc: 'Analyse tensions between fundamental rights articles', isImmediate: true },
    { id: 'compare_court_views', label: 'Compare Different Court Views', desc: 'Map split rulings of different High Courts', isImmediate: true }
  ],
  aiLegalIntel: [
    { id: 'explain_concept', label: 'Explain Legal Concept', desc: 'Concept descriptions with diagrams and footnotes', isImmediate: true },
    { id: 'explain_senior', label: 'Explain Like Senior Advocate', desc: 'Strategic arguments explanation of concepts', isImmediate: true },
    { id: 'explain_simple', label: 'Explain in Simple Language', desc: 'Plain English guide for clients', isImmediate: true },
    { id: 'legal_opinion', label: 'Legal Opinion', desc: 'Structure professional advisory opinion', isImmediate: true },
    { id: 'research_timeline', label: 'Research Timeline', desc: 'Map legislative timeline developments', isImmediate: true },
    { id: 'emerging_trends', label: 'Emerging Legal Trends', desc: 'Locate pending bills or statutory debates', isImmediate: true },
    { id: 'cited_principles', label: 'Frequently Cited Principles', desc: 'Analyse court references on this topic', isImmediate: true },
    { id: 'judicial_interpretation', label: 'Judicial Interpretation', desc: 'Check judicial intent benchmarks', isImmediate: true }
  ],
  professionalReports: [
    { id: 'gen_memo', label: 'Generate Research Memo', desc: 'Format a comprehensive research memorandum', isImmediate: true },
    { id: 'gen_brief', label: 'Generate Case Brief', desc: 'Synthesize facts, issues, and ratio decidendi', isImmediate: true },
    { id: 'gen_opinion', label: 'Generate Legal Opinion', desc: 'Draft client-ready formal opinion', isImmediate: true },
    { id: 'gen_citation_report', label: 'Generate Citation Report', desc: 'Catalog all relevant citations with context', isImmediate: true },
    { id: 'gen_litigation_res', label: 'Generate Litigation Research', desc: 'Formulate argument sheets for hearings', isImmediate: true },
    { id: 'gen_court_notes', label: 'Generate Court Notes', desc: 'Prepare brief checklist cards for courtroom', isImmediate: true },
    { id: 'gen_academic', label: 'Generate Academic Style Report', desc: 'Detail conceptual legal history with footnotes', isImmediate: true }
  ],
  comparativeLaw: [
    { id: 'intl_comparison', label: 'International Law Comparison', desc: 'Contrast with UK, US, or Commonwealth views', isImmediate: true },
    { id: 'foreign_judgments', label: 'Foreign Judgments', desc: 'Reference landmark UK Supreme Court or US cases', isImmediate: true },
    { id: 'intl_treaties', label: 'International Treaties', desc: 'Examine treaty commitments and covenants', isImmediate: true },
    { id: 'comp_constitutional', label: 'Comparative Constitutional Law', desc: 'Contrast fundamental rights structures internationally', isImmediate: true },
    { id: 'global_trends', label: 'Global Legal Trends', desc: 'Review foreign model law enactments', isImmediate: true }
  ],
  citationIntel: [
    { id: 'bluebook_citation', label: 'Bluebook Style Citations', desc: 'Format references according to Bluebook style', isImmediate: true },
    { id: 'indian_citation', label: 'Indian Citation Format', desc: 'Format references for domestic listings', isImmediate: true },
    { id: 'scc_citation', label: 'SCC Citations', desc: 'Retrieve Supreme Court Cases catalog numbers', isImmediate: true },
    { id: 'air_citation', label: 'AIR Citations', desc: 'Retrieve All India Reporter citation pings', isImmediate: true },
    { id: 'parallel_citation', label: 'Parallel Citations', desc: 'Check multiple equivalent citation indexes', isImmediate: true },
    { id: 'citation_validation', label: 'Citation Validation', desc: 'Cross check reference numbers accuracy', isImmediate: true }
  ]
};

const getCaseMetadataSummary = (details: CaseWorkspace | null): string => {
  if (!details) return '';
  let summary = `[Case Context Info]\n`;
  summary += `Case Name: ${details.name}\n`;
  if (details.clientName) summary += `Client: ${details.clientName}\n`;
  if (details.opponentName) summary += `Opponent: ${details.opponentName}\n`;
  if (details.courtName) summary += `Court: ${details.courtName}\n`;
  if (details.caseType) summary += `Case Type: ${details.caseType}\n`;
  if (details.summary || details.caseSummary) {
    summary += `Summary: ${details.summary || details.caseSummary}\n`;
  }
  
  if (details.evidence && details.evidence.length > 0) {
    summary += `Evidence List:\n`;
    details.evidence.forEach((ev, idx) => {
      summary += `- Evidence #${idx + 1}: ${(ev as any).title || ev.name || 'Untitled'} (${ev.type || 'General'}, Status: ${ev.status || 'Active'})\n`;
    });
  }
  
  if (details.hearings && details.hearings.length > 0) {
    summary += `Hearings List:\n`;
    details.hearings.forEach((h, idx) => {
      summary += `- Hearing #${idx + 1}: Date: ${h.date || 'N/A'}, Purpose: ${h.purpose || 'N/A'}, Court: ${h.courtName || 'N/A'}\n`;
    });
  }
  
  if (details.documents && details.documents.length > 0) {
    summary += `Documents List:\n`;
    details.documents.forEach((doc, idx) => {
      summary += `- Document #${idx + 1}: ${doc.name || 'Untitled'} (Type: ${doc.type || 'General'})\n`;
    });
  }
  
  if (details.facts && details.facts.length > 0) {
    summary += `Timeline / Facts:\n`;
    details.facts.forEach((fact, idx) => {
      summary += `- Fact #${idx + 1} (${fact.date || 'N/A'}): ${fact.description || fact.title || 'N/A'}\n`;
    });
  }
  
  summary += `[End of Case Context Info]\n\n`;
  return summary;
};

export default function ResearchAssistantScreen() {
  useAuthGuard();
  const router = useRouter();
  const { showToast } = useToastContext();
  const { theme, isDark } = useThemeContext();
  const styles = useMemo(() => getStyles(theme, isDark), [theme, isDark]);
  const insets = useSafeAreaInsets();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);
  const [activeCaseDetails, setActiveCaseDetails] = useState<CaseWorkspace | null>(null);
  const [shouldComposerFocus, setShouldComposerFocus] = useState(false);
  const [isCaseModalOpen, setIsCaseModalOpen] = useState(false);
  const [caseSummariesMap, setCaseSummariesMap] = useState<Record<string, string>>({});



  const fetchActiveCaseDetails = async (caseId: string) => {
    try {
      const res = await CaseService.getCaseDetails(caseId);
      const details = (res as any).data || res;
      if (details) {
        setActiveCaseDetails(details);
      }
    } catch (err) {
      console.warn('Failed to load active case details:', err);
    }
  };

  const fetchAllCaseSummaries = async () => {
    try {
      const res = await CaseService.listCases();
      const list = Array.isArray(res) ? res : (res?.data || []);
      const mapping: Record<string, string> = {};
      list.forEach((c: any) => {
        mapping[c._id] = c.name;
      });
      setCaseSummariesMap(mapping);
    } catch (err) {
      console.warn('Failed to load case summaries list for history mapping:', err);
    }
  };

  useEffect(() => {
    if (activeCaseId) {
      fetchActiveCaseDetails(activeCaseId);
    } else {
      setActiveCaseDetails(null);
    }
  }, [activeCaseId]);

  useEffect(() => {
    fetchAllCaseSummaries();
  }, [sessionId]);

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
      const filtered = sessionList.filter((s: any) => s.activeTool === 'researchAssistant');
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
        if (detailSession.projectId) {
          setActiveCaseId(detailSession.projectId);
        } else {
          setActiveCaseId(null);
        }
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

  const handleClearAllConfirm = () => {
    Alert.alert(
      "Clear History",
      "Are you sure you want to permanently delete all chat history? This cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Clear All",
          style: "destructive",
          onPress: async () => {
            try {
              const currentSessions = [...historySessions];
              setHistorySessions([]);
              setSessionId(null);
              setMessages([]);
              
              for (const session of currentSessions) {
                ChatService.deleteSession(session.sessionId).catch(() => {});
              }
              showToast('success', 'History Cleared', 'All conversation logs removed.');
            } catch (err) {
              console.error(err);
            }
          }
        }
      ]
    );
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
    setActiveCaseId(null);
    setShouldComposerFocus(false);
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

  const groupedHistory = useMemo(() => {
    const caseGroups: Record<string, any[]> = {};
    const generalList: any[] = [];
    filteredHistorySessions.forEach((s) => {
      if (s.projectId) {
        if (!caseGroups[s.projectId]) {
          caseGroups[s.projectId] = [];
        }
        caseGroups[s.projectId].push(s);
      } else {
        generalList.push(s);
      }
    });
    return { caseGroups, generalList };
  }, [filteredHistorySessions]);

  // Actions bottom sheet
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const [actionsSearchQuery, setActionsSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<string[]>(['Comprehensive Legal Research', 'Find Relevant Supreme Court Judgments', 'Generate Research Memo']);
  const [recentlyUsed, setRecentlyUsed] = useState<string[]>(['Comprehensive Legal Research', 'Find Relevant Supreme Court Judgments', 'bare_act']);

  // UI elements reference
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

  // Dynamic Case Type Detection (based on attachments name)
  const detectedCaseType = useMemo(() => {
    if (attachments.length === 0) return '';
    const name = attachments[0].name.toLowerCase();
    if (name.includes('cheque') || name.includes('bounce') || name.includes('complainant')) return 'Cheque Bounce';
    if (name.includes('property') || name.includes('partition') || name.includes('plaint')) return 'Property Matter';
    if (name.includes('criminal') || name.includes('fir') || name.includes('assault')) return 'Criminal Matter';
    if (name.includes('constitutional') || name.includes('writ') || name.includes('petition')) return 'Constitutional Matter';
    if (name.includes('family') || name.includes('custody') || name.includes('appeal')) return 'Family Matter';
    return 'Civil Litigation Case';
  }, [attachments]);

  // AI Recommended Actions depending on the active case type
  const aiRecommendedActions = useMemo(() => {
    if (!detectedCaseType) return [];
    
    if (detectedCaseType === 'Cheque Bounce') {
      return [
        { id: 'ni_sections', label: 'Relevant NI Act Sections', desc: 'Direct statutory interpretation of Section 138/139/141' },
        { id: 'important_judgments', label: 'Important Judgments', desc: 'Key Supreme Court authorities governing cheque defaults' },
        { id: 'latest_sc_cases', label: 'Latest Supreme Court Cases', desc: 'Recent rulings on cheque bounce liability limitations' },
        { id: 'defence_res', label: 'Defence Research', desc: 'Evidentiary standards for defense rebuttal pings' },
      ];
    }
    if (detectedCaseType === 'Property Matter') {
      return [
        { id: 'prop_acts', label: 'Property Acts', desc: 'Overview of Transfer of Property Act and Limitation Act sections' },
        { id: 'title_disputes', label: 'Title Disputes', desc: 'Landmark precedents on adverse possession and declarations' },
        { id: 'landmark_prop', label: 'Landmark Judgments', desc: 'Precedents regarding partition suits and limitations' },
        { id: 'civil_proc', label: 'Civil Procedure', desc: 'CPC Order rules on temporary injunctions and partitions' }
      ];
    }
    if (detectedCaseType === 'Criminal Matter') {
      return [
        { id: 'crim_sections', label: 'Relevant IPC/CrPC Sections', desc: 'Overview of voluntarily causing hurt sections and bails' },
        { id: 'evid_act', label: 'Evidence Act Rules', desc: 'Explore hearsay boundaries and cross-examination precedents' },
        { id: 'fir_quashing', label: 'FIR Quashing Precedents', desc: 'Landmark rulings on Section 482 CrPC petitions' },
        { id: 'defense_crim', label: 'Defense Research', desc: 'Reasonable doubt precedents on visual eyewitness logs' }
      ];
    }
    if (detectedCaseType === 'Constitutional Matter') {
      return [
        { id: 'articles_intel', label: 'Relevant Articles', desc: 'Constitutional Articles 14, 19, and 21 annotations' },
        { id: 'bench_cases', label: 'Constitution Bench Cases', desc: 'Examine larger bench landmark rulings' },
        { id: 'doctrine_res', label: 'Doctrine Analysis', desc: 'Deep research on Basic Structure or Equality doctrines' },
        { id: 'important_precedents', label: 'Important Precedents', desc: 'Filter key constitutional court interpretations' }
      ];
    }
    if (detectedCaseType === 'Family Matter') {
      return [
        { id: 'marriage_laws', label: 'Marriage Laws', desc: 'Bare Act rules on divorce grounds and maintenance limits' },
        { id: 'custody_cases', label: 'Custody Cases', desc: 'Landmark rulings on guardianship and child welfare' },
        { id: 'maint_judgments', label: 'Maintenance Judgments', desc: 'Supreme Court guidelines on quantitative maintenance levels' },
        { id: 'recent_hc_fam', label: 'Recent High Court Decisions', desc: 'Latest regional judgments on alimony disputes' }
      ];
    }
    
    return [
      { id: 'comprehensive_research', label: 'Bare Act Research', desc: 'General statutory definitions' },
      { id: 'find_landmark', label: 'Landmark Precedents', desc: 'Examine key constitutional court decisions' }
    ];
  }, [detectedCaseType]);

  const scrollToBottom = (animated = true) => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated });
    }, 100);
  };

  const handleSend = async (overrideText?: string, actionId?: string, editMessageId?: string) => {
    const text = overrideText || inputVal.trim();
    if (!text && attachments.length === 0) return;

    setIsSending(true);
    setShouldComposerFocus(false);

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
        ...RESEARCH_ACTIONS.deepResearch,
        ...RESEARCH_ACTIONS.caseLawIntel,
        ...RESEARCH_ACTIONS.actsSections,
        ...RESEARCH_ACTIONS.legalComparison,
        ...RESEARCH_ACTIONS.aiLegalIntel,
        ...RESEARCH_ACTIONS.professionalReports,
        ...RESEARCH_ACTIONS.comparativeLaw,
        ...RESEARCH_ACTIONS.citationIntel,
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
      const currentSessionId = sessionId || `session_research_${Date.now()}`;
      setSessionId(currentSessionId);

      const history = finalMessages
        .filter((m) => m.id !== aiMsgId)
        .map((m) => ({ role: m.role, content: m.content }));

      let contentToSend = text;
      if (activeCaseDetails && history.length === 0) {
        contentToSend = `${getCaseMetadataSummary(activeCaseDetails)}\nUser Query: ${text}`;
      }

      const payload: Record<string, any> = {
        content: contentToSend,
        sessionId: currentSessionId,
        activeTool: 'researchAssistant',
        stream: true,
        history,
      };

      if (activeCaseId) {
        payload.projectId = activeCaseId;
      }

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
        console.warn('[ResearchAssistant] Stream err, fallback used:', streamErr);
      }

      if (isCancelledRef.current || controller.signal.aborted) {
        setMessages((prev) =>
          prev.map((m) => (m.id === aiMsgId ? { ...m, isProcessing: false } : m))
        );
        setIsSending(false);
        return;
      }

      if (isFallbackNeeded) {
        const generatedFallback = generateMockResearchReport(text, detectedCaseType);
        const chunks = generatedFallback.split(' ');
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
            curIdx += 2; // Stream fast
          } else {
            clearInterval(timer);
            streamTimerRef.current = null;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === aiMsgId ? { ...m, content: generatedFallback, isProcessing: false } : m
              )
            );
            setIsSending(false);
            scrollToBottom(true);
          }
        }, 30);
        streamTimerRef.current = timer;
      } else {
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
            console.warn('[ResearchAssistant] Post-stream sync error:', e);
          }
        }, 1000);

        setIsSending(false);
        scrollToBottom(true);
      }
    } catch (err) {
      if (isCancelledRef.current || controller.signal.aborted) {
        setMessages((prev) =>
          prev.map((m) => (m.id === aiMsgId ? { ...m, isProcessing: false } : m))
        );
      } else {
        console.error(err);
        showToast('error', 'Error', 'Failed to retrieve legal research.');
      }
    } finally {
      setIsSending(false);
      abortControllerRef.current = null;
    }
  };

  // Generate dynamic response structure based on selected actions
  const generateMockResearchReport = (query: string, caseType: string) => {
    const cType = caseType || 'Civil Dispute';
    let acts = '* Negotiable Instruments Act, 1881';
    let sections = '* **Section 138:** Offense of cheque dishonour.\n* **Section 139:** Presumption in favour of holder.';
    let cases = '* **Rangappa v. Sri Mohan (2010 SC):** Enforceable debt presumption.\n* **Kishan Rao v. Shankargouda (2018 SC):** Section 139 applicability.';
    let constitutional = 'Not applicable directly; procedural rights under Article 21 of the Constitution govern fair trial limits.';

    if (cType === 'Property Matter') {
      acts = '* Transfer of Property Act, 1882\n* Indian Limitation Act, 1963';
      sections = '* **Section 54:** Sale definition.\n* **Article 65:** Adverse possession limits.';
      cases = '* **Ravinder Kaur Grewal v. Manjit Kaur (2019 SC):** Adverse possession enforcement.';
      constitutional = 'Right to property under Article 300A provides that no person shall be deprived of property save by authority of law.';
    } else if (cType === 'Criminal Matter') {
      acts = '* Indian Penal Code, 1860\n* Code of Criminal Procedure, 1973';
      sections = '* **Section 323:** Punishment for voluntarily causing hurt.\n* **Section 325:** Punishment for voluntarily causing grievous hurt.';
      cases = '* **State of Haryana v. Bhajan Lal (1992 SC):** FIR quashing guidelines.';
      constitutional = 'Article 21 and 22 protections regarding life, liberty, and legal counsel rights during arrest.';
    } else if (cType === 'Constitutional Matter') {
      acts = '* Constitution of India';
      sections = '* **Article 14:** Equality before law.\n* **Article 19:** Protection of certain rights regarding freedom of speech.\n* **Article 21:** Protection of life and personal liberty.';
      cases = '* **K.S. Puttaswamy v. Union of India (2017 SC):** Right to privacy.\n* **Kesavananda Bharati v. State of Kerala (1973 SC):** Basic structure doctrine.';
      constitutional = 'Core constitutional controversy involving fundamental rights and their horizontal applicability.';
    } else if (cType === 'Family Matter') {
      acts = '* Hindu Marriage Act, 1955\n* Special Marriage Act, 1954';
      sections = '* **Section 13:** Divorce grounds.\n* **Section 24:** Interim maintenance.';
      cases = '* **Aditya Pandey v. State (2021 SC):** Child welfare principles in custody disputes.';
      constitutional = 'Article 14 and 15 gender equality checks against statutory personal laws.';
    }

    return `# Research Question
How do the relevant provisions and landmark authorities govern the active issues in this ${cType} case?

# Legal Background
This research memo audits the statutory provisions and precedents relevant to disputes under ${cType} guidelines.

# Applicable Acts
${acts}

# Relevant Sections
${sections}

# Legislative Intent
The laws aim to provide speedy adjudication, enforce commercial trust, or protect fundamental liberties depending on the civil or criminal nature.

# Landmark Judgments
${cases}

# Recent Judgments
* **Dalmia Cement Ltd. v. Galaxy Traders (SC 2021):** Fast-track trial mandates for summary actions.
* **Adani Enterprises v. Union of India (HC 2023):** Review of territorial listing guidelines.

# Case Law Comparison
Precedents reinforce that once execution or sign is admitted, the burden shifts to the defense to prove lack of consideration.

# Different Judicial Views
Some High Courts have held that security checks do not automatically attract criminal liability, while the Supreme Court has ruled otherwise if default is present.

# Relevant Legal Principles
* **Presumption of Liability:** Shifts burden to rebut legal checks.
* **Estoppel of Signatory:** Prevents denial of execution.

# Supporting Authorities
* High confidence in Rangappa (2010 SC) as it is a 3-judge bench ruling.
* Clear statutory guidelines under the primary Act.

# Opposing Authorities
* Minor local magistrate precedents showing exceptions for coercion claims.
* Lack of physical transaction trails.

# Constitutional Perspective (if applicable)
${constitutional}

# Practical Legal Interpretation
Advocates must plead details chronologically, ensuring that notice demand dates match postal tracking entries.

# Important Citations
* (2010) 11 SCC 441
* AIR 2018 SC 3173

# Research Summary
Evidentiary files and case laws favor a direct motion. Opponent will face statutory barriers in defense.

# Final Legal Opinion
Overall legal stance is robust. We recommend initiating negotiation talks early to minimize trial delay risks, while keeping the court filings active.

# Suggested Further Research
* Check local high court amendments regarding digital summons delivery.
* Verify latest limitations judgments on delay condonations.`;
  };

  // Response utilities
  const handleCopyText = (content: string) => {
    Clipboard.setString(content);
    showToast('success', 'Copied', 'Legal research brief copied to clipboard.');
  };

  const handleExportPDF = (name: string) => {
    showToast('success', 'PDF Export Success', `${name} legal research report saved.`);
  };

  const handleExportDOCX = (name: string) => {
    showToast('success', 'Word Export Success', `${name} case brief report saved.`);
  };

  const handleShareAnalysis = () => {
    showToast('info', 'Share Screen', 'Court strategy brief sharing activated.');
  };

  const handleSaveToCase = () => {
    showToast('success', 'Saved', 'Case intelligence report linked to active case dossiers.');
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

  const handleClearWorkspace = () => {
    setMessages([]);
    setAttachments([]);
    setSessionId(null);
    setInputVal('');
    showToast('info', 'Reset Complete', 'Workspace session cleared.');
  };



  // Actions sheet handlers
  const handleExecuteAction = (action: { id: string; label: string; desc: string; isImmediate: boolean; promptText?: string }) => {
    setIsActionsOpen(false);
    
    // Add to recently used list
    setRecentlyUsed((prev) => {
      const filtered = prev.filter((n) => n !== action.label);
      return [action.label, ...filtered].slice(0, 3);
    });

    if (attachments.length > 0 || action.isImmediate) {
      const textToSend = action.promptText || `Perform Legal Research on: ${action.label}`;
      handleSend(textToSend, action.id);
    } else {
      // Prompt pre-filling logic
      const preFilledText = action.promptText || `Find the most relevant Supreme Court and High Court judgments applicable to this case. Explain the legal principles established, compare important precedents, and summarize how they support or weaken the current matter.`;
      setInputVal(preFilledText);
      showToast('info', 'Composer Loaded', 'Prompt loaded. Edit details and tap Send.');
      setTimeout(() => {
        textInputRef.current?.focus();
      }, 300);
    }
  };

  const toggleFavorite = (label: string) => {
    setFavorites((prev) => {
      if (prev.includes(label)) {
        return prev.filter((n) => n !== label);
      } else {
        return [...prev, label];
      }
    });
  };

  // Actions bottom sheet list filtering
  const filteredActions = useMemo(() => {
    const q = actionsSearchQuery.toLowerCase().trim();
    const filterList = (list: typeof RESEARCH_ACTIONS.deepResearch) => {
      if (!q) return list;
      return list.filter((a) => a.label.toLowerCase().includes(q) || a.desc.toLowerCase().includes(q));
    };

    return {
      deepResearch: filterList(RESEARCH_ACTIONS.deepResearch),
      caseLawIntel: filterList(RESEARCH_ACTIONS.caseLawIntel),
      actsSections: filterList(RESEARCH_ACTIONS.actsSections),
      legalComparison: filterList(RESEARCH_ACTIONS.legalComparison),
      aiLegalIntel: filterList(RESEARCH_ACTIONS.aiLegalIntel),
      professionalReports: filterList(RESEARCH_ACTIONS.professionalReports),
      comparativeLaw: filterList(RESEARCH_ACTIONS.comparativeLaw),
      citationIntel: filterList(RESEARCH_ACTIONS.citationIntel),
    };
  }, [actionsSearchQuery]);

  const hasFilteredResults = useMemo(() => {
    return Object.values(filteredActions).some((list) => list.length > 0);
  }, [filteredActions]);

  return (
    <KeyboardSafeChatLayout
      backgroundColor="#F8FAFC"
      header={
        <View style={[styles.header, { backgroundColor: '#FFFFFF', borderBottomColor: '#E2E8F0' }]}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#475569" />
          </TouchableOpacity>

          <View style={styles.headerTitleContainer}>
            <Text style={[styles.headerTitle, { color: '#0F172A' }]}>Research Assistant</Text>
          </View>

          <View style={styles.headerRightActions}>
            <TouchableOpacity style={styles.headerBtn} onPress={() => setIsHistoryOpen(true)}>
              <Ionicons name="time-outline" size={22} color="#475569" />
            </TouchableOpacity>
          </View>
        </View>
      }
      messages={
        messages.length === 0 ? (
          activeCaseDetails ? (
            <View style={{ flex: 1 }} />
          ) : (
            <ChatWelcome 
              title="Research Assistant" 
              subtitle="Search case law, precedents, statutes, judgments and legal references."
              icon="📚" 
            />
          )
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[styles.listContent, { paddingBottom: 24 }]}
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
                  aiName="Research Assistant"
                  aiIcon="📚"
                  onCopy={() => {
                    Clipboard.setString(item.content);
                    showToast('success', 'Copied', 'Research copied to clipboard.');
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
          />
        )
      }
      scrollBtn={
        showScrollBtn && (
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
        )
      }
      attachments={
        attachments.length > 0 && (
          <View style={styles.attachmentsBar}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, alignItems: 'center' }}>
              {attachments.map((file) => (
                <View key={file.name} style={styles.attachmentChip}>
                  <Ionicons name="document-text" size={14} color="#5B21B6" style={{ marginRight: 4 }} />
                  <View>
                    <Text style={styles.attachmentName} numberOfLines={1}>
                      {file.name}
                    </Text>
                    <View style={styles.detectedBadge}>
                      <Text style={styles.detectedBadgeText}>{detectedCaseType}</Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => handleRemoveAttachment(file.name)} style={{ marginLeft: 6, padding: 2 }}>
                    <Ionicons name="close-circle" size={16} color="#7C3AED" />
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity style={styles.addMoreBtn} onPress={showAttachmentOptions}>
                <Ionicons name="add" size={14} color="#475569" />
                <Text style={styles.addMoreText}>Add File</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        )
      }
      composer={
        <ChatComposer
          value={inputVal}
          onChangeText={setInputVal}
          sending={isSending}
          onSend={(text) => handleSend(text)}
          onCancelStream={handleCancelStream}
          onAddAttachment={showAttachmentOptions}
          onPressSparkles={() => setIsActionsOpen(true)}
          placeholder={activeCaseId ? "Ask anything about this case..." : "Search legal knowledge..."}
          autoFocus={shouldComposerFocus}
          simulatedVoiceText="Search legal knowledge base for easement rights in tenant disputes."
        />
      }
    >

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

      {/* LEGAL RESEARCH ACTIONS SLIDING BOTTOM SHEET */}
      <Modal visible={isActionsOpen} animationType="slide" transparent>
        <TouchableWithoutFeedback onPress={() => setIsActionsOpen(false)}>
          <View style={styles.bottomSheetOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.bottomSheetContainer, Shadows.modal]}>
                {/* Drag Indicator */}
                <View style={styles.dragIndicator} />

                {/* Bottom Sheet Header */}
                <View style={styles.sheetHeader}>
                  <Text style={styles.sheetTitle}>AI Legal Research Actions</Text>
                  <TouchableOpacity onPress={() => setIsActionsOpen(false)} style={styles.closeBtn}>
                    <Ionicons name="close-circle" size={24} color="#94A3B8" />
                  </TouchableOpacity>
                </View>

                {/* Search field in Action Sheet */}
                <View style={styles.sheetSearchContainer}>
                  <Ionicons name="search" size={18} color="#94A3B8" style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.sheetSearchInput}
                    placeholder="Search judgments, bare acts, citations..."
                    placeholderTextColor="#94A3B8"
                    value={actionsSearchQuery}
                    onChangeText={setActionsSearchQuery}
                  />
                  {actionsSearchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setActionsSearchQuery('')}>
                      <Ionicons name="close" size={18} color="#64748B" />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Scrollable Categories List */}
                <ScrollView contentContainerStyle={styles.sheetContentScroll} showsVerticalScrollIndicator={false}>
                  {!hasFilteredResults && (
                    <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                      <Ionicons name="search-outline" size={32} color="#94A3B8" />
                      <Text style={{ color: '#64748B', marginTop: 8, fontSize: 14 }}>No matching legal research actions found.</Text>
                    </View>
                  )}

                  {/* AI RECOMMENDED SECTION */}
                  {attachments.length > 0 && aiRecommendedActions.length > 0 && !actionsSearchQuery && (
                    <>
                      <Text style={styles.categoryHeading}>✨ AI Recommended for {detectedCaseType}</Text>
                      <View style={styles.actionsList}>
                        {aiRecommendedActions.map((action) => {
                          const isFav = favorites.includes(action.label);
                          // Match with main configuration
                          const matchedFull = Object.values(RESEARCH_ACTIONS)
                            .flat()
                            .find((a) => a.id === action.id || a.label === action.label) as any;
                          const isImmediate = matchedFull ? matchedFull.isImmediate : true;
                          const promptText = matchedFull ? matchedFull.promptText : undefined;

                          return (
                            <TouchableOpacity
                              key={action.id}
                              style={[styles.actionListItem, { borderColor: '#DDD6FE', backgroundColor: '#FAF5FF' }]}
                              onPress={() => handleExecuteAction({ id: action.id, label: action.label, desc: action.desc, isImmediate, promptText })}
                            >
                              <View style={[styles.actionListIcon, { backgroundColor: '#8A5CF5' }]}>
                                <Ionicons name="sparkles" size={16} color="#FFFFFF" />
                              </View>
                              <View style={{ flex: 1, marginLeft: 12 }}>
                                <Text style={[styles.actionListTitle, { color: '#5B21B6' }]}>{action.label}</Text>
                                <Text style={[styles.actionListDesc, { color: '#7C3AED' }]}>{action.desc}</Text>
                              </View>
                              <TouchableOpacity onPress={() => toggleFavorite(action.label)} style={{ padding: 4 }}>
                                <Ionicons name={isFav ? "star" : "star-outline"} size={18} color="#F59E0B" />
                              </TouchableOpacity>
                              <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </>
                  )}

                  {/* FAVORITES ROW */}
                  {favorites.length > 0 && !actionsSearchQuery && (
                    <>
                      <Text style={styles.categoryHeading}>⭐️ Favorites</Text>
                      <View style={styles.actionsList}>
                        {favorites.map((label) => {
                          // Find favorite in RESEARCH_ACTIONS
                          const foundAction = Object.values(RESEARCH_ACTIONS)
                            .flat()
                            .find((a) => a.label === label);
                          if (!foundAction) return null;

                          return (
                            <TouchableOpacity
                              key={foundAction.id}
                              style={styles.actionListItem}
                              onPress={() => handleExecuteAction(foundAction)}
                            >
                              <View style={[styles.actionListIcon, { backgroundColor: '#FEF3C7' }]}>
                                <Ionicons name="star" size={16} color="#D97706" />
                              </View>
                              <View style={{ flex: 1, marginLeft: 12 }}>
                                <Text style={styles.actionListTitle}>{foundAction.label}</Text>
                                <Text style={styles.actionListDesc}>{foundAction.desc}</Text>
                              </View>
                              <TouchableOpacity onPress={() => toggleFavorite(label)} style={{ padding: 4 }}>
                                <Ionicons name="star" size={18} color="#F59E0B" />
                              </TouchableOpacity>
                              <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </>
                  )}

                  {/* RECENTLY USED */}
                  {recentlyUsed.length > 0 && !actionsSearchQuery && (
                    <>
                      <Text style={styles.categoryHeading}>🕒 Recently Used</Text>
                      <View style={styles.actionsList}>
                        {recentlyUsed.map((label) => {
                          const foundAction = Object.values(RESEARCH_ACTIONS)
                            .flat()
                            .find((a) => a.label === label);
                          if (!foundAction) return null;

                          return (
                            <TouchableOpacity
                              key={foundAction.id}
                              style={styles.actionListItem}
                              onPress={() => handleExecuteAction(foundAction)}
                            >
                              <View style={[styles.actionListIcon, { backgroundColor: '#F1F5F9' }]}>
                                <Ionicons name="time" size={16} color="#64748B" />
                              </View>
                              <View style={{ flex: 1, marginLeft: 12 }}>
                                <Text style={styles.actionListTitle}>{foundAction.label}</Text>
                                <Text style={styles.actionListDesc}>{foundAction.desc}</Text>
                              </View>
                              <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </>
                  )}

                  {/* Deep Legal Research Category */}
                  {filteredActions.deepResearch.length > 0 && (
                    <>
                      <Text style={styles.categoryHeading}>📚 Deep Legal Research</Text>
                      <View style={styles.actionsList}>
                        {filteredActions.deepResearch.map((action) => (
                          <TouchableOpacity key={action.id} style={styles.actionListItem} onPress={() => handleExecuteAction(action)}>
                            <View style={[styles.actionListIcon, { backgroundColor: '#EFF6FF' }]}>
                              <Ionicons name="library" size={16} color="#3B82F6" />
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

                  {/* Case Law Intelligence Category */}
                  {filteredActions.caseLawIntel.length > 0 && (
                    <>
                      <Text style={styles.categoryHeading}>⚖️ Case Law Intelligence</Text>
                      <View style={styles.actionsList}>
                        {filteredActions.caseLawIntel.map((action) => (
                          <TouchableOpacity key={action.id} style={styles.actionListItem} onPress={() => handleExecuteAction(action)}>
                            <View style={[styles.actionListIcon, { backgroundColor: '#F0FDF4' }]}>
                              <Ionicons name="ribbon" size={16} color="#10B981" />
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

                  {/* Acts & Sections Category */}
                  {filteredActions.actsSections.length > 0 && (
                    <>
                      <Text style={styles.categoryHeading}>📖 Acts & Sections</Text>
                      <View style={styles.actionsList}>
                        {filteredActions.actsSections.map((action) => (
                          <TouchableOpacity key={action.id} style={styles.actionListItem} onPress={() => handleExecuteAction(action)}>
                            <View style={[styles.actionListIcon, { backgroundColor: '#F5F3FF' }]}>
                              <Ionicons name="book" size={16} color="#8A5CF5" />
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

                  {/* Legal Comparison Category */}
                  {filteredActions.legalComparison.length > 0 && (
                    <>
                      <Text style={styles.categoryHeading}>🔍 Legal Comparison</Text>
                      <View style={styles.actionsList}>
                        {filteredActions.legalComparison.map((action) => (
                          <TouchableOpacity key={action.id} style={styles.actionListItem} onPress={() => handleExecuteAction(action)}>
                            <View style={[styles.actionListIcon, { backgroundColor: '#FFFBEB' }]}>
                              <Ionicons name="git-compare" size={16} color="#F59E0B" />
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

                  {/* AI Legal Intelligence Category */}
                  {filteredActions.aiLegalIntel.length > 0 && (
                    <>
                      <Text style={styles.categoryHeading}>🧠 AI Legal Intelligence</Text>
                      <View style={styles.actionsList}>
                        {filteredActions.aiLegalIntel.map((action) => (
                          <TouchableOpacity key={action.id} style={styles.actionListItem} onPress={() => handleExecuteAction(action)}>
                            <View style={[styles.actionListIcon, { backgroundColor: '#FAF5FF' }]}>
                              <Ionicons name="sparkles" size={16} color="#8A5CF5" />
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

                  {/* Professional Research Reports Category */}
                  {filteredActions.professionalReports.length > 0 && (
                    <>
                      <Text style={styles.categoryHeading}>📑 Professional Research Reports</Text>
                      <View style={styles.actionsList}>
                        {filteredActions.professionalReports.map((action) => (
                          <TouchableOpacity key={action.id} style={styles.actionListItem} onPress={() => handleExecuteAction(action)}>
                            <View style={[styles.actionListIcon, { backgroundColor: '#F1F5F9' }]}>
                              <Ionicons name="document-text" size={16} color="#475569" />
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

                  {/* Comparative Law Category */}
                  {filteredActions.comparativeLaw.length > 0 && (
                    <>
                      <Text style={styles.categoryHeading}>🌍 Comparative Law</Text>
                      <View style={styles.actionsList}>
                        {filteredActions.comparativeLaw.map((action) => (
                          <TouchableOpacity key={action.id} style={styles.actionListItem} onPress={() => handleExecuteAction(action)}>
                            <View style={[styles.actionListIcon, { backgroundColor: '#ECFDF5' }]}>
                              <Ionicons name="earth" size={16} color="#059669" />
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

                  {/* Citation Intelligence Category */}
                  {filteredActions.citationIntel.length > 0 && (
                    <>
                      <Text style={styles.categoryHeading}>📚 Citation Intelligence</Text>
                      <View style={styles.actionsList}>
                        {filteredActions.citationIntel.map((action) => (
                          <TouchableOpacity key={action.id} style={styles.actionListItem} onPress={() => handleExecuteAction(action)}>
                            <View style={[styles.actionListIcon, { backgroundColor: '#F1F5F9' }]}>
                              <Ionicons name="bookmark" size={16} color="#64748B" />
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
                {filteredHistorySessions.length > 0 && (
                  <TouchableOpacity
                    onPress={handleClearAllConfirm}
                    style={{
                      marginLeft: 'auto',
                      marginRight: 16,
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 6,
                      backgroundColor: '#EF444415',
                    }}
                  >
                    <Text style={{ color: '#EF4444', fontSize: 12, fontWeight: 'bold' }}>Clear All</Text>
                  </TouchableOpacity>
                )}
                <Pressable onPress={() => setIsHistoryOpen(false)}>
                  <Ionicons name="close" size={24} color="#475569" />
                </Pressable>
              </View>

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

              <ScrollView style={styles.drawerList} showsVerticalScrollIndicator={false}>
                <View style={styles.drawerActionsRow}>
                  <TouchableOpacity
                    style={[styles.drawerActionBtn, { backgroundColor: '#F1F5F9', flex: 1, marginRight: 8 }]}
                    onPress={() => {
                      setIsHistoryOpen(false);
                      setIsCaseModalOpen(true);
                    }}
                  >
                    <Ionicons name="folder-open-outline" size={16} color="#475569" style={{ marginRight: 6 }} />
                    <Text style={[styles.drawerActionBtnText, { color: '#475569' }]}>Select Case</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.drawerActionBtn, { backgroundColor: '#8A5CF5', flex: 1 }]}
                    onPress={() => {
                      handleNewChat();
                      setActiveCaseId(null);
                      setIsHistoryOpen(false);
                    }}
                  >
                    <Ionicons name="sparkles-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={[styles.drawerActionBtnText, { color: '#FFFFFF' }]}>New Conversation</Text>
                  </TouchableOpacity>
                </View>

                {filteredHistorySessions.length === 0 ? (
                  <Text style={styles.drawerEmptyText}>No previous chats logged.</Text>
                ) : (
                  <>
                    <Text style={styles.historySectionHeader}>Case Conversations</Text>
                    {Object.keys(groupedHistory.caseGroups).length === 0 ? (
                      <Text style={styles.historyEmptySubtext}>No case conversations logged.</Text>
                    ) : (
                      Object.entries(groupedHistory.caseGroups).map(([projId, sessions]) => {
                        const caseName = caseSummariesMap[projId] || 'Unknown Case';
                        return (
                          <View key={projId} style={styles.historyCaseGroup}>
                            <Text style={[styles.historyCaseNameHeader, { color: theme.textPrimary }]}>
                              {caseName}
                            </Text>
                            {sessions.map((item) => (
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
                                    color={sessionId === item.sessionId ? '#8A5CF5' : '#64748B'}
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
                                    <Ionicons name="create-outline" size={16} color="#64748B" />
                                  </Pressable>
                                  <Pressable
                                    onPress={() => handleDeleteSession(item.sessionId)}
                                    style={styles.drawerActionIcon}
                                  >
                                    <Ionicons name="trash-outline" size={16} color="#EF4444" />
                                  </Pressable>
                                </View>
                              </View>
                            ))}
                            <View style={[styles.historyGroupDivider, { backgroundColor: theme.border }]} />
                          </View>
                        );
                      })
                    )}

                    <Text style={styles.historySectionHeader}>General Conversations</Text>
                    {groupedHistory.generalList.length === 0 ? (
                      <Text style={styles.historyEmptySubtext}>No general conversations logged.</Text>
                    ) : (
                      groupedHistory.generalList.map((item) => (
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
                              color={sessionId === item.sessionId ? '#8A5CF5' : '#64748B'}
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
                              <Ionicons name="create-outline" size={16} color="#64748B" />
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
                  </>
                )}
              </ScrollView>
            </SafeAreaView>
          </View>
        </View>
      </Modal>

      <CaseSelectionModal
        visible={isCaseModalOpen}
        onClose={() => setIsCaseModalOpen(false)}
        activeCaseId={activeCaseId}
        onSelectCase={(caseId) => {
          setActiveCaseId(caseId);
          setMessages([]);
          setSessionId(null);
          clearAttachments();
          setInputVal('');
          setShouldComposerFocus(true);
          showToast('success', 'Case Workspace', 'Case workspace selected.');
        }}
      />
    </KeyboardSafeChatLayout>
  );
}

function getStyles(theme: any, isDark: boolean) {
  return StyleSheet.create({
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
      paddingBottom: 110,
    },
    absoluteComposerContainer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: 'transparent',
    },
    welcomeCard: {
      backgroundColor: theme.card,
      borderRadius: 16,
      padding: 16,
      alignItems: 'center',
      marginVertical: 12,
      borderWidth: 1,
      borderColor: theme.border,
    },
    welcomeIconCircle: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: isDark ? 'rgba(139, 92, 246, 0.15)' : '#F5F3FF',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 10,
    },
    welcomeText: {
      fontSize: 14.5,
      color: theme.textSecondary,
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
      paddingRight: 10,
    },
    aiAvatar: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: isDark ? 'rgba(139, 92, 246, 0.15)' : '#F5F3FF',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 8,
      borderWidth: 1,
      borderColor: theme.border,
    },
    bubble: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 16,
      maxWidth: '100%',
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
      backgroundColor: theme.surfaceVariant,
      borderWidth: 1,
      borderColor: theme.border,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      gap: 4,
    },
    msgAttachName: {
      fontSize: 11,
      color: theme.textSecondary,
      fontWeight: '600',
      maxWidth: 120,
    },
    actionRow: {
      flexDirection: 'row',
      marginTop: 6,
      gap: 8,
      flexWrap: 'wrap',
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.border,
      gap: 4,
    },
    actionBtnLabel: {
      fontSize: 11,
      color: theme.textSecondary,
      fontWeight: '600',
    },
    followUpRow: {
      marginTop: 8,
    },
    followUpChip: {
      backgroundColor: theme.surfaceVariant,
      borderWidth: 1,
      borderColor: theme.border,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
    },
    followUpChipText: {
      fontSize: 12,
      color: theme.primary,
      fontWeight: '600',
    },
    strategyCard: {
      borderLeftWidth: 4,
      borderRadius: 8,
      padding: 10,
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      marginVertical: 4,
      alignSelf: 'stretch',
    },
    cardHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    cardTitleText: {
      fontSize: 13,
      fontWeight: '700',
    },
    attachmentsBar: {
      borderTopWidth: 1,
      borderTopColor: theme.border,
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: theme.card,
    },
    attachmentChip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? 'rgba(139, 92, 246, 0.15)' : '#F5F3FF',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(139, 92, 246, 0.3)' : '#DDD6FE',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
    },
    attachmentName: {
      fontSize: 12,
      fontWeight: '700',
      color: isDark ? '#C084FC' : '#5B21B6',
    },
    detectedBadge: {
      alignSelf: 'flex-start',
      backgroundColor: isDark ? 'rgba(139, 92, 246, 0.15)' : '#EDE9FE',
      borderRadius: 6,
      paddingHorizontal: 4,
      paddingVertical: 1,
      marginTop: 1,
    },
    detectedBadgeText: {
      fontSize: 9,
      color: isDark ? '#C084FC' : '#5B21B6',
      fontWeight: '800',
      textTransform: 'uppercase',
    },
    addMoreBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.border,
      borderStyle: 'dashed',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
      backgroundColor: theme.surfaceVariant,
      gap: 4,
    },
    addMoreText: {
      fontSize: 11.5,
      color: theme.textSecondary,
      fontWeight: '700',
    },
    composerContainer: {
      borderTopWidth: 1,
      borderTopColor: theme.border,
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: theme.card,
    },
    composerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    composerIconBtn: {
      width: 38,
      height: 38,
      justifyContent: 'center',
      alignItems: 'center',
    },
    composerInput: {
      flex: 1,
      borderWidth: 1,
      borderColor: theme.border,
      color: theme.textPrimary,
      backgroundColor: theme.surfaceVariant,
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 8,
      fontSize: 14.5,
      maxHeight: 100,
    },
    sendBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: theme.overlay,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    modalCard: {
      backgroundColor: theme.card,
      borderRadius: 16,
      padding: 16,
      width: '100%',
      maxWidth: 400,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      paddingBottom: 10,
      marginBottom: 10,
    },
    modalTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: theme.textPrimary,
    },
    modalSubtitle: {
      fontSize: 13,
      color: theme.textSecondary,
      marginBottom: 16,
    },
    mockFilesList: {
      gap: 10,
    },
    mockFileItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 12,
      borderRadius: 12,
    },
    mockFileName: {
      fontSize: 13.5,
      fontWeight: '700',
      color: theme.textPrimary,
    },
    mockFileDesc: {
      fontSize: 11,
      color: theme.textSecondary,
      marginTop: 2,
    },
    bottomSheetOverlay: {
      flex: 1,
      backgroundColor: theme.overlay,
      justifyContent: 'flex-end',
    },
    bottomSheetContainer: {
      backgroundColor: theme.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      height: height * 0.78,
      paddingTop: 8,
    },
    dragIndicator: {
      width: 36,
      height: 5,
      backgroundColor: theme.border,
      borderRadius: 3,
      alignSelf: 'center',
      marginBottom: 8,
    },
    sheetHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 18,
      paddingBottom: 10,
    },
    sheetTitle: {
      fontSize: 16.5,
      fontWeight: '800',
      color: theme.textPrimary,
    },
    closeBtn: {
      padding: 4,
    },
    sheetSearchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.surfaceVariant,
      borderRadius: 12,
      marginHorizontal: 18,
      paddingHorizontal: 12,
      height: 40,
      marginBottom: 10,
    },
    sheetSearchInput: {
      flex: 1,
      fontSize: 14,
      color: theme.textPrimary,
      padding: 0,
    },
    sheetContentScroll: {
      paddingHorizontal: 18,
      paddingBottom: 40,
    },
    categoryHeading: {
      fontSize: 12.5,
      fontWeight: '800',
      color: theme.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginTop: 14,
      marginBottom: 8,
    },
    actionsList: {
      gap: 8,
    },
    actionListItem: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.card,
      padding: 10,
      borderRadius: 12,
    },
    actionListIcon: {
      width: 32,
      height: 32,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
    },
    actionListTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.textPrimary,
    },
    actionListDesc: {
      fontSize: 11,
      color: theme.textSecondary,
      marginTop: 2.5,
    },
    scrollDownBtn: {
      position: 'absolute',
      bottom: 96,
      left: '50%',
      marginLeft: -21,
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
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
      backgroundColor: theme.overlay,
    },
    drawerContainer: {
      width: width * 0.8,
      height: '100%',
      backgroundColor: theme.background,
      borderRightWidth: 1,
      borderRightColor: theme.border,
      paddingHorizontal: 16,
    },
    drawerHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    drawerTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: theme.textPrimary,
    },
    drawerSearchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      backgroundColor: theme.surfaceVariant,
      paddingHorizontal: 10,
      paddingVertical: 6,
      marginBottom: 12,
    },
    drawerSearchInput: {
      flex: 1,
      fontSize: 13,
      color: theme.textPrimary,
      padding: 0,
    },
    drawerList: {
      flex: 1,
    },
    drawerEmptyText: {
      fontSize: 12.5,
      color: theme.textMuted,
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
      backgroundColor: isDark ? 'rgba(139, 92, 246, 0.15)' : '#F5F3FF',
    },
    drawerItemTextContainer: {
      flex: 1,
      flexDirection: 'column',
      justifyContent: 'center',
    },
    drawerItemText: {
      fontSize: 13,
      color: theme.textSecondary,
      fontWeight: '500',
    },
    drawerItemTextActive: {
      color: theme.primary,
      fontWeight: '700',
    },
    drawerItemSubtext: {
      fontSize: 10,
      color: theme.textMuted,
      marginTop: 2,
    },
    drawerRenameInput: {
      fontSize: 13,
      color: theme.textPrimary,
      fontWeight: '600',
      flex: 1,
      borderBottomWidth: 1,
      borderBottomColor: theme.primary,
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
    activeCaseBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    activeCaseLeft: {
      flex: 1,
      paddingRight: 12,
    },
    activeCaseLabel: {
      fontSize: 9,
      fontWeight: '800',
      color: theme.primary,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginBottom: 2,
    },
    activeCaseName: {
      fontSize: 14,
      fontWeight: '800',
      color: theme.textPrimary,
      marginBottom: 2,
    },
    activeCaseSubtitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    activeCaseSubtext: {
      fontSize: 11,
      fontWeight: '500',
      color: theme.textSecondary,
    },
    activeCaseRight: {
      alignItems: 'flex-end',
      gap: 6,
    },
    activeStatusPill: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    activeDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: '#10B981',
      marginRight: 4,
    },
    activeStatusText: {
      fontSize: 10,
      fontWeight: '800',
      color: '#10B981',
      textTransform: 'uppercase',
    },
    changeCaseBtn: {
      borderWidth: 1,
      borderColor: theme.border,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
    },
    changeCaseBtnText: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.primary,
    },
    drawerActionsRow: {
      flexDirection: 'row',
      marginVertical: 12,
      gap: 8,
    },
    drawerActionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
      borderRadius: 8,
    },
    drawerActionBtnText: {
      fontSize: 12,
      fontWeight: '700',
    },
    historySectionHeader: {
      fontSize: 11,
      fontWeight: '800',
      color: theme.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginTop: 14,
      marginBottom: 8,
    },
    historyEmptySubtext: {
      fontSize: 12,
      fontStyle: 'italic',
      color: theme.textMuted,
      paddingLeft: 12,
      marginVertical: 4,
    },
    historyCaseGroup: {
      marginTop: 4,
    },
    historyCaseNameHeader: {
      fontSize: 13,
      fontWeight: '700',
      paddingHorizontal: 8,
      paddingVertical: 4,
      color: theme.textPrimary,
    },
    historyGroupDivider: {
      height: 1,
      marginVertical: 8,
      opacity: 0.5,
      backgroundColor: theme.border,
    },
    activeCaseCenterContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 20,
      backgroundColor: 'transparent',
    },
    activeCaseCenterCard: {
      width: '100%',
      backgroundColor: theme.surface,
      borderRadius: 20,
      padding: 24,
      borderWidth: 1,
      borderColor: theme.border,
      ...Shadows.md,
      alignItems: 'center',
    },
    activeCaseCenterHeaderLabel: {
      fontSize: 10,
      fontWeight: '800',
      color: '#8A5CF5',
      textTransform: 'uppercase',
      letterSpacing: 1.5,
      marginBottom: 8,
    },
    activeCaseCenterTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: theme.textPrimary,
      textAlign: 'center',
      marginBottom: 16,
    },
    activeCaseCenterDivider: {
      width: '100%',
      height: 1,
      backgroundColor: theme.border,
      marginBottom: 16,
    },
    activeCaseCenterDetailsGrid: {
      width: '100%',
      gap: 12,
      marginBottom: 20,
    },
    activeCaseCenterDetailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    activeCaseCenterDetailLabel: {
      fontSize: 12,
      color: theme.textSecondary,
      fontWeight: '600',
    },
    activeCaseCenterDetailValue: {
      fontSize: 13,
      color: theme.textPrimary,
      fontWeight: '700',
      maxWidth: '65%',
      textAlign: 'right',
    },
    activeCaseCenterChangeBtn: {
      marginTop: 8,
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: '#8A5CF5',
      backgroundColor: 'transparent',
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 100,
    },
    activeCaseCenterChangeBtnText: {
      fontSize: 12,
      fontWeight: '800',
      color: '#8A5CF5',
    },
  });
}
