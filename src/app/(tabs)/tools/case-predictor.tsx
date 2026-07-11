import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Platform,
  TouchableOpacity,
  Modal,
  Dimensions,
  Clipboard,
  Share,
  Animated,
  TouchableWithoutFeedback,
  Keyboard,
  KeyboardAvoidingView,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
// @ts-ignore
// eslint-disable-next-line import/no-unresolved
import { Ionicons } from '@expo/vector-icons';
import { useToastContext, useThemeContext } from '@/providers';
import { CaseService } from '@/services/case.service';
import { CaseSummary } from '@/types';

// Copilot hooks & components
import { useChat } from '@/hooks/use-chat';
import { useChatStore } from '@/store/chat';
import { useSpeechRecognition, SpeechLanguage } from '@/hooks/use-speech-recognition';
import { useAttachmentHandler } from '@/hooks/use-attachment-handler';
import { AttachmentBottomSheet } from '@/components/ui/bottomSheets/AttachmentBottomSheet';
import { CustomCameraModal } from '@/components/ui/legal/CustomCameraModal';
import { MarkdownRenderer } from '@/components/ui/documents';

const { width, height } = Dimensions.get('window');

// Step 1: Upload Documents list mockup
const MOCK_PREDICT_DOCS = [
  { id: 'suit', name: 'plaintiff_suit_filing.pdf', size: '2.4 MB', type: 'Civil Suit Plaint' },
  { id: 'reply', name: 'defense_written_statement.docx', size: '1.8 MB', type: 'Written Statement' },
  { id: 'evidence', name: 'exhibit_agreement_copy.pdf', size: '850 KB', type: 'Contract Evidence' },
];

// Step 2: 10 extraction progress steps
const PROCESSING_STEPS = [
  'Reading Documents',
  'OCR Extraction',
  'Identifying Parties',
  'Detecting Issues',
  'Mapping Evidence',
  'Finding Relevant Laws',
  'Finding Similar Judgments',
  'Running Prediction Model',
  'Building Strategy',
  'Generating Report',
];

// Tab 4: Precedents mockup data
const WINNING_FACTORS_DATA = [
  {
    title: 'Signed Agreement & Direct Admits',
    desc: 'The defendant signed execution contracts on May 10, 2026. Sig verification shifts presumption under law.',
    impact: 'Critical Win Driver',
    confidence: '94%',
    importance: 'High Importance',
    color: '#10B981'
  },
  {
    title: 'Strong Documentary Evidence Logs',
    desc: 'Exhibits Ex-1 to Ex-4 include certified bank memos and dishonoured cheque papers matching registry entries.',
    impact: 'High Impact',
    confidence: '92%',
    importance: 'Critical Importance',
    color: '#10B981'
  },
  {
    title: 'Statutory Notice Timely Served',
    desc: 'Demand notice served on May 14 meets strict 30-day post dishonour requirements under NI Act.',
    impact: 'Moderate Impact',
    confidence: '98%',
    importance: 'High Importance',
    color: '#0EA5E9'
  },
  {
    title: 'Relevant Supreme Court Citation',
    desc: 'Rangappa v. Sri Mohan binding precedent on burden shift is directly applicable to uncontested execution.',
    impact: 'High Impact',
    confidence: '88%',
    importance: 'Critical Importance',
    color: '#10B981'
  },
  {
    title: 'Presumption Burden Shifts to Accused',
    desc: 'Once basic ingredients are proved, Section 139 mandates presumption of enforceable debt.',
    impact: 'Critical Win Driver',
    confidence: '90%',
    importance: 'Critical Importance',
    color: '#10B981'
  }
];

const WEAKNESSES_DATA = [
  {
    title: 'No Independent Witness Registry',
    desc: 'Pleadings contain no testimony from third-party transaction auditors or public officials.',
    probReduction: '-12% success reduction',
    impact: 'Moderate Vulnerability',
    mitigation: 'Subpoena joint auditor ledger files during issues formulation.',
    color: '#EF4444'
  },
  {
    title: 'Missing Original Invoice copies',
    desc: 'Secondary photo copies of bills might trigger admissibility objections from defense.',
    probReduction: '-8% success reduction',
    impact: 'Low Vulnerability',
    mitigation: 'Submit Bankers Books Evidence certificate matching bank logs.',
    color: '#F59E0B'
  },
  {
    title: 'Limitation Delay of 11 Days',
    desc: 'Statutory notice served 11 days late due to courier registry gaps.',
    probReduction: '-15% success reduction',
    impact: 'High Vulnerability',
    mitigation: 'File condonation application under Section 142(1)(b) proviso.',
    color: '#EF4444'
  },
  {
    title: 'Possible Limitation Expiry Challenge',
    desc: 'Defendant will claim complaint period expired prior to filing desk registry submission.',
    probReduction: '-10% success reduction',
    impact: 'Moderate Vulnerability',
    mitigation: 'Present tracking delivery confirmations showing post office closure schedules.',
    color: '#EF4444'
  },
  {
    title: 'Compounding Settlement Risks',
    desc: 'Accused company declaring bankruptcy stays cash recovery actions.',
    probReduction: '-5% success reduction',
    impact: 'Low Vulnerability',
    mitigation: 'File case directly against directors in personal capacities.',
    color: '#F59E0B'
  }
];

const SCENARIOS_DATA = [
  {
    title: 'Scenario A: Defendant admits signature execution',
    desc: 'Presumption is activated immediately, restricting defense to proof of debt discharge.',
    chance: '84% Winning Chance',
    color: '#10B981'
  },
  {
    title: 'Scenario B: Signature authenticity disputed',
    desc: 'Case requires forensic handwriting examination report under Section 45, delaying trial.',
    chance: '58% Winning Chance',
    color: '#F59E0B'
  },
  {
    title: 'Scenario C: Primary witness unavailable',
    desc: 'Failure to summon branch manager leaves bank return memos uncertified in cross trial.',
    chance: '46% Winning Chance',
    color: '#EF4444'
  },
  {
    title: 'Scenario D: Settlement reached before evidence stage',
    desc: 'Parties agree to compounding terms under Damodar S. Prabhu compounding guidelines.',
    chance: '72% Settlement Likelihood',
    color: '#0EA5E9'
  }
];

const JUDGE_INSIGHTS_DATA = [
  {
    title: 'Typical Judicial View on Sec 138 NI Act',
    desc: 'Magistrates favor statutory notice adherence strictly, placing a heavy initial burden on cheque drawers.'
  },
  {
    title: 'Likely Magistrate Questions during trial',
    desc: 'Did the complainant receive stop payment alerts prior to cheque presentation dispatch?'
  },
  {
    title: 'Likely Objections from Opposing Counsel',
    desc: 'Objection to secondary printout screenshot files lacking signed Section 65B affidavits.'
  },
  {
    title: 'Important Court Concerns',
    desc: 'Verifying if notice was dispatched within exactly 30 days of receiving bank bounce slips.'
  },
  {
    title: 'Expected Legal Scrutiny Points',
    desc: 'Matching signature stroke match overlaps and company stamp authorization seals.'
  },
  {
    title: 'Most Persuasive Evidence Formats',
    desc: 'Certified speed post delivery tracking receipts and official Bankers book logs.'
  }
];

const parseFollowUpSuggestions = (text: string) => {
  let mainText = text;
  let suggestions: string[] = [];
  let disclaimer = '';

  const discIdx = text.indexOf('--- DISCLAIMER ---');
  if (discIdx !== -1) {
    mainText = text.substring(0, discIdx).trim();
    disclaimer = text.substring(discIdx + 18).trim();
  }

  const sugIdx = mainText.indexOf('--- SUGGESTIONS ---');
  if (sugIdx !== -1) {
    const sugPart = mainText.substring(sugIdx + 19).trim();
    mainText = mainText.substring(0, sugIdx).trim();
    
    suggestions = sugPart
      .split('\n')
      .map((s) => s.replace(/^[•\-*\s✓\d.]+\s*/, '').trim())
      .filter((s) => s.length > 0);
  }

  if (suggestions.length === 0) {
    const match = mainText.match(/(?:suggested next actions|next actions|suggestions):([\s\S]+)$/i);
    if (match) {
      const listText = match[1].trim();
      mainText = mainText.replace(match[0], '').trim();
      suggestions = listText
        .split('\n')
        .map((s) => s.replace(/^[•\-*\s✓\d.]+\s*/, '').trim())
        .filter((s) => s.length > 0);
    }
  }

  return { cleanedText: mainText, suggestions, disclaimer };
};

export const getDetailedLegalAnalysis = (title: string, type: 'factor' | 'weakness' | 'scenario' | 'judge' | 'timeline') => {
  const cleanTitle = title.trim();

  const customMap: Record<string, { heading: string; text: string }[]> = {
    "Signed Agreement & Direct Admits": [
      { heading: "Litigation Strategic Overview", text: "The signed contract and direct execution admissions represent the strongest pillar of the prosecution party's case. Under Indian contract jurisprudence, once execution of a document is admitted or proved, the court is bound to read the document as valid and binding, thereby shifting the legal burden of rebuttal entirely onto the defending party." },
      { heading: "Statutory Provisions & Applicable Acts", text: "Governed primarily under Section 139 of the Negotiable Instruments Act, 1881, which mandates a legal presumption of enforceable debt. It also relies on Section 58 of the Indian Evidence Act, 1872 (admitted facts need not be proved), and Section 31 of the same Act regarding the evidentiary value of admissions." },
      { heading: "Evidence Corroboration & Case Link", text: "Directly supported by the uploaded Commercial Agreement dated 12 May 2024 (Clause 8, Payment Terms). The execution signatures match the defendant's corporate board resolution approvals and the signature copy on the returned bank memo." },
      { heading: "Opposing Arguments & Defence Tactics", text: "The opposing counsel is expected to claim that the signature was obtained under duress, or that the agreement was signed as a blank security document without any actual delivery of goods or services. They may also challenge the board authorization." },
      { heading: "Mitigation & Counter-Litigation Strategy", text: "Counter this defense by submitting a series of invoice deliveries and email chains showing successful receipt and utilization of the services. File a prompt affidavit confirming signature matching and active trade operations." },
      { heading: "Litigation Importance & Court Impact", text: "Impact Score: HIGH. This factor establishes the mandatory legal presumption. Unless the defense provides strong, uncontested documentary evidence of debt discharge, the court will hold the drawer liable under Section 138 NI Act." }
    ],
    "Strong Documentary Evidence Logs": [
      { heading: "Litigation Strategic Overview", text: "Written entries in business records carry a high standard of proof in summary trials. The presence of bank return memos and registered ledger entries establishes a clear track record of the default, making it difficult for the defense to plead oral modifications or payment discharge." },
      { heading: "Statutory Provisions & Applicable Acts", text: "Governed under Section 34 of the Indian Evidence Act (Relevancy of entries in books of accounts), read with Section 4 of the Bankers' Books Evidence Act, 1891, which permits certified bank statement logs to serve as prima facie evidence." },
      { heading: "Evidence Corroboration & Case Link", text: "Corroborated by the bank return memo returned with code 'Insufficient Funds' and the official certified bank ledger records showing a clean history of transaction failures." },
      { heading: "Opposing Arguments & Defence Tactics", text: "The defense will likely raise procedural objections under Section 65B of the Indian Evidence Act, claiming the bank logs are electronic records and cannot be admitted without a valid electronic media certificate." },
      { heading: "Mitigation & Counter-Litigation Strategy", text: "Mitigate by filing a signed Section 65B compliance affidavit alongside the bank branch manager's certificate under the Bankers' Books Evidence Act to ensure immediate admissibility." },
      { heading: "Litigation Importance & Court Impact", text: "Impact Score: HIGH. The court relies heavily on official banking records. Direct proofs of bank memo bounces are rarely discarded by Magistrates unless severe procedural tampering is demonstrated." }
    ],
    "Statutory Notice Timely Served": [
      { heading: "Litigation Strategic Overview", text: "Serving the demand notice within the statutory period is a mandatory condition precedent for a cause of action. Timely service guarantees the admissibility of the complaint, preventing any summary dismissal on jurisdiction or limitation grounds." },
      { heading: "Statutory Provisions & Applicable Acts", text: "Under Section 138 Proviso (b) of the NI Act, the complainant must issue the demand notice within 30 days of receiving the bank bounce memo. Under Section 27 of the General Clauses Act, service is presumed once notice is dispatched to the correct address." },
      { heading: "Evidence Corroboration & Case Link", text: "Supported by the postal dispatch slip dated May 14, 2026, which is exactly 12 days after the bank return memo receipt, well within the 30-day statutory window." },
      { heading: "Opposing Arguments & Defence Tactics", text: "The defendant will claim they never received the notice due to incorrect address delivery or that the envelope was empty. They will challenge the postal tracking logs." },
      { heading: "Mitigation & Counter-Litigation Strategy", text: "Produce the online tracking delivery receipt showing 'Item Delivered' at the registered corporate address. Rely on the Supreme Court ruling in C.C. Alavi Haji v. Palapetty Muhammed." },
      { heading: "Litigation Importance & Court Impact", text: "Impact Score: CRITICAL. Without proving notice delivery or proper dispatch, the entire complaint is non-maintainable and will be dismissed without examining merits." }
    ],
    "No Independent Witness Registry": [
      { heading: "Litigation Strategic Overview", text: "The absence of third-party witnesses increases reliance on documentary evidence. While not fatal to the complaint, it allows the defense to claim that the transaction was a personal friendly loan without commercial backing." },
      { heading: "Statutory Provisions & Applicable Acts", text: "Governed under Section 134 of the Indian Evidence Act, which states that no particular number of witnesses is required in any case to prove a fact. The court evaluates the quality, not quantity, of evidence." },
      { heading: "Evidence Corroboration & Case Link", text: "The current case documents rely solely on the complainant's affidavit and direct bank transfers, lacking testimony from independent audit personnel." },
      { heading: "Opposing Arguments & Defence Tactics", text: "The defense will argue that the funds transfer was for personal reasons or friendly assistance, challenging the commercial enforceability of the debt." },
      { heading: "Mitigation & Counter-Litigation Strategy", text: "Subpoena the bank branch manager or corporate accountant to present the official ledger accounts showing how the payment was accounted for in commercial books." },
      { heading: "Litigation Importance & Court Impact", text: "Impact Score: MEDIUM. Standard commercial cases are decided on documents. Independent oral witnesses are secondary, but adding a bank officer's testimony seals the proof." }
    ],
    "Missing Original Invoice copies": [
      { heading: "Litigation Strategic Overview", text: "Lacking the original invoice copies weakens the primary transaction trail. It allows the defendant to dispute the exact delivery of goods or services, claiming the cheque was obtained without consideration." },
      { heading: "Statutory Provisions & Applicable Acts", text: "Sections 63 and 65 of the Indian Evidence Act, 1872, govern secondary evidence admissibility. A party must prove the loss or unavailability of the original before secondary copies can be read." },
      { heading: "Evidence Corroboration & Case Link", text: "Only digital photocopies of the invoice bills were uploaded. The originals remain in the possession of the transport logistics partner." },
      { heading: "Opposing Arguments & Defence Tactics", text: "The defense will object to the admissibility of the photocopies, claiming they are fabricated and that no actual delivery took place." },
      { heading: "Mitigation & Counter-Litigation Strategy", text: "File an application for secondary evidence under Section 65. Simultaneously, procure certified delivery challans or duplicate invoice registers verified by the logistics manager." },
      { heading: "Litigation Importance & Court Impact", text: "Impact Score: HIGH. Proving consideration is essential. The presumption under Sec 139 is rebuttable, and disputing delivery is the defense's primary route to rebuttal." }
    ],
    "Limitation Delay of 11 Days": [
      { heading: "Litigation Strategic Overview", text: "A delay in filing the complaint or serving notice beyond the limitation window strips the court of its authority to hear the case, unless a condonation of delay application is explicitly filed and approved." },
      { heading: "Statutory Provisions & Applicable Acts", text: "Section 142(1)(b) Proviso of the NI Act allows the court to condone delay if the complainant satisfies the court that there was sufficient cause for not making the complaint within the period." },
      { heading: "Evidence Corroboration & Case Link", text: "The notice dispatch was delayed by 11 days because the corporate registry office was closed due to local administrative lockdown guidelines." },
      { heading: "Opposing Arguments & Defence Tactics", text: "The defendant will argue that the limitation period has expired, the complaint is time-barred, and that administrative reasons do not qualify as 'sufficient cause'." },
      { heading: "Mitigation & Counter-Litigation Strategy", text: "File a condonation application supported by a detailed affidavit. Attach the official notification of the administrative closure and local lockouts during those 11 days." },
      { heading: "Litigation Importance & Court Impact", text: "Impact Score: CRITICAL. Condonation must be decided first. If the court rejects the delay condonation, the case is dismissed immediately without a trial on merits." }
    ]
  };

  if (customMap[cleanTitle]) {
    return customMap[cleanTitle];
  }

  return [
    { heading: "Strategic Context & Legal Importance", text: "This phase or point is vital for establishing the legal parameters of the claim. In litigation strategy, failing to document this stage properly allows the opposing party to raise procedural objections." },
    { heading: "Applicable Acts & Core Principles", text: "Governed by the provisions of the Code of Civil Procedure, 1908, the Indian Evidence Act, 1872, or the specific commercial act applicable to the dispute (such as the Negotiable Instruments Act)." },
    { heading: "Supporting Documents & Evidentiary Link", text: "Reference must be made to the primary agreements, banking ledger records, and tracking receipts uploaded to the case workspace, which confirm the transaction occurred." },
    { heading: "Expected Opponent Objections & Defense", text: "The defense is likely to challenge the timing of the service, signature authenticity, or raise objections to digital copies lacking electronic verification certificates." },
    { heading: "Mitigation Steps & Advocacy Strategy", text: "Maintain strict tracking logs, certify all electronic files, and prepare witness affidavits. Consult binding Supreme Court precedents to rebut any arguments regarding procedural delays." },
    { heading: "Actionable Recommendations", text: "Next Step: Draft the appropriate petition or application, verify the original registers, and synchronize the documents with the Evidence Analyst." }
  ];
};

