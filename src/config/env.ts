/**
 * AI Legal Mobile - Environment Config
 * Declares environment variables and fallback paths for cross-platform network resolution.
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Read from Expo public environment variables (Expo SDK 49+ parses EXPO_PUBLIC_* variables automatically)
const VITE_AISA_BACKEND_API = process.env.EXPO_PUBLIC_API_URL;

const getLocalhostUrl = () => {
  // If hostUri is present (e.g. 192.168.29.238:8081), use the host IP!
  // This works dynamically for both Android and iOS physical devices/emulators.
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    if (ip) {
      return `http://${ip}:8080/api`;
    }
  }

  // On Android, localhost (127.0.0.1) is the fallback if adb reverse tcp:8080 tcp:8080 is active
  if (Platform.OS === 'android') {
    return 'http://127.0.0.1:8080/api';
  }

  // Fallback to active host local IP
  const activeHostIp = '192.168.29.238';
  return `http://${activeHostIp}:8080/api`;
};

export const Env = {
  // Current app runtime setting
  NODE_ENV: process.env.NODE_ENV || 'development',
  isDev: process.env.NODE_ENV !== 'production',
  isProd: process.env.NODE_ENV === 'production',

  // API Gateway URL
  API_URL: VITE_AISA_BACKEND_API || getLocalhostUrl(),
  
  // Public assets
  PUBLIC_URL: process.env.EXPO_PUBLIC_ASSETS_URL || 'http://localhost:8080',
} as const;
