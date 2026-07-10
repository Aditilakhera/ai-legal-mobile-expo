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
import { useChat } from '@/hooks/use-chat';
import { useChatStore } from '@/store/chat';
import { useSpeechRecognition, SpeechLanguage } from '@/hooks/use-speech-recognition';
import { useAttachmentHandler } from '@/hooks/use-attachment-handler';
import { AttachmentBottomSheet } from '@/components/ui/bottomSheets/AttachmentBottomSheet';
import { CustomCameraModal } from '@/components/ui/legal/CustomCameraModal';
import { MarkdownRenderer } from '@/components/ui/documents';

const { width, height } = Dimensions.get('window');

// Step 1: Upload Documents mockup
const MOCK_STRATEGY_DOCS = [
  { id: 'contract_dispute', name: 'breach_of_service_contract.pdf', size: '1.8 MB', type: 'Statement of Claim' },
  { id: 'evict', name: 'tenancy_agreement_notice.docx', size: '980 KB', type: 'Eviction Notice' },
  { id: 'ip', name: 'trademark_infringement_brief.pdf', size: '3.1 MB', type: 'Cease & Desist Reply' },
];

// Step 3: AI Processing steps
const PROCESSING_STEPS = [
  'Reading Case',
  'Loading Timeline',
  'Evaluating Evidence',
  'Opponent Analysis',
  'Finding Similar Judgments',
  'Building Litigation Strategy',
  'Risk Assessment',
  'Preparing Court Roadmap',
  'Generating Final Report',
];

// Roadmap vertical timeline steps mockup
const OVERVIEW_DATA = [
  {
    key: 'summary',
    title: 'Executive Strategy Summary',
    summary: 'The prosecution under Section 138 NI Act holds a strong legal footing because the cheque execution signatures are admitted.',
    analysis: 'The signatures are admitted, automatically shifting the burden of proof to the accused under Section 139. Statutory notice delivered on May 14 was ignored, with no reply registered within the limitation period.',
    score: '85% Case Strength',
    law: 'Section 138 & 139, Negotiable Instruments Act, 1881',
    precedents: 'Rangappa v. Sri Mohan (2010) 11 SCC 441',
    risks: 'Notice delivery tracking confirmation receipt is missing.',
    action: 'Apply for official post office service delivery log certification.'
  },
  {
    key: 'obj',
    title: 'Case Objectives',
    summary: 'Convict the accused for commercial default and secure 20% interim compensation.',
    analysis: 'Filing an application under Section 143A forces immediate deposit, creating settlement leverage early in the litigation.',
    score: '90% Objective Alignment',
    law: 'Section 143A, Negotiable Instruments Act, 1881',
    precedents: 'Surinder Singh Deswal v. Virender Prasad (2019)',
    risks: 'Discretionary power of court to deny interim award.',
    action: 'Present certified bank statement showing major liquidity default impacts.'
  },
  {
    key: 'win_prob',
    title: 'Winning Probability',
    summary: '85% Probability of success estimated by AI based on local court metrics.',
    analysis: 'Statistical data of Negotiable Instruments Act filings in Delhi District Courts indicates highly favorable outcomes when execution signatures are uncontested.',
    score: '85% Probability',
    law: 'Section 118, Negotiable Instruments Act, 1881',
    precedents: 'Kishan Rao v. Shankargouda (2018) 8 SCC 110',
    risks: 'Delay due to accused seeking local advocate replacements.',
    action: 'Request day-to-day hearings under Section 143(3) NI Act mandate.'
  },
  {
    key: 'next_action',
    title: 'Immediate Next Action',
    summary: 'Submit Section 143A application for interim compensation award.',
    analysis: 'Filing must be completed before issues are framed by the Magistrate to prevent delays in securing interim deposits.',
    score: '95% Urgency Rate',
    law: 'Section 143A(1)(a) NI Act',
    precedents: 'L.G.R. Enterprises v. P. Gopalakrishnan (2019) Mad',
    risks: 'Failure to file early waives immediate deposit recovery rights.',
    action: 'Draft and file the application at the next admission hearing listing.'
  },
  {
    key: 'ai_recs',
    title: 'AI Strategic Recommendations',
    summary: 'Invoke Section 27 General Clauses Act to counter address relocation claims.',
    analysis: 'If the accused claims notice wasn\'t received because of relocation, a registered post sent to the correct address is deemed served.',
    score: '88% Effectiveness',
    law: 'Section 27, General Clauses Act, 1897',
    precedents: 'C.C. Alavi Haji v. Palapetty Muhammed (2007) 6 SCC 555',
    risks: 'Proof of incorrect pincode can rebut the presumption.',
    action: 'Cross-examine accused on company registration listings.'
  },
  {
    key: 'top_risks',
    title: 'Top 5 Litigation Risks',
    summary: 'Notice service tracking gap and accused relocation defenses.',
    analysis: 'Procedural gaps in dispatching speed post or mismatched details can invite technical acquittal challenges.',
    score: 'Medium Risk Index',
    law: 'Section 138 Clause (b) NI Act',
    precedents: 'MSR Leathers v. S. Palaniappan (2013) 1 SCC 177',
    risks: '1. Relocation defense\n2. Signature mismatch allegations\n3. Missing bank return memo ledger\n4. Material alteration claim\n5. Limitation expiry calculation error',
    action: 'Attach clear tracking report and postal receipt duplicates.'
  },
  {
    key: 'missing_docs',
    title: 'Missing Documents Alert',
    summary: 'HDFC Bank ledger statement showing cheque presentation entry.',
    analysis: 'A certified ledger statement is required under the Bankers Books Evidence Act to substantiate return memo claims.',
    score: 'Critical Impact',
    law: 'Section 4, Bankers Books Evidence Act, 1891',
    precedents: 'Central Bank of India v. Shamdasani (1938)',
    risks: 'Secondary copy return memo might be challenged as inadmissible.',
    action: 'File application to summon HDFC branch clearance logs.'
  },
  {
    key: 'strat_score',
    title: 'Litigation Strategy Score',
    summary: '88/100 Readiness Score based on statutory criteria compliance.',
    analysis: 'Case dossier meets 9 out of 10 primary parameters required for trial initiation.',
    score: '88/100 Readiness',
    law: 'Chapter XVII NI Act Guidelines',
    precedents: 'Kaushalya Devi Massand v. Roopkishore (2011)',
    risks: 'Lack of local citation backups.',
    action: 'Bookmark supreme court precedents in legal library.'
  }
];

const OPPONENT_DATA = [
  {
    key: 'theory',
    title: 'Likely Defence Theory',
    summary: 'Cheque was issued purely as security, and there was no actual outstanding debt.',
    analysis: 'The accused will claim the cheque was issued for an unliquidated future transaction that never matured. However, once signature is admitted, the burden shifts to them to prove no debt existed.',
    score: '35% Success Probability for Defence',
    law: 'Section 139 NI Act Presumption',
    precedents: 'Sampelly Satyanarayana Rao v. ISRO (2016) 10 SCC 458',
    risks: 'Discrepancy in invoice delivery dates.',
    action: 'File original credit delivery invoices with signature receipt.'
  },
  {
    key: 'strong_args',
    title: 'Opponent Strongest Arguments',
    summary: 'Discrepancies in the underlying logistics invoice timestamps.',
    analysis: 'They will point out that invoices are dated after the cheque presentation date, arguing the debt had not matured.',
    score: 'Moderate Threat Level',
    law: 'Section 138(a) NI Act',
    precedents: 'Indus Airways v. Magnum Aviation (2014) 12 SCC 539',
    risks: 'May rebut the legally enforceable debt presumption.',
    action: 'Explain billing terms allowing credit presentation.'
  },
  {
    key: 'weak_args',
    title: 'Opponent Weakest Arguments',
    summary: 'Mismatched signatures and claims of lost cheque.',
    analysis: 'They claim the cheque was lost or stolen but never filed a police report or bank stop-payment instruction on those grounds.',
    score: 'High Vulnerability',
    law: 'Section 114, Indian Evidence Act, 1872',
    precedents: 'Bir Singh v. Mukesh Kumar (2019) 4 SCC 197',
    risks: 'Impeached credibility.',
    action: 'Cross-examine accused on lack of stop payment log.'
  },
  {
    key: 'behavior',
    title: 'Previous Behaviour Pattern',
    summary: 'History of settling disputes immediately after framing of charges.',
    analysis: 'Audits of past cases show the defendant avoids trial and settles once local courts reject exemption requests.',
    score: '80% Settlement Likelihood',
    law: 'Section 147 NI Act Compounding',
    precedents: 'Damodar S. Prabhu v. Sayed Babalal H. (2010) 5 SCC 663',
    risks: 'May try to negotiate settlement on highly discounted rates.',
    action: 'Refuse discounts under 15% to maintain leverage.'
  },
  {
    key: 'delay',
    title: 'Expected Delay Tactics',
    summary: 'Seeking multiple adjournments for solicitor change or health reviews.',
    analysis: 'Common litigation stalling method. They will petition for dates citing illness or search for senior counsel.',
    score: 'High Likelihood of Delay',
    law: 'Section 309 Code of Criminal Procedure, 1973',
    precedents: 'State of U.P. v. Shambhu Nath Singh (2001)',
    risks: 'Case timeline extension.',
    action: 'Oppose adjournments citing Section 143(3) NI Act 6-month trial limit.'
  },
  {
    key: 'witnesses',
    title: 'Possible Opponent Witnesses',
    summary: 'Branch Manager of accused bank or their internal accountant.',
    analysis: 'To testify that stop-payment instructions were issued prior to cheque presentation.',
    score: 'Low Impact',
    law: 'Section 122, Indian Evidence Act, 1872',
    precedents: 'Kalyani Baskar v. M.S. Sampoornam (2007)',
    risks: 'Witness testimony might delay trial progress.',
    action: 'Subpoena ledger logs proving funds were insufficient even before stop-payment.'
  },
  {
    key: 'evidence_docs',
    title: 'Possible Documentary Evidence',
    summary: 'Internal emails complaining about defective logistics services.',
    analysis: 'They will present correspondence claiming breach of contract to show unliquidated debt.',
    score: 'Moderate threat',
    law: 'Section 65B, Indian Evidence Act, 1872',
    precedents: 'Arjun Panditrao Khotkar v. Kailash Kushanrao Gorantyal (2020)',
    risks: 'Admissibility challenge if Section 65B certificate is attached.',
    action: 'Challenge formatting integrity of the email copies.'
  },
  {
    key: 'cross_opps',
    title: 'Cross Examination Opportunities',
    summary: 'Impeaching the accused drawer on lack of written service disputes.',
    analysis: 'Confront accused on why they continued utilizing logistics services if invoices were disputed.',
    score: 'High Success Rate',
    law: 'Section 146, Indian Evidence Act, 1872',
    precedents: 'Tedhi Singh v. Narayan Dass Mahay (2015)',
    risks: 'Witness might give evasive answers.',
    action: 'Present signed delivery challans during cross-examination.'
  },
  {
    key: 'counter_strat',
    title: 'Recommended Counter Strategy',
    summary: 'Maintain statutory presumption strictly under Section 139.',
    analysis: 'Prevent the court from entering detailed contractual disputes; keep focus on signature admission.',
    score: '90% Strength Score',
    law: 'Section 139, Negotiable Instruments Act',
    precedents: 'Uttam Ram v. Devinder Singh Hudan (2019) 10 SCC 287',
    risks: 'Contractual terms evaluation.',
    action: 'File written submissions citing Uttam Ram mandate.'
  }
];

const EVIDENCE_DATA = [
  {
    key: 'strength',
    title: 'Strong Primary Evidence',
    summary: 'Original dishonoured cheque and bank return memo showing insufficient funds.',
    analysis: 'These satisfy primary criteria under Section 138. Signatures are uncontested, shifting burden.',
    score: '95% Admissibility',
    law: 'Section 138 Clause (a) NI Act',
    precedents: 'Rangappa v. Sri Mohan (2010)',
    risks: 'Loss of original document.',
    action: 'Tender in safe custody ledger files.'
  },
  {
    key: 'missing',
    title: 'Missing Evidence',
    summary: 'Postal service speed post tracking certificate.',
    analysis: 'Required to establish receipt of legal notice within the statutory 30-day window.',
    score: 'Critical Gap',
    law: 'Section 27, General Clauses Act',
    precedents: 'C.C. Alavi Haji case',
    risks: 'Dismissal on notice service failure.',
    action: 'Apply for post master delivery log certificate.'
  },
  {
    key: 'priority',
    title: 'Priority Collection',
    summary: 'Certified account statements showing matured outstanding debit.',
    analysis: 'To prove the cheque was issued against a legally enforceable matured debt.',
    score: '90% Urgency',
    law: 'Section 34, Indian Evidence Act, 1872',
    precedents: 'K.P.O. Moideenkutty Haji v. Pappu Manikka (1996)',
    risks: 'Account books challenged as self-serving.',
    action: 'Certify statements under Section 65B.'
  },
  {
    key: 'weak',
    title: 'Weak / Challenged Evidence',
    summary: 'Uncertified WhatsApp chats between engineers discussing payment schedules.',
    analysis: 'Digital logs without Section 65B certificates are inadmissible.',
    score: '30% Admissibility',
    law: 'Section 65B(4), Indian Evidence Act',
    precedents: 'Anvar P.V. v. P.K. Basheer (2014)',
    risks: 'Objection by opponent will succeed.',
    action: 'Obtain certified printouts along with signed Section 65B affidavit.'
  }
];

