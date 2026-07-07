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

export interface LocalFeatureMapping {
  keywords: string[];
  patterns: RegExp[];
  topic: string;
  English: string;
  Hindi: string;
  Hinglish: string;
  EnglishDetails: string;
  HindiDetails: string;
  HinglishDetails: string;
  EnglishShort: string;
  HindiShort: string;
  HinglishShort: string;
  EnglishExample: string;
  HindiExample: string;
  HinglishExample: string;
  suggestions: string[];
}

const LOCAL_MAPPINGS: LocalFeatureMapping[] = [
  {
    keywords: ['draft maker', 'drafting', 'draftmaker', 'notice', 'petition', 'reply', 'agreement', 'affidavit', 'legal notice', 'draft'],
    patterns: [/draft.*maker/i, /notice/i, /petition/i, /agreement/i, /affidavit/i, /draft/i],
    topic: "Draft Maker",
    English: "Draft Maker is AI LEGAL's intelligent document drafting module. You can generate legal drafts like Notices, Agreements, Petitions, and Affidavits by just entering a few details.\n\nHow it works:\n• Select a template from the library or create a custom one.\n• Choose an existing case to automatically pull client details.\n• Alternatively, upload relevant case documents for context.\n• Tap 'Generate Draft' and AI will prepare a professional legal draft.\n\nTip: You can edit generated drafts manually or ask AI to suggest changes.",
    Hindi: "ड्राफ्ट मेकर AI LEGAL का एक बुद्धिमान दस्तावेज़ मसौदा तैयार करने का मॉड्यूल है। आप केवल कुछ जानकारी दर्ज करके कानूनी नोटिस, समझौते, याचिकाएं और शपथ पत्र तैयार कर सकते हैं।\n\nयह कैसे काम करता है:\n• लाइब्रेरी से एक टेम्पलेट चुनें या कस्टम टेम्पलेट बनाएं।\n• क्लाइंट के विवरण को जोड़ने के लिए मौजूदा केस का चयन करें।\n• प्रासंगिक केस दस्तावेज़ों को संदर्भ के लिए अपलोड करें।\n• 'जनरेट ड्राफ्ट' पर टैप करें और एआई एक पेशेवर कानूनी ड्राफ्ट तैयार करेगा।\n\nटिप: आप जनरेट किए गए ड्राफ्ट को मैन्युअल रूप से संपादित कर सकते हैं या एआई से बदलाव के सुझाव मांग सकते हैं।",
    Hinglish: "Draft Maker AI LEGAL ka intelligent document drafting module hai. Isme aap Legal Notice, Agreement, Petition, Reply, Affidavit aur dusre legal drafts sirf kuch details fill karke generate kar sakte hain.\n\nAap ye kar sakte hain:\n• Existing Case use kar sakte hain\n• Documents upload kar sakte hain\n• Template select karke manually details bhar sakte hain\n• 'Generate Draft' par tap karte hi AI automatically professional draft prepare karta hai.\n\nTip: Aap generated drafts ko manually edit kar sakte hain ya AI se suggest changes karwa sakte hain.",
    EnglishDetails: "Draft Maker is AI LEGAL's intelligent drafting system. It supports:\n1. Template Library (Notice, Agreement, Affidavits)\n2. Case context integration to prefill client names and facts\n3. Multi-language drafting. You can edit drafts manually, share them, or export as PDF.",
    HindiDetails: "ड्राफ्ट मेकर एक उन्नत ड्राफ्टिंग टूल है। इसमें शामिल हैं:\n1. टेम्पलेट लाइब्रेरी (नोटिस, समझौते, शपथ पत्र)\n2. क्लाइंट का नाम और तथ्यों को जोड़ने के लिए केस संदर्भ\n3. बहु-भाषा ड्राफ्टिंग। आप मैन्युअल संपादन कर सकते हैं और पीडीएफ में निर्यात कर सकते हैं।",
    HinglishDetails: "Draft Maker ek advanced drafting module hai. Isme:\n1. Template Library (Notice, Agreements, Affidavits) milti hai,\n2. Case detail automatically select ho jaati hai,\n3. Multi-language support hai. Aap manually text change kar sakte hain aur share ya print kar sakte hain.",
    EnglishShort: "Draft Maker helps you create professional legal documents using templates and case data.",
    HindiShort: "ड्राफ्ट मेकर आपको टेम्पलेट्स और केस डेटा का उपयोग करके पेशेवर कानूनी दस्तावेज बनाने में मदद करता है।",
    HinglishShort: "Draft Maker templates aur case information ka use karke legal documents generate karne me help karta hai.",
    EnglishExample: "Example: Draft a Tenant Agreement by choosing the Rent template, linking the active client case, and clicking 'Generate Draft'.",
    HindiExample: "उदाहरण: किराया टेम्प्लेट चुनकर, क्लाइंट केस को लिंक करके, और 'जनरेट ड्राफ्ट' पर क्लिक करके किरायेदार समझौता ड्राफ्ट करें।",
    HinglishExample: "Example: Rent Agreement draft karne ke liye template select karein, active client case link karein aur 'Generate Draft' par click karein.",
    suggestions: ['What is Case Assistant?', 'How do I upload evidence?', 'Explain Timeline']
  },
  {
    keywords: ['case', 'create', 'new case', 'make case', 'add case', 'case creation', 'case creator', 'ban', 'bana', 'banae', 'banega', 'naya case', 'case folder'],
    patterns: [/create.*case/i, /new.*case/i, /case.*ban/i, /case.*bana/i, /naya.*case/i, /case.*create/i],
    topic: "Case Creation",
    English: "You can create case folders inside AI LEGAL to keep all your case-related documents and evidence organized.\n\nHow to do it:\n• Go to 'My Cases' using the bottom navigation menu.\n• Tap the '+' (New Case) button in the top header.\n• Enter mandatory fields like Client Name, Case Type, Court, and Priority.\n• Save by clicking 'Create Case Folder'.\n\nTip: Enter opponent party details to run conflict-of-interest analysis automatically.",
    Hindi: "आप अपने सभी केस-संबंधित दस्तावेजों और साक्ष्यों को व्यवस्थित रखने के लिए AI LEGAL के भीतर केस फ़ोल्डर बना सकते हैं।\n\nकेस बनाने के चरण:\n• नीचे नेविगेशन मेनू से 'My Cases' पर जाएं।\n• सबसे ऊपर हेडर में '+' (नया केस) बटन पर टैप करें।\n• क्लाइंट का नाम, केस का प्रकार, न्यायालय और प्राथमिकता जैसे आवश्यक क्षेत्र दर्ज करें।\n• 'केस फ़ोल्डर बनाएं' पर क्लिक करके सहेजें।\n\nटिप: हितों के टकराव का विश्लेषण स्वचालित रूप से चलाने के लिए विरोधी पक्ष का विवरण भी दर्ज करें।",
    Hinglish: "Aap AI LEGAL me naya case create karke apne saare files aur documents ek jagah organize kar sakte hain.\n\nSteps:\n• Bottom menu se 'My Cases' par jayein.\n• Top right me '+' (New Case) button par tap karein.\n• Client Name, Case Type, Court Name aur Priority select karein.\n• 'Create Case Folder' par tap karke save karein.\n\nTip: Opponent party ka naam jarur enter karein taaki automatic conflict checks run ho sakein.",
    EnglishDetails: "Creating a case folder acts as a dossier for a litigation matter. In this folder, you store evidence, timelines, note pads, and hearing dates. Once created, you can launch AI analysis on this case, summarize its folders, or ask Case Assistant questions.",
    HindiDetails: "केस फ़ोल्डर बनाना एक मुकदमे के लिए एक डोजियर का काम करता है। इस फ़ोल्डर में आप साक्ष्य, समयसीमा, नोट पैड और सुनवाई की तारीखें संग्रहीत करते हैं। एक बार बनने के बाद, आप इस केस पर एआई विश्लेषण चला सकते हैं।",
    HinglishDetails: "Naya case create karne se aapke saare files aur files organize ho jaate hain. Iske baad aap pure folder par AI analysis run run kar sakte hain, timeline bana sakte hain aur Case Assistant se case status puch sakte hain.",
    EnglishShort: "Create a case folder inside My Cases to link and organize all documents, timeline, and evidence.",
    HindiShort: "दस्तावेजों, समयसीमा और साक्ष्यों को जोड़ने के लिए My Cases में एक नया केस बनाएं।",
    HinglishShort: "My Cases section me naya folder banayein taaki documents aur timeline ek jagah linked rahein.",
    EnglishExample: "Example: Add a new matter titled 'Landlord vs Tenant Dispute' with high priority under Civil Litigation category.",
    HindiExample: "उदाहरण: नागरिक मुकदमेबाजी श्रेणी के तहत उच्च प्राथमिकता के साथ 'मकान मालिक बनाम किरायेदार विवाद' शीर्षक से एक नया मामला जोड़ें।",
    HinglishExample: "Example: Civil litigation category ke under high priority select karke 'Landlord vs Tenant Dispute' naam ka new case add karein.",
    suggestions: ['How do I upload evidence?', 'Where is Draft Maker?', 'What is Timeline?']
  },
  {
    keywords: ['evidence', 'vault', 'upload', 'media', 'proof', 'saboot', 'file upload', 'document upload', 'exhibit'],
    patterns: [/evidence/i, /vault/i, /upload.*evidence/i, /upload.*document/i, /saboot/i],
    topic: "Evidence Vault",
    English: "The Evidence Vault is a secure repository to store, label, and analyze case documents and media files.\n\nHow to use it:\n• Open your case from 'My Cases' and tap the 'Evidence' tab.\n• Tap the '+' icon or 'Upload Evidence'.\n• Select files (PDFs, photos, videos, or voice recordings) from your device.\n• Assign exhibit numbers and tags to categorize your evidence.\n\nTip: Uploaded documents automatically run through OCR text extraction for semantic search.",
    Hindi: "एविडेंस वॉल्ट केस दस्तावेजों और मीडिया फाइलों को संग्रहीत, लेबल और विश्लेषण करने के लिए एक सुरक्षित भंडार है।\n\nइसका उपयोग कैसे करें:\n• 'My Cases' से अपना केस खोलें और 'एविडेंस' टैब पर टैप करें।\n• '+' आइकन या 'अपलोड एविडेंस' पर टैप करें।\n• अपने डिवाइस से फाइलें (पीडीएफ, फोटो, वीडियो या वॉयस रिकॉर्डिंग) चुनें।\n• अपने साक्ष्य को वर्गीकृत करने के लिए प्रदर्श नंबर और टैग निर्दिष्ट करें।\n\nटिप: अपलोड किए गए दस्तावेज सिमेंटिक खोज के लिए स्वचालित रूप से ओसीआर टेक्स्ट निष्कर्षण से गुजरते हैं।",
    Hinglish: "Evidence Vault aapke case ke saboot, files aur media store karne ki secure jagah hai.\n\nKaise use karein:\n• Kisi bhi case ko open karke 'Evidence' tab par jayein.\n• 'Upload Evidence' ya '+' icon par tap karein.\n• Apne phone se pdf, photo, audio ya video select karein.\n• Exhibit number aur tags dal kar save karein.\n\nTip: AI uploaded files par automatic OCR aur text extraction run karta hai.",
    EnglishDetails: "The Evidence Vault keeps PDFs, scanned pages, media clips, and briefs securely stored. When uploaded, AI runs OCR to extract texts, matches timelines, and cross-references facts to find contradictions or missing paperwork.",
    HindiDetails: "एविडेंस वॉल्ट पीडीएफ, स्कैन किए गए पेजों और मीडिया क्लिप को सुरक्षित रखता है। अपलोड होने पर, एआई टेक्स्ट निकालने, समयसीमा से मिलान करने और विरोधाभासों को खोजने के लिए ओसीआर चलाता है।",
    HinglishDetails: "Evidence Vault me photo, pdf aur media safe rehte hain. Upload karte hi AI automatic OCR scan karke text detect karta hai aur dates ko timeline me add karta hai.",
    EnglishShort: "A secure folder inside your case workspace to store, tag, and scan document evidence.",
    HindiShort: "दस्तावेजी साक्ष्यों को सहेजने, टैग करने और स्कैन करने के लिए आपके केस में एक सुरक्षित स्थान।",
    HinglishShort: "Case documents aur saboot ko organize aur scan karne ki jagah.",
    EnglishExample: "Example: Snap a picture of a physical receipt using 'Camera Scan', name it 'Exhibit-A1', and save it in the evidence tab.",
    HindiExample: "उदाहरण: 'कैमरा स्कैन' का उपयोग करके एक भौतिक रसीद की तस्वीर लें, इसे 'प्रदर्श-ए1' नाम दें, और इसे साक्ष्य टैब में सहेजें।",
    HinglishExample: "Example: Physical receipt ki picture click karke use 'Exhibit-A1' name dein aur evidence tab me upload karein.",
    suggestions: ['Draft Maker kya hai?', 'Explain Timeline', 'Suggest Legal Strategy']
  },
  {
    keywords: ['timeline', 'event', 'date', 'samay', 'chronology', 'incident', 'facts'],
    patterns: [/timeline/i, /event/i, /date/i, /chronology/i],
    topic: "Timeline",
    English: "The Case Timeline helps you track the chronological flow of key facts and events in a lawsuit.\n\nHow to view:\n• Navigate to your Case Workspace.\n• Click on the 'Timeline' tab.\n• View AI-extracted facts and dates automatically mapped in order.\n• Use the '+' button to add manual entries.\n\nTip: Highly useful for structuring cross-examination paths during trial preparation.",
    Hindi: "केस टाइमलाइन आपको मुकदमे में मुख्य तथ्यों और घटनाओं के कालानुक्रमिक प्रवाह को ट्रैक करने में मदद करती है।\n\nकैसे देखें:\n• अपने केस वर्कस्पेस पर जाएं।\n• 'टाइमलाइन' टैब पर क्लिक करें।\n• एआई द्वारा निकाले गए तथ्यों और तिथियों को स्वचालित रूप से क्रम में मैप किए गए देखें।\n• मैन्युअल प्रविष्टियाँ जोड़ने के लिए '+' बटन का उपयोग करें।\n\nटिप: परीक्षण की तैयारी के दौरान क्रॉस-परीक्षा पथों को व्यवस्थित करने के लिए अत्यधिक उपयोगी।",
    Hinglish: "Timeline aapke case ke saare incidents aur events ko date-wise chronology me show karta hai.\n\nKaise use karein:\n• Active case workspace me jayein.\n• 'Timeline' tab select karein.\n• AI documents se events and facts automatically extract karke chronology show karta hai.\n• Aap manually bhi '+' button se naya event add kar sakte hain.\n\nTip: Isse court hearings aur cross-examination ki taiyari me madad milti hai.",
    EnglishDetails: "The Timeline displays facts chronologically. AI reviews pleadings to extract date ranges and incident notes. You can filter events, add notes, edit items manually, or print a chronology report to present in court.",
    HindiDetails: "टाइमलाइन तथ्यों को कालानुक्रमिक क्रम में दिखाती है। एआई घटनाओं की तारीखें निकालता है। आप मैन्युअल रूप से प्रविष्टियां जोड़ सकते हैं, संपादित कर सकते हैं या अदालत में पेश करने के लिए रिपोर्ट प्रिंट कर सकते हैं।",
    HinglishDetails: "Timeline saare facts ko chronological order me dikhata hai. AI files ko read karke dates extract karta hai. Aap manually new event add kar sakte hain aur chronology report prepare kar sakte hain.",
    EnglishShort: "Chronological facts automatically extracted from case pleadings to track dates.",
    HindiShort: "महत्वपूर्ण तारीखों पर नज़र रखने के लिए केस के तथ्यों का कालानुक्रमिक क्रम।",
    HinglishShort: "Dates aur events ko sequence me show karne wala chronology tracker tool.",
    EnglishExample: "Example: Add a timeline milestone on '15th Jan 2026' for 'Agreement signing date' to map the dispute origin.",
    HindiExample: "उदाहरण: विवाद की उत्पत्ति को दर्शाने के लिए '15 जनवरी 2026' पर 'समझौता हस्ताक्षर तिथि' के लिए एक टाइमलाइन मील का पत्थर जोड़ें।",
    HinglishExample: "Example: Dispute starting date trace karne ke liye '15th Jan 2026' par 'Agreement signing date' ka event add karein.",
    suggestions: ['What is Case Assistant?', 'Draft Maker kya hai?', 'Evidence Vault kya hai?']
  },
  {
    keywords: ['case assistant', 'assistant', 'ai analysis', 'ask assistant', 'analysis', 'query case', 'chat case'],
    patterns: [/case.*assistant/i, /ai.*analysis/i, /ask.*assistant/i, /assistant.*kaise/i],
    topic: "Case Assistant",
    English: "The Case Assistant is a specialized AI coach that can read and search through all active case documents.\n\nHow to use it:\n• Tap 'Ask Assistant' inside your Case Workspace.\n• Ask questions like 'What is the date of the agreement?' or 'Summarize the defense arguments'.\n• AI scans uploaded PDFs, transcripts, and evidence to reply instantly.\n\nTip: Use it to find hidden details and prepare briefings without reading entire files.",
    Hindi: "केस असिस्टेंट एक विशेष एआई कोच है जो सभी सक्रिय केस दस्तावेजों को पढ़ और खोज सकता है।\n\nइसका उपयोग कैसे करें:\n• अपने केस वर्कस्पेस के अंदर 'Ask Assistant' पर टैप करें।\n• प्रश्न पूछें जैसे 'समझौते की तारीख क्या है?' या 'बचाव तर्कों का सारांश दें'।\n• एआई तुरंत उत्तर देने के लिए अपलोड किए गए पीडीएफ, ट्रांसक्रिप्ट और साक्ष्यों को स्कैन करता है।\n\nटिप: पूरी फाइलों को पढ़े बिना छिपे हुए विवरणों को खोजने और ब्रीफिंग तैयार करने के लिए इसका उपयोग करें।",
    Hinglish: "Case Assistant ek chat bot hai jo aapke specific case files aur documents ko analyze karta hai.\n\nKaise use karein:\n• Case open karke top par 'Ask Assistant' par tap karein.\n• Apne case documents ke baare me sawal puchein (jaise 'Client ka main claim kya hai?').\n• AI case data check karke reply dega.\n\nTip: Isse bina saare pages padhe important facts aur details jaldi mil jaati hain.",
    EnglishDetails: "Case Assistant is a dedicated chatbot inside the active case workspace. Unlike the general AI chatbot, it can see your case documents, notes, evidence list, and timeline entries, answering case-specific questions directly.",
    HindiDetails: "केस असिस्टेंट केस वर्कस्पेस के भीतर एक विशेष एआई चैटबॉट है। यह सामान्य एआई चैटबॉट के विपरीत, आपके केस दस्तावेजों, नोट्स और साक्ष्यों को देख सकता है और प्रश्नों के सीधे उत्तर दे सकता है।",
    HinglishDetails: "Case Assistant specific case workspace me chalta hai. Ye aapke active case files, notes aur timeline ko read karke questions ke custom replies de sakta hai.",
    EnglishShort: "Case-specific chatbot with access to all dossiers, documents, and evidence inside the workspace.",
    HindiShort: "केस वर्कस्पेस के भीतर का चैटबॉट जो आपके अपलोड किए गए दस्तावेजों को पढ़कर प्रश्नों के उत्तर देता है।",
    HinglishShort: "Case folder ke under chalne wala chat tool jo files analyze karke reply deta hai.",
    EnglishExample: "Example: Ask the Case Assistant: 'What was the exact monthly rent defined in the uploaded agreement PDF?'",
    HindiExample: "उदाहरण: केस असिस्टेंट से पूछें: 'अपलोड किए गए किराएनामे के पीडीएफ में परिभाषित मासिक किराया क्या था?'",
    HinglishExample: "Example: Case Assistant se puchein: 'Uploaded agreement PDF me monthly rent kitna likha hai?'",
    suggestions: ['Draft Maker kya hai?', 'Evidence Vault kya hai?', 'Suggest Legal Strategy']
  },
  {
    keywords: ['strategy', 'strategy engine', 'legal strategy', 'tactics', 'weak point', 'weakness'],
    patterns: [/strategy/i, /strategy.*engine/i, /weak.*point/i],
    topic: "Strategy Engine",
    English: "The Strategy Engine suggests procedural legal steps, defenses, and negotiation choices based on case files.\n\nHow to run:\n• Inside the case, open the 'AI Tools' tab.\n• Choose 'Strategy Engine'.\n• View generated defense vectors, missing facts, and liability percentages.\n\nTip: Feed opposing pleadings into the vault to generate custom counter-strategies.",
    Hindi: "रणनीति इंजन केस फाइलों के आधार पर प्रक्रियात्मक कानूनी कदमों, बचाव और बातचीत के विकल्पों का सुझाव देता है।\n\nकैसे चलाएं:\n• केस के अंदर, 'एआई टूल्स' टैब खोलें।\n• 'रणनीति इंजन' चुनें।\n• उत्पन्न बचाव वैक्टर, गायब तथ्यों और देयता प्रतिशत देखें।\n\nटिप: कस्टम काउंटर-रणनीति उत्पन्न करने के लिए विरोधी की दलीलों को वॉल्ट में फीड करें।",
    Hinglish: "Strategy Engine aapke case briefs aur facts ko analyze karke best litigation tactics aur steps suggest karta hai.\n\nKaise chalayein:\n• Case ke under 'AI Tools' section me jayein.\n• 'Strategy Engine' tool select karein.\n• AI procedural options, defences aur options analyze karke list show karein.\n\nTip: Naye documents upload hone par aap fresh strategy generate kar sakte hain.",
    EnglishDetails: "The Strategy Engine identifies strengths, weaknesses, procedural steps, and settlement opportunities by analyzing user pleadings and opponent files. It highlights missing elements or inconsistencies in the opponent's claim.",
    HindiDetails: "रणनीति इंजन केस फाइलों का विश्लेषण करके ताकत, कमजोरियों, प्रक्रियात्मक कदमों और निपटान के अवसरों की पहचान करता है। यह प्रतिद्वंद्वी के दावे में विसंगतियों को उजागर करता है।",
    HinglishDetails: "Strategy Engine cases files aur opponent claims ko read karke legal strengths, weaknesses aur tactics analyze karta hai aur settlement options suggest karta hai.",
    EnglishShort: "Analyzes case facts to recommend legal procedures, motions, and litigation strategies.",
    HindiShort: "मुकदमेबाजी की रणनीति, गतियों और कानूनी प्रक्रियाओं की सिफारिश करने के लिए केस तथ्यों का विश्लेषण करता है।",
    HinglishShort: "Case facts ko analyze karke litigation points aur defenses suggest karne wala tool.",
    EnglishExample: "Example: Run strategy on a recovery case to see options like filing a summary suit under Order 37 CPC.",
    HindiExample: "उदाहरण: ऑर्डर 37 सीपीसी के तहत संक्षिप्त मुकदमा दायर करने जैसे विकल्प देखने के लिए रिकवरी केस पर रणनीति चलाएं।",
    HinglishExample: "Example: Recovery case me Strategy Engine run karke Order 37 CPC ke under summary suit file karne ke benefits check karein.",
    suggestions: ['Draft Maker kya hai?', 'What is Legal Research?', 'Where is OCR Scanner?']
  },
  {
    keywords: ['research', 'legal research', 'precedent', 'judgments', 'court orders', 'citation', 'sections', 'explain section'],
    patterns: [/research/i, /legal.*research/i, /precedent/i, /citation/i, /explain.*section/i],
    topic: "Legal Research",
    English: "The Legal Research tool scans Supreme Court, High Court judgments, and central Bare Acts.\n\nHow to search:\n• Navigate to 'AI Tools' and open 'Legal Precedents'.\n• Type legal queries (e.g., 'Limitation for recovery suit') or a specific section number.\n• Review landmark case laws, citations, and legal explanations.\n\nTip: Click the bookmark icon to link relevant case laws directly to your case workspace.",
    Hindi: "कानूनी अनुसंधान उपकरण सुप्रीम कोर्ट, हाई कोर्ट के फैसलों और केंद्रीय बेयर एक्ट्स को स्कैन करता है।\n\nखोज कैसे करें:\n• 'एआई टूल्स' पर जाएं और 'कानूनी मिसालें' खोलें।\n• कानूनी प्रश्न टाइप करें (जैसे, 'वसूली मुकदमे के लिए सीमा') या एक विशिष्ट धारा संख्या दर्ज करें।\n• ऐतिहासिक केस कानूनों, उद्धरणों और कानूनी स्पष्टीकरणों की समीक्षा करें।\n\nटिप: प्रासंगिक केस कानूनों को सीधे अपने केस वर्कस्पेस से जोड़ने के लिए बुकमार्क आइकन पर क्लिक करें।",
    Hinglish: "Legal Research module ke jariye aap high court, supreme court judgments aur bare acts search kar sakte hain.\n\nKaise use karein:\n• 'AI Tools' section me 'Legal Precedents' par tap karein.\n• Apna query enter karein (jaise 'Section 438 CrPC bail precedents').\n• Laws, articles, sections aur related case ratios check karein.\n\nTip: Judgments ke key points ko bookmark karke directly active case file me save kar sakte hain.",
    EnglishDetails: "The Legal Research system provides precedents, judgments, and bare acts searching. It uses semantic keywords to find relevant high court/supreme court orders and ratios. Relevant findings can be bookmarked to your active case files.",
    HindiDetails: "कानूनी अनुसंधान प्रणाली सुप्रीम कोर्ट और हाई कोर्ट के फैसलों की खोज प्रदान करती है। संबंधित निर्णयों को सीधे आपके केस फाइलों में बुकमार्क किया जा सकता है।",
    HinglishDetails: "Legal Research milti hai jisme supreme court aur high court cases aur bare acts search kar sakte hain. Aap direct case law bookmark karke link kar sakte hain.",
    EnglishShort: "Search precedents, landmark cases, high court/supreme court ratios and bare acts.",
    HindiShort: "कानूनी मिसालें, सुप्रीम कोर्ट/हाई कोर्ट के फैसले और बेयर एक्ट्स खोजें।",
    HinglishShort: "Judgments, citations aur sections search karne wala legal database tool.",
    EnglishExample: "Example: Query 'Section 138 Negotiable Instruments Act' to view defense precedents on cheque bounce matters.",
    HindiExample: "उदाहरण: चेक बाउंस मामलों में बचाव की मिसालें देखने के लिए 'धारा 138 परक्राम्य लिखत अधिनियम' खोजें।",
    HinglishExample: "Example: Cheque bounce cases me defences search karne ke liye 'Section 138 Negotiable Instruments Act' query search karein.",
    suggestions: ['Draft Maker kya hai?', 'What is Strategy Engine?', 'How do I create a case?']
  },
  {
    keywords: ['reminder', 'hearings', 'limitations', 'upcoming hearings', 'limitation date', 'deadline', 'hearing'],
    patterns: [/reminder/i, /hearing/i, /deadline/i, /limitation/i],
    topic: "Reminders & Hearings",
    English: "AI LEGAL manages your litigation calendar by tracking hearing dates and filing deadlines.\n\nHow to check:\n• Go to the 'Hearings' tab in your active case.\n• Tap 'Add Hearing' to log dates, court rooms, judge details, and purposes.\n• AI scans evidence to notify you about statutory limitation dates.\n\nTip: Enabling notifications ensures you receive alerts before filing deadlines expire.",
    Hindi: "AI LEGAL सुनवाई की तारीखों और फाइलिंग की समयसीमा पर नज़र रखकर आपके मुकदमेबाजी कैलेंडर का प्रबंधन करता है।\n\nजांच कैसे करें:\n• अपने सक्रिय केस में 'सुनवाई' टैब पर जाएं।\n• तारीखें, कोर्ट रूम, जज का विवरण और उद्देश्य दर्ज करने के लिए 'सुनवाई जोड़ें' पर टैप करें।\n• एआई वैधानिक सीमा तिथियों के बारे में आपको सूचित करने के लिए साक्ष्यों को स्कैन करता है।\n\nटिप: सूचनाएं सक्षम करने से यह सुनिश्चित होता है कि आपको फाइलिंग की समयसीमा समाप्त होने से पहले अलर्ट प्राप्त हो।",
    Hinglish: "AI LEGAL me court hearings, dates aur deadline warnings ke liye automatic reminders features hain.\n\nKaise use karein:\n• Case workspace me open karein.\n• 'Hearings' tab me jake upcoming dates list dekh sakte hain. \n• '+' button press karke new hearing date, room number aur target update karein.\n\nTip: Home dashboard par critical limitation date aane par alert alert trigger hota hai.",
    EnglishDetails: "Manage upcoming hearings, court halls, presiders, and notes. The calendar generates automatic warning alerts for limitation dates, pleading deadlines, and compliance tasks, visible on the home dashboard screen.",
    HindiDetails: "आगामी सुनवाइयों, कोर्ट रूम, जज विवरण और नोट्स का प्रबंधन करें। सीमा तिथियों, दलीलों की समयसीमा और कार्यों के लिए डैशबोर्ड पर चेतावनी अलर्ट उत्पन्न होते हैं।",
    HinglishDetails: "Upcoming court hearings, courtroom number aur judge details save karein. Dashboard par statutory deadline aane par system alert show karta hai.",
    EnglishShort: "Add hearing schedules and receive automatic alerts before filing deadlines or limitations.",
    HindiShort: "सुनवाई का शेड्यूल जोड़ें और समयसीमा समाप्त होने से पहले अलर्ट प्राप्त करें।",
    HinglishShort: "Hearings aur deadline warnings manage karne wala calendar alert tool.",
    EnglishExample: "Example: Log the next date of hearing on '24th Aug 2026' in Court Room 4, and set a reminder alert.",
    HindiExample: "उदाहरण: कोर्ट रूम 4 में '24 अगस्त 2026' को सुनवाई की अगली तारीख दर्ज करें, और एक अनुस्मारक अलर्ट सेट करें।",
    HinglishExample: "Example: Court Room 4 me next hearing date '24th Aug 2026' log karke reminder notification set karein.",
    suggestions: ['Evidence Vault kya hai?', 'What is Case Assistant?', 'Draft Maker kya hai?']
  },
  {
    keywords: ['ocr', 'scan', 'scanner', 'camera scan', 'scan document', 'document scanner', 'convert text'],
    patterns: [/ocr/i, /scan/i, /scanner/i],
    topic: "OCR Scanner",
    English: "The OCR Scanner extracts clean, searchable text from scanned physical pages and files.\n\nHow to use:\n• Click '+' or 'Upload Evidence' within a Case Workspace.\n• Select the 'Camera Scan' feature.\n• Align the page and capture the image.\n• AI processes and converts the image to searchable PDF format.\n\nTip: Ensure clear lighting when taking photos to maximize recognition quality.",
    Hindi: "ओसीआर स्कैनर स्कैन किए गए भौतिक पृष्ठों और फ़ाइलों से स्पष्ट, खोजने योग्य पाठ निकालता है।\n\nउपयोग कैसे करें:\n• केस वर्कस्पेस के भीतर '+' या 'अपलोड एविडेंस' पर क्लिक करें।\n• 'कैमरा स्कैन' सुविधा का चयन करें।\n• पृष्ठ को संरेखित करें और छवि कैप्चर करें।\n• एआई प्रसंस्करण करता है और छवि को खोजने योग्य पीडीएफ प्रारूप में बदल देता है।\n\nटिप: पहचान की गुणवत्ता को अधिकतम करने के लिए तस्वीरें लेते समय स्पष्ट प्रकाश व्यवस्था सुनिश्चित करें।",
    Hinglish: "OCR Scanner scanned PDFs, petitions aur photo se text extract karke editable text banata hai.\n\nKaise karein:\n• Evidence section me jake upload select karein.\n• Camera scan mode active karke physical copy ki photo click karein.\n• AI automatically readable aur searchable file generate karega.\n\nTip: Purane case documents ke words aur lines search karne ke liye ye bahut useful hai.",
    EnglishDetails: "OCR scans documents (PDFs, images) using the device camera or file selector, extracting clean readable text. This allows scanned physical papers or photo evidence to become searchable inside the case folders.",
    HindiDetails: "ओसीआर डिवाइस कैमरे का उपयोग करके दस्तावेजों को स्कैन करता है और पाठ निकालता है। इससे भौतिक साक्ष्य केस फ़ाइलों के अंदर खोजने योग्य बन जाते हैं।",
    HinglishDetails: "OCR Scanner camera se photos click karke physical papers ko readable text format me convert karta hai jisse searchable pdf ban sakein.",
    EnglishShort: "Extracts text from scanned files and images to convert them into searchable documents.",
    HindiShort: "स्कैन की गई फाइलों और चित्रों को खोजने योग्य दस्तावेजों में बदलने के लिए उनसे पाठ निकालता है।",
    HinglishShort: "Scanned photos aur files se text extract karke read karne wala scan module.",
    EnglishExample: "Example: Scan a physical printout of a police report; the scanner will convert the image into searchable text.",
    HindiExample: "उदाहरण: पुलिस रिपोर्ट के एक भौतिक प्रिंटआउट को स्कैन करें; स्कैनर छवि को खोजने योग्य पाठ में बदल देगा।",
    HinglishExample: "Example: Police report ka photo click karke scan karein; scanner pure image ko readable text me convert kar dega.",
    suggestions: ['Evidence Vault kya hai?', 'What is Strategy Engine?', 'Where is Draft Maker?']
  },
  {
    keywords: ['hindi', 'english', 'hinglish', 'explain in hindi', 'explain in english', 'batao', 'mein', 'language'],
    patterns: [/explain.*in.*hindi/i, /explain.*in.*english/i, /hinglish/i, /language/i],
    topic: "Language Settings",
    English: "Understood. I will now explain features in English. Please ask your question.",
    Hindi: "समझ गया। अब से मैं आपको हिंदी में जानकारी दूँगा। कृपया अपना प्रश्न पूछें।",
    Hinglish: "Samjh gaya. Ab se main aapko saare answers Hinglish me dunga. Apna question puchein.",
    EnglishDetails: "I support English, Hindi, and Hinglish. You can toggle manually by telling me: 'Explain in Hindi', 'English me batao', or 'Hinglish me samjhao'. I will persist this choice.",
    HindiDetails: "मैं अंग्रेजी, हिंदी और हिंग्लिश का समर्थन करता हूं। आप मुझे बताकर भाषा बदल सकते हैं: 'Explain in Hindi', 'English me batao', या 'Hinglish me samjhao'। मैं इस पसंद को याद रखूँगा।",
    HinglishDetails: "Main English, Hindi aur Hinglish support karta hoon. Aap language manually switch karne ke liye bol sakte hain, jaise: 'Explain in Hindi', 'English me batao', ya 'Hinglish me samjhao'.",
    EnglishShort: "Persistent language switching (English/Hindi/Hinglish) support.",
    HindiShort: "स्थायी भाषा बदलने (अंग्रेजी/हिंदी/हिंग्लिश) का समर्थन।",
    HinglishShort: "Persistent language switching (English/Hindi/Hinglish) support.",
    EnglishExample: "Example: Ask 'Hindi me batao' to switch explanations into Hindi.",
    HindiExample: "उदाहरण: हिंदी में स्पष्टीकरण स्विच करने के लिए 'हिंदी में समझाएं' पूछें।",
    HinglishExample: "Example: Hinglish me answers pane ke liye 'Hinglish me batao' likhein.",
    suggestions: ['Draft Maker kya hai?', 'Evidence Vault kya hai?', 'Explain Timeline']
  }
];

