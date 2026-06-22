/**
 * AI Legal Mobile - Motion and Animation Tokens
 */
export const Animation = {
  duration: {
    fast: 150,
    medium: 250,
    slow: 400,
  },
  easing: {
    standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
    decelerate: 'cubic-bezier(0, 0, 0.2, 1)',
    accelerate: 'cubic-bezier(0.4, 0, 1, 1)',
  },
  spring: {
    default: { damping: 15, stiffness: 150, mass: 1 },
    bouncy: { damping: 10, stiffness: 100, mass: 0.8 },
    gentle: { damping: 20, stiffness: 120, mass: 1 },
  },
} as const;

export type AnimationToken = typeof Animation;
export default Animation;
