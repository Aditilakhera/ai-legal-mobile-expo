/**
 * AI LEGAL™ – AI LEGAL Guide Service
 * Handles natural language search, step-by-step parsing, suggestions, and context-aware responses
 * specifically for app features, instructions, and navigation questions.
 */

export interface GuideResponse {
  reply: string;
  suggestions: string[];
  intentId?: string;
}

interface FollowUpDoc {
  intentId: string;
  keywords: string[];
  patterns: RegExp[];
  reply: string;
  suggestions: string[];
}

interface FeatureDoc {
  id: string;
  title: string;
  directAnswer: string;
  steps: string[];
  tips: string[];
  important: string[];
  related: string[];
  suggestions: string[];
  keywords: string[];
  patterns: RegExp[];
  followUps?: FollowUpDoc[];
  isAvailable?: boolean;
}

const LEGAL_DISCLAIMER_TERMS = [
  'ipc', 'crpc', 'cpc', 'section', 'article', 'constitution', 'judgment',
  'ruling', 'law of', 'what is the law', 'legal advice', 'how to sue',
  'divorce law', 'bail', 'sue', 'lawyer', 'advocate act', 'evidence act',
  'penal code', 'bail application', 'crime', 'murder', 'theft', 'assault'
];

const KNOWLEDGE_BASE: FeatureDoc[] = [
  {
    id: 'case_creation',
    title: 'Case Creation',
    directAnswer: 'You can create case folders in My Cases to organize your case dossiers.',
    steps: [
      'Navigate to My Cases from the bottom bar.',
      'Tap the "NEW CASE" button.',
      'Fill in the Case/Suit Name (mandatory) and Client Name.',
      'Select a Legal Domain (e.g. Civil Law, Corporate) and presider Court.',
      'Choose a Priority (Low, Medium, High, Urgent) and click Create Case Folder.'
    ],
    tips: [
      'Mandatory fields are marked with an asterisk (*).',
      'You can archive cases from the action menu to declutter your list.',
      'Always enter opponent party names to run automatic conflict-of-interest checks.'
    ],
    important: [
      'Case folders serve as the central ledger linking documents, evidence, and hearings together.',
      'Always save changes before leaving the case editing screen.'
    ],
    related: [
      'Case Workspace',
      'Edit Case Details',
      'Active Cases Dashboard'
    ],
    suggestions: ['How do I upload evidence?', 'Where is Draft Maker?', 'Explain Timeline'],
    keywords: [
      'case', 'create', 'new', 'initialize', 'make', 'add', 'edit',
      'ban', 'bana', 'banae', 'banega', 'naya', 'karna', 'category', 'suit'
    ],
    patterns: [
      /create.*case/i, /new.*case/i, /add.*case/i, /case.*creation/i,
      /case.*ban/i, /case.*bana/i, /case.*banega/i, /naya.*case/i,
      /edit.*case/i, /modify.*case/i, /category/i, /client/i
    ],
    followUps: [
      {
        intentId: 'case_category_help',
        keywords: ['category', 'dont know', 'don\'t know', 'jurisdiction', 'legal domain', 'domain', 'choose', 'select'],
        patterns: [
          /dont.*know/i, /category/i, /domain/i, /legal.*domain/i, /unsure/i
        ],
        reply: `If you do not know the exact legal domain/category, select 'General'.
↓
Steps
1 Open the Legal Domain field.
2 Select or type 'General'.
3 You can update this domain later once more details are retrieved.
↓
Tips
• You can change the category at any time from "Edit Details" inside the Case Workspace.
↓
Related
• Case Workspace
• Edit Details`,
        suggestions: ['How do I create a case?', 'Where is Draft Maker?']
      }
    ]
  },
  {
    id: 'evidence_vault',
    title: 'Evidence Vault',
    directAnswer: 'You can upload, verify, and run AI analysis on case documents from the Evidence Vault.',
    steps: [
      'Open My Cases and select your Case Workspace.',
      'Select the Evidence Vault tab.',
      'Tap Upload Evidence.',
      'Select PDF, DOCX, or Image formats from your device.',
      'Wait for the file to upload; the AI OCR text extraction will run automatically.'
    ],
    tips: [
      'Supported formats: PDF, DOCX, PNG, JPG.',
      'Maximum file size: 20MB per document.',
      'Do not upload encrypted or password-protected PDF briefs.'
    ],
    important: [
      'Uploading evidence triggers text indexing immediately so files become searchable.',
      'Wiping files from the vault removes all derived metadata annotations.'
    ],
    related: [
      'Scan Document',
      'Evidence Verification',
      'AI Analysis'
    ],
    suggestions: ['OCR Scanner', 'Document Verification', 'AI Analysis'],
    keywords: [
      'evidence', 'upload', 'document', 'vault', 'file', 'image', 'photo',
      'pdf', 'docx', 'png', 'jpg', 'size', 'delete', 'remove', 'clear', 'wipe'
    ],
    patterns: [
      /upload.*evidence/i, /upload.*document/i, /upload.*file/i, /evidence.*vault/i,
      /evidence.*upload/i, /document.*upload/i, /upload.*kaise/i, /delete.*evidence/i,
      /remove.*evidence/i
    ],
    followUps: [
      {
        intentId: 'delete_evidence_help',
        keywords: ['delete', 'remove', 'wipe', 'clear', 'discard'],
        patterns: [
          /delete/i, /remove/i, /wipe/i, /clear/i
        ],
        reply: `You can delete uploaded evidence from the Case Workspace.
↓
Steps
1 Go to your Evidence Vault inside the Case Workspace.
2 Tap the three dots icon next to the evidence item you want to delete.
3 Tap 'Delete' and confirm.
↓
Tips
• Deleting evidence is permanent and will wipe its extracted text indices from all semantic searches.
↓
Related
• Evidence Vault
• Case Notes`,
        suggestions: ['How do I upload evidence?', 'OCR Scanner']
      }
    ]
  },
  {
    id: 'draft_maker',
    title: 'Draft Maker',
    directAnswer: 'Draft Maker helps you generate ready-to-use legal briefs, rent deeds, and notices using AI.',
    steps: [
      'Tap AI Tools from the bottom navigation.',
      'Select Draft Maker.',
      'Choose a document template (e.g. Rent Deed, Legal Notice).',
      'Provide draft metadata (parties, dates, claim details).',
      'Click Generate Draft.'
    ],
    tips: [
      'You can review and manually edit generated drafts before exporting.',
      'Export drafts as Word (DOCX) or PDF formats.',
      'Keep prompt details specific for precise legal clause compliance.'
    ],
    important: [
      'AI-generated templates do not substitute formal advocate reviews.',
      'Generated drafts are logged under the documents tab of the active case.'
    ],
    related: [
      'Contract Analyzer',
      'Case Predictor',
      'Legal Research'
    ],
    suggestions: ['Contract Analyzer', 'Case Predictor', 'Explain Case Workspace'],
    keywords: [
      'draft', 'maker', 'generate', 'notice', 'rent', 'agreement', 'deed',
      'edit', 'modify', 'export', 'download', 'template', 'brief', 'letter'
    ],
    patterns: [
      /draft.*maker/i, /generate.*draft/i, /create.*draft/i, /rent.*agreement/i,
      /legal.*notice/i, /draft.*kahan/i, /draft.*open/i, /download.*draft/i,
      /export.*draft/i
    ]
  },
  {
    id: 'contract_analyzer',
    title: 'Contract Analyzer',
    directAnswer: 'Contract Analyzer extracts clauses, lists obligations, runs risk analysis, and flags liabilities.',
    steps: [
      'Go to AI Tools -> Contract Analyzer.',
      'Select a case or upload a PDF contract.',
      'Tap Run Analyzer.',
      'View extracted obligations and risk severity scores.',
      'Read AI recommendations for amendment options.'
    ],
    tips: [
      'Analyze lease deeds, service agreements, and commercial contracts.',
      'Extracts indemnities, termination, force majeure, and liability caps.',
      'Verify scanned PDFs have good clarity for accurate analysis.'
    ],
    important: [
      'Scoring tags clauses as Safe, Moderate Risk, or Severe Risk.',
      'Requires readable text layers; run OCR first on flat image scans.'
    ],
    related: [
      'Draft Maker',
      'Case Predictor',
      'Risk Scanner'
    ],
    suggestions: ['Draft Maker', 'Risk Scanner', 'Timeline'],
    keywords: [
      'contract', 'analyzer', 'analyze', 'review', 'risk', 'obligation', 'clause',
      'liability', 'amendment', 'indemnity', 'force majeure', 'termination'
    ],
    patterns: [
      /contract.*analyzer/i, /analyze.*contract/i, /review.*contract/i, /contract.*analysis/i,
      /contract.*use/i
    ]
  },
  {
    id: 'case_timeline',
    title: 'Case Timeline',
    directAnswer: 'Case Timeline is a chronological ledger organizing deadlines, hearing history, and factual milestones.',
    steps: [
      'Go to My Cases -> open your Case Workspace.',
      'Tap the Timeline tab.',
      'Scroll vertically to view litigation progress.',
      'Tap Add Milestone to manually log a key factual event.',
      'AI automatically extracts dates from evidence and logs them here.'
    ],
    tips: [
      'Filter timelines by hearing dates, filing deadlines, or facts.',
      'Syncs directly with calendar and litigation alerts.',
      'You can link evidence files to specific milestones.'
    ],
    important: [
      'Milestones with red badges reflect binding court deadlines.',
      'Chronology renders events in ascending date order.'
    ],
    related: [
      'Manage Hearings',
      'Evidence Vault',
      'Case Workspace'
    ],
    suggestions: ['Manage Hearings', 'Upload Evidence', 'Explain Case Workspace'],
    keywords: [
      'timeline', 'chronology', 'milestone', 'date', 'deadline', 'progress',
      'history', 'fact', 'event', 'calendar'
    ],
    patterns: [
      /timeline/i, /chronology/i, /milestone/i, /date/i, /timeline.*kya/i,
      /explain.*timeline/i
    ]
  },
  {
    id: 'hearings_reminders',
    title: 'Hearings & Reminders',
    directAnswer: 'Log court hearings, presiders, judges, agendas, and manage case alerts.',
    steps: [
      'Open Case Workspace -> Hearings tab.',
      'Tap the Add Hearing button.',
      'Input the court name, date, judge, agenda, and status.',
      'Save to configure automatic hearing reminder notifications.'
    ],
    tips: [
      'Notifications are triggered 24 hours and 2 hours before the hearing.',
      'Enable external calendar sync in Settings -> General Settings.'
    ],
    important: [
      'Active internet connections are required to sync reminder logs to notifications.',
      'You can change status markers from Scheduled to Disposed.'
    ],
    related: [
      'Case Timeline',
      'Settings Console'
    ],
    suggestions: ['View Timeline', 'Open Settings', 'Create New Case'],
    keywords: [
      'hearing', 'reminder', 'court', 'date', 'judge', 'alert', 'notification',
      'calendar', 'add hearing', 'time', 'agenda'
    ],
    patterns: [
      /hearing/i, /reminder/i, /court.*date/i, /judge/i, /alert/i, /notification/i,
      /hearing.*reminder/i
    ]
  },
  {
    id: 'settings_language',
    title: 'Settings & Language',
    directAnswer: 'Manage profile locales, secure locks, data backup storage, and clear cache.',
    steps: [
      'Navigate to Settings from the bottom menu.',
      'For Language: Tap General -> Language Selection -> choose English, Hindi, or Bilingual.',
      'For Backup: Tap Data & Storage -> Export JSON to share settings payload.',
      'For Cache: Tap Data & Storage -> Clear Cache to release local file storage.'
    ],
    tips: [
      'Bilingual mode supports Hindi/English mixed voice recognition.',
      'Enable PIN lock or Biometric authentication in Security settings.',
      'Always clear cache if document rendering slows down.'
    ],
    important: [
      'JSON settings backup exports do not contain case dossier documents due to privacy protocols.',
      'Local PIN lock blocks database screens but not server accounts.'
    ],
    related: [
      'Data Backup',
      'Notification Preferences'
    ],
    suggestions: ['Data Backup', 'Notification Settings', 'Clear Cache'],
    keywords: [
      'settings', 'language', 'change', 'locale', 'hindi', 'english', 'bilingual',
      'backup', 'export', 'data', 'security', 'pin', 'cache', 'clear', 'profile'
    ],
    patterns: [
      /settings/i, /language/i, /change.*language/i, /backup/i, /export/i,
      /security/i, /pin/i, /cache/i, /clear.*cache/i, /profile/i, /where.*profile/i
    ]
  },
  {
    id: 'legal_research',
    title: 'Legal Research',
    directAnswer: 'Research judicial precedents, judgments, and legal citations using AI.',
    steps: [
      'Go to AI Tools -> Legal Research.',
      'Enter research keywords or case citation numbers.',
      'Filter findings by Court, Year, and Topic.',
      'Tap "Save to Case" to bookmark the precedent.'
    ],
    tips: [
      'Indexes case law from Supreme Court, High Courts, and Tribunals.',
      'Matches keyword intents to extract contextual case ratios.',
      'Citations format conforms to standard legal style guides.'
    ],
    important: [
      'Precedent searches access historical logs, not real-time trials.',
      'Saved research briefs display inside case notes.'
    ],
    related: [
      'Argument Builder',
      'Case Predictor'
    ],
    suggestions: ['Argument Builder', 'Case Predictor', 'Contract Analyzer'],
    keywords: [
      'research', 'precedent', 'judgment', 'citation', 'case law', 'ratio',
      'court ruling', 'supreme court', 'high court', 'argument'
    ],
    patterns: [
      /research/i, /precedent/i, /judgment/i, /citation/i, /case.*law/i,
      /research.*use/i
    ]
  },
  {
    id: 'ocr_scanner',
    title: 'Evidence Analyst',
    directAnswer: 'OCR automatically scans images and PDFs to extract readable text briefs.',
    steps: [
      'Go to Case Workspace -> Evidence Vault.',
      'Upload a scanned photo or PDF.',
      'The OCR extraction runs automatically in the background.',
      'You can now perform key search indexing over the document text.'
    ],
    tips: [
      'OCR scanner preserves original layouts where possible.',
      'Supports mixed Hindi and English characters.',
      'Provides high accuracy for standard typewritten legal fonts.'
    ],
    important: [
      'Requires high image clarity to correctly resolve blurred letters.',
      'Saves derived OCR documents to cloud search models automatically.'
    ],
    related: [
      'Evidence Vault',
      'AI Analysis'
    ],
    suggestions: ['Upload Evidence', 'Document Verification', 'AI Analysis'],
    keywords: [
      'ocr', 'scan', 'scanner', 'extract text', 'image scan', 'photo scan',
      'read pdf', 'search pdf', 'background scan'
    ],
    patterns: [
      /ocr/i, /scan/i, /extract.*text/i, /ocr.*scanner/i, /scan.*document/i
    ]
  },
  // --- Alternative Workflows for Non-Existent Features ---
  {
    id: 'case_recovery',
    title: 'Case Recovery',
    isAvailable: false,
    directAnswer: 'Permanently deleted cases cannot be recovered.',
    steps: [
      'Use the Archive case feature instead of deleting files.',
      'Open My Cases -> Select Case -> Tap action menu.',
      'Select Archive to safely hide dossiers from active views.',
      'Restore archived cases at any time from settings filters.'
    ],
    tips: [
      'To restore an active profile setup, check Settings -> Data Backup.',
      'Ensure automatic local sync is enabled to preserve data drafts.'
    ],
    important: [
      'Once confirmed, the "Delete Case" command physically wipes documents from server archives.',
      'Always double-check file backup copies before deletion.'
    ],
    related: [
      'Settings Console',
      'Data Backup'
    ],
    suggestions: ['Open Settings', 'Create New Case'],
    keywords: ['recover', 'undelete', 'restore delete', 'retrieve delete', 'trash bin'],
    patterns: [/recover/i, /undelete/i, /restore.*delet/i, /retrieve.*delet/i, /trash/i]
  },
  {
    id: 'advocate_hiring',
    title: 'Advocate Representation',
    isAvailable: false,
    directAnswer: 'AI LEGAL is a practice tool, not a legal representation matching directory.',
    steps: [
      'Manage legal contacts in the Parties workspace ledger.',
      'Open Case Workspace -> Parties tab.',
      'Press Add Party -> Select role (Co-advocate, Opposing Counsel).',
      'Enter names, phone contact strings, and practice descriptions.',
      'Use the local roster to track case counsel details.'
    ],
    tips: [
      'Use AI Assistant to draft cover requests or retainers.',
      'Manage multiple client rosters simultaneously from My Cases.'
    ],
    important: [
      'AI LEGAL does not partner with, contract, or recommend outside law firms.',
      'All counsel representation details must be configured by users manually.'
    ],
    related: [
      'Case Workspace',
      'Settings Console'
    ],
    suggestions: ['Create New Case', 'Open Settings'],
    keywords: ['hire', 'find lawyer', 'recruit', 'appoint lawyer', 'law firm representation'],
    patterns: [/hire/i, /find.*lawyer/i, /recruit/i, /appoint/i, /firm/i]
  },
  {
    id: 'phone_support',
    title: 'Phone Helpline Support',
    isAvailable: false,
    directAnswer: 'Voice helpdesk phone service is currently not supported.',
    steps: [
      'Contact our web helpdesk support centers.',
      'Navigate to Settings -> Help & Support category.',
      'Select Contact Support Helpdesk or Report Bug.',
      'Type your description details and attach error logs.',
      'Submit the ticket to trigger email responses.'
    ],
    tips: [
      'Enable "Attach Logs" during bug submissions to resolve issues faster.',
      'Browse local documentation offline inside the Help Center.'
    ],
    important: [
      'Support operates 24/7 via text help tickets.',
      'Ensure settings email details match registration accounts.'
    ],
    related: [
      'Settings Console',
      'Natural Language Product Guide'
    ],
    suggestions: ['Open Settings', 'Contact Helpdesk'],
    keywords: ['call helpdesk', 'phone call', 'speak to agent', 'support phone', 'helpline'],
    patterns: [/call/i, /phone/i, /speak/i, /helpline/i]
  }
];

