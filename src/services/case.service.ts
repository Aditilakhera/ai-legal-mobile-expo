/**
 * AI Legal Mobile - Case & Workspace Service
 * Interfaces with case briefs, document lists, tasks, schedules, and analytics.
 */

import { apiClient } from '../api/client';
import { API_ENDPOINTS } from '../constants';
import { ApiResponse, CaseWorkspace, CaseSummary, CaseTask, CaseHearing, CaseEvidence } from '../types';

export class CaseService {
  /**
   * Retrieves all case summaries for active user.
   */
  static async listCases(): Promise<ApiResponse<CaseSummary[]>> {
    const response = await apiClient.get(API_ENDPOINTS.Cases.Base);
    return response.data;
  }

  /**
   * Fetch complete case workspace by ID.
   */
  static async getCaseDetails(caseId: string): Promise<ApiResponse<CaseWorkspace>> {
    const response = await apiClient.get(API_ENDPOINTS.Cases.Details(caseId));
    return response.data;
  }

  /**
   * Create a new case workspace.
   */
  static async createCase(caseData: Partial<CaseWorkspace>): Promise<ApiResponse<CaseWorkspace>> {
    const response = await apiClient.post(API_ENDPOINTS.Cases.Base, caseData);
    return response.data;
  }

  /**
   * Update case workspace parameters.
   */
  static async updateCase(caseId: string, updates: Partial<CaseWorkspace>): Promise<ApiResponse<CaseWorkspace>> {
    const response = await apiClient.put(API_ENDPOINTS.Cases.Details(caseId), updates);
    return response.data;
  }

  /**
   * Delete case workspace.
   */
  static async deleteCase(caseId: string): Promise<ApiResponse<{ success: boolean }>> {
    const response = await apiClient.delete(API_ENDPOINTS.Cases.Details(caseId));
    return response.data;
  }

  /**
   * Add a task to case workspace.
   */
  static async addTask(caseId: string, task: Partial<CaseTask>): Promise<ApiResponse<CaseTask>> {
    const response = await apiClient.post(API_ENDPOINTS.Cases.Tasks(caseId), task);
    return response.data;
  }

  /**
   * Update task parameters in case.
   */
  static async updateTask(caseId: string, taskId: string, updates: Partial<CaseTask>): Promise<ApiResponse<CaseTask>> {
    const response = await apiClient.put(`${API_ENDPOINTS.Cases.Tasks(caseId)}/${taskId}`, updates);
    return response.data;
  }

  /**
   * Add hearing entry to case calendar.
   */
  static async addHearing(caseId: string, hearing: Partial<CaseHearing>): Promise<ApiResponse<CaseHearing>> {
    const response = await apiClient.post(`${API_ENDPOINTS.Cases.Base}/${caseId}/hearings`, hearing);
    return response.data;
  }

  /**
   * Add evidence record to vault.
   */
  static async addEvidence(caseId: string, evidence: Partial<CaseEvidence>): Promise<ApiResponse<CaseEvidence>> {
    const response = await apiClient.post(API_ENDPOINTS.Cases.Evidence(caseId), evidence);
    return response.data;
  }

  /**
   * Triggers the AI timeline and case intelligence analysis.
   */
  static async analyzeCase(caseId: string): Promise<ApiResponse<CaseWorkspace>> {
    const response = await apiClient.post(`${API_ENDPOINTS.Cases.Details(caseId)}/analyze`);
    return response.data;
  }

  /**
   * Enrich hearing details using AI (court orders or notes).
   */
  static async enrichHearing(
    caseId: string,
    hearingId: string,
    payload: { notes?: string; documentText?: string; documentName?: string }
  ): Promise<ApiResponse<CaseWorkspace>> {
    const response = await apiClient.post(`${API_ENDPOINTS.Cases.Details(caseId)}/hearings/${hearingId}/enrich`, payload);
    return response.data;
  }
}
