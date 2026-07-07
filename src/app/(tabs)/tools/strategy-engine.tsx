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
const ROADMAP_STAGES = [
  { stage: 'Legal Notice', status: 'COMPLETED', duration: '14 Days', docs: 'Draft Notice copy, delivery confirmation receipts' },
  { stage: 'Dispute Filing', status: 'COMPLETED', duration: '30 Days', docs: 'Suit plaint, court fee stamps registry index' },
  { stage: 'Interim Relief Application', status: 'CURRENT', duration: '45 Days', docs: 'Affidavit in support, injunction notice' },
  { stage: 'Written Statement Reply', status: 'UPCOMING', duration: '90 Days', docs: 'Respondent counter affidavit files' },
  { stage: 'Issues Formulation', status: 'UPCOMING', duration: '120 Days', docs: 'Agreed issues summary sheets' },
  { stage: 'Evidence Trial', status: 'UPCOMING', duration: '180 Days', docs: 'Section 65B certified screenshot logs, witnesses lists' },
  { stage: 'Arguments Hearing', status: 'UPCOMING', duration: '240 Days', docs: 'Written notes of arguments copy' },
  { stage: 'Final Judgment', status: 'UPCOMING', duration: '280 Days', docs: 'Certified copy application' }
];

export default function StrategyEngineScreen() {
  const { showToast } = useToastContext();
  const { theme, isDark } = useThemeContext();
  const styles: any = useMemo(() => getStyles(theme, isDark), [theme, isDark]);
  const insets = useSafeAreaInsets();
  const router = useRouter();

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

  // Floating Ask AI Assistant Chat panel
  const [isAiAssistantOpen, setIsAiAssistantOpen] = useState(false);
  const [sheetSize, setSheetSize] = useState<'collapsed' | 'expanded' | 'full'>('expanded');
  const copilotScrollRef = useRef<ScrollView>(null);
  const [chatInput, setChatInput] = useState('');
  const [chatReplies, setChatReplies] = useState<Array<{ sender: 'user' | 'ai'; text: string }>>([
    { sender: 'ai', text: 'Litigation Strategy Workspace loaded. How can I help refine target arguments or analyze opponent delay tactics?' }
  ]);
  const [isAiThinking, setIsAiThinking] = useState(false);

  useEffect(() => {
    if (isAiAssistantOpen) {
      setTimeout(() => {
        copilotScrollRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [isAiAssistantOpen, chatReplies]);

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

  const handleSendChat = (overrideText?: string) => {
    const textToSend = overrideText || chatInput;
    if (!textToSend.trim()) return;

    const qLower = textToSend.toLowerCase();
    const isPredictorQuery = qLower.includes('66%') || qLower.includes('probability') || qLower.includes('winning') || qLower.includes('forecast') || qLower.includes('model') || qLower.includes('risk rate') || qLower.includes('settlement');
    const isContractQuery = qLower.includes('contract') || qLower.includes('clause') || qLower.includes('terms') || qLower.includes('liability') || qLower.includes('indemnity');

    let replyText = "";
    if (isPredictorQuery || isContractQuery) {
      replyText = "I am the Litigation Strategy Copilot. I only answer litigation strategy, argument builder, and courtroom preparation questions. For case predictions, please use the Litigation Predictor Copilot. For contracts, please use the Contract Review Copilot.";
    } else {
      if (qLower.includes('opponent') || qLower.includes('weakness') || qLower.includes('delay')) {
        replyText = "AI Strategy Assistant: Opponent has severe exposure in Q2 bank transfer reconciliations (they admitted payments in email but claim non-receipt in pleadings). Under CPC Order 12, we should file an immediate application for judgment on admissions.";
      } else if (qLower.includes('argument') || qLower.includes('stronger') || qLower.includes('improve')) {
        replyText = "AI Strategy Assistant: To strengthen arguments, emphasize promissory estoppel regarding the tax incentives policy. Defendant holds retrospective tariff hike limits. Avoid tortious claims.";
      } else if (qLower.includes('appeal') || qLower.includes('court') || qLower.includes('prep')) {
        replyText = "AI Strategy Assistant: Interim injunction relief hearings are upcoming in 45 days. We must compile authenticated timeline records beforehand.";
      } else {
        replyText = "AI Strategy Assistant: Roadmaps suggest interim injunction relief hearings are upcoming in 45 days. We must compile authenticated timeline records beforehand.";
      }
    }

    setChatReplies(prev => [...prev, { sender: 'user', text: textToSend.trim() }]);
    setChatInput('');
    setIsAiThinking(true);
    Keyboard.dismiss();

    setTimeout(() => {
      setIsAiThinking(false);
      setChatReplies(prev => [...prev, { sender: 'ai', text: replyText }]);
    }, 850);
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
          
          {/* Dashboard Header Panel */}
          <View style={[styles.forecastDashboard, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
            <View style={styles.forecastSummaryRow}>
              {/* Radial Strategy Score */}
              <View style={styles.radialCircle}>
                <Text style={styles.radialVal}>82%</Text>
                <Text style={styles.radialLabel}>READINESS SCORE</Text>
              </View>

              {/* Stats KPIs Grid */}
              <View style={styles.forecastKpis}>
                <View style={[styles.kpiRowGrid]}>
                  <View style={[styles.kpiBox, { backgroundColor: theme.surfaceVariant }]}><Text style={[styles.kpiValText, { color: '#10B981' }]}>Strong</Text><Text style={styles.kpiLabelText}>Strategy</Text></View>
                  <View style={[styles.kpiBox, { backgroundColor: theme.surfaceVariant }]}><Text style={[styles.kpiValText, { color: '#10B981' }]}>High</Text><Text style={styles.kpiLabelText}>Evidence</Text></View>
                </View>
                <View style={[styles.kpiRowGrid]}>
                  <View style={[styles.kpiBox, { backgroundColor: theme.surfaceVariant }]}><Text style={[styles.kpiValText, { color: '#6D5DFC' }]}>High</Text><Text style={styles.kpiLabelText}>Confidence</Text></View>
                  <View style={[styles.kpiBox, { backgroundColor: theme.surfaceVariant }]}><Text style={[styles.kpiValText, { color: '#F59E0B' }]}>Moderate</Text><Text style={styles.kpiLabelText}>Settlement</Text></View>
                </View>
                <View style={[styles.kpiRowGrid]}>
                  <View style={[styles.kpiBox, { backgroundColor: theme.surfaceVariant }]}><Text style={[styles.kpiValText, { color: '#EF4444' }]}>Medium</Text><Text style={styles.kpiLabelText}>Risk Level</Text></View>
                  <View style={[styles.kpiBox, { backgroundColor: theme.surfaceVariant }]}><Text style={[styles.kpiValText, { color: theme.textPrimary }]}>18 M</Text><Text style={styles.kpiLabelText}>Est Duration</Text></View>
                </View>
              </View>
            </View>
          </View>

          {/* Sticky Tab Bar */}
          <View style={[styles.tabBar, { borderBottomColor: theme.border, backgroundColor: theme.surface }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ height: '100%' }}>
              {[
                { id: 'overview', label: 'Overview' },
                { id: 'opponent', label: 'Opponent' },
                { id: 'evidence', label: 'Evidence' },
                { id: 'arguments', label: 'Arguments' },
                { id: 'risk', label: 'Risk' },
                { id: 'roadmap', label: 'Roadmap' },
                { id: 'reports', label: 'Reports' },
              ].map(tab => (
                <TouchableOpacity
                  key={tab.id}
                  style={[styles.tabBtn, { paddingHorizontal: 12 }, activeTab === tab.id && { borderBottomColor: '#6D5DFC' }]}
                  onPress={() => setActiveTab(tab.id as any)}
                >
                  <Text style={[styles.tabBtnText, { color: activeTab === tab.id ? '#6D5DFC' : theme.textSecondary }]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Scrollable Tab Contents */}
          <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
            
            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <View style={{ gap: 14 }}>
                <View style={[styles.verdictBox, { backgroundColor: 'rgba(109, 93, 252, 0.06)' }]}>
                  <Text style={[styles.cardTitle, { color: theme.textPrimary, marginBottom: 4 }]}>Executive Strategy Summary</Text>
                  <Text style={{ fontSize: 12.5, color: theme.textSecondary, lineHeight: 18 }}>
                    The litigation position is robust based on estoppel precedents. Immediate focus is on securing interim relief application logs and mapping key witness statement consistency rates.
                  </Text>
                </View>

                <Text style={[styles.sectionHeading, { color: theme.textPrimary }]}>Case Scope Objectives</Text>
                {[
                  { key: 'summary', title: 'Case Readiness Index', desc: 'Active exhibits are registered. Timelines meet statutory filing criteria under Arbitration Acts.' },
                  { key: 'issues', title: 'Key Legal Issues', desc: '1. Promissory estoppel validity against electricity board tariffs.\n2. Retrospective rates recovery limits.' },
                  { key: 'obj', title: 'Case Objectives', desc: 'Secure temporary stay orders on energy supply cuts before main arbitration trial begins.' }
                ].map(item => (
                  <View key={item.key} style={[styles.accordion, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    <TouchableOpacity style={styles.accordionHeader} onPress={() => toggleOverview(item.key)}>
                      <Ionicons name="ribbon-outline" size={16} color="#6D5DFC" style={{ marginRight: 6 }} />
                      <Text style={[styles.accordionTitleText, { color: theme.textPrimary }]}>{item.title}</Text>
                      <Ionicons name={expandedOverview[item.key] ? 'chevron-up' : 'chevron-down'} size={16} color={theme.textSecondary} />
                    </TouchableOpacity>
                    {expandedOverview[item.key] && (
                      <View style={styles.accordionBody}>
                        <Text style={{ fontSize: 12, color: theme.textSecondary, lineHeight: 18 }}>{item.desc}</Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}

            {/* OPPONENT TAB */}
            {activeTab === 'opponent' && (
              <View style={{ gap: 14 }}>
                <Text style={[styles.sectionHeading, { color: theme.textPrimary }]}>Opponent Defence Mapping</Text>
                
                {[
                  { key: 'defence', title: 'Likely Defence Position', desc: 'Respondent will claim policy incentives were subject to absolute public interest override provisions, making promissory estoppel inapplicable.' },
                  { key: 'weakness', title: 'Opponent Key Weaknesses', desc: 'They admitted signing execution contracts in correspondence dated June 14, 2026. This admits liability and estoppel basis.' },
                  { key: 'objections', title: 'Expected Procedural Objections', desc: 'Objection on admissibility of secondary email screenshots lacking signed Section 65B certificates.' },
                  { key: 'delay', title: 'Delay Tactics to Watch', desc: 'Seeking multiple adjournments during admission hearings stage under the guise of solicitor cabinet changes.' }
                ].map(item => (
                  <View key={item.key} style={[styles.accordion, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    <TouchableOpacity style={styles.accordionHeader} onPress={() => toggleOpponent(item.key)}>
                      <Ionicons name="shield-outline" size={16} color="#6D5DFC" style={{ marginRight: 6 }} />
                      <Text style={[styles.accordionTitleText, { color: theme.textPrimary }]}>{item.title}</Text>
                      <Ionicons name={expandedOpponent[item.key] ? 'chevron-up' : 'chevron-down'} size={16} color={theme.textSecondary} />
                    </TouchableOpacity>
                    {expandedOpponent[item.key] && (
                      <View style={styles.accordionBody}>
                        <Text style={{ fontSize: 12, color: theme.textSecondary, lineHeight: 18 }}>{item.desc}</Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}

            {/* EVIDENCE TAB */}
            {activeTab === 'evidence' && (
              <View style={{ gap: 14 }}>
                <Text style={[styles.sectionHeading, { color: theme.textPrimary }]}>Evidence Audit Dashboard</Text>
                
                {[
                  { key: 'strength', title: 'Strong Primary Evidence', desc: 'Ex-1: Registered incentive policy copy with municipal seal.', status: 'Compliant', color: '#10B981' },
                  { key: 'missing', title: 'Missing Documents', desc: 'Original audit ledger logs confirming capital investments receipt.', status: 'Missing', color: '#EF4444' },
                  { key: 'priority', title: 'Priority Evidence Collection', desc: 'Affidavit from accounts director confirming investment costs.', status: 'Pending', color: '#F59E0B' },
                  { key: 'weak', title: 'Weak/Challenged Evidence', desc: 'WhatsApp snapshots between assistant engineers (objection: no certificate).', status: 'High Risk', color: '#EF4444' },
                ].map(item => (
                  <View key={item.key} style={[styles.accordion, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    <TouchableOpacity style={styles.accordionHeader} onPress={() => toggleEvidence(item.key)}>
                      <View style={[styles.riskDot, { backgroundColor: item.color }]} />
                      <Text style={[styles.accordionTitleText, { color: theme.textPrimary }]}>{item.title}</Text>
                      <View style={[styles.riskLabelBadge, { backgroundColor: item.color + '1C' }]}><Text style={{ fontSize: 10, fontWeight: '800', color: item.color }}>{item.status}</Text></View>
                      <Ionicons name={expandedEvidence[item.key] ? 'chevron-up' : 'chevron-down'} size={16} color={theme.textSecondary} style={{ marginLeft: 6 }} />
                    </TouchableOpacity>
                    {expandedEvidence[item.key] && (
                      <View style={styles.accordionBody}>
                        <Text style={{ fontSize: 12, color: theme.textSecondary, lineHeight: 18 }}>{item.desc}</Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}

            {/* ARGUMENTS TAB */}
            {activeTab === 'arguments' && (
              <View style={{ gap: 14 }}>
                <Text style={[styles.sectionHeading, { color: theme.textPrimary }]}>Courtroom Arguments & Prayer</Text>
                
                {[
                  { key: 'primary', title: 'Primary Estoppel Argument', desc: 'The government made explicit policy promises of incentives. Relying on this, petitioner setup factories. They cannot retrospectively cancel exceptions.' },
                  { key: 'avoid', title: 'Arguments to Avoid', desc: 'Avoid absolute damages tort arguments. Restrict pleadings to performance breach bounds.' },
                  { key: 'cross', title: 'Cross Examination Checklist', desc: 'Cross-examine electricity board auditors on correspondence receipts logs.' },
                  { key: 'prayer', title: 'Relief Requested (Prayer)', desc: '1. Injunction restraining board from cuts.\n2. Invalidation of retrospective tariff rates hike notifications.' }
                ].map(item => (
                  <View key={item.key} style={[styles.accordion, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    <TouchableOpacity style={styles.accordionHeader} onPress={() => toggleArgument(item.key)}>
                      <Ionicons name="create-outline" size={16} color="#6D5DFC" style={{ marginRight: 6 }} />
                      <Text style={[styles.accordionTitleText, { color: theme.textPrimary }]} numberOfLines={1}>{item.title}</Text>
                      <Ionicons name={expandedArguments[item.key] ? 'chevron-up' : 'chevron-down'} size={16} color={theme.textSecondary} />
                    </TouchableOpacity>
                    {expandedArguments[item.key] && (
                      <View style={styles.accordionBody}>
                        <Text style={{ fontSize: 12, color: theme.textSecondary, lineHeight: 18 }}>{item.desc}</Text>
                        <View style={styles.clauseBtnRow}>
                          <TouchableOpacity style={styles.clauseActionBtn} onPress={() => Clipboard.setString(item.desc)}><Ionicons name="copy-outline" size={12} color="#6D5DFC" /><Text style={styles.clauseActionBtnText}>Copy</Text></TouchableOpacity>
                          <TouchableOpacity style={styles.clauseActionBtn} onPress={() => showToast('success', 'Shared', 'Argument details shared.')}><Ionicons name="share-outline" size={12} color="#6D5DFC" /><Text style={styles.clauseActionBtnText}>Share</Text></TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}

            {/* RISK TAB */}
            {activeTab === 'risk' && (
              <View style={{ gap: 14 }}>
                <Text style={[styles.sectionHeading, { color: theme.textPrimary }]}>Litigation Risk Matrix</Text>
                
                {[
                  { key: 'overall', title: 'Financial Risk Exposure', desc: 'Risk of retrospective bill rates payment stays rejection. Mitigation: Secure secondary banking guarantees.', rate: 'High', color: '#EF4444' },
                  { key: 'wit', title: 'Witness Risk', desc: 'Witness account records mismatch on investments receipts. Mitigation: Secure certified bank audits.', rate: 'Medium', color: '#F59E0B' },
                  { key: 'procedural', title: 'Procedural Delay Risk', desc: 'Objections to jurisdiction can delay hearings. Mitigation: File in Bombay HC principal bench.', rate: 'Low', color: '#10B981' }
                ].map(item => (
                  <View key={item.key} style={[styles.accordion, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    <TouchableOpacity style={styles.accordionHeader} onPress={() => toggleRisk(item.key)}>
                      <View style={[styles.riskDot, { backgroundColor: item.color }]} />
                      <Text style={[styles.accordionTitleText, { color: theme.textPrimary }]} numberOfLines={1}>{item.title}</Text>
                      <View style={[styles.riskLabelBadge, { backgroundColor: item.color + '1C' }]}><Text style={{ fontSize: 10, fontWeight: '800', color: item.color }}>{item.rate}</Text></View>
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

            {/* ROADMAP TAB */}
            {activeTab === 'roadmap' && (
              <View style={{ gap: 12 }}>
                <Text style={[styles.sectionHeading, { color: theme.textPrimary }]}>Litigation vertical timeline</Text>
                
                {ROADMAP_STAGES.map((stepItem, idx) => {
                  const isCurrent = stepItem.status === 'CURRENT';
                  const isCompleted = stepItem.status === 'COMPLETED';
                  const isOpen = expandedRoadmap[idx];

                  return (
                    <View key={idx} style={[styles.roadmapCard, { borderLeftColor: isCurrent ? '#6D5DFC' : isCompleted ? '#10B981' : theme.border }]}>
                      <TouchableOpacity style={styles.roadmapHeader} onPress={() => toggleRoadmap(idx)}>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.roadmapTitle, { color: theme.textPrimary }]}>{stepItem.stage}</Text>
                          <Text style={{ fontSize: 10, color: isCurrent ? '#6D5DFC' : isCompleted ? '#10B981' : theme.textSecondary, fontWeight: '800' }}>
                            {stepItem.status} • Est: {stepItem.duration}
                          </Text>
                        </View>
                        <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={16} color={theme.textSecondary} />
                      </TouchableOpacity>
                      {isOpen && (
                        <View style={styles.roadmapBody}>
                          <Text style={{ fontSize: 11.5, color: theme.textSecondary }}>Documents: {stepItem.docs}</Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}

            {/* REPORTS TAB */}
            {activeTab === 'reports' && (
              <View style={{ gap: 12 }}>
                <Text style={[styles.sectionHeading, { color: theme.textPrimary }]}>Strategy Briefs & Reports</Text>
                
                {[
                  { name: 'Litigation Strategy Report', status: 'GENERATED', key: 'strategy' },
                  { name: 'Court Prep Brief', status: 'GENERATED', key: 'court' },
                  { name: 'Cross Examination Brief', status: 'GENERATED', key: 'cross' },
                  { name: 'Settlement Plan brief', status: 'PENDING', key: 'settle' },
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

          {/* Floating Ask Strategy AI Button */}
          <TouchableOpacity style={styles.floatingAiBtn} onPress={() => setIsAiAssistantOpen(true)}>
            <Ionicons name="sparkles" size={24} color="#FFFFFF" />
          </TouchableOpacity>
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
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border, backgroundColor: theme.surface }]}>
            <TouchableOpacity onPress={() => setIsReportViewerOpen(false)}>
              <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
            </TouchableOpacity>
            <Text style={[styles.modalHeaderTitle, { color: theme.textPrimary, marginLeft: 10 }]}>Executive Strategy brief</Text>
            <TouchableOpacity style={{ marginLeft: 'auto' }} onPress={() => showToast('success', 'Shared', 'PDF shared.')}>
              <Ionicons name="share-outline" size={22} color={theme.textPrimary} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.scrollBody}>
            <View style={[styles.reportContentBlock, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.reportHeaderTitle, { color: theme.textPrimary }]}>LITIGATION STRATEGY BRIEF</Text>
              <Text style={{ fontSize: 10, color: theme.textSecondary, marginBottom: 14 }}>Prepared for active court hearings</Text>

              <Text style={[styles.reportSectionTitle, { color: theme.textPrimary }]}>1. Executive Summary</Text>
              <Text style={[styles.reportParaText, { color: theme.textSecondary }]}>
                Strategy score is calculated as 82%. Estoppel ratios protect current infrastructure investments.
              </Text>

              <Text style={[styles.reportSectionTitle, { color: theme.textPrimary, marginTop: 14 }]}>2. Opponent Weaknesses</Text>
              <Text style={[styles.reportParaText, { color: theme.textSecondary }]}>
                Admission signatures logged in correspondence records on June 14, 2026 restrict absolute denial defenses.
              </Text>

              <Text style={[styles.reportSectionTitle, { color: theme.textPrimary, marginTop: 14 }]}>3. Settlement Strategy</Text>
              <Text style={[styles.reportParaText, { color: theme.textSecondary }]}>
                Early stay orders stay cuts; if settlement is proposed at 75% valuation, early exit is recommended.
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

      {/* Floating AI Strategy assistant drawer chat */}
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
                      <Text style={styles.bottomSheetTitle}>Litigation Strategy Copilot</Text>
                    </View>
                    <TouchableOpacity onPress={() => setIsAiAssistantOpen(false)}>
                      <Ionicons name="close-circle" size={24} color="#94A3B8" />
                    </TouchableOpacity>
                  </View>

                  {/* Chat dialog Scrollable lists */}
                  <ScrollView ref={copilotScrollRef} style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 14 }} showsVerticalScrollIndicator={false}>
                    {chatReplies.map((msg, idx) => (
                      <View key={idx} style={[styles.chatBubble, msg.sender === 'user' ? styles.userBubble : [styles.aiBubble, { backgroundColor: theme.surfaceVariant }]]}>
                        <Text style={msg.sender === 'user' ? styles.userBubbleText : styles.aiBubbleText}>
                          {msg.text
                            .replace(/^AI Strategy Assistant:\s*/i, '')
                            .replace(/^AI Predictor Assistant:\s*/i, '')
                            .replace(/^AI Contract Intelligence:\s*/i, '')
                            .replace(/^AI LEGAL Strategy Assistant:\s*/i, '')
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

                  {/* Quick Prompts */}
                  <View style={styles.promptBubbleScroll}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.promptBubbleScrollContent}>
                      {['Improve this strategy', 'Suggest stronger arguments', 'Prepare appeal strategy', 'Opponent weaknesses', 'Court preparation'].map(prompt => (
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

                  {/* Chat messenger input */}
                  <View style={[styles.chatComposer, { backgroundColor: theme.surfaceVariant, marginBottom: Platform.OS === 'ios' ? 24 : 10 }]}>
                    <TextInput
                      style={[styles.chatComposerInput, { color: theme.textPrimary }]}
                      placeholder="Ask AI Strategy Engine..."
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
  });
}