export default function CasePredictorScreen() {
  const { showToast } = useToastContext();
  const { theme, isDark } = useThemeContext();
  const styles: any = useMemo(() => getStyles(theme, isDark), [theme, isDark]);
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // Wizard Navigation States
  // 'HOME' -> 'ANALYZING' -> 'INTELLIGENCE'
  const [step, setStep] = useState<'HOME' | 'ANALYZING' | 'INTELLIGENCE'>('HOME');

  // Tabs for STEP 3: Prediction, Winning Factors, Weaknesses, Scenarios, Judge Insights, Timeline, Reports
  const [activeTab, setActiveTab] = useState<'prediction' | 'factors' | 'weaknesses' | 'scenarios' | 'judge' | 'timeline' | 'reports'>('prediction');

  // Existing Cases mapping
  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [linkedCaseId, setLinkedCaseId] = useState<string>('');
  const [isCaseSelectOpen, setIsCaseSelectOpen] = useState(false);

  // Manual inputs form fields (Card 3)
  const [isManualFormOpen, setIsManualFormOpen] = useState(false);
  const [manualTitle, setManualTitle] = useState('');
  const [manualCourt, setManualCourt] = useState('');
  const [manualFacts, setManualFacts] = useState('');
  const [manualClaims, setManualClaims] = useState('');

  // Upload selectors state (Card 2)
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);

  // AI Extraction Progress states
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [progressVal] = useState(new Animated.Value(0));

  // Collapsible Summary Header
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);
  const summaryAnim = useRef(new Animated.Value(0)).current;

  const toggleSummary = () => {
    const toValue = isSummaryExpanded ? 0 : 1;
    setIsSummaryExpanded(!isSummaryExpanded);
    Animated.spring(summaryAnim, {
      toValue,
      useNativeDriver: false,
      friction: 8,
      tension: 60,
    }).start();
  };

  const handleResultsScroll = (event: any) => {
    if (isSummaryExpanded) {
      setIsSummaryExpanded(false);
      Animated.timing(summaryAnim, { toValue: 0, duration: 220, useNativeDriver: false }).start();
    }
  };

  // Expandable accordions for Tab views
  const [expandedFactors, setExpandedFactors] = useState<Record<number, boolean>>({ 0: true });
  const [expandedWeaknesses, setExpandedWeaknesses] = useState<Record<number, boolean>>({ 0: true });
  const [expandedScenarios, setExpandedScenarios] = useState<Record<number, boolean>>({ 0: true });
  const [expandedJudge, setExpandedJudge] = useState<Record<number, boolean>>({ 0: true });
  const [expandedTimeline, setExpandedTimeline] = useState<Record<number, boolean>>({ 2: true });

  const [loadingOverlayText, setLoadingOverlayText] = useState<string | null>(null);

  const handleLaunchModule = (module: 'court_prep' | 'cross_exam' | 'reply_draft' | 'ask_copilot' | 'evidence_verify', item: any, sourceTab: string) => {
    let loadingText = 'Loading Case Context...';
    let targetRoute = '';
    let targetParams: any = {
      caseId: linkedCaseId || 'independent_temp',
      caseName: linkedCaseName,
      sourceTab,
      selectedItemTitle: item.title || item.stage || '',
    };

    if (module === 'court_prep') {
      loadingText = 'Preparing Court Arguments...';
      targetRoute = '/tools/argument-builder';
      targetParams.mode = 'arguments';
      targetParams.injectPrompt = `Prepare courtroom arguments using this Case Predictor analysis for: ${item.title || item.stage}. Ensure it includes Opening Statement, legal issues, and prayer.`;
    } else if (module === 'cross_exam') {
      loadingText = 'Generating Cross Examination Strategy...';
      targetRoute = '/tools/argument-builder';
      targetParams.mode = 'cross_examination';
      targetParams.injectPrompt = `Generate professional cross-examination questions based on the Case Predictor finding: ${item.title || item.stage}. Include trap questions and witness impeachment strategy.`;
    } else if (module === 'reply_draft') {
      loadingText = 'Drafting Reply Strategy...';
      targetRoute = '/tools/draft-maker';
      targetParams.mode = 'draft';
      targetParams.draftType = 'Reply Notice';
      targetParams.injectPrompt = `Draft a Reply Notice based on the Case Predictor finding: ${item.title || item.stage}. Use statutory acts and relevant precedents.`;
    } else if (module === 'evidence_verify') {
      loadingText = 'Synchronizing Evidence with Analyst...';
      targetRoute = '/tools/evidence-analyst';
      targetParams.injectPrompt = `Analyze whether the evidence supports or weakens this Case Predictor finding: ${item.title || item.stage}.`;
    } else if (module === 'ask_copilot') {
      setIsAiAssistantOpen(true);
      setChatInput(`Regarding "${item.title || item.stage}": How can we mitigate this weakness or strengthen this point in our litigation?`);
      return;
    }

    setLoadingOverlayText(loadingText);
    setTimeout(() => {
      setLoadingOverlayText(null);
      router.push({
        pathname: targetRoute as any,
        params: targetParams,
      });
    }, 1200);
  };

  // Executive Full Report Modal
  const [isReportViewerOpen, setIsReportViewerOpen] = useState(false);

  // Fetch active Case Workspaces on mount
  useEffect(() => {
    const fetchCasesList = async () => {
      try {
        const response = await CaseService.listCases();
        const list = Array.isArray(response) ? response : (response?.data || []);
        setCases(list.filter((c: any) => c.isLegalCase));
      } catch (err) {
        console.warn('Failed to load cases:', err);
      }
    };
    fetchCasesList();
  }, []);

  const handleSelectCase = (caseId: string) => {
    setLinkedCaseId(caseId);
    showToast('success', 'Case Synced', 'Timeline, evidence, and pleadings loaded successfully.');
    // Trigger Analysis Immediately
    handleStartAnalysis();
  };

  const handleSelectDoc = (docId: string) => {
    setSelectedDocId(docId);
    showToast('success', 'Document Selected', 'OCR queued for litigation model.');
  };

  const handleStartAnalysis = () => {
    setStep('ANALYZING');
    setCurrentStepIdx(0);
    progressVal.setValue(0);

    let idx = 0;
    const interval = setInterval(() => {
      idx += 1;
      if (idx < PROCESSING_STEPS.length) {
        setCurrentStepIdx(idx);
        Animated.timing(progressVal, {
          toValue: (idx + 1) / PROCESSING_STEPS.length,
          duration: 300,
          useNativeDriver: false,
        }).start();
      } else {
        clearInterval(interval);
        setStep('INTELLIGENCE');
        showToast('success', 'Forecast Ready', 'Winning probability metrics generated.');
      }
    }, 450);
  };

  // Case Predictor Copilot state hook configurations
  const {
    sessions,
    activeSessionId,
    activeSession,
    sending: isAiThinking,
    setActiveSessionId,
    startNewSession,
    deleteChatSession,
    renameChatSession,
    dispatchMessageStream,
    cancelMessageStream,
  } = useChat('legal_case_predictor');

  const [selectedLanguage, setSelectedLanguage] = useState<SpeechLanguage>('en');
  const {
    isRecording,
    isTranscribing,
    partialText,
    duration,
    startRecording,
    stopRecording,
    cancelRecording,
  } = useSpeechRecognition((transcribedText) => {
    if (transcribedText) {
      setChatInput((prev) => (prev ? prev + ' ' + transcribedText : transcribedText));
    }
  });

  const {
    attachments,
    showAttachmentOptions,
    handleSelectOption,
    handleRemoveAttachment,
    clearAttachments,
    isCameraVisible,
    hideCamera,
    handleCameraConfirm,
  } = useAttachmentHandler();

  const [isAiAssistantOpen, setIsAiAssistantOpen] = useState(false);
  const copilotScrollRef = useRef<ScrollView>(null);
  const [chatInput, setChatInput] = useState('');
  const [showScrollToLatest, setShowScrollToLatest] = useState(false);

  const handleScroll = (event: any) => {
    const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
    const distanceFromBottom = contentSize.height - layoutMeasurement.height - contentOffset.y;
    if (contentSize.height > layoutMeasurement.height && distanceFromBottom > 150) {
      setShowScrollToLatest(true);
    } else {
      setShowScrollToLatest(false);
    }
  };

  // Custom dialogs & UI states
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [renameSessionId, setRenameSessionId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSuggestionsSheetOpen, setIsSuggestionsSheetOpen] = useState(false);

  // Suggestions timeline categories
  const CASE_SUGGESTIONS_SHEET = {
    Outcome: [
      'Predict Final Outcome',
      'Increase Success Chances',
      'Estimate Settlement Probability',
      'Appeal Chances',
    ],
    Risks: [
      'Analyze Opponent Strategy',
      'Summarize Litigation Risks',
      'Review Weaknesses',
      'Burden of Proof',
    ],
    Actions: [
      'Find Missing Evidence',
      'Prepare Cross Questions',
      'Suggest Legal Arguments',
      'Generate Hearing Strategy',
    ],
  };

  // Animated dot progress indicators
  const [thinkingDotCount, setThinkingDotCount] = useState(1);
  useEffect(() => {
    let interval: any;
    if (isAiThinking) {
      interval = setInterval(() => {
        setThinkingDotCount((prev) => (prev % 3) + 1);
      }, 400);
    } else {
      setThinkingDotCount(1);
    }
    return () => clearInterval(interval);
  }, [isAiThinking]);

  const getThinkingDotsText = () => '.'.repeat(thinkingDotCount);

  // Sync speech preview to chat input
  useEffect(() => {
    if (isRecording && partialText) {
      setChatInput(partialText);
    }
  }, [partialText, isRecording]);

  const [expandedSuggestions, setExpandedSuggestions] = useState<Record<string, boolean>>({});
  const toggleExpandSuggestions = (msgId: string) => {
    setExpandedSuggestions((prev) => ({
      ...prev,
      [msgId]: !prev[msgId],
    }));
  };

  const handleOpenRename = (id: string, currentTitle: string) => {
    setRenameSessionId(id);
    setRenameValue(currentTitle);
    setIsRenameDialogOpen(true);
  };

  const handleConfirmRename = async () => {
    if (renameSessionId && renameValue.trim()) {
      await renameChatSession(renameSessionId, renameValue.trim());
      setIsRenameDialogOpen(false);
      setRenameSessionId(null);
      setRenameValue('');
      showToast('success', 'Session Renamed', 'Conversation title updated successfully.');
    }
  };

  const handleDeletePress = (id: string) => {
    Alert.alert(
      'Delete Conversation',
      'Are you sure you want to delete this conversation?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteChatSession(id);
            showToast('success', 'Conversation Deleted', 'Session removed.');
          },
        },
      ]
    );
  };

  const handleClearConversation = () => {
    if (activeSessionId) {
      useChatStore.getState().updateSession(activeSessionId, { messages: [] });
      showToast('success', 'Conversation Cleared', 'Active analysis log cleared.');
    }
  };

  const handleClearPress = () => {
    Alert.alert(
      'Clear Conversation',
      'Are you sure you want to clear all messages in this conversation? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            handleClearConversation();
          }
        }
      ]
    );
  };

  const shortenSuggestion = (text: string) => {
    if (text.length > 25) return text.substring(0, 22) + '...';
    return text;
  };

  const handleNewChat = () => {
    startNewSession('New Outcome Prediction', 'legal_case_predictor');
    showToast('success', 'New Predictor Session', 'Ready to model litigation outcomes.');
  };

  const handleExportChat = () => {
    if (!activeSession || !activeSession.messages || activeSession.messages.length === 0) {
      showToast('error', 'No Messages', 'There is no conversation to export.');
      return;
    }
    const formattedMessages = activeSession.messages
      .map((m) => {
         const senderLabel = m.role === 'user' ? 'Lawyer' : 'Case Predictor Specialist';
         return `[${senderLabel}]:\n${m.content}\n`;
      })
      .join('\n────────────────────────\n\n');
    const exportText = `Case Outcome Prediction Report: ${activeSession.title || 'Untitled Predictor'}\n\n${formattedMessages}`;
    
    Share.share({
      title: 'Export Case Prediction Log',
      message: exportText,
    })
      .then((res) => {
        if (res.action === Share.sharedAction) {
          showToast('success', 'Report Exported', 'Case prediction report successfully exported.');
        }
      })
      .catch((err) => {
        console.warn('[EXPORT ERROR] Share failed:', err);
      });
  };

  const handleSendChat = async (textOverride?: string) => {
    const textToSend = textOverride || chatInput;
    if (!textToSend.trim() && attachments.length === 0) return;

    setChatInput('');
    Keyboard.dismiss();

    try {
      await dispatchMessageStream(
        textToSend.trim(),
        'legal_case_predictor',
        attachments,
        undefined,
        linkedCaseId || undefined
      );
      clearAttachments();
    } catch (err) {
      console.warn('[COPILOT SEND ERROR] Send message failed:', err);
    }
  };

  const handleAiAction = (action: string) => {
    setIsAiAssistantOpen(true);
    let promptText = '';
    switch (action) {
      case 'explain-hindi':
        promptText = "Explain the litigation outcome predictions in Hindi translation.";
        break;
      case 'explain-english':
        promptText = "Explain the outcome predictions in plain simple English.";
        break;
      case 'court-submission':
        promptText = "Generate a draft hearing strategy statement based on these predictions.";
        break;
      case 'export-pdf':
        promptText = "Generate and export a comprehensive litigation risk analysis prediction report.";
        break;
      default:
        return;
    }
    setTimeout(() => {
      handleSendChat(promptText);
    }, 450);
  };

  const linkedCaseName = useMemo(() => {
    const matched = cases.find(c => c._id === linkedCaseId);
    return matched ? matched.name : 'Independent Analysis';
  }, [cases, linkedCaseId]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      
      {/* Navigation Header */}
      <View style={[styles.header, { borderBottomColor: theme.border, backgroundColor: theme.surface }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Case Predictor</Text>
          <Text style={styles.headerSubtitle}>Predict litigation outcome using AI, precedents and evidence metrics.</Text>
        </View>

        <TouchableOpacity 
          style={[
            styles.copilotIconBtn, 
            { backgroundColor: isDark ? 'rgba(138, 92, 245, 0.08)' : 'rgba(138, 92, 245, 0.15)', marginRight: 10 }
          ]}
          onPress={() => setIsAiAssistantOpen(true)}
        >
          <Ionicons name="sparkles" size={18} color="#8A5CF5" />
        </TouchableOpacity>
      </View>

      {/* SCREEN 1: Home Dashboard */}
      {step === 'HOME' && (
        <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
          
          <Text style={[styles.homeTitle, { color: theme.textPrimary }]}>Litigation Intelligence Engine</Text>
          <Text style={[styles.homeDesc, { color: theme.textSecondary }]}>
            Select or upload your case files to compute success probability, map risks, and generate courtroom strategies.
          </Text>

          {/* Card 1: Existing Case Workspace */}
          <View style={[styles.workspaceCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Ionicons name="briefcase-outline" size={26} color="#8A5CF5" style={{ marginBottom: 8 }} />
            <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Existing Case Workspace</Text>
            <Text style={[styles.cardDesc, { color: theme.textSecondary }]}>
              Pull case files directly from My Cases to synchronize timelines, parties, and evidence assets.
            </Text>
            <TouchableOpacity style={[styles.cardBtn, { backgroundColor: '#8A5CF5' }]} onPress={() => setIsCaseSelectOpen(true)}>
              <Text style={styles.cardBtnText}>Select Case Workspace</Text>
            </TouchableOpacity>
          </View>

          {/* Card 2: Upload Documents */}
          <View style={[styles.workspaceCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Ionicons name="cloud-upload-outline" size={26} color="#8A5CF5" style={{ marginBottom: 8 }} />
            <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Upload Court Pleadings</Text>
            <Text style={[styles.cardDesc, { color: theme.textSecondary }]}>
              Drop PDF, DOCX, or ZIP documents to run OCR extraction, issue mapping, and litigation intelligence.
            </Text>
            <TouchableOpacity style={[styles.cardBtn, { backgroundColor: '#8A5CF5' }]} onPress={() => setIsUploadOpen(true)}>
              <Text style={styles.cardBtnText}>Upload Documents</Text>
            </TouchableOpacity>
          </View>

          {/* Card 3: Manual Case Facts */}
          <View style={[styles.workspaceCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Ionicons name="document-text-outline" size={26} color="#8A5CF5" style={{ marginBottom: 8 }} />
            <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Manual Case Facts</Text>
            <Text style={[styles.cardDesc, { color: theme.textSecondary }]}>
              Enter case title, claims, facts, and evidence descriptions manually to calculate outcome predictions.
            </Text>
            <TouchableOpacity style={[styles.cardBtn, { backgroundColor: '#8A5CF5' }]} onPress={() => setIsManualFormOpen(true)}>
              <Text style={styles.cardBtnText}>Write Facts Manually</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      )}

      {/* STEP 2: AI Processing Screen */}
      {step === 'ANALYZING' && (
        <View style={[styles.analyzingWrapper, { backgroundColor: theme.background }]}>
          <View style={[styles.analyzingBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <ActivityIndicator size="large" color="#8A5CF5" style={{ marginBottom: 16 }} />
            <Text style={[styles.sectionTitle, { color: theme.textPrimary, textAlign: 'center' }]}>Running Litigation Predictions</Text>
            <Text style={[styles.sectionDesc, { color: theme.textSecondary, textAlign: 'center', marginBottom: 20 }]}>
              Mapping procedural violations, scanning binding precedents, and drafting courtroom strategies.
            </Text>

            {/* Progress Bar */}
            <View style={[styles.progressBarBg, { backgroundColor: theme.border }]}>
              <Animated.View
                style={[
                  styles.progressBarFill,
                  {
                    width: progressVal.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            </View>

            {/* Steps Checklist */}
            <ScrollView style={styles.stepsList} contentContainerStyle={{ gap: 10 }}>
              {PROCESSING_STEPS.map((text, idx) => {
                const isPassed = idx < currentStepIdx;
                const isActive = idx === currentStepIdx;
                return (
                  <View key={text} style={styles.stepRow}>
                    {isPassed ? (
                      <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                    ) : isActive ? (
                      <ActivityIndicator size="small" color="#0EA5E9" />
                    ) : (
                      <Ionicons name="ellipse-outline" size={18} color={theme.textMuted} />
                    )}
                    <Text
                      style={[
                        styles.stepRowText,
                        { color: isPassed ? theme.textPrimary : isActive ? '#0EA5E9' : theme.textSecondary },
                        isActive && { fontWeight: '800' }
                      ]}
                    >
                      {text}
                    </Text>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      )}

      {/* STEP 3: Executive Forecast Dashboard & Intelligence view */}
      {step === 'INTELLIGENCE' && (
        <View style={{ flex: 1 }}>

          {/* ── Collapsible Summary Card ── */}
          <View style={[{ backgroundColor: theme.surface, borderBottomWidth: 1, borderBottomColor: theme.border }]}>

            {/* Mini Header Row (always visible) */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={toggleSummary}
              style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 12 }}
            >
              {/* Probability ring — compact */}
              <View style={{
                width: 50, height: 50, borderRadius: 25,
                borderWidth: 3.5, borderColor: '#10B981',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Text style={{ fontSize: 13, fontWeight: '900', color: '#0EA5E9' }}>66%</Text>
                <Text style={{ fontSize: 5.5, fontWeight: '800', color: theme.textSecondary, textAlign: 'center' }}>WIN</Text>
              </View>

              {/* Key stats inline */}
              <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {[
                  { label: 'Court Confidence', value: '91%', color: '#10B981' },
                  { label: 'Appeal Risk', value: '18%', color: '#EF4444' },
                  { label: 'Settlement', value: '42%', color: '#0EA5E9' },
                ].map((kpi, ki) => (
                  <View key={ki} style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: kpi.color }}>{kpi.value}</Text>
                    <Text style={{ fontSize: 9.5, color: theme.textSecondary, fontWeight: '600' }}>{kpi.label}</Text>
                    {ki < 2 && <Text style={{ color: theme.border, fontSize: 10 }}>  ·  </Text>}
                  </View>
                ))}
              </View>

              {/* Expand/collapse chevron */}
              <Animated.View style={{ transform: [{ rotate: summaryAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] }) }] }}>
                <Ionicons name="chevron-down" size={18} color={theme.textSecondary} />
              </Animated.View>
            </TouchableOpacity>

            {/* Expanded Detail Panel */}
            <Animated.View style={{
              maxHeight: summaryAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 240] }),
              overflow: 'hidden',
              opacity: summaryAnim,
            }}>
              <View style={{ paddingHorizontal: 16, paddingBottom: 14, gap: 10 }}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {[
                    { label: 'Winning Probability', value: '66%', color: '#0EA5E9' },
                    { label: 'Court Confidence', value: '91%', color: '#10B981' },
                    { label: 'Settlement Chance', value: '42%', color: '#0EA5E9' },
                    { label: 'Appeal Risk', value: '18%', color: '#EF4444' },
                    { label: 'Evidence Reliability', value: '88%', color: '#10B981' },
                    { label: 'Expected Duration', value: '18 Mo', color: theme.textPrimary },
                  ].map((kpi, ki) => (
                    <View key={ki} style={{
                      backgroundColor: theme.surfaceVariant, borderRadius: 10,
                      paddingHorizontal: 10, paddingVertical: 7, width: '30%',
                    }}>
                      <Text style={{ fontSize: 13, fontWeight: '900', color: kpi.color }}>{kpi.value}</Text>
                      <Text style={{ fontSize: 8.5, color: theme.textSecondary, fontWeight: '600', marginTop: 1 }} numberOfLines={2}>{kpi.label}</Text>
                    </View>
                  ))}
                </View>
                <View style={{ backgroundColor: 'rgba(16,185,129,0.08)', borderRadius: 10, padding: 10, borderLeftWidth: 3, borderLeftColor: '#10B981' }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#10B981', marginBottom: 2 }}>AI VERDICT</Text>
                  <Text style={{ fontSize: 11.5, color: theme.textPrimary, lineHeight: 16 }}>
                    Moderately Strong Prosecution Outlook — primary strengths: signed agreement, statutory notice timeliness. File within limitation period.
                  </Text>
                </View>
              </View>
            </Animated.View>
          </View>

          {/* Sticky Tab Selectors */}
          <View style={[styles.tabBar, { borderBottomColor: theme.border, backgroundColor: theme.surface, height: 44 }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ alignItems: 'center', paddingHorizontal: 8 }}>
              {[
                { id: 'prediction', label: 'Prediction' },
                { id: 'factors', label: 'Winning Factors' },
                { id: 'weaknesses', label: 'Weaknesses' },
                { id: 'scenarios', label: 'Scenarios' },
                { id: 'judge', label: 'Judge Insights' },
                { id: 'timeline', label: 'Timeline' },
                { id: 'reports', label: 'Reports' },
              ].map(tab => (
                <TouchableOpacity
                  key={tab.id}
                  style={[
                    styles.tabBtn,
                    { paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 2, borderBottomColor: 'transparent', marginRight: 8 },
                    activeTab === tab.id && { borderBottomColor: '#10B981' }
                  ]}
                  onPress={() => setActiveTab(tab.id as any)}
                >
                  <Text style={{ fontSize: 13, fontWeight: '700', color: activeTab === tab.id ? '#10B981' : theme.textSecondary }}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Tab Contents ScrollView */}
          <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false} onScroll={handleResultsScroll} scrollEventThrottle={16}>
            
            {/* TAB 1: PREDICTION */}
            {activeTab === 'prediction' && (
              <View style={{ gap: 16 }}>
                <View style={[styles.verdictBox, { backgroundColor: 'rgba(16, 185, 129, 0.06)', borderColor: '#10B981', borderWidth: 1, padding: 16, borderRadius: 12 }]}>
                  <Text style={[styles.cardTitle, { color: '#0EA5E9', marginBottom: 4, fontWeight: '800' }]}>AI OUTCOME PREDICTION VERDICT</Text>
                  <Text style={{ fontSize: 13, color: theme.textPrimary, lineHeight: 18, fontWeight: '700' }}>
                    Moderately Strong Prosecution Outlook
                  </Text>
                  <Text style={{ fontSize: 12.5, color: theme.textSecondary, lineHeight: 18, marginTop: 4 }}>
                    The forecasting model estimates a 66% probability of success. The primary success factors are signature admission and statutory notice timeliness. Condonation application is required to address a minor 11-day service delay.
                  </Text>
                </View>

                {/* Main Reasons Section */}
                <Text style={{ fontSize: 12.5, fontWeight: '800', color: theme.textPrimary, textTransform: 'uppercase' }}>Main Forecasting Reasons</Text>
                <View style={{ backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: 12, padding: 12, gap: 8 }}>
                  <Text style={{ fontSize: 12, color: theme.textSecondary }}>• Cheque execution signatures are uncontested, triggering burden shift presumption under Section 139 NI Act.</Text>
                  <Text style={{ fontSize: 12, color: theme.textSecondary }}>• Bank dishonour memo returned with code "Insufficient Funds", providing direct proof of defaulted balance.</Text>
                  <Text style={{ fontSize: 12, color: theme.textSecondary }}>• Precedents in Aditya Birla Chemicals protect representations against retrospective government alterations.</Text>
                </View>

                {/* Likelihood Timeline / Settlement Chance */}
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: 12, padding: 12 }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#0EA5E9' }}>Settlement Chance</Text>
                    <Text style={{ fontSize: 20, fontWeight: '900', color: theme.textPrimary, marginVertical: 4 }}>42%</Text>
                    <Text style={{ fontSize: 10, color: theme.textSecondary }}>Likely compound offer prior to final trial stage.</Text>
                  </View>
                  <View style={{ flex: 1, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: 12, padding: 12 }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#10B981' }}>Forecasting Confidence</Text>
                    <Text style={{ fontSize: 20, fontWeight: '900', color: theme.textPrimary, marginVertical: 4 }}>91%</Text>
                    <Text style={{ fontSize: 10, color: theme.textSecondary }}>Based on 48,000+ local NI Act precedents.</Text>
                  </View>
                </View>
              </View>
            )}

            {/* TAB 2: WINNING FACTORS */}
            {activeTab === 'factors' && (
              <View style={{ gap: 14 }}>
                <Text style={[styles.sectionHeading, { color: theme.textPrimary }]}>Winning Factors (Success Drivers)</Text>
                {WINNING_FACTORS_DATA.map((item, idx) => {
                  const isOpen = expandedFactors[idx];
                  return (
                    <View key={idx} style={[styles.accordion, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                      <TouchableOpacity style={styles.accordionHeader} onPress={() => setExpandedFactors(prev => ({ ...prev, [idx]: !prev[idx] }))}>
                        <Ionicons name="checkmark-circle" size={18} color="#10B981" style={{ marginRight: 6 }} />
                        <Text style={[styles.accordionTitleText, { color: theme.textPrimary, flex: 1 }]} numberOfLines={1}>
                          {item.title}
                        </Text>
                        <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={16} color={theme.textSecondary} />
                      </TouchableOpacity>
                      {isOpen && (
                        <View style={[styles.accordionBody, { borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 12, paddingHorizontal: 14, paddingBottom: 14 }]}>
                          <Text style={{ fontSize: 12, color: theme.textSecondary, lineHeight: 18, marginBottom: 12 }}>{item.desc}</Text>
                          
                          {getDetailedLegalAnalysis(item.title, 'factor').map((sec, sIdx) => (
                            <View key={sIdx} style={{ marginBottom: 12 }}>
                              <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#6D5DFC', marginBottom: 4 }}>{sec.heading}</Text>
                              <Text style={{ fontSize: 11.5, color: theme.textPrimary, lineHeight: 16.5 }}>{sec.text}</Text>
                            </View>
                          ))}

                          <View style={{ flexDirection: 'row', gap: 6, marginTop: 4, flexWrap: 'wrap', marginBottom: 12 }}>
                            <View style={{ backgroundColor: '#ECFDF5', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}><Text style={{ fontSize: 9, fontWeight: '800', color: '#10B981' }}>Impact: {item.impact}</Text></View>
                            <View style={{ backgroundColor: '#EEF2FF', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}><Text style={{ fontSize: 9, fontWeight: '800', color: '#0EA5E9' }}>Confidence: {item.confidence}</Text></View>
                            <View style={{ backgroundColor: '#FFFBEB', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}><Text style={{ fontSize: 9, fontWeight: '800', color: '#D97706' }}>{item.importance}</Text></View>
                          </View>

                          {/* Connected AI Action Bar Grid */}
                          <View style={{ marginTop: 10, borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 12 }}>
                            <Text style={{ fontSize: 10, fontWeight: '800', color: theme.textSecondary, marginBottom: 8, textTransform: 'uppercase' }}>Connected AI Workflows</Text>
                            <View style={styles.actionGrid}>
                              <TouchableOpacity style={styles.actionChip} onPress={() => handleLaunchModule('court_prep', item, 'factors')}>
                                <Text style={styles.actionChipText}>⚖️ Court Prep</Text>
                              </TouchableOpacity>
                              <TouchableOpacity style={styles.actionChip} onPress={() => handleLaunchModule('cross_exam', item, 'factors')}>
                                <Text style={styles.actionChipText}>🎯 Cross Exam</Text>
                              </TouchableOpacity>
                              <TouchableOpacity style={styles.actionChip} onPress={() => handleLaunchModule('reply_draft', item, 'factors')}>
                                <Text style={styles.actionChipText}>📝 Draft Reply</Text>
                              </TouchableOpacity>
                              <TouchableOpacity style={styles.actionChip} onPress={() => handleLaunchModule('ask_copilot', item, 'factors')}>
                                <Text style={styles.actionChipText}>💬 Ask AI</Text>
                              </TouchableOpacity>
                              <TouchableOpacity style={{ width: '100%', backgroundColor: '#F0FDF4', borderColor: '#DCFCE7', borderWidth: 1, borderRadius: 8, paddingVertical: 8, alignItems: 'center', marginTop: 4 }} onPress={() => handleLaunchModule('evidence_verify', item, 'factors')}>
                                <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#16A34A' }}>📂 Verify in Evidence Analyst</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}

            {/* TAB 3: WEAKNESSES */}
            {activeTab === 'weaknesses' && (
              <View style={{ gap: 14 }}>
                <Text style={[styles.sectionHeading, { color: theme.textPrimary }]}>Vulnerabilities Reducing Success</Text>
                {WEAKNESSES_DATA.map((item, idx) => {
                  const isOpen = expandedWeaknesses[idx];
                  return (
                    <View key={idx} style={[styles.accordion, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                      <TouchableOpacity style={styles.accordionHeader} onPress={() => setExpandedWeaknesses(prev => ({ ...prev, [idx]: !prev[idx] }))}>
                        <Ionicons name="alert-circle" size={18} color={item.color} style={{ marginRight: 6 }} />
                        <Text style={[styles.accordionTitleText, { color: theme.textPrimary, flex: 1 }]} numberOfLines={1}>
                          {item.title}
                        </Text>
                        <View style={{ backgroundColor: '#FEF2F2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginRight: 6 }}>
                          <Text style={{ fontSize: 9, fontWeight: '800', color: '#EF4444' }}>{item.probReduction}</Text>
                        </View>
                        <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={16} color={theme.textSecondary} />
                      </TouchableOpacity>
                      {isOpen && (
                        <View style={[styles.accordionBody, { borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 12, paddingHorizontal: 14, paddingBottom: 14 }]}>
                          <Text style={{ fontSize: 12, color: theme.textSecondary, lineHeight: 18, marginBottom: 12 }}>{item.desc}</Text>
                          
                          {getDetailedLegalAnalysis(item.title, 'weakness').map((sec, sIdx) => (
                            <View key={sIdx} style={{ marginBottom: 12 }}>
                              <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#EF4444', marginBottom: 4 }}>{sec.heading}</Text>
                              <Text style={{ fontSize: 11.5, color: theme.textPrimary, lineHeight: 16.5 }}>{sec.text}</Text>
                            </View>
                          ))}

                          <Text style={{ fontSize: 11, fontWeight: '700', color: theme.textPrimary, marginTop: 4, marginBottom: 6 }}>Vulnerability Impact: {item.impact}</Text>
                          <View style={{ backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FCD34D', borderRadius: 8, padding: 8, marginTop: 4, marginBottom: 12 }}>
                            <Text style={{ fontSize: 10, fontWeight: '800', color: '#B45309', textTransform: 'uppercase' }}>Forecasting Mitigation Action</Text>
                            <Text style={{ fontSize: 11, color: '#D97706', marginTop: 2 }}>{item.mitigation}</Text>
                          </View>

                          {/* Connected AI Action Bar Grid */}
                          <View style={{ marginTop: 10, borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 12 }}>
                            <Text style={{ fontSize: 10, fontWeight: '800', color: theme.textSecondary, marginBottom: 8, textTransform: 'uppercase' }}>Connected AI Workflows</Text>
                            <View style={styles.actionGrid}>
                              <TouchableOpacity style={styles.actionChip} onPress={() => handleLaunchModule('court_prep', item, 'weaknesses')}>
                                <Text style={styles.actionChipText}>⚖️ Court Prep</Text>
                              </TouchableOpacity>
                              <TouchableOpacity style={styles.actionChip} onPress={() => handleLaunchModule('cross_exam', item, 'weaknesses')}>
                                <Text style={styles.actionChipText}>🎯 Cross Exam</Text>
                              </TouchableOpacity>
                              <TouchableOpacity style={styles.actionChip} onPress={() => handleLaunchModule('reply_draft', item, 'weaknesses')}>
                                <Text style={styles.actionChipText}>📝 Draft Reply</Text>
                              </TouchableOpacity>
                              <TouchableOpacity style={styles.actionChip} onPress={() => handleLaunchModule('ask_copilot', item, 'weaknesses')}>
                                <Text style={styles.actionChipText}>💬 Ask AI</Text>
                              </TouchableOpacity>
                              <TouchableOpacity style={{ width: '100%', backgroundColor: '#F0FDF4', borderColor: '#DCFCE7', borderWidth: 1, borderRadius: 8, paddingVertical: 8, alignItems: 'center', marginTop: 4 }} onPress={() => handleLaunchModule('evidence_verify', item, 'weaknesses')}>
                                <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#16A34A' }}>📂 Verify in Evidence Analyst</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}

            {/* TAB 4: SCENARIOS */}
            {activeTab === 'scenarios' && (
              <View style={{ gap: 14 }}>
                <Text style={[styles.sectionHeading, { color: theme.textPrimary }]}>Simulation Scenarios & Outcomes</Text>
                {SCENARIOS_DATA.map((item, idx) => {
                  const isOpen = expandedScenarios[idx];
                  return (
                    <View key={idx} style={[styles.accordion, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                      <TouchableOpacity style={styles.accordionHeader} onPress={() => setExpandedScenarios(prev => ({ ...prev, [idx]: !prev[idx] }))}>
                        <Ionicons name="git-network-outline" size={18} color="#0EA5E9" style={{ marginRight: 6 }} />
                        <Text style={[styles.accordionTitleText, { color: theme.textPrimary, flex: 1 }]} numberOfLines={1}>
                          {item.title}
                        </Text>
                        <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={16} color={theme.textSecondary} />
                      </TouchableOpacity>
                      {isOpen && (
                        <View style={[styles.accordionBody, { borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 12, paddingHorizontal: 14, paddingBottom: 14 }]}>
                          <Text style={{ fontSize: 12, color: theme.textSecondary, lineHeight: 18, marginBottom: 12 }}>{item.desc}</Text>
                          
                          {getDetailedLegalAnalysis(item.title, 'scenario').map((sec, sIdx) => (
                            <View key={sIdx} style={{ marginBottom: 12 }}>
                              <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#0EA5E9', marginBottom: 4 }}>{sec.heading}</Text>
                              <Text style={{ fontSize: 11.5, color: theme.textPrimary, lineHeight: 16.5 }}>{sec.text}</Text>
                            </View>
                          ))}

                          <View style={{ backgroundColor: item.color + '1C', padding: 8, borderRadius: 6, marginTop: 4, marginBottom: 12 }}>
                            <Text style={{ fontSize: 12, fontWeight: '800', color: item.color }}>🎯 Outcome Forecast: {item.chance}</Text>
                          </View>

                          {/* Connected AI Action Bar Grid */}
                          <View style={{ marginTop: 10, borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 12 }}>
                            <Text style={{ fontSize: 10, fontWeight: '800', color: theme.textSecondary, marginBottom: 8, textTransform: 'uppercase' }}>Connected AI Workflows</Text>
                            <View style={styles.actionGrid}>
                              <TouchableOpacity style={styles.actionChip} onPress={() => handleLaunchModule('court_prep', item, 'scenarios')}>
                                <Text style={styles.actionChipText}>⚖️ Court Prep</Text>
                              </TouchableOpacity>
                              <TouchableOpacity style={styles.actionChip} onPress={() => handleLaunchModule('cross_exam', item, 'scenarios')}>
                                <Text style={styles.actionChipText}>🎯 Cross Exam</Text>
                              </TouchableOpacity>
                              <TouchableOpacity style={styles.actionChip} onPress={() => handleLaunchModule('reply_draft', item, 'scenarios')}>
                                <Text style={styles.actionChipText}>📝 Draft Reply</Text>
                              </TouchableOpacity>
                              <TouchableOpacity style={styles.actionChip} onPress={() => handleLaunchModule('ask_copilot', item, 'scenarios')}>
                                <Text style={styles.actionChipText}>💬 Ask AI</Text>
                              </TouchableOpacity>
                              <TouchableOpacity style={{ width: '100%', backgroundColor: '#F0FDF4', borderColor: '#DCFCE7', borderWidth: 1, borderRadius: 8, paddingVertical: 8, alignItems: 'center', marginTop: 4 }} onPress={() => handleLaunchModule('evidence_verify', item, 'scenarios')}>
                                <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#16A34A' }}>📂 Verify in Evidence Analyst</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}

            {/* TAB 5: JUDGE INSIGHTS */}
            {activeTab === 'judge' && (
              <View style={{ gap: 14 }}>
                <Text style={[styles.sectionHeading, { color: theme.textPrimary }]}>Judicial Behaviour & Insights</Text>
                {JUDGE_INSIGHTS_DATA.map((item, idx) => {
                  const isOpen = expandedJudge[idx];
                  return (
                    <View key={idx} style={[styles.accordion, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                      <TouchableOpacity style={styles.accordionHeader} onPress={() => setExpandedJudge(prev => ({ ...prev, [idx]: !prev[idx] }))}>
                        <Ionicons name="eye-outline" size={18} color="#0EA5E9" style={{ marginRight: 6 }} />
                        <Text style={[styles.accordionTitleText, { color: theme.textPrimary, flex: 1 }]} numberOfLines={1}>
                          {item.title}
                        </Text>
                        <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={16} color={theme.textSecondary} />
                      </TouchableOpacity>
                      {isOpen && (
                        <View style={[styles.accordionBody, { borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 12, paddingHorizontal: 14, paddingBottom: 14 }]}>
                          <Text style={{ fontSize: 12, color: theme.textSecondary, lineHeight: 18, marginBottom: 12 }}>{item.desc}</Text>
                          
                          {getDetailedLegalAnalysis(item.title, 'judge').map((sec, sIdx) => (
                            <View key={sIdx} style={{ marginBottom: 12 }}>
                              <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#8A5CF5', marginBottom: 4 }}>{sec.heading}</Text>
                              <Text style={{ fontSize: 11.5, color: theme.textPrimary, lineHeight: 16.5 }}>{sec.text}</Text>
                            </View>
                          ))}

                          {/* Connected AI Action Bar Grid */}
                          <View style={{ marginTop: 10, borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 12 }}>
                            <Text style={{ fontSize: 10, fontWeight: '800', color: theme.textSecondary, marginBottom: 8, textTransform: 'uppercase' }}>Connected AI Workflows</Text>
                            <View style={styles.actionGrid}>
                              <TouchableOpacity style={styles.actionChip} onPress={() => handleLaunchModule('court_prep', item, 'judge')}>
                                <Text style={styles.actionChipText}>⚖️ Court Prep</Text>
                              </TouchableOpacity>
                              <TouchableOpacity style={styles.actionChip} onPress={() => handleLaunchModule('cross_exam', item, 'judge')}>
                                <Text style={styles.actionChipText}>🎯 Cross Exam</Text>
                              </TouchableOpacity>
                              <TouchableOpacity style={styles.actionChip} onPress={() => handleLaunchModule('reply_draft', item, 'judge')}>
                                <Text style={styles.actionChipText}>📝 Draft Reply</Text>
                              </TouchableOpacity>
                              <TouchableOpacity style={styles.actionChip} onPress={() => handleLaunchModule('ask_copilot', item, 'judge')}>
                                <Text style={styles.actionChipText}>💬 Ask AI</Text>
                              </TouchableOpacity>
                              <TouchableOpacity style={{ width: '100%', backgroundColor: '#F0FDF4', borderColor: '#DCFCE7', borderWidth: 1, borderRadius: 8, paddingVertical: 8, alignItems: 'center', marginTop: 4 }} onPress={() => handleLaunchModule('evidence_verify', item, 'judge')}>
                                <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#16A34A' }}>📂 Verify in Evidence Analyst</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}

            {/* TAB 6: TIMELINE */}
            {activeTab === 'timeline' && (
              <View style={{ gap: 14 }}>
                <Text style={[styles.sectionHeading, { color: theme.textPrimary }]}>Expected Litigation Timeline Forecast</Text>
                <View style={{ gap: 10 }}>
                  {[
                    { stage: 'Notice Service', duration: 'Completed', color: '#10B981', done: true },
                    { stage: 'Complaint Plaint Logged', duration: 'Completed', color: '#10B981', done: true },
                    { stage: 'Summons Issuance', duration: '2 Months', color: '#0EA5E9', done: false },
                    { stage: 'Evidence Hearings', duration: '6 Months', color: '#0EA5E9', done: false },
                    { stage: 'Arguments Presentation', duration: '14 Months', color: '#EF4444', done: false },
                    { stage: 'Final Court Judgment', duration: '22 Months', color: '#EF4444', done: false }
                  ].map((tItem, tIdx) => {
                    const isOpen = expandedTimeline[tIdx];
                    return (
                      <View key={tIdx} style={[styles.accordion, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                        <TouchableOpacity 
                          style={styles.accordionHeader} 
                          onPress={() => setExpandedTimeline(prev => ({ ...prev, [tIdx]: !prev[tIdx] }))}
                        >
                          <Ionicons name={tItem.done ? 'checkmark-circle' : 'time-outline'} size={18} color={tItem.color} style={{ marginRight: 6 }} />
                          <Text style={[styles.accordionTitleText, { color: theme.textPrimary, flex: 1 }]} numberOfLines={1}>
                            {tItem.stage}
                          </Text>
                          <View style={{ backgroundColor: tItem.done ? '#ECFDF5' : '#FEF2F2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginRight: 6 }}>
                            <Text style={{ fontSize: 9, fontWeight: '800', color: tItem.done ? '#10B981' : '#EF4444' }}>{tItem.duration}</Text>
                          </View>
                          <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={16} color={theme.textSecondary} />
                        </TouchableOpacity>

                        {isOpen && (
                          <View style={[styles.accordionBody, { borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 12, paddingHorizontal: 14, paddingBottom: 14 }]}>
                            {getDetailedLegalAnalysis(tItem.stage, 'timeline').map((sec, sIdx) => (
                              <View key={sIdx} style={{ marginBottom: 12 }}>
                                <Text style={{ fontSize: 11.5, fontWeight: '800', color: tItem.color, marginBottom: 4 }}>{sec.heading}</Text>
                                <Text style={{ fontSize: 11.5, color: theme.textPrimary, lineHeight: 16.5 }}>{sec.text}</Text>
                              </View>
                            ))}

                            {/* Connected AI Action Bar Grid */}
                            <View style={{ marginTop: 10, borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 12 }}>
                              <Text style={{ fontSize: 10, fontWeight: '800', color: theme.textSecondary, marginBottom: 8, textTransform: 'uppercase' }}>Connected AI Workflows</Text>
                              <View style={styles.actionGrid}>
                                <TouchableOpacity style={styles.actionChip} onPress={() => handleLaunchModule('court_prep', tItem, 'timeline')}>
                                  <Text style={styles.actionChipText}>⚖️ Court Prep</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.actionChip} onPress={() => handleLaunchModule('cross_exam', tItem, 'timeline')}>
                                  <Text style={styles.actionChipText}>🎯 Cross Exam</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.actionChip} onPress={() => handleLaunchModule('reply_draft', tItem, 'timeline')}>
                                  <Text style={styles.actionChipText}>📝 Draft Reply</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.actionChip} onPress={() => handleLaunchModule('ask_copilot', tItem, 'timeline')}>
                                  <Text style={styles.actionChipText}>💬 Ask AI</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={{ width: '100%', backgroundColor: '#F0FDF4', borderColor: '#DCFCE7', borderWidth: 1, borderRadius: 8, paddingVertical: 8, alignItems: 'center', marginTop: 4 }} onPress={() => handleLaunchModule('evidence_verify', tItem, 'timeline')}>
                                  <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#16A34A' }}>📂 Verify in Evidence Analyst</Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* TAB 7: REPORTS */}
            {activeTab === 'reports' && (
              <View style={{ gap: 12 }}>
                <Text style={[styles.sectionHeading, { color: theme.textPrimary }]}>Winning Probability & Outcome Forecasts</Text>
                {[
                  { name: 'Winning Probability Report', key: 'probability', confidence: '98%', time: '08 Jul 2026 • 1:30 PM' },
                  { name: 'Outcome & Risk Forecast', key: 'outcome', confidence: '95%', time: '08 Jul 2026 • 1:31 PM' },
                  { name: 'Settlement & Appeal Forecast', key: 'appeal', confidence: '92%', time: '08 Jul 2026 • 1:35 PM' },
                  { name: 'Evidence Admissibility Dossier', key: 'evidence_prob', confidence: '88%', time: 'Not Generated' }
                ].map(item => (
                  <View key={item.key} style={[styles.reportCardRow, { flexDirection: 'column', padding: 12, backgroundColor: theme.surface, borderColor: theme.border, borderRadius: 12, borderWidth: 1.5, gap: 6 }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name="document-text-outline" size={20} color="#10B981" style={{ marginRight: 8 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.reportCardName, { color: theme.textPrimary, fontWeight: '700' }]}>{item.name}</Text>
                        <Text style={{ fontSize: 10, color: item.time !== 'Not Generated' ? '#10B981' : '#F59E0B', fontWeight: '800' }}>{item.time !== 'Not Generated' ? 'Generated' : 'Pending'}</Text>
                      </View>
                    </View>

                    {item.time !== 'Not Generated' && (
                      <View style={{ borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 6, gap: 4 }}>
                        <Text style={{ fontSize: 11, color: theme.textSecondary }}>🤖 AI Confidence: <Text style={{ fontWeight: '700', color: theme.textPrimary }}>{item.confidence}</Text></Text>
                        <Text style={{ fontSize: 11, color: theme.textSecondary }}>📅 Generated: <Text style={{ fontWeight: '700', color: theme.textPrimary }}>{item.time}</Text></Text>

                        {/* Actions */}
                        <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                          <TouchableOpacity 
                            style={{ flex: 1, height: 32, backgroundColor: '#0EA5E9', borderRadius: 6, alignItems: 'center', justifyContent: 'center' }}
                            onPress={() => setIsReportViewerOpen(true)}
                          >
                            <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '700' }}>Preview</Text>
                          </TouchableOpacity>
                          <TouchableOpacity 
                            style={{ width: 44, height: 32, borderWidth: 1, borderColor: theme.border, borderRadius: 6, alignItems: 'center', justifyContent: 'center' }}
                            onPress={() => showToast('success', 'Shared', 'Shared forecast link.')}
                          >
                            <Ionicons name="share-social-outline" size={14} color={theme.textPrimary} />
                          </TouchableOpacity>
                          <TouchableOpacity 
                            style={{ width: 44, height: 32, borderWidth: 1, borderColor: theme.border, borderRadius: 6, alignItems: 'center', justifyContent: 'center' }}
                            onPress={() => showToast('success', 'Downloaded', 'Downloaded forecast report.')}
                          >
                            <Ionicons name="download-outline" size={14} color={theme.textPrimary} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}

          </ScrollView>

          {/* Floating AI Assistant Trigger removed */}
        </View>
      )}

      {/* Case List drawer modal */}
      <Modal visible={isCaseSelectOpen} transparent animationType="slide" onRequestClose={() => setIsCaseSelectOpen(false)}>
        <TouchableWithoutFeedback onPress={() => setIsCaseSelectOpen(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.bottomSheetContainer}>
                <View style={styles.bottomSheetDragHandle} />
                <View style={styles.bottomSheetHeader}>
                  <Text style={styles.bottomSheetTitle}>Select Case Workspace</Text>
                  <TouchableOpacity onPress={() => setIsCaseSelectOpen(false)}>
                    <Ionicons name="close-circle" size={24} color="#94A3B8" />
                  </TouchableOpacity>
                </View>
                <ScrollView style={{ flex: 1 }}>
                  {cases.map((c) => (
                    <TouchableOpacity
                      key={c._id}
                      style={[styles.caseItemRow, { borderBottomColor: theme.border }]}
                      onPress={() => {
                        handleSelectCase(c._id);
                        setIsCaseSelectOpen(false);
                      }}
                    >
                      <Ionicons name="folder-outline" size={18} color="#0EA5E9" style={{ marginRight: 10 }} />
                      <Text style={[styles.caseItemText, { color: theme.textPrimary }]}>{c.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Upload Documents popup modal */}
      <Modal visible={isUploadOpen} transparent animationType="slide" onRequestClose={() => setIsUploadOpen(false)}>
        <TouchableWithoutFeedback onPress={() => setIsUploadOpen(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.bottomSheetContainer}>
                <View style={styles.bottomSheetDragHandle} />
                <View style={styles.bottomSheetHeader}>
                  <Text style={styles.bottomSheetTitle}>Upload Court pleadings</Text>
                  <TouchableOpacity onPress={() => setIsUploadOpen(false)}>
                    <Ionicons name="close-circle" size={24} color="#94A3B8" />
                  </TouchableOpacity>
                </View>
                <ScrollView style={{ flex: 1 }}>
                  {MOCK_PREDICT_DOCS.map((doc) => (
                    <TouchableOpacity
                      key={doc.id}
                      style={[styles.caseItemRow, { borderBottomColor: theme.border }]}
                      onPress={() => {
                        handleSelectDoc(doc.id);
                        setIsUploadOpen(false);
                        handleStartAnalysis();
                      }}
                    >
                      <Ionicons name="document-outline" size={18} color="#10B981" style={{ marginRight: 10 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.caseItemText, { color: theme.textPrimary }]}>{doc.name}</Text>
                        <Text style={{ fontSize: 10, color: theme.textSecondary }}>{doc.type} • {doc.size}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Manual Input form modal */}
      <Modal visible={isManualFormOpen} transparent={false} animationType="slide" onRequestClose={() => setIsManualFormOpen(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border, backgroundColor: theme.surface }]}>
            <TouchableOpacity onPress={() => setIsManualFormOpen(false)}>
              <Ionicons name="close" size={24} color={theme.textPrimary} />
            </TouchableOpacity>
            <Text style={[styles.modalHeaderTitle, { color: theme.textPrimary, marginLeft: 10 }]}>Manual Facts Registry</Text>
          </View>
          <ScrollView contentContainerStyle={styles.scrollBody}>
            <View style={styles.formGroup}>
              <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>Case Title</Text>
              <TextInput
                style={[styles.input, { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.surface }]}
                value={manualTitle}
                onChangeText={setManualTitle}
                placeholder="e.g. Birla Chemicals v. Electricity Board"
                placeholderTextColor={theme.placeholder}
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>Court of Dispute</Text>
              <TextInput
                style={[styles.input, { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.surface }]}
                value={manualCourt}
                onChangeText={setManualCourt}
                placeholder="e.g. Supreme Court of India"
                placeholderTextColor={theme.placeholder}
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>Material Case Facts</Text>
              <TextInput
                style={[styles.textArea, { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.surface }]}
                multiline
                numberOfLines={4}
                value={manualFacts}
                onChangeText={setManualFacts}
                placeholder="Explain the background circumstances of contract execution or disputes..."
                placeholderTextColor={theme.placeholder}
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>Claims & Remedies</Text>
              <TextInput
                style={[styles.textArea, { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.surface }]}
                multiline
                numberOfLines={3}
                value={manualClaims}
                onChangeText={setManualClaims}
                placeholder="State recovery amounts or estoppel relief demanded..."
                placeholderTextColor={theme.placeholder}
              />
            </View>
            <TouchableOpacity
              style={styles.actionBtnLarge}
              onPress={() => {
                if (!manualTitle.trim()) {
                  showToast('error', 'Validation Error', 'Case Title is required.');
                  return;
                }
                setIsManualFormOpen(false);
                handleStartAnalysis();
              }}
            >
              <Text style={styles.actionBtnLargeText}>Compute Outcomes</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Executive Report Viewer Modal */}
      <Modal visible={isReportViewerOpen} transparent={false} animationType="slide" onRequestClose={() => setIsReportViewerOpen(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border, backgroundColor: theme.surface, paddingHorizontal: 16 }]}>
            <TouchableOpacity onPress={() => setIsReportViewerOpen(false)} style={{ padding: 4 }}>
              <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
            </TouchableOpacity>
            <Text style={[styles.modalHeaderTitle, { color: theme.textPrimary, marginLeft: 10, fontWeight: '700' }]}>Forecasting Report Preview</Text>
            <TouchableOpacity style={{ marginLeft: 'auto', padding: 4 }} onPress={() => showToast('success', 'Shared', 'Shared forecast link.')}>
              <Ionicons name="share-social-outline" size={22} color={theme.textPrimary} />
            </TouchableOpacity>
          </View>
          
          <ScrollView 
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 16 }}
            showsVerticalScrollIndicator={false}
          >
            {/* The Document Sheet */}
            <View style={{ 
              backgroundColor: '#FFFFFF', 
              borderRadius: 8, 
              padding: 24, 
              shadowColor: '#000', 
              shadowOffset: { width: 0, height: 2 }, 
              shadowOpacity: 0.1, 
              shadowRadius: 8, 
              elevation: 4,
              borderWidth: 1,
              borderColor: '#E2E8F0',
              gap: 20
            }}>
              
              {/* Document Header */}
              <View style={{ alignItems: 'center', borderBottomWidth: 2, borderBottomColor: '#1E293B', paddingBottom: 16 }}>
                <Text style={{ fontSize: 18, fontWeight: '900', color: '#1E293B', letterSpacing: 1, textAlign: 'center', marginBottom: 12 }}>
                  WINNING PROBABILITY & FORECAST REPORT
                </Text>
                
                <View style={{ width: '100%', gap: 6 }}>
                  <Text style={{ fontSize: 11, color: '#475569' }}><Text style={{ fontWeight: '800', color: '#1E293B' }}>CASE:</Text> Apex Fabrics Pvt Ltd vs Modern Outfitters</Text>
                  <Text style={{ fontSize: 11, color: '#475569' }}><Text style={{ fontWeight: '800', color: '#1E293B' }}>PREPARED FOR:</Text> Outcome & Success Forecasting</Text>
                  <Text style={{ fontSize: 11, color: '#475569' }}><Text style={{ fontWeight: '800', color: '#1E293B' }}>GENERATED BY:</Text> AI LEGAL Case Predictor Engine</Text>
                  <Text style={{ fontSize: 11, color: '#475569' }}><Text style={{ fontWeight: '800', color: '#1E293B' }}>GENERATED ON:</Text> 08 July 2026</Text>
                  <Text style={{ fontSize: 11, color: '#475569' }}><Text style={{ fontWeight: '800', color: '#1E293B' }}>AI CONFIDENCE:</Text> 98%</Text>
                </View>
              </View>

              {/* SECTION 1: OUTCOME ANALYSIS */}
              <View style={{ gap: 8 }}>
                <Text style={{ fontSize: 13, fontWeight: '900', color: '#1E293B', textTransform: 'uppercase', borderBottomWidth: 1, borderBottomColor: '#CBD5E1', paddingBottom: 4 }}>
                  1. Outcome Analysis & Verdict
                </Text>
                <Text style={{ fontSize: 12, color: '#334155', lineHeight: 18, textAlign: 'justify' }}>
                  The forecasting model estimates a 66% probability of success for the petitioner. Cheque execution signatures are uncontested, automatically shifting the burden of proof to the accused under Section 139 NI Act.
                </Text>
              </View>

              {/* SECTION 2: RISK FORECAST */}
              <View style={{ gap: 8 }}>
                <Text style={{ fontSize: 13, fontWeight: '900', color: '#1E293B', textTransform: 'uppercase', borderBottomWidth: 1, borderBottomColor: '#CBD5E1', paddingBottom: 4 }}>
                  2. Risk Forecast
                </Text>
                <View style={{ gap: 6 }}>
                  <Text style={{ fontSize: 12, color: '#334155' }}>• <Text style={{ fontWeight: '700' }}>Limitation Delay Risk:</Text> 11-day delay in legal notice service requires filing a Section 142(1)(b) condonation application.</Text>
                  <Text style={{ fontSize: 12, color: '#334155' }}>• <Text style={{ fontWeight: '700' }}>Moratorium Risk:</Text> In case of corporate bankruptcy, personal liability suits must target directors directly.</Text>
                </View>
              </View>

              {/* SECTION 3: SETTLEMENT FORECAST */}
              <View style={{ gap: 8 }}>
                <Text style={{ fontSize: 13, fontWeight: '900', color: '#1E293B', textTransform: 'uppercase', borderBottomWidth: 1, borderBottomColor: '#CBD5E1', paddingBottom: 4 }}>
                  3. Settlement Forecast
                </Text>
                <Text style={{ fontSize: 12, color: '#334155', lineHeight: 18, textAlign: 'justify' }}>
                  Settlement chance stands at 42%. The defendant historically compromises and settles immediately after issues are framed by the court if stay orders remain intact.
                </Text>
              </View>

              {/* SECTION 4: APPEAL FORECAST */}
              <View style={{ gap: 8 }}>
                <Text style={{ fontSize: 13, fontWeight: '900', color: '#1E293B', textTransform: 'uppercase', borderBottomWidth: 1, borderBottomColor: '#CBD5E1', paddingBottom: 4 }}>
                  4. Appeal Forecast
                </Text>
                <Text style={{ fontSize: 12, color: '#334155', lineHeight: 18, textAlign: 'justify' }}>
                  18% Appeal risk rate. High pecuniary stake makes a subsequent appeal to the High Court likely for the losing party.
                </Text>
              </View>

              {/* SECTION 5: EVIDENCE PROBABILITY REPORT */}
              <View style={{ gap: 8 }}>
                <Text style={{ fontSize: 13, fontWeight: '900', color: '#1E293B', textTransform: 'uppercase', borderBottomWidth: 1, borderBottomColor: '#CBD5E1', paddingBottom: 4 }}>
                  5. Evidence Probability & Admissibility
                </Text>
                <View style={{ gap: 6 }}>
                  <Text style={{ fontSize: 12, color: '#334155' }}>• <Text style={{ fontWeight: '700' }}>Signed Agreement:</Text> 94% strength based on uncontested execution.</Text>
                  <Text style={{ fontSize: 12, color: '#334155' }}>• <Text style={{ fontWeight: '700' }}>Original Dishonoured Cheque:</Text> 95% admissibility rating.</Text>
                  <Text style={{ fontSize: 12, color: '#334155' }}>• <Text style={{ fontWeight: '700' }}>WhatsApp Timelines:</Text> 30% admissibility due to missing Section 65B affidavit certificates.</Text>
                </View>
              </View>

              {/* Document Divider */}
              <View style={{ borderTopWidth: 2, borderTopColor: '#1E293B', marginTop: 12, paddingTop: 12, alignItems: 'center', gap: 4 }}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#1E293B' }}>CONFIDENTIAL • FORECAST DOSSIER</Text>
                <Text style={{ fontSize: 10, color: '#64748B', textAlign: 'center' }}>
                  Generated by AI LEGAL Case Predictor Engine • Prepared for legal assistance only. Review before court submission.
                </Text>
              </View>
            </View>
            
            {/* Export Buttons */}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16, marginBottom: 24 }}>
              <TouchableOpacity 
                style={{ flex: 1, height: 44, backgroundColor: '#1E293B', borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }} 
                onPress={() => showToast('success', 'Export PDF', 'Forecast report exported as PDF.')}
              >
                <Ionicons name="document-text-outline" size={16} color="#FFFFFF" />
                <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>Export PDF</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={{ flex: 1, height: 44, backgroundColor: '#1E293B', borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }} 
                onPress={() => showToast('success', 'Export DOCX', 'Forecast report exported as DOCX.')}
              >
                <Ionicons name="document-outline" size={16} color="#FFFFFF" />
                <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>Export DOCX</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* AI Copilot Chat Drawer (Full-Screen AI Workspace) */}
      <Modal
        visible={isAiAssistantOpen}
        animationType="slide"
        transparent={false}
        statusBarTranslucent={true}
        onRequestClose={() => setIsAiAssistantOpen(false)}
      >
        <View style={[styles.copilotOverlay, { backgroundColor: theme.background }]}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
              {/* Header Bar */}
              <View style={[styles.copilotHeader, { borderBottomColor: theme.border, backgroundColor: theme.surface }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  <TouchableOpacity onPress={() => setIsAiAssistantOpen(false)} style={styles.copilotBackBtn}>
                    <Ionicons name="chevron-back" size={24} color={theme.textPrimary} />
                  </TouchableOpacity>
                  <View style={styles.copilotHeaderTitleContainer}>
                    <Text style={[styles.copilotHeaderTitle, { color: theme.textPrimary }]}>Case Predictor Copilot</Text>
                    <Text style={styles.copilotHeaderSubtitle}>Litigation Outcome Workspace</Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                  <TouchableOpacity onPress={handleNewChat} style={styles.copilotHeaderIconAction}>
                    <Ionicons name="add" size={24} color="#8A5CF5" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setIsMenuVisible(!isMenuVisible)} style={styles.copilotHeaderIconAction}>
                    <Ionicons name="ellipsis-vertical" size={20} color={theme.textPrimary} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Header Action Dropdown Menu */}
              {isMenuVisible && (
                <Modal
                  transparent={true}
                  visible={isMenuVisible}
                  animationType="fade"
                  onRequestClose={() => setIsMenuVisible(false)}
                >
                  <Pressable style={StyleSheet.absoluteFill} onPress={() => setIsMenuVisible(false)} />
                  <View 
                    style={[
                      styles.menuOverlayContainer, 
                      { 
                        backgroundColor: theme.surface, 
                        borderColor: theme.border, 
                        top: insets.top + 56 
                      }
                    ]}
                  >
                    <TouchableOpacity 
                      style={styles.menuItem} 
                      onPress={() => {
                        setIsMenuVisible(false);
                        setIsHistoryOpen(true);
                      }}
                    >
                      <Ionicons name="time-outline" size={16} color={theme.textSecondary} style={{ marginRight: 8 }} />
                      <Text style={[styles.menuItemText, { color: theme.textPrimary }]}>History</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.menuItem} 
                      onPress={() => {
                        setIsMenuVisible(false);
                        handleExportChat();
                      }}
                      disabled={!activeSession}
                    >
                      <Ionicons name="share-outline" size={16} color={theme.textSecondary} style={{ marginRight: 8 }} />
                      <Text style={[styles.menuItemText, { color: theme.textPrimary, opacity: activeSession ? 1 : 0.5 }]}>Export Chat</Text>
                    </TouchableOpacity>
                    
                    <View style={[styles.menuDivider, { backgroundColor: theme.border }]} />

                    <TouchableOpacity 
                      style={styles.menuItem} 
                      onPress={() => {
                        setIsMenuVisible(false);
                        handleClearPress();
                      }}
                      disabled={!activeSession}
                    >
                      <Ionicons name="trash-outline" size={16} color="#EF4444" style={{ marginRight: 8 }} />
                      <Text style={[styles.menuItemText, { color: '#EF4444', opacity: activeSession ? 1 : 0.5, fontWeight: '700' }]}>Clear Conversation</Text>
                    </TouchableOpacity>
                  </View>
                </Modal>
              )}

              {/* Chat Messages / Greeting View */}
              <ScrollView 
                ref={copilotScrollRef}
                style={{ flex: 1 }}
                contentContainerStyle={{ padding: 16, paddingBottom: 30 }}
                showsVerticalScrollIndicator={false}
                onScroll={handleScroll}
                scrollEventThrottle={16}
              >
                {activeSession && activeSession.messages && activeSession.messages.length > 0 ? (
                  activeSession.messages.map((msg, idx) => {
                    const isUser = msg.role === 'user';
                    
                    if (!isUser && !msg.content.trim()) {
                      return null;
                    }

                    if (isUser) {
                      return (
                        <View 
                          key={msg.id || idx} 
                          style={[styles.chatBubbleContainer, { alignItems: 'flex-end' }]}
                        >
                          <View style={[styles.chatBubble, styles.userBubble, { maxWidth: '75%' }]}>
                            <Text style={styles.userBubbleText}>{msg.content}</Text>
                          </View>
                        </View>
                      );
                    }

                    const { cleanedText, suggestions, disclaimer } = parseFollowUpSuggestions(msg.content);

                    return (
                      <View 
                        key={msg.id || idx} 
                        style={[styles.chatBubbleContainer, styles.aiBubbleAlign, { flexDirection: 'column' }]}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'flex-start', width: '100%' }}>
                          <View style={styles.aiAvatar}>
                            <Ionicons name="sparkles" size={11} color="#FFFFFF" />
                          </View>
                          <View 
                            style={[
                              styles.chatBubble, 
                              styles.aiBubble, 
                              { backgroundColor: theme.surfaceVariant }
                            ]}
                          >
                            <MarkdownRenderer text={cleanedText} />
 
                            {/* Disclaimer at the bottom of the AI response card */}
                            {disclaimer ? (
                              <View style={styles.disclaimerContainer}>
                                <View style={[styles.disclaimerDivider, { backgroundColor: theme.border }]} />
                                <Text style={[styles.disclaimerText, { color: theme.textSecondary }]}>
                                  ⚖️ {disclaimer}
                                </Text>
                              </View>
                            ) : null}
                          </View>
                        </View>
 
                        {/* Dynamic contextual suggestions outside the bubble card */}
                        {suggestions.length > 0 && (
                          <View style={{ marginLeft: 26, marginRight: 16, marginTop: 12, alignSelf: 'stretch' }}>
                            <Text style={{ fontSize: 10.5, fontWeight: '800', color: theme.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                              Suggested Next Actions
                            </Text>
                            <View style={styles.bubbleSuggestionsContainer}>
                              {suggestions
                                .slice(0, expandedSuggestions[msg.id] ? undefined : 4)
                                .map((suggestion, sIdx) => {
                                  const shortened = shortenSuggestion(suggestion);
                                  return (
                                    <TouchableOpacity
                                      key={sIdx}
                                      style={[styles.bubbleSuggestionChip, { borderColor: '#8A5CF5', backgroundColor: theme.surface }]}
                                      onPress={() => handleSendChat(suggestion)}
                                      disabled={isAiThinking}
                                    >
                                      <Text style={[styles.bubbleSuggestionText, { color: '#8A5CF5' }]} numberOfLines={1} ellipsizeMode="tail">✓ {shortened}</Text>
                                    </TouchableOpacity>
                                  );
                                })}
                              
                              {suggestions.length > 4 && !expandedSuggestions[msg.id] && (
                                <TouchableOpacity
                                  style={[styles.bubbleSuggestionChip, { borderColor: '#8A5CF5', backgroundColor: theme.surface, borderStyle: 'dashed' }]}
                                  onPress={() => toggleExpandSuggestions(msg.id)}
                                >
                                  <Text style={[styles.bubbleSuggestionText, { color: '#8A5CF5' }]} numberOfLines={1} ellipsizeMode="tail">+ More Suggestions</Text>
                                </TouchableOpacity>
                              )}
                            </View>
                          </View>
                        )}
                      </View>
                    );
                  })
                ) : (
                  // Minimal empty state & greeting
                  <View style={styles.emptyChatContainer}>
                    <View style={styles.lightweightGreetingContainer}>
                      <Text style={[styles.lightweightGreetingTitle, { color: theme.textPrimary }]}>
                        Hi, I'm your Case Predictor Copilot.
                      </Text>
                      <View style={{ marginTop: 16, alignSelf: 'flex-start', paddingHorizontal: 12 }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: theme.textSecondary, marginBottom: 8 }}>
                          I can help you with:
                        </Text>
                        {[
                          'Case Outcome Prediction',
                          'Success Probability',
                          'Litigation Risk Analysis',
                          'Case Strength Assessment',
                          'Weakness Detection',
                          'Judicial Intelligence',
                          'Settlement Possibility',
                          'Court Readiness',
                        ].map((bullet) => (
                          <Text key={bullet} style={{ fontSize: 12.5, lineHeight: 22, color: theme.textSecondary, fontWeight: '500' }}>
                            • {bullet}
                          </Text>
                        ))}
                      </View>
                    </View>
                  </View>
                )}
                {isAiThinking && (
                  <View style={styles.thinkingBubbleContainer}>
                    <View style={styles.aiAvatar}>
                      <Ionicons name="sparkles" size={11} color="#FFFFFF" />
                    </View>
                    <View style={[styles.chatBubble, { backgroundColor: theme.surfaceVariant, paddingVertical: 8, paddingHorizontal: 12, borderTopLeftRadius: 4, alignSelf: 'flex-start' }]}>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: '#8A5CF5' }}>
                        ⚖️ Thinking  {getThinkingDotsText()}
                      </Text>
                    </View>
                  </View>
                )}
              </ScrollView>

              {/* Attachments preview bar */}
              {attachments.length > 0 && (
                <View style={[styles.copilotAttachmentBar, { borderTopColor: theme.border }]}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
                    {attachments.map((a: any, i: number) => (
                      <View key={i} style={[styles.copilotAttachChip, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}>
                        <Ionicons name="document-attach" size={14} color="#8A5CF5" />
                        <Text style={[styles.copilotAttachLabel, { color: theme.textPrimary }]} numberOfLines={1}>{a.name}</Text>
                        <TouchableOpacity onPress={() => handleRemoveAttachment(a.name)}>
                          <Ionicons name="close-circle" size={16} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Floating "Scroll to Latest" Button */}
              {showScrollToLatest && (
                <TouchableOpacity
                  style={[styles.floatingScrollBtn, { backgroundColor: theme.surface, borderColor: theme.border, bottom: 90 }]}
                  onPress={() => {
                    copilotScrollRef.current?.scrollToEnd({ animated: true });
                  }}
                >
                  <Ionicons name="arrow-down" size={18} color="#8A5CF5" />
                </TouchableOpacity>
              )}

              {/* Chat Composer */}
              <View style={[styles.copilotComposerContainer, { borderTopColor: theme.border, backgroundColor: theme.surface, paddingBottom: Platform.OS === 'ios' ? Math.max(insets.bottom, 12) : 12, paddingTop: 8 }]}>
                {isRecording || isTranscribing ? (
                  <View style={styles.recordingWrapper}>
                    <TouchableOpacity onPress={cancelRecording} style={styles.voiceControlBtn}>
                      <Ionicons name="close" size={24} color="#EF4444" />
                    </TouchableOpacity>
                    <View style={styles.waveformContainer}>
                      {isTranscribing ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <ActivityIndicator size="small" color="#8A5CF5" />
                          <Text style={{ fontSize: 13, color: '#9CA3AF' }}>Transcribing...</Text>
                        </View>
                      ) : (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Text style={{ fontSize: 14, fontWeight: '700', color: theme.textPrimary }}>
                            {Math.floor(duration / 60).toString().padStart(2, '0')}:{(duration % 60).toString().padStart(2, '0')}
                          </Text>
                          <Text style={{ fontSize: 13, color: '#9CA3AF' }}>Listening...</Text>
                          <View style={styles.recordingIndicatorDot} />
                        </View>
                      )}
                    </View>
                    <TouchableOpacity onPress={stopRecording} style={styles.voiceStopBtn}>
                      <Ionicons name="square" size={14} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={{ paddingHorizontal: 12, paddingVertical: 4 }}>
                    <View style={[styles.composerTextInputContainer, { borderColor: theme.border, backgroundColor: theme.surfaceVariant }]}>
                      <TouchableOpacity onPress={showAttachmentOptions} style={styles.composerInnerBtn}>
                        <Ionicons name="add" size={22} color="#8A5CF5" />
                      </TouchableOpacity>
                      <TouchableOpacity 
                        onPress={() => setIsSuggestionsSheetOpen(true)}
                        style={styles.composerInnerBtn}
                        disabled={isAiThinking}
                      >
                        <Ionicons name="sparkles" size={18} color="#8A5CF5" />
                      </TouchableOpacity>
                      <TextInput
                        style={[styles.composerTextInput, { color: theme.textPrimary }]}
                        placeholder="Model Case Outcome..."
                        placeholderTextColor={theme.placeholder}
                        value={chatInput}
                        onChangeText={setChatInput}
                        multiline
                        maxLength={1500}
                        editable={!isAiThinking}
                      />
                      <TouchableOpacity onPress={() => startRecording(selectedLanguage)} style={styles.composerInnerMicBtn} disabled={isAiThinking}>
                        <Ionicons name="mic" size={20} color="#6B7280" />
                      </TouchableOpacity>
                      {isAiThinking ? (
                        <TouchableOpacity style={[styles.composerInnerSendBtn, { backgroundColor: '#EF4444' }]} onPress={cancelMessageStream}>
                          <Ionicons name="square" size={12} color="#FFFFFF" />
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity 
                          style={[styles.composerInnerSendBtn, { backgroundColor: '#8A5CF5' }, !chatInput.trim() && { opacity: 0.5 }]} 
                          onPress={() => handleSendChat()}
                          disabled={!chatInput.trim()}
                        >
                          <Ionicons name="arrow-up" size={16} color="#FFFFFF" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                )}
              </View>
            </SafeAreaView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* AI Suggestions Bottom Sheet */}
      <Modal
        visible={isSuggestionsSheetOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsSuggestionsSheetOpen(false)}
      >
        <View style={styles.bottomSheetOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setIsSuggestionsSheetOpen(false)} />
          <View style={[styles.suggestionsSheetContainer, { backgroundColor: theme.surface }]}>
            <View style={[styles.suggestionsSheetHeader, { borderBottomColor: theme.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="sparkles" size={18} color="#8A5CF5" />
                <Text style={[styles.suggestionsSheetTitle, { color: theme.textPrimary }]}>AI Suggestions</Text>
              </View>
              <TouchableOpacity onPress={() => setIsSuggestionsSheetOpen(false)}>
                <Ionicons name="close-circle" size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1, paddingVertical: 12 }} showsVerticalScrollIndicator={false}>
              <Text style={styles.suggestionsCategoryTitle}>Litigation & Outcome Prediction</Text>
              <View style={styles.suggestionsCategoryGroup}>
                {CASE_SUGGESTIONS_SHEET.Outcome.map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={[styles.suggestionsItemBtn, { borderColor: theme.border }]}
                    onPress={() => {
                      setIsSuggestionsSheetOpen(false);
                      handleSendChat(item);
                    }}
                  >
                    <Text style={[styles.suggestionsItemText, { color: theme.textPrimary }]}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.suggestionsCategoryTitle}>Risk & Judicial Analysis</Text>
              <View style={styles.suggestionsCategoryGroup}>
                {CASE_SUGGESTIONS_SHEET.Risks.map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={[styles.suggestionsItemBtn, { borderColor: theme.border }]}
                    onPress={() => {
                      setIsSuggestionsSheetOpen(false);
                      handleSendChat(item);
                    }}
                  >
                    <Text style={[styles.suggestionsItemText, { color: theme.textPrimary }]}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.suggestionsCategoryTitle}>Litigation Tactics & Supporting Evidence</Text>
              <View style={styles.suggestionsCategoryGroup}>
                {CASE_SUGGESTIONS_SHEET.Actions.map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={[styles.suggestionsItemBtn, { borderColor: theme.border }]}
                    onPress={() => {
                      setIsSuggestionsSheetOpen(false);
                      handleSendChat(item);
                    }}
                  >
                    <Text style={[styles.suggestionsItemText, { color: theme.textPrimary }]}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* History Drawer Modal */}
      <Modal
        visible={isHistoryOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsHistoryOpen(false)}
      >
        <View style={styles.historyDrawerOverlay}>
          <Pressable style={{ flex: 1 }} onPress={() => setIsHistoryOpen(false)} />
          <View style={[styles.historyDrawerContainer, { backgroundColor: theme.surface }]}>
            <View style={[styles.historyDrawerHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.historyDrawerTitle, { color: theme.textPrimary }]}>Sessions History</Text>
              <TouchableOpacity onPress={() => setIsHistoryOpen(false)}>
                <Ionicons name="close" size={24} color={theme.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View style={{ marginVertical: 12 }}>
              <TextInput
                style={[styles.dialogInput, { marginBottom: 0, borderColor: theme.border, color: theme.textPrimary }]}
                placeholder="Search history..."
                placeholderTextColor={theme.placeholder}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            <ScrollView style={styles.historyDrawerList} showsVerticalScrollIndicator={false}>
              {sessions
                .filter(s => s.activeTool === 'legal_case_predictor')
                .filter(s => !searchQuery.trim() || s.title.toLowerCase().includes(searchQuery.toLowerCase()))
                .sort((a, b) => new Date(b.lastModified || b.createdAt || 0).getTime() - new Date(a.lastModified || a.createdAt || 0).getTime())
                .map((s) => {
                  const isActive = activeSessionId === s.sessionId;
                  return (
                    <TouchableOpacity
                      key={s.sessionId}
                      style={[
                        styles.historySessionItem,
                        { backgroundColor: isActive ? 'rgba(138, 92, 245, 0.08)' : 'transparent' },
                      ]}
                      onPress={() => {
                        setActiveSessionId(s.sessionId);
                        setIsHistoryOpen(false);
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.historySessionTitle, { color: isActive ? '#8A5CF5' : theme.textPrimary }]}>{s.title}</Text>
                        <Text style={styles.historySessionTime}>
                          {new Date(s.lastModified || s.createdAt || 0).toLocaleDateString()}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        <TouchableOpacity onPress={() => handleOpenRename(s.sessionId, s.title)} style={{ padding: 6 }}>
                          <Ionicons name="pencil" size={16} color={theme.textSecondary} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDeletePress(s.sessionId)} style={{ padding: 6 }}>
                          <Ionicons name="trash" size={16} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  );
                })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Rename Dialog Modal */}
      <Modal
        visible={isRenameDialogOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsRenameDialogOpen(false)}
      >
        <View style={styles.dialogOverlay}>
          <View style={[styles.dialogContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.dialogTitle, { color: theme.textPrimary }]}>Rename Session</Text>
            <TextInput
              style={[styles.dialogInput, { borderColor: theme.border, color: theme.textPrimary }]}
              value={renameValue}
              onChangeText={setRenameValue}
              placeholder="Enter new title..."
              placeholderTextColor={theme.placeholder}
            />
            <View style={styles.dialogActions}>
              <TouchableOpacity 
                style={[styles.dialogCancelBtn, { backgroundColor: theme.surfaceVariant }]}
                onPress={() => setIsRenameDialogOpen(false)}
              >
                <Text style={{ color: theme.textPrimary, fontWeight: '700' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.dialogConfirmBtn}
                onPress={handleConfirmRename}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Staged attachments sheets */}
      <AttachmentBottomSheet
        visible={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSelectOption={handleSelectOption}
      />

      <CustomCameraModal
        visible={isCameraVisible}
        onClose={hideCamera}
        onConfirm={handleCameraConfirm}
      />

      {loadingOverlayText && (
        <View style={isDark ? styles.loadingOverlayDark : styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#8A5CF5" style={{ marginBottom: 16 }} />
          <Text style={{ fontSize: 16, fontWeight: '800', color: theme.textPrimary, textAlign: 'center' }}>
            {loadingOverlayText}
          </Text>
          <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 6, textAlign: 'center' }}>
            AI Ready
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

function getStyles(theme: any, isDark: boolean) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    actionGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginTop: 8,
    },
    actionChip: {
      width: '49%',
      backgroundColor: 'rgba(138, 92, 245, 0.08)',
      borderColor: 'rgba(138, 92, 245, 0.15)',
      borderWidth: 1,
      borderRadius: 10,
      paddingVertical: 10,
      paddingHorizontal: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionChipText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#8A5CF5',
      textAlign: 'center',
    },
    loadingOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      zIndex: 9999,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    },
    loadingOverlayDark: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(15, 23, 42, 0.98)',
      zIndex: 9999,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderBottomWidth: 1,
    },
    headerBtn: {
      width: 48,
      height: 48,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 24,
      marginRight: 8,
      marginLeft: -10,
    },
    headerTitleContainer: {
      flex: 1,
      justifyContent: 'center',
    },
    headerTitle: {
      fontSize: 16,
      fontWeight: '800',
    },
    headerSubtitle: {
      fontSize: 10.5,
      color: '#94A3B8',
      marginTop: 2,
      fontWeight: '700',
    },
    scrollBody: {
      padding: 16,
      paddingBottom: 40,
    },
    homeTitle: {
      fontSize: 18,
      fontWeight: '800',
      marginBottom: 6,
    },
    homeDesc: {
      fontSize: 12.5,
      lineHeight: 18,
      marginBottom: 20,
    },
    workspaceCard: {
      borderWidth: 1.5,
      borderRadius: 14,
      padding: 16,
      marginBottom: 12,
    },
    cardTitle: {
      fontSize: 14,
      fontWeight: '800',
      marginBottom: 4,
    },
    cardDesc: {
      fontSize: 12,
      lineHeight: 16,
      marginBottom: 12,
    },
    cardBtn: {
      backgroundColor: '#0EA5E9',
      borderRadius: 8,
      paddingVertical: 8,
      alignItems: 'center',
    },
    cardBtnText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '800',
    },

    // Step 2: Progress loader
    analyzingWrapper: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
    },
    analyzingBox: {
      width: '100%',
      borderWidth: 1.5,
      borderRadius: 16,
      padding: 20,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '800',
      marginBottom: 6,
    },
    sectionDesc: {
      fontSize: 12.5,
      lineHeight: 18,
      marginBottom: 20,
    },
    progressBarBg: {
      height: 6,
      borderRadius: 3,
      width: '100%',
      overflow: 'hidden',
      marginBottom: 20,
    },
    progressBarFill: {
      height: '100%',
      backgroundColor: '#8A5CF5',
    },
    stepsList: {
      maxHeight: 280,
    },
    stepRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 4,
    },
    stepRowText: {
      fontSize: 12.5,
      fontWeight: '600',
    },

    // Step 3: Executive Forecast Dashboard
    forecastDashboard: {
      padding: 16,
      borderBottomWidth: 1.5,
    },
    forecastSummaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    radialCircle: {
      width: 100,
      height: 100,
      borderRadius: 50,
      borderWidth: 6,
      borderColor: '#10B981',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 8,
    },
    radialVal: {
      fontSize: 22,
      fontWeight: '900',
      color: '#0EA5E9',
    },
    radialLabel: {
      fontSize: 7.5,
      fontWeight: '800',
      textAlign: 'center',
      marginTop: 2,
    },
    forecastKpis: {
      flex: 1,
      marginLeft: 16,
      gap: 6,
    },
    kpiBox: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    kpiValText: {
      fontSize: 11.5,
      fontWeight: '800',
    },
    kpiLabelText: {
      fontSize: 9.5,
      fontWeight: '700',
    },
    durationMetaRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 12,
    },

    // Sticky tabs
    tabBar: {
      flexDirection: 'row',
      borderBottomWidth: 1.5,
      height: 44,
    },
    tabBtn: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      borderBottomWidth: 3,
      borderBottomColor: 'transparent',
    },
    tabBtnText: {
      fontSize: 11.5,
      fontWeight: '800',
    },

    // Tabs details
    verdictBox: {
      padding: 12,
      borderRadius: 12,
    },
    sectionHeading: {
      fontSize: 14.5,
      fontWeight: '800',
      marginBottom: 10,
    },
    accordion: {
      borderWidth: 1.5,
      borderRadius: 12,
      marginBottom: 8,
      overflow: 'hidden',
    },
    accordionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 12,
    },
    accordionTitleText: {
      fontSize: 12.5,
      fontWeight: '800',
      flex: 1,
    },
    accordionBody: {
      paddingHorizontal: 12,
      paddingBottom: 12,
      borderTopWidth: 1,
      borderTopColor: '#F1F5F9',
      paddingTop: 10,
    },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 4,
    },
    infoLabel: {
      fontSize: 11.5,
      fontWeight: '700',
    },
    infoValue: {
      fontSize: 11.5,
      fontWeight: '800',
    },
    clauseBtnRow: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 10,
    },
    clauseActionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    clauseActionBtnText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#0EA5E9',
    },

    // Risk Dot & Labels
    riskDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      marginRight: 8,
    },
    riskLabelBadge: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },

    // Precedent specific
    precedentTitleText: {
      fontSize: 12.5,
      fontWeight: '800',
    },

    // Reports list
    reportCardRow: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1.5,
      borderRadius: 12,
      padding: 12,
    },
    reportCardName: {
      fontSize: 13,
      fontWeight: '800',
    },
    reportOpenBtn: {
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
    },
    reportOpenBtnText: {
      fontSize: 11,
      fontWeight: '800',
      color: '#0EA5E9',
    },

    // copilotIconBtn: icon-only header sparkles button (36dp)
    copilotIconBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },

    // Back Link
    backLink: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginBottom: 14,
    },
    backLinkText: {
      fontSize: 11.5,
      fontWeight: '800',
      color: '#0EA5E9',
    },

    // Forms Inputs
    formGroup: {
      marginBottom: 16,
    },
    inputLabel: {
      fontSize: 12.5,
      fontWeight: '800',
      marginBottom: 6,
    },
    input: {
      height: 44,
      borderWidth: 1.5,
      borderRadius: 10,
      paddingHorizontal: 12,
      fontSize: 13,
    },
    textArea: {
      height: 80,
      borderWidth: 1.5,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingTop: 10,
      fontSize: 13,
      textAlignVertical: 'top',
    },
    actionBtnLarge: {
      backgroundColor: '#10B981',
      borderRadius: 10,
      height: 46,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      marginTop: 10,
    },
    actionBtnLargeText: {
      color: '#FFFFFF',
      fontSize: 13.5,
      fontWeight: '800',
    },

    // Report Viewer
    reportContentBlock: {
      borderWidth: 1.5,
      borderRadius: 16,
      padding: 16,
    },
    reportHeaderTitle: {
      fontSize: 15,
      fontWeight: '900',
    },
    reportSectionTitle: {
      fontSize: 13,
      fontWeight: '800',
      marginBottom: 6,
    },
    reportParaText: {
      fontSize: 12,
      lineHeight: 18,
    },

    // Sticky Actions bottom footer
    footerBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: '#E2E8F0',
      borderRadius: 10,
      height: 40,
    },
    footerBtnText: {
      fontSize: 11.5,
      fontWeight: '700',
      color: '#0EA5E9',
    },

    // Copilot Styles
    startCopilotBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
    },
    startCopilotText: {
      fontSize: 11,
      fontWeight: '800',
      color: '#8A5CF5',
    },
    copilotOverlay: {
      flex: 1,
    },
    copilotHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 8,
      paddingVertical: 8,
      borderBottomWidth: 1,
      height: 56,
    },
    copilotBackBtn: {
      padding: 8,
    },
    copilotHeaderTitleContainer: {
      marginLeft: 4,
    },
    copilotHeaderTitle: {
      fontSize: 15,
      fontWeight: '800',
    },
    copilotHeaderSubtitle: {
      fontSize: 10.5,
      color: '#94A3B8',
      fontWeight: '600',
    },
    copilotHeaderIconAction: {
      padding: 8,
    },
    menuOverlayContainer: {
      position: 'absolute',
      right: 16,
      width: 190,
      borderRadius: 12,
      borderWidth: 1,
      padding: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 5,
      zIndex: 9999,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 8,
    },
    menuItemText: {
      fontSize: 13,
      fontWeight: '600',
    },
    menuDivider: {
      height: 1,
      marginVertical: 4,
    },
    chatBubbleContainer: {
      width: '100%',
      marginVertical: 6,
    },
    chatBubble: {
      padding: 14,
      borderRadius: 16,
    },
    userBubbleText: {
      fontSize: 13,
      color: '#FFFFFF',
      fontWeight: '600',
      lineHeight: 18,
    },
    userBubble: {
      backgroundColor: '#8A5CF5',
      borderBottomRightRadius: 4,
    },
    aiBubbleAlign: {
      alignItems: 'flex-start',
    },
    aiAvatar: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: '#8A5CF5',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 6,
      marginTop: 2,
    },
    aiBubble: {
      flex: 1,
      borderTopLeftRadius: 4,
    },
    disclaimerContainer: {
      marginTop: 10,
      width: '100%',
    },
    disclaimerDivider: {
      height: 1,
      marginVertical: 8,
      width: '100%',
      opacity: 0.5,
    },
    disclaimerText: {
      fontSize: 10,
      lineHeight: 14,
      fontWeight: '600',
    },
    bubbleSuggestionsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      width: '100%',
    },
    bubbleSuggestionChip: {
      width: '48%',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.2,
      borderRadius: 20,
      paddingHorizontal: 8,
      paddingVertical: 8,
      height: 36,
      marginBottom: 8,
    },
    bubbleSuggestionText: {
      fontSize: 11,
      fontWeight: '700',
    },
    emptyChatContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'flex-start',
      paddingTop: 24,
      paddingBottom: 40,
    },
    lightweightGreetingContainer: {
      alignItems: 'center',
      paddingHorizontal: 24,
    },
    lightweightGreetingTitle: {
      fontSize: 18,
      fontWeight: '800',
      marginBottom: 10,
      textAlign: 'center',
    },
    thinkingBubbleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 6,
    },
    copilotAttachmentBar: {
      paddingVertical: 10,
      borderTopWidth: 1,
    },
    copilotAttachChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 16,
      borderWidth: 1,
      gap: 6,
    },
    copilotAttachLabel: {
      fontSize: 12,
      fontWeight: '600',
      maxWidth: 120,
    },
    floatingScrollBtn: {
      position: 'absolute',
      right: 16,
      width: 36,
      height: 36,
      borderRadius: 18,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 3,
      zIndex: 99,
    },
    copilotComposerContainer: {
      borderTopWidth: 1,
    },
    composerTextInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 24,
      borderWidth: 1,
      paddingHorizontal: 8,
      paddingVertical: 4,
      minHeight: 48,
    },
    composerInnerBtn: {
      padding: 6,
      justifyContent: 'center',
      alignItems: 'center',
    },
    composerTextInput: {
      flex: 1,
      fontSize: 13,
      maxHeight: 100,
      paddingHorizontal: 6,
      paddingVertical: 8,
    },
    composerInnerMicBtn: {
      padding: 8,
      justifyContent: 'center',
      alignItems: 'center',
    },
    composerInnerSendBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
    },
    recordingWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 8,
      height: 48,
      justifyContent: 'space-between',
    },
    voiceControlBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    waveformContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    recordingIndicatorDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: '#EF4444',
    },
    voiceStopBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: '#EF4444',
      alignItems: 'center',
      justifyContent: 'center',
    },
    bottomSheetOverlay: {
      flex: 1,
      backgroundColor: 'rgba(15, 23, 42, 0.4)',
      justifyContent: 'flex-end',
    },
    suggestionsSheetContainer: {
      width: '100%',
      height: height * 0.7,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 16,
      paddingBottom: 20,
    },
    suggestionsSheetHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
      borderBottomWidth: 1,
    },
    suggestionsSheetTitle: {
      fontSize: 15,
      fontWeight: '800',
    },
    suggestionsCategoryTitle: {
      fontSize: 11.5,
      fontWeight: '800',
      color: '#94A3B8',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginTop: 16,
      marginBottom: 8,
      paddingHorizontal: 4,
    },
    suggestionsCategoryGroup: {
      gap: 8,
      marginBottom: 8,
    },
    suggestionsItemBtn: {
      width: '100%',
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: 10,
      borderWidth: 1,
    },
    suggestionsItemText: {
      fontSize: 13,
      fontWeight: '600',
    },
    historyDrawerOverlay: {
      flex: 1,
      backgroundColor: 'rgba(15, 23, 42, 0.4)',
      flexDirection: 'row',
    },
    historyDrawerContainer: {
      width: '80%',
      height: '100%',
      paddingHorizontal: 16,
      paddingTop: 48,
    },
    historyDrawerHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingBottom: 12,
      borderBottomWidth: 1,
    },
    historyDrawerTitle: {
      fontSize: 16,
      fontWeight: '800',
    },
    historyDrawerList: {
      flex: 1,
      marginTop: 8,
    },
    historySessionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 10,
      borderRadius: 8,
      marginVertical: 4,
    },
    historySessionTitle: {
      fontSize: 13.5,
      fontWeight: '700',
    },
    historySessionTime: {
      fontSize: 10.5,
      color: '#94A3B8',
      marginTop: 2,
    },
    dialogOverlay: {
      flex: 1,
      backgroundColor: 'rgba(15, 23, 42, 0.4)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    dialogContainer: {
      width: '85%',
      borderRadius: 16,
      borderWidth: 1,
      padding: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 5,
    },
    dialogTitle: {
      fontSize: 16,
      fontWeight: '800',
      marginBottom: 14,
    },
    dialogInput: {
      height: 40,
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 12,
      fontSize: 13,
      marginBottom: 16,
    },
    dialogActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 12,
    },
    dialogCancelBtn: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 8,
    },
    dialogConfirmBtn: {
      backgroundColor: '#8A5CF5',
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 8,
    },

    // Modal Headers
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
    },
    modalHeaderTitle: {
      fontSize: 15,
      fontWeight: '800',
    },

    // Bottom Modal Sheets Case link selection drawer
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(15, 23, 42, 0.4)',
      justifyContent: 'flex-end',
    },
    bottomSheetContainer: {
      width: '100%',
      height: height * 0.5,
      backgroundColor: '#FFFFFF',
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 16,
      paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    },
    bottomSheetDragHandle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: '#E2E8F0',
      alignSelf: 'center',
      marginTop: 8,
      marginBottom: 8,
    },
    bottomSheetHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: '#E2E8F0',
      marginBottom: 12,
    },
    bottomSheetTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: '#1F2937',
    },
    caseItemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      borderBottomWidth: 1,
    },
    caseItemText: {
      fontSize: 13.5,
      fontWeight: '600',
    },
  });
}
