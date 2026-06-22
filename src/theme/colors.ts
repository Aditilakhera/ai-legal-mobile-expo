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
    primary: '#208AEF',
    secondary: '#0F172A',
    background: '#F8FAFC',
    surface: '#FFFFFF',
    surfaceVariant: '#F1F5F9',
    border: '#E2E8F0',
    divider: '#F1F5F9',
    card: '#FFFFFF',
    hover: 'rgba(15, 23, 42, 0.04)',
    pressed: 'rgba(15, 23, 42, 0.08)',
    disabled: 'rgba(15, 23, 42, 0.38)',
    overlay: 'rgba(15, 23, 42, 0.4)',
    
    // Status colors
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    info: '#3B82F6',

    // Text hierarchy
    textPrimary: '#0F172A',
    textSecondary: '#475569',
    textMuted: '#94A3B8',
    placeholder: '#94A3B8',
    selection: 'rgba(32, 138, 239, 0.12)',
    focus: '#208AEF',

    // Legacy parameters (For backwards compatibility with templates)
    text: '#0F172A',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#E2E8F0',
  },

  // Dark Mode Tokens
  dark: {
    primary: '#3B82F6',
    secondary: '#F8FAFC',
    background: '#0B0F19',
    surface: '#151F32',
    surfaceVariant: '#1E293B',
    border: '#1E293B',
    divider: '#1E293B',
    card: '#151F32',
    hover: 'rgba(248, 250, 252, 0.04)',
    pressed: 'rgba(248, 250, 252, 0.08)',
    disabled: 'rgba(248, 250, 252, 0.38)',
    overlay: 'rgba(0, 0, 0, 0.6)',
    
    // Status colors
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    info: '#3B82F6',

    // Text hierarchy
    textPrimary: '#F8FAFC',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
    placeholder: '#64748B',
    selection: 'rgba(59, 130, 246, 0.24)',
    focus: '#3B82F6',

    // Legacy parameters (For backwards compatibility with templates)
    text: '#ffffff',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
  },
} as const;

export type ColorPalette = typeof Colors;
export type ToolNameColor = keyof typeof Colors.tools;
export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;
export default Colors;
