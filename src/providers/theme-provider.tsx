/**
 * AI Legal Mobile - Custom Color Theme Provider
 * Syncs app styles to light, dark, or system preferences.
 */

import React, { createContext, useContext } from 'react';
import { useColorScheme } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Colors } from '../theme/colors';
import { useSettingsStore } from '../store/settings';
import { useUserStore } from '../store/user';

interface ActiveTheme {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  readonly secondary: string;
  readonly background: string;
  readonly surface: string;
  readonly surfaceVariant: string;
  readonly border: string;
  readonly divider: string;
  readonly card: string;
  readonly hover: string;
  readonly pressed: string;
  readonly disabled: string;
  readonly overlay: string;
  readonly success: string;
  readonly successLight: string;
  readonly warning: string;
  readonly warningLight: string;
  readonly danger: string;
  readonly dangerLight: string;
  readonly info: string;
  readonly infoLight: string;
  readonly textPrimary: string;
  readonly textSecondary: string;
  readonly textMuted: string;
  readonly placeholder: string;
  selection: string;
  focus: string;
  // Legacy aliases
  readonly text: string;
  readonly backgroundElement: string;
  readonly backgroundSelected: string;
  // Circular compatibility and error mappings
  readonly colors: Omit<ActiveTheme, 'colors'>;
  readonly error: string;
}

const ACCENT_COLORS = {
  Purple: { primary: '#8A5CF5', primaryLight: 'rgba(138, 92, 245, 0.08)', primaryDark: '#703BED', focus: '#8A5CF5', selection: 'rgba(138, 92, 245, 0.12)' },
  Blue: { primary: '#208AEF', primaryLight: 'rgba(32, 138, 239, 0.08)', primaryDark: '#1765B8', focus: '#208AEF', selection: 'rgba(32, 138, 239, 0.12)' },
  Green: { primary: '#10B981', primaryLight: 'rgba(16, 185, 129, 0.08)', primaryDark: '#059669', focus: '#10B981', selection: 'rgba(16, 185, 129, 0.12)' },
  Teal: { primary: '#14B8A6', primaryLight: 'rgba(20, 184, 166, 0.08)', primaryDark: '#0D9488', focus: '#14B8A6', selection: 'rgba(20, 184, 166, 0.12)' },
  Black: { primary: '#0F172A', primaryLight: 'rgba(15, 23, 42, 0.08)', primaryDark: '#020617', focus: '#0F172A', selection: 'rgba(15, 23, 42, 0.12)' },
  'Professional Gray': { primary: '#64748B', primaryLight: 'rgba(100, 116, 139, 0.08)', primaryDark: '#475569', focus: '#64748B', selection: 'rgba(100, 116, 139, 0.12)' },
};

const FONT_MULTIPLIERS = {
  Small: 0.85,
  Medium: 1.0,
  Large: 1.15,
  'Extra Large': 1.3,
};

interface ThemeContextType {
  theme: ActiveTheme;
  isDark: boolean;
  themePreference: 'Light' | 'Dark' | 'System';
  setThemePreference: (pref: 'Light' | 'Dark' | 'System') => void;
  accentColor: string;
  fontSizePreference: 'Small' | 'Medium' | 'Large' | 'Extra Large';
  fontSizeMultiplier: number;
  compactMode: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const profile = useUserStore((s) => s.profile);
  const localSettings = useSettingsStore();

  // Theme configuration resolving
  // Syncs with user profile if authenticated; falls back to device settings
  const profileThemePref = profile?.personalizations?.general?.theme;
  const themePreference = (
    profileThemePref === 'Light' || profileThemePref === 'Dark' || profileThemePref === 'System'
      ? profileThemePref
      : localSettings.themePreference
  ) as 'Light' | 'Dark' | 'System';

  const isDark = themePreference === 'Dark' || (themePreference === 'System' && systemColorScheme === 'dark');
  const baseTheme = isDark ? Colors.dark : Colors.light;

  // Accent color resolving
  const accentPreference = profile?.personalizations?.personalization?.accentColor || 'Purple';
  let accentOverride = ACCENT_COLORS[accentPreference as keyof typeof ACCENT_COLORS];

  if (accentPreference === 'Black' && isDark) {
    accentOverride = { primary: '#F8FAFC', primaryLight: 'rgba(248, 250, 252, 0.08)', primaryDark: '#CBD5E1', focus: '#F8FAFC', selection: 'rgba(248, 250, 252, 0.24)' };
  }

  const activeTheme: any = {
    ...baseTheme,
    primary: accentOverride ? accentOverride.primary : baseTheme.primary,
    primaryLight: accentOverride ? accentOverride.primaryLight : (isDark ? 'rgba(123, 97, 255, 0.08)' : 'rgba(108, 76, 241, 0.08)'),
    primaryDark: accentOverride ? accentOverride.primaryDark : (isDark ? '#7B61FF' : '#6C4CF1'),
    focus: accentOverride ? accentOverride.focus : baseTheme.focus,
    selection: accentOverride ? accentOverride.selection : baseTheme.selection,
  };

  // Setup circular self-reference and error alias mappings
  activeTheme.error = activeTheme.danger;
  activeTheme.colors = activeTheme;

  // Font size multiplier
  const fontSizePreference = (profile?.personalizations?.personalization?.fontSize || 'Medium') as 'Small' | 'Medium' | 'Large' | 'Extra Large';
  const fontSizeMultiplier = FONT_MULTIPLIERS[fontSizePreference] || 1.0;

  // Compact spacing mode configuration
  const compactMode = profile?.personalizations?.general?.compactMode === true || profile?.personalizations?.personalization?.compactMode === true;

  const setThemePreference = (pref: 'Light' | 'Dark' | 'System') => {
    localSettings.setThemePreference(pref);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme: activeTheme as ActiveTheme,
        isDark,
        themePreference,
        setThemePreference,
        accentColor: accentPreference,
        fontSizePreference,
        fontSizeMultiplier,
        compactMode,
      }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {children}
    </ThemeContext.Provider>
  );
};

export const useThemeContext = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeContext must be used within a ThemeProvider');
  }
  return context;
};
