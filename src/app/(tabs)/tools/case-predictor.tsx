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
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
// @ts-ignore
// eslint-disable-next-line import/no-unresolved
import { Ionicons } from '@expo/vector-icons';
import { useToastContext, useThemeContext } from '@/providers';
import { CaseService } from '@/services/case.service';
import { CaseSummary } from '@/types';

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
const MOCK_PRECEDENTS = [
  {
    case_name: 'Aditya Birla Chemicals v. Union of India',
    court: 'Supreme Court of India',
    year: '2022',
    citation: '2022 SCC Online SC 712',
    ratio: 'Promissory estoppel cannot be pleaded against statutory rates revisions if public interest overrides private contracts.',
    section: 'Indian Contract Act Section 25',
    similarity: 88,
    why: 'Matches dispute facts regarding unilateral energy tariff hikes by state electricity boards.'
  },
  {
    case_name: 'State of Bihar v. Kalyanpur Cement Ltd.',
    court: 'Supreme Court of India',
    year: '2010',
    citation: '(2010) 3 SCC 274',
    ratio: 'Government is bound by promises made in industrial policies to grant exemptions if investments were made relying on them.',
    section: 'Indian Contract Act Section 115',
    similarity: 82,
    why: 'Provides authority for estoppel challenges in corporate infrastructure setups.'
  }
];

