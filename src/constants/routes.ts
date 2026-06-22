/**
 * AI Legal Mobile - Routing Constants
 * Centralized screen routing mappings for Expo Router.
 */

export const Routes = {
  // Core / Loading
  Splash: '/',
  Onboarding: '/onboarding',

  // Authentication Stack
  Auth: {
    Login: '/auth/login',
    Signup: '/auth/signup',
    ForgotPassword: '/auth/forgot-password',
    Verification: '/auth/verification',
    ResetPassword: '/auth/reset-password',
  },

  // Main Bottom Tab Navigator
  Tabs: {
    Layout: '/(tabs)',
    Dashboard: '/(tabs)/dashboard',
    Cases: '/(tabs)/cases',
    Chat: '/(tabs)/chat',
    Tools: '/(tabs)/tools',
    Profile: '/(tabs)/profile',
  },

  // Case Workspace Stack
  Workspace: {
    Root: (caseId: string) => `/workspace/${caseId}` as const,
    Details: '/workspace/[id]',
    Copilot: '/workspace/copilot',
    DocumentViewer: '/workspace/document-viewer',
  },

  // AI Legal Tools Stack
  Tools: {
    DraftMaker: '/tools/draft-maker',
    LegalPrecedents: '/tools/legal-precedents',
    ContractAnalyzer: '/tools/contract-analyzer',
    EvidenceAnalyst: '/tools/evidence-analyst',
    ArgumentBuilder: '/tools/argument-builder',
    StrategyEngine: '/tools/strategy-engine',
    CasePredictor: '/tools/case-predictor',
    ResearchAssistant: '/tools/research-assistant',
  },

  // Nested Screens
  Settings: {
    Index: '/settings',
    Security: '/settings/security',
    Help: '/settings/help',
  },
} as const;

export type AppRoutes = typeof Routes;
