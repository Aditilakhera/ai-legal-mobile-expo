/**
 * AI Legal Mobile - Local Storage Service
 * Encapsulates SecureStore for secrets (JWT tokens) and AsyncStorage for cache.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

export class StorageService {
  /**
   * Save plain value to persistent store.
   */
  static async setItem(key: string, value: string): Promise<void> {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (e) {
      console.error('[STORAGE] Error setting item', e);
    }
  }

  /**
   * Retrieve plain value from persistent store.
   */
  static async getItem(key: string): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(key);
    } catch (e) {
      console.error('[STORAGE] Error getting item', e);
      return null;
    }
  }

  /**
   * Remove plain item from persistent store.
   */
  static async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (e) {
      console.error('[STORAGE] Error removing item', e);
    }
  }

  /**
   * Securely persist sensitive credentials (JWT, biometrics tokens).
   */
  static async saveSecret(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (e) {
      console.error('[STORAGE] Error saving secret', e);
    }
  }

  /**
   * Securely retrieve sensitive credentials.
   */
  static async getSecret(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (e) {
      console.error('[STORAGE] Error fetching secret', e);
      return null;
    }
  }

  /**
   * Delete securely persisted credentials.
   */
  static async deleteSecret(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (e) {
      console.error('[STORAGE] Error deleting secret', e);
    }
  }
}
