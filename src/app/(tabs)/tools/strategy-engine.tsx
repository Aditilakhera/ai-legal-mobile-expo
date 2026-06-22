import React, { useState, useRef, useMemo, useEffect } from 'react';
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
  UIManager,
  Modal,
  Dimensions,
  TouchableWithoutFeedback,
  TouchableOpacity,
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
import { Shadows, Radius } from '@/theme';
import { ChatMessage, ChatAttachment } from '@/types';
import { ChatMessageBubble, ChatComposer, ChatWelcome } from '@/components/ui/chat';
import { AttachmentBottomSheet } from '@/components/ui/bottomSheets/AttachmentBottomSheet';
import { CustomCameraModal } from '@/components/ui/legal/CustomCameraModal';
import { useAttachmentHandler } from '@/hooks/use-attachment-handler';

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
    detectedType: 'Property Dispute',
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

// Response structured sections definitions for Strategy report output
interface StrategySection {
  title: string;
  content: string;
  type:
    | 'summary'
    | 'issues'
    | 'position'
    | 'laws'
    | 'sections'
    | 'judgments'
    | 'strength'
    | 'weakness'
    | 'opponent'
    | 'counter'
    | 'evidence'
    | 'missing'
    | 'steps'
    | 'timeline'
    | 'risk'
    | 'settlement'
    | 'probability'
    | 'recommendations'
    | 'final'
    | 'normal';
}

