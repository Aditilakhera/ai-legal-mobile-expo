/**
 * AI Legal Mobile - Color System Design Tokens
 * Premium, harmonious palette configuration for full theme styling.
 */

export const Colors = {
  // Brand Base
  brand: {
    primary: '#208AEF',
    primaryLight: '#E6F4FE',
    primaryDark: '#1765B8',
    secondary: '#0F172A',
  },

  // AI Tool Action Palette (Centralized color registry matching backend toolkit)
  tools: {
    aiAssistant: '#8B5CF6',       // Purple
    draftMaker: '#6366F1',        // Indigo
    legalResearch: '#F59E0B',     // Amber
    contractAnalyzer: '#3B82F6',  // Blue
    evidenceAnalyst: '#10B981',   // Emerald
    argumentBuilder: '#EF4444',    // Red
    casePredictor: '#06B6D4',      // Cyan
    strategyEngine: '#8A5CF5',     // Violet
    researchAssistant: '#14B8A6',  // Teal
  },

  // Light Mode Tokens
  light: {
    primary: '#6C4CF1',
    secondary: '#0F172A',
    background: '#FFFFFF',
    surface: '#F8F9FC',
    surfaceVariant: '#F1F5F9',
    border: '#ECECEC',
    divider: '#ECECEC',
    card: '#FFFFFF',
    hover: 'rgba(15, 23, 42, 0.04)',
    pressed: 'rgba(15, 23, 42, 0.08)',
    disabled: 'rgba(15, 23, 42, 0.38)',
    overlay: 'rgba(15, 23, 42, 0.4)',
    
    // Status colors
    success: '#10B981',
    successLight: '#E6F4EA',
    warning: '#F59E0B',
    warningLight: '#FEF7E0',
    danger: '#EF4444',
    dangerLight: '#FCE8E6',
    info: '#3B82F6',
    infoLight: '#EBF5FF',

    // Text hierarchy
    textPrimary: '#1F2937',
    textSecondary: '#4B5563',
    textMuted: '#94A3B8',
    placeholder: '#94A3B8',
    selection: 'rgba(108, 76, 241, 0.12)',
    focus: '#6C4CF1',

    // Legacy parameters (For backwards compatibility with templates)
    text: '#1F2937',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#E2E8F0',
  },

  // Dark Mode Tokens
  dark: {
    primary: '#7B61FF',
    secondary: '#F8FAFC',
    background: '#0D1117',
    surface: '#161B22',
    surfaceVariant: '#1E293B',
    border: '#30363D',
    divider: '#30363D',
    card: '#1F2937',
    hover: 'rgba(248, 250, 252, 0.04)',
    pressed: 'rgba(248, 250, 252, 0.08)',
    disabled: 'rgba(248, 250, 252, 0.38)',
    overlay: 'rgba(0, 0, 0, 0.6)',
    
    // Status colors
    success: '#10B981',
    successLight: '#0E2818',
    warning: '#F59E0B',
    warningLight: '#2C220E',
    danger: '#EF4444',
    dangerLight: '#2D1414',
    info: '#3B82F6',
    infoLight: '#0F2035',

    // Text hierarchy
    textPrimary: '#FFFFFF',
    textSecondary: '#A1A1AA',
    textMuted: '#6B7280',
    placeholder: '#6B7280',
    selection: 'rgba(123, 97, 255, 0.24)',
    focus: '#7B61FF',

    // Legacy parameters (For backwards compatibility with templates)
    text: '#FFFFFF',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
  },
} as const;

export type ColorPalette = typeof Colors;
export type ToolNameColor = keyof typeof Colors.tools;
export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;
export default Colors;
