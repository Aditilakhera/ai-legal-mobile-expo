/**
 * AI Legal Mobile - User & Profile Type Definitions
 * Represents the User schema configuration from the database.
 */

export interface UserSettings {
  emailNotif: boolean;
  pushNotif: boolean;
  publicProfile: boolean;
  twoFactor: boolean;
}

export interface UserPersonalizationGeneral {
  language: string;
  theme: 'Light' | 'Dark' | 'System' | 'light' | 'dark' | 'system';
  responseSpeed: 'Fast' | 'Balanced' | 'Detailed' | 'fast' | 'balanced' | 'detailed';
  screenReader: boolean;
  highContrast: boolean;
  defaultDashboard?: string;
  timeZone?: string;
  dateFormat?: string;
  timeFormat?: string;
  compactMode?: boolean;
}

export interface UserPersonalizationNotifications {
  responses: string;
  groupChats: string;
  tasks: string;
  projects: string;
  recommendations: string;
  pushNotif?: boolean;
  emailNotif?: boolean;
  hearingReminder?: boolean;
  deadlineReminder?: boolean;
  draftCompleted?: boolean;
  researchCompleted?: boolean;
  caseUpdates?: boolean;
  dailyBriefing?: boolean;
}

export interface UserPersonalizationCore {
  fontStyle: 'Default' | 'Serif' | 'Mono' | 'Sans' | 'Rounded' | 'default' | 'serif' | 'mono' | 'sans' | 'rounded';
  characteristics: {
    enthusiasm: string;
    formality: string;
    creativity: string;
    directness: string;
  };
  headers: {
    structuredResponses: boolean;
    bulletPoints: boolean;
    stepByStep: boolean;
  };
  emojiUsage: 'None' | 'Minimal' | 'Moderate' | 'Expressive' | 'none' | 'minimal' | 'moderate' | 'expressive';
  fontSize: string;
  customInstructions: string;
  compactMode?: boolean;
  accentColor?: 'Purple' | 'Blue' | 'Green' | 'Teal' | 'Black' | 'Professional Gray';
}

export interface AdvocateProfile {
  fullName?: string;
  phoneNumber?: string;
  dob?: string;
  gender?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  barNumber?: string;
  stateBarCouncil?: string;
  enrollmentYear?: string;
  enrollmentDate?: string;
  practiceExperience?: string;
  practiceAreas?: string[];
  primaryCourt?: string;
  languagesKnown?: string;
  officeName?: string;
  officeAddress?: string;
  bio?: string;
  specialization?: string;
  achievements?: string;
  website?: string;
  awards?: string;
  landmarkCases?: string;
  publications?: string;
}

export interface UserPersonalizations {
  general: UserPersonalizationGeneral;
  notifications: UserPersonalizationNotifications;
  personalization: UserPersonalizationCore;
  apps: Array<{
    name: string;
    enabled: boolean;
    permissions: 'Read' | 'Write' | 'ReadWrite';
    connectedAt: string;
  }>;
  dataControls: {
    chatHistory: 'On' | 'Auto-delete' | 'Off';
    trainingDataUsage: boolean;
    autoDeleteDays: number;
  };
  parentalControls: {
    enabled: boolean;
    ageCategory: 'Child' | 'Teen' | 'Adult';
    contentFiltering: 'Strict' | 'Moderate' | 'Off';
    disableSensitiveTopics: boolean;
    timeUsageLimits: number;
  };
  account: {
    nickname: string;
  };
  advocateProfile?: AdvocateProfile;
  security?: {
    twoFactor?: boolean;
    recoveryEmail?: string;
    fingerprintEnabled?: boolean;
    faceUnlockEnabled?: boolean;
    pinEnabled?: boolean;
    autoLockInterval?: 'Immediately' | '30s' | '1m' | '5m' | 'Never';
  };
  ai?: {
    aiModel?: 'Standard' | 'Advanced' | 'Enterprise';
    responseLength?: 'Short' | 'Medium' | 'Detailed';
    responseStyle?: 'Professional' | 'Simple' | 'Court Ready' | 'Academic';
    autoAnalyze?: boolean;
    autoOcr?: boolean;
    autoCategorization?: boolean;
  };
  legal?: {
    defaultJurisdiction?: string;
    defaultCourt?: string;
    defaultLanguage?: string;
    defaultClientRole?: string;
    defaultObjectorRole?: string;
    defaultDraftFormat?: string;
    defaultHearingReminder?: string;
    defaultCourtDiaryView?: string;
  };
  workspace?: {
    autoOpenActiveCase?: boolean;
    rememberSelectedTool?: boolean;
    rememberSelectedCaseInTools?: boolean;
    rememberDraftHistory?: boolean;
    rememberResearchFilters?: boolean;
  };
  privacy?: {
    analyticsEnabled?: boolean;
    crashReportsEnabled?: boolean;
    conversationHistoryLimit?: 'Forever' | '30 Days' | '90 Days' | 'Delete Automatically';
  };
  performance?: {
    imageQuality?: 'Low' | 'Medium' | 'High' | 'Original';
    wifiOnlyDownload?: boolean;
    offlineMode?: boolean;
    backgroundSync?: boolean;
  };
}

export interface NotificationInboxItem {
  id: string;
  title: string;
  desc: string;
  type: 'promo' | 'update' | 'alert' | 'success' | 'info' | 'error';
  category?: 'Cases' | 'Alerts' | 'System';
  priority?: 'Critical' | 'High' | 'Medium' | 'Low' | 'Completed';
  caseName?: string;
  caseId?: string;
  time: string;
  isRead: boolean;
  voice?: string;
  data?: any;
}

export interface UserProfile {
  _id: string;
  id?: string;
  name: string;
  email: string;
  provider: string;
  providerId?: string;
  isVerified: boolean;
  avatar: string;
  role: 'user' | 'admin';
  settings: UserSettings;
  personalizations: UserPersonalizations;
  credits: number;
  founderStatus: boolean;
  notificationsInbox: NotificationInboxItem[];
  createdAt: string;
  updatedAt: string;
}
