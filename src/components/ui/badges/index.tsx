/**
 * AI Legal Mobile - Custom Badge Components
 * Inline status badges, alerts notifications dots, and tools tags.
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useThemeContext } from '@/providers';
import { Spacing, Radius, StatusColors } from '@/theme';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export interface BadgeProps {
  label?: string | number;
  variant?: BadgeVariant;
  isDot?: boolean;
  style?: ViewStyle;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'neutral',
  isDot = false,
  style,
}) => {
  const { theme } = useThemeContext();

  const getVariantStyles = (): { backgroundColor: string; color: string } => {
    switch (variant) {
      case 'success':
        return {
          backgroundColor: StatusColors.success.light,
          color: StatusColors.success.primary,
        };
      case 'warning':
        return {
          backgroundColor: StatusColors.warning.light,
          color: StatusColors.warning.primary,
        };
      case 'danger':
        return {
          backgroundColor: StatusColors.danger.light,
          color: StatusColors.danger.primary,
        };
      case 'info':
        return {
          backgroundColor: StatusColors.info.light,
          color: StatusColors.info.primary,
        };
      case 'neutral':
      default:
        return {
          backgroundColor: theme.surfaceVariant,
          color: theme.textSecondary,
        };
    }
  };

  const { backgroundColor, color } = getVariantStyles();

  if (isDot) {
    return (
      <View
        style={[
          styles.dot,
          { backgroundColor: variant === 'neutral' ? theme.textSecondary : StatusColors[variant === 'info' ? 'info' : variant === 'success' ? 'success' : variant === 'warning' ? 'warning' : 'danger'].primary },
          style,
        ]}
      />
    );
  }

  return (
    <View style={[styles.badge, { backgroundColor }, style]}>
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: Spacing[8],
    paddingVertical: Spacing[4],
    borderRadius: Radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: Radius.full,
  },
});
