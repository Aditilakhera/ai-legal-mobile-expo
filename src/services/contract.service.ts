/**
 * AI Legal Mobile - Contract Analysis & Review Service
 * Orchestrates AI contract assessments, risk ratings, and clause revision requests.
 */

import { ApiResponse } from '../types';
import { DraftService } from './draft.service';

export interface ClauseAssessment {
  clauseTitle: string;
  originalText: string;
  riskRating: 'Low' | 'Medium' | 'High' | 'Critical';
  reasoning: string;
  recommendedRevision?: string;
}

export class ContractService {
  /**
   * Request comprehensive analysis of uploaded contract documents.
   */
  static async analyzeContract(documentUrl: string, name: string): Promise<any> {
    return DraftService.executeTool({
      toolName: 'legal_contract_analyzer',
      message: `Perform full legal review on contract document: "${name}". Locate risk liabilities, cap clauses, and indemnity concerns.`,
      attachments: [{ type: 'document', url: documentUrl, name }],
    });
  }

  /**
   * Requests specific risk rating assessment for individual clause text.
   */
  static async assessClause(clauseText: string, context?: string): Promise<ApiResponse<ClauseAssessment>> {
    const result = await DraftService.executeTool({
      toolName: 'legal_clause_assessor',
      message: `Assess the following clause: "${clauseText}". Context: "${context || 'General contract context'}". Output risk rating and recommendations.`,
    });
    
    let info = result.data || {};
    if (!result.data && result.reply) {
      try {
        const cleanReply = result.reply.replace(/```json|```/g, '').trim();
        info = JSON.parse(cleanReply);
      } catch (e) {
        // Fallback if not valid JSON
      }
    }

    // Convert tool output shape to unified ClauseAssessment type
    return {
      success: true,
      data: {
        clauseTitle: 'Assessed Clause',
        originalText: clauseText,
        riskRating: info.riskLevel || info.riskRating || 'Medium',
        reasoning: info.reasoning || result.reply || 'Analysis complete.',
        recommendedRevision: info.recommendation || info.revision || info.recommendedRevision,
      },
    };
  }
}
