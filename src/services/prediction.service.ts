/**
 * AI Legal Mobile - Case Outcome Prediction Service
 * Interfaces with AI outcome assessment, strength grading, and risk metrics.
 */

import { ApiResponse } from '../types';
import { DraftService } from './draft.service';

export interface OutcomePrediction {
  winProbability: number;
  strengthScore: number;
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  vulnerabilities: string[];
  keyFactors: string[];
}

export class PredictionService {
  /**
   * Run outcome prediction engine based on facts, evidence, and statutes context.
   */
  static async predictOutcome(params: {
    caseSummary: string;
    jurisdiction?: string;
    facts?: string[];
  }): Promise<ApiResponse<OutcomePrediction>> {
    const factsText = params.facts && params.facts.length > 0 ? `Facts: ${params.facts.join('; ')}` : '';
    const result = await DraftService.executeTool({
      toolName: 'legal_case_predictor',
      message: `Predict case win probability and strength metrics. Case details: "${params.caseSummary}". ${factsText} Jurisdiction: "${params.jurisdiction || 'Default'}".`,
    });

    let info = result.data || {};
    if (!result.data && result.reply) {
      try {
        const cleanReply = result.reply.replace(/```json|```/g, '').trim();
        info = JSON.parse(cleanReply);
      } catch (e) {
        // Fallback
      }
    }

    return {
      success: true,
      data: {
        winProbability: Number(info.winProbability || info.probability || info.win_probability) || 50,
        strengthScore: Number(info.strengthScore || info.strengthScore || info.case_strength || info.strength) || 50,
        riskLevel: info.riskLevel || info.riskLevel || (info.risk?.level) || 'Medium',
        vulnerabilities: Array.isArray(info.weakPoints || info.vulnerabilities || info.critical_vulnerabilities) 
          ? (info.weakPoints || info.vulnerabilities || info.critical_vulnerabilities) 
          : [],
        keyFactors: Array.isArray(info.keyFactors || info.factors || info.key_factors) 
          ? (info.keyFactors || info.factors || info.key_factors) 
          : [result.reply],
      },
    };
  }
}