export default function CasePredictorScreen() {
  const { showToast } = useToastContext();
  const { theme, isDark } = useThemeContext();
  const styles: any = useMemo(() => getStyles(theme, isDark), [theme, isDark]);
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // Wizard Navigation States
  // 'HOME' -> 'ANALYZING' -> 'INTELLIGENCE'
  const [step, setStep] = useState<'HOME' | 'ANALYZING' | 'INTELLIGENCE'>('HOME');

  // Tabs for STEP 3: Overview, Risk, Strategy, Precedents, Reports
  const [activeTab, setActiveTab] = useState<'overview' | 'risk' | 'strategy' | 'precedents' | 'reports'>('overview');

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

  // Expandable accordions for Tab views
  const [expandedReasons, setExpandedReasons] = useState<Record<number, boolean>>({ 0: true });
  const [expandedRisks, setExpandedRisks] = useState<Record<string, boolean>>({ jur: true });
  const [expandedStrategy, setExpandedStrategy] = useState<Record<string, boolean>>({ court: true });
  const [expandedPrecedents, setExpandedPrecedents] = useState<Record<number, boolean>>({ 0: true });

  // Executive Full Report Modal
  const [isReportViewerOpen, setIsReportViewerOpen] = useState(false);

  // Floating AI Assistant drawer
  const [isAiAssistantOpen, setIsAiAssistantOpen] = useState(false);
  const [sheetSize, setSheetSize] = useState<'collapsed' | 'expanded' | 'full'>('expanded');
  const copilotScrollRef = useRef<ScrollView>(null);
  const [chatInput, setChatInput] = useState('');
  const [chatReplies, setChatReplies] = useState<Array<{ sender: 'user' | 'ai'; text: string }>>([
    { sender: 'ai', text: 'Litigation Intelligence online. Ask me questions regarding the 66% winning forecast or specific witness risk models.' }
  ]);
  const [isAiThinking, setIsAiThinking] = useState(false);

  useEffect(() => {
    if (isAiAssistantOpen) {
      setTimeout(() => {
        copilotScrollRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [isAiAssistantOpen, chatReplies]);

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

  // Toggle helpers
  const toggleReason = (idx: number) => {
    setExpandedReasons(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const toggleRisk = (key: string) => {
    setExpandedRisks(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleStrategy = (key: string) => {
    setExpandedStrategy(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const togglePrecedent = (idx: number) => {
    setExpandedPrecedents(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const handleSendChat = (overrideText?: string) => {
    const textToSend = overrideText || chatInput;
    if (!textToSend.trim()) return;

    const qLower = textToSend.toLowerCase();
    const isStrategyQuery = qLower.includes('strategy') || qLower.includes('argument') || qLower.includes('appeal') || qLower.includes('opponent') || qLower.includes('weakness') || qLower.includes('delay') || qLower.includes('court prep');
    const isContractQuery = qLower.includes('contract') || qLower.includes('clause') || qLower.includes('terms') || qLower.includes('liability') || qLower.includes('indemnity');

    let replyText = "";
    if (isStrategyQuery || isContractQuery) {
      replyText = "I am the Litigation Predictor Copilot. I only answer case outcome predictions, winning probability, risk parameters, and forecast questions. For strategy, please use the Litigation Strategy Copilot. For contracts, please use the Contract Review Copilot.";
    } else {
      if (qLower.includes('why') || qLower.includes('66%') || qLower.includes('win') || qLower.includes('defendant')) {
        replyText = "AI Forecast: The winning probability stands at 66% (Moderate-High). The primary limitation is under-verified WhatsApp screenshot timelines. If we confirm statutory 65B certifications for Cl 8 exhibits, success likelihood climbs to 78%.";
      } else if (qLower.includes('risk') || qLower.includes('witness')) {
        replyText = "AI Forecast: Critical risk identified in Witness Consistency (34% deviation rate due to conflicting dates in FIR). Suggest aligning statements during pre-trial interviews.";
      } else if (qLower.includes('timeline') || qLower.includes('hearings') || qLower.includes('forecast')) {
        replyText = "AI Forecast: Estimated litigation timeline is 18-24 months spanning 12-15 hearings before final arguments registry.";
      } else if (qLower.includes('settlement') || qLower.includes('probability')) {
        replyText = "AI Forecast: Settlement probability is modeled at 42%. Opponent is likely to offer a buyout if stay order is successfully obtained.";
      } else {
        replyText = "AI Forecast: The prediction favors your filing due to binding ratios in Aditya Birla Chemicals (2022) regarding unilateral tariff reviews.";
      }
    }

    setChatReplies(prev => [...prev, { sender: 'user', text: textToSend.trim() }]);
    setChatInput('');
    setIsAiThinking(true);
    Keyboard.dismiss();

    setTimeout(() => {
      setIsAiThinking(false);
      setChatReplies(prev => [...prev, { sender: 'ai', text: replyText }]);
    }, 700);
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
            <Ionicons name="briefcase-outline" size={26} color="#6D5DFC" style={{ marginBottom: 8 }} />
            <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Existing Case Workspace</Text>
            <Text style={[styles.cardDesc, { color: theme.textSecondary }]}>
              Pull case files directly from My Cases to synchronize timelines, parties, and evidence assets.
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
              Drop PDF, DOCX, or ZIP documents to run OCR extraction, issue mapping, and litigation intelligence.
            </Text>
            <TouchableOpacity style={styles.cardBtn} onPress={() => setIsUploadOpen(true)}>
              <Text style={styles.cardBtnText}>Upload Documents</Text>
            </TouchableOpacity>
          </View>

          {/* Card 3: Manual Case Facts */}
          <View style={[styles.workspaceCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Ionicons name="document-text-outline" size={26} color="#6D5DFC" style={{ marginBottom: 8 }} />
            <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Manual Case Facts</Text>
            <Text style={[styles.cardDesc, { color: theme.textSecondary }]}>
              Enter case title, claims, facts, and evidence descriptions manually to calculate outcome predictions.
            </Text>
            <TouchableOpacity style={styles.cardBtn} onPress={() => setIsManualFormOpen(true)}>
              <Text style={styles.cardBtnText}>Write Facts Manually</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      )}

      {/* STEP 2: AI Processing Screen */}
      {step === 'ANALYZING' && (
        <View style={[styles.analyzingWrapper, { backgroundColor: theme.background }]}>
          <View style={[styles.analyzingBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <ActivityIndicator size="large" color="#6D5DFC" style={{ marginBottom: 16 }} />
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

      {/* STEP 3: Executive Forecast Dashboard & Intelligence view */}
      {step === 'INTELLIGENCE' && (
        <View style={{ flex: 1 }}>
          
          {/* Executive Summary stats bar */}
          <View style={[styles.forecastDashboard, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
            <View style={styles.forecastSummaryRow}>
              {/* Radial Probability Circle */}
              <View style={styles.radialCircle}>
                <Text style={styles.radialVal}>66%</Text>
                <Text style={styles.radialLabel}>WINNING PROBABILITY</Text>
              </View>

              {/* Stats KPIs List */}
              <View style={styles.forecastKpis}>
                <View style={[styles.kpiBox, { backgroundColor: theme.surfaceVariant }]}>
                  <Text style={[styles.kpiValText, { color: '#10B981' }]}>High</Text>
                  <Text style={styles.kpiLabelText}>AI Confidence</Text>
                </View>
                <View style={[styles.kpiBox, { backgroundColor: theme.surfaceVariant }]}>
                  <Text style={[styles.kpiValText, { color: '#EF4444' }]}>Medium</Text>
                  <Text style={styles.kpiLabelText}>Overall Risk</Text>
                </View>
                <View style={[styles.kpiBox, { backgroundColor: theme.surfaceVariant }]}>
                  <Text style={[styles.kpiValText, { color: '#6D5DFC' }]}>42%</Text>
                  <Text style={styles.kpiLabelText}>Settlement Prob</Text>
                </View>
              </View>
            </View>

            <View style={styles.durationMetaRow}>
              <Text style={{ fontSize: 11, color: theme.textSecondary }}>
                Est Duration: <Text style={{ color: theme.textPrimary, fontWeight: '800' }}>18–24 Months</Text>
              </Text>
              <Text style={{ fontSize: 11, color: theme.textSecondary }}>
                Est Hearings: <Text style={{ color: theme.textPrimary, fontWeight: '800' }}>12–15 hearings</Text>
              </Text>
            </View>
          </View>

          {/* Sticky Tab Selectors */}
          <View style={[styles.tabBar, { borderBottomColor: theme.border, backgroundColor: theme.surface }]}>
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'risk', label: 'Risk' },
              { id: 'strategy', label: 'Strategy' },
              { id: 'precedents', label: 'Precedents' },
              { id: 'reports', label: 'Reports' },
            ].map(tab => (
              <TouchableOpacity
                key={tab.id}
                style={[styles.tabBtn, activeTab === tab.id && { borderBottomColor: '#6D5DFC' }]}
                onPress={() => setActiveTab(tab.id as any)}
              >
                <Text style={[styles.tabBtnText, { color: activeTab === tab.id ? '#6D5DFC' : theme.textSecondary }]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Tab Contents ScrollView */}
          <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
            
            {/* TAB 1: OVERVIEW */}
            {activeTab === 'overview' && (
              <View style={{ gap: 16 }}>
                <View style={[styles.verdictBox, { backgroundColor: 'rgba(109, 93, 252, 0.06)' }]}>
                  <Text style={[styles.cardTitle, { color: theme.textPrimary, marginBottom: 4 }]}>Judicial AI Reasoning</Text>
                  <Text style={{ fontSize: 12.5, color: theme.textSecondary, lineHeight: 18 }}>
                    "The prediction favors the plaintiff because documentary evidence is strong, limitation is valid, and supporting precedents exist."
                  </Text>
                </View>

                <Text style={[styles.sectionHeading, { color: theme.textPrimary }]}>Top 5 Success Factors</Text>
                {[
                  { title: 'Strong Documentary Evidence', law: 'Indian Evidence Act Sec 61', rate: 94, desc: 'Primary energy agreements executed between complainant and corporate respondent are legally intact.' },
                  { title: 'Admission by Respondent', law: 'Code of Civil Procedure Order 12', rate: 85, desc: 'Respondent admitted execution signatures on correspondence records dated June 14, 2026.' },
                  { title: 'Witness Consistency', law: 'Indian Evidence Act Sec 134', rate: 78, desc: 'Pleadings statements align with ledger audit timestamps.' },
                  { title: 'Binding Supreme Court Judgment', law: 'Constitution of India Art 141', rate: 90, desc: 'Estoppel rulings protect industrial setups from retrospective hikes.' },
                  { title: 'Limitation Period Valid', law: 'Limitation Act Section 3', rate: 95, desc: 'Dispute filing is logged within 3 years of first default notice.' }
                ].map((item, idx) => (
                  <View key={idx} style={[styles.accordion, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    <TouchableOpacity style={styles.accordionHeader} onPress={() => toggleReason(idx)}>
                      <Ionicons name="checkbox" size={16} color="#10B981" style={{ marginRight: 6 }} />
                      <Text style={[styles.accordionTitleText, { color: theme.textPrimary }]} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Ionicons name={expandedReasons[idx] ? 'chevron-up' : 'chevron-down'} size={16} color={theme.textSecondary} />
                    </TouchableOpacity>
                    {expandedReasons[idx] && (
                      <View style={styles.accordionBody}>
                        <View style={styles.infoRow}>
                          <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Applicable Law</Text>
                          <Text style={[styles.infoValue, { color: theme.textPrimary }]}>{item.law}</Text>
                        </View>
                        <View style={styles.infoRow}>
                          <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Confidence Index</Text>
                          <Text style={[styles.infoValue, { color: '#6D5DFC' }]}>{item.rate}%</Text>
                        </View>
                        <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 6, lineHeight: 18 }}>{item.desc}</Text>
                        <View style={styles.clauseBtnRow}>
                          <TouchableOpacity style={styles.clauseActionBtn} onPress={() => Clipboard.setString(item.desc)}><Ionicons name="copy-outline" size={12} color="#6D5DFC" /><Text style={styles.clauseActionBtnText}>Copy</Text></TouchableOpacity>
                          <TouchableOpacity style={styles.clauseActionBtn} onPress={() => showToast('success', 'Shared', 'Factor details shared.')}><Ionicons name="share-outline" size={12} color="#6D5DFC" /><Text style={styles.clauseActionBtnText}>Share</Text></TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}

            {/* TAB 2: RISK ANALYSIS */}
            {activeTab === 'risk' && (
              <View style={{ gap: 16 }}>
                <Text style={[styles.sectionHeading, { color: theme.textPrimary }]}>Risk Heat Map Matrix</Text>
                
                {[
                  { key: 'jur', name: 'Jurisdiction Risk', risk: 'Low', color: '#10B981', desc: 'Case filed in Maharashtra meets pecuniary limits.' },
                  { key: 'ev', name: 'Evidence Risk', risk: 'Medium', color: '#F59E0B', desc: 'Secondary screens screenshots lack 65B certs.' },
                  { key: 'wit', name: 'Witness Risk', risk: 'Critical', color: '#EF4444', desc: 'Cross testimony timeline deviations noted in FIR.' },
                  { key: 'jdg', name: 'Judge Bias Risk', risk: 'Low', color: '#10B981', desc: 'Bench holds standard patterns on contract claims.' },
                  { key: 'appl', name: 'Appeal Likelihood', risk: 'High', color: '#F59E0B', desc: 'High financial stakes suggest respondent will appeal.' },
                ].map((item) => (
                  <View key={item.key} style={[styles.accordion, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    <TouchableOpacity style={styles.accordionHeader} onPress={() => toggleRisk(item.key)}>
                      <View style={[styles.riskDot, { backgroundColor: item.color }]} />
                      <Text style={[styles.accordionTitleText, { color: theme.textPrimary }]} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <View style={[styles.riskLabelBadge, { backgroundColor: item.color + '1C' }]}>
                        <Text style={{ fontSize: 10, fontWeight: '800', color: item.color }}>{item.risk}</Text>
                      </View>
                      <Ionicons name={expandedRisks[item.key] ? 'chevron-up' : 'chevron-down'} size={16} color={theme.textSecondary} style={{ marginLeft: 6 }} />
                    </TouchableOpacity>
                    {expandedRisks[item.key] && (
                      <View style={styles.accordionBody}>
                        <Text style={{ fontSize: 12, color: theme.textSecondary, lineHeight: 18 }}>{item.desc}</Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}

            {/* TAB 3: LITIGATION STRATEGY */}
            {activeTab === 'strategy' && (
              <View style={{ gap: 16 }}>
                <Text style={[styles.sectionHeading, { color: theme.textPrimary }]}>Courtroom & Settlement Strategy</Text>
                
                {[
                  { key: 'court', title: 'Courtroom Arguments to Emphasize', rec: 'Focus on Section 115 promissory estoppel. The defendant made representations in industrial policies and cannot retrospectively alter them after we executed investments.', rate: 84 },
                  { key: 'avoid', title: 'Arguments to Avoid', rec: 'Avoid arguments concerning absolute tortious liability. Keep claims strictly to breach of written contract covenants to ensure quick disposal.', rate: 70 },
                  { key: 'settle', title: 'Settlement Strategy Recommendation', rec: 'If respondent offers 75% payment structure in early hearings, settlement is recommended due to appellate delay risks (up to 4 years in high courts).', rate: 75 },
                  { key: 'cross', title: 'Witness Cross Examination Guide', rec: 'Cross-examine defendant account auditors on admission entries logged in Q1 tax disclosures.', rate: 80 }
                ].map(item => (
                  <View key={item.key} style={[styles.accordion, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    <TouchableOpacity style={styles.accordionHeader} onPress={() => toggleStrategy(item.key)}>
                      <Ionicons name="bulb-outline" size={16} color="#6D5DFC" style={{ marginRight: 6 }} />
                      <Text style={[styles.accordionTitleText, { color: theme.textPrimary }]} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Ionicons name={expandedStrategy[item.key] ? 'chevron-up' : 'chevron-down'} size={16} color={theme.textSecondary} />
                    </TouchableOpacity>
                    {expandedStrategy[item.key] && (
                      <View style={styles.accordionBody}>
                        <Text style={{ fontSize: 12, color: theme.textSecondary, lineHeight: 18 }}>{item.rec}</Text>
                        <View style={styles.infoRow}>
                          <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Success Probability</Text>
                          <Text style={[styles.infoValue, { color: '#6D5DFC' }]}>{item.rate}%</Text>
                        </View>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}

            {/* TAB 4: PRECEDENTS */}
            {activeTab === 'precedents' && (
              <View style={{ gap: 16 }}>
                <Text style={[styles.sectionHeading, { color: theme.textPrimary }]}>Binding & Persuasive precedents</Text>
                
                {MOCK_PRECEDENTS.map((item, idx) => (
                  <View key={idx} style={[styles.accordion, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    <TouchableOpacity style={styles.accordionHeader} onPress={() => togglePrecedent(idx)}>
                      <Ionicons name="ribbon-outline" size={16} color="#6D5DFC" style={{ marginRight: 6 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.precedentTitleText, { color: theme.textPrimary }]} numberOfLines={1}>
                          {item.case_name}
                        </Text>
                        <Text style={{ fontSize: 9.5, color: theme.textSecondary }}>{item.citation} • {item.court}</Text>
                      </View>
                      <Ionicons name={expandedPrecedents[idx] ? 'chevron-up' : 'chevron-down'} size={16} color={theme.textSecondary} />
                    </TouchableOpacity>
                    {expandedPrecedents[idx] && (
                      <View style={styles.accordionBody}>
                        <Text style={{ fontSize: 11.5, fontWeight: '700', color: theme.textPrimary }}>Ratio: {item.ratio}</Text>
                        <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 4 }}>Why Chosen: {item.why}</Text>
                        <View style={styles.clauseBtnRow}>
                          <TouchableOpacity style={styles.clauseActionBtn} onPress={() => Clipboard.setString(item.citation)}><Ionicons name="copy-outline" size={12} color="#6D5DFC" /><Text style={styles.clauseActionBtnText}>Copy Citation</Text></TouchableOpacity>
                          <TouchableOpacity style={styles.clauseActionBtn} onPress={() => showToast('success', 'Precedent Opened', 'Precedent briefs downloaded.')}><Ionicons name="eye-outline" size={12} color="#6D5DFC" /><Text style={styles.clauseActionBtnText}>View Precedent</Text></TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}

            {/* TAB 5: REPORTS */}
            {activeTab === 'reports' && (
              <View style={{ gap: 12 }}>
                <Text style={[styles.sectionHeading, { color: theme.textPrimary }]}>Litigation Forecast Dossiers</Text>
                
                {[
                  { name: 'Litigation Forecast report', status: 'GENERATED', key: 'forecast' },
                  { name: 'Judicial Bench Brief', status: 'GENERATED', key: 'bench' },
                  { name: 'Evidence Audit Dossier', status: 'GENERATED', key: 'audit' },
                  { name: 'Timeline Strategy timeline', status: 'GENERATED', key: 'timeline' },
                  { name: 'Client Readiness Report', status: 'PENDING', key: 'ready' },
                ].map(item => (
                  <View key={item.key} style={[styles.reportCardRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    <Ionicons name="document-text-outline" size={20} color="#6D5DFC" style={{ marginRight: 8 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.reportCardName, { color: theme.textPrimary }]}>{item.name}</Text>
                      <Text style={{ fontSize: 10, color: item.status === 'GENERATED' ? '#10B981' : '#F59E0B', fontWeight: '800' }}>{item.status}</Text>
                    </View>
                    {item.status === 'GENERATED' && (
                      <TouchableOpacity style={styles.reportOpenBtn} onPress={() => setIsReportViewerOpen(true)}>
                        <Text style={styles.reportOpenBtnText}>Open Report</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>
            )}

          </ScrollView>

          {/* Floating AI Assistant Trigger */}
          <TouchableOpacity style={styles.floatingAiBtn} onPress={() => setIsAiAssistantOpen(true)}>
            <Ionicons name="sparkles" size={24} color="#FFFFFF" />
          </TouchableOpacity>
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
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border, backgroundColor: theme.surface }]}>
            <TouchableOpacity onPress={() => setIsReportViewerOpen(false)}>
              <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
            </TouchableOpacity>
            <Text style={[styles.modalHeaderTitle, { color: theme.textPrimary, marginLeft: 10 }]}>Executive Brief Dossier</Text>
            <TouchableOpacity style={{ marginLeft: 'auto' }} onPress={() => showToast('success', 'Shared', 'PDF brief shared.')}>
              <Ionicons name="share-outline" size={22} color={theme.textPrimary} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.scrollBody}>
            <View style={[styles.reportContentBlock, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.reportHeaderTitle, { color: theme.textPrimary }]}>LITIGATION ANALYSIS REPORT</Text>
              <Text style={{ fontSize: 10, color: theme.textSecondary, marginBottom: 14 }}>Generated by AI LEGAL™ Core Litigation Model</Text>

              <Text style={[styles.reportSectionTitle, { color: theme.textPrimary }]}>1. Forensic Executive Summary</Text>
              <Text style={[styles.reportParaText, { color: theme.textSecondary }]}>
                The forecast indicates a 66% probability of success for the petitioner. Case parameters satisfy Pecuniary limitations under energy policy rules.
              </Text>

              <Text style={[styles.reportSectionTitle, { color: theme.textPrimary, marginTop: 14 }]}>2. Case Facts & Estoppel</Text>
              <Text style={[styles.reportParaText, { color: theme.textSecondary }]}>
                The petitioner executed capital infrastructure investments relying on promise exemptions made in state industrial tariffs dated June 14, 2026.
              </Text>

              <Text style={[styles.reportSectionTitle, { color: theme.textPrimary, marginTop: 14 }]}>3. Precedents</Text>
              <Text style={[styles.reportParaText, { color: theme.textSecondary }]}>
                Binding: *Aditya Birla Chemicals v. UOI (2022)* holding that industrial exemptions are protected under estoppel.
              </Text>
            </View>
            
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <TouchableOpacity style={[styles.footerBtn, { flex: 1 }]} onPress={() => showToast('success', 'Export PDF', 'PDF downloaded.')}>
                <Ionicons name="download-outline" size={16} color="#6D5DFC" style={{ marginRight: 4 }} />
                <Text style={styles.footerBtnText}>Export PDF</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.footerBtn, { flex: 1 }]} onPress={() => showToast('success', 'Export DOCX', 'DOCX downloaded.')}>
                <Ionicons name="document-outline" size={16} color="#6D5DFC" style={{ marginRight: 4 }} />
                <Text style={styles.footerBtnText}>Export DOCX</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Floating AI Assistant Chat drawer */}
      <Modal visible={isAiAssistantOpen} transparent animationType="slide" onRequestClose={() => setIsAiAssistantOpen(false)}>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setIsAiAssistantOpen(false)} />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={[
              styles.chatDrawerContainer, 
              { 
                backgroundColor: theme.surface,
                height: sheetSize === 'collapsed' ? 250 : sheetSize === 'full' ? height * 0.9 : height * 0.6 
              }
            ]}
          >
            <View style={{ flex: 1 }}>
              <Pressable 
                onPress={() => {
                  if (sheetSize === 'collapsed') setSheetSize('expanded');
                  else if (sheetSize === 'expanded') setSheetSize('full');
                  else setSheetSize('collapsed');
                }}
              >
                <View style={styles.bottomSheetDragHandle} />
              </Pressable>
              <View style={styles.bottomSheetHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="sparkles" size={18} color="#8A5CF5" />
                      <Text style={styles.bottomSheetTitle}>Litigation Predictor Copilot</Text>
                    </View>
                    <TouchableOpacity onPress={() => setIsAiAssistantOpen(false)}>
                      <Ionicons name="close-circle" size={24} color="#94A3B8" />
                    </TouchableOpacity>
                  </View>

                  {/* Chat Scroll list */}
                  <ScrollView ref={copilotScrollRef} style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 14 }} showsVerticalScrollIndicator={false}>
                    {chatReplies.map((msg, idx) => (
                      <View key={idx} style={[styles.chatBubble, msg.sender === 'user' ? styles.userBubble : [styles.aiBubble, { backgroundColor: theme.surfaceVariant }]]}>
                        <Text style={msg.sender === 'user' ? styles.userBubbleText : styles.aiBubbleText}>
                          {msg.text
                            .replace(/^AI Strategy Assistant:\s*/i, '')
                            .replace(/^AI Predictor Assistant:\s*/i, '')
                            .replace(/^AI Contract Intelligence:\s*/i, '')
                            .replace(/^AI Forecast:\s*/i, '')
                            .trim()}
                        </Text>
                      </View>
                    ))}
                    {isAiThinking && (
                      <View style={{ alignItems: 'center', marginVertical: 8 }}>
                        <ActivityIndicator size="small" color="#6D5DFC" />
                      </View>
                    )}
                  </ScrollView>

                  {/* Prompt Bubbles */}
                  <View style={styles.promptBubbleScroll}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.promptBubbleScrollContent}>
                      {['Why only 66%?', 'Can defendant win?', 'Explain witness risk', 'Forecast timeline', 'Settlement probability'].map(prompt => (
                        <TouchableOpacity
                          key={prompt}
                          style={[styles.promptBubble, { borderColor: theme.border, backgroundColor: theme.surface }]}
                          onPress={() => handleSendChat(prompt)}
                          disabled={isAiThinking}
                        >
                          <Text style={[styles.promptBubbleText, { color: theme.primary }]}>{prompt}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>

                  {/* Input box */}
                  <View style={[styles.chatComposer, { backgroundColor: theme.surfaceVariant, marginBottom: Platform.OS === 'ios' ? 24 : 10 }]}>
                    <TextInput
                      style={[styles.chatComposerInput, { color: theme.textPrimary }]}
                      placeholder="Ask AI about forecast..."
                      placeholderTextColor={theme.placeholder}
                      value={chatInput}
                      onChangeText={setChatInput}
                      onSubmitEditing={() => handleSendChat()}
                      editable={!isAiThinking}
                    />
                    <TouchableOpacity 
                      style={[
                        styles.chatComposerSendBtn, 
                        { backgroundColor: theme.primary },
                        (!chatInput.trim() || isAiThinking) && { opacity: 0.5 }
                      ]} 
                      onPress={() => handleSendChat()}
                      disabled={!chatInput.trim() || isAiThinking}
                    >
                      <Ionicons name="send" size={14} color="#FFFFFF" />
                    </TouchableOpacity>
            </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

function getStyles(theme: any, isDark: boolean) {
  return StyleSheet.create({
    container: {
      flex: 1,
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
      color: '#6D5DFC',
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
      color: '#6D5DFC',
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
      color: '#6D5DFC',
    },

    // Drawer chatbot modal
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
    aiBubble: {
      backgroundColor: 'rgba(109, 93, 252, 0.08)',
      alignSelf: 'flex-start',
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
