/**
 * AI Legal Mobile - Icon Size Tokens
 */
export const IconSizes = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
  xxl: 40,
} as const;

export type IconSizeToken = keyof typeof IconSizes;
export default IconSizes;
