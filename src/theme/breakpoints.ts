/**
 * AI Legal Mobile - Responsive Layout Breakpoints
 */
export const Breakpoints = {
  phoneSmall: 320,
  phoneMedium: 375,
  phoneLarge: 414,
  foldable: 600,
  tablet: 768,
  tabletLarge: 1024,
} as const;

export type BreakpointToken = keyof typeof Breakpoints;
export default Breakpoints;
