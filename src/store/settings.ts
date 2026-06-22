/**
 * AI Legal Mobile - Local App Settings State Store
 * Manages device-specific features, offline statuses, biometrics, and active theme overrides.
 */

import { create } from 'zustand';
import { DefaultFeatureFlags } from '../constants';

interface SettingsStoreState {
  offlineMode: boolean;
  biometricsEnabled: boolean;
  pushNotificationsEnabled: boolean;
  themePreference: 'Light' | 'Dark' | 'System';
  isTabletLayout: boolean;
  setOfflineMode: (enabled: boolean) => void;
  setBiometricsEnabled: (enabled: boolean) => void;
  setPushNotificationsEnabled: (enabled: boolean) => void;
  setThemePreference: (pref: 'Light' | 'Dark' | 'System') => void;
  setIsTabletLayout: (isTablet: boolean) => void;
}

export const useSettingsStore = create<SettingsStoreState>((set) => ({
  offlineMode: DefaultFeatureFlags.enableOfflineMode,
  biometricsEnabled: DefaultFeatureFlags.enableBiometrics,
  pushNotificationsEnabled: DefaultFeatureFlags.enablePushNotifications,
  themePreference: 'Light',
  isTabletLayout: false,

  setOfflineMode: (offlineMode) => set({ offlineMode }),
  setBiometricsEnabled: (biometricsEnabled) => set({ biometricsEnabled }),
  setPushNotificationsEnabled: (pushNotificationsEnabled) => set({ pushNotificationsEnabled }),
  setThemePreference: (themePreference) => set({ themePreference }),
  setIsTabletLayout: (isTabletLayout) => set({ isTabletLayout }),
}));
