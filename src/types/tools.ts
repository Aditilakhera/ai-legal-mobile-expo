/**
 * AI Legal Mobile - Specialized AI Tool Type Definitions
 * Models for the legal toolkit and external agent metadata.
 */

export interface AILegalTool {
  id: string;
  name: string;
  description: string;
  color: string;
  category?: 'productivity' | 'creative' | 'coding' | 'lifestyle' | 'legal';
  installed?: boolean;
  instructions?: string;
  creditCost?: number;
  iconName?: string;
}

export interface AILegalToolExecutionPayload {
  message: string;
  toolName: string; // ID of tool, e.g. legal_draft_maker
  sessionId?: string;
  attachments?: Array<{
    type?: string;
    url: string;
    name: string;
  }>;
  conversationHistory?: Array<{
    role: 'user' | 'model' | 'assistant';
    content: string;
  }>;
  language?: string;
  caseContext?: {
    name?: string;
    clientName?: string;
    opponentName?: string;
    caseType?: string;
    stage?: string;
    priority?: string;
    summary?: string;
    facts?: Array<{ date?: string; event?: string; description?: string }>;
    hearings?: Array<{ date?: string; courtName?: string; location?: string; status?: string }>;
    documents?: Array<{ name?: string; type?: string; url?: string; extractedData?: any }>;
    evidence?: Array<{ name?: string; type?: string; description?: string; admissibility?: string }>;
    research?: Array<{ lawName?: string; section?: string; description?: string }>;
    savedPrecedents?: Array<{ title?: string; citation?: string; summary?: string }>;
    tasks?: Array<{ title?: string; status?: string; deadline?: string; priority?: string }>;
  };
}

export interface AILegalToolResponse {
  success: boolean;
  reply: string;
  toolUsed: string;
  creditsUsed: number;
  suggestions?: string[];
  error?: string;
  data?: any;
}
