/**
 * AI Legal Mobile - Opacity Tokens
 */
export const Opacity = {
  transparent: 0,
  hover: 0.08,
  pressed: 0.16,
  disabled: 0.38,
  inactive: 0.5,
  medium: 0.7,
  solid: 1,
  overlay: 0.4,
} as const;

export type OpacityToken = keyof typeof Opacity;
export default Opacity;
