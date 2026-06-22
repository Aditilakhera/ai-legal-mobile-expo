/**
 * AI Legal Mobile - Navigation Types
 * Interface parameters for safety during transition operations.
 */

export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
  ForgotPassword: { email?: string } | undefined;
  Verification: { email: string; reason: 'signup' | 'reset' };
  ResetPassword: { token: string };
};

export type TabsParamList = {
  Dashboard: undefined;
  Cases: undefined;
  Chat: { sessionId?: string; agentId?: string } | undefined;
  Tools: undefined;
  Profile: undefined;
};

export type WorkspaceStackParamList = {
  WorkspaceHome: { id: string };
  WorkspaceCopilot: { id: string };
  DocumentViewer: { id: string; docId: string; url: string; title: string };
};

export type ToolsStackParamList = {
  DraftMaker: { caseId?: string } | undefined;
  LegalPrecedents: { caseId?: string } | undefined;
  ContractAnalyzer: { caseId?: string; documentId?: string } | undefined;
  EvidenceAnalyst: { caseId?: string } | undefined;
  ArgumentBuilder: { caseId?: string } | undefined;
  StrategyEngine: { caseId?: string } | undefined;
  CasePredictor: { caseId?: string } | undefined;
  ResearchAssistant: { caseId?: string; topic?: string } | undefined;
};

export type SettingsStackParamList = {
  SettingsHome: undefined;
  Security: undefined;
  Help: undefined;
};

// Global ParamList mapping all available routes
export type RootStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  AuthStack: { screen: keyof AuthStackParamList; params?: any };
  MainTabs: { screen: keyof TabsParamList; params?: any };
  WorkspaceStack: { screen: keyof WorkspaceStackParamList; params?: any };
  ToolsStack: { screen: keyof ToolsStackParamList; params?: any };
  SettingsStack: { screen: keyof SettingsStackParamList; params?: any };
};


