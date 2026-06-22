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
 * Simple client-side Markdown syntax renderer for chat responses and briefs.
 */
export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ text }) => {
  const { theme } = useThemeContext();

  const parseLines = () => {
    return text.split('\n').map((line, idx) => {
      // Header H3
      if (line.startsWith('### ')) {
        return (
          <Text key={idx} style={[styles.h3, { color: theme.textPrimary }]}>
            {line.replace('### ', '')}
          </Text>
        );
      }
      // Header H2
      if (line.startsWith('## ')) {
        return (
          <Text key={idx} style={[styles.h2, { color: theme.textPrimary }]}>
            {line.replace('## ', '')}
          </Text>
        );
      }
      // Unordered list bullet
      if (line.startsWith('- ') || line.startsWith('* ')) {
        return (
          <Text key={idx} style={[styles.listItem, { color: theme.textSecondary }]}>
            • {line.substring(2)}
          </Text>
        );
      }
      // Simple paragraph
      return (
        <Text key={idx} style={[styles.paragraph, { color: theme.textSecondary }]}>
          {line}
        </Text>
      );
    });
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
    fontSize: 18,
    fontWeight: '700',
    marginTop: Spacing[16],
    marginBottom: Spacing[8],
  },
  h3: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: Spacing[12],
    marginBottom: Spacing[6],
  },
  listItem: {
    fontSize: 14,
    lineHeight: 20,
    marginLeft: Spacing[8],
    marginVertical: Spacing[2],
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 21,
    marginVertical: Spacing[4],
  },
});
