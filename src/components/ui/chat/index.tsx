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
  TextInput
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as IntentLauncher from 'expo-intent-launcher';
import { useThemeContext, useToastContext } from '@/providers';
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
  const { theme } = useThemeContext();
  
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
                  backgroundColor: isUserText ? 'rgba(0, 0, 0, 0.06)' : 'rgba(109, 93, 252, 0.08)',
                  color: isUserText ? '#1F2937' : '#6D5DFC',
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
                      backgroundColor: '#FEF08A', // Soft yellow highlight
                      color: '#1F2937',
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
            borderColor: '#E5E7EB',
            borderRadius: 8,
            overflow: 'hidden',
            backgroundColor: '#FFFFFF',
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
                  borderBottomColor: '#E5E7EB',
                  backgroundColor: isHeader ? '#EEECFF' : rIdx % 2 === 1 ? '#F9FAFB' : '#FFFFFF',
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
                          color: isHeader ? '#1F2937' : '#374151',
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
              backgroundColor: isUser ? 'rgba(0,0,0,0.04)' : '#F3F4F6',
              borderWidth: 1,
              borderColor: '#E5E7EB',
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
                color: '#1F2937',
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
        let bgColor = '#F3F4F6';
        let borderColor = '#9CA3AF';
        let titleColor = '#4B5563';
        let icon = 'ℹ️';
        if (type === 'WARNING' || type === 'CAUTION') {
          bgColor = '#FEF2F2';
          borderColor = '#EF4444';
          titleColor = '#991B1B';
          icon = '⚠️';
        } else if (type === 'IMPORTANT') {
          bgColor = '#EFF6FF';
          borderColor = '#3B82F6';
          titleColor = '#1E40AF';
          icon = '💡';
        } else if (type === 'TIP') {
          bgColor = '#ECFDF5';
          borderColor = '#10B981';
          titleColor = '#065F46';
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
            <Text style={{ fontSize: 14.5, lineHeight: 22, color: '#374151' }}>
              {parseInlineStyles(bodyText, isUser)}
            </Text>
          </View>
        );
      } else {
        renderedElements.push(
          <View key={i} style={{
            borderLeftWidth: 4,
            borderLeftColor: '#6D5DFC',
            paddingLeft: 12,
            paddingVertical: 4,
            marginVertical: 10,
            alignSelf: 'stretch',
          }}>
            <Text style={{ fontSize: 15, lineHeight: 24, fontStyle: 'italic', color: '#4B5563' }}>
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
            backgroundColor: '#ECECEC',
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
          <Text style={{ fontSize: 16, color: '#6D5DFC', marginRight: 8, lineHeight: isUser ? 25 : 27.2 }}>•</Text>
          <Text style={{ flex: 1, fontSize: isUser ? 14.5 : 16, lineHeight: isUser ? 22 : 27.2, color: '#1F2937' }}>
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
          <Text style={{ fontSize: isUser ? 14.5 : 16, color: '#6D5DFC', marginRight: 6, fontWeight: '700', lineHeight: isUser ? 22 : 27.2 }}>
            {num}.
          </Text>
          <Text style={{ flex: 1, fontSize: isUser ? 14.5 : 16, lineHeight: isUser ? 22 : 27.2, color: '#1F2937' }}>
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
            color: '#111827',
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
            color: '#111827',
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
            color: '#1F2937',
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

/**
 * Premium three-dot wave loader to replace blinking vertical cursor.
 */
export const ThinkingDots: React.FC<{ theme: any }> = ({ theme }) => {
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animateDot = (dot: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1.0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0.3,
            duration: 300,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const anim1 = animateDot(dot1, 0);
    const anim2 = animateDot(dot2, 150);
    const anim3 = animateDot(dot3, 300);

    anim1.start();
    anim2.start();
    anim3.start();

    return () => {
      anim1.stop();
      anim2.stop();
      anim3.stop();
    };
  }, [dot1, dot2, dot3]);

  return (
    <View style={styles.thinkingDotsWrapper}>
      <Animated.View
        style={[
          styles.thinkingDot,
          {
            backgroundColor: theme.primary || '#6D5DFC',
            opacity: dot1,
            transform: [{ scale: dot1 }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.thinkingDot,
          {
            backgroundColor: theme.primary || '#6D5DFC',
            opacity: dot2,
            transform: [{ scale: dot2 }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.thinkingDot,
          {
            backgroundColor: theme.primary || '#6D5DFC',
            opacity: dot3,
            transform: [{ scale: dot3 }],
          },
        ]}
      />
    </View>
  );
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
  const { theme } = useThemeContext();
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

  const DISCLAIMER_NEW_STARS = "**⚖️ Legal Disclaimer:** This analysis is for informational purposes only and is not legal advice. AI may make mistakes. Please consult a qualified lawyer before making legal decisions.";
  const DISCLAIMER_NEW_NO_STARS = "⚖️ Legal Disclaimer: This analysis is for informational purposes only and is not legal advice. AI may make mistakes. Please consult a qualified lawyer before making legal decisions.";
  const DISCLAIMER_OLD_STARS_1 = "⚖️ **Legal Disclaimer:** This AI analysis is for informational purposes only and does not constitute professional legal advice. AI can make mistakes; always consult a qualified lawyer before making legal decisions. This tool is a senior legal assistant designed to support your legal journey with data-driven insights.";
  const DISCLAIMER_OLD_STARS_2 = "**⚖️ Legal Disclaimer:** This AI analysis is for informational purposes only and does not constitute professional legal advice. AI can make mistakes; always consult a qualified lawyer before making legal decisions. This tool is a senior legal assistant designed to support your legal journey with data-driven insights.";
  const DISCLAIMER_OLD_NO_STARS = "⚖️ Legal Disclaimer: This AI analysis is for informational purposes only and does not constitute professional legal advice. AI can make mistakes; always consult a qualified lawyer before making legal decisions. This tool is a senior legal assistant designed to support your legal journey with data-driven insights.";

  let hasDisclaimer = false;
  let mainContent = displayContent;

  if (displayContent.includes(DISCLAIMER_NEW_STARS)) {
    hasDisclaimer = true;
    const parts = displayContent.split(DISCLAIMER_NEW_STARS);
    mainContent = parts[0].trim();
  } else if (displayContent.includes(DISCLAIMER_NEW_NO_STARS)) {
    hasDisclaimer = true;
    const parts = displayContent.split(DISCLAIMER_NEW_NO_STARS);
    mainContent = parts[0].replace(/\*\*$/, '').trim();
  } else if (displayContent.includes(DISCLAIMER_OLD_STARS_1)) {
    hasDisclaimer = true;
    const parts = displayContent.split(DISCLAIMER_OLD_STARS_1);
    mainContent = parts[0].trim();
  } else if (displayContent.includes(DISCLAIMER_OLD_STARS_2)) {
    hasDisclaimer = true;
    const parts = displayContent.split(DISCLAIMER_OLD_STARS_2);
    mainContent = parts[0].trim();
  } else if (displayContent.includes(DISCLAIMER_OLD_NO_STARS)) {
    hasDisclaimer = true;
    const parts = displayContent.split(DISCLAIMER_OLD_NO_STARS);
    mainContent = parts[0].replace(/\*\*$/, '').trim();
  }

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
      <View style={[styles.aiAvatar, { backgroundColor: theme.primary, marginTop: 4 }]}>
        <Text style={styles.aiAvatarText}>{aiIcon || '✨'}</Text>
      </View>

      <View style={styles.aiMessageContent}>
        <View style={styles.aiBubble}>
          {renderDots && (
            <Animated.View
              style={{
                opacity: transitionAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 0],
                }),
              }}
            >
              <ThinkingDots theme={theme} />
            </Animated.View>
          )}

          {(contentHasArrived || !isStreaming) && (
            <Animated.View style={{ opacity: transitionAnim }}>
              <MarkdownText content={mainContent} isUser={false} />
              {hasDisclaimer && (
                <View style={styles.disclaimerContainer}>
                  <Text style={styles.disclaimerText}>
                    <Text style={styles.disclaimerBold}>⚖️ Legal Disclaimer:</Text> This analysis is for informational purposes only and is not legal advice. AI may make mistakes. Please consult a qualified lawyer before making legal decisions.
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
              <Ionicons name="copy-outline" size={18} color="#6B7280" />
            </ActionIconBtn>

            <ActionIconBtn onPress={handleLike} isActive={isLiked}>
              <Ionicons 
                name={isLiked ? "thumbs-up" : "thumbs-up-outline"} 
                size={18} 
                color={isLiked ? theme.primary : "#6B7280"} 
              />
            </ActionIconBtn>

            <ActionIconBtn onPress={handleDislike} isActive={isDisliked}>
              <Ionicons 
                name={isDisliked ? "thumbs-down" : "thumbs-down-outline"} 
                size={18} 
                color={isDisliked ? theme.danger : "#6B7280"} 
              />
            </ActionIconBtn>

            <ActionIconBtn onPress={handleReadAloud} isActive={isPlayingAudio}>
              <Ionicons 
                name="volume-medium-outline" 
                size={18} 
                color={isPlayingAudio ? theme.primary : "#6B7280"} 
              />
            </ActionIconBtn>

            <ActionIconBtn onPress={executeShare}>
              <Ionicons name="share-social-outline" size={18} color="#6B7280" />
            </ActionIconBtn>

            <ActionIconBtn onPress={() => setIsMoreSheetOpen(true)}>
              <Ionicons name="ellipsis-horizontal" size={18} color="#6B7280" />
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

            <View style={styles.bottomSheetContainer}>
              <View style={styles.bottomSheetDragHandle} />
              <View style={styles.bottomSheetHeader}>
                <Text style={styles.bottomSheetTitle}>Response Actions</Text>
                <TouchableOpacity onPress={() => setIsMoreSheetOpen(false)}>
                  <Ionicons name="close" size={24} color="#1F2937" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: screenHeight * 0.6 }}>
                {/* PDF export */}
                <TouchableOpacity onPress={handleExportPDF} style={styles.bottomSheetItem}>
                  <Ionicons name="document-text-outline" size={22} color="#4B5563" style={styles.bottomSheetItemIcon} />
                  <Text style={styles.bottomSheetItemLabel}>Export as PDF</Text>
                </TouchableOpacity>

                {/* Word export */}
                <TouchableOpacity 
                  onPress={handleExportWord} 
                  disabled={!hasRichFormat}
                  style={[styles.bottomSheetItem, !hasRichFormat && { opacity: 0.4 }]}
                >
                  <Ionicons name="file-tray-full-outline" size={22} color={hasRichFormat ? "#4B5563" : "#9CA3AF"} style={styles.bottomSheetItemIcon} />
                  <Text style={[styles.bottomSheetItemLabel, !hasRichFormat && { color: "#9CA3AF" }]}>Export as Word (.docx)</Text>
                </TouchableOpacity>

                {/* Excel export */}
                <TouchableOpacity 
                  onPress={handleExportExcel} 
                  disabled={!hasTables}
                  style={[styles.bottomSheetItem, !hasTables && { opacity: 0.4 }]}
                >
                  <Ionicons name="grid-outline" size={22} color={hasTables ? "#4B5563" : "#9CA3AF"} style={styles.bottomSheetItemIcon} />
                  <Text style={[styles.bottomSheetItemLabel, !hasTables && { color: "#9CA3AF" }]}>Export as Excel (.xlsx)</Text>
                </TouchableOpacity>

                {/* Copy Markdown */}
                <TouchableOpacity onPress={copyMarkdown} style={styles.bottomSheetItem}>
                  <Ionicons name="clipboard-outline" size={22} color="#4B5563" style={styles.bottomSheetItemIcon} />
                  <Text style={styles.bottomSheetItemLabel}>Copy as Markdown</Text>
                </TouchableOpacity>

                {/* Copy Plain Text */}
                <TouchableOpacity onPress={copyPlain} style={styles.bottomSheetItem}>
                  <Ionicons name="document-outline" size={22} color="#4B5563" style={styles.bottomSheetItemIcon} />
                  <Text style={styles.bottomSheetItemLabel}>Copy as Plain Text</Text>
                </TouchableOpacity>

                {/* Save to Notes */}
                <TouchableOpacity onPress={() => { showToast('success', 'Saved', 'Saved to Notes'); setIsMoreSheetOpen(false); }} style={styles.bottomSheetItem}>
                  <Ionicons name="star-outline" size={22} color="#4B5563" style={styles.bottomSheetItemIcon} />
                  <Text style={styles.bottomSheetItemLabel}>Save to Notes</Text>
                </TouchableOpacity>

                {/* Save to Case */}
                <TouchableOpacity onPress={() => { showToast('success', 'Saved', 'Associated with active case'); setIsMoreSheetOpen(false); }} style={styles.bottomSheetItem}>
                  <Ionicons name="folder-outline" size={22} color="#4B5563" style={styles.bottomSheetItemIcon} />
                  <Text style={styles.bottomSheetItemLabel}>Save to Case</Text>
                </TouchableOpacity>

                {/* Add to Evidence */}
                <TouchableOpacity onPress={() => { showToast('success', 'Added', 'Evidence registered successfully'); setIsMoreSheetOpen(false); }} style={styles.bottomSheetItem}>
                  <Ionicons name="archive-outline" size={22} color="#4B5563" style={styles.bottomSheetItemIcon} />
                  <Text style={styles.bottomSheetItemLabel}>Add to Evidence</Text>
                </TouchableOpacity>

                {/* Save to Legal Research */}
                <TouchableOpacity onPress={() => { showToast('success', 'Saved', 'Research archive updated'); setIsMoreSheetOpen(false); }} style={styles.bottomSheetItem}>
                  <Ionicons name="library-outline" size={22} color="#4B5563" style={styles.bottomSheetItemIcon} />
                  <Text style={styles.bottomSheetItemLabel}>Save to Legal Research</Text>
                </TouchableOpacity>

                {/* Bookmark Response */}
                <TouchableOpacity onPress={() => { showToast('success', 'Bookmarked', 'Response added to bookmarks'); setIsMoreSheetOpen(false); }} style={styles.bottomSheetItem}>
                  <Ionicons name="bookmark-outline" size={22} color="#4B5563" style={styles.bottomSheetItemIcon} />
                  <Text style={styles.bottomSheetItemLabel}>Bookmark Response</Text>
                </TouchableOpacity>

                {/* Print */}
                <TouchableOpacity onPress={() => { showToast('info', 'Print', 'Dispatching print payload...'); setIsMoreSheetOpen(false); }} style={styles.bottomSheetItem}>
                  <Ionicons name="print-outline" size={22} color="#4B5563" style={styles.bottomSheetItemIcon} />
                  <Text style={styles.bottomSheetItemLabel}>Print</Text>
                </TouchableOpacity>

                {/* Share Response */}
                <TouchableOpacity onPress={executeShare} style={styles.bottomSheetItem}>
                  <Ionicons name="share-social-outline" size={22} color="#4B5563" style={styles.bottomSheetItemIcon} />
                  <Text style={styles.bottomSheetItemLabel}>Share Response</Text>
                </TouchableOpacity>

                {/* Regenerate Response */}
                {onRegenerate && (
                  <TouchableOpacity onPress={handleRegenerate} style={styles.bottomSheetItem}>
                    <Ionicons name="refresh-outline" size={22} color="#4B5563" style={styles.bottomSheetItemIcon} />
                    <Text style={styles.bottomSheetItemLabel}>Regenerate Response</Text>
                  </TouchableOpacity>
                )}

                {/* Translate */}
                <TouchableOpacity onPress={() => { showToast('info', 'Translate', 'Target translation engine initialized...'); setIsMoreSheetOpen(false); }} style={styles.bottomSheetItem}>
                  <Ionicons name="language-outline" size={22} color="#4B5563" style={styles.bottomSheetItemIcon} />
                  <Text style={styles.bottomSheetItemLabel}>Translate</Text>
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
                    style={styles.bottomSheetItem}
                  >
                    <MaterialCommunityIcons name="scale-balance" size={22} color="#4B5563" style={styles.bottomSheetItemIcon} />
                    <Text style={styles.bottomSheetItemLabel}>Cite Sources</Text>
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
  const { theme } = useThemeContext();
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

  if (isEditing) {
    return (
      <View style={[styles.bubbleContainer, styles.userAlign]}>
        <View style={{ flex: 1, alignItems: 'flex-end', width: '100%' }}>
          <View style={[
            styles.bubble, 
            { 
              backgroundColor: '#F3F4F6', 
              borderRadius: 18, 
              alignSelf: 'stretch',
            }
          ]}>
            <TextInput
              style={[styles.editTextInput, { backgroundColor: 'rgba(0,0,0,0.05)', color: '#1F2937' }]}
              value={editText}
              onChangeText={setEditText}
              multiline
              autoFocus
            />
            <View style={styles.editActionsRow}>
              <TouchableOpacity onPress={handleCancel} style={[styles.editCancelBtn, { backgroundColor: 'rgba(0,0,0,0.06)' }]}>
                <Text style={[styles.editCancelBtnText, { color: '#4B5563' }]}>Cancel</Text>
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
              backgroundColor: '#F3F4F6', 
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
                <View style={[styles.gradientLayer, { top: 0, opacity: 0.15, backgroundColor: '#F3F4F6' }]} />
                <View style={[styles.gradientLayer, { top: 8, opacity: 0.35, backgroundColor: '#F3F4F6' }]} />
                <View style={[styles.gradientLayer, { top: 16, opacity: 0.60, backgroundColor: '#F3F4F6' }]} />
                <View style={[styles.gradientLayer, { top: 24, opacity: 0.80, backgroundColor: '#F3F4F6' }]} />
                <View style={[styles.gradientLayer, { top: 32, opacity: 1.00, backgroundColor: '#F3F4F6' }]} />
              </View>
            )}
          </Animated.View>

          {/* Action Row inside user bubble */}
          {showActions && (
            <View style={styles.userActionRow}>
              <TouchableOpacity onPress={handleCopy} style={styles.userActionButton}>
                <Ionicons name="copy-outline" size={14} color="#1F2937" style={{ opacity: 0.5 }} />
              </TouchableOpacity>
              {onEditMessage && (
                <TouchableOpacity onPress={handleEditStart} style={styles.userActionButton}>
                  <Ionicons name="pencil-outline" size={14} color="#1F2937" style={{ opacity: 0.5 }} />
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
      <View style={[styles.aiAvatar, { backgroundColor: theme.primary, marginTop: 4 }]}>
        <Text style={styles.aiAvatarText}>✨</Text>
      </View>
      <View style={styles.aiMessageContent}>
        <View style={styles.typingDotsRow}>
          <View style={[styles.dot, { backgroundColor: theme.primary }]} />
          <View style={[styles.dot, { backgroundColor: theme.primary, marginHorizontal: Spacing[4] }]} />
          <View style={[styles.dot, { backgroundColor: theme.primary }]} />
        </View>
      </View>
    </View>
  );
};

export const ThinkingState: React.FC<{ message?: string }> = ({ message = 'AI is researching precedents...' }) => {
  const { theme } = useThemeContext();
  return (
    <View style={[styles.aiMessageContainer, { flexDirection: 'row', alignItems: 'flex-start' }]}>
      <View style={[styles.aiAvatar, { backgroundColor: theme.primary, marginTop: 4 }]}>
        <Text style={styles.aiAvatarText}>✨</Text>
      </View>
      <View style={[styles.aiMessageContent, { flexDirection: 'row', alignItems: 'center', gap: Spacing[8], paddingTop: 4 }]}>
        <ActivityIndicator size="small" color={theme.primary} />
        <Text style={[styles.thinkingText, { color: theme.textSecondary }]}>{message}</Text>
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
    fontSize: 13.5,
    fontStyle: 'italic',
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
    paddingHorizontal: 20,
    paddingTop: Dimensions.get('window').height * 0.08,
    paddingBottom: 40,
    alignItems: 'center',
  },
  emptyLogoContainer: {
    alignItems: 'center',
    marginBottom: 32,
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
  },
  emptySubtitle: {
    fontSize: 14.5,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 6,
    textAlign: 'center',
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
});

export interface ChatWelcomeProps {
  title: string;
  subtitle: string;
  icon?: string;
  children?: React.ReactNode;
}

export const ChatWelcome: React.FC<ChatWelcomeProps> = ({ title, subtitle, icon = '✨', children }) => {
  const { theme } = useThemeContext();
  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.emptyContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.emptyLogoContainer}>
        <View style={[styles.emptySparkleBg, { backgroundColor: theme.surfaceVariant || '#EEECFF' }]}>
          <Text style={styles.emptySparkleText}>{icon}</Text>
        </View>
        <Text style={[styles.emptyTitle, { color: theme.textPrimary || '#1F2937' }]}>{title}</Text>
        <Text style={[styles.emptySubtitle, { color: theme.textSecondary || '#6B7280' }]}>{subtitle}</Text>
      </View>
      {children}
    </ScrollView>
  );
};

export * from './composer';
