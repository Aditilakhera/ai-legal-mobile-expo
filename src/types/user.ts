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
  };
}

export interface NotificationInboxItem {
  id: string;
  title: string;
  desc: string;
  type: 'promo' | 'update' | 'alert' | 'success' | 'info' | 'error';
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