const ARGUMENTS_DATA = [
  {
    key: 'opening',
    title: 'Opening Statement',
    summary: 'Prosecuting commercial default under Section 138 NI Act for bounced cheque of Rs. 5,00,000.',
    analysis: 'Establish cheque drawal, bank presentation, dishonour memo, statutory notice delivery, and failure to pay.',
    score: '90% Readiness',
    law: 'Section 138, Negotiable Instruments Act',
    precedents: 'Kaushalya Devi Massand v. Roopkishore (2011)',
    risks: 'Incomplete compliance statement.',
    action: 'Read out statutory timeline compliances clearly.'
  },
  {
    key: 'primary',
    title: 'Main Legal Arguments',
    summary: 'Burden of proof shifts automatically once cheque signature is admitted.',
    analysis: 'The drawer must rebut the presumption by bringing on record probable facts, not mere denials.',
    score: '92% Strength',
    law: 'Section 139, Negotiable Instruments Act',
    precedents: 'Bir Singh v. Mukesh Kumar (2019)',
    risks: 'Failure to file written submissions.',
    action: 'Cite Bir Singh on blank signed cheques.'
  },
  {
    key: 'supporting',
    title: 'Supporting Facts',
    summary: 'Accused issued cheque dated April 28; it bounced on April 30; notice received on May 14.',
    analysis: 'Dates prove absolute adherence to the statutory limitation timelines.',
    score: '100% Chronology Compliance',
    law: 'Section 138 Proviso Clause (b) & (c) NI Act',
    precedents: 'MSR Leathers v. S. Palaniappan (2013)',
    risks: 'Typographical error in notice date.',
    action: 'Re-verify postal dispatch receipts dates.'
  },
  {
    key: 'avoid',
    title: 'Arguments to Avoid',
    summary: 'Contractual disputes on defective logistics services quality.',
    analysis: 'Keep focus on cheque clearance default; do not dilute case with breach of warranty trials.',
    score: '95% Avoidance Recommended',
    law: 'Section 138, Negotiable Instruments Act',
    precedents: 'Uttam Ram v. Devinder Singh Hudan (2019)',
    risks: 'Prolongs trial timeline.',
    action: 'Object to contractual quality queries.'
  },
  {
    key: 'cross',
    title: 'Cross Questions Checklist',
    summary: 'Ask drawer if they issued instructions to stop payment before presentation.',
    analysis: 'Demonstrates drawer knew balance was insufficient before presentation.',
    score: '85% Effectiveness',
    law: 'Section 146, Indian Evidence Act',
    precedents: 'Tedhi Singh v. Narayan Dass Mahay (2015)',
    risks: 'Witness giving prepared replies.',
    action: 'Expose bank balance logs dated April 28.'
  },
  {
    key: 'prayer',
    title: 'Final Prayer',
    summary: 'Convict accused and direct payment of double the cheque amount as compensation.',
    analysis: 'Request 20% interim award immediately, followed by maximum penalty on final conviction.',
    score: '90% Prayer Alignment',
    law: 'Section 138, Section 143A NI Act',
    precedents: 'Surinder Singh Deswal case',
    risks: 'Court awarding only simple interest.',
    action: 'Present impact report of outstanding debt on business cash flows.'
  },
  {
    key: 'backup',
    title: 'Emergency Backup Argument',
    summary: 'Admitted liability under signed acknowledgment of debt sheets.',
    analysis: 'If Section 138 fails on notice technicality, proceed under Section 25(3) Contract Act or Summary Suit.',
    score: '75% Strength',
    law: 'Section 25(3), Indian Contract Act, 1872',
    precedents: 'National Insurance Co. Ltd v. Boghara Polyfab (2009)',
    risks: 'Higher court fees required for civil suit.',
    action: 'Draft backup civil recovery plaint pre-emptively.'
  }
];

const RISKS_DATA = [
  {
    key: 'financial',
    title: 'Financial Risk Exposure',
    summary: 'Accused company declaring insolvency during trial.',
    analysis: 'Accused company might file for bankruptcy to trigger insolvency stay rules.',
    score: '45% Probability',
    law: 'Section 14(1), Insolvency and Bankruptcy Code, 2016',
    precedents: 'P. Mohanraj v. Shah Brothers Ispat Pvt. Ltd. (2021)',
    risks: 'IBC moratorium stay applicability.',
    action: 'Cite P. Mohanraj: Section 138 proceedings are criminal and stay does not apply to individuals.'
  },
  {
    key: 'witness',
    title: 'Witness Risks',
    summary: 'Logistics ledger accountant relocating out of jurisdiction.',
    analysis: 'Primary accountant who verified ledger might not be available to testify.',
    score: '30% Probability',
    law: 'Section 32, Indian Evidence Act, 1872',
    precedents: 'State of Karnataka v. Shivappa (1998)',
    risks: 'Ledger entries might be challenged as unverified.',
    action: 'File ledger statements certified by the current finance head.'
  },
  {
    key: 'procedural',
    title: 'Procedural Delay Risks',
    summary: 'Filing in incorrect territorial jurisdiction.',
    analysis: 'Accused will object to jurisdiction since cheques presented in bank branches differ.',
    score: '20% Probability',
    law: 'Section 142(2), Negotiable Instruments Act',
    precedents: 'Dashrath Rupsingh Rathod v. State of Maharashtra (2014)',
    risks: 'Transfer of case files.',
    action: 'File at place where payee bank branch is situated.'
  }
];

