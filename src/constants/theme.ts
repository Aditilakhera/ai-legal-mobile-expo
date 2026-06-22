import { Colors, Fonts, Spacing } from '@/theme';
import { Platform } from 'react-native';

export { Colors, Fonts, Spacing };
export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

