/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors } from '@/constants/theme';
import { useColorScheme } from 'react-native';
import { useSettingsStore } from '@/store/settings';

export function useTheme() {
  const systemScheme = useColorScheme();
  const themePreference = useSettingsStore((s) => s.themePreference);

  const isDark = themePreference === 'Dark' || (themePreference === 'System' && systemScheme === 'dark');
  const theme = isDark ? 'dark' : 'light';

  return Colors[theme];
}
