/**
 * AI Legal Mobile - Custom Empty States
 * Reusable placeholder screens for files, queries, and case timelines.
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useThemeContext } from '@/providers';
import { Spacing } from '@/theme';
import { Button } from '../buttons';

export interface EmptyStateProps {
  title: string;
  description: string;
  icon?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: ViewStyle;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon = '📁',
  actionLabel,
  onAction,
  style,
}) => {
  const { theme } = useThemeContext();

  return (
    <View style={[styles.centeredContainer, style]}>
      <Text style={styles.stateIcon}>{icon}</Text>
      <Text style={[styles.stateTitle, { color: theme.textPrimary }]}>{title}</Text>
      <Text style={[styles.stateDesc, { color: theme.textSecondary }]}>{description}</Text>
      {actionLabel && onAction && (
        <Button title={actionLabel} onPress={onAction} style={{ marginTop: Spacing[16] }} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  centeredContainer: {
    padding: Spacing[24],
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  stateIcon: {
    fontSize: 48,
    marginBottom: Spacing[12],
  },
  stateTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  stateDesc: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: Spacing[8],
    maxWidth: 280,
  },
});