import { apiClient } from '../api/client';

export class GuideService {
  /**
   * Processes the user query and returns step-by-step guidance, troubleshooting, or legal intercepts.
   */
  static async getResponse(query: string, contextScreen: string = 'General', lastIntentId?: string | null): Promise<GuideResponse> {
    const q = query.toLowerCase().trim();

    // 1. Legal advice or Out of scope query check
    const isLegalTerm = LEGAL_DISCLAIMER_TERMS.some((term) => q.includes(term));
    const isRelated = this.isQueryRelated(q);

    if (isLegalTerm || !isRelated) {
      return {
        reply: "I'm the AI LEGAL Product Guide. I help users understand and use AI LEGAL. For legal assistance use AI Assistant. For general AI conversations use Chat Assistant.",
        suggestions: ['Open AI Assistant', 'Open Legal Research']
      };
    }

    // Try backend RAG context query first
    try {
      const response = await apiClient.post('/knowledge/query-guide', { query });
      if (response.data && response.data.success && response.data.answer) {
        return {
          reply: response.data.answer,
          suggestions: response.data.suggestions || ['How do I create a case?', 'How do I upload evidence?', 'Where is Draft Maker?']
        };
      }
    } catch (error) {
      console.warn("Backend RAG query failed, falling back to local guide:", error);
    }

    // 2. Contextual Follow-up checking
    if (lastIntentId) {
      const activeDoc = KNOWLEDGE_BASE.find(doc => doc.id === lastIntentId);
      if (activeDoc && activeDoc.followUps) {
        for (const fu of activeDoc.followUps) {
          const matchedFuPattern = fu.patterns.some(p => p.test(q));
          const matchedFuKeyword = fu.keywords.some(kw => q.includes(kw));
          if (matchedFuPattern || matchedFuKeyword) {
            return {
              reply: fu.reply,
              suggestions: fu.suggestions,
              intentId: lastIntentId // Keep context active
            };
          }
        }
      }
    }

    // 3. Score calculation for each guide feature
    let bestDoc: FeatureDoc | null = null;
    let maxScore = -1;

    for (const doc of KNOWLEDGE_BASE) {
      let score = 0;

      // Pattern scoring
      for (const pattern of doc.patterns) {
        if (pattern.test(q)) {
          score += 100;
        }
      }

      // Keyword scoring
      let matchedKeywordsCount = 0;
      for (const kw of doc.keywords) {
        if (q.includes(kw)) {
          score += 10;
          matchedKeywordsCount++;
        }
      }

      // Combined keyword match bonus
      if (matchedKeywordsCount >= 2) {
        score += 30;
      }

      // Context matching bonus
      if (contextScreen && contextScreen.toLowerCase().includes(doc.title.toLowerCase())) {
        score += 20;
      }

      if (score > maxScore) {
        maxScore = score;
        bestDoc = doc;
      }
    }

    // Threshold check (minimum matching score)
    const threshold = 15;
    if (bestDoc && maxScore >= threshold) {
      const reply = this.formatGuideReply(bestDoc);
      return {
        reply,
        suggestions: bestDoc.suggestions,
        intentId: bestDoc.id
      };
    }

    // Default Fallback (A friendly product introduction without forbidden phrases)
    return {
      reply: 'Welcome to the AI LEGAL Guide! I can help you use every feature of the AI LEGAL application. You can ask me how to create case folders, upload evidence, scan court documents, run AI analytics, schedule hearings, or manage settings. Please tell me what task you would like to complete.',
      suggestions: ['How do I create a case?', 'How do I upload evidence?', 'Where is Draft Maker?']
    };
  }

