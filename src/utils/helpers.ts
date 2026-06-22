/**
 * AI Legal Mobile - General Utility Helpers
 * Houses logging channels, debouncers, and platform specifications.
 */

import { Platform, Dimensions } from 'react-native';

/**
 * Debounce function executor.
 */
export function debounce<T extends (...args: any[]) => void>(func: T, waitMs: number): (...args: Parameters<T>) => void {
  let timeout: any = null;
  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => {
      func(...args);
    }, waitMs);
  };
}

/**
 * Throttle function executor.
 */
export function throttle<T extends (...args: any[]) => void>(func: T, limitMs: number): (...args: Parameters<T>) => void {
  let inThrottle = false;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limitMs);
    }
  };
}

/**
 * Custom logging wrapper to suppress print channels during production.
 */
export const Logger = {
  info: (message: string, ...optionalParams: any[]) => {
    if (__DEV__) {
      console.log(`[INFO] ${message}`, ...optionalParams);
    }
  },
  warn: (message: string, ...optionalParams: any[]) => {
    if (__DEV__) {
      console.warn(`[WARN] ${message}`, ...optionalParams);
    }
  },
  error: (message: string, ...optionalParams: any[]) => {
    console.error(`[ERROR] ${message}`, ...optionalParams);
  },
};

/**
 * Screen dimensions details.
 */
export const DeviceInfo = {
  width: Dimensions.get('window').width,
  height: Dimensions.get('window').height,
  isIos: Platform.OS === 'ios',
  isAndroid: Platform.OS === 'android',
  isWeb: Platform.OS === 'web',
  // Simple check for tablets
  isTablet: Dimensions.get('window').width >= 768,
};
