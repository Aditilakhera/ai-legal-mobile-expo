/**
 * AI Legal Mobile - Legal Document Drafting Service
 * Coordinates AI legal toolkit execution workflows.
 */

import { apiClient } from '../api/client';
import { API_ENDPOINTS } from '../constants';
import { ApiResponse, AILegalToolExecutionPayload, AILegalToolResponse } from '../types';

export class DraftService {
  /**
   * Triggers legal toolkit executor for a tool (e.g. Draft Maker, Contract Analyzer).
   */
  static async executeTool(payload: AILegalToolExecutionPayload): Promise<AILegalToolResponse> {
    const response = await apiClient.post<AILegalToolResponse>(
      API_ENDPOINTS.LegalToolkit.Execute,
      payload
    );
    return response.data;
  }

  /**
   * Helper to compile basic prompt queries to generate a contract draft.
   */
  static async requestDraft(params: {
    title: string;
    provisions: string;
    parties: string;
    caseId?: string;
  }): Promise<AILegalToolResponse> {
    return this.executeTool({
      toolName: 'legal_draft_maker',
      message: `Create a comprehensive contract draft titled "${params.title}" containing the following guidelines: ${params.provisions}. The participating parties are: ${params.parties}.`,
      caseContext: params.caseId ? { name: params.title } : undefined, // Links details if workspace id is provided
    });
  }

  /**
   * Upload and trigger contract assessment reviews.
   */
  static async analyzeContract(documentUrl: string, name: string): Promise<AILegalToolResponse> {
    return this.executeTool({
      toolName: 'legal_contract_analyzer',
      message: `Analyze the contract document located at ${documentUrl} named "${name}". Highlight risk profiles, liability Caps, and termination clauses.`,
      attachments: [{ type: 'document', url: documentUrl, name }],
    });
  }
}
