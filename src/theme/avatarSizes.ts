/**
 * AI Legal Mobile - Avatar Size Tokens
 */
export const AvatarSizes = {
  sm: 24,
  md: 32,
  lg: 48,
  xl: 64,
  xxl: 96,
} as const;

export type AvatarSizeToken = keyof typeof AvatarSizes;
export default AvatarSizes;
