/**
 * AI Legal Mobile - Strategy Engine Service
 * Connects with AI strategy recommendations, deposition guidelines, and counter-move blueprints.
 */

import { ApiResponse } from '../types';
import { DraftService } from './draft.service';

export interface StrategyPlan {
  recommendations: string[];
  opponentExpectedMoves: string[];
  counterStrategies: string[];
  hearingTactics: string[];
}

export class StrategyService {
  /**
   * Generates case strategy blueprints and opponent tactics review.
   */
  static async generateStrategy(caseDetails: string, opponentGoals?: string): Promise<ApiResponse<StrategyPlan>> {
    const opponentText = opponentGoals ? `Opponent goals/arguments: "${opponentGoals}"` : '';
    const result = await DraftService.executeTool({
      toolName: 'legal_strategy_engine',
      message: `Formulate step-by-step litigation and negotiation strategy plan. Case Details: "${caseDetails}". ${opponentText}`,
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
        recommendations: Array.isArray(info.strategyRecommendations || info.recommendations || info.strategy) 
          ? (info.strategyRecommendations || info.recommendations || info.strategy) 
          : [result.reply],
        opponentExpectedMoves: Array.isArray(info.opponentStrategies || info.opponentMoves || info.opponent) 
          ? (info.opponentStrategies || info.opponentMoves || info.opponent) 
          : [],
        counterStrategies: Array.isArray(info.counterStrategies || info.counters || info.counter_strategies) 
          ? (info.counterStrategies || info.counters || info.counter_strategies) 
          : [],
        hearingTactics: Array.isArray(info.hearingTactics || info.tactics || info.hearing_tactics) 
          ? (info.hearingTactics || info.tactics || info.hearing_tactics) 
          : [],
      },
    };
  }
}
