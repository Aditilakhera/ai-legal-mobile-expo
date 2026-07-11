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

  /**
   * Generate an AI message draft for client connect
   */
  static async generateClientConnectDraft(
    caseId: string,
    payload: { reasons: string[]; description?: string }
  ): Promise<{ success: boolean; draft: string }> {
    const response = await apiClient.post(API_ENDPOINTS.Cases.ClientConnectDraft(caseId), payload);
    return response.data;
  }

  /**
   * Log client connect communication event
   */
  static async logClientCommunication(
    caseId: string,
    payload: { type: string; reason?: string; mode?: string }
  ): Promise<ApiResponse<any>> {
    const response = await apiClient.post(API_ENDPOINTS.Cases.ClientConnectLog(caseId), payload);
    return response.data;
  }

  /**
   * Clear all communication logs for a case
   */
  static async clearClientCommunicationLogs(caseId: string): Promise<ApiResponse<any>> {
    const response = await apiClient.delete(API_ENDPOINTS.Cases.ClientConnectLogs(caseId));
    return response.data;
  }

  /**
   * Delete a specific communication log item
   */
  static async deleteClientCommunicationLog(caseId: string, logId: string): Promise<ApiResponse<any>> {
    const response = await apiClient.delete(API_ENDPOINTS.Cases.ClientConnectLogItem(caseId, logId));
    return response.data;
  }

  /**
   * Get courtroom response for dynamic AI Voice Hearing
   */
  static async getCourtroomResponse(payload: {
    caseContext?: any;
    conversationHistory: any[];
    lastUserSpeech: string;
    currentRole: string;
    stage: string;
  }): Promise<ApiResponse<any>> {
    const response = await apiClient.post(API_ENDPOINTS.MockCourtroom.Respond, payload);
    return response.data;
  }

  /**
   * Generate performance report for mock courtroom hearing
   */
  static async getCourtroomReport(payload: {
    conversationHistory: any[];
    caseContext?: any;
  }): Promise<ApiResponse<any>> {
    const response = await apiClient.post(API_ENDPOINTS.MockCourtroom.Report, payload);
    return response.data;
  }

  /**
   * Generate coaching report for practice recording
   */
  static async getPracticeReport(payload: {
    transcript: string;
    caseContext?: any;
    speakingTimeSeconds: number;
  }): Promise<ApiResponse<any>> {
    const response = await apiClient.post(API_ENDPOINTS.MockCourtroom.PracticeReport, payload);
    return response.data;
  }
}