const parseStrategyResponse = (content: string): StrategySection[] => {
  const lines = content.split('\n');
  const sections: StrategySection[] = [];
  let currentTitle = '';
  let currentContent: string[] = [];

  const getSectionType = (title: string): StrategySection['type'] => {
    const t = title.toLowerCase();
    if (t.includes('summary')) return 'summary';
    if (t.includes('issues')) return 'issues';
    if (t.includes('position')) return 'position';
    if (t.includes('laws')) return 'laws';
    if (t.includes('sections')) return 'sections';
    if (t.includes('judgments')) return 'judgments';
    if (t.includes('strength')) return 'strength';
    if (t.includes('weakness')) return 'weakness';
    if (t.includes('opponent')) return 'opponent';
    if (t.includes('counter')) return 'counter';
    if (t.includes('evidence')) return 'evidence';
    if (t.includes('missing')) return 'missing';
    if (t.includes('steps') || t.includes('next')) return 'steps';
    if (t.includes('timeline')) return 'timeline';
    if (t.includes('risk')) return 'risk';
    if (t.includes('settlement')) return 'settlement';
    if (t.includes('probability')) return 'probability';
    if (t.includes('recommendations')) return 'recommendations';
    if (t.includes('final')) return 'final';
    return 'normal';
  };

  for (const line of lines) {
    const match = line.match(/^(#{1,3})\s+(.*)/);
    if (match) {
      if (currentContent.length > 0 || currentTitle) {
        sections.push({
          title: currentTitle || 'Litigation Strategy',
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
      title: currentTitle || 'Litigation Strategy',
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

const StructuredStrategyView: React.FC<{ content: string; searchQuery: string; theme: any }> = ({
  content,
  searchQuery,
  theme,
}) => {
  const isStructured =
    content.includes('Case Summary') ||
    content.includes('Key Legal Issues') ||
    content.includes('Winning Probability') ||
    content.includes('Opponent Strategy') ||
    content.includes('Final Strategy') ||
    content.includes('Judgments');

  if (!isStructured) {
    return <CustomMarkdownText content={content} isUser={false} searchQuery={searchQuery} theme={theme} />;
  }

  const sections = parseStrategyResponse(content);

  return (
    <View style={{ alignSelf: 'stretch', gap: 12 }}>
      {sections.map((sec, index) => {
        if (sec.type === 'probability') {
          const scoreText = sec.content;
          let probColor = '#EF4444'; // Red
          let progressVal = 0.4;
          let levelText = 'Low Probability';

          const matchNum = scoreText.match(/(\d+)\%/);
          if (matchNum) {
            const p = parseInt(matchNum[1]);
            progressVal = p / 100;
            if (p >= 75) {
              probColor = '#10B981'; // Green
              levelText = 'Strong Position';
            } else if (p >= 50) {
              probColor = '#F59E0B'; // Amber
              levelText = 'Moderate Outlook';
            }
          } else if (scoreText.toLowerCase().includes('high')) {
            probColor = '#10B981';
            progressVal = 0.82;
            levelText = 'Strong Position';
          }

          return (
            <View key={index} style={[styles.strategyCard, { borderLeftColor: probColor }]}>
              <View style={styles.cardHeaderRow}>
                <Ionicons name="trending-up-outline" size={18} color={probColor} />
                <Text style={[styles.cardTitleText, { color: theme.textPrimary }]}>
                  {sec.title || 'Winning Probability'}
                </Text>
              </View>
              <View style={{ marginTop: 8 }}>
                <Text style={{ fontSize: 13, color: theme.textSecondary, marginBottom: 6 }}>
                  {renderWithSearchHighlight(sec.content, searchQuery)}
                </Text>
                <View style={styles.progressBarBg}>
                  <View style={{ height: '100%', width: `${progressVal * 100}%`, backgroundColor: probColor, borderRadius: 4 }} />
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                  <Text style={{ fontSize: 11, color: theme.textMuted }}>Unfavorable</Text>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: probColor }}>{levelText}</Text>
                  <Text style={{ fontSize: 11, color: theme.textMuted }}>Highly Favorable</Text>
                </View>
              </View>
            </View>
          );
        }

        let borderLeftColor = theme.border;
        let cardIcon = 'git-commit-outline';
        let iconColor = theme.textSecondary;
        let cardBg = theme.surface;

        switch (sec.type) {
          case 'summary':
            borderLeftColor = '#EF4444'; // Red
            cardIcon = 'eye-outline';
            iconColor = '#EF4444';
            cardBg = '#FFF5F5';
            break;
          case 'issues':
          case 'position':
            borderLeftColor = '#64748B';
            cardIcon = 'help-circle-outline';
            iconColor = '#64748B';
            break;
          case 'laws':
          case 'sections':
            borderLeftColor = '#8A5CF5'; // Violet
            cardIcon = 'book-outline';
            iconColor = '#8A5CF5';
            cardBg = '#F5F3FF';
            break;
          case 'judgments':
            borderLeftColor = '#14B8A6'; // Teal
            cardIcon = 'ribbon-outline';
            iconColor = '#14B8A6';
            cardBg = '#F0FDFA';
            break;
          case 'strength':
          case 'final':
            borderLeftColor = '#10B981'; // Green
            cardIcon = 'shield-checkmark-outline';
            iconColor = '#10B981';
            cardBg = '#F0FDF4';
            break;
          case 'weakness':
          case 'risk':
            borderLeftColor = '#EF4444'; // Red
            cardIcon = 'alert-circle-outline';
            iconColor = '#EF4444';
            cardBg = '#FFF5F5';
            break;
          case 'opponent':
          case 'counter':
          case 'settlement':
            borderLeftColor = '#F59E0B'; // Amber
            cardIcon = 'warning-outline';
            iconColor = '#F59E0B';
            cardBg = '#FFFBEB';
            break;
          case 'steps':
          case 'timeline':
          case 'recommendations':
            borderLeftColor = '#8A5CF5';
            cardIcon = 'git-commit-outline';
            iconColor = '#8A5CF5';
            cardBg = '#F5F3FF';
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

// DICTIONARY OF ACTION SHEETS
const STRATEGY_ACTIONS = {
  litigationPlanning: [
    { id: 'build_roadmap', label: 'Build Complete Litigation Roadmap', desc: 'Create end-to-end litigation timeline and plan', isImmediate: true },
    { id: 'winning_strategy', label: 'Winning Litigation Strategy', desc: 'Prepare complete strategy focusing on legal positions', isImmediate: false, promptText: 'Prepare a complete litigation strategy for this case focusing on the strongest legal position, procedural roadmap, risks, expected objections, evidence planning, and courtroom recommendations.' },
    { id: 'plaintiff_strategy', label: 'Plaintiff Strategy', desc: 'Maximize impact of primary plaint and claims', isImmediate: true },
    { id: 'defendant_strategy', label: 'Defendant Strategy', desc: 'Maximize strength of written statements and counters', isImmediate: true },
    { id: 'trial_strategy', label: 'Trial Strategy', desc: 'Formulate witness timelines and examination order', isImmediate: true },
    { id: 'appeal_strategy', label: 'Appeal Strategy', desc: 'Draft grounds of appeal and record error audits', isImmediate: true },
    { id: 'interim_relief', label: 'Interim Relief Strategy', desc: 'Prepare injunctions, stays, and emergency relief orders', isImmediate: true },
    { id: 'execution_strategy', label: 'Execution Strategy', desc: 'Plan enforcement of decrees and recoveries', isImmediate: true },
    { id: 'recovery_strategy', label: 'Recovery Strategy', desc: 'Maximize financial recoveries and attachments', isImmediate: true },
  ],
  courtPreparation: [
    { id: 'next_hearing', label: 'Next Hearing Preparation', desc: 'Draft specific checklists and briefs for next date', isImmediate: true },
    { id: 'judge_convincing', label: 'Judge Convincing Strategy', desc: 'Determine judicial focus and key ratios to highlight', isImmediate: true },
    { id: 'presentation_plan', label: 'Courtroom Presentation Plan', desc: 'Structure oral arguments and facts folders', isImmediate: true },
    { id: 'hearing_checklist', label: 'Daily Hearing Checklist', desc: 'Checklist of case files and procedural motions', isImmediate: true },
    { id: 'court_notes', label: 'Court Notes', desc: 'Consolidated briefing sheets for argue sessions', isImmediate: true },
    { id: 'possible_judge_questions', label: 'Possible Judge Questions', desc: 'Scan and predict hard questions from bench', isImmediate: true },
    { id: 'emergency_prep', label: 'Emergency Hearing Preparation', desc: 'Prepare strategies for uncooperative witnesses or new facts', isImmediate: true },
    { id: 'court_timeline', label: 'Court Timeline', desc: 'Track dates and procedural timelines', isImmediate: true },
  ],
  opponentIntelligence: [
    { id: 'predict_opponent_arguments', label: 'Predict Opponent Arguments', desc: 'Anticipate defense or prosecution arguments', isImmediate: true },
    { id: 'predict_opponent_evidence', label: 'Predict Opponent Evidence', desc: 'Determine opposing evidence entries', isImmediate: true },
    { id: 'predict_opponent_strategy', label: 'Predict Opponent Strategy', desc: 'Predict general opponent actions', isImmediate: true },
    { id: 'possible_objections', label: 'Possible Objections', desc: 'Highlight where opposing counsel will object', isImmediate: true },
    { id: 'opponent_weakness', label: 'Weakness in Opponent Case', desc: 'Isolate opposing gaps or credibility failures', isImmediate: true },
    { id: 'counter_litigation', label: 'Counter Litigation Plan', desc: 'Strategies to disrupt opponent litigation path', isImmediate: true },
    { id: 'opponent_risk', label: 'Opponent Risk Analysis', desc: 'Examine opposing liability exposure', isImmediate: true },
  ],
  evidencePlanning: [
    { id: 'evidence_mapping', label: 'Evidence Mapping', desc: 'Correlate facts to supportive evidence', isImmediate: true },
    { id: 'evidence_priority', label: 'Evidence Priority', desc: 'Order of exhibits filing for maximum impact', isImmediate: true },
    { id: 'missing_evidence', label: 'Missing Evidence', desc: 'Highlight gaps in current case documents', isImmediate: true },
    { id: 'missing_documents', label: 'Missing Documents', desc: 'Identify records to summon', isImmediate: true },
    { id: 'strongest_evidence', label: 'Strongest Supporting Evidence', desc: 'Highlight primary corroborative details', isImmediate: true },
    { id: 'weak_evidence', label: 'Weak Evidence Detection', desc: 'Audit inadmissible or compromised evidence', isImmediate: true },
    { id: 'evidence_timeline', label: 'Evidence Timeline', desc: 'Verify chronological sequence of logs', isImmediate: true },
    { id: 'evidence_risk', label: 'Evidence Risk Analysis', desc: 'Examine risk of opposing admissibility checks', isImmediate: true },
  ],
  settlementIntelligence: [
    { id: 'settlement_probability', label: 'Settlement Probability', desc: 'Calculate likelihood of out-of-court settlement', isImmediate: true },
    { id: 'negotiation_strategy', label: 'Negotiation Strategy', desc: 'Formulate target compromise thresholds', isImmediate: true },
    { id: 'mediation_plan', label: 'Mediation Plan', desc: 'Check mediation parameters and briefs', isImmediate: true },
    { id: 'compromise_suggestions', label: 'Compromise Suggestions', desc: 'Recommend concession points to secure compromise', isImmediate: true },
    { id: 'best_time_settle', label: 'Best Time to Settle', desc: 'Highlight ideal litigation phase for settlement offer', isImmediate: true },
    { id: 'settlement_risk', label: 'Settlement Risk Analysis', desc: 'Audit risk of settling vs trial costs', isImmediate: true },
    { id: 'settlement_draft', label: 'Settlement Draft Guidance', desc: 'Structure release terms and compromise drafts', isImmediate: true },
  ],
  litigationRoadmap: [
    { id: 'case_timeline', label: 'Case Timeline', desc: 'Historical timeline of events and logs', isImmediate: true },
    { id: 'legal_deadlines', label: 'Legal Deadlines', desc: 'Calculate limitation deadlines and check schedules', isImmediate: true },
    { id: 'next_legal_steps', label: 'Next Legal Steps', desc: 'Immediate procedural tasks catalog', isImmediate: true },
    { id: 'court_calendar', label: 'Court Calendar', desc: 'View local listing times and schedule', isImmediate: true },
    { id: 'doc_checklist', label: 'Document Checklist', desc: 'Checklist of filings needed', isImmediate: true },
    { id: 'compliance_tracker', label: 'Compliance Tracker', desc: 'Track adherence to statutory rules', isImmediate: true },
    { id: 'appeal_timeline', label: 'Appeal Timeline', desc: 'Limitation periods for appeal filings', isImmediate: true },
    { id: 'execution_timeline', label: 'Execution Timeline', desc: 'Verify timelines for decree execution', isImmediate: true },
  ],
  successAnalysis: [
    { id: 'winning_probability', label: 'Winning Probability', desc: 'Calculate success probability and liability', isImmediate: true },
    { id: 'risk_score', label: 'Risk Score', desc: 'Generate complete risk index audit', isImmediate: true },
    { id: 'strength_score', label: 'Strength Score', desc: 'Calculate overall case strength metrics', isImmediate: true },
    { id: 'weakness_score', label: 'Weakness Score', desc: 'Audit internal case weaknesses and leaks', isImmediate: true },
    { id: 'case_readiness', label: 'Case Readiness Score', desc: 'Assess readiness of documents and witness prep', isImmediate: true },
    { id: 'cost_benefit', label: 'Cost vs Benefit Analysis', desc: 'Examine litigation costs vs recovery probability', isImmediate: true },
    { id: 'time_estimation', label: 'Time Estimation', desc: 'Predict litigation duration based on court backend', isImmediate: true },
    { id: 'complexity_analysis', label: 'Complexity Analysis', desc: 'Assess legal issues and statutory density', isImmediate: true },
  ],
  courtSimulation: [
    { id: 'mock_court', label: 'Mock Courtroom', desc: 'Simulate full moot hearing with AI judge and counsel', isImmediate: false, promptText: 'Simulate a mock courtroom hearing for my case. Roleplay as the Judge. Ask me difficult questions about my claim.' },
    { id: 'sim_judge', label: 'Judge Simulation', desc: 'AI roleplays as judge asking hard legal questions', isImmediate: false, promptText: 'Simulate a Judge. Review my case facts and ask me 3 difficult questions to challenge my claims.' },
    { id: 'sim_opp', label: 'Opposing Counsel Simulation', desc: 'AI acts as opposing counsel attacking case weak points', isImmediate: false, promptText: 'Simulate Opposing Counsel. Attack my case weak points and present 3 objections.' },
    { id: 'sim_cross', label: 'Cross Examination Practice', desc: 'Practice answering cross questions for witness preparation', isImmediate: false, promptText: 'Simulate Cross Examination of my witness Nitin. Ask questions to challenge witness credibility.' },
    { id: 'sim_rapid', label: 'Rapid Fire Questions', desc: 'Answer quick procedural questions to test arguments', isImmediate: false, promptText: 'Ask me 5 rapid fire legal questions about the procedural deadlines of my case.' },
    { id: 'sim_scenarios', label: 'Unexpected Court Scenarios', desc: 'Practice response to surprise evidence or new objections', isImmediate: false, promptText: 'Simulate an unexpected courtroom scenario (e.g. opposing counsel presents surprise document). Prepare me on how to respond.' },
    { id: 'sim_emergency', label: 'Emergency Responses', desc: 'Simulate responses for adverse judge remarks or hostile witness', isImmediate: false, promptText: 'Draft emergency responses for adverse judge remarks during oral arguments.' },
  ]
};

// Input-Focused Custom Actions
const INPUT_ACTIONS = [
  { id: 'search_strategy', label: 'Search Strategy', desc: 'Search for phrases in case strategy logs', placeholder: 'Search within litigation files...' },
  { id: 'find_precedents', label: 'Find Precedents', desc: 'Locate binding court cases', placeholder: 'Enter keyword to find precedents...' },
  { id: 'custom_strategy', label: 'Custom Strategy', desc: 'Submit custom strategic litigation requests', placeholder: 'Describe the specific issue you want strategy for...' }
];

export default function StrategyEngineScreen() {
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
      const filtered = sessionList.filter((s: any) => s.activeTool === 'strategyEngine');
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
  const [favorites, setFavorites] = useState<string[]>(['Build Complete Litigation Roadmap', 'Winning Litigation Strategy', 'Mock Courtroom']);
  const [recentlyUsed, setRecentlyUsed] = useState<string[]>(['Build Complete Litigation Roadmap', 'Winning Litigation Strategy', 'Trial Strategy']);

  // UI state for inputs composer
  const [composerPlaceholder, setComposerPlaceholder] = useState('Ask about this case...');
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

  // Dynamic Case Type Detection (based on attachments name)
  const detectedCaseType = useMemo(() => {
    if (attachments.length === 0) return '';
    const name = attachments[0].name.toLowerCase();
    if (name.includes('cheque') || name.includes('bounce') || name.includes('complainant')) return 'Cheque Bounce';
    if (name.includes('property') || name.includes('partition') || name.includes('plaint')) return 'Property Dispute';
    if (name.includes('criminal') || name.includes('fir') || name.includes('assault')) return 'Criminal Matter';
    if (name.includes('family') || name.includes('custody') || name.includes('appeal')) return 'Family Matter';
    return 'Civil Litigation Case';
  }, [attachments]);

  // AI Recommended Actions depending on the active case type
  const aiRecommendedActions = useMemo(() => {
    if (!detectedCaseType) return [];
    
    if (detectedCaseType === 'Cheque Bounce') {
      return [
        { id: 'recovery_strategy', label: 'Build Recovery Strategy', desc: 'Create end-to-end recovery roadmap' },
        { id: 'predict_opponent_strategy', label: 'Predict Defence', desc: 'Anticipate opposing security cheque arguments' },
        { id: 'settlement_possibility', label: 'Settlement Possibility', desc: 'Check mediation concessions possibilities' },
        { id: 'court_timeline', label: 'Court Timeline', desc: 'Track trial calendar dates and limitation schedules' },
        { id: 'winning_probability', label: 'Winning Probability', desc: 'Calculate success probability and liability risks' },
      ];
    }
    if (detectedCaseType === 'Property Dispute') {
      return [
        { id: 'prop_plan', label: 'Property Litigation Plan', desc: 'Audit adverse possession or title limits' },
        { id: 'evidence_mapping', label: 'Evidence Strategy', desc: 'Correlate electricity bill pings and tax logs' },
        { id: 'civil_roadmap', label: 'Civil Court Roadmap', desc: 'Limit suit parameters under Limitation Act' },
        { id: 'appeal_strategy', label: 'Appeal Planning', desc: 'Draft grounds of appeal and record error audits' }
      ];
    }
    if (detectedCaseType === 'Criminal Matter') {
      return [
        { id: 'defense_strat', label: 'Defence Strategy', desc: 'Examine procedural failures in FIR logs' },
        { id: 'cross_questions', label: 'Cross Examination Plan', desc: 'Discredit opposing eyewitness credibility' },
        { id: 'witness_prep', label: 'Witness Preparation', desc: 'Prepare own witnesses for cross questions' },
        { id: 'opponent_risk', label: 'Risk Analysis', desc: 'Scan and predict hard prosecution pings' }
      ];
    }
    if (detectedCaseType === 'Family Matter') {
      return [
        { id: 'settlement_strategy', label: 'Settlement Strategy', desc: 'Formulate target compromise thresholds' },
        { id: 'custody_planning', label: 'Custody Planning', desc: 'Draft child welfare and visitation agreements' },
        { id: 'negotiation_roadmap', label: 'Negotiation Roadmap', desc: 'Prepare mediation concession roadmap' },
        { id: 'next_hearing', label: 'Court Preparation', desc: 'Prepare oral opening speech scripts' }
      ];
    }
    
    return [
      { id: 'build_roadmap', label: 'Build Litigation Roadmap', desc: 'General findings litigation timeline' },
      { id: 'winning_strategy', label: 'Winning Strategy', desc: 'Build primary core legal claims' }
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
      setComposerPlaceholder('Plan your legal strategy...');
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
        ...STRATEGY_ACTIONS.litigationPlanning,
        ...STRATEGY_ACTIONS.courtPreparation,
        ...STRATEGY_ACTIONS.opponentIntelligence,
        ...STRATEGY_ACTIONS.evidencePlanning,
        ...STRATEGY_ACTIONS.settlementIntelligence,
        ...STRATEGY_ACTIONS.litigationRoadmap,
        ...STRATEGY_ACTIONS.successAnalysis,
        ...STRATEGY_ACTIONS.courtSimulation,
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
      const currentSessionId = sessionId || `session_strategy_${Date.now()}`;
      setSessionId(currentSessionId);

      const history = finalMessages
        .filter((m) => m.id !== aiMsgId)
        .map((m) => ({ role: m.role, content: m.content }));

      const payload: Record<string, any> = {
        content: text,
        sessionId: currentSessionId,
        activeTool: 'strategyEngine',
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
        console.warn('[StrategyEngine] Stream err, fallback used:', streamErr);
      }

      if (isCancelledRef.current || controller.signal.aborted) {
        setMessages((prev) =>
          prev.map((m) => (m.id === aiMsgId ? { ...m, isProcessing: false } : m))
        );
        setIsSending(false);
        return;
      }

      if (isFallbackNeeded) {
        let key = 'build_roadmap';
        if (actionId) {
          if (MOCK_ANSWERS[actionId]) {
            key = actionId;
          } else if (actionId.includes('roadmap') || actionId.includes('build')) {
            key = 'build_roadmap';
          } else if (actionId.includes('winning')) {
            key = 'winning_strategy';
          } else if (actionId.includes('opp') || actionId.includes('weakness')) {
            key = 'opponent_weakness';
          }
        } else {
          if (detectedCaseType === 'Cheque Bounce') key = 'build_roadmap';
          else if (detectedCaseType === 'Property Dispute') key = 'defense_strat';
          else if (detectedCaseType === 'Criminal Matter') key = 'opponent_weakness';
        }

        const fallbackResponse = MOCK_ANSWERS[key] || MOCK_ANSWERS.build_roadmap;

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
          console.warn('[StrategyEngine] Session details sync error:', e);
        }
      }, 1000);

    } catch (e) {
      if (isCancelledRef.current || controller.signal.aborted) {
        setMessages((prev) =>
          prev.map((m) => (m.id === aiMsgId ? { ...m, isProcessing: false } : m))
        );
      } else {
        console.error(e);
        showToast('error', 'Strategy Generation Failed', 'Unable to reach AI Strategy Engine.');
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiMsgId
              ? {
                  ...m,
                  content: '⚠️ Strategy audit failed. Please verify connection and try again.',
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
    showToast('success', 'Copied', 'Strategy brief copied to clipboard.');
  };

  const handleExportPDF = (name: string) => {
    showToast('success', 'PDF Export Success', `${name} litigation strategy report saved.`);
  };

  const handleExportDOCX = (name: string) => {
    showToast('success', 'Word Export Success', `${name} court preparation report saved.`);
  };

  const handleShareAnalysis = () => {
    showToast('info', 'Share Screen', 'Court strategy brief sharing activated.');
  };

  const handleSaveToCase = () => {
    showToast('success', 'Saved', 'Court strategy report linked to active case dossiers.');
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

  // Bottom Sheet execution rules
  const handleExecuteAction = (action: { id: string; label: string; isImmediate: boolean; promptText?: string; placeholder?: string }) => {
    setIsActionsOpen(false);
    if (action.isImmediate || attachments.length > 0) {
      let prompt = action.promptText || `Run ${action.label} on case records.`;
      if (attachments.length > 0) {
        prompt = `${action.label} on attached case files: ${attachments.map((a) => `"${a.name}"`).join(', ')}.`;
      }
      handleSend(prompt, action.id);
    } else {
      // Prompt pre-filling logic
      setInputVal(action.promptText || '');
      setComposerPlaceholder(action.placeholder || 'Ask about this case...');
      setTimeout(() => {
        textInputRef.current?.focus();
      }, 150);
    }
  };

  // Filter actions based on bottom sheet search phrase
  const filteredActions = useMemo(() => {
    const query = actionsSearchQuery.toLowerCase().trim();
    if (!query) return STRATEGY_ACTIONS;

    const filterList = (list: { id: string; label: string; desc: string; isImmediate: boolean }[]) =>
      list.filter((a) => a.label.toLowerCase().includes(query) || a.desc.toLowerCase().includes(query));

    return {
      litigationPlanning: filterList(STRATEGY_ACTIONS.litigationPlanning),
      courtPreparation: filterList(STRATEGY_ACTIONS.courtPreparation),
      opponentIntelligence: filterList(STRATEGY_ACTIONS.opponentIntelligence),
      evidencePlanning: filterList(STRATEGY_ACTIONS.evidencePlanning),
      settlementIntelligence: filterList(STRATEGY_ACTIONS.settlementIntelligence),
      litigationRoadmap: filterList(STRATEGY_ACTIONS.litigationRoadmap),
      successAnalysis: filterList(STRATEGY_ACTIONS.successAnalysis),
      courtSimulation: filterList(STRATEGY_ACTIONS.courtSimulation),
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
    showToast('info', 'Session Reset', 'Court strategy workspace cleared.');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      {/* HEADER SECTION */}
      <View style={[styles.header, { borderBottomColor: theme.border, backgroundColor: theme.surface }]}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
        </Pressable>

        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Strategy Engine</Text>
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
            title="Strategy Engine" 
            subtitle="Plan litigation strategy..." 
            icon="🧠" 
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
                aiName="Strategy Engine"
                aiIcon="🧠"
                onCopy={() => {
                  Clipboard.setString(item.content);
                  showToast('success', 'Copied', 'Strategy copied to clipboard.');
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
              const fileMock = MOCK_CASE_FILES.find((f) => f.name === a.name);
              const docType = fileMock?.detectedType || 'Case File';
              return (
                <View key={a.name} style={styles.attachmentChip}>
                  <Ionicons name="document-text" size={16} color="#8A5CF5" />
                  <View style={{ marginHorizontal: 6, maxWidth: 140 }}>
                    <Text style={styles.attachmentName} numberOfLines={1}>
                      {a.name}
                    </Text>
                    {detectedCaseType ? (
                      <View style={styles.detectedBadge}>
                        <Text style={styles.detectedBadgeText}>{docType}</Text>
                      </View>
                    ) : null}
                  </View>
                  <TouchableOpacity onPress={() => handleRemoveAttachment(a.name)}>
                    <Ionicons name="close-circle" size={16} color="#EF4444" style={{ marginLeft: 4 }} />
                  </TouchableOpacity>
                </View>
              );
            })}
            <TouchableOpacity style={styles.addMoreBtn} onPress={showAttachmentOptions}>
              <Ionicons name="add" size={16} color="#475569" />
              <Text style={styles.addMoreText}>Add Document</Text>
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
          placeholder="Plan legal strategy..."
          simulatedVoiceText="Develop a litigation roadmap and settlement strategy for this case."
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

      {/* STRATEGY ACTIONS BOTTOM SHEET */}
      <Modal visible={isActionsOpen} animationType="slide" transparent={true} onRequestClose={() => setIsActionsOpen(false)}>
        <TouchableWithoutFeedback onPress={() => setIsActionsOpen(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.bottomSheetContainer, Shadows.modal]}>
                <View style={styles.bottomSheetDragHandle} />

                <View style={styles.bottomSheetHeader}>
                  <Text style={styles.bottomSheetTitle}>Litigation Workflows</Text>
                  <TouchableOpacity onPress={() => setIsActionsOpen(false)}>
                    <Ionicons name="close-circle" size={24} color="#94A3B8" />
                  </TouchableOpacity>
                </View>

                {/* Actions filter search input */}
                <View style={styles.sheetSearchContainer}>
                  <Ionicons name="search" size={18} color="#94A3B8" style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.sheetSearchInput}
                    placeholder="Search strategy workflows (e.g. roadmap, settlement)..."
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
                              const item = [...STRATEGY_ACTIONS.litigationPlanning, ...STRATEGY_ACTIONS.courtPreparation, ...STRATEGY_ACTIONS.opponentIntelligence, ...STRATEGY_ACTIONS.evidencePlanning, ...STRATEGY_ACTIONS.settlementIntelligence, ...STRATEGY_ACTIONS.litigationRoadmap, ...STRATEGY_ACTIONS.successAnalysis, ...STRATEGY_ACTIONS.courtSimulation].find((a) => a.label === label);
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
                            style={[styles.recentActionItem, { borderColor: '#8A5CF5' }]}
                            onPress={() => {
                              const item = [...STRATEGY_ACTIONS.litigationPlanning, ...STRATEGY_ACTIONS.courtPreparation, ...STRATEGY_ACTIONS.opponentIntelligence, ...STRATEGY_ACTIONS.evidencePlanning, ...STRATEGY_ACTIONS.settlementIntelligence, ...STRATEGY_ACTIONS.litigationRoadmap, ...STRATEGY_ACTIONS.successAnalysis, ...STRATEGY_ACTIONS.courtSimulation].find((a) => a.label === label);
                              if (item) handleExecuteAction(item);
                            }}
                          >
                            <Ionicons name="star" size={12} color="#8A5CF5" style={{ marginRight: 4 }} />
                            <Text style={[styles.recentActionText, { color: '#8A5CF5' }]}>{label}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </>
                  )}

                  {/* AI Recommended Actions (changes based on active case type) */}
                  {!actionsSearchQuery && (
                    <>
                      <Text style={styles.categoryHeading}>🤖 AI Recommended</Text>
                      {aiRecommendedActions.length > 0 ? (
                        <View style={styles.actionsList}>
                          {aiRecommendedActions.map((action) => (
                            <TouchableOpacity key={action.id} style={styles.actionListItem} onPress={() => handleExecuteAction({ ...action, isImmediate: true })}>
                              <View style={styles.actionListIcon}>
                                <Ionicons name="sparkles" size={16} color="#8A5CF5" />
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
                          <Text style={styles.actionsEmptyText}>Please attach case records to activate recommended command center roadmaps.</Text>
                        </View>
                      )}
                    </>
                  )}

                  {/* Litigation Planning Category */}
                  {filteredActions.litigationPlanning.length > 0 && (
                    <>
                      <Text style={styles.categoryHeading}>⚖️ Litigation Planning</Text>
                      <View style={styles.actionsList}>
                        {filteredActions.litigationPlanning.map((action) => (
                          <TouchableOpacity key={action.id} style={styles.actionListItem} onPress={() => handleExecuteAction(action)}>
                            <View style={[styles.actionListIcon, { backgroundColor: '#EFF6FF' }]}>
                              <Ionicons name="map-outline" size={16} color="#3B82F6" />
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

                  {/* Court Preparation Category */}
                  {filteredActions.courtPreparation.length > 0 && (
                    <>
                      <Text style={styles.categoryHeading}>🎯 Court Preparation</Text>
                      <View style={styles.actionsList}>
                        {filteredActions.courtPreparation.map((action) => (
                          <TouchableOpacity key={action.id} style={styles.actionListItem} onPress={() => handleExecuteAction(action)}>
                            <View style={[styles.actionListIcon, { backgroundColor: '#F0FDF4' }]}>
                              <Ionicons name="megaphone-outline" size={16} color="#10B981" />
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

                  {/* Opponent Intelligence Category */}
                  {filteredActions.opponentIntelligence.length > 0 && (
                    <>
                      <Text style={styles.categoryHeading}>🧠 Opponent Intelligence</Text>
                      <View style={styles.actionsList}>
                        {filteredActions.opponentIntelligence.map((action) => (
                          <TouchableOpacity key={action.id} style={styles.actionListItem} onPress={() => handleExecuteAction(action)}>
                            <View style={[styles.actionListIcon, { backgroundColor: '#FFFBEB' }]}>
                              <Ionicons name="eye-outline" size={16} color="#F59E0B" />
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
                            <View style={[styles.actionListIcon, { backgroundColor: '#E2E8F0' }]}>
                              <Ionicons name="chatbox-ellipses-outline" size={16} color="#475569" />
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

                  {/* Evidence Planning Category */}
                  {filteredActions.evidencePlanning.length > 0 && (
                    <>
                      <Text style={styles.categoryHeading}>📑 Evidence Auditing</Text>
                      <View style={styles.actionsList}>
                        {filteredActions.evidencePlanning.map((action) => (
                          <TouchableOpacity key={action.id} style={styles.actionListItem} onPress={() => handleExecuteAction(action)}>
                            <View style={[styles.actionListIcon, { backgroundColor: '#F0FDF4' }]}>
                              <Ionicons name="document-attach-outline" size={16} color="#10B981" />
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

                  {/* Settlement Intelligence Category */}
                  {filteredActions.settlementIntelligence.length > 0 && (
                    <>
                      <Text style={styles.categoryHeading}>🤝 Settlement Intelligence</Text>
                      <View style={styles.actionsList}>
                        {filteredActions.settlementIntelligence.map((action) => (
                          <TouchableOpacity key={action.id} style={styles.actionListItem} onPress={() => handleExecuteAction(action)}>
                            <View style={[styles.actionListIcon, { backgroundColor: '#EFF6FF' }]}>
                              <Ionicons name="people-outline" size={16} color="#3B82F6" />
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

                  {/* Litigation Roadmap Category */}
                  {filteredActions.litigationRoadmap.length > 0 && (
                    <>
                      <Text style={styles.categoryHeading}>📅 Litigation Roadmaps & Deadlines</Text>
                      <View style={styles.actionsList}>
                        {filteredActions.litigationRoadmap.map((action) => (
                          <TouchableOpacity key={action.id} style={styles.actionListItem} onPress={() => handleExecuteAction(action)}>
                            <View style={[styles.actionListIcon, { backgroundColor: '#F5F3FF' }]}>
                              <Ionicons name="calendar-outline" size={16} color="#8A5CF5" />
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

                  {/* Success Analysis Category */}
                  {filteredActions.successAnalysis.length > 0 && (
                    <>
                      <Text style={styles.categoryHeading}>📈 AI Success Metrics Diagnostics</Text>
                      <View style={styles.actionsList}>
                        {filteredActions.successAnalysis.map((action) => (
                          <TouchableOpacity key={action.id} style={styles.actionListItem} onPress={() => handleExecuteAction(action)}>
                            <View style={[styles.actionListIcon, { backgroundColor: '#E0F2FE' }]}>
                              <Ionicons name="pulse-outline" size={16} color="#0284C7" />
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

                  {/* AI Court Simulation Category */}
                  {filteredActions.courtSimulation.length > 0 && (
                    <>
                      <Text style={styles.categoryHeading}>🎭 Moot Simulation Practice</Text>
                      <View style={styles.actionsList}>
                        {filteredActions.courtSimulation.map((action) => (
                          <TouchableOpacity key={action.id} style={styles.actionListItem} onPress={() => handleExecuteAction(action)}>
                            <View style={[styles.actionListIcon, { backgroundColor: '#FEF2F2' }]}>
                              <Ionicons name="logo-medium" size={16} color="#EF4444" />
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
                          color={sessionId === item.sessionId ? '#8A5CF5' : theme.textSecondary}
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

// Offline Answer Mocks
const MOCK_ANSWERS: Record<string, string> = {
  build_roadmap: `# Case Summary
Cheque Dishonour Suit under Section 138 of the Negotiable Instruments (NI) Act, 1881. The complainant claims the defendant Nitin Kumar issued a cheque of INR 5,00,000 which dishonoured due to "Funds Insufficient".

# Key Legal Issues
* Did the defendant issue the cheque in discharge of a legally enforceable debt?
* Was the notice of dishonour served within the statutory period of 30 days?

# Current Legal Position
Complainant holds the dishonoured cheque and return memo. Presumptions under Section 118 and 139 of the NI Act are in the complainant's favour.

# Applicable Laws
* Negotiable Instruments Act, 1881
* Code of Criminal Procedure, 1973

# Applicable Sections
* **Section 138:** Offense of cheque dishonour.
* **Section 139:** Presumption in favour of holder.

# Relevant Judgments
* **Rangappa v. Sri Mohan (2010 SC):** The Supreme Court held that the presumption mandated by Section 139 includes the existence of a legally enforceable debt.

# Strength Analysis
* Direct proof of signature and return memo. Burden of proof is on Nitin Kumar to rebut the presumption.

# Weakness Analysis
* The transaction was made in cash; lack of written loan agreement or bank transaction trace.

# Opponent Strategy Prediction
* Nitin will argue the cheque was given as security and that the loan amount was never advanced.

# Counter Strategy
* Rely on SC precedent that security cheques also attract Section 138 if default exists at the time of presentation.

# Evidence Planning
* File postal registry tracking logs to prove notice delivery.

# Missing Documents
* Complainant bank account statements verifying cash withdrawals matching the loan date.

# Immediate Next Steps
* Submit certified bank returns and registry receipts.

# Court Timeline
* Trial estimated at 8-12 months in Magistrate Court.

# Risk Assessment
* High risk of dispute if defendant proves financial incapacity of complainant at the loan date.

# Settlement Possibility
* Recommended to settle if defendant offers 80% (INR 4,00,000) lump sum before trial.

# Winning Probability: 85% Probability
High probability of success due to NI Act statutory presumptions.

# Practical Recommendations
* Serve summons through speed post and email.

# Final Strategy
* Retain primary focus on the Section 139 presumption, forcing Nitin Kumar to lead evidence first to rebut it.`,

  winning_strategy: `# Case Summary
Winning Litigation Strategy Brief.

# Current Legal Position
We hold primary legal title checks. The opponent's claims are barred under Article 65 of the Limitation Act.

# Strength Analysis
* Open and continuous possession of the suit property since 2010.

# Weakness Analysis
* Absence of registered sale deeds or conveyance maps.

# Winning Probability: 68% Probability
Moderate success probability depending on possession evidence.

# Next Best Action
* Submit electricity connection logs and property tax cards from 2012.`,

  opponent_weakness: `# Case Summary
Opponent weaknesses audit for Criminal Prosecution cases.

# Key Findings
* Prosecution has failed to list independent eye-witnesses, relying solely on testimony from relative witnesses.
* Delayed FIR registration: incident occurred on May 10, but FIR was registered on May 15 with no reasonable explanation for delay.

# Weaknesses
* Defense witness credibility is unverified.

# Winning Probability: 72% Probability
Highly favorable defense outlook due to delay in FIR.

# Next Best Action
* Prepare cross examination questions highlighting the timeline gap.`,

  defense_strat: `# Case Summary
Defense strategy audit for property partition claims.

# Strength Analysis
* Continuous title records verify possession.
* Limitation boundaries exist.

# Winning Probability: 65% Probability
Moderate success probability depending on possession evidence.

# Next Best Action
* Collate tax receipts from 2010 onwards.`
};

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
    backgroundColor: '#F5F3FF',
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
    backgroundColor: '#F5F3FF',
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
    ...Shadows.sm,
  },
  expandButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8A5CF5',
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
    color: '#8A5CF5',
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
    color: '#8A5CF5',
    fontWeight: '600',
  },
  strategyCard: {
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
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  attachmentName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#5B21B6',
  },
  detectedBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#EDE9FE',
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 1,
    marginTop: 1,
  },
  detectedBadgeText: {
    fontSize: 9,
    color: '#5B21B6',
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
    backgroundColor: '#8A5CF5',
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
    backgroundColor: '#EDE9FE',
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
    backgroundColor: '#8A5CF5',
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
    backgroundColor: '#F5F3FF',
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
    color: '#8A5CF5',
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
    borderBottomColor: '#8A5CF5',
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
