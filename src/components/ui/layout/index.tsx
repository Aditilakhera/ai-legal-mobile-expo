/**
 * AI Legal Mobile - Custom Layout System
 * Flex alignment templates, grids, and safe area layout container wrappers.
 */

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';
import { useThemeContext } from '@/providers';
import { Spacing } from '@/theme';

export interface ScreenContainerProps {
  children: React.ReactNode;
  edges?: Edge[];
  style?: ViewStyle;
}

/**
 * Common layout wrapper conforming to theme background and device safe areas.
 */
export const ScreenContainer: React.FC<ScreenContainerProps> = ({
  children,
  edges = ['top', 'bottom'],
  style,
}) => {
  const { theme } = useThemeContext();

  return (
    <SafeAreaView edges={edges} style={[styles.container, { backgroundColor: theme.background }, style]}>
      {children}
    </SafeAreaView>
  );
};

export interface RowProps {
  children: React.ReactNode;
  gap?: number;
  style?: ViewStyle;
}

/**
 * Flex row wrapper.
 */
export const Row: React.FC<RowProps> = ({ children, gap = Spacing[8], style }) => {
  return (
    <View style={[styles.row, gap ? { gap } : {}, style]}>
      {children}
    </View>
  );
};

export interface ColumnProps {
  children: React.ReactNode;
  gap?: number;
  style?: ViewStyle;
}

/**
 * Flex column wrapper.
 */
export const Column: React.FC<ColumnProps> = ({ children, gap = Spacing[8], style }) => {
  return (
    <View style={[styles.column, gap ? { gap } : {}, style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  column: {
    flexDirection: 'column',
  },
});
