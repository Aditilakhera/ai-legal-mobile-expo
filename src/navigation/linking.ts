/**
 * AI Legal Mobile - Deep Linking Configuration
 * Custom prefixes and route path mapping.
 */

import * as Linking from 'expo-linking';

export const linkingConfig = {
  // Protocol schemas to handle external requests (e.g. ailegalmobile://dashboard)
  prefixes: [
    Linking.createURL('/'),
    'ailegalmobile://',
    'app://',
    'https://ailegal.com',
    'https://*.ailegal.com',
  ],

  // Maps URL path segments directly to screen definitions in Expo Router
  config: {
    screens: {
      index: '', // Splash
      onboarding: 'onboarding',
      
      // Auth path bindings
      auth: {
        path: 'auth',
        screens: {
          login: 'login',
          signup: 'signup',
          'forgot-password': 'forgot-password',
          verification: 'verification',
          'reset-password': 'reset-password/:token',
        },
      },

      // Nested Bottom Tabs
      '(tabs)': {
        path: 'dashboard',
        screens: {
          dashboard: '',
          cases: 'cases',
          chat: 'chat',
          tools: {
            path: 'tools',
            screens: {
              index: '',
              'draft-maker': 'draft-maker',
              'legal-precedents': 'legal-precedents',
              'contract-analyzer': 'contract-analyzer',
              'evidence-analyst': 'evidence-analyst',
              'argument-builder': 'argument-builder',
              'strategy-engine': 'strategy-engine',
              'case-predictor': 'case-predictor',
              'research-assistant': 'research-assistant',
            },
          },
          profile: 'profile',
        },
      },

      // Workspace deep routes
      workspace: {
        path: 'workspace',
        screens: {
          '[id]': ':id',
          copilot: 'copilot',
          'document-viewer': 'doc-view',
        },
      },

      // Settings screen
      settings: {
        path: 'settings',
        screens: {
          index: '',
          security: 'security',
          help: 'help',
        },
      },

      // Catch-all
      '*': 'notFound',
    },
  },
};
