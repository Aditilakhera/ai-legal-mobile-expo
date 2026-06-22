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
  id?: string;
  name: string;
  type: string;
  description: string;
  notes?: string;
  exhibitNumber?: string;
  status?: 'Verified' | 'Pending' | 'Rejected' | 'Disputed';
  tags?: string[];
  url?: string;
  fileSize?: string;
  uploadedBy?: string;
  uploadedDate?: string;
  ocrData?: {
    text?: string;
    datesDetected?: string[];
    namesDetected?: string[];
    addressesDetected?: string[];
    signaturesDetected?: string[];
    amountsDetected?: string[];
    registrationNumbers?: string[];
    caseNumbers?: string[];
    courtNames?: string[];
    judges?: string[];
  };
  aiAnalysis?: {
    summary?: string;
    relevance?: string;
    extractedText?: string;
    entities?: {
      people?: string[];
      dates?: string[];
      addresses?: string[];
      amounts?: string[];
    };
    caseRelevance?: string;
    suggestedTimelineEvents?: string[];
    suggestedHearingLinks?: string[];
    suggestedArguments?: string[];
    applicableLaws?: string[];
    possibleWeaknesses?: string[];
    confidenceScore?: number;
  };
  relatedLinks?: {
    timelineEvents?: string[];
    hearings?: string[];
    research?: string[];
    arguments?: string[];
    drafts?: string[];
    contracts?: string[];
  };
  hash?: string;
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
  priority: 'Low' | 'Medium' | 'High' | 'Urgent' | 'Critical';
  checklist?: { title: string; checked: boolean }[];
  reminder?: string;
  assignTo?: string;
  relatedHearing?: string;
  linkedHearing?: string;
  relatedTimelineEvent?: string;
  relatedEvidence?: string;
  relatedDocument?: string;
  notes?: string;
  attachments?: string[];
  source?: string;
  createdAt?: string;
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
  drafts?: CaseDraft[];
  notes?: CaseNote[];
  contracts?: any[];
  courtOrders?: CourtOrder[];
  opposingLawyer?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CaseDraftVersion {
  version: number;
  content: string;
  createdAt: string;
  changes: string;
}

export interface CaseDraft {
  id: string;
  name: string;
  type: string;
  content: string;
  versions: CaseDraftVersion[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  status: 'Draft' | 'In Progress' | 'Completed' | 'Reviewed';
  aiSuggestions: string[];
  exportHistory: string[];
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

export interface CaseNote {
  _id?: string;
  id?: string;
  title: string;
  content: string;
  category: string;
  tags?: string[];
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  attachments?: Array<{ name: string; url: string; type: string }>;
  voiceRecordingUrl?: string;
  relatedHearing?: string;
  relatedTimelineEvent?: string;
  relatedEvidence?: string;
  relatedArgument?: string;
  relatedResearch?: string;
  favorite?: boolean;
  pinned?: boolean;
  archived?: boolean;
  aiSummary?: {
    shortSummary?: string;
    keyPoints?: string[];
    importantFacts?: string[];
    actionItems?: string[];
  };
  aiEntities?: Array<{ text: string; type: string }>;
  aiSuggestedLinks?: Array<{ type: string; targetId: string; targetName: string; confirmed?: boolean }>;
  aiSuggestedActions?: Array<{ type: string; description: string; accepted?: boolean }>;
  versions?: Array<{ version: number; content: string; createdAt: string }>;
  createdAt?: string;
  updatedAt?: string;
}

export interface CourtOrder {
  _id?: string;
  id?: string;
  name: string;
  url?: string;
  fileSize?: string;
  ocrText?: string;
  status: 'Pending' | 'Completed' | 'Compliance Pending' | 'AI Analyzed';
  uploadedBy?: string;
  metadata?: {
    courtName?: string;
    judgeName?: string;
    bench?: string;
    courtNumber?: string;
    caseNumber?: string;
    orderDate?: string;
    nextHearingDate?: string;
    orderType?: string;
    stageOfCase?: string;
    petitioner?: string;
    respondent?: string;
    advocates?: string;
    caseStatus?: string;
  };
  aiSummary?: {
    shortSummary?: string;
    keyPoints?: string[];
  };
  complianceItems?: Array<{
    _id?: string;
    description: string;
    status: 'Pending' | 'Completed' | 'Overdue';
    dueDate?: string;
    priority: 'Low' | 'Medium' | 'High' | 'Critical';
    responsiblePerson?: string;
  }>;
  suggestedTasks?: Array<{
    _id?: string;
    title: string;
    description: string;
    priority?: string;
    accepted?: boolean;
  }>;
  suggestedTimeline?: Array<{
    _id?: string;
    title: string;
    description: string;
    date: string;
    accepted?: boolean;
  }>;
  suggestedHearings?: Array<{
    _id?: string;
    title: string;
    date: string;
    courtroom?: string;
    judge?: string;
    purpose?: string;
    accepted?: boolean;
  }>;
  suggestedArguments?: Array<{
    _id?: string;
    title: string;
    logic: string;
    precedents?: string;
    accepted?: boolean;
  }>;
  suggestedResearch?: Array<{
    _id?: string;
    act: string;
    section: string;
    description: string;
    accepted?: boolean;
  }>;
  suggestedEvidence?: Array<{
    _id?: string;
    title: string;
    description: string;
    status?: string;
    accepted?: boolean;
  }>;
  riskAnalysis?: {
    proceduralDefects?: string[];
    weaknessDetails?: string[];
    limitationRisk?: string;
    jurisdictionIssue?: boolean;
    objectionsProbability?: number;
  };
  linkedRecords?: {
    hearingsCount?: number;
    tasksCount?: number;
    evidenceCount?: number;
  };
  createdAt?: string;
  updatedAt?: string;
}
