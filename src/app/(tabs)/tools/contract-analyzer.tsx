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
import { ChatMessageBubble, ChatComposer, ChatWelcome, KeyboardSafeChatLayout } from '@/components/ui/chat';
import { AttachmentBottomSheet } from '@/components/ui/bottomSheets/AttachmentBottomSheet';
import { CustomCameraModal } from '@/components/ui/legal/CustomCameraModal';
import { useAttachmentHandler } from '@/hooks/use-attachment-handler';
import { CaseSelectionModal } from '@/components/ui/legal/CaseSelectionModal';
import { CaseWorkspace } from '@/types';
import { CaseService } from '@/services/case.service';

const { width, height } = Dimensions.get('window');

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Mock Documents list for upload selector
const MOCK_FILES = [
  {
    id: 'emp',
    name: 'employment_agreement_draft.pdf',
    type: 'application/pdf',
    size: 1024 * 1024 * 1.2, // 1.2 MB
    detectedType: 'Employment Agreement',
    url: 'https://ailegal.com/contracts/employment_agreement_draft.pdf',
  },
  {
    id: 'nda',
    name: 'mutual_nda_final.docx',
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    size: 1024 * 450, // 450 KB
    detectedType: 'NDA',
    url: 'https://ailegal.com/contracts/mutual_nda_final.docx',
  },
  {
    id: 'lease',
    name: 'commercial_lease_deed.pdf',
    type: 'application/pdf',
    size: 1024 * 1024 * 2.1, // 2.1 MB
    detectedType: 'Lease Agreement',
    url: 'https://ailegal.com/contracts/commercial_lease_deed.pdf',
  },
  {
    id: 'vendor',
    name: 'saas_vendor_terms.txt',
    type: 'text/plain',
    size: 1024 * 180, // 180 KB
    detectedType: 'Vendor Agreement',
    url: 'https://ailegal.com/contracts/saas_vendor_terms.txt',
  },
];

