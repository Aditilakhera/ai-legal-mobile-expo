/**
 * AI Legal Mobile - Custom Form Helpers
 * Field controllers, validation labels, and input spacing block wrappers.
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useThemeContext } from '@/providers';
import { Spacing } from '@/theme';

export interface FormControlProps {
  label?: string;
  error?: string;
  helperText?: string;
  children: React.ReactNode;
  style?: ViewStyle;
}

/**
 * Standard Form input row validation frame.
 */
export const FormControl: React.FC<FormControlProps> = ({
  label,
  error,
  helperText,
  children,
  style,
}) => {
  const { theme } = useThemeContext();

  return (
    <View style={[styles.container, style]}>
      {!!label && <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>}
      {children}
      {error ? (
        <Text style={[styles.errorText, { color: theme.danger }]}>{error}</Text>
      ) : helperText ? (
        <Text style={[styles.helperText, { color: theme.textMuted }]}>{helperText}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: Spacing[8],
    alignSelf: 'stretch',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: Spacing[4],
  },
  errorText: {
    fontSize: 12,
    marginTop: Spacing[4],
    fontWeight: '500',
  },
  helperText: {
    fontSize: 11,
    marginTop: Spacing[4],
  },
});
