/**
 * AI Legal Mobile - Legal Research Service
 * Handles precedent database checks and statutory lookups.
 */

import { apiClient } from '../api/client';
import { API_ENDPOINTS } from '../constants';
import { ApiResponse, CasePrecedent } from '../types';
import { DraftService } from './draft.service';

export class ResearchService {
  /**
   * Searches live precedent indexes using standard search filters.
   */
  static async searchPrecedents(
    query: string,
    projectId: string | null = null,
    language: string = 'English'
  ): Promise<ApiResponse<{ mode: string; query: string; precedents: any[] }>> {
    const response = await apiClient.post(`${API_ENDPOINTS.Precedents}/search`, {
      query,
      projectId,
      language,
    }, {
      timeout: 120000, // 2 minutes timeout for heavy AI precedents search & scraping
    });
    return response.data;
  }

  /**
   * Performs specific AI tasks like Summarization or Comparison.
   */
  static async analyzePrecedent(
    actionType: string,
    precedentData: any,
    projectId: string | null = null,
    language: string = 'English'
  ): Promise<ApiResponse<{ analysis: string }>> {
    const response = await apiClient.post(`${API_ENDPOINTS.Precedents}/analyze`, {
      actionType,
      precedentData,
      projectId,
      language,
    }, {
      timeout: 60000, // 1 minute timeout for AI reports & comparisons
    });
    return response.data;
  }

  /**
   * Re-analyzes a specific precedent against a new case context.
   */
  static async reanalyzePrecedent(
    precedentData: any,
    projectId: string | null = null,
    language: string = 'English'
  ): Promise<ApiResponse<any>> {
    const response = await apiClient.post(`${API_ENDPOINTS.Precedents}/reanalyze`, {
      precedentData,
      projectId,
      language,
    }, {
      timeout: 60000, // 1 minute timeout
    });
    return response.data;
  }

  /**
   * Generates a professional PDF for a precedent.
   */
  static async generatePrecedentPDF(precedentData: any): Promise<any> {
    const response = await apiClient.post(`${API_ENDPOINTS.Precedents}/generate-pdf`, { precedentData }, {
      responseType: 'blob',
    });
    return response.data;
  }

  /**
   * Execute intelligent statute retrieval query.
   */
  static async lookupStatutes(query: string, caseId?: string): Promise<any> {
    return DraftService.executeTool({
      toolName: 'legal_research_assistant',
      message: `Retrieve citations, acts, and statutory rules associated with: "${query}".`,
      caseContext: caseId ? { summary: query } : undefined,
    });
  }
}
