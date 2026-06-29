/**
 * AI Legal Mobile - Chat UI Components
 * Interactive chat bubble systems, streaming state handlers, and LLM query action buttons.
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  ViewStyle, 
  ActivityIndicator, 
  Platform, 
  Animated,
  Modal,
  TouchableWithoutFeedback,
  Share,
  Clipboard,
  Dimensions,
  Pressable,
  Linking,
  Alert,
  TextInput,
  Image
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as IntentLauncher from 'expo-intent-launcher';
import { useThemeContext, useToastContext } from '@/providers';
import { useTranslation } from '@/localization';
import { Spacing, Radius, Shadows } from '@/theme';
import { ChatMessage, ChatAttachment, ChatMessageSource } from '@/types';
import { formatFileSize } from '@/utils';
import { Badge } from '../badges';
import { Button } from '../buttons';
// @ts-ignore
// eslint-disable-next-line import/no-unresolved
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

interface MarkdownTextProps {
  content: string;
  isUser: boolean;
}

/**
 * Custom lightweight Markdown parser for high-performance React Native rendering.
 */
export const MarkdownText: React.FC<MarkdownTextProps> = ({ content, isUser }) => {
  const { theme, isDark } = useThemeContext();
  
  if (!content) return null;

  // Split by lines to process block structures
  const lines = content.split('\n');
  const renderedElements: React.ReactNode[] = [];

  let inCodeBlock = false;
  let codeBlockContent: string[] = [];
  let currentTableRows: string[][] = [];

  const parseInlineStyles = (text: string, isUserText: boolean) => {
    // Splits by bold syntax **text**
    const boldParts = text.split(/\*\*([\s\S]*?)\*\*/g);
    return boldParts.map((boldPart, bIdx) => {
      const isBold = bIdx % 2 === 1;
      
      // Split by * or _ for italics
      const italicParts = boldPart.split(/\*([\s\S]*?)\*/g);
      
      const bStyle = isBold ? { fontWeight: '700' as const } : {};
      
      return italicParts.map((italicPart, itIdx) => {
        const isItalic = itIdx % 2 === 1;
        const itStyle = isItalic ? { fontStyle: 'italic' as const } : {};
        
        // Inline code blocks `code`
        const codeParts = italicPart.split(/`([^`]+)`/g);
        
        return codeParts.map((codePart, cIdx) => {
          const isInlineCode = cIdx % 2 === 1;
          if (isInlineCode) {
            return (
              <Text
                key={`${bIdx}-${itIdx}-${cIdx}`}
                style={{
                  fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
                  fontSize: 13,
                  backgroundColor: isUserText 
                    ? (isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.06)') 
                    : (isDark ? 'rgba(123, 97, 255, 0.15)' : 'rgba(109, 93, 252, 0.08)'),
                  color: isUserText ? theme.textPrimary : (isDark ? theme.primary : '#6D5DFC'),
                  paddingHorizontal: 4,
                  borderRadius: 4,
                  ...bStyle,
                  ...itStyle,
                }}
              >
                {codePart}
              </Text>
            );
          }
          
          // Highlights ==text==
          const highlightParts = codePart.split(/==([\s\S]*?)==/g);
          return highlightParts.map((hlPart, hlIdx) => {
            const isHighlight = hlIdx % 2 === 1;
            
            // Handle citation links like [1] or [2]
            const citationParts = hlPart.split(/(\[\d+\])/g);
            return citationParts.map((citPart, citIdx) => {
              const isCit = citPart.match(/^\[\d+\]$/);
              if (isCit) {
                return (
                  <Text
                    key={`${bIdx}-${itIdx}-${cIdx}-${hlIdx}-${citIdx}`}
                    style={{
                      color: '#6D5DFC',
                      fontWeight: '700',
                      textDecorationLine: 'underline',
                      fontSize: 13,
                      ...bStyle,
                      ...itStyle,
                    }}
                  >
                    {citPart}
                  </Text>
                );
              }
              
              if (isHighlight) {
                return (
                  <Text
                    key={`${bIdx}-${itIdx}-${cIdx}-${hlIdx}-${citIdx}`}
                    style={{
                      backgroundColor: isDark ? 'rgba(254, 240, 138, 0.2)' : '#FEF08A', // Soft yellow highlight
                      color: isDark ? '#FDE047' : '#1F2937',
                      borderRadius: 2,
                      paddingHorizontal: 2,
                      fontWeight: '600',
                      ...bStyle,
                      ...itStyle,
                    }}
                  >
                    {citPart}
                  </Text>
                );
              }
              
              if (isBold || isItalic) {
                return (
                  <Text
                    key={`${bIdx}-${itIdx}-${cIdx}-${hlIdx}-${citIdx}`}
                    style={{ ...bStyle, ...itStyle }}
                  >
                    {citPart}
                  </Text>
                );
              }
              return citPart;
            });
          });
        });
      });
    });
  };

  const flushTable = (tableIndex: number) => {
    if (currentTableRows.length === 0) return null;
    const colCount = Math.max(...currentTableRows.map((r) => r.length));
    
    const element = (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        key={`table-${tableIndex}`}
        style={{
          marginVertical: 12,
          alignSelf: 'stretch',
        }}
        contentContainerStyle={{
          minWidth: '100%',
        }}
      >
        <View
          style={{
            borderWidth: 1,
            borderColor: theme.border,
            borderRadius: 8,
            overflow: 'hidden',
            backgroundColor: theme.card,
          }}
        >
          {currentTableRows.map((row, rIdx) => {
            const isHeader = rIdx === 0;
            return (
              <View
                key={rIdx}
                style={{
                  flexDirection: 'row',
                  borderBottomWidth: rIdx === currentTableRows.length - 1 ? 0 : 1,
                  borderBottomColor: theme.border,
                  backgroundColor: isHeader 
                    ? (isDark ? 'rgba(123, 97, 255, 0.15)' : '#EEECFF') 
                    : rIdx % 2 === 1 
                      ? (isDark ? 'rgba(255, 255, 255, 0.02)' : '#F9FAFB') 
                      : theme.card,
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  alignItems: 'center',
                }}
              >
                {Array.from({ length: colCount }).map((_, cIdx) => {
                  const cellVal = row[cIdx] || '';
                  return (
                    <View key={cIdx} style={{ paddingHorizontal: 6, minWidth: 120 }}>
                      <Text
                        style={{
                          fontSize: 13.5,
                          fontWeight: isHeader ? '700' : '400',
                          color: isHeader ? theme.textPrimary : theme.textSecondary,
                          lineHeight: 18,
                        }}
                      >
                        {cellVal.trim()}
                      </Text>
                    </View>
                  );
                })}
              </View>
            );
          })}
        </View>
      </ScrollView>
    );
    currentTableRows = [];
    return element;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // 1. Code Block starts/ends
    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        // End code block
        const codeText = codeBlockContent.join('\n');
        renderedElements.push(
          <View
            key={`code-${i}`}
            style={{
              backgroundColor: isUser 
                ? (isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0,0,0,0.04)') 
                : theme.surfaceVariant,
              borderWidth: 1,
              borderColor: theme.border,
              padding: 12,
              borderRadius: 8,
              marginVertical: 10,
              alignSelf: 'stretch',
            }}
          >
            <Text
              style={{
                fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
                fontSize: 13,
                lineHeight: 18,
                color: theme.textPrimary,
              }}
            >
              {codeText}
            </Text>
          </View>
        );
        codeBlockContent = [];
        inCodeBlock = false;
      } else {
        // Start code block
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockContent.push(line);
      continue;
    }

    // 2. Table parsing (starts with |)
    if (trimmed.startsWith('|')) {
      const cells = trimmed.split('|').map(c => c.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
      // Skip separator line e.g., |---|---|
      const isSeparator = cells.every(c => c.match(/^-+$/));
      if (!isSeparator) {
        currentTableRows.push(cells);
      }
      continue;
    } else if (currentTableRows.length > 0) {
      const tableElem = flushTable(i);
      if (tableElem) renderedElements.push(tableElem);
    }

    // 3. Blockquotes and Callouts
    if (trimmed.startsWith('>')) {
      const quoteContent = trimmed.replace(/^>\s*/, '');
      const calloutMatch = quoteContent.match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/i);
      if (calloutMatch) {
        const type = calloutMatch[1].toUpperCase();
        const bodyText = quoteContent.replace(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*/i, '');
        let bgColor = isDark ? 'rgba(255, 255, 255, 0.05)' : '#F3F4F6';
        let borderColor = isDark ? '#4B5563' : '#9CA3AF';
        let titleColor = isDark ? '#E5E7EB' : '#4B5563';
        let icon = 'ℹ️';
        if (type === 'WARNING' || type === 'CAUTION') {
          bgColor = isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2';
          borderColor = '#EF4444';
          titleColor = isDark ? '#FCA5A5' : '#991B1B';
          icon = '⚠️';
        } else if (type === 'IMPORTANT') {
          bgColor = isDark ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF';
          borderColor = '#3B82F6';
          titleColor = isDark ? '#93C5FD' : '#1E40AF';
          icon = '💡';
        } else if (type === 'TIP') {
          bgColor = isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5';
          borderColor = '#10B981';
          titleColor = isDark ? '#6EE7B7' : '#065F46';
          icon = '✨';
        }
        renderedElements.push(
          <View key={i} style={{
            backgroundColor: bgColor,
            borderLeftWidth: 4,
            borderLeftColor: borderColor,
            padding: 12,
            borderRadius: 6,
            marginVertical: 10,
            alignSelf: 'stretch',
          }}>
            <Text style={{ fontWeight: '800', color: titleColor, fontSize: 13, marginBottom: 4 }}>
              {icon} {type}
            </Text>
            <Text style={{ fontSize: 14.5, lineHeight: 22, color: theme.textPrimary }}>
              {parseInlineStyles(bodyText, isUser)}
            </Text>
          </View>
        );
      } else {
        renderedElements.push(
          <View key={i} style={{
            borderLeftWidth: 4,
            borderLeftColor: theme.primary,
            paddingLeft: 12,
            paddingVertical: 4,
            marginVertical: 10,
            alignSelf: 'stretch',
          }}>
            <Text style={{ fontSize: 15, lineHeight: 24, fontStyle: 'italic', color: theme.textSecondary }}>
              {parseInlineStyles(quoteContent, isUser)}
            </Text>
          </View>
        );
      }
      continue;
    }

    // 4. Horizontal dividers
    if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
      renderedElements.push(
        <View
          key={i}
          style={{
            height: 1,
            backgroundColor: theme.border,
            marginVertical: 18,
            alignSelf: 'stretch',
          }}
        />
      );
      continue;
    }

    // 5. Bullet list items
    if (trimmed.startsWith('* ') || trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
      const bulletContent = trimmed.slice(2);
      renderedElements.push(
        <View key={i} style={{ flexDirection: 'row', paddingLeft: 8, marginVertical: 6, alignItems: 'flex-start' }}>
          <Text style={{ fontSize: 16, color: theme.primary, marginRight: 8, lineHeight: isUser ? 25 : 27.2 }}>•</Text>
          <Text style={{ flex: 1, fontSize: isUser ? 14.5 : 16, lineHeight: isUser ? 22 : 27.2, color: theme.textPrimary }}>
            {parseInlineStyles(bulletContent, isUser)}
          </Text>
        </View>
      );
      continue;
    }

    // 6. Numbered list items
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (numMatch) {
      const num = numMatch[1];
      const listContent = numMatch[2];
      renderedElements.push(
        <View key={i} style={{ flexDirection: 'row', paddingLeft: 8, marginVertical: 6, alignItems: 'flex-start' }}>
          <Text style={{ fontSize: isUser ? 14.5 : 16, color: theme.primary, marginRight: 6, fontWeight: '700', lineHeight: isUser ? 22 : 27.2 }}>
            {num}.
          </Text>
          <Text style={{ flex: 1, fontSize: isUser ? 14.5 : 16, lineHeight: isUser ? 22 : 27.2, color: theme.textPrimary }}>
            {parseInlineStyles(listContent, isUser)}
          </Text>
        </View>
      );
      continue;
    }

    // 7. Header tags (e.g. # Header, ## Subheader)
    const headerMatch = trimmed.match(/^(#{1,6})\s+(.*)/);
    if (headerMatch) {
      const level = headerMatch[1].length;
      const headerText = headerMatch[2];
      const fontSize = level === 1 ? 32 : level === 2 ? 24 : level === 3 ? 20 : 14.5;
      const marginTop = level === 1 ? 24 : level === 2 ? 24 : level === 3 ? 20 : 12;
      const marginBottom = level === 1 ? 16 : level === 2 ? 12 : level === 3 ? 10 : 6;
      const lineHeight = level === 1 ? 38 : level === 2 ? 30 : level === 3 ? 26 : 22;
      renderedElements.push(
        <Text
          key={i}
          style={{
            fontSize,
            fontWeight: '700',
            marginTop,
            marginBottom,
            lineHeight,
            color: theme.textPrimary,
          }}
        >
          {parseInlineStyles(headerText, isUser)}
        </Text>
      );
      continue;
    }

    // 7.5. Plain-text custom headings (e.g. ⚖️ FINAL VERDICT, Win Probability)
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
            color: theme.textPrimary,
          }}
        >
          {parseInlineStyles(trimmed, isUser)}
        </Text>
      );
      continue;
    }

    // 8. Regular paragraph text line
    if (trimmed.length > 0) {
      renderedElements.push(
        <Text
          key={i}
          style={{
            fontSize: isUser ? 14.5 : 16,
            lineHeight: isUser ? 22 : 27.2, // line height 1.7x for AI responses
            marginBottom: isUser ? 10 : 18,
            marginTop: 2,
            color: theme.textPrimary,
          }}
        >
          {parseInlineStyles(line, isUser)}
        </Text>
      );
    } else {
      // Empty line / paragraph break
      renderedElements.push(<View key={i} style={{ height: isUser ? 6 : 18 }} />);
    }
  }

  // Flush remaining table if file ends
  if (currentTableRows.length > 0) {
    const tableElem = flushTable(lines.length);
    if (tableElem) renderedElements.push(tableElem);
  }

  return <View style={{ alignSelf: 'stretch' }}>{renderedElements}</View>;
};

export interface MessageBubbleProps {
  message: ChatMessage;
  onShare?: () => void;
  onCopy?: () => void;
  onRegenerate?: () => void;
  onContinue?: () => void;
  onExport?: () => void;
  onDownload?: () => void;
  onCitationPress?: (source: ChatMessageSource) => void;
  onAttachmentPress?: (attachment: ChatAttachment) => void;
  onSuggestionPress?: (suggestion: string) => void;
  aiName?: string;
  aiIcon?: string;
  onEditMessage?: (messageId: string, newContent: string) => void;
}

interface ActionIconBtnProps {
  onPress: () => void;
  isActive?: boolean;
  children: React.ReactNode;
}

const ActionIconBtn: React.FC<ActionIconBtnProps> = ({ onPress, isActive = false, children }) => {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.cleanActionBtn,
        {
          transform: [{ scale: pressed ? 0.96 : 1.0 }],
          opacity: pressed ? 0.4 : (isActive ? 1.0 : 0.6),
        }
      ]}
    >
      {children}
    </Pressable>
  );
};

export const ThinkingText: React.FC<{ text?: string; style?: any; animate?: boolean }> = ({ text = 'Thinking', style, animate = true }) => {
  const [dots, setDots] = useState('.');

  useEffect(() => {
    if (!animate) return;
    const interval = setInterval(() => {
      setDots((prev) => {
        if (prev === '...') return '.';
        return prev + '.';
      });
    }, 500);
    return () => clearInterval(interval);
  }, [animate]);

  if (!animate) {
    return <Text style={style}>{text}</Text>;
  }

  const baseText = text.replace(/\.\.\.$/, '').replace(/\.\.$/, '').replace(/\.$/, '');

  return <Text style={style}>{baseText}{dots}</Text>;
};

const getToolThinkingText = (aiName?: string) => {
  const name = String(aiName || '').toLowerCase().trim();
  if (name.includes('case assistant') || name.includes('case_assistant')) {
    return "Analyzing case context...";
  }
  if (name.includes('research assistant') || name.includes('research_assistant')) {
    return "Searching legal sources...";
  }
  if (name.includes('contract analyzer') || name.includes('contract_analyzer')) {
    return "Reviewing contract clauses...";
  }
  if (name.includes('evidence analyst') || name.includes('evidence_analyst') || name.includes('evidence checker')) {
    return "Analyzing evidence...";
  }
  if (name.includes('strategy engine') || name.includes('strategy_engine')) {
    return "Building litigation strategy...";
  }
  if (name.includes('argument builder') || name.includes('argument_builder')) {
    return "Building legal arguments...";
  }
  if (name.includes('case predictor') || name.includes('case_predictor')) {
    return "Predicting possible outcome...";
  }
  if (name.includes('timeline generator') || name.includes('timeline_generator')) {
    return "Generating timeline...";
  }
  if (name.includes('legal research') || name.includes('legal_research') || name.includes('research')) {
    return "Searching statutes and judgments...";
  }
  if (name.includes('precedent') || name.includes('precedents') || name.includes('legal precedent')) {
    return "Searching relevant precedents...";
  }
  if (name.includes('draft maker') || name.includes('draft_maker')) {
    return "Preparing legal draft...";
  }
  return "Thinking...";
};

/**
 * AI response bubble.
 */
export const AIBubble: React.FC<MessageBubbleProps> = ({
  message,
  onShare,
  onCopy,
  onRegenerate,
  onContinue,
  onExport,
  onDownload,
  onCitationPress,
  onAttachmentPress,
  onSuggestionPress,
  aiName,
  aiIcon,
}) => {
  const { theme, isDark } = useThemeContext();
  const { showToast } = useToastContext();

  const isStreaming = message.isStreaming || message.isProcessing || false;
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isMoreSheetOpen, setIsMoreSheetOpen] = useState(false);

  const contentHasArrived = !!message.content && message.content.trim().length > 0;
  
  // Fade in the whole bubble
  const fadeAnim = useRef(new Animated.Value(0)).current;
  // Opacity transition between thinking dots and text content
  const transitionAnim = useRef(new Animated.Value(contentHasArrived ? 1 : 0)).current;
  const [renderDots, setRenderDots] = useState(isStreaming && !contentHasArrived);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 350,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  useEffect(() => {
    if (isStreaming && !contentHasArrived) {
      setRenderDots(true);
      transitionAnim.setValue(0);
    } else if (contentHasArrived) {
      Animated.timing(transitionAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setRenderDots(false);
      });
    } else {
      setRenderDots(false);
      transitionAnim.setValue(0);
    }
  }, [contentHasArrived, isStreaming]);

  // Removed trailing cursor completely as requested to avoid blinking cursor/pipe (|)
  const displayContent = message.content;

  const DISCLAIMER_NEW_STARS = "**\u2696\ufe0f Legal Disclaimer:** This analysis is for informational purposes only and is not legal advice. AI may make mistakes. Please consult a qualified lawyer before making legal decisions.";
  const DISCLAIMER_NEW_NO_STARS = "\u2696\ufe0f Legal Disclaimer: This analysis is for informational purposes only and is not legal advice. AI may make mistakes. Please consult a qualified lawyer before making legal decisions.";
  const DISCLAIMER_OLD_STARS_1 = "\u2696\ufe0f **Legal Disclaimer:** This AI analysis is for informational purposes only and does not constitute professional legal advice. AI can make mistakes; always consult a qualified lawyer before making legal decisions. This tool is a senior legal assistant designed to support your legal journey with data-driven insights.";
  const DISCLAIMER_OLD_STARS_2 = "**\u2696\ufe0f Legal Disclaimer:** This AI analysis is for informational purposes only and does not constitute professional legal advice. AI can make mistakes; always consult a qualified lawyer before making legal decisions. This tool is a senior legal assistant designed to support your legal journey with data-driven insights.";
  const DISCLAIMER_OLD_NO_STARS = "\u2696\ufe0f Legal Disclaimer: This AI analysis is for informational purposes only and does not constitute professional legal advice. AI can make mistakes; always consult a qualified lawyer before making legal decisions. This tool is a senior legal assistant designed to support your legal journey with data-driven insights.";
  const DISCLAIMER_HINDI = "**\u2696\ufe0f \u0915\u093e\u0928\u0942\u0928\u0940 \u0905\u0938\u094d\u0935\u0940\u0915\u0930\u0923:** \u092f\u0939 \u0935\u093f\u0936\u094d\u0932\u0947\u0937\u0923 \u0915\u0947\u0935\u0932 \u0938\u0942\u091a\u0928\u093e\u0924\u094d\u092e\u0915 \u0909\u0926\u094d\u0926\u0947\u0936\u094d\u092f\u094b\u0902 \u0915\u0947 \u0932\u093f\u090f \u0939\u0948 \u0914\u0930 \u0915\u093e\u0928\u0942\u0928\u0940 \u0938\u0932\u093e\u0939 \u0928\u0939\u0940\u0902 \u0939\u0948\u0964 \u090f\u0906\u0908 \u0917\u0932\u0924\u093f\u092f\u093e\u0902 \u0915\u0930 \u0938\u0915\u0924\u093e \u0939\u0948\u0964 \u0915\u093e\u0928\u0942\u0928\u0940 \u0928\u093f\u0930\u094d\u0923\u092f \u0932\u0947\u0928\u0947 \u0938\u0947 \u092a\u0939\u0932\u0947 \u0915\u0943\u092a\u092f\u093e \u0915\u093f\u0938\u0940 \u092f\u094b\u0917\u094d\u092f \u0935\u0915\u0940\u0932 \u0938\u0947 \u092a\u0930\u093e\u092e\u0930\u094d\u0936 \u0932\u0947\u0902\u0964";
  const DISCLAIMER_HINDI_NO_STARS = "\u2696\ufe0f \u0915\u093e\u0928\u0942\u0928\u0940 \u0905\u0938\u094d\u0935\u0940\u0915\u0930\u0923: \u092f\u0939 \u0935\u093f\u0936\u094d\u0932\u0947\u0937\u0923 \u0915\u0947\u0935\u0932 \u0938\u0942\u091a\u0928\u093e\u0924\u094d\u092e\u0915 \u0909\u0926\u094d\u0926\u0947\u0936\u094d\u092f\u094b\u0902 \u0915\u0947 \u0932\u093f\u090f \u0939\u0948 \u0914\u0930 \u0915\u093e\u0928\u0942\u0928\u0940 \u0938\u0932\u093e\u0939 \u0928\u0939\u0940\u0902 \u0939\u0948\u0964 \u090f\u0906\u0908 \u0917\u0932\u0924\u093f\u092f\u093e\u0902 \u0915\u0930 \u0938\u0915\u0924\u093e \u0939\u0948\u0964 \u0915\u093e\u0928\u0942\u0928\u0940 \u0928\u093f\u0930\u094d\u0923\u092f \u0932\u0947\u0928\u0947 \u0938\u0947 \u092a\u0939\u0932\u0947 \u0915\u0943\u092a\u092f\u093e \u0915\u093f\u0938\u0940 \u092f\u094b\u0917\u094d\u092f \u0935\u0915\u0940\u0932 \u0938\u0947 \u092a\u0930\u093e\u092e\u0930\u094d\u0936 \u0932\u0947\u0902\u0964";
  const DISCLAIMER_BILINGUAL = "**\u2696\ufe0f Legal Disclaimer (\u0915\u093e\u0928\u0942\u0928\u0940 \u0905\u0938\u094d\u0935\u0940\u0915\u0930\u0923):** This analysis is for informational purposes only and is not legal advice. AI may make mistakes. Please consult a qualified lawyer before making legal decisions. (\u092f\u0939 \u0935\u093f\u0936\u094d\u0932\u0947\u0937\u0923 \u0915\u0947\u0935\u0932 \u0938\u0942\u091a\u0928\u093e\u0924\u094d\u092e\u0915 \u0909\u0926\u094d\u0926\u0947\u0936\u094d\u092f\u094b\u0902 \u0915\u0947 \u0932\u093f\u090f \u0939\u0948 \u0914\u0930 \u0915\u093e\u0928\u0942\u0928\u0940 \u0938\u0932\u093e\u0939 \u0928\u0939\u0940\u0902 \u0939\u0948\u0964 \u090f\u0906\u0908 \u0917\u0932\u0924\u093f\u092f\u093e\u0902 \u0915\u0930 \u0938\u0915\u0924\u093e \u0939\u0948\u0964 \u0915\u093e\u0928\u0942\u0928\u0940 \u0928\u093f\u0930\u094d\u0923\u092f \u0932\u0947\u0928\u0947 \u0938\u0947 \u092a\u0939\u0932\u0947 \u0915\u0943\u092a\u092f\u093e \u0915\u093f\u0938\u0940 \u092f\u094b\u0917\u094d\u092f \u0935\u0915\u0940\u0932 \u0938\u0947 \u092a\u0930\u093e\u092e\u0930\u094d\u0936 \u0932\u0947\u0902\u0964)";
  const DISCLAIMER_GUJARATI = "**\u2696\ufe0f \u0a95\u0abe\u0aa8\u0ac2\u0aa8\u0ac0 \u0a85\u0ab8\u0acd\u0ab5\u0ac0\u0a95\u0ab0\u0aa3:** \u0a86 \u0ab5\u0abf\u0ab6\u0acd\u0ab2\u0ac7\u0ab7\u0a93 \u0aab\u0a95\u0acd\u0aa4 \u0aae\u0abe\u0ab9\u0abf\u0aa4\u0ac0\u0aa8\u0abe \u0ab9\u0ac7\u0aa4\u0ac1\u0a93 \u0aae\u0abe\u0a9f\u0ac7 \u0a9b\u0ac7 \u0a85\u0aa8\u0ac7 \u0a95\u0abe\u0aa8\u0ac2\u0aa8\u0ac0 \u0ab8\u0ab2\u0abe\u0ab9 \u0aa8\u0aa5\u0ac0. AI \u0aad\u0ac2\u0ab2\u0acb \u0a95\u0ab0\u0ac0 \u0ab6\u0a95\u0ac7 \u0a9b\u0ac7. \u0a95\u0abe\u0aa8\u0ac2\u0aa8\u0ac0 \u0aa8\u0abf\u0ab0\u0acd\u0aa3\u0aaf\u0acb \u0ab2\u0ac7\u0aa4\u0abe \u0aaa\u0abblocks\u0abe \u0a95\u0ac3\u0aaa\u0abe \u0a95\u0ab0\u0ac0\u0aa8\u0ac7 \u0ab2\u0abe\u0aaf\u0a95 \u0ab5\u0a95\u0ac0\u0ab2\u0aa8\u0ac0 \u0ab8\u0ab2\u0abe\u0ab9 \u0ab2\u0acb.";
  const DISCLAIMER_MARATHI = "**\u2696\ufe0f \u0915\u093e\u092f\u0926\u0947\u0936\u0940\u0930 \u0905\u0938\u094d\u0935\u0940\u0915\u093e\u0930:** \u0939\u0947 \u0935\u093f\u0936\u094d\u0932\u0947\u0937\u0923 \u0915\u0947\u0935\u0933 \u092e\u093e\u0939\u093f\u0924\u0940\u091a\u094d\u092f\u093e \u0909\u0926\u094d\u0926\u094d\u092f\u094b\u0917\u093e\u0928\u0947 \u0906\u0939\u0947 \u0906\u0923\u093f \u0915\u093e\u092f\u0926\u0947\u0936\u0940\u0930 \u0938\u0932\u094d\u0932\u093e \u0928\u093e\u0939\u0940. AI \u091a\u0941\u0915\u093e \u0915\u0930\u0942 \u0936\u0915\u0924\u0947. \u0915\u093e\u092f\u0926\u0947\u0936\u0940\u0930 \u0928\u093f\u0930\u094d\u0923\u092f \u0918\u0947\u0923\u094d\u092f\u093e\u092a\u0942\u0930\u094d\u0935\u0940 \u0915\u0943\u092a\u092f\u093e \u092a\u093e\u0924\u094d\u0930 \u0935\u0915\u0940\u0932\u093e\u091a\u093e \u0938\u0932\u094d\u0932\u093e \u0917\u094d\u092f\u093e.";
  const DISCLAIMER_TAMIL = "**\u2696\ufe0f \u0b9a\u0b9f\u0bcd\u0b9f\u0baa\u0bcd\u0baa\u0bc2\u0bb0\u0bcd\u0bb5 \u0bae\u0bb1\u0bc1\u0baa\u0bcd\u0baa\u0bc1:** \u0b9a\u0b9f\u0bcd\u0b9f \u0b86\u0bb2\u0bcb\u0b9a\u0ba9\u0bc8\u0baf\u0bb2\u0bcd\u0bb2. AI \u0ba4\u0bcb\u0bb2\u0bcd\u0bb5\u0bbf\u0baf\u0b9f\u0bc8\u0baf\u0bb2\u0bbe\u0bae\u0bcd. \u0b9a\u0b9f\u0bcd\u0b9f\u0baa\u0bcd\u0baa\u0bc2\u0bb0\u0bcd\u0bb5 \u0bae\u0bc1\u0b9f\u0bbf\u0bb5\u0bc1\u0b95\u0bb3\u0bcd \u0b8e\u0b9f\u0bc1\u0baa\u0bcd\u0baa\u0ba4\u0bc1\u0bb1\u0bcd\u0b95\u0bc1 \u0bae\u0bc1\u0ba9\u0bcd \u0ba4\u0b95\u0bc1\u0ba4\u0bbf\u0bb5\u0bbe\u0baf\u0bcd\u0ba8\u0bcd\u0ba4 \u0bb5\u0bb4\u0b95\u0bcd\u0b95\u0bb1\u0bbf\u0b9e\u0bb0\u0bc8 \u0b85\u0ba3\u0bc1\u0b95\u0bb5\u0bc1\u0bae\u0bcd.";

  const nameLower = String(aiName || message.agentName || '').toLowerCase().trim();
  const isException = 
    nameLower.includes('draft maker') || 
    nameLower.includes('draft_maker') || 
    nameLower.includes('precedent') || 
    nameLower.includes('legal precedent') || 
    nameLower.includes('case assistant') || 
    nameLower.includes('case_assistant');

  const isLoaderException = 
    nameLower.includes('draft maker') || 
    nameLower.includes('draft_maker') || 
    nameLower.includes('precedent') || 
    nameLower.includes('legal precedent');

  let mainContent = displayContent;

  [
    DISCLAIMER_NEW_STARS, DISCLAIMER_NEW_NO_STARS,
    DISCLAIMER_OLD_STARS_1, DISCLAIMER_OLD_STARS_2, DISCLAIMER_OLD_NO_STARS,
    DISCLAIMER_HINDI, DISCLAIMER_HINDI_NO_STARS,
    DISCLAIMER_BILINGUAL,
    DISCLAIMER_GUJARATI,
    DISCLAIMER_MARATHI,
    DISCLAIMER_TAMIL
  ].forEach(d => {
    if (mainContent.includes(d)) {
      const parts = mainContent.split(d);
      mainContent = parts[0].trim();
    }
  });

  // Strip any residual formatting stars that were left before the disclaimer
  mainContent = mainContent.replace(/\*\*$/, '').trim();

  const hasDisclaimer = !isException;

  // Smart Content Analyzers for Export Flags
  const hasTables = useMemo(() => {
    return /\|.*\|/g.test(message.content) && message.content.includes('\n|');
  }, [message.content]);

  const hasRichFormat = useMemo(() => {
    return /#+\s+|[*\-_]{2,}|`|```/g.test(message.content) || 
           message.content.includes('\n- ') || 
           message.content.includes('\n* ') || 
           message.content.includes('\n• ');
  }, [message.content]);

  const handleLike = () => {
    setIsLiked(!isLiked);
    if (!isLiked) {
      setIsDisliked(false);
      showToast('success', 'Feedback Received', 'Thank you for your rating!');
    }
  };

  const handleDislike = () => {
    setIsDisliked(!isDisliked);
    if (!isDisliked) {
      setIsLiked(false);
      showToast('success', 'Feedback Received', 'Thank you for your rating!');
    }
  };

  const handleReadAloud = () => {
    setIsPlayingAudio(!isPlayingAudio);
    if (!isPlayingAudio) {
      showToast('info', 'Read Aloud', 'Starting speech synthesis for this response...');
    } else {
      showToast('info', 'Speech Stopped', 'Speech synthesis stopped.');
    }
  };

  const executeShare = async () => {
    try {
      await Share.share({
        message: message.content,
        title: 'AI Legal Response',
      });
      if (onShare) onShare();
    } catch (err: any) {
      console.error(err);
    }
  };

  const copyPlain = () => {
    const plainText = message.content
      .replace(/[#*`~_]/g, '')
      .replace(/\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/gi, '')
      .trim();
    Clipboard.setString(plainText);
    showToast('success', 'Copied', 'Plain text copied to clipboard.');
    setIsMoreSheetOpen(false);
  };

  const copyMarkdown = () => {
    Clipboard.setString(message.content);
    showToast('success', 'Copied', 'Markdown copied to clipboard.');
    setIsMoreSheetOpen(false);
  };

  const handleExportPDF = () => {
    showToast('success', 'Exporting PDF', 'Preserving layout structure and generating PDF...');
    setIsMoreSheetOpen(false);
    if (onExport) onExport();
  };

  const handleExportWord = () => {
    if (!hasRichFormat) return;
    showToast('success', 'Exporting Word', 'Converting formatted elements to docx document...');
    setIsMoreSheetOpen(false);
  };

  const handleExportExcel = () => {
    if (!hasTables) return;
    showToast('success', 'Exporting Excel', 'Extracting rows and cells to xlsx sheet...');
    setIsMoreSheetOpen(false);
  };

  const handleRegenerate = () => {
    setIsMoreSheetOpen(false);
    if (onRegenerate) onRegenerate();
  };

  const screenHeight = Dimensions.get('window').height;

  return (
    <Animated.View style={[styles.aiMessageContainer, { opacity: fadeAnim }]}>
      <View style={styles.aiMessageContent}>
        <View style={styles.aiBubble}>
          {renderDots && (
            <Animated.View
              style={{
                opacity: transitionAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 0],
                }),
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 4,
              }}
            >
              <ThinkingText
                text={getToolThinkingText(aiName || message.agentName)}
                animate={!isLoaderException}
                style={[styles.thinkingText, { color: theme.textSecondary, fontWeight: '600', fontStyle: 'normal' }]}
              />
            </Animated.View>
          )}

          {(contentHasArrived || !isStreaming) && (
            <Animated.View style={{ opacity: transitionAnim }}>
              <MarkdownText content={mainContent} isUser={false} />
              {hasDisclaimer && (
                <View style={[styles.disclaimerContainer, { borderTopColor: theme.border }]}>
                  <Text style={[styles.disclaimerText, { color: theme.textSecondary }]}>
                    <Text style={[styles.disclaimerBold, { color: theme.textPrimary }]}>⚖️ Legal Disclaimer:</Text> This analysis is for informational purposes only and is not legal advice. AI may make mistakes. Please consult a qualified lawyer before making legal decisions.
                  </Text>
                </View>
              )}
            </Animated.View>
          )}

          {message.attachments && message.attachments.length > 0 && (
            <View style={styles.attachmentsList}>
              {message.attachments.map((attach, idx) => (
                <AttachmentCard
                  key={idx}
                  attachment={attach}
                  onPress={onAttachmentPress ? () => onAttachmentPress(attach) : undefined}
                />
              ))}
            </View>
          )}
        </View>

        {message.sources && message.sources.length > 0 && (
          <View style={styles.citationsContainer}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Citations & Sources</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.citationsScroll}>
              {message.sources.map((source, idx) => (
                <CitationCard
                  key={idx}
                  source={source}
                  onPress={onCitationPress ? () => onCitationPress(source) : undefined}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Minimal ChatGPT-Style Action Row */}
        {!isStreaming && message.id !== 'greetings' && message.content.length > 0 && (
          <View style={styles.cleanActionRow}>
            <ActionIconBtn onPress={copyMarkdown}>
              <Ionicons name="copy-outline" size={18} color={theme.textSecondary} />
            </ActionIconBtn>

            <ActionIconBtn onPress={handleLike} isActive={isLiked}>
              <Ionicons 
                name={isLiked ? "thumbs-up" : "thumbs-up-outline"} 
                size={18} 
                color={isLiked ? theme.primary : theme.textSecondary} 
              />
            </ActionIconBtn>

            <ActionIconBtn onPress={handleDislike} isActive={isDisliked}>
              <Ionicons 
                name={isDisliked ? "thumbs-down" : "thumbs-down-outline"} 
                size={18} 
                color={isDisliked ? theme.danger : theme.textSecondary} 
              />
            </ActionIconBtn>

            <ActionIconBtn onPress={handleReadAloud} isActive={isPlayingAudio}>
              <Ionicons 
                name="volume-medium-outline" 
                size={18} 
                color={isPlayingAudio ? theme.primary : theme.textSecondary} 
              />
            </ActionIconBtn>

            <ActionIconBtn onPress={executeShare}>
              <Ionicons name="share-social-outline" size={18} color={theme.textSecondary} />
            </ActionIconBtn>

            <ActionIconBtn onPress={() => setIsMoreSheetOpen(true)}>
              <Ionicons name="ellipsis-horizontal" size={18} color={theme.textSecondary} />
            </ActionIconBtn>
          </View>
        )}

        {/* rounded sliding bottom sheet drawer for legal actions */}
        <Modal
          visible={isMoreSheetOpen}
          transparent
          animationType="slide"
          onRequestClose={() => setIsMoreSheetOpen(false)}
        >
          <View style={styles.bottomSheetOverlay}>
            <TouchableWithoutFeedback onPress={() => setIsMoreSheetOpen(false)}>
              <View style={{ flex: 1 }} />
            </TouchableWithoutFeedback>

            <View style={[styles.bottomSheetContainer, { backgroundColor: theme.card }]}>
              <View style={[styles.bottomSheetDragHandle, { backgroundColor: theme.border }]} />
              <View style={[styles.bottomSheetHeader, { borderBottomColor: theme.border }]}>
                <Text style={[styles.bottomSheetTitle, { color: theme.textPrimary }]}>Response Actions</Text>
                <TouchableOpacity onPress={() => setIsMoreSheetOpen(false)}>
                  <Ionicons name="close" size={24} color={theme.textPrimary} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: screenHeight * 0.6 }}>
                {/* PDF export */}
                <TouchableOpacity onPress={handleExportPDF} style={[styles.bottomSheetItem, { borderBottomColor: theme.border }]}>
                  <Ionicons name="document-text-outline" size={22} color={theme.textSecondary} style={styles.bottomSheetItemIcon} />
                  <Text style={[styles.bottomSheetItemLabel, { color: theme.textPrimary }]}>Export as PDF</Text>
                </TouchableOpacity>

                {/* Word export */}
                <TouchableOpacity 
                  onPress={handleExportWord} 
                  disabled={!hasRichFormat}
                  style={[styles.bottomSheetItem, { borderBottomColor: theme.border }, !hasRichFormat && { opacity: 0.4 }]}
                >
                  <Ionicons name="file-tray-full-outline" size={22} color={hasRichFormat ? theme.textSecondary : (isDark ? theme.textMuted : "#9CA3AF")} style={styles.bottomSheetItemIcon} />
                  <Text style={[styles.bottomSheetItemLabel, { color: theme.textPrimary }, !hasRichFormat && { color: (isDark ? theme.textMuted : "#9CA3AF") }]}>Export as Word (.docx)</Text>
                </TouchableOpacity>

                {/* Excel export */}
                <TouchableOpacity 
                  onPress={handleExportExcel} 
                  disabled={!hasTables}
                  style={[styles.bottomSheetItem, { borderBottomColor: theme.border }, !hasTables && { opacity: 0.4 }]}
                >
                  <Ionicons name="grid-outline" size={22} color={hasTables ? theme.textSecondary : (isDark ? theme.textMuted : "#9CA3AF")} style={styles.bottomSheetItemIcon} />
                  <Text style={[styles.bottomSheetItemLabel, { color: theme.textPrimary }, !hasTables && { color: (isDark ? theme.textMuted : "#9CA3AF") }]}>Export as Excel (.xlsx)</Text>
                </TouchableOpacity>

                {/* Copy Markdown */}
                <TouchableOpacity onPress={copyMarkdown} style={[styles.bottomSheetItem, { borderBottomColor: theme.border }]}>
                  <Ionicons name="clipboard-outline" size={22} color={theme.textSecondary} style={styles.bottomSheetItemIcon} />
                  <Text style={[styles.bottomSheetItemLabel, { color: theme.textPrimary }]}>Copy as Markdown</Text>
                </TouchableOpacity>

                {/* Copy Plain Text */}
                <TouchableOpacity onPress={copyPlain} style={[styles.bottomSheetItem, { borderBottomColor: theme.border }]}>
                  <Ionicons name="document-outline" size={22} color={theme.textSecondary} style={styles.bottomSheetItemIcon} />
                  <Text style={[styles.bottomSheetItemLabel, { color: theme.textPrimary }]}>Copy as Plain Text</Text>
                </TouchableOpacity>

                {/* Save to Notes */}
                <TouchableOpacity onPress={() => { showToast('success', 'Saved', 'Saved to Notes'); setIsMoreSheetOpen(false); }} style={[styles.bottomSheetItem, { borderBottomColor: theme.border }]}>
                  <Ionicons name="star-outline" size={22} color={theme.textSecondary} style={styles.bottomSheetItemIcon} />
                  <Text style={[styles.bottomSheetItemLabel, { color: theme.textPrimary }]}>Save to Notes</Text>
                </TouchableOpacity>

                {/* Save to Case */}
                <TouchableOpacity onPress={() => { showToast('success', 'Saved', 'Associated with active case'); setIsMoreSheetOpen(false); }} style={[styles.bottomSheetItem, { borderBottomColor: theme.border }]}>
                  <Ionicons name="folder-outline" size={22} color={theme.textSecondary} style={styles.bottomSheetItemIcon} />
                  <Text style={[styles.bottomSheetItemLabel, { color: theme.textPrimary }]}>Save to Case</Text>
                </TouchableOpacity>

                {/* Add to Evidence */}
                <TouchableOpacity onPress={() => { showToast('success', 'Added', 'Evidence registered successfully'); setIsMoreSheetOpen(false); }} style={[styles.bottomSheetItem, { borderBottomColor: theme.border }]}>
                  <Ionicons name="archive-outline" size={22} color={theme.textSecondary} style={styles.bottomSheetItemIcon} />
                  <Text style={[styles.bottomSheetItemLabel, { color: theme.textPrimary }]}>Add to Evidence</Text>
                </TouchableOpacity>

                {/* Save to Legal Research */}
                <TouchableOpacity onPress={() => { showToast('success', 'Saved', 'Research archive updated'); setIsMoreSheetOpen(false); }} style={[styles.bottomSheetItem, { borderBottomColor: theme.border }]}>
                  <Ionicons name="library-outline" size={22} color={theme.textSecondary} style={styles.bottomSheetItemIcon} />
                  <Text style={[styles.bottomSheetItemLabel, { color: theme.textPrimary }]}>Save to Legal Research</Text>
                </TouchableOpacity>

                {/* Bookmark Response */}
                <TouchableOpacity onPress={() => { showToast('success', 'Bookmarked', 'Response added to bookmarks'); setIsMoreSheetOpen(false); }} style={[styles.bottomSheetItem, { borderBottomColor: theme.border }]}>
                  <Ionicons name="bookmark-outline" size={22} color={theme.textSecondary} style={styles.bottomSheetItemIcon} />
                  <Text style={[styles.bottomSheetItemLabel, { color: theme.textPrimary }]}>Bookmark Response</Text>
                </TouchableOpacity>

                {/* Print */}
                <TouchableOpacity onPress={() => { showToast('info', 'Print', 'Dispatching print payload...'); setIsMoreSheetOpen(false); }} style={[styles.bottomSheetItem, { borderBottomColor: theme.border }]}>
                  <Ionicons name="print-outline" size={22} color={theme.textSecondary} style={styles.bottomSheetItemIcon} />
                  <Text style={[styles.bottomSheetItemLabel, { color: theme.textPrimary }]}>Print</Text>
                </TouchableOpacity>

                {/* Share Response */}
                <TouchableOpacity onPress={executeShare} style={[styles.bottomSheetItem, { borderBottomColor: theme.border }]}>
                  <Ionicons name="share-social-outline" size={22} color={theme.textSecondary} style={styles.bottomSheetItemIcon} />
                  <Text style={[styles.bottomSheetItemLabel, { color: theme.textPrimary }]}>Share Response</Text>
                </TouchableOpacity>

                {/* Regenerate Response */}
                {onRegenerate && (
                  <TouchableOpacity onPress={handleRegenerate} style={[styles.bottomSheetItem, { borderBottomColor: theme.border }]}>
                    <Ionicons name="refresh-outline" size={22} color={theme.textSecondary} style={styles.bottomSheetItemIcon} />
                    <Text style={[styles.bottomSheetItemLabel, { color: theme.textPrimary }]}>Regenerate Response</Text>
                  </TouchableOpacity>
                )}

                {/* Translate */}
                <TouchableOpacity onPress={() => { showToast('info', 'Translate', 'Target translation engine initialized...'); setIsMoreSheetOpen(false); }} style={[styles.bottomSheetItem, { borderBottomColor: theme.border }]}>
                  <Ionicons name="language-outline" size={22} color={theme.textSecondary} style={styles.bottomSheetItemIcon} />
                  <Text style={[styles.bottomSheetItemLabel, { color: theme.textPrimary }]}>Translate</Text>
                </TouchableOpacity>

                {/* Cite Sources */}
                {message.sources && message.sources.length > 0 && (
                  <TouchableOpacity 
                    onPress={() => { 
                      showToast('info', 'Citations', 'Displaying legal source citations...'); 
                      setIsMoreSheetOpen(false); 
                      if (onCitationPress && message.sources && message.sources.length > 0) {
                        onCitationPress(message.sources[0]);
                      }
                    }} 
                    style={[styles.bottomSheetItem, { borderBottomColor: theme.border }]}
                  >
                    <MaterialCommunityIcons name="scale-balance" size={22} color={theme.textSecondary} style={styles.bottomSheetItemIcon} />
                    <Text style={[styles.bottomSheetItemLabel, { color: theme.textPrimary }]}>Cite Sources</Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </Animated.View>
  );
};

/**
 * User text / attachment bubble.
 */
export const UserBubble: React.FC<MessageBubbleProps> = ({
  message,
  onAttachmentPress,
  onEditMessage,
}) => {
  const { theme, isDark } = useThemeContext();
  const { showToast } = useToastContext();

  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.content);
  const [isExpanded, setIsExpanded] = useState(false);
  const [animatedExpanded, setAnimatedExpanded] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [fullHeight, setFullHeight] = useState(0);
  const [isMeasured, setIsMeasured] = useState(false);
  const heightAnim = useRef(new Animated.Value(160)).current;

  const handleCopy = () => {
    Clipboard.setString(message.content);
    showToast('success', 'Copied', 'Copied to clipboard');
  };

  const handleEditStart = () => {
    setEditText(message.content);
    setIsEditing(true);
  };

  const handleSave = () => {
    if (!editText.trim()) {
      showToast('error', 'Error', 'Message cannot be empty');
      return;
    }
    setIsEditing(false);
    if (onEditMessage) {
      onEditMessage(message.id, editText);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditText(message.content);
  };

  const onTextLayout = (event: any) => {
    const { height } = event.nativeEvent.layout;
    if (!isMeasured && height > 0) {
      setFullHeight(height);
      setIsMeasured(true);
      if (height <= 160) {
        heightAnim.setValue(height);
      }
    }
  };

  useEffect(() => {
    if (isMeasured && fullHeight > 160) {
      if (isExpanded) {
        Animated.spring(heightAnim, {
          toValue: fullHeight,
          useNativeDriver: false,
          tension: 50,
          friction: 8,
        }).start((result: { finished: boolean }) => {
          if (result && result.finished) {
            setAnimatedExpanded(true);
          }
        });
      } else {
        setAnimatedExpanded(false);
        Animated.spring(heightAnim, {
          toValue: 160,
          useNativeDriver: false,
          tension: 50,
          friction: 8,
        }).start();
      }
    }
  }, [isExpanded, isMeasured, fullHeight]);

  const needsCollapse = message.content.length > 250 || (isMeasured && fullHeight > 160);

  const prevContent = useRef(message.content);
  useEffect(() => {
    if (prevContent.current !== message.content) {
      setIsMeasured(false);
      setFullHeight(0);
      setIsExpanded(false);
      setAnimatedExpanded(false);
      heightAnim.setValue(160);
      prevContent.current = message.content;
    }
  }, [message.content]);

  const bubbleBg = isDark ? theme.surfaceVariant : '#F3F4F6';

  if (isEditing) {
    return (
      <View style={[styles.bubbleContainer, styles.userAlign]}>
        <View style={{ flex: 1, alignItems: 'flex-end', width: '100%' }}>
          <View style={[
            styles.bubble, 
            { 
              backgroundColor: bubbleBg, 
              borderRadius: 18, 
              alignSelf: 'stretch',
            }
          ]}>
            <TextInput
              style={[styles.editTextInput, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', color: theme.textPrimary }]}
              value={editText}
              onChangeText={setEditText}
              multiline
              autoFocus
            />
            <View style={styles.editActionsRow}>
              <TouchableOpacity onPress={handleCancel} style={[styles.editCancelBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
                <Text style={[styles.editCancelBtnText, { color: theme.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSave} style={[styles.editSaveBtn, { backgroundColor: theme.primary }]}>
                <Text style={[styles.editSaveBtnText, { color: '#FFFFFF' }]}>Save & Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.bubbleContainer, styles.userAlign]}>
      <View style={{ flex: 1, alignItems: 'flex-end', width: '100%' }}>
        <Pressable
          onLongPress={() => setShowActions(!showActions)}
          style={[
            styles.bubble,
            { 
              backgroundColor: bubbleBg, 
              borderRadius: 18,
            }
          ]}
        >
          <Animated.View style={needsCollapse ? {
            height: animatedExpanded ? 'auto' : heightAnim,
            overflow: animatedExpanded ? 'visible' : 'hidden',
            opacity: isMeasured ? 1 : 0
          } : null}>
            <View onLayout={onTextLayout} style={{ alignSelf: 'stretch' }}>
              <MarkdownText content={message.content} isUser={true} />
            </View>
            {needsCollapse && !isExpanded && isMeasured && (
              <View style={styles.gradientContainer}>
                <View style={[styles.gradientLayer, { top: 0, opacity: 0.15, backgroundColor: bubbleBg }]} />
                <View style={[styles.gradientLayer, { top: 8, opacity: 0.35, backgroundColor: bubbleBg }]} />
                <View style={[styles.gradientLayer, { top: 16, opacity: 0.60, backgroundColor: bubbleBg }]} />
                <View style={[styles.gradientLayer, { top: 24, opacity: 0.80, backgroundColor: bubbleBg }]} />
                <View style={[styles.gradientLayer, { top: 32, opacity: 1.00, backgroundColor: bubbleBg }]} />
              </View>
            )}
          </Animated.View>

          {/* Action Row inside user bubble */}
          {showActions && (
            <View style={styles.userActionRow}>
              <TouchableOpacity onPress={handleCopy} style={styles.userActionButton}>
                <Ionicons name="copy-outline" size={14} color={theme.textPrimary} style={{ opacity: 0.7 }} />
              </TouchableOpacity>
              {onEditMessage && (
                <TouchableOpacity onPress={handleEditStart} style={styles.userActionButton}>
                  <Ionicons name="pencil-outline" size={14} color={theme.textPrimary} style={{ opacity: 0.7 }} />
                </TouchableOpacity>
              )}
            </View>
          )}

          {message.attachments && message.attachments.length > 0 && (
            <View style={styles.attachmentsList}>
              {message.attachments.map((attach, idx) => (
                <AttachmentCard
                  key={idx}
                  attachment={attach}
                  onPress={onAttachmentPress ? () => onAttachmentPress(attach) : undefined}
                />
              ))}
            </View>
          )}
        </Pressable>

        {/* Collapsible toggle buttons under the bubble */}
        {needsCollapse && isMeasured && (
          <TouchableOpacity 
            onPress={() => setIsExpanded(!isExpanded)}
            style={styles.expandToggleBtn}
          >
            <Text style={[styles.expandToggleBtnText, { color: theme.primary }]}>
              {isExpanded ? 'Show less ▲' : 'Show more ▼'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

/**
 * Dynamic message bubble that chooses styling based on sender role.
 */
export const ChatMessageBubble: React.FC<MessageBubbleProps> = (props) => {
  if (props.message.role === 'user') {
    return <UserBubble {...props} />;
  }
  return <AIBubble {...props} />;
};

/**
 * Citation resource block.
 */
export interface CitationCardProps {
  source: ChatMessageSource;
  onPress?: () => void;
}

export const CitationCard: React.FC<CitationCardProps> = ({ source, onPress }) => {
  const { theme } = useThemeContext();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[styles.redesignedCitationCard, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}
    >
      <Text style={[styles.citationTitle, { color: theme.textPrimary }]} numberOfLines={1}>🔗 {source.title}</Text>
      {source.description && (
        <Text style={[styles.citationDesc, { color: theme.textSecondary }]} numberOfLines={1}>
          {source.description}
        </Text>
      )}
    </TouchableOpacity>
  );
};

/**
 * Attachment file indicator inside message bubbles.
 */
export interface AttachmentCardProps {
  attachment: ChatAttachment;
  onPress?: () => void;
}

export const AttachmentCard: React.FC<AttachmentCardProps> = ({ attachment, onPress }) => {
  const { theme } = useThemeContext();
  const isImage = attachment.type?.startsWith('image') || attachment.name.endsWith('.png') || attachment.name.endsWith('.jpg');

  const defaultOnPress = async () => {
    try {
      const url = attachment.url;
      if (!url) {
        Alert.alert('Error', 'Attachment URL is missing.');
        return;
      }

      if (url.startsWith('http://') || url.startsWith('https://')) {
        await Linking.openURL(url);
      } else if (url.startsWith('file://')) {
        const ext = url.split('.').pop()?.toLowerCase() || '';
        let mimeType = 'application/pdf';
        if (ext === 'doc' || ext === 'docx') {
          mimeType = 'application/msword';
        } else if (ext === 'xls' || ext === 'xlsx') {
          mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        } else if (ext === 'png') {
          mimeType = 'image/png';
        } else if (ext === 'jpg' || ext === 'jpeg') {
          mimeType = 'image/jpeg';
        } else if (ext === 'txt') {
          mimeType = 'text/plain';
        }

        if (Platform.OS === 'android') {
          const contentUri = await FileSystem.getContentUriAsync(url);
          await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
            data: contentUri,
            flags: 1, // Intent.FLAG_GRANT_READ_URI_PERMISSION
            type: mimeType,
          });
        } else {
          await Sharing.shareAsync(url);
        }
      } else {
        await Linking.openURL(url);
      }
    } catch (err) {
      console.error('[AttachmentCard] Error opening:', err);
      try {
        if (attachment.url) {
          await Sharing.shareAsync(attachment.url);
        }
      } catch (shareErr) {
        Alert.alert('Cannot Open', 'No compatible app found to open this attachment.');
      }
    }
  };

  return (
    <TouchableOpacity
      onPress={onPress || defaultOnPress}
      activeOpacity={0.8}
      style={[styles.attachmentCard, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}
    >
      <Text style={{ fontSize: 22, marginRight: Spacing[8] }}>{isImage ? '🖼️' : '📄'}</Text>
      <View style={{ flex: 1 }}>
        <Text style={[styles.attachmentName, { color: theme.textPrimary }]} numberOfLines={1}>
          {attachment.name}
        </Text>
        {attachment.size && (
          <Text style={{ fontSize: 11, color: theme.textMuted, marginTop: Spacing[2] }}>
            {formatFileSize(attachment.size)}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

export const TypingIndicator: React.FC = () => {
  const { theme } = useThemeContext();
  return (
    <View style={[styles.aiMessageContainer, { flexDirection: 'row', alignItems: 'flex-start' }]}>
      <View style={styles.aiMessageContent}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 4 }}>
          <ThinkingText
            text="Thinking"
            style={[styles.thinkingText, { color: theme.textSecondary, fontWeight: '600', fontStyle: 'normal' }]}
          />
        </View>
      </View>
    </View>
  );
};

export const ThinkingState: React.FC<{ message?: string }> = ({ message = 'AI is researching precedents...' }) => {
  const { theme } = useThemeContext();
  return (
    <View style={[styles.aiMessageContainer, { flexDirection: 'row', alignItems: 'flex-start' }]}>
      <View style={[styles.aiMessageContent, { flexDirection: 'row', alignItems: 'center', paddingTop: 4 }]}>
        <ThinkingText
          text={message}
          style={[styles.thinkingText, { color: theme.textSecondary, fontWeight: '600', fontStyle: 'normal' }]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  bubbleContainer: {
    flexDirection: 'row',
    marginVertical: Spacing[8],
    alignSelf: 'stretch',
  },
  userAlign: {
    justifyContent: 'flex-end',
    paddingLeft: Spacing[48],
  },
  aiAlign: {
    justifyContent: 'flex-start',
    paddingRight: Spacing[48],
  },
  aiAvatar: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing[8],
    marginTop: Spacing[2],
  },
  aiAvatarText: {
    fontSize: 14,
  },
  bubble: {
    paddingHorizontal: Spacing[14],
    paddingVertical: Spacing[10],
    borderRadius: Radius.lg,
    maxWidth: '100%',
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 22,
  },
  attachmentsList: {
    marginTop: Spacing[8],
    alignSelf: 'stretch',
    gap: Spacing[6],
  },
  attachmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing[8],
    alignSelf: 'stretch',
  },
  attachmentName: {
    fontSize: 13,
    fontWeight: '600',
  },
  citationsContainer: {
    marginTop: Spacing[8],
    alignSelf: 'stretch',
    paddingLeft: Spacing[8],
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: Spacing[4],
  },
  citationCard: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing[8],
    marginVertical: Spacing[4],
    alignSelf: 'stretch',
  },
  citationTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  citationDesc: {
    fontSize: 11,
    marginTop: Spacing[2],
  },
  suggestionsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: Spacing[8],
    gap: Spacing[6],
  },
  suggestionChip: {
    paddingHorizontal: Spacing[10],
    paddingVertical: Spacing[6],
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: Spacing[4],
    marginLeft: Spacing[8],
    gap: Spacing[12],
  },
  actionButton: {
    paddingVertical: Spacing[4],
  },
  typingDotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: 30,
    height: 12,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  thinkingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[8],
    paddingVertical: Spacing[12],
    paddingHorizontal: Spacing[16],
    alignSelf: 'flex-start',
  },
  thinkingText: {
    fontSize: 14,
    fontStyle: 'normal',
    fontWeight: '600',
  },
  aiMessageContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: Spacing[10],
    alignSelf: 'stretch',
    paddingHorizontal: 0,
  },
  aiMessageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[8],
    marginBottom: Spacing[6],
  },
  aiNameText: {
    fontSize: 14.5,
    fontWeight: '700',
  },
  aiMessageContent: {
    flex: 1,
    alignSelf: 'stretch',
    paddingRight: Spacing[4],
  },
  streamingIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  streamingPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    opacity: 0.6,
  },
  streamingPulseText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  citationsScroll: {
    gap: Spacing[8],
    paddingRight: 16,
    paddingVertical: 4,
  },
  redesignedCitationCard: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingVertical: 6,
    paddingHorizontal: 10,
    minWidth: 120,
    maxWidth: 200,
  },
  actionRowContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: Spacing[8],
    gap: Spacing[6],
    alignItems: 'center',
  },
  actionScrollContent: {
    gap: Spacing[6],
    paddingRight: 16,
  },
  aiBubble: {
    alignSelf: 'stretch',
    paddingVertical: 4,
    paddingHorizontal: 0,
  },
  disclaimerContainer: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 10,
  },
  disclaimerText: {
    fontSize: 11.5,
    lineHeight: 17,
    color: '#6B7280',
  },
  disclaimerBold: {
    fontWeight: '700',
    color: '#4B5563',
  },
  redesignedActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: Radius.full,
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 1.5,
    elevation: 1,
    marginBottom: 4,
  },
  actionButtonText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  cleanActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 10,
    gap: 14,
    paddingLeft: 0,
  },
  cleanActionBtn: {
    padding: 2,
  },
  bottomSheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  bottomSheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    maxHeight: '85%',
  },
  bottomSheetDragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ECECEC',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  bottomSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  bottomSheetTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1F2937',
  },
  bottomSheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  bottomSheetItemIcon: {
    marginRight: 16,
    width: 24,
    textAlign: 'center',
  },
  bottomSheetItemLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  thinkingDotsWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 24,
    paddingLeft: 4,
    marginTop: 6,
  },
  thinkingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 3,
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  emptyLogoContainer: {
    alignItems: 'center',
    marginBottom: 0,
  },
  emptySparkleBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EEECFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#6D5DFC',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  emptySparkleText: {
    fontSize: 28,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14.5,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  suggestedContainer: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    marginBottom: 20,
  },
  suggestedGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  suggestedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    elevation: 1,
  },
  suggestedChipText: {
    fontSize: 13.5,
    fontWeight: '600',
  },
  editTextInput: {
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    color: '#FFFFFF',
    borderRadius: 8,
    padding: 10,
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: 'top',
    alignSelf: 'stretch',
  },
  editActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
    gap: 8,
  },
  editCancelBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  editCancelBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '600',
  },
  editSaveBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
  },
  editSaveBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  gradientContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 40,
  },
  gradientLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 8,
  },
  userActionRow: {
    flexDirection: 'row',
    alignSelf: 'flex-end',
    marginTop: 4,
    gap: 10,
  },
  userActionButton: {
    padding: 4,
  },
  expandToggleBtn: {
    marginTop: 4,
    alignSelf: 'flex-end',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  expandToggleBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  welcomeButtonsContainer: {
    flexDirection: 'column',
    alignSelf: 'stretch',
    gap: 12,
    marginTop: 8,
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  welcomeButton: {
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  welcomeButtonPrimary: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  welcomeButtonOutline: {
    borderWidth: 1.5,
    backgroundColor: 'transparent',
  },
  welcomeButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  welcomeButtonTextPrimary: {
    color: '#FFFFFF',
  },
  welcomeButtonTextOutline: {
    color: '#1F2937',
  },
});

export interface ChatWelcomeProps {
  title: string;
  subtitle: string;
  icon?: string;
  iconSource?: any;
  suggestedChips?: Array<{ label: string; icon: string }>;
  children?: React.ReactNode;
  onSelectCase?: () => void;
  onNewConversation?: () => void;
  onSelectSuggestedPrompt?: (prompt: string) => void;
}

export const ChatWelcome: React.FC<ChatWelcomeProps> = ({ 
  title, 
  subtitle, 
  icon = '✨', 
  iconSource,
  suggestedChips,
  children,
  onSelectCase,
  onNewConversation,
  onSelectSuggestedPrompt
}) => {
  const { theme } = useThemeContext();
  const { language } = useTranslation();

  const getLabels = () => {
    switch (language) {
      case 'Hindi':
        return { selectCase: 'केस चुनें', newConversation: 'नई बातचीत' };
      case 'Gujarati':
        return { selectCase: 'કેસ પસંદ કરો', newConversation: 'નવી વાતચીત' };
      case 'Marathi':
        return { selectCase: 'केस निवडा', newConversation: 'नवीन संभाषण' };
      case 'Tamil':
        return { selectCase: 'வழக்கைத் தேர்ந்தெடுக்கவும்', newConversation: 'புதிய உரையாடல்' };
      case 'Bilingual':
        return { selectCase: 'Select Case / केस चुनें', newConversation: 'New Conversation / नई बातचीत' };
      case 'English':
      default:
        return { selectCase: 'Select Case', newConversation: 'New Conversation' };
    }
  };

  const labels = getLabels();

  const chipsToRender = suggestedChips || [
    { label: 'Summarize this case', icon: 'document-text-outline' },
    { label: 'Analyze evidence', icon: 'search-outline' },
    { label: 'Draft legal notice', icon: 'create-outline' },
    { label: 'Predict case outcome', icon: 'trending-up-outline' }
  ];

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.emptyContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.emptyLogoContainer}>
        <Image 
          source={iconSource || require('../../../assets/images/ai_assistant_3d.png')} 
          style={{ width: 95, height: 95, marginBottom: 8 }} 
          resizeMode="contain" 
        />
        <Text style={[styles.emptyTitle, { color: theme.textPrimary || '#1F2937' }]}>{title}</Text>
        <Text style={[styles.emptySubtitle, { color: theme.textSecondary || '#6B7280' }]}>{subtitle}</Text>
      </View>

      <View style={styles.suggestedContainer}>
        <View style={styles.suggestedGrid}>
          {chipsToRender.map((chip, idx) => (
            <TouchableOpacity
              key={idx}
              style={[
                styles.suggestedChip, 
                { 
                  backgroundColor: theme.surfaceVariant || '#F8FAFC', 
                  borderColor: theme.border || '#E2E8F0' 
                }
              ]}
              onPress={() => onSelectSuggestedPrompt?.(chip.label)}
              activeOpacity={0.7}
            >
              <Ionicons name={chip.icon as any} size={16} color={theme.primary || '#6D5DFC'} style={{ marginRight: 6 }} />
              <Text style={[styles.suggestedChipText, { color: theme.textPrimary || '#1F2937' }]}>
                {chip.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {(onSelectCase || onNewConversation) && (
        <View style={styles.welcomeButtonsContainer}>
          {onSelectCase && (
            <TouchableOpacity 
              style={[styles.welcomeButton, styles.welcomeButtonPrimary, { backgroundColor: theme.primary }]} 
              onPress={onSelectCase}
            >
              <Text style={[styles.welcomeButtonText, styles.welcomeButtonTextPrimary]}>{labels.selectCase}</Text>
            </TouchableOpacity>
          )}
          {onNewConversation && (
            <TouchableOpacity 
              style={[styles.welcomeButton, styles.welcomeButtonOutline, { borderColor: theme.border || '#E2E8F0' }]} 
              onPress={onNewConversation}
            >
              <Text style={[styles.welcomeButtonText, styles.welcomeButtonTextOutline, { color: theme.textPrimary }]}>{labels.newConversation}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {children}
    </ScrollView>
  );
};

export * from './composer';
export * from './layout';
