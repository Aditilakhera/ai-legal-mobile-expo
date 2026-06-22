/**
 * AI Legal Mobile - Z-Index Layer Tokens
 */
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

export type ZIndexToken = keyof typeof ZIndex;
export default ZIndex;