// Helper functions for parsing Markdown styling and highlighting search terms
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

  // Split by bold syntax **text**
  const parts = text.split(/\*\*([\s\S]*?)\*\*/g);
  return parts.map((part, index) => {
    const isBold = index % 2 === 1;

    // Inline code blocks `code`
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
              backgroundColor: isUserText ? 'rgba(0, 0, 0, 0.15)' : 'rgba(32, 138, 239, 0.08)',
              color: isUserText ? '#FFFFFF' : '#208AEF',
              paddingHorizontal: 4,
              borderRadius: 4,
            }}
          >
            {renderWithSearchHighlight(subPart, searchQuery)}
          </Text>
        );
      }

      // Handle citations [1]
      const citationParts = subPart.split(/(\[\d+\])/g);
      return citationParts.map((citPart, citIdx) => {
        const isCit = citPart.match(/^\[\d+\]$/);
        if (isCit) {
          return (
            <Text
              key={`${index}-${subIdx}-${citIdx}`}
              style={{
                color: isUserText ? '#EEECFF' : '#208AEF',
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

    // Markdown headers
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

    // Normal paragraph line
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

// Response structured sections definitions
interface StructuredSection {
  title: string;
  content: string;
  type:
    | 'summary'
    | 'risk'
    | 'findings'
    | 'clauses_high'
    | 'clauses_medium'
    | 'clauses_low'
    | 'missing'
    | 'compliance'
    | 'improvements'
    | 'language'
    | 'recommendation'
    | 'normal';
}

const parseLegalResponse = (content: string): StructuredSection[] => {
  const lines = content.split('\n');
  const sections: StructuredSection[] = [];
  let currentTitle = '';
  let currentContent: string[] = [];

  const getSectionType = (title: string): StructuredSection['type'] => {
    const t = title.toLowerCase();
    if (t.includes('summary')) return 'summary';
    if (t.includes('risk score') || t.includes('score')) return 'risk';
    if (t.includes('key findings') || t.includes('findings')) return 'findings';
    if (t.includes('high risk')) return 'clauses_high';
    if (t.includes('medium risk')) return 'clauses_medium';
    if (t.includes('low risk')) return 'clauses_low';
    if (t.includes('missing')) return 'missing';
    if (t.includes('compliance')) return 'compliance';
    if (t.includes('improvement')) return 'improvements';
    if (t.includes('language')) return 'language';
    if (t.includes('recommendation')) return 'recommendation';
    return 'normal';
  };

  for (const line of lines) {
    const match = line.match(/^(#{1,3})\s+(.*)/);
    if (match) {
      if (currentContent.length > 0 || currentTitle) {
        sections.push({
          title: currentTitle || 'Overview',
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
      title: currentTitle || 'Overview',
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

const StructuredAnalysisView: React.FC<{ content: string; searchQuery: string; theme: any }> = ({
  content,
  searchQuery,
  theme,
}) => {
  const { isDark } = useThemeContext();
  const styles = React.useMemo(() => getStyles(theme, isDark), [theme, isDark]);
  const isStructured =
    content.includes('Executive Summary') ||
    content.includes('Risk Score') ||
    content.includes('High Risk Clauses');

  if (!isStructured) {
    return <CustomMarkdownText content={content} isUser={false} searchQuery={searchQuery} theme={theme} />;
  }

  const sections = parseLegalResponse(content);

  return (
    <View style={{ alignSelf: 'stretch', gap: 12 }}>
      {sections.map((sec, index) => {
        if (sec.type === 'risk') {
          const scoreText = sec.content;
          let riskColor = '#10B981'; // Green
          let levelText = 'Low Risk';
          let progressVal = 0.25;

          if (
            scoreText.toLowerCase().includes('high') ||
            scoreText.toLowerCase().includes('critical') ||
            scoreText.includes('75') ||
            scoreText.includes('80') ||
            scoreText.includes('90') ||
            scoreText.includes('8') ||
            scoreText.includes('9')
          ) {
            riskColor = '#EF4444'; // Red
            levelText = 'High Risk';
            progressVal = 0.85;
          } else if (
            scoreText.toLowerCase().includes('medium') ||
            scoreText.toLowerCase().includes('moderate') ||
            scoreText.includes('40') ||
            scoreText.includes('50') ||
            scoreText.includes('60')
          ) {
            riskColor = '#F59E0B'; // Amber
            levelText = 'Medium Risk';
            progressVal = 0.55;
          }

          return (
            <View key={index} style={[styles.legalCard, { borderLeftColor: riskColor }]}>
              <View style={styles.legalCardHeader}>
                <Ionicons name="alert-circle-outline" size={18} color={riskColor} />
                <Text style={[styles.legalCardTitle, { color: theme.textPrimary }]}>
                  {sec.title || 'Risk Assessment'}
                </Text>
              </View>
              <View style={{ marginTop: 8 }}>
                <Text style={{ fontSize: 13, color: theme.textSecondary, marginBottom: 6 }}>
                  {renderWithSearchHighlight(sec.content, searchQuery)}
                </Text>
                {/* Horizontal Progress bar */}
                <View style={{ height: 8, width: '100%', backgroundColor: '#E2E8F0', borderRadius: 4, overflow: 'hidden' }}>
                  <View style={{ height: '100%', width: `${progressVal * 100}%`, backgroundColor: riskColor, borderRadius: 4 }} />
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                  <Text style={{ fontSize: 11, color: theme.textMuted }}>Low</Text>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: riskColor }}>{levelText}</Text>
                  <Text style={{ fontSize: 11, color: theme.textMuted }}>High</Text>
                </View>
              </View>
            </View>
          );
        }

        let borderLeftColor = theme.border;
        let cardIcon = 'document-text-outline';
        let iconColor = theme.textSecondary;
        let cardBg = theme.surface;

        switch (sec.type) {
          case 'summary':
            borderLeftColor = '#3B82F6';
            cardIcon = 'information-circle-outline';
            iconColor = '#3B82F6';
            cardBg = '#F0F6FF';
            break;
          case 'clauses_high':
            borderLeftColor = '#EF4444';
            cardIcon = 'flame-outline';
            iconColor = '#EF4444';
            cardBg = '#FFF5F5';
            break;
          case 'clauses_medium':
            borderLeftColor = '#F59E0B';
            cardIcon = 'warning-outline';
            iconColor = '#F59E0B';
            cardBg = '#FFFBEB';
            break;
          case 'clauses_low':
            borderLeftColor = '#10B981';
            cardIcon = 'shield-outline';
            iconColor = '#10B981';
            cardBg = '#F0FDF4';
            break;
          case 'missing':
            borderLeftColor = '#64748B';
            cardIcon = 'help-circle-outline';
            iconColor = '#64748B';
            break;
          case 'compliance':
            borderLeftColor = '#8B5CF6';
            cardIcon = 'shield-checkmark-outline';
            iconColor = '#8B5CF6';
            cardBg = '#F5F3FF';
            break;
          case 'improvements':
          case 'language':
            borderLeftColor = '#14B8A6';
            cardIcon = 'create-outline';
            iconColor = '#14B8A6';
            break;
          case 'recommendation':
            borderLeftColor = '#3B82F6';
            cardIcon = 'checkmark-done-circle-outline';
            iconColor = '#3B82F6';
            cardBg = '#F0F6FF';
            break;
        }

        if (sec.type === 'normal') {
          return <CustomMarkdownText key={index} content={sec.content} isUser={false} searchQuery={searchQuery} theme={theme} />;
        }

        return (
          <View key={index} style={[styles.legalCard, { borderLeftColor, backgroundColor: cardBg }]}>
            <View style={styles.legalCardHeader}>
              <Ionicons name={cardIcon as any} size={18} color={iconColor} />
              <Text style={[styles.legalCardTitle, { color: theme.textPrimary }]}>{sec.title}</Text>
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

// ACTIONS DICTIONARY FOR BOTTOM SHEET
const ACTIONS_CATEGORIES = {
  contractReview: [
    { id: 'analyze_contract', label: 'Analyze Contract', desc: 'Full review and breakdown of terms', isImmediate: true },
    { id: 'emp_review', label: 'Employment Agreement Review', desc: 'Audit benefits, restrictions, IP rights', isImmediate: true },
    { id: 'lease_review', label: 'Lease Agreement Review', desc: 'Audit locks, escalations, deposits', isImmediate: true },
    { id: 'vendor_review', label: 'Vendor Agreement Review', desc: 'Audit deliverables, payments, SLAs', isImmediate: true },
    { id: 'nda_review', label: 'NDA Review', desc: 'Audit disclosure exemptions, durations', isImmediate: true },
    { id: 'service_review', label: 'Service Agreement Review', desc: 'Audit liability limits, termination clauses', isImmediate: true },
    { id: 'partner_review', label: 'Partnership Agreement Review', desc: 'Audit profit sharing, dissolution terms', isImmediate: true },
  ],
  riskAnalysis: [
    { id: 'risk_assessment', label: 'Risk Assessment', desc: 'Detailed score and severity breakdown', isImmediate: false, form: 'RISK' },
    { id: 'missing_clauses', label: 'Missing Clauses', desc: 'Find missing boilerplate or standard terms', isImmediate: true },
    { id: 'compliance_check', label: 'Compliance Check', desc: 'Audit statutory guidelines and rules', isImmediate: false, form: 'COMPLIANCE' },
    { id: 'liability_detection', label: 'Liability Detection', desc: 'Identify risk exposure and indemnities', isImmediate: true },
    { id: 'hidden_risks', label: 'Hidden Risks', desc: 'Uncover unfavorable phrasing or traps', isImmediate: true },
  ],
  aiIntelligence: [
    { id: 'explain_clause', label: 'Explain Clause', desc: 'Translate legalese to plain language', isImmediate: true },
    { id: 'simplify_contract', label: 'Simplify Contract', desc: 'Re-word contract into clear plain prose', isImmediate: true },
    { id: 'contract_summary', label: 'Contract Summary', desc: 'High-level executive quick brief', isImmediate: true },
    { id: 'suggest_improvements', label: 'Suggest Improvements', desc: 'Propose edits for better protection', isImmediate: true },
    { id: 'compare_contracts', label: 'Compare Contracts', desc: 'Side-by-side gap analysis of two files', isImmediate: false, form: 'COMPARE' },
    { id: 'red_flag', label: 'Red Flag Detection', desc: 'Highlight critical dealbreakers', isImmediate: true },
    { id: 'negotiation', label: 'Negotiation Suggestions', desc: 'Get points to demand in negotiation', isImmediate: true },
  ]
};

// Rich Mock Mappings for offline fallbacks
const MOCK_ANSWERS: Record<string, string> = {
  analyze_contract: `# Executive Summary
The document submitted is a standard **Contract Agreement** outlining primary responsibilities, pricing details, and legal limits.

# Risk Score: Medium Risk (55/100)
The contract establishes standard protocols but carries moderate risk due to ambiguous liability clauses.

# Key Findings
* Payment milestones are clearly stated.
* Termination conditions require mutual consent.
* Liability caps are not well-defined.

# High Risk Clauses
* **Clause 14 (Liability Limitation):** The liability limit of the service provider is capped at 3 times invoice value. This is high for the developer but creates unlimited exposure for the client.

# Medium Risk Clauses
* **Clause 6 (Scope Creep):** Any work out of scope is billed at standard rate but has no formal pre-approval timeline.

# Low Risk Clauses
* **Clause 10 (Confidentiality):** Standard reciprocal NDA terms valid for 3 years.

# Missing Clauses
* **Indemnification Cap:** Reciprocal indemnification caps are missing.
* **Governing Law:** No court jurisdiction specified.

# Compliance Issues
* Scope of services is ambiguous, possibly violating standard commercial transparency codes.

# Recommended Improvements
* Restrict the liability cap to invoice payments received.
* Specify governing court jurisdiction (e.g. Courts of Delhi).

# Suggested Legal Language
\`This Agreement shall be governed by and construed in accordance with the laws of India, and courts in Delhi shall have exclusive jurisdiction.\`

# Final Recommendation
Incorporate governing law clauses before execution.`,

  emp_review: `# Executive Summary
The document submitted is an **Employment Agreement** between *ABC Corp* and *Vikram Aditya*. It details roles, compensation, and restrictions.

# Risk Score: High Risk (75/100)
This agreement outlines normal terms but has severe asymmetric penalty sections and post-termination restrictions.

# Key Findings
* Notice periods are unequal (3 months for employee vs 15 days for company).
* Intellectual property assignment extends to work done prior to agreement.
* Restrictive non-compete is set for 24 months.

# High Risk Clauses
* **Clause 9 (Non-Compete):** Restricts working in another technology enterprise for 2 years in India. Unenforceable under Section 27 of Indian Contract Act.
* **Clause 12 (Intellectual Property Assignment):** Claims ownership of all prior inventions without exclusions.

# Medium Risk Clauses
* **Clause 7 (Notice Period):** Requires 90 days notice by employee or pay-in-lieu base salary.

# Low Risk Clauses
* **Clause 3 (Compensation Details):** Standard gratuity and EPF details conform to regulations.

# Missing Clauses
* **Prior Inventions Schedule:** Missing an appendix where employee lists prior proprietary IP.

# Compliance Issues
* Notice period asymmetry violates fair labor standards.
* Non-compete covenants violate Section 27 of the Indian Contract Act, 1872.

# Recommended Improvements
* Set notice periods symmetrically to 45 days.
* Exclude prior inventions list from IP assignment terms.

# Suggested Legal Language
\`The Employee retains rights to pre-existing inventions listed in Schedule A.\`

# Final Recommendation
Employee should negotiate changes to Clause 9 and 12 before signing.`,

  nda_review: `# Executive Summary
The document submitted is a **Mutual Non-Disclosure Agreement (NDA)** regarding a potential partnership deal.

# Risk Score: Low Risk (30/100)
The NDA is mostly standard and reciprocal, protecting both parties evenly.

# Key Findings
* Mutual covenants protect both parties' data.
* Standard definition of confidential materials.

# High Risk Clauses
* **None identified:** Mutual terms distribute risk fairly.

# Medium Risk Clauses
* **Clause 5 (Duration of Protection):** Confidentiality obligations last forever. Standard industry duration is 3 to 5 years.

# Low Risk Clauses
* **Clause 3 (Permitted Disclosure):** Allows disclosure to legal counsel and accountants.

# Missing Clauses
* **Return of Materials Notice:** No timeline for destruction of information on demand.

# Compliance Issues
* Infinite duration might be challenged in civil law courts as restraint of trade.

# Recommended Improvements
* Limit protection duration to 3 years from execution date.
* Add a 14-day timeline for return/destruction of data.

# Suggested Legal Language
\`All confidential information shall be returned or destroyed within 14 days of written request.\`

# Final Recommendation
Safe to execute after adjusting the duration of confidentiality to 3 years.`,

  lease_review: `# Executive Summary
The document submitted is a **Lease Agreement** for commercial office premises.

# Risk Score: High Risk (80/100)
High risk due to heavy escalation rates and lock-in covenants.

# Key Findings
* Annual rent escalation is set to 15%.
* Lock-in period is 36 months.

# High Risk Clauses
* **Clause 8 (Lock-in Period):** Lessee cannot terminate lease for 3 years. Violation requires payment of full rent for remainder of period.
* **Clause 10 (Escalation):** 15% compounding annual rent increase. Standard is 5-8%.

# Medium Risk Clauses
* **Clause 5 (Maintenance Cost):** Structural maintenance is the responsibility of the tenant.

# Low Risk Clauses
* **Clause 2 (Security Deposit):** Refundable deposit equivalent to 2 months rent.

# Missing Clauses
* **Force Majeure:** No suspension of rent in case of building damage or lockdowns.

# Compliance Issues
* Tenant maintenance clause violates standard commercial leasing norms.

# Recommended Improvements
* Reduce escalation to 7% per annum.
* Reduce lock-in period to 12 months.
* Insert a standard Force Majeure clause.

# Suggested Legal Language
\`In the event of Force Majeure rendering the premises unusable, rent obligations shall be suspended.\`

# Final Recommendation
Do not execute in its current form. Renegotiate escalation and lock-in.`,

  vendor_review: `# Executive Summary
The document submitted is a **Vendor Service Agreement** for software development services.

# Risk Score: High Risk (70/100)
Risk lies in unlimited indemnification exposure and unbalanced payment milestones.

# Key Findings
* Payment terms are net-60 days.
* Vendor provides unlimited indemnity for software bugs.

# High Risk Clauses
* **Clause 11 (Indemnity):** Developer indemnifies Client for any damages, without any liability cap.

# Medium Risk Clauses
* **Clause 4 (Payment Net-60):** Extended payment cycles create working capital stress.

# Low Risk Clauses
* **Clause 15 (Severability):** Standard legal separation clauses included.

# Missing Clauses
* **Acceptance Period Limit:** No timeline for client to accept or reject deliverables.

# Compliance Issues
* None detected.

# Recommended Improvements
* Caps indemnity at 100% of contract value.
* Reduce payment cycle to Net-30 days.

# Suggested Legal Language
\`Neither party's total liability under this contract shall exceed the fees paid in the past 12 months.\`

# Final Recommendation
Incorporate liability caps before signing.`,

  risk_assessment: `# Executive Summary
Full risk assessment of the contract dossier highlighting structural exposures.

# Risk Score: High Risk (78/100)
Overall risk posture is High, driven by unchecked indemnification and excessive restrictive covenants.

# Key Findings
* Significant liability is shifted onto the service provider.
* Standard arbitration and dispute terms are missing.

# High Risk Clauses
* **Indemnification Covenants:** Developer is fully liable for direct and consequential losses.
* **Scope Definition:** Scope is broad with no mechanism for amendment, creating risk of scope creep.

# Medium Risk Clauses
* **Notice Periods:** Short term termination (7 days) allowed for client.

# Missing Clauses
* **Governing Jurisdiction:** No geographical location stated for disputes.

# Recommended Improvements
* Implement a reciprocal indemnity clause.
* Limit termination rights to material breaches.

# Final Recommendation
Renegotiation of the liability limits is critical before proceeding.`
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

export default function ContractAnalyzerScreen() {
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
      const filtered = sessionList.filter((s: any) => s.activeTool === 'contractAnalyzer');
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

  // AI Actions Bottom Sheet
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<'CATEGORIES' | 'FORM_COMPLIANCE' | 'FORM_COMPARE' | 'FORM_RISK'>('CATEGORIES');
  
  // Recently used actions
  const [recentlyUsed, setRecentlyUsed] = useState<string[]>(['Analyze Contract', 'Risk Assessment', 'Clause Explanation']);

  // Dynamic Forms States
  const [formCompliance, setFormCompliance] = useState({
    jurisdiction: 'Delhi',
    country: 'India',
    applicableLaw: 'Labor and Employment Act',
    industry: 'Information Technology',
  });

  const [formRisk, setFormRisk] = useState({
    priority: 'Standard Review',
    jurisdiction: 'High Court of Delhi',
    industry: 'SaaS & Software',
  });

  const [secondAttachment, setSecondAttachment] = useState<ChatAttachment | null>(null);

  // Message collapsible state
  const [expandedMessages, setExpandedMessages] = useState<Record<string, boolean>>({});

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

  // Smart Contract Detection (based on attachments)
  const detectedDocType = useMemo(() => {
    if (attachments.length === 0) return '';
    const name = attachments[0].name.toLowerCase();
    if (name.includes('employment') || name.includes('offer')) return 'Employment Agreement';
    if (name.includes('nda') || name.includes('confidential') || name.includes('disclosure')) return 'NDA';
    if (name.includes('lease') || name.includes('rent')) return 'Lease Agreement';
    if (name.includes('vendor') || name.includes('supply') || name.includes('service')) return 'Vendor Agreement';
    return 'Contract Document';
  }, [attachments]);

  // AI Recommendations list based on detected document type
  const aiRecommendedActions = useMemo(() => {
    if (!detectedDocType) return [];
    if (detectedDocType === 'Employment Agreement') {
      return [
        { id: 'emp_review', label: 'Employment Review', desc: 'Audit benefits, non-competes, and IP clauses' },
        { id: 'risk_assessment', label: 'Risk Assessment', desc: 'Run severity analysis on employment hazards' },
        { id: 'compliance_check', label: 'Compliance Check', desc: 'Verify adherence to statutory labor laws' },
        { id: 'missing_clauses', label: 'Missing Clauses', desc: 'Find missing standard employee protection terms' },
      ];
    }
    if (detectedDocType === 'NDA') {
      return [
        { id: 'nda_review', label: 'NDA Audit', desc: 'Review definition, exceptions, and timelines' },
        { id: 'risk_assessment', label: 'Risk Assessment', desc: 'Find asymmetric risk in mutual disclosures' },
        { id: 'compliance_check', label: 'Compliance Check', desc: 'Audit enforcement parameters' },
      ];
    }
    if (detectedDocType === 'Lease Agreement') {
      return [
        { id: 'lease_review', label: 'Lease Escalation audit', desc: 'Audit lock-in and annual escalation hikes' },
        { id: 'risk_assessment', label: 'Risk Assessment', desc: 'Check tenant liabilities and deposit returns' },
      ];
    }
    if (detectedDocType === 'Vendor Agreement') {
      return [
        { id: 'vendor_review', label: 'Vendor Audit', desc: 'Analyze payment cycles and SLA breaches' },
        { id: 'risk_assessment', label: 'Risk Assessment', desc: 'Check default interest rates and caps' },
      ];
    }
    return [
      { id: 'analyze_contract', label: 'Analyze Contract', desc: 'Extract structural clauses and summaries' },
      { id: 'risk_assessment', label: 'Risk Assessment', desc: 'Verify liability limits and risk allocations' },
    ];
  }, [detectedDocType]);

  const scrollToBottom = (animated = true) => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated });
    }, 100);
  };

  const handleSend = async (overrideText?: string, selectedActionId?: string, editMessageId?: string) => {
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

    // Keep track of recently used action
    if (selectedActionId) {
      const actionItem =
        [
          ...ACTIONS_CATEGORIES.contractReview,
          ...ACTIONS_CATEGORIES.riskAnalysis,
          ...ACTIONS_CATEGORIES.aiIntelligence,
        ].find((a) => a.id === selectedActionId) ||
        aiRecommendedActions.find((a) => a.id === selectedActionId);

      if (actionItem) {
        setRecentlyUsed((prev) => {
          const filtered = prev.filter((a) => a !== actionItem.label);
          return [actionItem.label, ...filtered].slice(0, 3);
        });
      }
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    isCancelledRef.current = false;

    try {
      const currentSessionId = sessionId || `session_contract_${Date.now()}`;
      setSessionId(currentSessionId);

      const history = finalMessages
        .filter((m) => m.id !== aiMsgId)
        .map((m) => ({ role: m.role, content: m.content }));

      // Build structured payload
      let contentToSend = text;
      if (activeCaseDetails && history.length === 0) {
        contentToSend = `${getCaseMetadataSummary(activeCaseDetails)}\nUser Query: ${text}`;
      }

      const payload: Record<string, any> = {
        content: contentToSend,
        sessionId: currentSessionId,
        activeTool: 'contractAnalyzer',
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

      // Add a fallback option for offline mode or fallback rendering
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
        console.warn('[ContractAnalyzer] SSE stream error, using rich legal template fallback:', streamErr);
      }

      if (isCancelledRef.current || controller.signal.aborted) {
        setMessages((prev) =>
          prev.map((m) => (m.id === aiMsgId ? { ...m, isProcessing: false } : m))
        );
        setIsSending(false);
        return;
      }

      if (isFallbackNeeded) {
        // Find best matching fallback key
        let fallbackKey = 'analyze_contract';
        if (selectedActionId) {
          if (MOCK_ANSWERS[selectedActionId]) {
            fallbackKey = selectedActionId;
          } else if (selectedActionId.includes('review')) {
            if (detectedDocType === 'Employment Agreement') fallbackKey = 'emp_review';
            else if (detectedDocType === 'NDA') fallbackKey = 'nda_review';
            else if (detectedDocType === 'Lease Agreement') fallbackKey = 'lease_review';
            else if (detectedDocType === 'Vendor Agreement') fallbackKey = 'vendor_review';
          } else if (selectedActionId.includes('risk')) {
            fallbackKey = 'risk_assessment';
          }
        } else {
          // If no specific action, guess from type
          if (detectedDocType === 'Employment Agreement') fallbackKey = 'emp_review';
          else if (detectedDocType === 'NDA') fallbackKey = 'nda_review';
          else if (detectedDocType === 'Lease Agreement') fallbackKey = 'lease_review';
          else if (detectedDocType === 'Vendor Agreement') fallbackKey = 'vendor_review';
        }

        const fallbackResponse = MOCK_ANSWERS[fallbackKey] || MOCK_ANSWERS.analyze_contract;

        // Simulate streaming text chunks
        const chunks = fallbackResponse.split(' ');
        let currentChunkIndex = 0;
        let streamedText = '';

        const timer = setInterval(() => {
          if (isCancelledRef.current) {
            clearInterval(timer);
            streamTimerRef.current = null;
            return;
          }
          if (currentChunkIndex < chunks.length) {
            streamedText += (currentChunkIndex === 0 ? '' : ' ') + chunks[currentChunkIndex];
            setMessages((prev) =>
              prev.map((m) => (m.id === aiMsgId ? { ...m, content: streamedText } : m))
            );
            currentChunkIndex += 2; // Stream 2 words at a time for realism
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

        return; // Streaming is handled by timer
      }

      // Sync suggestions & citations from sessions details
      setMessages((prev) =>
        prev.map((m) => (m.id === aiMsgId ? { ...m, isProcessing: false } : m))
      );

      setTimeout(async () => {
        try {
          if (isCancelledRef.current || controller.signal.aborted) {
            return;
          }
          const detailsRes = await ChatService.getSessionDetails(currentSessionId);
          if (isCancelledRef.current || controller.signal.aborted) {
            return;
          }
          const detailSession = (detailsRes as any).data || detailsRes;
          if (detailSession?.messages) {
            setMessages(detailSession.messages);
          }
        } catch (e) {
          console.warn('[ContractAnalyzer] Post-stream sync failed:', e);
        }
      }, 1000);

    } catch (err) {
      if (isCancelledRef.current || controller.signal.aborted) {
        setMessages((prev) =>
          prev.map((m) => (m.id === aiMsgId ? { ...m, isProcessing: false } : m))
        );
      } else {
        console.error('[ContractAnalyzer] Error:', err);
        showToast('error', 'Analysis failed', 'Unable to complete AI contract audit.');
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiMsgId
              ? {
                  ...m,
                  content: '⚠️ Failed to synchronize analysis. Please verify server connection and try again.',
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



  // Action Buttons underneath responses
  const handleCopyText = (content: string) => {
    Clipboard.setString(content);
    showToast('success', 'Copied', 'Analysis text copied to clipboard.');
  };

  const handleExportPDF = (name: string) => {
    showToast('success', 'PDF Export Success', `${name} analysis exported as PDF.`);
  };

  const handleExportDOCX = (name: string) => {
    showToast('success', 'Word Export Success', `${name} analysis exported as DOCX.`);
  };

  const handleDownloadAnalysis = () => {
    showToast('success', 'Downloaded', 'Analysis downloaded to device local directory.');
  };

  const handleShareAnalysis = () => {
    showToast('info', 'Share Sheet', 'Native share modal activated.');
  };

  const handleSaveToCase = () => {
    showToast('success', 'Saved', 'Analysis saved and linked to case dossiers.');
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

  // Run sheet action
  const handleRunAction = (action: { id: string; label: string; isImmediate: boolean; form?: string }) => {
    if (action.isImmediate) {
      setIsActionsOpen(false);
      
      let promptText = `${action.label}: Analyze the contract for this specific request.`;
      if (attachments.length > 0) {
        promptText = `${action.label} check for "${attachments[0].name}". Highlight risks and suggest language.`;
      }
      
      handleSend(promptText, action.id);
    } else {
      // Open form
      if (action.form === 'COMPLIANCE') setSheetMode('FORM_COMPLIANCE');
      else if (action.form === 'RISK') setSheetMode('FORM_RISK');
      else if (action.form === 'COMPARE') {
        // Initialize mock Document B comparison if needed
        const secondMock = MOCK_FILES.find((f) => f.id !== (attachments[0]?.name?.toLowerCase().includes('employment') ? 'emp' : 'nda')) || MOCK_FILES[0];
        setSecondAttachment({
          name: secondMock.name.replace('_draft', '_amended').replace('_final', '_revised'),
          type: secondMock.type,
          size: secondMock.size,
          url: secondMock.url + '_v2',
        });
        setSheetMode('FORM_COMPARE');
      }
    }
  };

  // Execute compliance action
  const handleExecuteCompliance = () => {
    setIsActionsOpen(false);
    const text = `Run Compliance Check for Country: ${formCompliance.country}, Jurisdiction: ${formCompliance.jurisdiction}, Law: ${formCompliance.applicableLaw}, Sector: ${formCompliance.industry}. Validate contract adherence.`;
    handleSend(text, 'compliance_check');
  };

  // Execute risk analysis action
  const handleExecuteRisk = () => {
    setIsActionsOpen(false);
    const text = `Perform Risk Assessment with Priority: ${formRisk.priority}, Jurisdiction: ${formRisk.jurisdiction}, Sector: ${formRisk.industry}. List high, medium, and low risks.`;
    handleSend(text, 'risk_assessment');
  };

  // Execute comparison action
  const handleExecuteComparison = () => {
    if (!secondAttachment) return;
    setIsActionsOpen(false);
    const text = `Compare primary contract "${attachments[0]?.name || 'Contract A'}" with amended contract "${secondAttachment.name}". Outline gaps, deletions, and risk changes.`;
    
    // Add Contract B to attachments momentarily
    const prev = [...attachments];
    setAttachments([prev[0], secondAttachment]);
    handleSend(text, 'compare_contracts');
  };

  // Clear workspace
  const handleClearWorkspace = () => {
    setMessages([]);
    setSessionId(null);
    setAttachments([]);
    setSecondAttachment(null);
    showToast('info', 'Workspace Reset', 'All messages and files cleared.');
  };

  return (
    <KeyboardSafeChatLayout
      backgroundColor={theme.background}
      header={
        <React.Fragment>
          {/* HEADER SECTION */}
          <View style={[styles.header, { borderBottomColor: theme.border, backgroundColor: theme.surface }]}>
            <Pressable onPress={() => router.back()} style={styles.headerBtn}>
              <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
            </Pressable>

            <View style={styles.headerTitleContainer}>
              <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Contract Analyzer</Text>
            </View>

            <View style={styles.headerRightActions}>
              <Pressable onPress={() => setIsHistoryOpen(true)} style={styles.headerBtn}>
                <Ionicons name="time-outline" size={22} color={theme.textPrimary} />
              </Pressable>
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
              title="Contract Analyzer" 
              subtitle="Parse clauses, flag high-risk terms, and check discrepancies."
              icon="📑" 
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
                  aiName="Contract Analyzer"
                  aiIcon="📑"
                  onCopy={() => {
                    Clipboard.setString(item.content);
                    showToast('success', 'Copied', 'Analysis copied to clipboard.');
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
            <View style={styles.attachmentsRow}>
              <View style={styles.attachmentChip}>
                <Ionicons name="document-text" size={16} color="#3B82F6" />
                <View style={{ flex: 1, marginHorizontal: 6 }}>
                  <Text style={styles.attachmentName} numberOfLines={1}>
                    {attachments[0].name}
                  </Text>
                  {detectedDocType ? (
                    <View style={styles.detectedBadge}>
                      <Text style={styles.detectedBadgeText}>{detectedDocType}</Text>
                    </View>
                  ) : null}
                </View>
                <TouchableOpacity onPress={showAttachmentOptions} style={styles.replaceBtn}>
                  <Text style={styles.replaceBtnText}>Replace</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => clearAttachments()}>
                  <Ionicons name="close-circle" size={18} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </View>
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
          onPressSparkles={() => { setSheetMode('CATEGORIES'); setIsActionsOpen(true); }}
          placeholder={activeCaseId ? "Ask anything about this case..." : "Analyze this contract..."}
          autoFocus={shouldComposerFocus}
          simulatedVoiceText="Analyze liability clause and high-risk terms in this lease agreement."
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

      {/* CONTRACT ACTIONS BOTTOM SHEET */}
      <Modal visible={isActionsOpen} animationType="slide" transparent={true} onRequestClose={() => setIsActionsOpen(false)}>
        <TouchableWithoutFeedback onPress={() => setIsActionsOpen(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.bottomSheetContainer, Shadows.modal]}>
                <View style={styles.bottomSheetDragHandle} />

                <View style={styles.bottomSheetHeader}>
                  <Text style={styles.bottomSheetTitle}>
                    {sheetMode === 'CATEGORIES' && 'Contract AI Options'}
                    {sheetMode === 'FORM_COMPLIANCE' && 'Compliance Validator Settings'}
                    {sheetMode === 'FORM_RISK' && 'Risk Assessment Parameters'}
                    {sheetMode === 'FORM_COMPARE' && 'Contract Comparison'}
                  </Text>
                  <TouchableOpacity onPress={() => setIsActionsOpen(false)}>
                    <Ionicons name="close-circle" size={24} color="#94A3B8" />
                  </TouchableOpacity>
                </View>

                {/* CATEGORIES MODE */}
                {sheetMode === 'CATEGORIES' && (
                  <ScrollView style={styles.bottomSheetContent} showsVerticalScrollIndicator={false}>
                    {/* Recently Used */}
                    <Text style={styles.categoryHeading}>Recently Used Actions</Text>
                    <View style={styles.actionsGrid}>
                      {recentlyUsed.map((actName, i) => (
                        <TouchableOpacity
                          key={i}
                          style={styles.recentActionItem}
                          onPress={() => {
                            const actId = actName.toLowerCase().replace(/ /g, '_');
                            handleRunAction({ id: actId, label: actName, isImmediate: true });
                          }}
                        >
                          <Ionicons name="time-outline" size={16} color="#475569" style={{ marginRight: 6 }} />
                          <Text style={styles.recentActionText}>{actName}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* AI Recommended (Depends on file upload) */}
                    <Text style={styles.categoryHeading}>Recommended for attached file</Text>
                    {aiRecommendedActions.length > 0 ? (
                      <View style={styles.actionsList}>
                        {aiRecommendedActions.map((action) => (
                          <TouchableOpacity key={action.id} style={styles.actionListItem} onPress={() => handleRunAction({ id: action.id, label: action.label, isImmediate: true })}>
                            <View style={styles.actionListIcon}>
                              <Ionicons name="sparkles" size={16} color="#3B82F6" />
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
                        <Text style={styles.actionsEmptyText}>Please attach a contract file to activate smart recommended analysis options.</Text>
                      </View>
                    )}

                    {/* Category 1: Contract Review */}
                    <Text style={styles.categoryHeading}>Contract Reviews</Text>
                    <View style={styles.actionsList}>
                      {ACTIONS_CATEGORIES.contractReview.map((action) => (
                        <TouchableOpacity key={action.id} style={styles.actionListItem} onPress={() => handleRunAction(action)}>
                          <View style={[styles.actionListIcon, { backgroundColor: '#EFF6FF' }]}>
                            <Ionicons name="document-text-outline" size={16} color="#3B82F6" />
                          </View>
                          <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={styles.actionListTitle}>{action.label}</Text>
                            <Text style={styles.actionListDesc}>{action.desc}</Text>
                          </View>
                          <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* Category 2: Risk Analysis */}
                    <Text style={styles.categoryHeading}>Risk Analysis</Text>
                    <View style={styles.actionsList}>
                      {ACTIONS_CATEGORIES.riskAnalysis.map((action) => (
                        <TouchableOpacity key={action.id} style={styles.actionListItem} onPress={() => handleRunAction(action)}>
                          <View style={[styles.actionListIcon, { backgroundColor: '#FEF2F2' }]}>
                            <Ionicons name="flame-outline" size={16} color="#EF4444" />
                          </View>
                          <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={styles.actionListTitle}>{action.label}</Text>
                            <Text style={styles.actionListDesc}>{action.desc}</Text>
                          </View>
                          <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* Category 3: AI Intelligence */}
                    <Text style={styles.categoryHeading}>AI Intelligence Actions</Text>
                    <View style={styles.actionsList}>
                      {ACTIONS_CATEGORIES.aiIntelligence.map((action) => (
                        <TouchableOpacity key={action.id} style={styles.actionListItem} onPress={() => handleRunAction(action)}>
                          <View style={[styles.actionListIcon, { backgroundColor: '#F5F3FF' }]}>
                            <Ionicons name="bulb-outline" size={16} color="#8B5CF6" />
                          </View>
                          <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={styles.actionListTitle}>{action.label}</Text>
                            <Text style={styles.actionListDesc}>{action.desc}</Text>
                          </View>
                          <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
                        </TouchableOpacity>
                      ))}
                    </View>
                    
                    <View style={{ height: 40 }} />
                  </ScrollView>
                )}

                {/* FORM COMPLIANCE MODE */}
                {sheetMode === 'FORM_COMPLIANCE' && (
                  <View style={styles.formView}>
                    <Text style={styles.formDescription}>Provide specific target guidelines to run compliance validations.</Text>
                    
                    <View style={styles.formGroup}>
                      <Text style={styles.formLabel}>Target Country</Text>
                      <TextInput
                        style={styles.formInput}
                        value={formCompliance.country}
                        onChangeText={(t) => setFormCompliance((prev) => ({ ...prev, country: t }))}
                      />
                    </View>

                    <View style={styles.formGroup}>
                      <Text style={styles.formLabel}>State / Jurisdiction</Text>
                      <TextInput
                        style={styles.formInput}
                        value={formCompliance.jurisdiction}
                        onChangeText={(t) => setFormCompliance((prev) => ({ ...prev, jurisdiction: t }))}
                      />
                    </View>

                    <View style={styles.formGroup}>
                      <Text style={styles.formLabel}>Applicable Statutory Law</Text>
                      <TextInput
                        style={styles.formInput}
                        value={formCompliance.applicableLaw}
                        onChangeText={(t) => setFormCompliance((prev) => ({ ...prev, applicableLaw: t }))}
                      />
                    </View>

                    <View style={styles.formGroup}>
                      <Text style={styles.formLabel}>Industry Sector</Text>
                      <TextInput
                        style={styles.formInput}
                        value={formCompliance.industry}
                        onChangeText={(t) => setFormCompliance((prev) => ({ ...prev, industry: t }))}
                      />
                    </View>

                    <View style={styles.formActions}>
                      <TouchableOpacity style={styles.formBackBtn} onPress={() => setSheetMode('CATEGORIES')}>
                        <Text style={styles.formBackBtnText}>Back</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.formRunBtn} onPress={handleExecuteCompliance}>
                        <Text style={styles.formRunBtnText}>Run Compliance Audit</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* FORM RISK MODE */}
                {sheetMode === 'FORM_RISK' && (
                  <View style={styles.formView}>
                    <Text style={styles.formDescription}>Configure audit settings for contract risk scanning.</Text>
                    
                    <View style={styles.formGroup}>
                      <Text style={styles.formLabel}>Priority Level</Text>
                      <View style={styles.prioritySelector}>
                        {['Quick Scan', 'Standard Review', 'Critical Audit'].map((p) => {
                          const active = formRisk.priority === p;
                          return (
                            <TouchableOpacity
                              key={p}
                              style={[styles.priorityTab, active && styles.priorityTabActive]}
                              onPress={() => setFormRisk((prev) => ({ ...prev, priority: p }))}
                            >
                              <Text style={[styles.priorityTabText, active && styles.priorityTabActiveText]}>{p}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>

                    <View style={styles.formGroup}>
                      <Text style={styles.formLabel}>Jurisdiction</Text>
                      <TextInput
                        style={styles.formInput}
                        value={formRisk.jurisdiction}
                        onChangeText={(t) => setFormRisk((prev) => ({ ...prev, jurisdiction: t }))}
                      />
                    </View>

                    <View style={styles.formGroup}>
                      <Text style={styles.formLabel}>Industry Focus</Text>
                      <TextInput
                        style={styles.formInput}
                        value={formRisk.industry}
                        onChangeText={(t) => setFormRisk((prev) => ({ ...prev, industry: t }))}
                      />
                    </View>

                    <View style={styles.formActions}>
                      <TouchableOpacity style={styles.formBackBtn} onPress={() => setSheetMode('CATEGORIES')}>
                        <Text style={styles.formBackBtnText}>Back</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.formRunBtn, { backgroundColor: '#EF4444' }]} onPress={handleExecuteRisk}>
                        <Text style={styles.formRunBtnText}>Run Risk Scan</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* FORM COMPARE MODE */}
                {sheetMode === 'FORM_COMPARE' && (
                  <View style={styles.formView}>
                    <Text style={styles.formDescription}>Compare base agreement with secondary amended draft.</Text>
                    
                    <View style={styles.compareDocSlot}>
                      <Text style={styles.compareSlotLabel}>Primary Agreement (Base)</Text>
                      <View style={styles.compareSlotCard}>
                        <Ionicons name="document-text" size={20} color="#3B82F6" />
                        <Text style={styles.compareSlotName} numberOfLines={1}>
                          {attachments[0]?.name || 'No document uploaded yet'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.compareDocSlot}>
                      <Text style={styles.compareSlotLabel}>Secondary Agreement (Revision)</Text>
                      {secondAttachment ? (
                        <View style={styles.compareSlotCard}>
                          <Ionicons name="document-text" size={20} color="#8B5CF6" />
                          <Text style={styles.compareSlotName} numberOfLines={1}>
                            {secondAttachment.name}
                          </Text>
                          <TouchableOpacity
                            onPress={() => {
                              const other = MOCK_FILES.find((f) => f.name !== secondAttachment.name && f.name !== attachments[0]?.name) || MOCK_FILES[0];
                              setSecondAttachment({
                                name: other.name,
                                type: other.type,
                                size: other.size,
                                url: other.url,
                              });
                            }}
                          >
                            <Text style={{ fontSize: 12, color: '#3B82F6', marginLeft: 8 }}>Change</Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <TouchableOpacity style={[styles.compareSlotCard, { borderStyle: 'dashed' }]}>
                          <Text style={{ color: '#94A3B8' }}>Select revised file mock</Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    <View style={styles.formActions}>
                      <TouchableOpacity style={styles.formBackBtn} onPress={() => setSheetMode('CATEGORIES')}>
                        <Text style={styles.formBackBtnText}>Back</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.formRunBtn, (!attachments[0] || !secondAttachment) && { opacity: 0.5 }]}
                        onPress={handleExecuteComparison}
                        disabled={!attachments[0] || !secondAttachment}
                      >
                        <Text style={styles.formRunBtnText}>Compare Agreements</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
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
    backgroundColor: '#EFF6FF',
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
    backgroundColor: '#EFF6FF',
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
    color: '#3B82F6',
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
    color: '#3B82F6',
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
    color: '#3B82F6',
    fontWeight: '600',
  },
  legalCard: {
    borderLeftWidth: 4,
    borderRadius: 8,
    padding: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginVertical: 4,
    alignSelf: 'stretch',
  },
  legalCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legalCardTitle: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  attachmentsBar: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
  },
  attachmentsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  attachmentChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  attachmentName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E40AF',
  },
  detectedBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#DBEAFE',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginTop: 2,
  },
  detectedBadgeText: {
    fontSize: 9.5,
    color: '#1E40AF',
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  replaceBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 8,
  },
  replaceBtnText: {
    fontSize: 11,
    color: '#3B82F6',
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
    backgroundColor: '#3B82F6',
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
    backgroundColor: theme.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  bottomSheetDragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.border,
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
    borderBottomColor: theme.border,
    marginBottom: 12,
  },
  bottomSheetTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.textPrimary,
  },
  bottomSheetContent: {
    flex: 1,
  },
  categoryHeading: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.textSecondary,
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
    backgroundColor: theme.surfaceVariant,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  recentActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.textSecondary,
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
    borderColor: theme.border,
    backgroundColor: theme.card,
    marginBottom: 8,
  },
  actionListIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionListTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: theme.textPrimary,
  },
  actionListDesc: {
    fontSize: 10.5,
    color: theme.textSecondary,
    marginTop: 1,
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
  formView: {
    flex: 1,
    gap: 12,
    marginTop: 4,
  },
  formDescription: {
    fontSize: 13.5,
    color: theme.textSecondary,
    lineHeight: 18,
    marginBottom: 6,
  },
  formGroup: {
    gap: 4,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.textPrimary,
  },
  formInput: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: theme.textPrimary,
    backgroundColor: theme.surfaceVariant,
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 16,
  },
  formBackBtn: {
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: theme.background,
  },
  formBackBtnText: {
    fontSize: 13.5,
    color: theme.textSecondary,
    fontWeight: '700',
  },
  formRunBtn: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
  },
  formRunBtnText: {
    fontSize: 13.5,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  prioritySelector: {
    flexDirection: 'row',
    gap: 6,
  },
  priorityTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
    backgroundColor: theme.surfaceVariant,
  },
  priorityTabActive: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
  priorityTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.textSecondary,
  },
  priorityTabActiveText: {
    color: '#FFFFFF',
  },
  compareDocSlot: {
    gap: 4,
  },
  compareSlotLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: theme.textPrimary,
  },
  compareSlotCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surfaceVariant,
    borderRadius: 8,
    padding: 10,
  },
  compareSlotName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: theme.textPrimary,
    marginLeft: 8,
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
    backgroundColor: isDark ? 'rgba(123, 97, 255, 0.15)' : '#EEECFF',
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
    color: '#8a5cf5',
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
    color: '#8A5CF5',
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