export interface ChatHistoryEntry {
  role: 'user' | 'assistant';
  content: string;
}

export class GuideService {
  private static userPreferredLanguage: 'Hindi' | 'English' | 'Hinglish' | null = null;
  private static history: ChatHistoryEntry[] = [];
  private static lastMatchedMapping: LocalFeatureMapping | null = null;

  private static detectLanguage(query: string): 'Hindi' | 'Hinglish' | 'English' {
    const q = query.toLowerCase().trim();

    // Explicit overrides
    if (q.includes('explain in hindi') || q.includes('hindi me') || q.includes('hindi mein') || q.includes('hindi samjhao') || q.includes('hindi btao') || q.includes('hindi batao') || q.includes('हिंदी')) {
      this.userPreferredLanguage = 'Hindi';
      return 'Hindi';
    }
    if (q.includes('explain in english') || q.includes('english me') || q.includes('english mein') || q.includes('english btao') || q.includes('english batao')) {
      this.userPreferredLanguage = 'English';
      return 'English';
    }
    if (q.includes('hinglish me') || q.includes('hinglish mein') || q.includes('hinglish')) {
      this.userPreferredLanguage = 'Hinglish';
      return 'Hinglish';
    }

    // Devanagari script detection
    if (/[\u0900-\u097F]/.test(query)) {
      return 'Hindi';
    }

    // Respect persistent user preference if set
    if (this.userPreferredLanguage) {
      return this.userPreferredLanguage;
    }

    // Hinglish phonetic keyword detection
    const hinglishKeywords = [
      'kya', 'kaise', 'karo', 'hai', 'batao', 'btao', 'hota', 'karte', 'hum', 'main', 'ko', 'se',
      'ne', 'kahan', 'kab', 'kis', 'usse', 'isme', 'karke', 'kiya', 'tha', 'raha', 'rahi',
      'hoga', 'sakte', 'sakta', 'chahiye', 'banae', 'banaye', 'banayein', 'bana', 'chalaye',
      'chalayein'
    ];

    const words = q.split(/\s+/);
    const hasHinglish = words.some(w => hinglishKeywords.includes(w));
    if (hasHinglish) {
      return 'Hinglish';
    }

    return 'English';
  }

