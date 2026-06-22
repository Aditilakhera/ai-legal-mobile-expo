/**
 * AI Legal Mobile - Custom Color Theme Provider
 * Syncs app styles to light, dark, or system preferences.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { Colors } from '../theme/colors';
import { useSettingsStore } from '../store/settings';

interface ActiveTheme {
  readonly primary: string;
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
  readonly warning: string;
  readonly danger: string;
  readonly info: string;
  readonly textPrimary: string;
  readonly textSecondary: string;
  readonly textMuted: string;
  readonly placeholder: string;
  readonly selection: string;
  readonly focus: string;
  // Legacy aliases
  readonly text: string;
  readonly backgroundElement: string;
  readonly backgroundSelected: string;
}



interface ThemeContextType {
  theme: ActiveTheme;
  isDark: boolean;
  themePreference: 'Light' | 'Dark' | 'System';
  setThemePreference: (pref: 'Light' | 'Dark' | 'System') => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemScheme = useColorScheme();
  const themePreference = useSettingsStore((s) => s.themePreference);
  const setThemePreference = useSettingsStore((s) => s.setThemePreference);

  const isDark = themePreference === 'Dark' || (themePreference === 'System' && systemScheme === 'dark');
  const activeTheme = isDark ? Colors.dark : Colors.light;

  return (
    <ThemeContext.Provider
      value={{
        theme: activeTheme,
        isDark,
        themePreference,
        setThemePreference,
      }}>
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
