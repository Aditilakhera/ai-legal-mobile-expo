/**
 * AI Legal Mobile - Admissible Evidence Vault Service
 * Coordinates evidence vault updates and admissibility assessments.
 */

import { apiClient } from '../api/client';
import { API_ENDPOINTS } from '../constants';
import { ApiResponse, CaseEvidence } from '../types';
import { DraftService } from './draft.service';

export class EvidenceService {
  /**
   * Retrieves all evidence records associated with case workspace.
   */
  static async listEvidence(caseId: string): Promise<ApiResponse<CaseEvidence[]>> {
    const response = await apiClient.get(API_ENDPOINTS.Cases.Evidence(caseId));
    return response.data;
  }

  /**
   * Adds a new evidence block to the vault.
   */
  static async addEvidence(caseId: string, evidence: Partial<CaseEvidence>): Promise<ApiResponse<CaseEvidence>> {
    const response = await apiClient.post(API_ENDPOINTS.Cases.Evidence(caseId), evidence);
    return response.data;
  }

  /**
   * Updates existing evidence properties (e.g. status or notes).
   */
  static async updateEvidence(
    caseId: string,
    evidenceId: string,
    updates: Partial<CaseEvidence>
  ): Promise<ApiResponse<CaseEvidence>> {
    const response = await apiClient.put(`${API_ENDPOINTS.Cases.Evidence(caseId)}/${evidenceId}`, updates);
    return response.data;
  }

  /**
   * Deletes evidence card from vault.
   */
  static async deleteEvidence(caseId: string, evidenceId: string): Promise<ApiResponse<{ success: boolean }>> {
    const response = await apiClient.delete(`${API_ENDPOINTS.Cases.Evidence(caseId)}/${evidenceId}`);
    return response.data;
  }

  /**
   * Request AI Admissibility Assessment report for evidence entry.
   */
  static async evaluateAdmissibility(params: {
    evidenceName: string;
    description: string;
    caseId?: string;
  }): Promise<any> {
    return DraftService.executeTool({
      toolName: 'legal_evidence_analyst',
      message: `Evaluate the admissibility of this evidence: "${params.evidenceName}". Description: "${params.description}".`,
      caseContext: params.caseId ? { name: params.evidenceName } : undefined,
    });
  }
}