  private static cleanResponseText(text: string): string {
    if (!text) return "";
    
    let clean = text;

    // 1. Remove generic footers
    const footerPhrases = [
      /for\s+more\s+details\s+on\s+ai\s+legal.*/gi,
      /for\s+more\s+details\s+and\s+its\s+features.*/gi,
      /for\s+more\s+details\s+visit.*/gi,
      /for\s+more\s+details.*/gi,
      /visit\s+our\s+website.*/gi,
      /learn\s+more\s+at.*/gi,
      /learn\s+more.*/gi,
      /documentation\s+at.*/gi,
      /contact\s+support.*/gi,
    ];
    footerPhrases.forEach(re => {
      clean = clean.replace(re, '');
    });

    // 2. Remove URLs
    clean = clean.replace(/https?:\/\/\S+/gi, '');

    // 3. Remove raw markdown tokens (**, ***, __, ##, ###, `, etc.)
    clean = clean
      .replace(/\*\*+/g, '') // remove **
      .replace(/#+\s+/g, '') // remove # headings
      .replace(/__+/g, '') // remove __
      .replace(/`+/g, '') // remove backticks
      .replace(/^>\s*/gm, '') // remove quote block indicators
      .replace(/\s*↓\s*/g, '\n') // remove flow arrows
      .trim();

    return clean;
  }

  /**
   * Processes the user query and returns step-by-step guidance, troubleshooting, or legal intercepts.
   */
  static async getResponse(query: string, contextScreen: string = 'General', lastIntentId?: string | null): Promise<GuideResponse> {
    const q = query.toLowerCase().trim();
    const words = q.split(/\s+/);

    // 1. Legal advice check
    const isLegalTerm = LEGAL_DISCLAIMER_TERMS.some((term) => q.includes(term));
    if (isLegalTerm) {
      return {
        reply: "I'm the AI LEGAL Product Guide. I help users understand and use AI LEGAL. For legal assistance use AI Assistant. For general AI conversations use Chat Assistant.",
        suggestions: ['Open AI Assistant', 'Open Legal Research']
      };
    }

    // 2. Language & Style detection
    const lang = this.detectLanguage(query);

    const isHindiSwitch = q.includes('hindi me') || q.includes('hindi mein') || q.includes('hindi samjhao') || q.includes('hindi btao') || q.includes('hindi batao') || q.includes('translate') || q.includes('हिंदी');
    const isEnglishSwitch = q.includes('english me') || q.includes('english mein') || q.includes('english btao') || q.includes('english batao');
    const isHinglishSwitch = q.includes('hinglish me') || q.includes('hinglish mein') || q.includes('hinglish');
    const isDetailSwitch = q.includes('detail') || q.includes('deep') || q.includes('lamba') || q.includes('bada') || q.includes('expand') || q.includes('vistaar');
    const isShortSwitch = q.includes('short') || q.includes('chhota') || q.includes('summary') || q.includes('sankshep') || q.includes('brief') || q.includes('chota');
    const isExampleSwitch = q.includes('example') || q.includes('उदाहरण') || q.includes('misal') || q.includes('misaal');

    // 3. Match Predefined Feature Mappings
    let bestMapping: LocalFeatureMapping | null = null;
    let maxMappingScore = -1;

    for (const mapping of LOCAL_MAPPINGS) {
      let score = 0;
      for (const pattern of mapping.patterns) {
        if (pattern.test(q)) {
          score += 100;
        }
      }
      for (const kw of mapping.keywords) {
        if (q.includes(kw)) {
          score += 10;
        }
      }
      if (score > maxMappingScore) {
        maxMappingScore = score;
        bestMapping = mapping;
      }
    }

    // 4. Resolve Context Topic (Pronoun and Follow-up understanding)
    let targetMapping: LocalFeatureMapping | null = null;
    
    if (bestMapping && maxMappingScore >= 15) {
      targetMapping = bestMapping;
      this.lastMatchedMapping = bestMapping;
    } else if (this.lastMatchedMapping) {
      const followUpWords = ['ye', 'usme', 'isko', 'same', 'it', 'this', 'that', 'how', 'why', 'process', 'use', 'explain', 'tell me', 'iske baad', 'phir', 'fir', 'kya hota', 'samjhao', 'batao', 'btao', 'karo', 'kaise', 'bataen'];
      const isFollowUp = words.some(w => followUpWords.includes(w)) || 
                          isHindiSwitch || isEnglishSwitch || isHinglishSwitch || 
                          isDetailSwitch || isShortSwitch || isExampleSwitch ||
                          words.length <= 4;
      if (isFollowUp) {
        targetMapping = this.lastMatchedMapping;
      }
    }

    if (targetMapping) {
      let replyText = "";
      if (isDetailSwitch) {
        replyText = targetMapping[(lang + 'Details') as keyof LocalFeatureMapping] as string;
      } else if (isShortSwitch) {
        replyText = targetMapping[(lang + 'Short') as keyof LocalFeatureMapping] as string;
      } else if (isExampleSwitch) {
        replyText = targetMapping[(lang + 'Example') as keyof LocalFeatureMapping] as string;
      } else {
        replyText = targetMapping[lang as keyof LocalFeatureMapping] as string;
      }

      const responseObj = {
        reply: this.cleanResponseText(replyText),
        suggestions: targetMapping.suggestions
      };
      
      // Save to static memory
      this.history.push({ role: 'user', content: query });
      this.history.push({ role: 'assistant', content: responseObj.reply });
      if (this.history.length > 20) this.history.splice(0, this.history.length - 20);

      return responseObj;
    }

    // 5. Fallback to general out of scope guide check
    const isRelated = this.isQueryRelated(q);
    if (!isRelated) {
      let outOfScopeReply = "I'm the AI LEGAL Product Guide and can help you understand features of the AI LEGAL application. Please ask anything related to the app.";
      if (lang === 'Hindi') {
        outOfScopeReply = "मैं AI LEGAL प्रोडक्ट गाइड हूँ और AI LEGAL एप्लिकेशन की सुविधाओं को समझने में आपकी मदद कर सकता हूँ। कृपया ऐप से संबंधित कुछ भी पूछें।";
      } else if (lang === 'Hinglish') {
        outOfScopeReply = "Main AI LEGAL Product Guide hoon aur AI LEGAL application ke features ko samajhne me aapki help kar sakta hoon. Please app se related hi sawal puchein.";
      }
      
      const responseObj = {
        reply: outOfScopeReply,
        suggestions: ['Draft Maker kya hai?', 'Evidence Vault kya hai?', 'Explain Timeline']
      };

      this.history.push({ role: 'user', content: query });
      this.history.push({ role: 'assistant', content: responseObj.reply });
      if (this.history.length > 20) this.history.splice(0, this.history.length - 20);

      return responseObj;
    }

    // 6. Try backend RAG context query
    try {
      const response = await apiClient.post('/knowledge/query-guide', { query });
      if (response.data && response.data.success && response.data.answer) {
        const cleanedReply = this.cleanResponseText(response.data.answer);
        
        const responseObj = {
          reply: cleanedReply,
          suggestions: response.data.suggestions || ['How do I create a case?', 'How do I upload evidence?', 'Where is Draft Maker?']
        };

        this.history.push({ role: 'user', content: query });
        this.history.push({ role: 'assistant', content: responseObj.reply });
        if (this.history.length > 20) this.history.splice(0, this.history.length - 20);

        return responseObj;
      }
    } catch (error) {
      console.warn("Backend RAG query failed, falling back to local guide:", error);
    }

    // 7. Default Fallback
    let fallbackReply = 'Welcome to the AI LEGAL Guide! I can help you use every feature of the AI LEGAL application. You can ask me how to create case folders, upload evidence, scan court documents, run AI analytics, schedule hearings, or manage settings. Please tell me what task you would like to complete.';
    if (lang === 'Hindi') {
      fallbackReply = 'AI LEGAL गाइड में आपका स्वागत है! मैं AI LEGAL एप्लिकेशन की हर सुविधा का उपयोग करने में आपकी मदद कर सकता हूं। आप मुझसे पूछ सकते हैं कि केस फ़ोल्डर कैसे बनाएं, साक्ष्य कैसे अपलोड करें, अदालती दस्तावेजों को कैसे स्कैन करें, एआई विश्लेषण कैसे चलाएं, सुनवाइयों को कैसे शेड्यूल करें, या सेटिंग्स का प्रबंधन कैसे करें। कृपया मुझे बताएं कि आप कौन सा कार्य पूरा करना चाहते हैं।';
    } else if (lang === 'Hinglish') {
      fallbackReply = 'AI LEGAL Guide me aapka welcome hai! Main AI LEGAL app ke saare features use karne me aapki help kar sakta hoon. Aap mujhse puch sakte hain ki case folder kaise banayein, evidence kaise upload karein, court documents kaise scan karein, AI analysis kaise karein, hearings kaise schedule karein, ya settings kaise manage karein. Please batayein aap kya karna chahte hain.';
    }

    const responseObj = {
      reply: fallbackReply,
      suggestions: ['How do I create a case?', 'How do I upload evidence?', 'Where is Draft Maker?']
    };

    this.history.push({ role: 'user', content: query });
    this.history.push({ role: 'assistant', content: responseObj.reply });
    if (this.history.length > 20) this.history.splice(0, this.history.length - 20);

    return responseObj;
  }

  private static isQueryRelated(query: string): boolean {
    const keywords = [
      'case', 'evidence', 'draft', 'contract', 'timeline', 'hearing', 'party', 'document', 'vault', 'note',
      'order', 'research', 'argument', 'task', 'notification', 'profile', 'setting', 'scan', 'ocr', 'sync',
      'backup', 'language', 'cache', 'delete', 'account', 'support', 'credit', 'subscription', 'upgrade',
      'help', 'bug', 'feature', 'how', 'where', 'what is', 'use', 'workspace', 'predictor', 'assistant', 'menu', 'button',
      'category', 'domain', 'court', 'judge', 'bana', 'banae', 'banega', 'banaye', 'karna', 'karo', 'kahan', 'kaise', 'milega',
      'recover', 'undelete', 'hire', 'call', 'saboot', 'kya hai', 'kya hota', 'difference'
    ];
    return keywords.some((kw) => query.includes(kw));
  }
}
