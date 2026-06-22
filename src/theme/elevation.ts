/**
 * AI Legal Mobile - Android Elevation Tokens
 */
export const Elevation = {
  none: 0,
  card: 2,
  floating: 4,
  popup: 6,
  nav: 8,
  bottomSheet: 12,
  modal: 16,
  toast: 24,
} as const;

export type ElevationToken = keyof typeof Elevation;
export default Elevation;
