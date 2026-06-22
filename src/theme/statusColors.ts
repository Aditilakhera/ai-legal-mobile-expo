/**
 * AI Legal Mobile - Status Color Tokens
 */
export const StatusColors = {
  success: {
    primary: '#10B981', // Emerald-500
    light: '#ECFDF5',   // Emerald-50
    dark: '#065F46',    // Emerald-800
  },
  warning: {
    primary: '#F59E0B', // Amber-500
    light: '#FEF3C7',   // Amber-50
    dark: '#92400E',    // Amber-800
  },
  danger: {
    primary: '#EF4444', // Red-500
    light: '#FEF2F2',   // Red-50
    dark: '#991B1B',    // Red-800
  },
  info: {
    primary: '#3B82F6', // Blue-500
    light: '#EFF6FF',   // Blue-50
    dark: '#1E40AF',    // Blue-800
  },
} as const;

export type StatusColorType = typeof StatusColors;
export default StatusColors;
