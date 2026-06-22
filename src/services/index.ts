/**
 * AI Legal Mobile - Services Layer
 * Consolidated entry point for auth, user, cases, chat, drafts, research, storage, and analytics services.
 */

export { AuthService } from './auth.service';
export { UserService } from './user.service';
export { CaseService } from './case.service';
export { WorkspaceService } from './workspace.service';
export { ChatService } from './chat.service';
export { DraftService } from './draft.service';
export { ResearchService } from './research.service';
export { EvidenceService } from './evidence.service';
export { ContractService } from './contract.service';
export { PredictionService } from './prediction.service';
export { StrategyService } from './strategy.service';
export { NotificationService } from './notification.service';
export { ProfileService } from './profile.service';
export { UploadService } from './upload.service';
export { BillingService } from './billing.service';
export { SettingsService } from './settings.service';
export { StorageService } from './storage.service';
export { AnalyticsService } from './analytics.service';
export { initSocket, getSocket, disconnectSocket } from './socket.service';
