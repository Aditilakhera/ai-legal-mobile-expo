/**
 * AI Legal Mobile - Client Settings Service
 * Resolves local preferences like themes, offline limits, and locale languages.
 */

import { StorageService } from './storage.service';

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  maxCacheSizeMb: number;
  enableBiometricLogin: boolean;
  pushNotificationsEnabled: boolean;
}

const PREFS_KEY = 'ai_legal_user_preferences';

const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'system',
  language: 'en',
  maxCacheSizeMb: 100,
  enableBiometricLogin: false,
  pushNotificationsEnabled: true,
};

export class SettingsService {
  /**
   * Save user preference flags.
   */
  static async savePreferences(prefs: UserPreferences): Promise<void> {
    await StorageService.setItem(PREFS_KEY, JSON.stringify(prefs));
  }

  /**
   * Load current user preference configurations.
   */
  static async loadPreferences(): Promise<UserPreferences> {
    const raw = await StorageService.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    try {
      return { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) };
    } catch (e) {
      return DEFAULT_PREFERENCES;
    }
  }

  /**
   * Clear local settings and cached settings logs.
   */
  static async resetSettings(): Promise<void> {
    await StorageService.removeItem(PREFS_KEY);
  }
}
