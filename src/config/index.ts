/**
 * AI Legal Mobile - Centralized Application Configurations
 * Combines environments, feature toggles, and metadata flags.
 */

import { Env } from './env';
import { DefaultFeatureFlags } from '../constants/app-constants';

export const AppConfig = {
  appName: 'AI LEGAL™ Mobile',
  version: '1.0.0',
  apiTimeoutMs: 15000,
  apiUrl: Env.API_URL,
  publicAssetsUrl: Env.PUBLIC_URL,
  isDevelopment: Env.isDev,
  isProduction: Env.isProd,

  // App capabilities toggle
  features: {
    ...DefaultFeatureFlags,
    // Environment specific overrides
    enableOfflineMode: !Env.isDev, // Enable in prod or staging
  },

  // Cache configuration settings
  offlineStorageKeyPrefix: 'ai_legal_db_v1:',
  maxCachedMessagesCount: 50,
} as const;

export type AppConfiguration = typeof AppConfig;