  private static isQueryRelated(query: string): boolean {
    const keywords = [
      'case', 'evidence', 'draft', 'contract', 'timeline', 'hearing', 'party', 'document', 'vault', 'note',
      'order', 'research', 'argument', 'task', 'notification', 'profile', 'setting', 'scan', 'ocr', 'sync',
      'backup', 'language', 'cache', 'delete', 'account', 'support', 'credit', 'subscription', 'upgrade',
      'help', 'bug', 'feature', 'how', 'where', 'what is', 'use', 'workspace', 'predictor', 'assistant', 'menu', 'button',
      'category', 'domain', 'court', 'judge', 'bana', 'banae', 'banega', 'banaye', 'karna', 'karo', 'kahan', 'kaise', 'milega',
      'recover', 'undelete', 'hire', 'call'
    ];
    return keywords.some((kw) => query.includes(kw));
  }

  private static formatGuideReply(doc: FeatureDoc): string {
    let reply = "";
    if (doc.isAvailable === false) {
      reply += "This feature is currently unavailable in AI LEGAL.\n\nHere is the closest available workflow:\n↓\n";
    } else {
      reply += `Yes.\n\nYou can access ${doc.title} inside the application.\n↓\n`;
    }
    
    // Steps
    doc.steps.forEach((step, idx) => {
      reply += `Step ${idx + 1}\n${step}\n↓\n`;
    });

    // Tips
    reply += `Tips\n`;
    doc.tips.forEach((tip) => {
      reply += `• ${tip}\n`;
    });
    reply += `↓\n`;

    // Important Notes
    reply += `Important Notes\n`;
    doc.important.forEach((note) => {
      reply += `• ${note}\n`;
    });
    reply += `↓\n`;

    // Related
    reply += `Related Features\n`;
    doc.related.forEach((rel) => {
      reply += `• ${rel}\n`;
    });

    return reply;
  }
}
