/**
 * AI Legal Mobile - Custom Chip System
 * Provides quick selection pills, category tags, filters, and action indicators.
 */

import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { useThemeContext } from '@/providers';
import { Spacing, Radius, Opacity } from '@/theme';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  variant?: 'action' | 'filter' | 'suggestion' | 'status';
  statusColor?: string;
  icon?: string;
  style?: ViewStyle;
}

export const Chip: React.FC<ChipProps> = ({
  label,
  selected = false,
  onPress,
  variant = 'action',
  statusColor,
  icon,
  style,
}) => {
  const { theme } = useThemeContext();

  const getVariantStyles = (): { container: ViewStyle; text: TextStyle } => {
    switch (variant) {
      case 'filter':
        return {
          container: {
            backgroundColor: selected ? theme.primary : theme.surface,
            borderColor: selected ? theme.primary : theme.border,
            borderWidth: 1.5,
          },
          text: {
            color: selected ? '#FFFFFF' : theme.textSecondary,
            fontWeight: selected ? '700' : '500',
          },
        };
      case 'status':
        return {
          container: {
            backgroundColor: statusColor ? `${statusColor}1A` : theme.surfaceVariant,
            borderColor: statusColor || theme.border,
            borderWidth: 1,
          },
          text: {
            color: statusColor || theme.textPrimary,
            fontWeight: '700',
          },
        };
      case 'suggestion':
        return {
          container: {
            backgroundColor: theme.surface,
            borderColor: theme.primary,
            borderWidth: 1,
          },
          text: {
            color: theme.primary,
            fontWeight: '500',
          },
        };
      case 'action':
      default:
        return {
          container: {
            backgroundColor: selected ? theme.primary : theme.surfaceVariant,
          },
          text: {
            color: selected ? '#FFFFFF' : theme.textPrimary,
            fontWeight: selected ? '700' : '500',
          },
        };
    }
  };

  const variantStyles = getVariantStyles();

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={Opacity.pressed}
      disabled={!onPress}
      style={[
        styles.chip,
        variantStyles.container,
        style || {},
      ]}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityState={onPress ? { selected } : undefined}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Text style={[styles.chipText, variantStyles.text]}>
        {icon ? `${icon} ` : ''}
        {label}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: Spacing[12],
    paddingVertical: Spacing[6],
    borderRadius: Radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    minHeight: 32,
  },
  chipText: {
    fontSize: 13,
  },
});
