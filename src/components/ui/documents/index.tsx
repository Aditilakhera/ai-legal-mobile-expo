/**
 * AI Legal Mobile - Legal Document Renderers & Viewers
 * Lightweight Markdown parsing fallbacks, structured document containers, and Notice views.
 */

import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { useThemeContext } from '@/providers';
import { Spacing, Radius } from '@/theme';
import { LegalNoticePreview } from '../legal';

export interface DocumentViewerProps {
  title: string;
  content: string;
  metadata?: Record<string, string>;
}

/**
 * Standard Document viewer content pane.
 */
export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  title,
  content,
  metadata,
}) => {
  const { theme } = useThemeContext();

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.textPrimary }]}>{title}</Text>
      
      {metadata && Object.keys(metadata).length > 0 && (
        <View style={[styles.metadataBox, { backgroundColor: theme.surfaceVariant }]}>
          {Object.entries(metadata).map(([key, val]) => (
            <Text key={key} style={[styles.metaText, { color: theme.textSecondary }]}>
              <Text style={{ fontWeight: '700' }}>{key}:</Text> {val}
            </Text>
          ))}
        </View>
      )}

      <Text style={[styles.contentBody, { color: theme.textPrimary }]}>{content}</Text>
    </ScrollView>
  );
};

export interface MarkdownRendererProps {
  text: string;
}

/**
 * Premium client-side Markdown syntax renderer for chat responses and briefs.
 */
