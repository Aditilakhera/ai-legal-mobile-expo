/**
 * AI Legal Mobile - Custom Loader Components
 * Reusable activity spinners and loading overlays.
 */

import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet, ViewStyle } from 'react-native';
import { useThemeContext } from '@/providers';
import { Spacing, Radius } from '@/theme';

export interface SpinnerProps {
  size?: 'small' | 'large';
  color?: string;
  message?: string;
  style?: ViewStyle;
}

export const Spinner: React.FC<SpinnerProps> = ({
  size = 'large',
  color,
  message,
  style,
}) => {
  const { theme } = useThemeContext();

  return (
    <View style={[styles.container, style]}>
      <ActivityIndicator size={size} color={color || theme.primary} />
      {message && (
        <Text style={[styles.message, { color: theme.textSecondary }]}>{message}</Text>
      )}
    </View>
  );
};

export const FullScreenSpinner: React.FC<{ message?: string }> = ({ message }) => {
  const { theme } = useThemeContext();
  return (
    <View style={[styles.fullScreen, { backgroundColor: theme.background }]}>
      <Spinner message={message} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: Spacing[16],
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing[10],
  },
  message: {
    fontSize: 14,
    fontWeight: '500',
  },
  fullScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
