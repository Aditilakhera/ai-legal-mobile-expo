/**
 * AI Legal Mobile - Border Radius Tokens
 */
export const Radius = {
  none: 0,
  xs: 2,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  full: 9999,
} as const;

export type RadiusToken = keyof typeof Radius;
export default Radius;
