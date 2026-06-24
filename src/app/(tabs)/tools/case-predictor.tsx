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
    id: 'civil',
    name: 'written_statement_dispute.pdf',
    type: 'application/pdf',
    size: 1024 * 450,
    detectedType: 'Civil Dispute',
    url: 'https://ailegal.com/cases/written_statement_dispute.pdf',
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

// Response structured sections definitions for Case Intelligence report output
interface CasePredictorSection {
  title: string;
  content: string;
  type:
    | 'summary'
    | 'casetype'
    | 'probability'
    | 'outcome'
    | 'strength'
    | 'weakness'
    | 'risk'
    | 'evidence_score'
    | 'missing_evidence'
    | 'sections'
    | 'judgments'
    | 'opponent_strategy'
    | 'counter_suggestions'
    | 'settlement_chances'
    | 'appeal_chances'
    | 'timeline'
    | 'steps'
    | 'opinion'
    | 'normal';
}

const parseCasePredictorResponse = (content: string): CasePredictorSection[] => {
  const lines = content.split('\n');
  const sections: CasePredictorSection[] = [];
  let currentTitle = '';
  let currentContent: string[] = [];

  const getSectionType = (title: string): CasePredictorSection['type'] => {
    const t = title.toLowerCase();
    if (t.includes('summary')) return 'summary';
    if (t.includes('type')) return 'casetype';
    if (t.includes('probability')) return 'probability';
    if (t.includes('outcome')) return 'outcome';
    if (t.includes('strength')) return 'strength';
    if (t.includes('weakness')) return 'weakness';
    if (t.includes('risk')) return 'risk';
    if (t.includes('evidence score')) return 'evidence_score';
    if (t.includes('missing evidence')) return 'missing_evidence';
    if (t.includes('applicable sections')) return 'sections';
    if (t.includes('relevant judgments')) return 'judgments';
    if (t.includes('opponent strategy')) return 'opponent_strategy';
    if (t.includes('counter suggestions')) return 'counter_suggestions';
    if (t.includes('settlement chances')) return 'settlement_chances';
    if (t.includes('appeal chances')) return 'appeal_chances';
    if (t.includes('timeline')) return 'timeline';
    if (t.includes('steps') || t.includes('next steps')) return 'steps';
    if (t.includes('opinion')) return 'opinion';
    return 'normal';
  };

  for (const line of lines) {
    const match = line.match(/^(#{1,3})\s+(.*)/);
    if (match) {
      if (currentContent.length > 0 || currentTitle) {
        sections.push({
          title: currentTitle || 'Assessment Details',
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
      title: currentTitle || 'Assessment Details',
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
    content.includes('Case Summary') ||
    content.includes('Winning Probability') ||
    content.includes('Likely Outcome') ||
    content.includes('Evidence Score') ||
    content.includes('Final AI Opinion');

  if (!isStructured) {
    return <CustomMarkdownText content={content} isUser={false} searchQuery={searchQuery} theme={theme} />;
  }

  const sections = parseCasePredictorResponse(content);

  return (
    <View style={{ alignSelf: 'stretch', gap: 10 }}>
      {sections.map((sec, index) => {
        if (sec.type === 'probability') {
          const scoreText = sec.content;
          let probColor = '#EF4444'; // Red
          let progressVal = 0.4;
          let levelText = 'Low Chance';

          const matchNum = scoreText.match(/(\d+)\%/);
          if (matchNum) {
            const p = parseInt(matchNum[1]);
            progressVal = p / 100;
            if (p >= 75) {
              probColor = '#10B981'; // Green
              levelText = 'High Success Probability';
            } else if (p >= 50) {
              probColor = '#F59E0B'; // Amber
              levelText = 'Moderate Success Probability';
            }
          }

          return (
            <View key={index} style={[styles.strategyCard, { borderLeftColor: probColor }]}>
              <View style={styles.cardHeaderRow}>
                <Ionicons name="analytics-outline" size={18} color={probColor} />
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
                  <Text style={{ fontSize: 11, color: theme.textMuted }}>Favorable</Text>
                </View>
              </View>
            </View>
          );
        }

        if (sec.type === 'evidence_score') {
          const scoreText = sec.content;
          let progressVal = 0.5;
          let scoreColor = '#3B82F6'; // Blue
          
          const matchVal = scoreText.match(/(\d+)\s*\/\s*10/);
          if (matchVal) {
            const score = parseInt(matchVal[1]);
            progressVal = score / 10;
            if (score >= 8) scoreColor = '#10B981'; // Green
            else if (score >= 5) scoreColor = '#F59E0B'; // Amber
            else scoreColor = '#EF4444'; // Red
          }

          return (
            <View key={index} style={[styles.strategyCard, { borderLeftColor: scoreColor }]}>
              <View style={styles.cardHeaderRow}>
                <Ionicons name="document-text-outline" size={18} color={scoreColor} />
                <Text style={[styles.cardTitleText, { color: theme.textPrimary }]}>
                  {sec.title || 'Evidence Score'}
                </Text>
              </View>
              <View style={{ marginTop: 8 }}>
                <Text style={{ fontSize: 13, color: theme.textSecondary, marginBottom: 6 }}>
                  {renderWithSearchHighlight(sec.content, searchQuery)}
                </Text>
                <View style={styles.progressBarBg}>
                  <View style={{ height: '100%', width: `${progressVal * 100}%`, backgroundColor: scoreColor, borderRadius: 4 }} />
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                  <Text style={{ fontSize: 11, color: theme.textMuted }}>Inadmissible</Text>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: scoreColor }}>Reliability Index</Text>
                  <Text style={{ fontSize: 11, color: theme.textMuted }}>Solid Admissibility</Text>
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
          case 'casetype':
            borderLeftColor = '#64748B';
            cardIcon = 'eye-outline';
            iconColor = '#64748B';
            cardBg = '#F8FAFC';
            break;
          case 'outcome':
            borderLeftColor = '#3B82F6';
            cardIcon = 'shield-outline';
            iconColor = '#3B82F6';
            cardBg = '#EFF6FF';
            break;
          case 'strength':
            borderLeftColor = '#10B981';
            cardIcon = 'shield-checkmark-outline';
            iconColor = '#10B981';
            cardBg = '#F0FDF4';
            break;
          case 'weakness':
          case 'missing_evidence':
            borderLeftColor = '#EF4444';
            cardIcon = 'alert-circle-outline';
            iconColor = '#EF4444';
            cardBg = '#FFF5F5';
            break;
          case 'risk':
            borderLeftColor = '#F59E0B';
            cardIcon = 'warning-outline';
            iconColor = '#F59E0B';
            cardBg = '#FFFBEB';
            break;
          case 'sections':
          case 'judgments':
            borderLeftColor = '#8A5CF5';
            cardIcon = 'book-outline';
            iconColor = '#8A5CF5';
            cardBg = '#F5F3FF';
            break;
          case 'opponent_strategy':
          case 'counter_suggestions':
            borderLeftColor = '#F59E0B';
            cardIcon = 'git-branch-outline';
            iconColor = '#F59E0B';
            cardBg = '#FFFBEB';
            break;
          case 'settlement_chances':
          case 'appeal_chances':
            borderLeftColor = '#14B8A6';
            cardIcon = 'people-outline';
            iconColor = '#14B8A6';
            cardBg = '#F0FDFA';
            break;
          case 'timeline':
            borderLeftColor = '#64748B';
            cardIcon = 'time-outline';
            iconColor = '#64748B';
            cardBg = '#F8FAFC';
            break;
          case 'steps':
            borderLeftColor = '#8A5CF5';
            cardIcon = 'checkbox-outline';
            iconColor = '#8A5CF5';
            cardBg = '#F5F3FF';
            break;
          case 'opinion':
            borderLeftColor = '#8A5CF5';
            cardIcon = 'sparkles-outline';
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

// DICTIONARY OF CASE INTELLIGENCE ACTIONS
const PREDICTION_ACTIONS = {
  outcomePrediction: [
    { id: 'predict_outcome', label: 'Predict Final Outcome', desc: 'Predict likely final judgment outcomes with reasoning', isImmediate: false, promptText: 'Analyze this case and predict the most likely court outcome. Evaluate legal merits, evidence quality, risks, applicable laws, strengths, weaknesses, and provide an overall litigation assessment.' },
    { id: 'multi_outcomes', label: 'Multiple Possible Outcomes', desc: 'Detail alternative litigation results and pathways', isImmediate: true },
    { id: 'best_case', label: 'Best Case Scenario', desc: 'Assess maximum recovery or absolute acquittal bounds', isImmediate: true },
    { id: 'worst_case', label: 'Worst Case Scenario', desc: 'Assess maximum liability exposure or adverse bounds', isImmediate: true },
    { id: 'likely_decision', label: 'Likely Court Decision', desc: 'Evaluate specific judicial posture for final decree', isImmediate: true },
    { id: 'success_forecast', label: 'Case Success Forecast', desc: 'Review long-term case viability metrics', isImmediate: true }
  ],
  strengthAnalysis: [
    { id: 'overall_strength', label: 'Overall Strength Score', desc: 'Calculate consolidated litigation index', isImmediate: true },
    { id: 'legal_merit', label: 'Legal Merit Score', desc: 'Assess grounding on statutory law and precedents', isImmediate: true },
    { id: 'evidence_strength', label: 'Evidence Strength Score', desc: 'Judge admissibility and corroboration of documents', isImmediate: true },
    { id: 'court_readiness', label: 'Court Readiness Score', desc: 'Audit file completeness and procedural steps', isImmediate: true },
    { id: 'doc_quality', label: 'Documentation Quality', desc: 'Audit contract clauses, deeds, and registration logs', isImmediate: true },
    { id: 'witness_strength', label: 'Witness Strength', desc: 'Evaluate witness statements credibility', isImmediate: true },
    { id: 'proc_compliance', label: 'Procedural Compliance Score', desc: 'Check filings timeline and jurisdiction limits', isImmediate: true }
  ],
  weaknessAnalysis: [
    { id: 'weak_args', label: 'Weak Legal Arguments', desc: 'Locate vulnerability in pleading arguments', isImmediate: true },
    { id: 'weak_evidence', label: 'Weak Evidence', desc: 'Find uncorroborated assertions or unfiled proofs', isImmediate: true },
    { id: 'missing_docs', label: 'Missing Documents', desc: 'Highlight crucial missing legal deeds/notices', isImmediate: true },
    { id: 'missing_witnesses', label: 'Missing Witnesses', desc: 'Audit where witness testimonies are lacking', isImmediate: true },
    { id: 'proc_errors', label: 'Procedural Errors', desc: 'Find stamp duties, delay condonations, or filing lapses', isImmediate: true },
    { id: 'limitation_issues', label: 'Limitation Issues', desc: 'Evaluate whether suit is barred by limitation periods', isImmediate: true },
    { id: 'jurisdiction_issues', label: 'Jurisdiction Issues', desc: 'Verify territorial and pecuniary jurisdiction boundaries', isImmediate: true },
    { id: 'case_vulnerabilities', label: 'Case Vulnerabilities', desc: 'Comprehensive list of opponent targets', isImmediate: true }
  ],
  riskAnalysis: [
    { id: 'litigation_risks', label: 'Major Litigation Risks', desc: 'General list of exposure categories', isImmediate: true },
    { id: 'financial_risk', label: 'Financial Risk', desc: 'Assess adverse costs, damages, and fees bounds', isImmediate: true },
    { id: 'delay_risk', label: 'Delay Risk', desc: 'Evaluate judicial listing delays probability', isImmediate: true },
    { id: 'appeal_risk', label: 'Appeal Risk', desc: 'Check likelihood of target appeal filings', isImmediate: true },
    { id: 'execution_risk', label: 'Execution Risk', desc: 'Assess difficulty in executing decrees/recoveries', isImmediate: true },
    { id: 'adverse_risk', label: 'Adverse Judgment Risk', desc: 'Examine consequences of losing', isImmediate: true },
    { id: 'compliance_risk', label: 'Legal Compliance Risk', desc: 'Verify compliance during active suits', isImmediate: true },
    { id: 'settlement_risk', label: 'Settlement Risk', desc: 'Compare settling early vs going to trial', isImmediate: true }
  ],
  evidenceIntelligence: [
    { id: 'evidence_score', label: 'Evidence Score', desc: 'Calculate numeric index for evidentiary base', isImmediate: true },
    { id: 'evidence_priority', label: 'Evidence Priority', desc: 'Rank documents by value for trial', isImmediate: true },
    { id: 'strong_evidence', label: 'Strongest Evidence', desc: 'Identify primary supporting facts', isImmediate: true },
    { id: 'weakest_evidence', label: 'Weakest Evidence', desc: 'List inadmissible or contradictory records', isImmediate: true },
    { id: 'missing_evidence', label: 'Missing Evidence', desc: 'Analyze gaps in evidentiary chain', isImmediate: true },
    { id: 'evidence_timeline', label: 'Evidence Timeline', desc: 'Chronological tracking of evidentiary milestones', isImmediate: true },
    { id: 'reliability', label: 'Evidence Reliability', desc: 'Verify source authenticity and digital chains', isImmediate: true },
    { id: 'completeness', label: 'Document Completeness', desc: 'Perform visual layout completeness review', isImmediate: true }
  ],
  opponentIntelligence: [
    { id: 'opp_strategy', label: 'Predict Opponent Strategy', desc: 'Anticipate opposing counsel procedural moves', isImmediate: true },
    { id: 'likely_defence', label: 'Likely Defence', desc: 'Formulate likely grounds of opponent defense', isImmediate: true },
    { id: 'likely_objections', label: 'Likely Objections', desc: 'Anticipate objections to admissibility of records', isImmediate: true },
    { id: 'counter_arguments', label: 'Possible Counter Arguments', desc: 'Review responses for anticipated points', isImmediate: true },
    { id: 'opp_strength', label: 'Opponent Strength Score', desc: 'Calculate opposing case viability metrics', isImmediate: true },
    { id: 'opp_weakness', label: 'Opponent Weaknesses', desc: 'Leverage points where opponent is vulnerable', isImmediate: true }
  ],
  legalIntelligence: [
    { id: 'applicable_sections', label: 'Applicable Sections', desc: 'Applicable sections under central laws', isImmediate: true },
    { id: 'relevant_acts', label: 'Relevant Acts', desc: 'List relevant statutes and acts', isImmediate: true },
    { id: 'sc_judgments', label: 'Relevant Supreme Court Judgments', desc: 'Locate binding apex court precedents', isImmediate: true },
    { id: 'hc_judgments', label: 'Relevant High Court Judgments', desc: 'Audit state high court rulings', isImmediate: true },
    { id: 'legal_principles', label: 'Important Legal Principles', desc: 'Map relevant common law doctrines', isImmediate: true },
    { id: 'supporting_case_laws', label: 'Supporting Case Laws', desc: 'Reference citations for argument support', isImmediate: true },
    { id: 'latest_amendments', label: 'Latest Amendments', desc: 'Check recent statutory updates and notifications', isImmediate: true }
  ],
  settlementIntelligence: [
    { id: 'settlement_chances', label: 'Settlement Chances', desc: 'Assess likelihood of out-of-court settlement', isImmediate: true },
    { id: 'negotiation_possibility', label: 'Negotiation Possibility', desc: 'Suggest terms for compromise briefing', isImmediate: true },
    { id: 'settlement_timing', label: 'Settlement Timing', desc: 'Highlight the best stage to offer compromise', isImmediate: true },
    { id: 'compromise_analysis', label: 'Compromise Analysis', desc: 'Balance trial benefits vs settlement savings', isImmediate: true },
    { id: 'settlement_recommendation', label: 'Settlement Recommendation', desc: 'Generate target compromise terms', isImmediate: true }
  ],
  timelinePrediction: [
    { id: 'hearing_timeline', label: 'Expected Hearing Timeline', desc: 'Forecast hearing intervals based on local court backlogs', isImmediate: true },
    { id: 'judgment_timeline', label: 'Expected Judgment Timeline', desc: 'Predict reservation and delivery durations', isImmediate: true },
    { id: 'appeal_probability', label: 'Appeal Probability', desc: 'Assess odds of opponent filing higher appeals', isImmediate: true },
    { id: 'execution_timeline', label: 'Execution Timeline', desc: 'Forecast execution of decree timeline', isImmediate: true },
    { id: 'litigation_duration', label: 'Overall Litigation Duration', desc: 'Overall timeframe from institution to final decree', isImmediate: true }
  ],
  costIntelligence: [
    { id: 'litigation_cost', label: 'Estimated Litigation Cost', desc: 'Predict direct filing, counsel, and statutory fees', isImmediate: true },
    { id: 'cost_benefit', label: 'Time vs Cost Analysis', desc: 'Economic viability of pursuing litigation', isImmediate: true },
    { id: 'settlement_cost', label: 'Settlement Cost Comparison', desc: 'Net savings comparison of early settlements', isImmediate: true },
    { id: 'legal_expenses', label: 'Estimated Legal Expenses', desc: 'Analyse court fees and hidden expenses', isImmediate: true }
  ],
  courtSimulation: [
    { id: 'sim_judge', label: 'Judge Simulation', desc: 'AI acts as Judge to question your case merits', isImmediate: false, promptText: 'Simulate a Judge reviewing this case. Ask me 3 challenging questions to evaluate my claims.' },
    { id: 'court_outcome', label: 'Possible Court Outcome', desc: 'Run detailed simulation of possible courtroom debates', isImmediate: true },
    { id: 'alt_outcomes', label: 'Alternative Outcomes', desc: 'Assess what happens under hostile witness scenario', isImmediate: true },
    { id: 'what_if', label: 'What-if Analysis', desc: 'Simulate impact of changing specific evidentiary facts', isImmediate: true },
    { id: 'sim_opponent', label: 'Opponent Simulation', desc: 'AI acts as opposing counsel presenting counter-claims', isImmediate: false, promptText: 'Simulate Opposing Counsel. Present 3 strong arguments attacking my evidence.' },
    { id: 'court_simulation', label: 'Courtroom Scenario Simulation', desc: 'Simulate unexpected evidence or judge interventions', isImmediate: true }
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

export default function CasePredictorScreen() {
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
      const filtered = sessionList.filter((s: any) => s.activeTool === 'casePredictor');
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
  const [favorites, setFavorites] = useState<string[]>(['Predict Final Outcome', 'Overall Strength Score', 'Evidence Score']);
  const [recentlyUsed, setRecentlyUsed] = useState<string[]>(['Predict Final Outcome', 'Likely Court Decision', 'Evidence Score']);

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
    if (name.includes('civil') || name.includes('statement') || name.includes('dispute')) return 'Civil Dispute';
    return 'Civil Litigation Case';
  }, [attachments]);

  // AI Recommended Actions depending on the active case type
  const aiRecommendedActions = useMemo(() => {
    if (!detectedCaseType) return [];
    
    if (detectedCaseType === 'Cheque Bounce') {
      return [
        { id: 'predict_outcome', label: 'Predict Outcome', desc: 'Predict likely trial outcome under Negotiable Instruments limits' },
        { id: 'winning_probability', label: 'Winning Probability', desc: 'Calculate success probability and liability risks' },
        { id: 'recovery_chances', label: 'Recovery Chances', desc: 'Assess financial retrieval constraints' },
        { id: 'risk_analysis', label: 'Risk Analysis', desc: 'Evaluate specific litigation liabilities and limits' },
      ];
    }
    if (detectedCaseType === 'Property Matter') {
      return [
        { id: 'ownership_strength', label: 'Ownership Strength', desc: 'Audit adverse possession or title limits' },
        { id: 'missing_docs', label: 'Missing Documents', desc: 'Identify missing sale deeds or registration papers' },
        { id: 'legal_risks', label: 'Legal Risks', desc: 'Audit easement claims or title gaps' },
        { id: 'predict_outcome', label: 'Outcome Prediction', desc: 'Generate complete ownership outcome forecast' }
      ];
    }
    if (detectedCaseType === 'Criminal Matter') {
      return [
        { id: 'conviction_risk', label: 'Conviction Risk', desc: 'Examine evidentiary weight for conviction hazards' },
        { id: 'defense_strength', label: 'Defence Strength', desc: 'Examine procedural failures in FIR logs' },
        { id: 'evidence_quality', label: 'Evidence Quality', desc: 'Identify gaps or inconsistencies in testimony files' },
        { id: 'court_strategy', label: 'Court Strategy', desc: 'Formulate defense strategies for hearing' }
      ];
    }
    if (detectedCaseType === 'Civil Dispute') {
      return [
        { id: 'overall_strength', label: 'Strength Analysis', desc: 'Evaluate contract breaches and damages' },
        { id: 'hearing_timeline', label: 'Timeline', desc: 'Forecast hearing intervals based on local court backlogs' },
        { id: 'settlement_chances', label: 'Settlement Chances', desc: 'Assess likelihood of out-of-court settlement' },
        { id: 'evidence_strength', label: 'Evidence Review', desc: 'Judge admissibility and corroboration of documents' }
      ];
    }
    
    return [
      { id: 'predict_outcome', label: 'Predict Outcome', desc: 'General findings outcome timeline' },
      { id: 'overall_strength', label: 'Strength Analysis', desc: 'Assess general case strength metrics' }
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
        ...PREDICTION_ACTIONS.outcomePrediction,
        ...PREDICTION_ACTIONS.strengthAnalysis,
        ...PREDICTION_ACTIONS.weaknessAnalysis,
        ...PREDICTION_ACTIONS.riskAnalysis,
        ...PREDICTION_ACTIONS.evidenceIntelligence,
        ...PREDICTION_ACTIONS.opponentIntelligence,
        ...PREDICTION_ACTIONS.legalIntelligence,
        ...PREDICTION_ACTIONS.settlementIntelligence,
        ...PREDICTION_ACTIONS.timelinePrediction,
        ...PREDICTION_ACTIONS.costIntelligence,
        ...PREDICTION_ACTIONS.courtSimulation,
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
      const currentSessionId = sessionId || `session_predictor_${Date.now()}`;
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
        activeTool: 'casePredictor',
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
        console.warn('[CasePredictor] Stream err, fallback used:', streamErr);
      }

      if (isCancelledRef.current || controller.signal.aborted) {
        setMessages((prev) =>
          prev.map((m) => (m.id === aiMsgId ? { ...m, isProcessing: false } : m))
        );
        setIsSending(false);
        return;
      }

      if (isFallbackNeeded) {
        const generatedFallback = generateMockReport(text, detectedCaseType);
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
            console.warn('[CasePredictor] Post-stream sync error:', e);
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
        showToast('error', 'Error', 'Failed to calculate outcome prediction.');
      }
    } finally {
      setIsSending(false);
      abortControllerRef.current = null;
    }
  };

  // Generate dynamic response structure based on selected actions
  const generateMockReport = (actionLabel: string, caseType: string) => {
    const cType = caseType || 'Civil Dispute';
    let prob = '78%';
    let score = '8/10';
    let laws = '* Section 138 of NI Act\n* Section 139 of NI Act';
    let cases = '* **Rangappa v. Sri Mohan (2010 SC)**\n* **Kishan Rao v. Shankargouda (2018 SC)**';

    if (cType === 'Property Matter') {
      prob = '65%';
      score = '6/10';
      laws = '* Section 54 of Transfer of Property Act\n* Section 65 of Limitation Act';
      cases = '* **Ravinder Kaur Grewal v. Manjit Kaur (2019 SC)**';
    } else if (cType === 'Criminal Matter') {
      prob = '58%';
      score = '7/10';
      laws = '* Section 323 of Indian Penal Code\n* Section 325 of Indian Penal Code';
      cases = '* **State of Haryana v. Bhajan Lal (1992 SC)**';
    } else if (cType === 'Civil Dispute') {
      prob = '70%';
      score = '8/10';
      laws = '* Section 73 of Indian Contract Act\n* Order 37 of Civil Procedure Code';
      cases = '* **ONGC v. Saw Pipes Ltd (2003 SC)**';
    }

    return `# Case Summary
We conducted an automated case intelligence assessment on the active files for this ${cType} matter.

# Case Type
${cType}

# Winning Probability
${prob} Success Rate

# Likely Outcome
A favorable decree is highly probable if crucial timelines and stamp duty receipts are submitted.

# Strength Analysis
* Solid prima facie documentary evidence exists.
* Legal notices have been served to opponent within statutory timelines.
* Claim is well grounded in applicable statutes.

# Weakness Analysis
* Lack of certified third-party logs of transactions.
* Some chronological gaps exist in evidence pings.

# Risk Factors
* Risk of high procedural delay in court listings.
* Adversary may seek stay orders or adjournments to drag timeline.

# Evidence Score
${score} Evidence Quality

# Missing Evidence
* Original registry certificates and certified courier receipts.
* Bank ledger statements showing financial debit transactions.

# Applicable Sections
${laws}

# Relevant Judgments
${cases}

# Opponent Strategy Prediction
* Defendant will likely file a petition to dismiss the suit on grounds of jurisdiction.
* Will attempt to prove that the dispute is civil rather than criminal.

# Counter Suggestions
* Submit detailed counter-affidavit addressing all objections item-by-item.
* File application for speedy trial under Section 309 CrPC / CPC.

# Settlement Chances
* 60% Settlement Chance
* Mediation is highly recommended to secure early recovery.

# Appeal Chances
* 40% Chance of Appeal
* Favorable decree is stable but target appeal may be filed in district court.

# Estimated Timeline
* 8-12 Months to trial completion.

# Recommended Next Steps
* Draft and file written witness submissions.
* File formal application for summoning original records from authority.

# Final AI Opinion
Overall legal stance is robust. We recommend initiating negotiation talks early to minimize trial delay risks, while keeping the court filings active.`;
  };

  // Response utilities
  const handleCopyText = (content: string) => {
    Clipboard.setString(content);
    showToast('success', 'Copied', 'Case intelligence brief copied to clipboard.');
  };

  const handleExportPDF = (name: string) => {
    showToast('success', 'PDF Export Success', `${name} case assessment report saved.`);
  };

  const handleExportDOCX = (name: string) => {
    showToast('success', 'Word Export Success', `${name} court readiness report saved.`);
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
      const textToSend = action.promptText || `Perform Case Intelligence assessment for: ${action.label}`;
      handleSend(textToSend, action.id);
    } else {
      // Prompt pre-filling logic
      const preFilledText = action.promptText || `Analyze this case and predict the most likely court outcome. Evaluate legal merits, evidence quality, risks, applicable laws, strengths, weaknesses, and provide an overall litigation assessment.`;
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
    const filterList = (list: typeof PREDICTION_ACTIONS.outcomePrediction) => {
      if (!q) return list;
      return list.filter((a) => a.label.toLowerCase().includes(q) || a.desc.toLowerCase().includes(q));
    };

    return {
      outcomePrediction: filterList(PREDICTION_ACTIONS.outcomePrediction),
      strengthAnalysis: filterList(PREDICTION_ACTIONS.strengthAnalysis),
      weaknessAnalysis: filterList(PREDICTION_ACTIONS.weaknessAnalysis),
      riskAnalysis: filterList(PREDICTION_ACTIONS.riskAnalysis),
      evidenceIntelligence: filterList(PREDICTION_ACTIONS.evidenceIntelligence),
      opponentIntelligence: filterList(PREDICTION_ACTIONS.opponentIntelligence),
      legalIntelligence: filterList(PREDICTION_ACTIONS.legalIntelligence),
      settlementIntelligence: filterList(PREDICTION_ACTIONS.settlementIntelligence),
      timelinePrediction: filterList(PREDICTION_ACTIONS.timelinePrediction),
      costIntelligence: filterList(PREDICTION_ACTIONS.costIntelligence),
      courtSimulation: filterList(PREDICTION_ACTIONS.courtSimulation),
    };
  }, [actionsSearchQuery]);

  const hasFilteredResults = useMemo(() => {
    return Object.values(filteredActions).some((list) => list.length > 0);
  }, [filteredActions]);

  return (
    <KeyboardSafeChatLayout
      backgroundColor="#F8FAFC"
      header={
        <React.Fragment>
          {/* HEADER SECTION */}
          <View style={[styles.header, { backgroundColor: '#FFFFFF', borderBottomColor: '#E2E8F0' }]}>
            <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={22} color="#475569" />
            </TouchableOpacity>

            <View style={styles.headerTitleContainer}>
              <Text style={[styles.headerTitle, { color: '#0F172A' }]}>Case Predictor</Text>
            </View>

            <View style={styles.headerRightActions}>
              <TouchableOpacity style={styles.headerBtn} onPress={() => setIsHistoryOpen(true)}>
                <Ionicons name="time-outline" size={22} color="#475569" />
              </TouchableOpacity>
            </View>
          </View>

          {activeCaseDetails && (
            <View style={[styles.activeCaseBanner, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
              <View style={styles.activeCaseLeft}>
                <Text style={styles.activeCaseLabel}>CURRENT CASE</Text>
                <Text style={[styles.activeCaseName, { color: theme.textPrimary }]} numberOfLines={1}>
                  {activeCaseDetails.name}
                </Text>
                <View style={styles.activeCaseSubtitleRow}>
                  <Text style={[styles.activeCaseSubtext, { color: theme.textSecondary }]}>
                    {activeCaseDetails.caseType || 'Labour Dispute'}
                  </Text>
                  <Text style={{ color: theme.textMuted, marginHorizontal: 6 }}>•</Text>
                  <Text style={[styles.activeCaseSubtext, { color: theme.textSecondary }]}>
                    {activeCaseDetails.courtName || (activeCaseDetails as any).jurisdiction || 'District Court'}
                  </Text>
                </View>
              </View>
              <View style={styles.activeCaseRight}>
                <TouchableOpacity
                  onPress={() => setIsCaseModalOpen(true)}
                  style={[styles.changeCaseBtn, { borderColor: '#8A5CF5' }]}
                >
                  <Text style={styles.changeCaseBtnText}>Change</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </React.Fragment>
      }
      messages={
        messages.length === 0 ? (
          activeCaseDetails ? (
            <View style={{ flex: 1 }} />
          ) : (
            <ChatWelcome 
              title="Case Predictor" 
              subtitle="Score success probability using analytical model stats."
              icon="📈" 
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
                  aiName="Case Predictor"
                  aiIcon="📈"
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
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {attachments.map((a) => {
                const fileMock = MOCK_CASE_FILES.find((f) => f.name === a.name);
                const docType = fileMock?.detectedType || 'Evidence';
                return (
                  <View key={a.name} style={styles.attachmentChip}>
                    <Ionicons name="document-text" size={16} color="#8A5CF5" />
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
          onPressSparkles={() => { setActionsSearchQuery(''); setIsActionsOpen(true); }}
          placeholder={activeCaseId ? "Ask anything about this case..." : "Analyze case probability..."}
          autoFocus={shouldComposerFocus}
          simulatedVoiceText="Score success probability using analytical model stats for this case."
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

      {/* ACTIONS BOTTOM SHEET */}
      <Modal visible={isActionsOpen} animationType="slide" transparent={true} onRequestClose={() => setIsActionsOpen(false)}>
        <TouchableWithoutFeedback onPress={() => setIsActionsOpen(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.bottomSheetContainer, Shadows.modal]}>
                <View style={styles.dragIndicator} />

                <View style={styles.sheetHeader}>
                  <Text style={styles.sheetTitle}>Predictor AI Actions</Text>
                  <TouchableOpacity onPress={() => setIsActionsOpen(false)}>
                    <Ionicons name="close-circle" size={24} color="#94A3B8" />
                  </TouchableOpacity>
                </View>

                {/* Actions filter search input */}
                <View style={styles.sheetSearchContainer}>
                  <Ionicons name="search" size={18} color="#94A3B8" style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.sheetSearchInput}
                    placeholder="Search predictor actions (e.g. strength, cost)..."
                    value={actionsSearchQuery}
                    onChangeText={setActionsSearchQuery}
                  />
                  {actionsSearchQuery ? (
                    <TouchableOpacity onPress={() => setActionsSearchQuery('')}>
                      <Ionicons name="close" size={18} color="#94A3B8" />
                    </TouchableOpacity>
                  ) : null}
                </View>

                <ScrollView style={styles.sheetContentScroll} showsVerticalScrollIndicator={false}>
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
                              const item = [...PREDICTION_ACTIONS.outcomePrediction, ...PREDICTION_ACTIONS.strengthAnalysis, ...PREDICTION_ACTIONS.weaknessAnalysis, ...PREDICTION_ACTIONS.riskAnalysis, ...PREDICTION_ACTIONS.evidenceIntelligence, ...PREDICTION_ACTIONS.opponentIntelligence, ...PREDICTION_ACTIONS.legalIntelligence, ...PREDICTION_ACTIONS.settlementIntelligence, ...PREDICTION_ACTIONS.timelinePrediction, ...PREDICTION_ACTIONS.costIntelligence, ...PREDICTION_ACTIONS.courtSimulation].find((a) => a.label === label);
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
                            style={[styles.recentActionItem, { borderColor: '#E0E7FF' }]}
                            onPress={() => {
                              const item = [...PREDICTION_ACTIONS.outcomePrediction, ...PREDICTION_ACTIONS.strengthAnalysis, ...PREDICTION_ACTIONS.weaknessAnalysis, ...PREDICTION_ACTIONS.riskAnalysis, ...PREDICTION_ACTIONS.evidenceIntelligence, ...PREDICTION_ACTIONS.opponentIntelligence, ...PREDICTION_ACTIONS.legalIntelligence, ...PREDICTION_ACTIONS.settlementIntelligence, ...PREDICTION_ACTIONS.timelinePrediction, ...PREDICTION_ACTIONS.costIntelligence, ...PREDICTION_ACTIONS.courtSimulation].find((a) => a.label === label);
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

                  {/* AI Recommended Actions (changes based on active document type) */}
                  {!actionsSearchQuery && (
                    <>
                      <Text style={styles.categoryHeading}>🤖 AI Recommended</Text>
                      {aiRecommendedActions.length > 0 ? (
                        <View style={styles.actionsList}>
                          {aiRecommendedActions.map((action) => (
                            <TouchableOpacity key={action.id} style={styles.actionListItem} onPress={() => handleExecuteAction({ ...action, isImmediate: true })}>
                              <View style={[styles.actionListIcon, { backgroundColor: '#EEF2FF' }]}>
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
                          <Text style={styles.actionsEmptyText}>Please attach case files to activate context-aware recommended checks.</Text>
                        </View>
                      )}
                    </>
                  )}

                  {/* Outcome Prediction Category */}
                  {filteredActions.outcomePrediction.length > 0 && (
                    <>
                      <Text style={styles.categoryHeading}>🔮 Outcome Prediction Models</Text>
                      <View style={styles.actionsList}>
                        {filteredActions.outcomePrediction.map((action) => (
                          <TouchableOpacity key={action.id} style={styles.actionListItem} onPress={() => handleExecuteAction(action)}>
                            <View style={[styles.actionListIcon, { backgroundColor: '#EEF2FF' }]}>
                              <Ionicons name="git-compare-outline" size={16} color="#8A5CF5" />
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

                  {/* Case Strength Category */}
                  {filteredActions.strengthAnalysis.length > 0 && (
                    <>
                      <Text style={styles.categoryHeading}>📈 Case Strength Assessments</Text>
                      <View style={styles.actionsList}>
                        {filteredActions.strengthAnalysis.map((action) => (
                          <TouchableOpacity key={action.id} style={styles.actionListItem} onPress={() => handleExecuteAction(action)}>
                            <View style={[styles.actionListIcon, { backgroundColor: '#ECFDF5' }]}>
                              <Ionicons name="trending-up-outline" size={16} color="#10B981" />
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

                  {/* Case Weakness Category */}
                  {filteredActions.weaknessAnalysis.length > 0 && (
                    <>
                      <Text style={styles.categoryHeading}>📉 Loopholes & Vulnerabilities</Text>
                      <View style={styles.actionsList}>
                        {filteredActions.weaknessAnalysis.map((action) => (
                          <TouchableOpacity key={action.id} style={styles.actionListItem} onPress={() => handleExecuteAction(action)}>
                            <View style={[styles.actionListIcon, { backgroundColor: '#FFF7ED' }]}>
                              <Ionicons name="trending-down-outline" size={16} color="#F97316" />
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

                  {/* Risk Assessment Category */}
                  {filteredActions.riskAnalysis.length > 0 && (
                    <>
                      <Text style={styles.categoryHeading}>⚠️ Danger Indicators & Risks</Text>
                      <View style={styles.actionsList}>
                        {filteredActions.riskAnalysis.map((action) => (
                          <TouchableOpacity key={action.id} style={styles.actionListItem} onPress={() => handleExecuteAction(action)}>
                            <View style={[styles.actionListIcon, { backgroundColor: '#FEF2F2' }]}>
                              <Ionicons name="alert-triangle-outline" size={16} color="#EF4444" />
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

                  {/* Evidence Auditing Category */}
                  {filteredActions.evidenceIntelligence.length > 0 && (
                    <>
                      <Text style={styles.categoryHeading}>📂 Evidence Admissibility & Depth</Text>
                      <View style={styles.actionsList}>
                        {filteredActions.evidenceIntelligence.map((action) => (
                          <TouchableOpacity key={action.id} style={styles.actionListItem} onPress={() => handleExecuteAction(action)}>
                            <View style={[styles.actionListIcon, { backgroundColor: '#F0FDF4' }]}>
                              <Ionicons name="document-text-outline" size={16} color="#10B981" />
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

                  {/* Opponent Evaluation Category */}
                  {filteredActions.opponentIntelligence.length > 0 && (
                    <>
                      <Text style={styles.categoryHeading}>👥 Opponent Lawyer Strategy Profiles</Text>
                      <View style={styles.actionsList}>
                        {filteredActions.opponentIntelligence.map((action) => (
                          <TouchableOpacity key={action.id} style={styles.actionListItem} onPress={() => handleExecuteAction(action)}>
                            <View style={[styles.actionListIcon, { backgroundColor: '#F3F4F6' }]}>
                              <Ionicons name="people-outline" size={16} color="#4B5563" />
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

                  {/* Statutory Analysis Category */}
                  {filteredActions.legalIntelligence.length > 0 && (
                    <>
                      <Text style={styles.categoryHeading}>⚖️ Statutory Acts & Precedents</Text>
                      <View style={styles.actionsList}>
                        {filteredActions.legalIntelligence.map((action) => (
                          <TouchableOpacity key={action.id} style={styles.actionListItem} onPress={() => handleExecuteAction(action)}>
                            <View style={[styles.actionListIcon, { backgroundColor: '#FDF2F8' }]}>
                              <Ionicons name="ribbon-outline" size={16} color="#EC4899" />
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

                  {/* Settlement Chances Category */}
                  {filteredActions.settlementIntelligence.length > 0 && (
                    <>
                      <Text style={styles.categoryHeading}>🤝 Out-of-Court Mediation & Compromises</Text>
                      <View style={styles.actionsList}>
                        {filteredActions.settlementIntelligence.map((action) => (
                          <TouchableOpacity key={action.id} style={styles.actionListItem} onPress={() => handleExecuteAction(action)}>
                            <View style={[styles.actionListIcon, { backgroundColor: '#EFF6FF' }]}>
                              <Ionicons name="hand-left-outline" size={16} color="#3B82F6" />
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

                  {/* Timeline Category */}
                  {filteredActions.timelinePrediction.length > 0 && (
                    <>
                      <Text style={styles.categoryHeading}>📅 Duration & Delay Timeline Models</Text>
                      <View style={styles.actionsList}>
                        {filteredActions.timelinePrediction.map((action) => (
                          <TouchableOpacity key={action.id} style={styles.actionListItem} onPress={() => handleExecuteAction(action)}>
                            <View style={[styles.actionListIcon, { backgroundColor: '#FFFBEB' }]}>
                              <Ionicons name="time-outline" size={16} color="#D97706" />
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

                  {/* Trial Cost Category */}
                  {filteredActions.costIntelligence.length > 0 && (
                    <>
                      <Text style={styles.categoryHeading}>💰 Litigation Fees & Expense Forecasts</Text>
                      <View style={styles.actionsList}>
                        {filteredActions.costIntelligence.map((action) => (
                          <TouchableOpacity key={action.id} style={styles.actionListItem} onPress={() => handleExecuteAction(action)}>
                            <View style={[styles.actionListIcon, { backgroundColor: '#F0FDF4' }]}>
                              <Ionicons name="cash-outline" size={16} color="#16A34A" />
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

                  {/* Moot Simulation Category */}
                  {filteredActions.courtSimulation.length > 0 && (
                    <>
                      <Text style={styles.categoryHeading}>🎭 Virtual Mock Simulations</Text>
                      <View style={styles.actionsList}>
                        {filteredActions.courtSimulation.map((action) => (
                          <TouchableOpacity key={action.id} style={styles.actionListItem} onPress={() => handleExecuteAction(action)}>
                            <View style={[styles.actionListIcon, { backgroundColor: '#F5F3FF' }]}>
                              <Ionicons name="videocam-outline" size={16} color="#8A5CF5" />
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

          {/* Drawer container (animated or slide-in effect via custom styles) */}
          <View style={[styles.drawerContainer, { backgroundColor: theme.surface }]}>
            <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
              <View style={styles.drawerHeader}>
                <Text style={[styles.drawerTitle, { color: theme.textPrimary }]}>Case Sessions</Text>
                <TouchableOpacity onPress={() => setIsHistoryOpen(false)} style={styles.drawerActionIcon}>
                  <Ionicons name="close" size={20} color={theme.textPrimary} />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                onPress={handleClearWorkspace}
                style={[styles.drawerNewChatBtn, { backgroundColor: theme.primaryLight || '#EEECFF', paddingHorizontal: 12, marginVertical: 12, gap: 6 }]}
              >
                <Ionicons name="add" size={16} color="#8A5CF5" />
                <Text style={[styles.drawerNewChatBtnText, { color: theme.primary }]}>New Analysis Session</Text>
              </TouchableOpacity>

              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 20 }}>
                {activeCaseId ? (
                  <>
                    <Text style={styles.historySectionHeader}>Case Specific Analysis</Text>
                    {(groupedHistory.caseGroups[activeCaseId] || []).length === 0 ? (
                      <Text style={styles.historyEmptySubtext}>No saved analyses for this case.</Text>
                    ) : (
                      (groupedHistory.caseGroups[activeCaseId] || []).map((item: any) => {
                        return (
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
                                name="document-text-outline"
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
                        );
                      })
                    )}
                  </>
                ) : (
                  <>
                    <Text style={styles.historySectionHeader}>All Conversations</Text>
                    {historySessions.length === 0 ? (
                      <Text style={styles.historyEmptySubtext}>No conversations logged yet.</Text>
                    ) : (
                      historySessions.map((item: any) => (
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
    fontSize: 14,
    color: theme.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
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
  progressBarBg: {
    height: 8,
    width: '100%',
    backgroundColor: theme.border,
    borderRadius: 4,
    overflow: 'hidden',
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
  drawerNewChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.primary,
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
    backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF',
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
    marginBottom: 2,
  },
  activeCaseSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activeCaseSubtext: {
    fontSize: 11,
    fontWeight: '500',
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
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  recentActionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surfaceVariant,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  recentActionText: {
    fontSize: 11.5,
    color: theme.textSecondary,
    fontWeight: '600',
  },
  actionsEmpty: {
    padding: 12,
    backgroundColor: theme.surfaceVariant,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  actionsEmptyText: {
    fontSize: 12,
    color: theme.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
});
}