const ROADMAP_STAGES = [
  {
    stage: 'Legal Demand Notice',
    status: 'COMPLETED',
    duration: '14 Days',
    docs: 'Copy of legal notice, speed post receipts, tracking report',
    checklist: '1. Verify notice dispatched within 30 days of dishonour memo.\n2. Dispatch via registered post to correct company address.',
    filing: 'Not Applicable (Pre-litigation stage)'
  },
  {
    stage: 'Interim Relief Application',
    status: 'CURRENT',
    duration: '15 Days (Deadline: 15 July)',
    docs: 'Section 143A application affidavit, HDFC bank account statement',
    checklist: '1. Claim 20% of cheque sum as interim compensation.\n2. Prove default impact on business transactions.',
    filing: 'Delhi Sessions Court Filing Room 3'
  },
  {
    stage: 'Written Statement Reply',
    status: 'UPCOMING',
    duration: '45 Days',
    docs: 'Reply affidavit, credit delivery receipt invoices',
    checklist: '1. Object to defendant\'s security cheque claims.\n2. Expose absence of stop-payment warnings.',
    filing: 'District Court registry desk'
  },
  {
    stage: 'Evidence & Cross Trial',
    status: 'UPCOMING',
    duration: '90 Days',
    docs: 'Section 65B certified screenshot records, witness subpoena request',
    checklist: '1. Cross-examine accused accountant on ledger entries.\n2. Establish ledger entries matching cheque presentation.',
    filing: 'Trial Room 4 Judge Bench'
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

export default function StrategyEngineScreen() {
  const { showToast } = useToastContext();
  const { theme, isDark } = useThemeContext();
  const styles: any = useMemo(() => getStyles(theme, isDark), [theme, isDark]);
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const renderEnrichedTabContent = (item: any) => {
    return (
      <View style={{ gap: 10, padding: 12, backgroundColor: theme.surface }}>
        {item.summary && (
          <View style={{ gap: 2 }}>
            <Text style={{ fontSize: 11, fontWeight: '800', color: '#6D5DFC', textTransform: 'uppercase' }}>Summary</Text>
            <Text style={{ fontSize: 13, color: theme.textPrimary, lineHeight: 18 }}>{item.summary}</Text>
          </View>
        )}
        {item.analysis && (
          <View style={{ gap: 2, borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 8 }}>
            <Text style={{ fontSize: 11, fontWeight: '800', color: '#6D5DFC', textTransform: 'uppercase' }}>AI Analysis & Reasoning</Text>
            <Text style={{ fontSize: 13, color: theme.textSecondary, lineHeight: 18 }}>{item.analysis}</Text>
          </View>
        )}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 4 }}>
          {item.score && (
            <View style={{ backgroundColor: '#EEF2FF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
              <Text style={{ fontSize: 10, fontWeight: '800', color: '#6D5DFC' }}>⚡ {item.score}</Text>
            </View>
          )}
          {item.law && (
            <View style={{ backgroundColor: '#ECFDF5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
              <Text style={{ fontSize: 10, fontWeight: '800', color: '#10B981' }}>⚖️ Law: {item.law}</Text>
            </View>
          )}
        </View>
        {item.precedents && (
          <View style={{ gap: 2 }}>
            <Text style={{ fontSize: 11, fontWeight: '800', color: '#6B7280', textTransform: 'uppercase' }}>Relevant Precedents</Text>
            <Text style={{ fontSize: 12, color: theme.textPrimary, fontWeight: '700' }}>• {item.precedents}</Text>
          </View>
        )}
        {item.risks && (
          <View style={{ gap: 2 }}>
            <Text style={{ fontSize: 11, fontWeight: '800', color: '#EF4444', textTransform: 'uppercase' }}>Risks & Threats</Text>
            <Text style={{ fontSize: 12.5, color: '#DC2626' }}>• {item.risks}</Text>
          </View>
        )}
        {item.action && (
          <View style={{ backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FDE68A', borderRadius: 8, padding: 10, marginTop: 4 }}>
            <Text style={{ fontSize: 11, fontWeight: '800', color: '#D97706', textTransform: 'uppercase', marginBottom: 2 }}>Recommended Action</Text>
            <Text style={{ fontSize: 12.5, color: '#B45309', fontWeight: '600' }}>{item.action}</Text>
          </View>
        )}
      </View>
    );
  };

  // Wizard Navigation States
  // 'HOME' -> 'ANALYZING' -> 'INTELLIGENCE'
  const [step, setStep] = useState<'HOME' | 'ANALYZING' | 'INTELLIGENCE'>('HOME');

  // Sticky tabs selectors: Overview, Opponent, Evidence, Arguments, Risk, Roadmap, Reports
  const [activeTab, setActiveTab] = useState<'overview' | 'opponent' | 'evidence' | 'arguments' | 'risk' | 'roadmap' | 'reports'>('overview');

  // Cases Workspace listing state
  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [linkedCaseId, setLinkedCaseId] = useState<string>('');
  const [isCaseSelectOpen, setIsCaseSelectOpen] = useState(false);
  const [showSyncSuccess, setShowSyncSuccess] = useState(false);

  // Manual inputs form (Card 3)
  const [isManualFormOpen, setIsManualFormOpen] = useState(false);
  const [manualFacts, setManualFacts] = useState('');
  const [manualClaims, setManualClaims] = useState('');
  const [manualDefence, setManualDefence] = useState('');
  const [manualCourt, setManualCourt] = useState('');
  const [manualObjective, setManualObjective] = useState('');

  // Upload selectors state (Card 2)
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);

  // AI Extraction checklist progress index
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [progressVal] = useState(new Animated.Value(0));

  // Expandable accordions state trackers
  const [expandedOverview, setExpandedOverview] = useState<Record<string, boolean>>({ summary: true });
  const [expandedOpponent, setExpandedOpponent] = useState<Record<string, boolean>>({ defence: true });
  const [expandedEvidence, setExpandedEvidence] = useState<Record<string, boolean>>({ strength: true });
  const [expandedArguments, setExpandedArguments] = useState<Record<string, boolean>>({ primary: true });
  const [expandedRisks, setExpandedRisks] = useState<Record<string, boolean>>({ overall: true });
  const [expandedRoadmap, setExpandedRoadmap] = useState<Record<number, boolean>>({ 2: true }); // current step open

  // Executive Document Viewer overlays
  const [isReportViewerOpen, setIsReportViewerOpen] = useState(false);

  const [loadingOverlayText, setLoadingOverlayText] = useState<string | null>(null);

  const handleLaunchModule = (module: 'court_prep' | 'cross_exam' | 'reply_draft' | 'evidence_verify' | 'ask_copilot', item: any, sourceTab: string) => {
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
      targetParams.injectPrompt = `Prepare courtroom arguments using this Strategy Engine analysis for: ${item.title || item.stage || ''}. Ensure it includes opening statements, legal sections, and counter rebuttals.`;
    } else if (module === 'cross_exam') {
      loadingText = 'Generating Cross Examination Strategy...';
      targetRoute = '/tools/argument-builder';
      targetParams.mode = 'cross_examination';
      targetParams.injectPrompt = `Generate professional cross-examination questions based on Strategy Engine findings for: ${item.title || item.stage || ''}.`;
    } else if (module === 'reply_draft') {
      loadingText = 'Drafting Reply Strategy...';
      targetRoute = '/tools/draft-maker';
      targetParams.mode = 'draft';
      targetParams.draftType = 'Reply Notice';
      targetParams.injectPrompt = `Draft a Reply Notice based on Strategy Engine findings for: ${item.title || item.stage || ''}.`;
    } else if (module === 'evidence_verify') {
      loadingText = 'Synchronizing Evidence with Analyst...';
      targetRoute = '/tools/evidence-analyst';
      targetParams.injectPrompt = `Analyze whether the evidence supports or weakens this strategy finding: ${item.title || item.stage || ''}.`;
    } else if (module === 'ask_copilot') {
      setIsAiAssistantOpen(true);
      setChatInput(`Regarding "${item.title || item.stage || ''}": How can we refine this litigation planning point or adjust our court action?`);
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

  const renderCardActions = (item: any, sourceTab: string) => {
    return (
      <View style={{ marginTop: 12, borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 10 }}>
        <Text style={{ fontSize: 9.5, fontWeight: "800", color: theme.textSecondary, marginBottom: 6, textTransform: "uppercase" }}>Command Center Actions</Text>
        <View style={styles.actionGrid}>
          <TouchableOpacity style={styles.actionChip} onPress={() => handleLaunchModule("court_prep", item, sourceTab)}>
            <Text style={styles.actionChipText}>⚖️ Court Prep</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionChip} onPress={() => handleLaunchModule("cross_exam", item, sourceTab)}>
            <Text style={styles.actionChipText}>🎯 Cross Exam</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionChip} onPress={() => handleLaunchModule("reply_draft", item, sourceTab)}>
            <Text style={styles.actionChipText}>📝 Draft Reply</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionChip} onPress={() => handleLaunchModule("ask_copilot", item, sourceTab)}>
            <Text style={styles.actionChipText}>💬 Ask AI</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ width: "100%", backgroundColor: "#F0FDF4", borderColor: "#DCFCE7", borderWidth: 1, borderRadius: 8, paddingVertical: 8, alignItems: "center", marginTop: 4 }} onPress={() => handleLaunchModule("evidence_verify", item, sourceTab)}>
            <Text style={{ fontSize: 10.5, fontWeight: "700", color: "#16A34A" }}>📂 Verify in Evidence Analyst</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ─── Strategy Engine Copilot State ───────────────────────────────────────
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
  } = useChat('legal_strategy_engine');

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
    isBottomSheetVisible,
    isCameraVisible,
    showAttachmentOptions,
    hideAttachmentOptions,
    hideCamera,
    handleRemoveAttachment,
    clearAttachments,
    handleSelectOption,
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

  // Copilot UI states
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [renameSessionId, setRenameSessionId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSuggestionsSheetOpen, setIsSuggestionsSheetOpen] = useState(false);
  const [expandedSuggestions, setExpandedSuggestions] = useState<Record<string, boolean>>({});

  const toggleExpandSuggestions = (msgId: string) => {
    setExpandedSuggestions((prev) => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  // Suggestions categories for ✨ sheet
  const STRATEGY_SUGGESTIONS_SHEET = {
    'Litigation Planning': [
      'Prepare Defence Strategy',
      'Prepare Plaintiff Strategy',
      'Generate Trial Roadmap',
      'Courtroom Checklist',
    ],
    'Hearing Preparation': [
      'Anticipate Judge Questions',
      'Witness Preparation Plan',
      'Cross Examination Strategy',
      'Oral Submission Draft',
    ],
    'Risk Analysis': [
      'Identify Case Weaknesses',
      'Generate Risk Heatmap',
      'Case Readiness Score',
      'Missing Evidence Alert',
    ],
    'Settlement': [
      'Settlement Possibility',
      'Negotiation Strategy',
      'Alternative Dispute Resolution',
    ],
    'Advanced Strategy': [
      'Opponent Prediction Analysis',
      'Counter Strategy Plan',
      'Emergency Defence Plan',
      'Appeal Planning',
    ],
  };

  // Animated thinking dots
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

  // Auto-scroll when new messages arrive
  useEffect(() => {
    setTimeout(() => {
      copilotScrollRef.current?.scrollToEnd({ animated: true });
    }, 80);
  }, [activeSession?.messages, isAiAssistantOpen]);

  const filteredSessions = useMemo(() => {
    if (!searchQuery.trim()) return sessions;
    return sessions.filter((s) =>
      s.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [sessions, searchQuery]);

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
      showToast('success', 'Conversation Cleared', 'Strategy analysis log cleared.');
    }
  };

  const handleClearPress = () => {
    Alert.alert(
      'Clear Conversation',
      'Are you sure you want to clear all messages?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: () => { handleClearConversation(); } },
      ]
    );
  };

  const shortenSuggestion = (text: string) => {
    if (text.length > 25) return text.substring(0, 22) + '...';
    return text;
  };

  const handleNewChat = () => {
    startNewSession('New Strategy Session', 'legal_strategy_engine');
    showToast('success', 'New Strategy Session', 'Ready to plan your litigation strategy.');
  };

  const handleExportChat = () => {
    if (!activeSession || !activeSession.messages || activeSession.messages.length === 0) {
      showToast('error', 'No Messages', 'There is no conversation to export.');
      return;
    }
    const formattedMessages = activeSession.messages
      .map((m) => {
        const senderLabel = m.role === 'user' ? 'Lawyer' : 'Strategy Engine Copilot';
        return `[${senderLabel}]:\n${m.content}\n`;
      })
      .join('\n────────────────────────\n\n');
    const exportText = `Litigation Strategy Report: ${activeSession.title || 'Untitled Strategy'}\n\n${formattedMessages}`;
    Share.share({ title: 'Export Strategy Report', message: exportText })
      .then((res) => {
        if (res.action === Share.sharedAction) {
          showToast('success', 'Report Exported', 'Strategy report exported successfully.');
        }
      })
      .catch((err) => console.warn('[EXPORT ERROR]', err));
  };

  // Fetch Cases list on start
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
    setShowSyncSuccess(true);
    showToast('success', 'Case Workspace Selected', 'Linked successfully.');
    
    // Simulate short auto success banner display
    setTimeout(() => {
      setShowSyncSuccess(false);
      handleStartAnalysis();
    }, 1200);
  };

  const handleSelectDoc = (docId: string) => {
    setSelectedDocId(docId);
    showToast('success', 'File Selected', 'Pleading document linked into Strategy builder.');
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
          duration: 250,
          useNativeDriver: false,
        }).start();
      } else {
        clearInterval(interval);
        setStep('INTELLIGENCE');
        showToast('success', 'Strategy Generated', 'Litigation dashboard ready.');
      }
    }, 400);
  };

  // Toggle handlers for accordions
  const toggleOverview = (key: string) => {
    setExpandedOverview(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleOpponent = (key: string) => {
    setExpandedOpponent(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleEvidence = (key: string) => {
    setExpandedEvidence(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleArgument = (key: string) => {
    setExpandedArguments(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleRisk = (key: string) => {
    setExpandedRisks(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleRoadmap = (idx: number) => {
    setExpandedRoadmap(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const handleSendChat = async (textOverride?: string) => {
    const textToSend = textOverride || chatInput;
    if (!textToSend.trim() && attachments.length === 0) return;

    setChatInput('');
    Keyboard.dismiss();

    try {
      await dispatchMessageStream(
        textToSend.trim(),
        'legal_strategy_engine',
        attachments,
        undefined,
        linkedCaseId || undefined
      );
      clearAttachments();
    } catch (err) {
      console.warn('[STRATEGY COPILOT SEND ERROR]', err);
    }
  };

  const linkedCaseName = useMemo(() => {
    const matched = cases.find(c => c._id === linkedCaseId);
    return matched ? matched.name : 'Independent Analysis';
  }, [cases, linkedCaseId]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      
      {/* Navigation Header bar */}
      <View style={[styles.header, { borderBottomColor: theme.border, backgroundColor: theme.surface }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Strategy Engine</Text>
          <Text style={styles.headerSubtitle}>Design litigation roadmaps and active defense strategies.</Text>
        </View>

        <TouchableOpacity
          style={[styles.startCopilotBtn, { backgroundColor: isDark ? 'rgba(109,93,252,0.08)' : 'rgba(109,93,252,0.15)', marginRight: 16 }]}
          onPress={() => setIsAiAssistantOpen(true)}
        >
          <Ionicons name="sparkles" size={13} color="#6D5DFC" style={{ marginRight: 4 }} />
          <Text style={styles.startCopilotText}>START</Text>
        </TouchableOpacity>
      </View>

      {/* Case Synced Success green banner */}
      {showSyncSuccess && (
        <View style={[styles.successBanner, { backgroundColor: '#10B981' }]}>
          <Ionicons name="checkmark-circle-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.successBannerText}>Case Synced Successfully</Text>
        </View>
      )}

      {/* STEP 1: Choose Strategy Source */}
      {step === 'HOME' && (
        <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
          <Text style={[styles.homeTitle, { color: theme.textPrimary }]}>Litigation Strategy Workspace</Text>
          <Text style={[styles.homeDesc, { color: theme.textSecondary }]}>
            Initiate a comprehensive litigation audit by linking active workspaces or uploading material pleadings.
          </Text>

          {/* Card 1: Existing Case */}
          <View style={[styles.workspaceCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Ionicons name="folder-open-outline" size={26} color="#6D5DFC" style={{ marginBottom: 8 }} />
            <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Existing Case Workspace</Text>
            <Text style={[styles.cardDesc, { color: theme.textSecondary }]}>
              Load active timeline logs, witness details, pleadings briefs, and custom evidence matrices directly.
            </Text>
            <TouchableOpacity style={styles.cardBtn} onPress={() => setIsCaseSelectOpen(true)}>
              <Text style={styles.cardBtnText}>Select Case Workspace</Text>
            </TouchableOpacity>
          </View>

          {/* Card 2: Upload Documents */}
          <View style={[styles.workspaceCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Ionicons name="cloud-upload-outline" size={26} color="#6D5DFC" style={{ marginBottom: 8 }} />
            <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Upload Court Pleadings</Text>
            <Text style={[styles.cardDesc, { color: theme.textSecondary }]}>
              Analyze PDFs, ZIP files, or DOCX formats to extract fact issues and formulate opponent defences.
            </Text>
            <TouchableOpacity style={styles.cardBtn} onPress={() => setIsUploadOpen(true)}>
              <Text style={styles.cardBtnText}>Upload Documents</Text>
            </TouchableOpacity>
          </View>

          {/* Card 3: Manual Strategy form */}
          <View style={[styles.workspaceCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Ionicons name="create-outline" size={26} color="#6D5DFC" style={{ marginBottom: 8 }} />
            <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Manual Strategy Registry</Text>
            <Text style={[styles.cardDesc, { color: theme.textSecondary }]}>
              Configure your claims, defence strategies, court levels, and litigation objectives manually.
            </Text>
            <TouchableOpacity style={styles.cardBtn} onPress={() => setIsManualFormOpen(true)}>
              <Text style={styles.cardBtnText}>Write Facts Manually</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* STEP 3: AI Processing loading */}
      {step === 'ANALYZING' && (
        <View style={[styles.analyzingWrapper, { backgroundColor: theme.background }]}>
          <View style={[styles.analyzingBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <ActivityIndicator size="large" color="#6D5DFC" style={{ marginBottom: 16 }} />
            <Text style={[styles.sectionTitle, { color: theme.textPrimary, textAlign: 'center' }]}>Synthesizing Litigation Strategies</Text>
            <Text style={[styles.sectionDesc, { color: theme.textSecondary, textAlign: 'center', marginBottom: 20 }]}>
              Mapping opponent counter strategies, running admissibility metrics, and planning timelines.
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

            {/* Checklist progress */}
            <ScrollView style={styles.stepsList} contentContainerStyle={{ gap: 10 }}>
              {PROCESSING_STEPS.map((text, idx) => {
                const isPassed = idx < currentStepIdx;
                const isActive = idx === currentStepIdx;
                return (
                  <View key={text} style={styles.stepRow}>
                    {isPassed ? (
                      <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                    ) : isActive ? (
                      <ActivityIndicator size="small" color="#6D5DFC" />
                    ) : (
                      <Ionicons name="ellipse-outline" size={18} color={theme.textMuted} />
                    )}
                    <Text
                      style={[
                        styles.stepRowText,
                        { color: isPassed ? theme.textPrimary : isActive ? '#6D5DFC' : theme.textSecondary },
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

      {/* STEP 4: Executive Strategy Dashboard & Sticky Tabs */}
      {step === 'INTELLIGENCE' && (
        <View style={{ flex: 1 }}>
          
          {/* Compact Litigation Command Center Header */}
          <View style={[styles.readinessHeader, { backgroundColor: theme.surface, borderBottomColor: theme.border, padding: 14 }]}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View style={{ flex: 1.2 }}>
                <Text style={{ fontSize: 10, fontWeight: "800", color: theme.textSecondary, textTransform: "uppercase" }}>Litigation Readiness</Text>
                <Text style={{ fontSize: 24, fontWeight: "900", color: "#8A5CF5", marginTop: 2 }}>82%</Text>
              </View>
              <View style={{ height: 28, width: 1, backgroundColor: theme.border }} />
              <View style={{ flex: 1, alignItems: "center" }}>
                <Text style={{ fontSize: 10, fontWeight: "800", color: theme.textSecondary, textTransform: "uppercase" }}>Current Stage</Text>
                <Text style={{ fontSize: 13, fontWeight: "800", color: theme.textPrimary, marginTop: 2 }}>Pre Trial</Text>
              </View>
              <View style={{ height: 28, width: 1, backgroundColor: theme.border }} />
              <View style={{ flex: 1, alignItems: "center" }}>
                <Text style={{ fontSize: 10, fontWeight: "800", color: theme.textSecondary, textTransform: "uppercase" }}>Strategy Status</Text>
                <View style={{ backgroundColor: "rgba(16, 185, 129, 0.1)", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 2 }}>
                  <Text style={{ fontSize: 9, fontWeight: "800", color: "#10B981" }}>Strong</Text>
                </View>
              </View>
              <View style={{ height: 28, width: 1, backgroundColor: theme.border }} />
              <View style={{ flex: 1.2, alignItems: "flex-end" }}>
                <Text style={{ fontSize: 10, fontWeight: "800", color: theme.textSecondary, textTransform: "uppercase" }}>Next Milestone</Text>
                <Text style={{ fontSize: 10, fontWeight: "700", color: "#F59E0B", marginTop: 2, textAlign: "right" }} numberOfLines={1}>File WS</Text>
              </View>
            </View>

            {/* Horizontal Litigation Stage Tracker */}
            <View style={{ borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 10, marginTop: 10 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                {[
                  { name: "Investig.", status: "Completed", color: "#10B981" },
                  { name: "Notice", status: "Completed", color: "#10B981" },
                  { name: "Reply", status: "Current", color: "#8A5CF5" },
                  { name: "Evidence", status: "Pending", color: theme.textSecondary },
                  { name: "Arguments", status: "Upcoming", color: theme.textSecondary },
                  { name: "Judgment", status: "Future", color: theme.textSecondary },
                ].map((stg, sIdx) => (
                  <React.Fragment key={sIdx}>
                    <View style={{ alignItems: "center", flex: 1 }}>
                      <Text style={{ fontSize: 9, fontWeight: "800", color: stg.color === "#8A5CF5" ? "#8A5CF5" : theme.textPrimary }} numberOfLines={1}>{stg.name}</Text>
                      <Text style={{ fontSize: 8, color: stg.color, marginTop: 1, fontWeight: "700" }}>{stg.status}</Text>
                    </View>
                    {sIdx < 5 && <Ionicons name="chevron-forward" size={10} color={theme.border} style={{ marginHorizontal: 1 }} />}
                  </React.Fragment>
                ))}
              </View>
            </View>
          </View>

          {/* Unique Visual Identity Tab Selector bar */}
          <View style={[styles.tabBar, { borderBottomColor: theme.border, backgroundColor: theme.surface, height: 48 }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ alignItems: "center", paddingHorizontal: 8 }}>
              {[
                { id: "overview", label: "Overview", icon: "compass-outline", color: "#8A5CF5" },
                { id: "opponent", label: "Opponent", icon: "shield-half-outline", color: "#EF4444" },
                { id: "evidence", label: "Evidence", icon: "folder-open-outline", color: "#3B82F6" },
                { id: "arguments", label: "Arguments", icon: "hammer-outline", color: "#F97316" },
                { id: "risk", label: "Risk", icon: "warning-outline", color: "#EF4444" },
                { id: "roadmap", label: "Roadmap", icon: "trail-sign-outline", color: "#10B981" },
                { id: "reports", label: "Reports", icon: "document-text-outline", color: "#6366F1" },
              ].map(tab => (
                <TouchableOpacity
                  key={tab.id}
                  style={[
                    styles.tabBtn,
                    { paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 2, borderBottomColor: "transparent", marginRight: 8, flexDirection: "row", alignItems: "center", gap: 4 },
                    activeTab === tab.id && { borderBottomColor: tab.color }
                  ]}
                  onPress={() => setActiveTab(tab.id as any)}
                >
                  <Ionicons name={tab.icon as any} size={14} color={activeTab === tab.id ? tab.color : theme.textSecondary} />
                  <Text style={{ fontSize: 13, fontWeight: "700", color: activeTab === tab.id ? tab.color : theme.textSecondary }}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Scrollable Tab Contents */}
          <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
            
            {/* OVERVIEW TAB (Deep Purple theme) */}
            {activeTab === "overview" && (
              <View style={{ gap: 14 }}>
                <View style={[styles.verdictBox, { backgroundColor: "rgba(138, 92, 245, 0.05)", borderColor: "rgba(138, 92, 245, 0.2)", borderWidth: 1 }]}>
                  <Text style={{ fontSize: 11, fontWeight: "900", color: "#8A5CF5", textTransform: "uppercase", marginBottom: 4 }}>Litigation War Room Overview</Text>
                  <Text style={{ fontSize: 12.5, color: theme.textSecondary, lineHeight: 18 }}>
                    The litigation position is robust based on estoppel precedents. Immediate focus is on securing interim relief application logs and mapping key witness statement consistency rates.
                  </Text>
                </View>

                {OVERVIEW_DATA.map(item => {
                  const isOpen = expandedOverview[item.key];
                  const priorityText = item.key === "summary" || item.key === "next_action" ? "Critical" : "High Priority";
                  const statusText = item.key === "summary" ? "Ready" : item.key === "next_action" ? "Draft Required" : "Court Ready";
                  return (
                    <View key={item.key} style={[styles.accordion, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                      <TouchableOpacity style={styles.accordionHeader} onPress={() => toggleOverview(item.key)}>
                        <Ionicons name="compass" size={18} color="#8A5CF5" style={{ marginRight: 6 }} />
                        <Text style={[styles.accordionTitleText, { color: theme.textPrimary, flex: 1 }]} numberOfLines={1}>{item.title}</Text>
                        <View style={{ backgroundColor: priorityText === "Critical" ? "#FEF2F2" : "#F5F3FF", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginRight: 6 }}>
                          <Text style={{ fontSize: 9, fontWeight: "800", color: priorityText === "Critical" ? "#EF4444" : "#8A5CF5" }}>{priorityText}</Text>
                        </View>
                        <Ionicons name={isOpen ? "chevron-up" : "chevron-down"} size={16} color={theme.textSecondary} />
                      </TouchableOpacity>

                      {isOpen && (
                        <View style={{ borderTopWidth: 1, borderTopColor: theme.border, padding: 12, gap: 10 }}>
                          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                            <View style={{ backgroundColor: "#F0FDF4", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}><Text style={{ fontSize: 9, fontWeight: "800", color: "#10B981" }}>Status: {statusText}</Text></View>
                            <Text style={{ fontSize: 10, color: theme.textSecondary }}>Court Importance: High</Text>
                          </View>

                          <View style={{ gap: 2 }}>
                            <Text style={{ fontSize: 11, fontWeight: "800", color: "#8A5CF5", textTransform: "uppercase" }}>Strategy Brief</Text>
                            <Text style={{ fontSize: 12.5, color: theme.textPrimary, lineHeight: 17 }}>{item.summary}</Text>
                          </View>
                          
                          <View style={{ gap: 2 }}>
                            <Text style={{ fontSize: 11, fontWeight: "800", color: "#8A5CF5", textTransform: "uppercase" }}>Legal Reference</Text>
                            <Text style={{ fontSize: 12, color: theme.textSecondary, fontWeight: "700" }}>{item.law}</Text>
                          </View>

                          {item.precedents && (
                            <View style={{ gap: 2 }}>
                              <Text style={{ fontSize: 11, fontWeight: "800", color: theme.textSecondary, textTransform: "uppercase" }}>Precedents</Text>
                              <Text style={{ fontSize: 11.5, color: theme.textPrimary }}>• {item.precedents}</Text>
                            </View>
                          )}

                          {item.risks && (
                            <View style={{ gap: 2 }}>
                              <Text style={{ fontSize: 11, fontWeight: "800", color: "#EF4444", textTransform: "uppercase" }}>Estimated Risk Impact</Text>
                              <Text style={{ fontSize: 11.5, color: "#DC2626" }}>• {item.risks}</Text>
                            </View>
                          )}

                          {item.action && (
                            <View style={{ backgroundColor: "#FFFBEB", borderWidth: 1, borderColor: "#FDE68A", borderRadius: 8, padding: 8, marginTop: 4 }}>
                              <Text style={{ fontSize: 10, fontWeight: "800", color: "#D97706", textTransform: "uppercase", marginBottom: 2 }}>Recommended Next Action</Text>
                              <Text style={{ fontSize: 11.5, color: "#B45309", fontWeight: "700" }}>{item.action}</Text>
                            </View>
                          )}

                          {renderCardActions(item, "overview")}
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}

            {/* OPPONENT TAB (Red / Shield theme) */}
            {activeTab === "opponent" && (
              <View style={{ gap: 14 }}>
                <View style={[styles.verdictBox, { backgroundColor: "rgba(239, 68, 68, 0.05)", borderColor: "rgba(239, 68, 68, 0.2)", borderWidth: 1 }]}>
                  <Text style={{ fontSize: 11, fontWeight: "900", color: "#EF4444", textTransform: "uppercase", marginBottom: 4 }}>Opponent Intelligence Dossier</Text>
                  <Text style={{ fontSize: 12.5, color: theme.textSecondary, lineHeight: 18 }}>
                    Analyzing opposing counsel courtroom style and probable delay tactics. Signatures admission forces a high-rebuttal burden on the defense.
                  </Text>
                </View>

                {OPPONENT_DATA.map(item => {
                  const isOpen = expandedOpponent[item.key];
                  const threatText = item.key === "theory" || item.key === "strong_args" ? "High Threat" : "Vulnerable";
                  return (
                    <View key={item.key} style={[styles.accordion, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                      <TouchableOpacity style={styles.accordionHeader} onPress={() => toggleOpponent(item.key)}>
                        <Ionicons name="shield-half" size={18} color="#EF4444" style={{ marginRight: 6 }} />
                        <Text style={[styles.accordionTitleText, { color: theme.textPrimary, flex: 1 }]} numberOfLines={1}>{item.title}</Text>
                        <View style={{ backgroundColor: threatText === "High Threat" ? "#FEF2F2" : "#ECFDF5", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginRight: 6 }}>
                          <Text style={{ fontSize: 9, fontWeight: "800", color: threatText === "High Threat" ? "#EF4444" : "#10B981" }}>{threatText}</Text>
                        </View>
                        <Ionicons name={isOpen ? "chevron-up" : "chevron-down"} size={16} color={theme.textSecondary} />
                      </TouchableOpacity>

                      {isOpen && (
                        <View style={{ borderTopWidth: 1, borderTopColor: theme.border, padding: 12, gap: 10 }}>
                          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                            <Text style={{ fontSize: 10.5, fontWeight: "800", color: theme.textSecondary }}>Courtroom Style: Aggressive Deflection</Text>
                            <View style={{ backgroundColor: "#FFFBEB", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}><Text style={{ fontSize: 9, fontWeight: "800", color: "#D97706" }}>Needs Review</Text></View>
                          </View>

                          <View style={{ gap: 2 }}>
                            <Text style={{ fontSize: 11, fontWeight: "800", color: "#EF4444", textTransform: "uppercase" }}>Likely Objection Profile</Text>
                            <Text style={{ fontSize: 12.5, color: theme.textPrimary, lineHeight: 17 }}>{item.summary}</Text>
                          </View>

                          <View style={{ gap: 2 }}>
                            <Text style={{ fontSize: 11, fontWeight: "800", color: "#EF4444", textTransform: "uppercase" }}>Defensive Objections & Arguments</Text>
                            <Text style={{ fontSize: 12, color: theme.textSecondary, lineHeight: 16 }}>{item.analysis}</Text>
                          </View>

                          <View style={{ gap: 2 }}>
                            <Text style={{ fontSize: 11, fontWeight: "800", color: theme.textSecondary, textTransform: "uppercase" }}>Applicable Presumption Law</Text>
                            <Text style={{ fontSize: 12, color: theme.textPrimary, fontWeight: "700" }}>{item.law}</Text>
                          </View>

                          {item.precedents && (
                            <View style={{ gap: 2 }}>
                              <Text style={{ fontSize: 11, fontWeight: "800", color: theme.textSecondary, textTransform: "uppercase" }}>Counter Precedents</Text>
                              <Text style={{ fontSize: 11.5, color: theme.textPrimary }}>• {item.precedents}</Text>
                            </View>
                          )}

                          {item.risks && (
                            <View style={{ gap: 2 }}>
                              <Text style={{ fontSize: 11, fontWeight: "800", color: "#EF4444", textTransform: "uppercase" }}>Delay Tactics Threat</Text>
                              <Text style={{ fontSize: 11.5, color: "#DC2626" }}>• {item.risks}</Text>
                            </View>
                          )}

                          {item.action && (
                            <View style={{ backgroundColor: "#FFFBEB", borderWidth: 1, borderColor: "#FDE68A", borderRadius: 8, padding: 8, marginTop: 4 }}>
                              <Text style={{ fontSize: 10, fontWeight: "800", color: "#D97706", textTransform: "uppercase", marginBottom: 2 }}>Counter Strategy Next Action</Text>
                              <Text style={{ fontSize: 11.5, color: "#B45309", fontWeight: "700" }}>{item.action}</Text>
                            </View>
                          )}

                          {renderCardActions(item, "opponent")}
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}

            {/* EVIDENCE TAB (Blue / Folder theme with progress bars) */}
            {activeTab === "evidence" && (
              <View style={{ gap: 14 }}>
                <View style={[styles.verdictBox, { backgroundColor: "rgba(59, 130, 246, 0.05)", borderColor: "rgba(59, 130, 246, 0.2)", borderWidth: 1 }]}>
                  <Text style={{ fontSize: 11, fontWeight: "900", color: "#3B82F6", textTransform: "uppercase", marginBottom: 4 }}>Evidence Map & Gaps Checklist</Text>
                  <Text style={{ fontSize: 12.5, color: theme.textSecondary, lineHeight: 18 }}>
                    Auditing admissibility rates under Indian Evidence Act guidelines. Ensure electronic printouts contain a signed Section 65B affidavit.
                  </Text>
                </View>

                {EVIDENCE_DATA.map(item => {
                  const isOpen = expandedEvidence[item.key];
                  const priorityText = item.key === "strength" || item.key === "missing" ? "Critical" : "High Priority";
                  const reliabilityVal = item.key === "strength" ? 95 : item.key === "priority" ? 90 : item.key === "missing" ? 15 : 30;
                  return (
                    <View key={item.key} style={[styles.accordion, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                      <TouchableOpacity style={styles.accordionHeader} onPress={() => toggleEvidence(item.key)}>
                        <Ionicons name="folder-open" size={18} color="#3B82F6" style={{ marginRight: 6 }} />
                        <Text style={[styles.accordionTitleText, { color: theme.textPrimary, flex: 1 }]} numberOfLines={1}>{item.title}</Text>
                        <View style={{ backgroundColor: reliabilityVal > 80 ? "#ECFDF5" : "#FEF2F2", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginRight: 6 }}>
                          <Text style={{ fontSize: 9, fontWeight: "800", color: reliabilityVal > 80 ? "#10B981" : "#EF4444" }}>{item.score}</Text>
                        </View>
                        <Ionicons name={isOpen ? "chevron-up" : "chevron-down"} size={16} color={theme.textSecondary} />
                      </TouchableOpacity>

                      {isOpen && (
                        <View style={{ borderTopWidth: 1, borderTopColor: theme.border, padding: 12, gap: 10 }}>
                          
                          {/* Evidence Admissibility & Reliability Heat Progress Bar */}
                          <View style={{ marginBottom: 6 }}>
                            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 3 }}>
                              <Text style={{ fontSize: 10.5, fontWeight: "800", color: theme.textSecondary }}>Reliability & Admissibility Index</Text>
                              <Text style={{ fontSize: 10.5, fontWeight: "800", color: reliabilityVal > 80 ? "#10B981" : "#EF4444" }}>{reliabilityVal}%</Text>
                            </View>
                            <View style={{ height: 6, width: "100%", backgroundColor: theme.border, borderRadius: 3, overflow: "hidden" }}>
                              <View style={{ height: "100%", width: `${reliabilityVal}%`, backgroundColor: reliabilityVal > 80 ? "#10B981" : reliabilityVal > 40 ? "#F59E0B" : "#EF4444" }} />
                            </View>
                          </View>

                          <View style={{ gap: 2 }}>
                            <Text style={{ fontSize: 11, fontWeight: "800", color: "#3B82F6", textTransform: "uppercase" }}>Evidence Description</Text>
                            <Text style={{ fontSize: 12.5, color: theme.textPrimary, lineHeight: 17 }}>{item.summary}</Text>
                          </View>

                          <View style={{ gap: 2 }}>
                            <Text style={{ fontSize: 11, fontWeight: "800", color: "#3B82F6", textTransform: "uppercase" }}>AI Admissibility Audit</Text>
                            <Text style={{ fontSize: 12, color: theme.textSecondary, lineHeight: 16 }}>{item.analysis}</Text>
                          </View>

                          <View style={{ gap: 2 }}>
                            <Text style={{ fontSize: 11, fontWeight: "800", color: theme.textSecondary, textTransform: "uppercase" }}>Statutory Backing</Text>
                            <Text style={{ fontSize: 12, color: theme.textPrimary, fontWeight: "700" }}>{item.law}</Text>
                          </View>

                          {item.risks && (
                            <View style={{ gap: 2 }}>
                              <Text style={{ fontSize: 11, fontWeight: "800", color: "#EF4444", textTransform: "uppercase" }}>Collection Gaps & Threat</Text>
                              <Text style={{ fontSize: 11.5, color: "#DC2626" }}>• {item.risks}</Text>
                            </View>
                          )}

                          {item.action && (
                            <View style={{ backgroundColor: "#FFFBEB", borderWidth: 1, borderColor: "#FDE68A", borderRadius: 8, padding: 8, marginTop: 4 }}>
                              <Text style={{ fontSize: 10, fontWeight: "800", color: "#D97706", textTransform: "uppercase", marginBottom: 2 }}>Recommended Collection Action</Text>
                              <Text style={{ fontSize: 11.5, color: "#B45309", fontWeight: "700" }}>{item.action}</Text>
                            </View>
                          )}

                          {renderCardActions(item, "evidence")}
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}

            {/* ARGUMENTS TAB (Orange / Court hammer theme) */}
            {activeTab === "arguments" && (
              <View style={{ gap: 14 }}>
                <View style={[styles.verdictBox, { backgroundColor: "rgba(249, 115, 22, 0.05)", borderColor: "rgba(249, 115, 22, 0.2)", borderWidth: 1 }]}>
                  <Text style={{ fontSize: 11, fontWeight: "900", color: "#F97316", textTransform: "uppercase", marginBottom: 4 }}>Litigation Advocacy Board</Text>
                  <Text style={{ fontSize: 12.5, color: theme.textSecondary, lineHeight: 18 }}>
                    Divide court submissions into strict structured blocks. Make arguments concise and bookmark binding Supreme Court precedents.
                  </Text>
                </View>

                {ARGUMENTS_DATA.map(item => {
                  const isOpen = expandedArguments[item.key];
                  return (
                    <View key={item.key} style={[styles.accordion, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                      <TouchableOpacity style={styles.accordionHeader} onPress={() => toggleArgument(item.key)}>
                        <Ionicons name="hammer" size={18} color="#F97316" style={{ marginRight: 6 }} />
                        <Text style={[styles.accordionTitleText, { color: theme.textPrimary, flex: 1 }]} numberOfLines={1}>{item.title}</Text>
                        <View style={{ backgroundColor: "#FFF7ED", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginRight: 6 }}>
                          <Text style={{ fontSize: 9, fontWeight: "800", color: "#F97316" }}>{item.score}</Text>
                        </View>
                        <Ionicons name={isOpen ? "chevron-up" : "chevron-down"} size={16} color={theme.textSecondary} />
                      </TouchableOpacity>

                      {isOpen && (
                        <View style={{ borderTopWidth: 1, borderTopColor: theme.border, padding: 12, gap: 10 }}>
                          
                          <View style={{ gap: 2 }}>
                            <Text style={{ fontSize: 11, fontWeight: "800", color: "#F97316", textTransform: "uppercase" }}>Supporting Submissions Outline</Text>
                            <Text style={{ fontSize: 12.5, color: theme.textPrimary, lineHeight: 17 }}>{item.summary}</Text>
                          </View>

                          <View style={{ gap: 2 }}>
                            <Text style={{ fontSize: 11, fontWeight: "800", color: "#F97316", textTransform: "uppercase" }}>AI Litigation Strategy Reasoning</Text>
                            <Text style={{ fontSize: 12, color: theme.textSecondary, lineHeight: 16 }}>{item.analysis}</Text>
                          </View>

                          <View style={{ gap: 2 }}>
                            <Text style={{ fontSize: 11, fontWeight: "800", color: theme.textSecondary, textTransform: "uppercase" }}>Primary Statutory Sections</Text>
                            <Text style={{ fontSize: 12, color: theme.textPrimary, fontWeight: "700" }}>{item.law}</Text>
                          </View>

                          {item.precedents && (
                            <View style={{ gap: 2 }}>
                              <Text style={{ fontSize: 11, fontWeight: "800", color: theme.textSecondary, textTransform: "uppercase" }}>Relevant Supreme Court Judgments</Text>
                              <Text style={{ fontSize: 11.5, color: theme.textPrimary, fontWeight: "700" }}>• {item.precedents}</Text>
                            </View>
                          )}

                          {item.action && (
                            <View style={{ backgroundColor: "#FFFBEB", borderWidth: 1, borderColor: "#FDE68A", borderRadius: 8, padding: 8, marginTop: 4 }}>
                              <Text style={{ fontSize: 10, fontWeight: "800", color: "#D97706", textTransform: "uppercase", marginBottom: 2 }}>Advocate Action Checklist</Text>
                              <Text style={{ fontSize: 11.5, color: "#B45309", fontWeight: "700" }}>{item.action}</Text>
                            </View>
                          )}

                          {renderCardActions(item, "arguments")}
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}

            {/* RISK TAB (Red / Heat Map theme) */}
            {activeTab === "risk" && (
              <View style={{ gap: 14 }}>
                <View style={[styles.verdictBox, { backgroundColor: "rgba(239, 68, 68, 0.05)", borderColor: "rgba(239, 68, 68, 0.2)", borderWidth: 1 }]}>
                  <Text style={{ fontSize: 11, fontWeight: "900", color: "#EF4444", textTransform: "uppercase", marginBottom: 4 }}>Litigation Heat Map & Risk Evaluation</Text>
                  <Text style={{ fontSize: 12.5, color: theme.textSecondary, lineHeight: 18 }}>
                    Identifying procedural, witness, and financial vulnerabilities. High heat indicates immediate mitigation actions are required.
                  </Text>
                </View>

                {RISKS_DATA.map(item => {
                  const isOpen = expandedRisks[item.key];
                  const likelihoodText = item.key === "financial" ? "High Likelihood" : "Medium Likelihood";
                  const impactText = item.key === "financial" ? "Critical Impact" : "Moderate Impact";
                  return (
                    <View key={item.key} style={[styles.accordion, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                      <TouchableOpacity style={styles.accordionHeader} onPress={() => toggleRisk(item.key)}>
                        <Ionicons name="warning" size={18} color="#EF4444" style={{ marginRight: 6 }} />
                        <Text style={[styles.accordionTitleText, { color: theme.textPrimary, flex: 1 }]} numberOfLines={1}>{item.title}</Text>
                        <View style={{ backgroundColor: "#FEF2F2", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginRight: 6 }}>
                          <Text style={{ fontSize: 9, fontWeight: "800", color: "#EF4444" }}>{item.score}</Text>
                        </View>
                        <Ionicons name={isOpen ? "chevron-up" : "chevron-down"} size={16} color={theme.textSecondary} />
                      </TouchableOpacity>

                      {isOpen && (
                        <View style={{ borderTopWidth: 1, borderTopColor: theme.border, padding: 12, gap: 10 }}>
                          
                          {/* Heatmap concept indicators */}
                          <View style={{ flexDirection: "row", gap: 8, marginBottom: 4 }}>
                            <View style={{ flex: 1, backgroundColor: "rgba(239, 68, 68, 0.1)", borderRadius: 6, padding: 6, alignItems: "center" }}>
                              <Text style={{ fontSize: 8.5, fontWeight: "800", color: "#EF4444" }}>LIKELIHOOD</Text>
                              <Text style={{ fontSize: 10.5, fontWeight: "700", color: "#DC2626", marginTop: 2 }}>{likelihoodText}</Text>
                            </View>
                            <View style={{ flex: 1, backgroundColor: "rgba(245, 158, 11, 0.1)", borderRadius: 6, padding: 6, alignItems: "center" }}>
                              <Text style={{ fontSize: 8.5, fontWeight: "800", color: "#D97706" }}>IMPACT</Text>
                              <Text style={{ fontSize: 10.5, fontWeight: "700", color: "#B45309", marginTop: 2 }}>{impactText}</Text>
                            </View>
                          </View>

                          <View style={{ gap: 2 }}>
                            <Text style={{ fontSize: 11, fontWeight: "800", color: "#EF4444", textTransform: "uppercase" }}>Risk Vulnerability Description</Text>
                            <Text style={{ fontSize: 12.5, color: theme.textPrimary, lineHeight: 17 }}>{item.summary}</Text>
                          </View>

                          <View style={{ gap: 2 }}>
                            <Text style={{ fontSize: 11, fontWeight: "800", color: theme.textSecondary, textTransform: "uppercase" }}>AI Risk Scenario Impact</Text>
                            <Text style={{ fontSize: 12, color: theme.textSecondary, lineHeight: 16 }}>{item.analysis}</Text>
                          </View>

                          {item.law && (
                            <View style={{ gap: 2 }}>
                              <Text style={{ fontSize: 11, fontWeight: "800", color: theme.textSecondary, textTransform: "uppercase" }}>Statutory Rule Reference</Text>
                              <Text style={{ fontSize: 12, color: theme.textPrimary, fontWeight: "700" }}>{item.law}</Text>
                            </View>
                          )}

                          {item.action && (
                            <View style={{ backgroundColor: "#FFFBEB", borderWidth: 1, borderColor: "#FDE68A", borderRadius: 8, padding: 8, marginTop: 4 }}>
                              <Text style={{ fontSize: 10, fontWeight: "800", color: "#D97706", textTransform: "uppercase", marginBottom: 2 }}>Recommended Mitigation Strategy</Text>
                              <Text style={{ fontSize: 11.5, color: "#B45309", fontWeight: "700" }}>{item.action}</Text>
                            </View>
                          )}

                          {renderCardActions(item, "risk")}
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}

            {/* ROADMAP TAB (Green Timeline theme) */}
            {activeTab === "roadmap" && (
              <View style={{ gap: 14 }}>
                <View style={[styles.verdictBox, { backgroundColor: "rgba(16, 185, 129, 0.05)", borderColor: "rgba(16, 185, 129, 0.2)", borderWidth: 1 }]}>
                  <Text style={{ fontSize: 11, fontWeight: "900", color: "#10B981", textTransform: "uppercase", marginBottom: 4 }}>Litigation War Room Roadmap</Text>
                  <Text style={{ fontSize: 12.5, color: theme.textSecondary, lineHeight: 18 }}>
                    Horizontal stage progress matching current court dates and administrative filings. Expand each node to view required pleadings.
                  </Text>
                </View>

                {ROADMAP_STAGES.map((stepItem, idx) => {
                  const isCurrent = stepItem.status === "CURRENT";
                  const isCompleted = stepItem.status === "COMPLETED";
                  const isOpen = expandedRoadmap[idx];
                  return (
                    <View key={idx} style={[styles.roadmapCard, { borderLeftColor: isCurrent ? "#8A5CF5" : isCompleted ? "#10B981" : theme.border }]}>
                      <TouchableOpacity style={styles.roadmapHeader} onPress={() => toggleRoadmap(idx)}>
                        <Ionicons name="trail-sign" size={18} color="#10B981" style={{ marginRight: 6 }} />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.roadmapTitle, { color: theme.textPrimary }]}>{stepItem.stage}</Text>
                          <Text style={{ fontSize: 10, color: isCurrent ? "#8A5CF5" : isCompleted ? "#10B981" : theme.textSecondary, fontWeight: "800" }}>
                            {stepItem.status} • Est: {stepItem.duration}
                          </Text>
                        </View>
                        <Ionicons name={isOpen ? "chevron-up" : "chevron-down"} size={16} color={theme.textSecondary} />
                      </TouchableOpacity>

                      {isOpen && (
                        <View style={[styles.roadmapBody, { gap: 8, padding: 12, backgroundColor: theme.surface }]}>
                          <Text style={{ fontSize: 12, color: theme.textSecondary }}><Text style={{ fontWeight: "700", color: theme.textPrimary }}>⏱️ Expected Duration:</Text> {stepItem.duration}</Text>
                          <Text style={{ fontSize: 12, color: theme.textSecondary }}><Text style={{ fontWeight: "700", color: theme.textPrimary }}>📄 Required Pleadings:</Text> {stepItem.docs}</Text>
                          <Text style={{ fontSize: 12, color: theme.textSecondary }}><Text style={{ fontWeight: "700", color: theme.textPrimary }}>🛡️ AI Advocate Checklist:</Text></Text>
                          <Text style={{ fontSize: 12, color: theme.textSecondary, marginLeft: 8, lineHeight: 17 }}>{stepItem.checklist}</Text>
                          <Text style={{ fontSize: 12, color: theme.textSecondary }}><Text style={{ fontWeight: "700", color: theme.textPrimary }}>⚖️ Venue Desk:</Text> {stepItem.filing}</Text>
                          <Text style={{ fontSize: 12, color: theme.textSecondary }}><Text style={{ fontWeight: "700", color: theme.textPrimary }}>👤 Responsible Officer:</Text> Associate Lead & Client Liaison</Text>

                          {renderCardActions(stepItem, "roadmap")}
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}

            {/* REPORTS TAB (Indigo Document theme) */}
            {activeTab === "reports" && (
              <View style={{ gap: 12 }}>
                <Text style={[styles.sectionHeading, { color: theme.textPrimary }]}>Strategy Briefs & Reports</Text>
                {[
                  { name: "Litigation Strategy Report", status: "Generated", key: "strategy", confidence: "98%", time: "08 Jul 2026 • 1:30 PM", ver: "v1.2" },
                  { name: "Court Prep Brief", status: "Generated", key: "court", confidence: "95%", time: "08 Jul 2026 • 1:31 PM", ver: "v1.0" },
                  { name: "Cross Examination Brief", status: "Generated", key: "cross", confidence: "92%", time: "08 Jul 2026 • 1:35 PM", ver: "v1.1" },
                  { name: "Settlement Plan Brief", status: "Pending", key: "settle", confidence: "88%", time: "Not Generated", ver: "v1.0" },
                ].map(item => (
                  <View key={item.key} style={[styles.reportCardRow, { flexDirection: "column", padding: 12, backgroundColor: theme.surface, borderColor: theme.border, borderRadius: 12, borderWidth: 1.5, gap: 6 }]}>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <Ionicons name="document-text-outline" size={20} color="#6366F1" style={{ marginRight: 8 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.reportCardName, { color: theme.textPrimary, fontWeight: "700" }]}>{item.name}</Text>
                        <View style={{ flexDirection: "row", gap: 6, marginTop: 2 }}>
                          <Text style={{ fontSize: 9.5, color: theme.textSecondary, fontWeight: "700" }}>Ver: {item.ver}</Text>
                          <Text style={{ fontSize: 9.5, color: item.status === "Generated" ? "#10B981" : "#F59E0B", fontWeight: "800" }}>{item.status}</Text>
                        </View>
                      </View>
                    </View>

                    {item.status === "Generated" && (
                      <View style={{ borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 6, gap: 4 }}>
                        <Text style={{ fontSize: 11, color: theme.textSecondary }}>🤖 AI Confidence Score: <Text style={{ fontWeight: "700", color: theme.textPrimary }}>{item.confidence}</Text></Text>
                        <Text style={{ fontSize: 11, color: theme.textSecondary }}>📅 Sync Date: <Text style={{ fontWeight: "700", color: theme.textPrimary }}>{item.time}</Text></Text>

                        {/* Actions */}
                        <View style={{ flexDirection: "row", gap: 8, marginTop: 6 }}>
                          <TouchableOpacity 
                            style={{ flex: 1.5, height: 32, backgroundColor: "#6366F1", borderRadius: 6, alignItems: "center", justifyContent: "center" }}
                            onPress={() => setIsReportViewerOpen(true)}
                          >
                            <Text style={{ color: "#FFFFFF", fontSize: 11, fontWeight: "700" }}>Preview</Text>
                          </TouchableOpacity>
                          <TouchableOpacity 
                            style={{ width: 44, height: 32, borderWidth: 1, borderColor: theme.border, borderRadius: 6, alignItems: "center", justifyContent: "center" }}
                            onPress={() => showToast("success", "Shared", "Shared report link.")}
                          >
                            <Ionicons name="share-social-outline" size={14} color={theme.textPrimary} />
                          </TouchableOpacity>
                          <TouchableOpacity 
                            style={{ width: 44, height: 32, borderWidth: 1, borderColor: theme.border, borderRadius: 6, alignItems: "center", justifyContent: "center" }}
                            onPress={() => showToast("success", "Downloaded", "Downloaded report locally.")}
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
        </View>
      )}

      {/* Existing Case Workspace link bottom sheet selector */}
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
                      <Ionicons name="folder-outline" size={18} color="#6D5DFC" style={{ marginRight: 10 }} />
                      <Text style={[styles.caseItemText, { color: theme.textPrimary }]}>{c.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Upload pleadings modal selection */}
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
                  {MOCK_STRATEGY_DOCS.map((doc) => (
                    <TouchableOpacity
                      key={doc.id}
                      style={[styles.caseItemRow, { borderBottomColor: theme.border }]}
                      onPress={() => {
                        handleSelectDoc(doc.id);
                        setIsUploadOpen(doc.id === 'contract_dispute'); // quick select
                        handleStartAnalysis();
                      }}
                    >
                      <Ionicons name="document-outline" size={18} color="#6D5DFC" style={{ marginRight: 10 }} />
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

      {/* Manual Strategy form popup */}
      <Modal visible={isManualFormOpen} transparent={false} animationType="slide" onRequestClose={() => setIsManualFormOpen(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border, backgroundColor: theme.surface }]}>
            <TouchableOpacity onPress={() => setIsManualFormOpen(false)}>
              <Ionicons name="close" size={24} color={theme.textPrimary} />
            </TouchableOpacity>
            <Text style={[styles.modalHeaderTitle, { color: theme.textPrimary, marginLeft: 10 }]}>Manual Strategy Setup</Text>
          </View>
          <ScrollView contentContainerStyle={styles.scrollBody}>
            <View style={styles.formGroup}>
              <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>Court Jurisdiction</Text>
              <TextInput
                style={[styles.input, { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.surface }]}
                value={manualCourt}
                onChangeText={setManualCourt}
                placeholder="e.g. Bombay High Court"
                placeholderTextColor={theme.placeholder}
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>Case Facts</Text>
              <TextInput
                style={[styles.textArea, { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.surface }]}
                multiline
                numberOfLines={3}
                value={manualFacts}
                onChangeText={setManualFacts}
                placeholder="Facts background..."
                placeholderTextColor={theme.placeholder}
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>Primary Claims</Text>
              <TextInput
                style={[styles.textArea, { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.surface }]}
                multiline
                numberOfLines={2}
                value={manualClaims}
                onChangeText={setManualClaims}
                placeholder="Specific remedies demanded..."
                placeholderTextColor={theme.placeholder}
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>Likely Defence</Text>
              <TextInput
                style={[styles.textArea, { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.surface }]}
                multiline
                numberOfLines={2}
                value={manualDefence}
                onChangeText={setManualDefence}
                placeholder="Opponent anticipated defense..."
                placeholderTextColor={theme.placeholder}
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>Litigation Objective</Text>
              <TextInput
                style={[styles.input, { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.surface }]}
                value={manualObjective}
                onChangeText={setManualObjective}
                placeholder="e.g. stay energy cuts"
                placeholderTextColor={theme.placeholder}
              />
            </View>
            <TouchableOpacity
              style={styles.actionBtnLarge}
              onPress={() => {
                setIsManualFormOpen(false);
                handleStartAnalysis();
              }}
            >
              <Text style={styles.actionBtnLargeText}>Generate Strategy Roadmap</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Strategy Report Viewer Modal */}
      <Modal visible={isReportViewerOpen} transparent={false} animationType="slide" onRequestClose={() => setIsReportViewerOpen(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border, backgroundColor: theme.surface, paddingHorizontal: 16 }]}>
            <TouchableOpacity onPress={() => setIsReportViewerOpen(false)} style={{ padding: 4 }}>
              <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
            </TouchableOpacity>
            <Text style={[styles.modalHeaderTitle, { color: theme.textPrimary, marginLeft: 10, fontWeight: '700' }]}>Strategy Report Preview</Text>
            <TouchableOpacity style={{ marginLeft: 'auto', padding: 4 }} onPress={() => showToast('success', 'Shared', 'Shared report link.')}>
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
                  LITIGATION STRATEGY REPORT
                </Text>
                
                <View style={{ width: '100%', gap: 6 }}>
                  <Text style={{ fontSize: 11, color: '#475569' }}><Text style={{ fontWeight: '800', color: '#1E293B' }}>CASE:</Text> Apex Fabrics Pvt Ltd vs Modern Outfitters</Text>
                  <Text style={{ fontSize: 11, color: '#475569' }}><Text style={{ fontWeight: '800', color: '#1E293B' }}>PREPARED FOR:</Text> Court Preparation</Text>
                  <Text style={{ fontSize: 11, color: '#475569' }}><Text style={{ fontWeight: '800', color: '#1E293B' }}>GENERATED BY:</Text> AI LEGAL Strategy Engine</Text>
                  <Text style={{ fontSize: 11, color: '#475569' }}><Text style={{ fontWeight: '800', color: '#1E293B' }}>GENERATED ON:</Text> 08 July 2026</Text>
                  <Text style={{ fontSize: 11, color: '#475569' }}><Text style={{ fontWeight: '800', color: '#1E293B' }}>AI CONFIDENCE:</Text> 98%</Text>
                </View>
              </View>

              {/* SECTION 1: EXECUTIVE SUMMARY */}
              <View style={{ gap: 8 }}>
                <Text style={{ fontSize: 13, fontWeight: '900', color: '#1E293B', textTransform: 'uppercase', borderBottomWidth: 1, borderBottomColor: '#CBD5E1', paddingBottom: 4 }}>
                  1. Executive Summary
                </Text>
                <Text style={{ fontSize: 12, color: '#334155', lineHeight: 18, textAlign: 'justify' }}>
                  The litigation position is robust based on estoppel precedents. Immediate focus is on securing interim relief application logs and mapping key witness statement consistency rates. The signatures are admitted, automatically shifting the burden of proof to the accused under Section 139. Statutory notice delivered on May 14 was ignored, with no reply registered within the limitation period.
                </Text>
              </View>

              {/* SECTION 2: CASE STRENGTH ANALYSIS */}
              <View style={{ gap: 8 }}>
                <Text style={{ fontSize: 13, fontWeight: '900', color: '#1E293B', textTransform: 'uppercase', borderBottomWidth: 1, borderBottomColor: '#CBD5E1', paddingBottom: 4 }}>
                  2. Case Strength Analysis
                </Text>
                <View style={{ gap: 6 }}>
                  <Text style={{ fontSize: 12, color: '#334155' }}>• <Text style={{ fontWeight: '700' }}>Overall Case Readiness Score:</Text> 88/100</Text>
                  <Text style={{ fontSize: 12, color: '#334155' }}>• <Text style={{ fontWeight: '700' }}>Winning Probability:</Text> 85% based on local court metrics</Text>
                  <Text style={{ fontSize: 12, color: '#334155' }}>• <Text style={{ fontWeight: '700' }}>Evidence Strength:</Text> High (Cheque and bounce memos certified)</Text>
                  <Text style={{ fontSize: 12, color: '#334155' }}>• <Text style={{ fontWeight: '700' }}>Legal Position:</Text> Binding Supreme Court authority holds execution shift</Text>
                  <Text style={{ fontSize: 12, color: '#334155' }}>• <Text style={{ fontWeight: '700' }}>Procedural Readiness:</Text> Full compliance with Chapter XVII NI Act limitation terms</Text>
                  <Text style={{ fontSize: 12, color: '#334155' }}>• <Text style={{ fontWeight: '700' }}>Settlement Probability:</Text> 80% post-interim order issuance</Text>
                </View>
              </View>

              {/* SECTION 3: OPPONENT ANALYSIS */}
              <View style={{ gap: 8 }}>
                <Text style={{ fontSize: 13, fontWeight: '900', color: '#1E293B', textTransform: 'uppercase', borderBottomWidth: 1, borderBottomColor: '#CBD5E1', paddingBottom: 4 }}>
                  3. Opponent Analysis
                </Text>
                <View style={{ gap: 6 }}>
                  <Text style={{ fontSize: 12, color: '#334155' }}>• <Text style={{ fontWeight: '700' }}>Expected Defence Position:</Text> Respondent will claim policy incentives were subject to override provisions, or cheque was security.</Text>
                  <Text style={{ fontSize: 12, color: '#334155' }}>• <Text style={{ fontWeight: '700' }}>Opponent Key Weaknesses:</Text> Defendant admitted signing execution contracts in correspondence dated June 14, 2026.</Text>
                  <Text style={{ fontSize: 12, color: '#334155' }}>• <Text style={{ fontWeight: '700' }}>Expected Procedural Objections:</Text> Secondary screenshot admissibility challenge under Section 65B rules.</Text>
                  <Text style={{ fontSize: 12, color: '#334155' }}>• <Text style={{ fontWeight: '700' }}>Delay Tactics to Watch:</Text> Seeking multiple adjournments during admission hearings stage under change of solicitors.</Text>
                  <Text style={{ fontSize: 12, color: '#334155' }}>• <Text style={{ fontWeight: '700' }}>Counter Opportunities:</Text> Subpoena bank ledger registries showing lack of stop payment requests.</Text>
                </View>
              </View>

              {/* SECTION 4: EVIDENCE REVIEW */}
              <View style={{ gap: 8 }}>
                <Text style={{ fontSize: 13, fontWeight: '900', color: '#1E293B', textTransform: 'uppercase', borderBottomWidth: 1, borderBottomColor: '#CBD5E1', paddingBottom: 4 }}>
                  4. Evidence Review
                </Text>
                <View style={{ gap: 6 }}>
                  <Text style={{ fontSize: 12, color: '#334155' }}>• <Text style={{ fontWeight: '700' }}>Strong Evidence:</Text> Original dishonoured cheque and bank return memo showing insufficient funds.</Text>
                  <Text style={{ fontSize: 12, color: '#334155' }}>• <Text style={{ fontWeight: '700' }}>Missing Evidence:</Text> Postal service speed post tracking receipt logs.</Text>
                  <Text style={{ fontSize: 12, color: '#334155' }}>• <Text style={{ fontWeight: '700' }}>Weak/Challenged Evidence:</Text> Uncertified WhatsApp logs discussing payment extensions.</Text>
                  <Text style={{ fontSize: 12, color: '#334155' }}>• <Text style={{ fontWeight: '700' }}>Additional Evidence Required:</Text> Section 65B certified printouts and accountant ledger statement.</Text>
                </View>
              </View>

              {/* SECTION 5: LEGAL AUTHORITIES */}
              <View style={{ gap: 8 }}>
                <Text style={{ fontSize: 13, fontWeight: '900', color: '#1E293B', textTransform: 'uppercase', borderBottomWidth: 1, borderBottomColor: '#CBD5E1', paddingBottom: 4 }}>
                  5. Legal Authorities & Precedents
                </Text>
                <View style={{ gap: 6 }}>
                  <Text style={{ fontSize: 12, color: '#334155' }}>• <Text style={{ fontWeight: '700' }}>Applicable Sections:</Text> Section 138, Section 139, Section 143A, Section 147.</Text>
                  <Text style={{ fontSize: 12, color: '#334155' }}>• <Text style={{ fontWeight: '700' }}>Applicable Acts:</Text> Negotiable Instruments Act, 1881; General Clauses Act, 1897.</Text>
                  <Text style={{ fontSize: 12, color: '#334155' }}>• <Text style={{ fontWeight: '700' }}>Supporting Judgments:</Text> Rangappa v. Sri Mohan (2010), Bir Singh v. Mukesh Kumar (2019).</Text>
                  <Text style={{ fontSize: 12, color: '#334155' }}>• <Text style={{ fontWeight: '700' }}>Key Precedent Ratio:</Text> Signature admission shifts burden of proof to defendant (Rangappa case).</Text>
                </View>
              </View>

              {/* SECTION 6: STRATEGIC RECOMMENDATIONS */}
              <View style={{ gap: 8 }}>
                <Text style={{ fontSize: 13, fontWeight: '900', color: '#1E293B', textTransform: 'uppercase', borderBottomWidth: 1, borderBottomColor: '#CBD5E1', paddingBottom: 4 }}>
                  6. Strategic Recommendations
                </Text>
                <View style={{ gap: 6 }}>
                  <Text style={{ fontSize: 12, color: '#334155' }}>• <Text style={{ fontWeight: '700' }}>Immediate Actions:</Text> Submit Section 143A application for 20% interim compensation award.</Text>
                  <Text style={{ fontSize: 12, color: '#334155' }}>• <Text style={{ fontWeight: '700' }}>Short-Term Plan:</Text> Obtain certified speed post dispatch logs from the post master.</Text>
                  <Text style={{ fontSize: 12, color: '#334155' }}>• <Text style={{ fontWeight: '700' }}>Long-Term Litigation Plan:</Text> Prepare cross-examination notes targeting stop-payment timings.</Text>
                  <Text style={{ fontSize: 12, color: '#334155' }}>• <Text style={{ fontWeight: '700' }}>Settlement Recommendation:</Text> Refuse compounding settlement requests below 85% of cheque amount.</Text>
                </View>
              </View>

              {/* SECTION 7: RISK MATRIX */}
              <View style={{ gap: 8 }}>
                <Text style={{ fontSize: 13, fontWeight: '900', color: '#1E293B', textTransform: 'uppercase', borderBottomWidth: 1, borderBottomColor: '#CBD5E1', paddingBottom: 4 }}>
                  7. Risk Matrix Analysis
                </Text>
                <View style={{ gap: 6 }}>
                  <Text style={{ fontSize: 12, color: '#334155' }}>• <Text style={{ fontWeight: '700' }}>Financial Risk:</Text> Rejection of stays could allow asset liquidation (Moratorium defense check).</Text>
                  <Text style={{ fontSize: 12, color: '#334155' }}>• <Text style={{ fontWeight: '700' }}>Procedural Risk:</Text> Filing jurisdiction territorial disputes (Dashrath Rathod precedent).</Text>
                  <Text style={{ fontSize: 12, color: '#334155' }}>• <Text style={{ fontWeight: '700' }}>Evidence Risk:</Text> secondary screenshot admissibility challenge under Section 65B.</Text>
                  <Text style={{ fontSize: 12, color: '#334155' }}>• <Text style={{ fontWeight: '700' }}>Witness Risk:</Text> Account book ledger verifying accountant relocation.</Text>
                  <Text style={{ fontSize: 12, color: '#334155' }}>• <Text style={{ fontWeight: '700' }}>Appeal Risk:</Text> Statutory appeal deposit requirements (Deswal decision).</Text>
                </View>
              </View>

              {/* SECTION 8: NEXT STEPS CHECKLIST */}
              <View style={{ gap: 8 }}>
                <Text style={{ fontSize: 13, fontWeight: '900', color: '#1E293B', textTransform: 'uppercase', borderBottomWidth: 1, borderBottomColor: '#CBD5E1', paddingBottom: 4 }}>
                  8. Next Steps & Checklist
                </Text>
                <View style={{ gap: 6 }}>
                  <Text style={{ fontSize: 12, color: '#334155' }}>1. Tender original cheque and bounce memo in court custody ledger files.</Text>
                  <Text style={{ fontSize: 12, color: '#334155' }}>2. Dispatch subpoena requesting Bank statement ledger logs from HDFC branch.</Text>
                  <Text style={{ fontSize: 12, color: '#334155' }}>3. Prepare signed Section 65B affidavit matching screenshot logs.</Text>
                </View>
              </View>

              {/* Document Divider */}
              <View style={{ borderTopWidth: 2, borderTopColor: '#1E293B', marginTop: 12, paddingTop: 12, alignItems: 'center', gap: 4 }}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#1E293B' }}>CONFIDENTIAL • WORK PRODUCT</Text>
                <Text style={{ fontSize: 10, color: '#64748B', textAlign: 'center' }}>
                  Generated by AI LEGAL Strategy Engine • Prepared for legal assistance only. Review before court submission.
                </Text>
              </View>
            </View>
            
            {/* Export Buttons */}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16, marginBottom: 24 }}>
              <TouchableOpacity 
                style={{ flex: 1, height: 44, backgroundColor: '#1E293B', borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }} 
                onPress={() => showToast('success', 'Export PDF', 'Report exported as PDF.')}
              >
                <Ionicons name="document-text-outline" size={16} color="#FFFFFF" />
                <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>Export PDF</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={{ flex: 1, height: 44, backgroundColor: '#1E293B', borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }} 
                onPress={() => showToast('success', 'Export DOCX', 'Report exported as DOCX.')}
              >
                <Ionicons name="document-outline" size={16} color="#FFFFFF" />
                <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>Export DOCX</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ===== Strategy Engine Copilot Full-Screen Modal ===== */}
      <Modal
        visible={isAiAssistantOpen}
        animationType="slide"
        onRequestClose={() => setIsAiAssistantOpen(false)}
        statusBarTranslucent
      >
        <SafeAreaView style={[styles.copilotFullScreen, { backgroundColor: theme.background }]} edges={['top']}>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

            {/* Copilot Header */}
            <View style={[styles.copilotHeader, { borderBottomColor: theme.border, backgroundColor: theme.surface }]}>
              <TouchableOpacity onPress={() => setIsAiAssistantOpen(false)} style={styles.headerBtn}>
                <Ionicons name="arrow-back" size={22} color={theme.textPrimary} />
              </TouchableOpacity>
              <View style={styles.headerTitleContainer}>
                <Text style={[styles.copilotHeaderTitle, { color: theme.textPrimary }]}>Strategy Engine Copilot</Text>
              </View>
              {/* New Chat */}
              <TouchableOpacity style={styles.headerIconBtn} onPress={handleNewChat}>
                <Ionicons name="add" size={22} color={theme.textPrimary} />
              </TouchableOpacity>
              {/* Overflow Menu */}
              <TouchableOpacity style={styles.headerIconBtn} onPress={() => setIsMenuVisible(true)}>
                <Ionicons name="ellipsis-vertical" size={20} color={theme.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Overflow Dropdown Menu */}
            {isMenuVisible && (
              <Modal visible={isMenuVisible} transparent animationType="fade" onRequestClose={() => setIsMenuVisible(false)}>
                <TouchableWithoutFeedback onPress={() => setIsMenuVisible(false)}>
                  <View style={{ flex: 1 }}>
                    <View style={[styles.dropdownMenu, { backgroundColor: theme.surface, borderColor: theme.border, top: insets.top + 56 }]}>
                      <TouchableOpacity style={styles.menuItem} onPress={() => { setIsMenuVisible(false); setIsHistoryOpen(true); }}>
                        <Ionicons name="time-outline" size={16} color={theme.textSecondary} style={{ marginRight: 8 }} />
                        <Text style={[styles.menuItemText, { color: theme.textPrimary }]}>History</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.menuItem} onPress={() => { setIsMenuVisible(false); handleExportChat(); }} disabled={!activeSession}>
                        <Ionicons name="share-outline" size={16} color={theme.textSecondary} style={{ marginRight: 8 }} />
                        <Text style={[styles.menuItemText, { color: theme.textPrimary, opacity: activeSession ? 1 : 0.5 }]}>Export Chat</Text>
                      </TouchableOpacity>
                      <View style={[styles.menuDivider, { backgroundColor: theme.border }]} />
                      <TouchableOpacity style={styles.menuItem} onPress={() => { setIsMenuVisible(false); handleClearPress(); }} disabled={!activeSession}>
                        <Ionicons name="trash-outline" size={16} color="#EF4444" style={{ marginRight: 8 }} />
                        <Text style={[styles.menuItemText, { color: '#EF4444', opacity: activeSession ? 1 : 0.5, fontWeight: '700' }]}>Clear Conversation</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableWithoutFeedback>
              </Modal>
            )}

            {/* Chat Messages ScrollView */}
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
                  if (!isUser && !msg.content.trim()) return null;

                  if (isUser) {
                    return (
                      <View key={msg.id || idx} style={[styles.chatBubbleContainer, { alignItems: 'flex-end' }]}>
                        <View style={[styles.chatBubble, styles.userBubble, { maxWidth: '75%' }]}>
                          <Text style={styles.userBubbleText}>{msg.content}</Text>
                        </View>
                      </View>
                    );
                  }

                  const { cleanedText, suggestions, disclaimer } = parseFollowUpSuggestions(msg.content);

                  return (
                    <View key={msg.id || idx} style={[styles.chatBubbleContainer, styles.aiBubbleAlign, { flexDirection: 'column' }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', width: '100%' }}>
                        <View style={styles.aiAvatar}>
                          <Ionicons name="sparkles" size={11} color="#FFFFFF" />
                        </View>
                        <View style={[styles.chatBubble, styles.aiBubble, { backgroundColor: theme.surfaceVariant }]}>
                          <MarkdownRenderer text={cleanedText} />
                          {disclaimer ? (
                            <View style={styles.disclaimerContainer}>
                              <View style={[styles.disclaimerDivider, { backgroundColor: theme.border }]} />
                              <Text style={[styles.disclaimerText, { color: theme.textSecondary }]}>⚖️ {disclaimer}</Text>
                            </View>
                          ) : null}
                        </View>
                      </View>
                      {/* 2-per-row suggestion chips below the bubble */}
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
                                    style={[styles.bubbleSuggestionChip, { borderColor: '#6D5DFC', backgroundColor: theme.surface }]}
                                    onPress={() => handleSendChat(suggestion)}
                                    disabled={isAiThinking}
                                  >
                                    <Text style={[styles.bubbleSuggestionText, { color: '#6D5DFC' }]} numberOfLines={1} ellipsizeMode="tail">✓ {shortened}</Text>
                                  </TouchableOpacity>
                                );
                              })}
                            {suggestions.length > 4 && !expandedSuggestions[msg.id] && (
                              <TouchableOpacity
                                style={[styles.bubbleSuggestionChip, { borderColor: '#6D5DFC', backgroundColor: theme.surface, borderStyle: 'dashed' }]}
                                onPress={() => toggleExpandSuggestions(msg.id)}
                              >
                                <Text style={[styles.bubbleSuggestionText, { color: '#6D5DFC' }]} numberOfLines={1} ellipsizeMode="tail">+ More Suggestions</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>
                      )}
                    </View>
                  );
                })
              ) : (
                /* Minimal empty state greeting */
                <View style={styles.emptyChatContainer}>
                  <View style={styles.lightweightGreetingContainer}>
                    <Text style={[styles.lightweightGreetingTitle, { color: theme.textPrimary }]}>
                      Hi, I'm your Strategy Engine Copilot.
                    </Text>
                    <View style={{ marginTop: 16, alignSelf: 'flex-start', paddingHorizontal: 12 }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: theme.textSecondary, marginBottom: 8 }}>
                        I can help you with:
                      </Text>
                      {[
                        'Litigation Strategy',
                        'Defence Planning',
                        'Plaintiff Planning',
                        'Courtroom Roadmaps',
                        'Hearing Preparation',
                        'Witness Strategy',
                        'Cross Examination',
                        'Risk Analysis',
                        'Settlement Planning',
                        'Trial Preparation',
                      ].map((bullet) => (
                        <Text key={bullet} style={{ fontSize: 12.5, lineHeight: 22, color: theme.textSecondary, fontWeight: '500' }}>
                          • {bullet}
                        </Text>
                      ))}
                    </View>
                  </View>
                </View>
              )}
              {/* Thinking state */}
              {isAiThinking && (
                <View style={styles.thinkingBubbleContainer}>
                  <View style={styles.aiAvatar}>
                    <Ionicons name="sparkles" size={11} color="#FFFFFF" />
                  </View>
                  <View style={[styles.chatBubble, { backgroundColor: theme.surfaceVariant, paddingVertical: 8, paddingHorizontal: 12, borderTopLeftRadius: 4, alignSelf: 'flex-start' }]}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#6D5DFC' }}>
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
                      <Ionicons name="document-attach" size={14} color="#6D5DFC" />
                      <Text style={[styles.copilotAttachLabel, { color: theme.textPrimary }]} numberOfLines={1}>{a.name}</Text>
                      <TouchableOpacity onPress={() => handleRemoveAttachment(a.name)}>
                        <Ionicons name="close-circle" size={16} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Floating scroll to latest button */}
            {showScrollToLatest && (
              <TouchableOpacity
                style={[styles.floatingScrollBtn, { backgroundColor: theme.surface, borderColor: theme.border, bottom: 90 }]}
                onPress={() => { copilotScrollRef.current?.scrollToEnd({ animated: true }); }}
              >
                <Ionicons name="arrow-down" size={18} color="#6D5DFC" />
              </TouchableOpacity>
            )}

            {/* Input Composer */}
            <View style={[styles.copilotComposerContainer, { borderTopColor: theme.border, backgroundColor: theme.surface, paddingBottom: Platform.OS === 'ios' ? Math.max(insets.bottom, 12) : 12, paddingTop: 8 }]}>
              {isRecording || isTranscribing ? (
                <View style={styles.recordingWrapper}>
                  <TouchableOpacity onPress={cancelRecording} style={styles.voiceControlBtn}>
                    <Ionicons name="close" size={24} color="#EF4444" />
                  </TouchableOpacity>
                  <View style={styles.waveformContainer}>
                    {isTranscribing ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <ActivityIndicator size="small" color="#6D5DFC" />
                        <Text style={{ fontSize: 13, color: '#9CA3AF' }}>Transcribing...</Text>
                      </View>
                    ) : (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: theme.textPrimary }}>
                          {Math.floor(duration / 60).toString().padStart(2, '0')}:{(duration % 60).toString().padStart(2, '0')}
                        </Text>
                        <Text style={{ fontSize: 13, color: '#9CA3AF' }}>Listening...</Text>
                      </View>
                    )}
                  </View>
                  <TouchableOpacity onPress={stopRecording} style={styles.voiceControlBtn}>
                    <Ionicons name="stop-circle" size={28} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.composerInner}>
                  {/* Attach */}
                  <TouchableOpacity onPress={showAttachmentOptions} style={styles.composerActionBtn}>
                    <Ionicons name="add" size={22} color={theme.textSecondary} />
                  </TouchableOpacity>
                  {/* Suggestions */}
                  <TouchableOpacity onPress={() => setIsSuggestionsSheetOpen(true)} style={styles.composerActionBtn}>
                    <Ionicons name="sparkles" size={18} color="#6D5DFC" />
                  </TouchableOpacity>
                  {/* Text Input */}
                  <TextInput
                    style={[styles.composerInput, { color: theme.textPrimary, backgroundColor: theme.surfaceVariant }]}
                    placeholder="Model Strategy, Analyse Risks..."
                    placeholderTextColor={theme.placeholder}
                    value={chatInput}
                    onChangeText={setChatInput}
                    multiline
                    maxLength={2000}
                    editable={!isAiThinking}
                  />
                  {/* Voice */}
                  <TouchableOpacity onPress={() => startRecording(selectedLanguage)} style={styles.composerActionBtn} disabled={isAiThinking}>
                    <Ionicons name="mic" size={20} color={isAiThinking ? theme.textMuted : theme.textSecondary} />
                  </TouchableOpacity>
                  {/* Send / Stop */}
                  {isAiThinking ? (
                    <TouchableOpacity
                      onPress={cancelMessageStream}
                      style={[styles.composerSendBtn, { backgroundColor: '#EF4444' }]}
                    >
                      <Ionicons name="stop" size={16} color="#FFFFFF" />
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      onPress={() => handleSendChat()}
                      style={[styles.composerSendBtn, { backgroundColor: '#6D5DFC' }, (!chatInput.trim() && attachments.length === 0) && { opacity: 0.45 }]}
                      disabled={!chatInput.trim() && attachments.length === 0}
                    >
                      <Ionicons name="send" size={16} color="#FFFFFF" />
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>

          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* History Modal */}
      <Modal visible={isHistoryOpen} transparent animationType="slide" onRequestClose={() => setIsHistoryOpen(false)}>
        <TouchableWithoutFeedback onPress={() => setIsHistoryOpen(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.bottomSheetContainer, { backgroundColor: theme.surface }]}>
                <View style={styles.bottomSheetDragHandle} />
                <View style={styles.bottomSheetHeader}>
                  <Text style={[styles.bottomSheetTitle, { color: theme.textPrimary }]}>Strategy Session History</Text>
                  <TouchableOpacity onPress={() => setIsHistoryOpen(false)}>
                    <Ionicons name="close-circle" size={24} color="#94A3B8" />
                  </TouchableOpacity>
                </View>
                {/* Search */}
                <View style={[styles.historySearchBar, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}>
                  <Ionicons name="search-outline" size={16} color={theme.textSecondary} />
                  <TextInput
                    style={[{ flex: 1, fontSize: 13, color: theme.textPrimary, paddingVertical: 0 }]}
                    placeholder="Search sessions..."
                    placeholderTextColor={theme.placeholder}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                </View>
                <ScrollView style={{ flex: 1 }}>
                  {filteredSessions.map((s) => (
                    <TouchableOpacity
                      key={s.sessionId}
                      style={[styles.historySessionRow, { borderBottomColor: theme.border, backgroundColor: s.sessionId === activeSessionId ? (isDark ? 'rgba(109,93,252,0.12)' : 'rgba(109,93,252,0.06)') : 'transparent' }]}
                      onPress={() => { setActiveSessionId(s.sessionId); setIsHistoryOpen(false); }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: theme.textPrimary }} numberOfLines={1}>{s.title || 'Untitled Session'}</Text>
                        <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 2 }}>
                          {s.messages?.length || 0} messages
                        </Text>
                      </View>
                      <TouchableOpacity onPress={() => handleDeletePress(s.sessionId)} style={{ padding: 6 }}>
                        <Ionicons name="trash-outline" size={16} color="#EF4444" />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))}
                  {filteredSessions.length === 0 && (
                    <Text style={{ color: theme.textSecondary, textAlign: 'center', marginTop: 32, fontSize: 13 }}>No sessions found.</Text>
                  )}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Suggestions Sheet */}
      <Modal visible={isSuggestionsSheetOpen} transparent animationType="slide" onRequestClose={() => setIsSuggestionsSheetOpen(false)}>
        <TouchableWithoutFeedback onPress={() => setIsSuggestionsSheetOpen(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.bottomSheetContainer, { backgroundColor: theme.surface, height: height * 0.65 }]}>
                <View style={styles.bottomSheetDragHandle} />
                <View style={styles.bottomSheetHeader}>
                  <Text style={[styles.bottomSheetTitle, { color: theme.textPrimary }]}>✨ Strategy Suggestions</Text>
                  <TouchableOpacity onPress={() => setIsSuggestionsSheetOpen(false)}>
                    <Ionicons name="close-circle" size={24} color="#94A3B8" />
                  </TouchableOpacity>
                </View>
                <ScrollView showsVerticalScrollIndicator={false}>
                  {Object.entries(STRATEGY_SUGGESTIONS_SHEET).map(([category, items]) => (
                    <View key={category} style={{ marginBottom: 16 }}>
                      <Text style={{ fontSize: 11, fontWeight: '800', color: '#6D5DFC', textTransform: 'uppercase', marginBottom: 8, letterSpacing: 0.6 }}>{category}</Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                        {items.map((item) => (
                          <TouchableOpacity
                            key={item}
                            style={[styles.suggestionChip, { borderColor: theme.border, backgroundColor: theme.surfaceVariant }]}
                            onPress={() => { setChatInput(item); setIsSuggestionsSheetOpen(false); }}
                          >
                            <Text style={{ fontSize: 12, fontWeight: '600', color: theme.textPrimary }}>{item}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  ))}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Attachment bottom sheet */}
      <AttachmentBottomSheet
        visible={isBottomSheetVisible}
        onClose={hideAttachmentOptions}
        onSelectOption={handleSelectOption}
      />

      {/* Camera Modal */}
      {isCameraVisible && (
        <CustomCameraModal
          visible={isCameraVisible}
          onClose={hideCamera}
          onConfirm={handleCameraConfirm}
        />
      )}

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
    readinessHeader: {
      borderBottomWidth: 1,
    },
    actionGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginTop: 8,
    },
    actionChip: {
      width: '49%',
      backgroundColor: 'rgba(109, 93, 252, 0.08)',
      borderColor: 'rgba(109, 93, 252, 0.15)',
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
      color: '#6D5DFC',
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
    successBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
    },
    successBannerText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '800',
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
      backgroundColor: '#6D5DFC',
      borderRadius: 8,
      paddingVertical: 8,
      alignItems: 'center',
    },
    cardBtnText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '800',
    },

    // Step 3: AI Processing screen
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
      backgroundColor: '#6D5DFC',
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

    // Executive Dashboard
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
      borderColor: '#6D5DFC',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 8,
    },
    radialVal: {
      fontSize: 22,
      fontWeight: '900',
      color: '#6D5DFC',
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
      gap: 4,
    },
    kpiRowGrid: {
      flexDirection: 'row',
      gap: 4,
    },
    kpiBox: {
      flex: 1,
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      alignItems: 'center',
    },
    kpiValText: {
      fontSize: 11,
      fontWeight: '800',
    },
    kpiLabelText: {
      fontSize: 9,
      fontWeight: '700',
    },

    // Sticky Tab headers
    tabBar: {
      flexDirection: 'row',
      borderBottomWidth: 1.5,
      height: 44,
    },
    tabBtn: {
      alignItems: 'center',
      justifyContent: 'center',
      borderBottomWidth: 3,
      borderBottomColor: 'transparent',
    },
    tabBtnText: {
      fontSize: 11.5,
      fontWeight: '800',
    },

    // Tab contents
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
      color: '#6D5DFC',
    },

    // Risk indicator
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

    // Roadmap timeline specific styles
    roadmapCard: {
      borderLeftWidth: 3.5,
      paddingLeft: 12,
      paddingVertical: 8,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: '#E2E8F0',
      borderRadius: 8,
      backgroundColor: '#FFFFFF',
    },
    roadmapHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    roadmapTitle: {
      fontSize: 13,
      fontWeight: '800',
    },
    roadmapBody: {
      marginTop: 6,
      borderTopWidth: 1,
      borderTopColor: '#F1F5F9',
      paddingTop: 6,
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
      backgroundColor: 'rgba(109, 93, 252, 0.1)',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
    },
    reportOpenBtnText: {
      fontSize: 11,
      fontWeight: '800',
      color: '#6D5DFC',
    },

    // Floating AI
    floatingAiBtn: {
      position: 'absolute',
      right: 16,
      bottom: 16,
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: '#6D5DFC',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 5,
    },

    // Input forms styles
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
      backgroundColor: '#6D5DFC',
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

    // Report Doc Viewer overlay
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

    // Actions button
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
      color: '#6D5DFC',
    },

    // Drawer chatbot panel
    chatDrawerContainer: {
      width: '100%',
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 16,
      paddingTop: 8,
    },
    chatBubble: {
      padding: 12,
      borderRadius: 12,
      maxWidth: '85%',
      marginVertical: 4,
    },
    userBubble: {
      backgroundColor: '#6D5DFC',
      alignSelf: 'flex-end',
    },
    userBubbleText: {
      fontSize: 12.5,
      color: '#FFFFFF',
      fontWeight: '600',
    },
    aiBubbleText: {
      fontSize: 12.5,
      fontWeight: '600',
    },
    promptBubbleScroll: {
      maxHeight: 40,
      marginBottom: 10,
    },
    promptBubbleScrollContent: {
      gap: 8,
      paddingHorizontal: 4,
      alignItems: 'center',
    },
    promptBubble: {
      borderWidth: 1,
      borderRadius: 14,
      paddingHorizontal: 12,
      paddingVertical: 6,
      justifyContent: 'center',
      alignItems: 'center',
    },
    promptBubbleText: {
      fontSize: 11,
      fontWeight: '700',
    },
    chatComposer: {
      flexDirection: 'row',
      alignItems: 'center',
      height: 44,
      borderRadius: 22,
      paddingHorizontal: 12,
      gap: 8,
    },
    chatComposerInput: {
      flex: 1,
      fontSize: 13,
      paddingVertical: 4,
    },
    chatComposerSendBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
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

    // Bottom sheets Case selector list
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

    // ─── Strategy Engine Copilot Styles ───────────────────────────────────────
    startCopilotBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
    },
    startCopilotText: {
      fontSize: 12,
      fontWeight: '800',
      color: '#6D5DFC',
    },
    copilotFullScreen: {
      flex: 1,
    },
    copilotHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 4,
      paddingVertical: 10,
      borderBottomWidth: 1,
    },
    copilotHeaderTitle: {
      fontSize: 15,
      fontWeight: '800',
    },
    headerIconBtn: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 20,
    },
    dropdownMenu: {
      position: 'absolute',
      right: 12,
      borderWidth: 1,
      borderRadius: 12,
      paddingVertical: 4,
      minWidth: 200,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 12,
      elevation: 8,
      zIndex: 9999,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    menuItemText: {
      fontSize: 13.5,
      fontWeight: '600',
    },
    menuDivider: {
      height: 1,
      marginVertical: 4,
    },
    chatBubbleContainer: {
      marginBottom: 12,
    },
    aiBubbleAlign: {
      alignItems: 'flex-start',
    },
    userBubbleAlign: {
      alignItems: 'flex-end',
    },
    aiAvatar: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: '#6D5DFC',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 8,
      marginTop: 2,
      flexShrink: 0,
    },
    aiBubble: {
      flex: 1,
      borderTopLeftRadius: 4,
      borderTopRightRadius: 16,
      borderBottomLeftRadius: 16,
      borderBottomRightRadius: 16,
      padding: 12,
    },
    thinkingBubbleContainer: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    emptyChatContainer: {
      flex: 1,
      justifyContent: 'center',
      paddingTop: 32,
    },
    lightweightGreetingContainer: {
      alignItems: 'center',
    },
    lightweightGreetingTitle: {
      fontSize: 18,
      fontWeight: '800',
      textAlign: 'center',
      paddingHorizontal: 24,
    },
    disclaimerContainer: {
      marginTop: 10,
    },
    disclaimerDivider: {
      height: 1,
      marginBottom: 6,
    },
    disclaimerText: {
      fontSize: 11,
      fontStyle: 'italic',
      lineHeight: 16,
    },
    bubbleSuggestionsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      gap: 8,
    },
    bubbleSuggestionChip: {
      width: '48%',
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    bubbleSuggestionText: {
      fontSize: 11.5,
      fontWeight: '700',
    },
    copilotAttachmentBar: {
      height: 52,
      borderTopWidth: 1,
      justifyContent: 'center',
    },
    copilotAttachChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
      maxWidth: 160,
    },
    copilotAttachLabel: {
      fontSize: 12,
      fontWeight: '600',
      flex: 1,
    },
    floatingScrollBtn: {
      position: 'absolute',
      right: 16,
      width: 38,
      height: 38,
      borderRadius: 19,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 6,
      elevation: 4,
    },
    copilotComposerContainer: {
      borderTopWidth: 1,
      paddingHorizontal: 12,
    },
    recordingWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 8,
    },
    voiceControlBtn: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    waveformContainer: {
      flex: 1,
      alignItems: 'center',
    },
    composerInner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 6,
    },
    composerActionBtn: {
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
    },
    composerInput: {
      flex: 1,
      fontSize: 14,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      maxHeight: 100,
    },
    composerSendBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    historySearchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
      borderWidth: 1,
      marginBottom: 12,
    },
    historySessionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: 4,
      borderBottomWidth: 1,
    },
    suggestionChip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1,
    },
  });
}
