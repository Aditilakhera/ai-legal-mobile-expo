/**
 * AI Legal Mobile - General App Constants
 * Global values, metadata lists, enums, and storage settings.
 */

export const StorageKeys = {
  AuthToken: 'ai_legal_auth_token',
  RefreshToken: 'ai_legal_refresh_token',
  UserSession: 'ai_legal_user_session',
  ThemePreference: 'ai_legal_theme_pref',
  BiometricsEnabled: 'ai_legal_biometrics_enabled',
  OfflineWorkspacePrefix: 'ai_legal_offline_ws_',
} as const;

export const UserRoles = {
  USER: 'user',
  ADMIN: 'admin',
} as const;

export const ChatRoles = {
  USER: 'user',
  MODEL: 'model',
  ASSISTANT: 'assistant',
} as const;

export const CaseStatus = {
  ACTIVE: 'Active',
  CLOSED: 'Closed',
  ARCHIVED: 'Archived',
} as const;

export const CaseStage = {
  PRE_LITIGATION: 'Pre-litigation',
  NOTICE: 'Notice',
  COURT: 'Court',
  JUDGMENT: 'Judgment',
  SETTLED: 'Settled',
} as const;

export const CasePriority = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  URGENT: 'Urgent',
} as const;

export const DocumentType = {
  NOTICE: 'Notice',
  AGREEMENT: 'Agreement',
  PROOF: 'Proof',
  FILING: 'Filing',
  OTHER: 'Other',
} as const;

export const LegalToolIds = {
  AiAssistant: 'legal_free_chat',
  DraftMaker: 'legal_draft_maker',
  ContractAnalyzer: 'legal_contract_analyzer',
  EvidenceAnalyst: 'legal_evidence_analyst',
  ArgumentBuilder: 'legal_argument_builder',
  CasePredictor: 'legal_case_predictor',
  StrategyEngine: 'legal_strategy_engine',
  ResearchAssistant: 'legal_research_assistant',
} as const;

export const LegalToolsRegistry = [
  {
    id: LegalToolIds.AiAssistant,
    name: 'AI Assistant',
    color: '#8B5CF6',
    description: 'Ask queries, analyze brief scenarios, and get general legal intelligence.',
  },
  {
    id: LegalToolIds.DraftMaker,
    name: 'Draft Maker',
    color: '#6366F1',
    description: 'Generate contracts, legal notices, motions, and custom legal documentation.',
  },
  {
    id: LegalToolIds.ContractAnalyzer,
    name: 'Contract Analyzer',
    color: '#3B82F6',
    description: 'Upload agreements to parse terms, highlight key liabilities, and evaluate risk levels.',
  },
  {
    id: LegalToolIds.EvidenceAnalyst,
    name: 'Evidence Analyst',
    color: '#10B981',
    description: 'Organize files, construct admissibility matrices, and generate event timelines.',
  },
  {
    id: LegalToolIds.ArgumentBuilder,
    name: 'Argument Builder',
    color: '#EF4444',
    description: 'Construct strong logic chains, cite exceptions, and address opposing claims.',
  },
  {
    id: LegalToolIds.CasePredictor,
    name: 'Case Predictor',
    color: '#06B6D4',
    description: 'Forecast probability of success based on claims, jurisdiction, and precedents.',
  },
  {
    id: LegalToolIds.StrategyEngine,
    name: 'Strategy Engine',
    color: '#8A5CF5',
    description: 'Model opposition moves, schedule hearing requirements, and format key tasks.',
  },
  {
    id: LegalToolIds.ResearchAssistant,
    name: 'Research Assistant',
    color: '#14B8A6',
    description: 'Lookup statutes, retrieve active precedents, and cite legal cross-references.',
  },
] as const;

export const FileSettings = {
  MaxFileSize: 25 * 1024 * 1024, // 25MB standard
  SupportedMimeTypes: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'text/plain',
  ],
  SupportedExtensions: ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.txt'],
} as const;

export const DefaultFeatureFlags = {
  enableOfflineMode: false,
  enableBiometrics: true,
  enablePushNotifications: true,
  enableOtaUpdates: true,
  enableStreamingAI: true,
} as const;
