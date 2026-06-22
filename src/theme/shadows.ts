/**
 * AI Legal Mobile - Elevation & Shadow Tokens
 * Centralized z-index layers, cross-platform shadow styles, and opacity tokens.
 */

import { Platform, ViewStyle } from 'react-native';

export const ZIndex = {
  bottom: -1,
  base: 0,
  dropdown: 10,
  sticky: 20,
  nav: 30,
  modal: 40,
  toast: 50,
  max: 9999,
} as const;

export const Opacity = {
  transparent: 0,
  subtle: 0.08,
  cardShadow: 0.1,
  disabled: 0.38,
  inactive: 0.5,
  medium: 0.7,
  solid: 1,
} as const;

interface Shadows {
  none: ViewStyle;
  sm: ViewStyle;
  md: ViewStyle;
  lg: ViewStyle;
  xl: ViewStyle;
}

export const Shadows: Shadows = Platform.select({
  ios: {
    none: {
      shadowColor: 'transparent',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
    },
    sm: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
    },
    md: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 6,
    },
    lg: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.12,
      shadowRadius: 12,
    },
    xl: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 20 },
      shadowOpacity: 0.18,
      shadowRadius: 24,
    },
  },
  android: {
    none: {
      elevation: 0,
    },
    sm: {
      elevation: 2,
    },
    md: {
      elevation: 4,
    },
    lg: {
      elevation: 8,
    },
    xl: {
      elevation: 16,
    },
  },
  default: {
    none: {},
    sm: {},
    md: {},
    lg: {},
    xl: {},
  },
});