export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ text }) => {
  const { theme } = useThemeContext();

  // Helper to parse bold markdown segments inline (Step 1 & 8)
  const parseInlineStyles = (lineText: string, baseStyle: any) => {
    if (!lineText) return <Text style={baseStyle}></Text>;
    
    // Split text by **bold** markers
    const parts = lineText.split(/(\*\*[^*]+\*\*)/g);
    
    return (
      <Text style={baseStyle}>
        {parts.map((part, index) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            const cleaned = part.substring(2, part.length - 2);
            return (
              <Text key={index} style={{ fontWeight: '800', color: theme.textPrimary }}>
                {cleaned}
              </Text>
            );
          }
          return part;
        })}
      </Text>
    );
  };

  const parseLines = () => {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];

    for (let idx = 0; idx < lines.length; idx++) {
      const line = lines[idx];
      const trimmed = line.trim();

      // Skip completely empty lines, but add vertical spacing
      if (trimmed === '') {
        elements.push(<View key={`empty-${idx}`} style={{ height: 6 }} />);
        continue;
      }

      // Divider (e.g. --- or ***) (Step 1 & 8)
      if (trimmed === '---' || trimmed === '***') {
        elements.push(
          <View key={idx} style={[styles.divider, { backgroundColor: theme.border }]} />
        );
        continue;
      }

      // Blockquotes (e.g. > Quote) (Step 8)
      if (trimmed.startsWith('>')) {
        const cleanedText = trimmed.replace(/^>\s*/, '');
        elements.push(
          <View key={idx} style={[styles.blockquote, { borderLeftColor: '#8A5CF5' }]}>
            {parseInlineStyles(cleanedText, { fontSize: 13, fontStyle: 'italic', lineHeight: 18, color: theme.textSecondary })}
          </View>
        );
        continue;
      }

      // Headings (H1, H2, H3, or legal emojis with uppercase title text) (Step 3)
      const isHeadingPattern = 
        trimmed.startsWith('#') || 
        trimmed.startsWith('##') || 
        trimmed.startsWith('###') || 
        /^(⚖️|🔥|🎯|⚠️|🧠|💣|🧑‍⚖️|🚀|📚|✓)\s+[A-Z\s\(\)]+/.test(trimmed) ||
        /^(CASE POSITION|PRIMARY ARGUMENTS|STRONGEST ARGUMENT|OPPOSITION ARGUMENTS|REBUTTAL STRATEGY|CROSS-EXAMINATION QUESTIONS|COURTROOM NARRATIVE|ARGUMENT STRATEGY|LEGAL BACKING|FINAL CLOSING STATEMENT|SUGGESTED NEXT ACTIONS|PLAINTIFF ARGUMENTS|DEFENCE STRATEGY|CROSS EXAMINATION|JUDGE QUESTIONS)/i.test(trimmed);

      if (isHeadingPattern) {
        // Clean symbols if starts with #
        const cleanedText = trimmed.replace(/^#+\s*/, '');
        elements.push(
          <Text key={idx} style={[styles.h2, { color: theme.textPrimary }]}>
            {cleanedText}
          </Text>
        );
        continue;
      }

      // Lists bullet item (e.g. •, -, *) (Step 4)
      const isListItem = trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ');
      if (isListItem) {
        // Find leading spaces of original line for nesting depth
        const leadingSpaces = line.match(/^\s*/)?.[0].length || 0;
        const cleanedText = trimmed.replace(/^[-*•]\s*/, '');
        elements.push(
          <View key={idx} style={{ flexDirection: 'row', marginLeft: 8 + leadingSpaces * 4, marginVertical: 3, alignItems: 'flex-start' }}>
            <Text style={{ fontSize: 14, color: '#8A5CF5', marginRight: 6, lineHeight: 19 }}>•</Text>
            <View style={{ flex: 1 }}>
              {parseInlineStyles(cleanedText, { fontSize: 13.5, lineHeight: 19, color: theme.textSecondary })}
            </View>
          </View>
        );
        continue;
      }

      // Numbered List Item (e.g. 1. , 2. ) (Step 4)
      const isNumberedItem = /^\d+\.\s+/.test(trimmed);
      if (isNumberedItem) {
        const leadingSpaces = line.match(/^\s*/)?.[0].length || 0;
        const match = trimmed.match(/^(\d+)\.\s+/);
        const number = match ? match[1] : '1';
        const cleanedText = trimmed.replace(/^\d+\.\s+/, '');
        elements.push(
          <View key={idx} style={{ flexDirection: 'row', marginLeft: 8 + leadingSpaces * 4, marginVertical: 3, alignItems: 'flex-start' }}>
            <Text style={{ fontSize: 13.5, fontWeight: '700', color: '#8A5CF5', marginRight: 6, lineHeight: 19 }}>{number}.</Text>
            <View style={{ flex: 1 }}>
              {parseInlineStyles(cleanedText, { fontSize: 13.5, lineHeight: 19, color: theme.textSecondary })}
            </View>
          </View>
        );
        continue;
      }

      // Simple paragraph with inline style parsing (Step 7)
      elements.push(
        <View key={idx} style={styles.paragraphContainer}>
          {parseInlineStyles(trimmed, { fontSize: 13.5, lineHeight: 19.5, color: theme.textSecondary })}
        </View>
      );
    }

    return elements;
  };

  return <View style={styles.markdownContainer}>{parseLines()}</View>;
};

export { LegalNoticePreview as LegalNoticeViewer };

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing[16],
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: Spacing[12],
  },
  metadataBox: {
    padding: Spacing[10],
    borderRadius: Radius.md,
    marginBottom: Spacing[16],
    gap: Spacing[4],
  },
  metaText: {
    fontSize: 13,
  },
  contentBody: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'justify',
  },
  markdownContainer: {
    alignSelf: 'stretch',
  },
  h2: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 14,
    marginBottom: 6,
    lineHeight: 22,
  },
  h3: {
    fontSize: 13.5,
    fontWeight: '800',
    marginTop: 10,
    marginBottom: 4,
    lineHeight: 20,
  },
  listItem: {
    fontSize: 13.5,
    lineHeight: 20,
    marginLeft: Spacing[8],
    marginVertical: Spacing[2],
  },
  paragraph: {
    fontSize: 13.5,
    lineHeight: 21,
    marginVertical: Spacing[4],
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  blockquote: {
    borderLeftWidth: 3,
    paddingLeft: 10,
    marginVertical: 8,
    marginHorizontal: 4,
  },
  paragraphContainer: {
    marginVertical: 4,
  },
});
