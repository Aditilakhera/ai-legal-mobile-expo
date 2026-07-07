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

// Mock Upload Documents list
const MOCK_CONTRACT_FILES = [
  { id: 'emp', name: 'employment_agreement_draft.pdf', size: '1.2 MB', pages: 8, version: 1, type: 'Employment Agreement' },
  { id: 'nda', name: 'mutual_nda_final.docx', size: '450 KB', pages: 3, version: 2, type: 'NDA' },
  { id: 'lease', name: 'commercial_lease_deed.pdf', size: '2.1 MB', pages: 14, version: 1, type: 'Lease Agreement' },
  { id: 'vendor', name: 'saas_vendor_terms.txt', size: '180 KB', pages: 5, version: 3, type: 'Vendor Agreement' },
];

// Multi-stage extraction progress timeline steps
const PROCESSING_TASKS = [
  { key: 'ocr', label: 'OCR Extraction' },
  { key: 'parse', label: 'Clause Parsing' },
  { key: 'risk', label: 'Risk Analysis' },
  { key: 'comply', label: 'Compliance Check' },
  { key: 'strategy', label: 'Negotiation Strategy' },
  { key: 'opinion', label: 'Legal Opinion' },
];

export default function ContractAnalyzerScreen() {
  const { showToast } = useToastContext();
  const { theme, isDark } = useThemeContext();
  const styles: any = useMemo(() => getStyles(theme, isDark), [theme, isDark]);
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // Wizard / Navigation state
  // 'UPLOAD' -> 'PROCESSING' -> 'REVIEW'
  const [step, setStep] = useState<'UPLOAD' | 'PROCESSING' | 'REVIEW'>('UPLOAD');

  // Selected language: 'EN' | 'HI'
  const [lang, setLang] = useState<'EN' | 'HI'>('EN');

  // Active Linked Case State
  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [linkedCaseId, setLinkedCaseId] = useState<string>('');
  const [isCaseSelectOpen, setIsCaseSelectOpen] = useState(false);

  // Uploaded Contract Files
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);

  // Animated processing tasks
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [taskProgress, setTaskProgress] = useState<Record<string, number>>({
    ocr: 0, parse: 0, risk: 0, comply: 0, strategy: 0, opinion: 0
  });

  // Expandable findings accordion states
  const [expandedFindings, setExpandedFindings] = useState<Record<string, boolean>>({
    critical: true,
  });

  // Expandable Clause intelligence list
  const [expandedClauses, setExpandedClauses] = useState<Record<string, boolean>>({
    liab: true,
  });

  // Interactive AI Assistant chat composer value
  const [isAiAssistantOpen, setIsAiAssistantOpen] = useState(false);
  const [sheetSize, setSheetSize] = useState<'collapsed' | 'expanded' | 'full'>('expanded');
  const copilotScrollRef = useRef<ScrollView>(null);
  const [chatInput, setChatInput] = useState('');
  const [chatReplies, setChatReplies] = useState<Array<{ sender: 'user' | 'ai'; text: string }>>([
    { sender: 'ai', text: 'Contract Review Workspace loaded. Ask me questions about clause details, risks or drafting alternatives.' }
  ]);
  const [isAiThinking, setIsAiThinking] = useState(false);

  useEffect(() => {
    if (isAiAssistantOpen) {
      setTimeout(() => {
        copilotScrollRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [isAiAssistantOpen, chatReplies]);

  // Fetch case lists on mount
  useEffect(() => {
    const loadCases = async () => {
      try {
        const response = await CaseService.listCases();
        const list = Array.isArray(response) ? response : (response?.data || []);
        setCases(list.filter((c: any) => c.isLegalCase));
      } catch (err) {
        console.warn('Failed to load cases:', err);
      }
    };
    loadCases();
  }, []);

  const handleSelectFile = (fileId: string) => {
    setSelectedFileId(fileId);
    setIsUploading(true);
    setUploadProgress(0);
    
    // Simulate upload progress
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsUploading(false);
          showToast('success', 'File Uploaded', `${selectedFile?.name || 'Contract'} uploaded successfully.`);
          return 100;
        }
        return prev + 25;
      });
    }, 200);
  };

  const selectedFile = useMemo(() => {
    return MOCK_CONTRACT_FILES.find(f => f.id === selectedFileId);
  }, [selectedFileId]);

  const linkedCase = useMemo(() => {
    return cases.find(c => c._id === linkedCaseId);
  }, [cases, linkedCaseId]);

  // Start analysis multi-stage loader
  const handleStartAnalysis = () => {
    if (!selectedFileId) {
      showToast('error', 'Upload Required', 'Please select or upload a contract file first.');
      return;
    }
    setStep('PROCESSING');
    setCurrentTaskIndex(0);
    setTaskProgress({ ocr: 0, parse: 0, risk: 0, comply: 0, strategy: 0, opinion: 0 });
    
    // Progress loop for processing tasks
    let taskIndex = 0;
    const taskInterval = setInterval(() => {
      if (taskIndex < PROCESSING_TASKS.length) {
        const currentTask = PROCESSING_TASKS[taskIndex].key;
        
        // Simulating single task loading bar
        let subProgress = 0;
        const subInterval = setInterval(() => {
          subProgress += 20;
          setTaskProgress(prev => ({ ...prev, [currentTask]: subProgress }));
          
          if (subProgress >= 100) {
            clearInterval(subInterval);
            taskIndex += 1;
            setCurrentTaskIndex(taskIndex);
            if (taskIndex === PROCESSING_TASKS.length) {
              clearInterval(taskInterval);
              setStep('REVIEW');
              showToast('success', 'Analysis Completed', 'AI Review Workspace dashboard compiled.');
            }
          }
        }, 100);
      }
    }, 650);
  };

  // Toggle accordions helper
  const toggleFinding = (key: string) => {
    setExpandedFindings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleClause = (key: string) => {
    setExpandedClauses(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Chat input handlers
  const handleSendChat = (overrideText?: string) => {
    const textToSend = overrideText || chatInput;
    if (!textToSend.trim()) return;

    const qLower = textToSend.toLowerCase();
    const isStrategyQuery = qLower.includes('strategy') || qLower.includes('argument') || qLower.includes('appeal') || qLower.includes('opponent') || qLower.includes('weakness') || qLower.includes('delay') || qLower.includes('court prep');
    const isPredictorQuery = qLower.includes('66%') || qLower.includes('probability') || qLower.includes('winning') || qLower.includes('forecast') || qLower.includes('model') || qLower.includes('risk rate') || qLower.includes('settlement');

    let replyText = "";
    if (isStrategyQuery || isPredictorQuery) {
      replyText = "I am the Contract Review Copilot. I only answer contract clauses, critical risks, and drafting rewrite questions. For strategy, please use the Litigation Strategy Copilot. For predictions, please use the Litigation Predictor Copilot.";
    } else {
      if (qLower.includes('hindi')) {
        replyText = "AI Contract Intelligence: (अनुवाद) दायित्व की सीमा 1x अनुबंध मूल्य तक सीमित है। मैं इसे 2x अनुबंध मूल्य तक बढ़ाने की सिफारिश करता हूँ।";
      } else if (qLower.includes('simple english') || qLower.includes('english')) {
        replyText = "AI Contract Intelligence: Clause 7 (Limitation of Liability) caps liability at 1x contract fee. This means if they make a mistake, they only pay back that amount.";
      } else if (qLower.includes('liability') || qLower.includes('limit') || qLower.includes('clause 7')) {
        replyText = "AI Contract Intelligence: Clause 7 (Limitation of Liability) caps liability at 1x contract value. I recommend increasing this limit to 12 months fees or 2x contract value.";
      } else if (qLower.includes('risk') || qLower.includes('highlight')) {
        replyText = "AI Contract Intelligence: Key contract risks: 1. Delaware jurisdiction (highly unfavorable for local dispute resolution). 2. Unilateral termination clause giving client 30-day exit without cause.";
      } else if (qLower.includes('negotiation') || qLower.includes('strategy')) {
        replyText = "AI Contract Intelligence: Negotiation path: 1. Request mutual termination for convenience. 2. Push for local state jurisdiction.";
      } else {
        replyText = "AI Contract Intelligence: I have scanned the contract. I can explain Clause 7 (Limitation of Liability), highlight critical risks, or draft alternative rewrites.";
      }
    }

    setChatReplies(prev => [...prev, { sender: 'user', text: textToSend.trim() }]);
    setChatInput('');
    setIsAiThinking(true);
    Keyboard.dismiss();

    setTimeout(() => {
      setIsAiThinking(false);
      setChatReplies(prev => [...prev, { sender: 'ai', text: replyText }]);
    }, 800);
  };

  const handleAiAction = (action: string) => {
    setIsAiThinking(true);
    setTimeout(() => {
      setIsAiThinking(false);
      let replyText = "";
      switch (action) {
        case 'explain-hindi':
          replyText = "AI अनुबंध विश्लेषण (Hindi Translation):\nइस अनुबंध का मुख्य जोखिम धारा 7 (दायित्व की सीमा) में है, जहां नुकसान की भरपाई केवल 1 महीने के भुगतान तक सीमित है। इसे संशोधित कर 12 महीने करने का सुझाव दिया जाता है।";
          break;
        case 'explain-english':
          replyText = "AI Contract Review (Plain English):\nCl 7 Limitation of Liability limits the vendor liability too aggressively. In plain terms, if they commit a massive data breach or breach of contract, you can only recover a maximum of $1,000 or 1 month of payments.";
          break;
        case 'court-submission':
          replyText = "AI Legal Notice: Drafted formal Legal Notice demanding rectification of unilateral breach of contract under Section 73 & 74 of the Indian Contract Act.";
          break;
        case 'export-pdf':
          showToast('success', 'Export Completed', 'Contract risk analysis report PDF generated.');
          return;
        default:
          replyText = "AI Analysis triggered.";
      }
      setChatReplies(prev => [...prev, { sender: 'ai', text: replyText }]);
    }, 700);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      
      {/* Navigation Header */}
      <View style={[styles.header, { borderBottomColor: theme.border, backgroundColor: theme.surface }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Contract Analyzer</Text>
          <Text style={styles.headerSubtitle}>AI-powered Contract Review & Risk Intelligence</Text>
        </View>

        <View style={styles.headerRightActions}>
          {/* Language Switch */}
          <TouchableOpacity style={[styles.langToggle, { borderColor: theme.border }]} onPress={() => setLang(l => l === 'EN' ? 'HI' : 'EN')}>
            <Text style={styles.langToggleText}>{lang}</Text>
          </TouchableOpacity>
          {/* Audit Timeline */}
          <TouchableOpacity style={styles.headerRightBtn} onPress={() => showToast('info', 'Audit Log', 'Timeline registry shows 4 versions uploaded.')}>
            <Ionicons name="time-outline" size={22} color={theme.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Linked Case selector bar */}
      <View style={[styles.caseSelectorBar, { borderBottomColor: theme.border, backgroundColor: theme.surfaceVariant }]}>
        <Ionicons name="briefcase-outline" size={16} color="#6D5DFC" style={{ marginRight: 6 }} />
        <Text style={[styles.caseSelectorLabel, { color: theme.textSecondary }]}>
          Workspace Case: <Text style={{ color: theme.textPrimary, fontWeight: '800' }}>{linkedCase ? linkedCase.name : 'Independent Review'}</Text>
        </Text>
        <TouchableOpacity style={styles.caseChangeBtn} onPress={() => setIsCaseSelectOpen(true)}>
          <Text style={styles.caseChangeBtnText}>Change</Text>
        </TouchableOpacity>
      </View>

      {/* Main Content Areas */}
      {step === 'UPLOAD' && (
        <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
          
          {/* SECTION 1: Contract Workspace metadata card */}
          <View style={[styles.workspaceCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.cardHeading, { color: theme.textPrimary }]}>Contract Workspace Details</Text>
            {linkedCase ? (
              <View style={styles.metadataList}>
                <View style={styles.metadataRow}><Text style={[styles.metaLabel, { color: theme.textSecondary }]}>Case Name</Text><Text style={[styles.metaVal, { color: theme.textPrimary }]}>{linkedCase.name}</Text></View>
                <View style={styles.metadataRow}><Text style={[styles.metaLabel, { color: theme.textSecondary }]}>Client</Text><Text style={[styles.metaVal, { color: theme.textPrimary }]}>{linkedCase.clientName || 'N/A'}</Text></View>
                <View style={styles.metadataRow}><Text style={[styles.metaLabel, { color: theme.textSecondary }]}>Contract Class</Text><Text style={[styles.metaVal, { color: theme.textPrimary }]}>Commercial Lease / NDA</Text></View>
                <View style={styles.metadataRow}><Text style={[styles.metaLabel, { color: theme.textSecondary }]}>Review Status</Text><Text style={[styles.metaVal, { color: '#6D5DFC', fontWeight: '800' }]}>AWAITING UPLOAD</Text></View>
              </View>
            ) : (
              <View style={{ alignItems: 'center', paddingVertical: 12 }}>
                <Text style={{ fontSize: 13, color: theme.textSecondary, marginBottom: 12 }}>No Case Linked (Independent Review Mode)</Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity style={styles.outlineBtnCompact} onPress={() => setIsCaseSelectOpen(true)}>
                    <Text style={{ color: '#6D5DFC', fontSize: 12, fontWeight: '800' }}>Select Existing Case</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.primaryBtnCompact} onPress={() => {
                    showToast('info', 'Workspace Init', 'Navigate to My Cases to configure detailed fields.');
                  }}>
                    <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>Create New Case</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          {/* SECTION 2: Large Upload Card Container */}
          <View style={[styles.uploadCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Ionicons name="cloud-upload-outline" size={44} color="#6D5DFC" style={{ marginBottom: 10 }} />
            <Text style={[styles.uploadTitle, { color: theme.textPrimary }]}>Upload Contract Document</Text>
            <Text style={{ fontSize: 12, color: theme.textSecondary, textAlign: 'center', marginBottom: 16 }}>
              Supports PDF, DOCX, or direct Camera Scans. Max file size: 15MB.
            </Text>

            {/* Quick Upload list selectors */}
            <View style={{ width: '100%', gap: 8 }}>
              {MOCK_CONTRACT_FILES.map(file => (
                <TouchableOpacity
                  key={file.id}
                  style={[styles.mockFileRow, { borderColor: theme.border }, selectedFileId === file.id && { borderColor: '#6D5DFC', backgroundColor: 'rgba(109, 93, 252, 0.05)' }]}
                  onPress={() => handleSelectFile(file.id)}
                >
                  <Ionicons name="document-text-outline" size={20} color="#6D5DFC" style={{ marginRight: 8 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.fileNameText, { color: theme.textPrimary }]} numberOfLines={1}>{file.name}</Text>
                    <Text style={{ fontSize: 10, color: theme.textSecondary }}>{file.type} • {file.size} • {file.pages} pages</Text>
                  </View>
                  {selectedFileId === file.id ? (
                    <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                  ) : (
                    <Ionicons name="ellipse-outline" size={18} color={theme.textSecondary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {isUploading && (
              <View style={{ width: '100%', marginTop: 16 }}>
                <Text style={{ fontSize: 11, color: theme.textSecondary, marginBottom: 4 }}>Uploading: {uploadProgress}%</Text>
                <View style={[styles.progressBarBg, { backgroundColor: theme.border }]}><View style={[styles.progressBarFill, { width: `${uploadProgress}%` }]} /></View>
              </View>
            )}

            {selectedFile && (
              <View style={[styles.uploadMetaContainer, { backgroundColor: theme.surfaceVariant, marginTop: 14 }]}>
                <View style={styles.metadataRow}><Text style={[styles.metaLabel, { color: theme.textSecondary }]}>OCR Status</Text><Text style={[styles.metaVal, { color: '#10B981', fontWeight: '800' }]}>READY</Text></View>
                <View style={styles.metadataRow}><Text style={[styles.metaLabel, { color: theme.textSecondary }]}>Version Number</Text><Text style={[styles.metaVal, { color: theme.textPrimary }]}>v{selectedFile.version}.0</Text></View>
              </View>
            )}
          </View>

          {/* Trigger button */}
          <TouchableOpacity style={styles.actionBtnLarge} onPress={handleStartAnalysis}>
            <Ionicons name="sparkles" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.actionBtnLargeText}>Start AI Contract Review</Text>
          </TouchableOpacity>

        </ScrollView>
      )}

      {/* SECTION 3: AI Processing */}
      {step === 'PROCESSING' && (
        <View style={[styles.analyzingWrapper, { backgroundColor: theme.background }]}>
          <View style={[styles.analyzingBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <ActivityIndicator size="large" color="#6D5DFC" style={{ marginBottom: 16 }} />
            <Text style={[styles.sectionTitle, { color: theme.textPrimary, textAlign: 'center' }]}>Reviewing Legal Clauses</Text>
            <Text style={[styles.sectionDesc, { color: theme.textSecondary, textAlign: 'center', marginBottom: 20 }]}>
              Running deep context modeling, compliance checks, and drafting custom mitigation policies.
            </Text>

            {/* Parallel Tasks Checklist */}
            <View style={{ width: '100%', gap: 12 }}>
              {PROCESSING_TASKS.map((task, idx) => {
                const isPassed = idx < currentTaskIndex;
                const isActive = idx === currentTaskIndex;
                const progress = taskProgress[task.key] || 0;
                
                return (
                  <View key={task.key} style={styles.processingTaskRow}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        {isPassed ? (
                          <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                        ) : isActive ? (
                          <ActivityIndicator size="small" color="#6D5DFC" />
                        ) : (
                          <Ionicons name="ellipse-outline" size={16} color={theme.textMuted} />
                        )}
                        <Text style={{ fontSize: 12, fontWeight: isActive ? '800' : '600', color: isActive ? '#6D5DFC' : theme.textPrimary }}>
                          {task.label}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 11, color: theme.textSecondary }}>{progress}%</Text>
                    </View>
                    <View style={[styles.progressBarBg, { backgroundColor: theme.border }]}><View style={[styles.progressBarFill, { width: `${progress}%` }]} /></View>
                  </View>
                );
              })}
            </View>
          </View>
        </View>
      )}

      {/* Contract Review Dashboards */}
      {step === 'REVIEW' && (
        <View style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
            
            <TouchableOpacity style={styles.backLink} onPress={() => setStep('UPLOAD')}>
              <Ionicons name="arrow-back-outline" size={14} color="#6D5DFC" />
              <Text style={styles.backLinkText}>Upload Another Contract</Text>
            </TouchableOpacity>

            {/* SECTION 4: Executive Summary KPI Card */}
            <View style={[styles.summaryContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.cardHeading, { color: theme.textPrimary }]}>Executive Review Summary</Text>
              
              <View style={styles.kpiGrid}>
                <View style={[styles.kpiCard, { borderColor: theme.border }]}>
                  <Text style={[styles.kpiVal, { color: '#EF4444' }]}>72%</Text>
                  <Text style={[styles.kpiLabel, { color: theme.textSecondary }]}>Legal Risk Score</Text>
                </View>
                <View style={[styles.kpiCard, { borderColor: theme.border }]}>
                  <Text style={[styles.kpiVal, { color: '#10B981' }]}>98%</Text>
                  <Text style={[styles.kpiLabel, { color: theme.textSecondary }]}>AI Confidence</Text>
                </View>
                <View style={[styles.kpiCard, { borderColor: theme.border }]}>
                  <Text style={[styles.kpiVal, { color: '#6D5DFC' }]}>12 min</Text>
                  <Text style={[styles.kpiLabel, { color: theme.textSecondary }]}>Est Review Time</Text>
                </View>
              </View>

              <View style={styles.metadataList}>
                <View style={styles.metadataRow}><Text style={[styles.metaLabel, { color: theme.textSecondary }]}>Governing Law</Text><Text style={[styles.metaVal, { color: theme.textPrimary }]}>Maharashtra, India</Text></View>
                <View style={styles.metadataRow}><Text style={[styles.metaLabel, { color: theme.textSecondary }]}>Contract Class</Text><Text style={[styles.metaVal, { color: theme.textPrimary }]}>{selectedFile?.type || 'Lease Deed'}</Text></View>
                <View style={styles.metadataRow}><Text style={[styles.metaLabel, { color: theme.textSecondary }]}>Governing Jurisdiction</Text><Text style={[styles.metaVal, { color: theme.textPrimary }]}>High Court of Bombay</Text></View>
              </View>

              <View style={[styles.summaryBox, { backgroundColor: 'rgba(239, 68, 68, 0.08)', marginTop: 10 }]}>
                <Text style={{ fontSize: 12, color: theme.textPrimary, lineHeight: 18 }}>
                  **AI Recommendation Verdict**: Review critical indemnity clauses before signing. The liability caps are asymmetric and favor the vendor disproportionately.
                </Text>
              </View>
            </View>

            {/* SECTION 5: AI Review Findings collapsible cards */}
            <Text style={[styles.sectionHeading, { color: theme.textPrimary }]}>AI Findings & Issues</Text>
            
            {/* Critical Risks Accordion */}
            <View style={[styles.accordionCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <TouchableOpacity style={styles.accordionHeader} onPress={() => toggleFinding('critical')}>
                <Ionicons name="alert-circle" size={18} color="#EF4444" style={{ marginRight: 6 }} />
                <Text style={[styles.accordionTitleText, { color: theme.textPrimary }]}>Critical Risks (3 flagged)</Text>
                <Ionicons name={expandedFindings.critical ? 'chevron-up' : 'chevron-down'} size={16} color={theme.textSecondary} />
              </TouchableOpacity>
              {expandedFindings.critical && (
                <View style={styles.accordionBody}>
                  <Text style={[styles.reportPara, { color: theme.textSecondary }]}>
                    • **Indemnification (Cl 14)**: Limits customer claims completely while granting uncapped vendor damage limits. Highly asymmetric risk.\n
                    • **Governing Law (Cl 22)**: Set to Delaware jurisdiction which creates heavy legal costs for disputes.
                  </Text>
                </View>
              )}
            </View>

            {/* High Risks Accordion */}
            <View style={[styles.accordionCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <TouchableOpacity style={styles.accordionHeader} onPress={() => toggleFinding('high')}>
                <Ionicons name="warning" size={18} color="#F59E0B" style={{ marginRight: 6 }} />
                <Text style={[styles.accordionTitleText, { color: theme.textPrimary }]}>High Risks (2 flagged)</Text>
                <Ionicons name={expandedFindings.high ? 'chevron-up' : 'chevron-down'} size={16} color={theme.textSecondary} />
              </TouchableOpacity>
              {expandedFindings.high && (
                <View style={styles.accordionBody}>
                  <Text style={[styles.reportPara, { color: theme.textSecondary }]}>
                    • **Termination (Cl 9)**: Unilateral 3-day notice periods for vendor defaults without penalty provisions.
                  </Text>
                </View>
              )}
            </View>

            {/* Missing Clauses Accordion */}
            <View style={[styles.accordionCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <TouchableOpacity style={styles.accordionHeader} onPress={() => toggleFinding('missing')}>
                <Ionicons name="list-outline" size={18} color="#6D5DFC" style={{ marginRight: 6 }} />
                <Text style={[styles.accordionTitleText, { color: theme.textPrimary }]}>Missing Clauses (1 flagged)</Text>
                <Ionicons name={expandedFindings.missing ? 'chevron-up' : 'chevron-down'} size={16} color={theme.textSecondary} />
              </TouchableOpacity>
              {expandedFindings.missing && (
                <View style={styles.accordionBody}>
                  <Text style={[styles.reportPara, { color: theme.textSecondary }]}>
                    • **Force Majeure**: No pandemic exception definitions found inside global clause terms.
                  </Text>
                </View>
              )}
            </View>

            {/* SECTION 6: Risk Matrix Dashboard */}
            <Text style={[styles.sectionHeading, { color: theme.textPrimary }]}>Review Risk Matrix</Text>
            <View style={[styles.matrixCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              {[
                { name: 'Financial Risks', risk: 'High', color: '#EF4444', desc: 'Asymmetric liability cap limits client recovery.' },
                { name: 'Operational Risks', risk: 'Medium', color: '#F59E0B', desc: 'Short unilateral termination timelines.' },
                { name: 'Legal Risks', risk: 'High', color: '#EF4444', desc: 'Out-of-state governing law requirements.' },
                { name: 'Compliance Risks', risk: 'Low', color: '#10B981', desc: 'Standard data policy terms apply.' },
              ].map((item) => (
                <View key={item.name} style={[styles.matrixRow, { borderBottomColor: theme.border }]}>
                  <View style={{ flex: 1, paddingRight: 10 }}>
                    <Text style={[styles.matrixTitle, { color: theme.textPrimary }]}>{item.name}</Text>
                    <Text style={{ fontSize: 11.5, color: theme.textSecondary, marginTop: 2 }}>{item.desc}</Text>
                  </View>
                  <View style={[styles.riskBadge, { backgroundColor: item.color + '1C' }]}>
                    <Text style={{ fontSize: 10.5, fontWeight: '800', color: item.color }}>{item.risk}</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* SECTION 7: Clause Intelligence */}
            <Text style={[styles.sectionHeading, { color: theme.textPrimary }]}>Clause Intelligence</Text>
            
            {/* Clause 1: Limitation of Liability */}
            <View style={[styles.clauseAccordion, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <TouchableOpacity style={styles.clauseHeader} onPress={() => toggleClause('liab')}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.clauseTitle, { color: theme.textPrimary }]}>Cl 7: Limitation of Liability</Text>
                  <Text style={{ fontSize: 10, color: '#EF4444', fontWeight: '800', marginTop: 2 }}>HIGH RISK BADGE</Text>
                </View>
                <Ionicons name={expandedClauses.liab ? 'chevron-up' : 'chevron-down'} size={18} color={theme.textSecondary} />
              </TouchableOpacity>
              {expandedClauses.liab && (
                <View style={styles.clauseBody}>
                  <Text style={[styles.clauseLabel, { color: theme.textPrimary }]}>Original Contract Clause</Text>
                  <Text style={[styles.clauseOriginalText, { backgroundColor: theme.surfaceVariant, color: theme.textPrimary }]}>
                    "The maximum liability of the Vendor for any claims under this agreement shall be limited to USD 1,000 or the amount paid in the prior 1 month."
                  </Text>
                  <Text style={[styles.clauseLabel, { color: theme.textPrimary, marginTop: 10 }]}>Plain English Translation</Text>
                  <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                    No matter how big the vendor's mistake is, they will only pay you back a maximum of one month's fees or $1,000.
                  </Text>
                  <Text style={[styles.clauseLabel, { color: theme.textPrimary, marginTop: 10 }]}>Suggested Mitigated Rewrite</Text>
                  <Text style={{ fontSize: 12, color: '#10B981', fontWeight: '700' }}>
                    "The maximum aggregate liability under this agreement shall be limited to the total fees paid in the prior 12 months, or 2x contract value, whichever is higher."
                  </Text>
                  <View style={styles.clauseBtnRow}>
                    <TouchableOpacity style={styles.clauseActionBtn} onPress={() => Clipboard.setString('AIR 2024 SC')}><Ionicons name="copy-outline" size={14} color="#6D5DFC" /><Text style={styles.clauseActionBtnText}>Copy</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.clauseActionBtn} onPress={() => showToast('success', 'Shared', 'Clause exported to messaging.')}><Ionicons name="share-outline" size={14} color="#6D5DFC" /><Text style={styles.clauseActionBtnText}>Share</Text></TouchableOpacity>
                  </View>
                </View>
              )}
            </View>

            {/* SECTION 8: Negotiation Strategy */}
            <Text style={[styles.sectionHeading, { color: theme.textPrimary }]}>Negotiation Strategy</Text>
            <View style={[styles.strategyCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.strategySection}>
                <Text style={[styles.strategySubheading, { color: '#EF4444' }]}>🚨 Must Reject Terms</Text>
                <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                  Reject the Delaware jurisdiction clause. Demand local state tribunals or Singapore SIAC arbitration guidelines.
                </Text>
              </View>
              <View style={[styles.strategyDivider, { backgroundColor: theme.border }]} />
              <View style={styles.strategySection}>
                <Text style={[styles.strategySubheading, { color: '#F59E0B' }]}>⚡ Alternative Draft suggestions</Text>
                <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                  For Clause 14 (Indemnification), suggest double-sided limits with explicit exclusions for IP infringement.
                </Text>
              </View>
            </View>

            {/* SECTION 9: Regulatory Compliance */}
            <Text style={[styles.sectionHeading, { color: theme.textPrimary }]}>Regulatory Compliance</Text>
            <View style={[styles.complianceCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={[styles.complianceScoreLabel, { color: theme.textPrimary }]}>Compliance Score</Text>
                <Text style={styles.complianceScoreVal}>85%</Text>
              </View>
              <View style={{ gap: 8 }}>
                {[
                  { name: 'DPDP Act (India) Data Safeguards', status: 'Compliant', color: '#10B981' },
                  { name: 'Stamp Duty Admissibility Act', status: 'Pending Review', color: '#F59E0B' },
                  { name: 'GST Statutory Invoicing Compliance', status: 'Violated', color: '#EF4444' },
                ].map(item => (
                  <View key={item.name} style={styles.complianceRow}>
                    <Ionicons name="checkbox" size={16} color={item.color} style={{ marginRight: 6 }} />
                    <Text style={[styles.complianceName, { color: theme.textPrimary }]}>{item.name}</Text>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: item.color }}>{item.status}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* SECTION 10: Final AI Verdict */}
            <Text style={[styles.sectionHeading, { color: theme.textPrimary }]}>Final AI Verdict</Text>
            <View style={[styles.verdictCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#F59E0B' }} />
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#F59E0B' }}>AMENDMENT RECOMMENDED</Text>
              </View>
              <Text style={{ fontSize: 12, color: theme.textSecondary, lineHeight: 18 }}>
                Overall contract health score is moderate (68%). The presence of unilateral damage exclusions requires legal review before signing.
              </Text>
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>

          {/* SECTION 11: Bottom Action Bar */}
          <View style={[styles.reportFooter, { borderTopColor: theme.border, backgroundColor: theme.surface, paddingBottom: Math.max(insets.bottom, 12) }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, alignItems: 'center' }}>
              <TouchableOpacity style={styles.footerBtn} onPress={() => handleAiAction('explain-hindi')}>
                <Ionicons name="text-outline" size={14} color="#6D5DFC" />
                <Text style={styles.footerBtnText}>Explain in Hindi</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.footerBtn} onPress={() => handleAiAction('explain-english')}>
                <Ionicons name="bulb-outline" size={14} color="#6D5DFC" />
                <Text style={styles.footerBtnText}>Explain Simple English</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.footerBtn} onPress={() => handleAiAction('court-submission')}>
                <Ionicons name="create-outline" size={14} color="#6D5DFC" />
                <Text style={styles.footerBtnText}>Generate Legal Notice</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.footerBtn} onPress={() => handleAiAction('export-pdf')}>
                <Ionicons name="download-outline" size={14} color="#6D5DFC" />
                <Text style={styles.footerBtnText}>Export PDF Report</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.footerBtn} onPress={() => {
                showToast('success', 'Workspace Saved', 'Linked to case files successfully.');
              }}>
                <Ionicons name="save-outline" size={14} color="#6D5DFC" />
                <Text style={styles.footerBtnText}>Save to Case</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          {/* Floating Ask Contract AI Button */}
          <TouchableOpacity style={styles.floatingAiBtn} onPress={() => setIsAiAssistantOpen(true)}>
            <Ionicons name="sparkles" size={24} color="#FFFFFF" />
          </TouchableOpacity>

        </View>
      )}

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
                      <Text style={styles.bottomSheetTitle}>Contract Review Copilot</Text>
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
                      {['Explain in Hindi', 'Explain Simple English', 'Highlight critical risks', 'Negotiation strategy', 'Key liability limits'].map(prompt => (
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
                      placeholder="Ask AI about this contract..."
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

      {/* Case Selection Modal Drawer */}
      <Modal visible={isCaseSelectOpen} transparent animationType="slide" onRequestClose={() => setIsCaseSelectOpen(false)}>
        <TouchableWithoutFeedback onPress={() => setIsCaseSelectOpen(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.bottomSheetContainer}>
                <View style={styles.bottomSheetDragHandle} />
                <View style={styles.bottomSheetHeader}>
                  <Text style={styles.bottomSheetTitle}>Link Case Workspace</Text>
                  <TouchableOpacity onPress={() => setIsCaseSelectOpen(false)}>
                    <Ionicons name="close-circle" size={24} color="#94A3B8" />
                  </TouchableOpacity>
                </View>
                <ScrollView style={{ flex: 1 }}>
                  <TouchableOpacity
                    style={[styles.caseItemRow, { borderBottomColor: theme.border }]}
                    onPress={() => {
                      setLinkedCaseId('');
                      setIsCaseSelectOpen(false);
                    }}
                  >
                    <Ionicons name="globe-outline" size={18} color="#6D5DFC" style={{ marginRight: 10 }} />
                    <Text style={[styles.caseItemText, { color: theme.textPrimary }]}>Independent Review (No Case)</Text>
                  </TouchableOpacity>

                  {cases.map((c) => (
                    <TouchableOpacity
                      key={c._id}
                      style={[styles.caseItemRow, { borderBottomColor: theme.border }]}
                      onPress={() => {
                        setLinkedCaseId(c._id);
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
    // Floating AI Assist Button
    floatingAiBtn: {
      position: 'absolute',
      right: 20,
      bottom: 80,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: '#6D5DFC',
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#6D5DFC',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 6,
      elevation: 8,
    },
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
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(15, 23, 42, 0.4)',
      justifyContent: 'flex-end',
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
      fontSize: 15,
      fontWeight: '800',
    },
    headerRightActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    headerRightBtn: {
      padding: 6,
    },
    langToggle: {
      borderWidth: 1.5,
      borderRadius: 6,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    langToggleText: {
      fontSize: 10,
      fontWeight: '800',
      color: '#6D5DFC',
    },
    caseSelectorBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderBottomWidth: 1,
    },
    caseSelectorLabel: {
      fontSize: 12,
      flex: 1,
    },
    caseChangeBtn: {
      backgroundColor: 'rgba(109, 93, 252, 0.1)',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    caseChangeBtnText: {
      fontSize: 11,
      fontWeight: '800',
      color: '#6D5DFC',
    },
    scrollBody: {
      padding: 16,
      paddingBottom: 40,
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

    // Step 1: Workspace Cards
    workspaceCard: {
      borderWidth: 1.5,
      borderRadius: 14,
      padding: 14,
      marginBottom: 14,
    },
    cardHeading: {
      fontSize: 14,
      fontWeight: '800',
      marginBottom: 10,
    },
    metadataList: {
      gap: 8,
    },
    metadataRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    metaLabel: {
      fontSize: 12,
      fontWeight: '700',
    },
    metaVal: {
      fontSize: 12,
      fontWeight: '800',
    },
    outlineBtnCompact: {
      borderWidth: 1.5,
      borderColor: '#6D5DFC',
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    primaryBtnCompact: {
      backgroundColor: '#6D5DFC',
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },

    // Upload Container Card
    uploadCard: {
      borderWidth: 1.5,
      borderRadius: 14,
      padding: 16,
      alignItems: 'center',
      marginBottom: 14,
    },
    uploadTitle: {
      fontSize: 14.5,
      fontWeight: '800',
      marginBottom: 4,
    },
    mockFileRow: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1.5,
      borderRadius: 10,
      padding: 10,
      width: '100%',
    },
    fileNameText: {
      fontSize: 12.5,
      fontWeight: '800',
    },
    progressBarBg: {
      height: 6,
      borderRadius: 3,
      width: '100%',
      overflow: 'hidden',
    },
    progressBarFill: {
      height: '100%',
      backgroundColor: '#6D5DFC',
    },
    uploadMetaContainer: {
      padding: 12,
      borderRadius: 10,
      width: '100%',
      gap: 6,
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

    // Analyzing Loader Styles
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
    processingTaskRow: {
      marginBottom: 10,
    },

    // Executive Summary Dashboard Card
    summaryContainer: {
      borderWidth: 1.5,
      borderRadius: 14,
      padding: 14,
      marginBottom: 16,
    },
    kpiGrid: {
      flexDirection: 'row',
      gap: 6,
      marginBottom: 12,
    },
    kpiCard: {
      flex: 1,
      borderWidth: 1,
      borderRadius: 10,
      paddingVertical: 10,
      alignItems: 'center',
    },
    kpiVal: {
      fontSize: 15,
      fontWeight: '800',
    },
    kpiLabel: {
      fontSize: 9.5,
      fontWeight: '700',
      marginTop: 2,
    },
    summaryBox: {
      padding: 10,
      borderRadius: 8,
    },
    sectionHeading: {
      fontSize: 15,
      fontWeight: '800',
      marginBottom: 10,
      marginTop: 10,
    },

    // Accordion styling
    accordionCard: {
      borderWidth: 1.5,
      borderRadius: 10,
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
      fontSize: 13,
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
    reportPara: {
      fontSize: 12,
      lineHeight: 18,
    },

    // Risk Matrix
    matrixCard: {
      borderWidth: 1.5,
      borderRadius: 12,
      paddingHorizontal: 14,
      marginBottom: 16,
    },
    matrixRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
    },
    matrixTitle: {
      fontSize: 13,
      fontWeight: '800',
    },
    riskBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },

    // Clause Intelligence
    clauseAccordion: {
      borderWidth: 1.5,
      borderRadius: 12,
      marginBottom: 10,
      overflow: 'hidden',
    },
    clauseHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 14,
    },
    clauseTitle: {
      fontSize: 13,
      fontWeight: '800',
    },
    clauseBody: {
      paddingHorizontal: 14,
      paddingBottom: 14,
      borderTopWidth: 1,
      borderTopColor: '#F1F5F9',
      paddingTop: 10,
    },
    clauseLabel: {
      fontSize: 11,
      fontWeight: '800',
      marginBottom: 4,
    },
    clauseOriginalText: {
      padding: 10,
      borderRadius: 8,
      fontSize: 11.5,
      lineHeight: 16,
      fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    },
    clauseBtnRow: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 12,
    },
    clauseActionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    clauseActionBtnText: {
      fontSize: 11.5,
      fontWeight: '700',
      color: '#6D5DFC',
    },

    // Strategy & Compliance Cards
    strategyCard: {
      borderWidth: 1.5,
      borderRadius: 12,
      padding: 14,
      marginBottom: 16,
    },
    strategySection: {
      gap: 4,
    },
    strategySubheading: {
      fontSize: 12.5,
      fontWeight: '800',
    },
    strategyDivider: {
      height: 1,
      marginVertical: 10,
    },
    complianceCard: {
      borderWidth: 1.5,
      borderRadius: 12,
      padding: 14,
      marginBottom: 16,
    },
    complianceScoreLabel: {
      fontSize: 13,
      fontWeight: '800',
    },
    complianceScoreVal: {
      fontSize: 15,
      fontWeight: '900',
      color: '#6D5DFC',
    },
    complianceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 4,
    },
    complianceName: {
      fontSize: 12,
      flex: 1,
    },
    verdictCard: {
      borderWidth: 1.5,
      borderRadius: 12,
      padding: 14,
      marginBottom: 20,
    },

    // Ask AI composer box input
    chatInputSection: {
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderTopWidth: 1.5,
    },

    // Sticky Actions bottom footer
    reportFooter: {
      flexDirection: 'row',
      paddingHorizontal: 12,
      paddingTop: 10,
      borderTopWidth: 1.5,
      height: 60,
    },
    footerBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      borderWidth: 1.5,
      borderColor: '#E2E8F0',
      borderRadius: 10,
      paddingHorizontal: 12,
      height: 38,
    },
    footerBtnText: {
      fontSize: 11.5,
      fontWeight: '700',
      color: '#6D5DFC',
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
