/**
 * AI Legal Mobile - Case & Workspace Type Definitions
 * Maps directly to backend Project models.
 */

export interface CaseLawyer {
  name: string;
  role: string;
  contact: string;
}

export interface CaseFact {
  id?: string;
  title?: string;
  event?: string;
  description?: string;
  date: string;
  displayDate?: string;
  isApproximate?: boolean;
  category?: string;
  importance?: string;
  source?: string;
  confidence?: string;
  createdBy?: 'AI' | 'User';
}

export interface CaseDocument {
  _id: string;
  name: string;
  type: 'Notice' | 'Agreement' | 'Proof' | 'Filing' | 'Other';
  url: string;
  tags: string[];
  extractedData?: Record<string, any>;
  uploadDate: string;
}

export interface CaseEvidence {
  _id?: string;
  name: string;
  type: string;
  description: string;
  admissibility?: 'Admissible' | 'Inadmissible' | 'Contested' | 'Pending';
  notes?: string;
}

export interface CasePrecedent {
  _id?: string;
  title: string;
  citation: string;
  summary: string;
  url?: string;
}

export interface CaseIntelligence {
  strengthScore: number;
  winProbability: number;
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  weakPoints: string[];
  missingEvidence: string[];
  opponentStrategies: string[];
  strategyRecommendations: string[];
}

export interface CaseTask {
  _id?: string;
  title: string;
  description: string;
  status: 'Pending' | 'In Progress' | 'Completed';
  deadline?: string;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
}

export interface CaseCommunicationLog {
  _id?: string;
  type: 'Call' | 'Email' | 'Note' | 'Meeting';
  summary: string;
  timestamp: string;
}

export interface CaseResearch {
  _id?: string;
  lawName: string;
  section: string;
  description: string;
  referenceUrl?: string;
}

export interface CaseHearingChecklistItem {
  title: string;
  checked: boolean;
  status?: string; // only for compliance checklist items
}

export interface CaseHearing {
  id?: string;
  _id?: string;
  title?: string;
  date?: string;
  time?: string;
  courtName?: string;
  courtroom?: string;
  judge?: string;
  purpose?: string;
  notes?: string;
  status: 'Scheduled' | 'Completed' | 'Adjourned' | 'Orders Reserved' | 'Cancelled' | 'Ongoing' | 'Upcoming';
  linkedDocuments?: string[];
  orderSummary?: string;
  isAiEnriched?: boolean;
  nextHearingDate?: string;
  checklist?: {
    documents: CaseHearingChecklistItem[];
    evidence: CaseHearingChecklistItem[];
    witnesses: CaseHearingChecklistItem[];
    compliance: CaseHearingChecklistItem[];
  };
}

export interface CaseWorkspace {
  _id: string;
  id?: string;
  name: string;
  userId: string;
  clientName?: string;
  opponentName?: string;
  summary?: string;
  caseSummary?: string; // Backward compatibility
  caseType?: string;
  courtName?: string;
  status: 'Active' | 'Closed' | 'Archived';
  stage: 'Pre-litigation' | 'Notice' | 'Court' | 'Judgment' | 'Settled';
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  lawyers: CaseLawyer[];
  facts: CaseFact[];
  legalIssues: string[];
  reliefGoals?: string;
  documents: CaseDocument[];
  evidence: CaseEvidence[];
  savedPrecedents: CasePrecedent[];
  intelligence: CaseIntelligence;
  tasks: CaseTask[];
  communicationLogs: CaseCommunicationLog[];
  research: CaseResearch[];
  hearings: CaseHearing[];
  limitationWarnings?: Array<{ title: string; description: string; date?: string }>;
  upcomingDeadlines?: Array<{ title: string; description: string; date?: string }>;
  missingDocuments?: Array<{ title: string; description: string; date?: string }>;
  isLegalCase?: boolean;
  accused?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CaseSummary {
  _id: string;
  name: string;
  clientName?: string;
  opponentName?: string;
  caseType?: string;
  status: 'Active' | 'Closed' | 'Archived';
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  documentCount: number;
  taskCount: number;
  hearingCount: number;
  updatedAt: string;
}
