/**
 * AI Legal Mobile - Constants Layer
 * Consolidated entry point for routing, API endpoints, configurations, and registry variables.
 */

import { Routes, AppRoutes } from './routes';
import { API_ENDPOINTS } from './api-endpoints';
import {
  StorageKeys,
  UserRoles,
  ChatRoles,
  CaseStatus,
  CaseStage,
  CasePriority,
  DocumentType,
  LegalToolIds,
  LegalToolsRegistry,
  FileSettings,
  DefaultFeatureFlags,
} from './app-constants';

export {
  Routes,
  API_ENDPOINTS,
  StorageKeys,
  UserRoles,
  ChatRoles,
  CaseStatus,
  CaseStage,
  CasePriority,
  DocumentType,
  LegalToolIds,
  LegalToolsRegistry,
  FileSettings,
  DefaultFeatureFlags,
};

export type { AppRoutes };
