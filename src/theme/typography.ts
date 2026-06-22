/**
 * AI Legal Mobile - Typography System Tokens
 * Configures font scales, weights, leading heights, and track spacings.
 */

import { Platform } from 'react-native';

export const Fonts = Platform.select({
  ios: {
    sans: 'System',
    serif: 'Georgia',
    mono: 'Courier New',
    rounded: 'System',
  },
  android: {
    sans: 'sans-serif',
    serif: 'serif',
    mono: 'monospace',
    rounded: 'sans-serif-condensed',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    mono: 'monospace',
    rounded: 'normal',
  },
});

export const FontWeights = {
  light: '300',
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  heavy: '800',
} as const;

export const Typography = {
  displayXL: {
    fontFamily: Fonts.sans,
    fontSize: 48,
    lineHeight: 56,
    letterSpacing: -1,
    fontWeight: FontWeights.heavy,
  },
  displayL: {
    fontFamily: Fonts.sans,
    fontSize: 40,
    lineHeight: 48,
    letterSpacing: -0.5,
    fontWeight: FontWeights.bold,
  },
  displayM: {
    fontFamily: Fonts.sans,
    fontSize: 36,
    lineHeight: 44,
    letterSpacing: -0.5,
    fontWeight: FontWeights.bold,
  },
  headingXL: {
    fontFamily: Fonts.sans,
    fontSize: 32,
    lineHeight: 40,
    letterSpacing: -0.25,
    fontWeight: FontWeights.semibold,
  },
  headingL: {
    fontFamily: Fonts.sans,
    fontSize: 28,
    lineHeight: 36,
    letterSpacing: 0,
    fontWeight: FontWeights.semibold,
  },
  headingM: {
    fontFamily: Fonts.sans,
    fontSize: 24,
    lineHeight: 32,
    letterSpacing: 0,
    fontWeight: FontWeights.semibold,
  },
  title: {
    fontFamily: Fonts.sans,
    fontSize: 20,
    lineHeight: 28,
    letterSpacing: 0.15,
    fontWeight: FontWeights.semibold,
  },
  subtitle: {
    fontFamily: Fonts.sans,
    fontSize: 18,
    lineHeight: 26,
    letterSpacing: 0.1,
    fontWeight: FontWeights.medium,
  },
  bodyLarge: {
    fontFamily: Fonts.sans,
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0.5,
    fontWeight: FontWeights.regular,
  },
  bodyMedium: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.25,
    fontWeight: FontWeights.regular,
  },
  bodySmall: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.4,
    fontWeight: FontWeights.regular,
  },
  caption: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.4,
    fontWeight: FontWeights.regular,
  },
  overline: {
    fontFamily: Fonts.sans,
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 1.5,
    fontWeight: FontWeights.bold,
    textTransform: 'uppercase' as const,
  },
  label: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.5,
    fontWeight: FontWeights.medium,
  },
  button: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 1.25,
    fontWeight: FontWeights.bold,
    textTransform: 'uppercase' as const,
  },
  chatMessage: {
    fontFamily: Fonts.sans,
    fontSize: 15,
    lineHeight: 22,
    letterSpacing: 0.2,
    fontWeight: FontWeights.regular,
  },
  legalContent: {
    fontFamily: Fonts.serif,
    fontSize: 15,
    lineHeight: 24,
    letterSpacing: 0.1,
    fontWeight: FontWeights.regular,
  },
  markdown: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    lineHeight: 22,
    letterSpacing: 0.1,
    fontWeight: FontWeights.regular,
  },
  code: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: FontWeights.regular,
  },
} as const;

export type TypographyStyle = typeof Typography;
export default Typography;
