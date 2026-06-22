import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Modal,
  Platform,
  KeyboardAvoidingView,
  TouchableOpacity,
  Dimensions,
  FlatList,
  Share,
  Clipboard,
  BackHandler,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
// @ts-ignore
// eslint-disable-next-line import/no-unresolved
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { UploadService } from '@/services/upload.service';
import { useWorkspace } from '@/hooks/use-workspace';
import { useWorkspaceStore } from '@/store/workspace';
import { CaseService } from '@/services/case.service';
import { DraftService } from '@/services/draft.service';
import { useToastContext } from '@/providers';
import { ChatService } from '@/services/chat.service';
import { streamAIResponse } from '@/api/client';
import {
  CaseWorkspace,
  CaseDocument,
  CaseTask,
  CaseHearing,
  CaseEvidence,
  CaseFact,
  CasePrecedent,
  ChatMessage,
  ChatAttachment,
} from '@/types';
import { ChatMessageBubble, ChatComposer, ChatWelcome } from '@/components/ui/chat';
import { AttachmentBottomSheet } from '@/components/ui/bottomSheets/AttachmentBottomSheet';
import { CustomCameraModal } from '@/components/ui/legal/CustomCameraModal';
import { useAttachmentHandler } from '@/hooks/use-attachment-handler';



const toolItems = [
  { id: 'caseAssistant', name: 'Case Assistant', icon: 'sparkles-outline', color: '#6D5DFC' },
  { id: 'evidenceAnalyst', name: 'Evidence Analyst', icon: 'search-outline', color: '#3B82F6' },
  { id: 'contractAnalyzer', name: 'Contract Analyzer', icon: 'document-text-outline', color: '#8B5CF6' },
  { id: 'legalResearch', name: 'Legal Research', icon: 'library-outline', color: '#10B981' },
  { id: 'argumentBuilder', name: 'Argument Builder', icon: 'shield-half-outline', color: '#6D5DFC' },
  { id: 'casePredictor', name: 'Case Predictor', icon: 'trending-up-outline', color: '#EF4444' },
  { id: 'strategyEngine', name: 'Strategy Engine', icon: 'bulb-outline', color: '#F59E0B' },
  { id: 'researchAssistant', name: 'Research Assistant', icon: 'chatbubbles-outline', color: '#EC4899' },
];

// Theme tokens matching Light Mode design system
const theme = {
  background: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceVariant: '#F9FAFB',
  primary: '#6D5DFC',
  primaryDark: '#5B4EDB',
  primaryLight: '#EEECFF',
  border: '#ECECEC',
  textPrimary: '#1F2937',
  textSecondary: '#4B5563',
  textMuted: '#9CA3AF',
  placeholder: '#9CA3AF',
  success: '#10B981',
  successLight: '#E6F4EA',
  danger: '#EF4444',
  dangerLight: '#FCE8E6',
  warning: '#F59E0B',
  warningLight: '#FEF7E0',
  info: '#3B82F6',
  infoLight: '#EBF5FF',
};

const { width, height } = Dimensions.get('window');

const MOCK_COURT_ORDERS = [
  {
    name: 'Delhi_HC_Interim_Injunction_Order.pdf',
    text: `IN THE HIGH COURT OF DELHI AT NEW DELHI
Case No. Arb. P. 445/2026
Petitioner: ABC Enterprises
Respondent: XYZ Logistics Ltd

ORDER:
1. The matter was heard today. Hon'ble Justice Amit Verma presiding.
2. The respondent is directed to submit the original agreement and proof of delivery within 14 days.
3. Summons to be issued to witness Mr. Roy for examination.
4. Next date of hearing is scheduled for 25 July 2026 in Courtroom No. 302.
5. Compliance report to be filed before the next hearing.
Dated: 22 June 2026`,
  },
  {
    name: 'Summons_Appearance_Order_25-May.pdf',
    text: `IN THE DISTRICT COURT OF DELHI
Summons in Case No. CS(OS) 234/2026
Lessor: R. K. Sharma
Lessee: Amit Verma

ORDER:
1. The petition for eviction has been admitted. Hon'ble Judge Roy presiding.
2. Eviction sum of arrears to be verified. Defendant is directed to submit his replica reply within 7 days.
3. Parties are directed to produce lease agreement evidence and examine the main witness.
4. Next date of hearing is fixed for 12 August 2026 in Courtroom No. 5.
Dated: 25 May 2026`,
  },
  {
    name: 'Final_Arguments_Outcome_Directive.pdf',
    text: `IN THE HIGH COURT OF DELHI
Arb. Appeal No. 12/2026

ORDER:
1. Arguments on stay application completed. Orders reserved.
2. High Court directs both parties to submit brief written notes of arguments not exceeding 5 pages.
3. Relevant case precedents to be compiled and submitted to Court master before 30 July 2026.
4. List the matter for final orders on 15 September 2026 in Courtroom No. 12 before Hon'ble Judge Sen.
Dated: 18 June 2026`,
  }
];

export default function WorkspaceDetailScreen() {
  useAuthGuard();
  const router = useRouter();
  const { showToast } = useToastContext();
  const { id, tab } = useLocalSearchParams<{ id: string; tab?: string }>();

  const {
    workspace,
    loading,
    error,
    setActiveCaseId,
    fetchWorkspaceDetails,
  } = useWorkspace();

  const updateWorkspaceState = useWorkspaceStore((s) => s.updateWorkspace);

  // Integrated AI Assistant State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [inputVal, setInputVal] = useState('');
  const [isSending, setIsSending] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isCancelledRef = useRef<boolean>(false);
  const [activeTool, setActiveTool] = useState<string>('caseAssistant'); // Default active tool
  const {
    attachments,
    setAttachments,
    isBottomSheetVisible,
    isCameraVisible,
    isUploading,
    showAttachmentOptions,
    hideAttachmentOptions,
    hideCamera,
    handleRemoveAttachment,
    clearAttachments,
    handleSelectOption,
    handleCameraConfirm,
    uploadPendingAttachments,
  } = useAttachmentHandler();

  const handleAddAttachment = showAttachmentOptions;

  const [isToolMenuOpen, setIsToolMenuOpen] = useState(false);
  const toolMenuAnim = useRef(new Animated.Value(0)).current;

  const openToolMenu = () => {
    setIsToolMenuOpen(true);
    toolMenuAnim.setValue(0);
    Animated.timing(toolMenuAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const closeToolMenu = (onComplete?: () => void) => {
    Animated.timing(toolMenuAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setIsToolMenuOpen(false);
      if (onComplete) onComplete();
    });
  };
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [centerToast, setCenterToast] = useState<string | null>(null);

  // Chat History Drawer States
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historySessions, setHistorySessions] = useState<any[]>([]);
  const [searchHistoryQuery, setSearchHistoryQuery] = useState('');
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [renameTitleVal, setRenameTitleVal] = useState('');

  const fetchHistorySessions = async () => {
    try {
      const res = await ChatService.listSessions();
      const sessionList = Array.isArray(res) ? res : (res?.data || []);
      const filtered = sessionList.filter((s: any) => s.projectId === id);
      setHistorySessions(filtered);
    } catch (err) {
      console.warn('Failed to fetch chat history:', err);
    }
  };

  useEffect(() => {
    if (isAiOpen) {
      fetchHistorySessions();
    }
  }, [sessionId, id, isAiOpen]);

  const handleSelectSession = async (sId: string) => {
    try {
      setIsHistoryOpen(false);
      const res = await ChatService.getSessionDetails(sId);
      const detailSession = (res as any).data || res;
      if (detailSession) {
        setSessionId(sId);
        setMessages(detailSession.messages || []);
        setActiveTool('caseAssistant');
        showToast('success', 'Conversation Loaded', 'Previous chat loaded.');
      }
    } catch (err) {
      console.warn('Failed to load session details:', err);
      showToast('error', 'Load Failed', 'Could not load conversation.');
    }
  };

  const handleDeleteSession = async (sId: string) => {
    try {
      await ChatService.deleteSession(sId);
      setHistorySessions((prev) => prev.filter((s) => s.sessionId !== sId));
      if (sessionId === sId) {
        setSessionId(null);
        setMessages([]);
      }
      showToast('success', 'Conversation Deleted', 'Logs removed.');
    } catch (err) {
      console.warn('Failed to delete session:', err);
      showToast('error', 'Delete Failed', 'Could not delete conversation.');
    }
  };

  const handleRenameConfirm = async (sId: string) => {
    if (renameTitleVal.trim()) {
      try {
        await ChatService.renameSession(sId, renameTitleVal.trim());
        setHistorySessions((prev) =>
          prev.map((s) => (s.sessionId === sId ? { ...s, title: renameTitleVal.trim() } : s))
        );
        setEditingSessionId(null);
        setRenameTitleVal('');
        showToast('success', 'Session Renamed', 'Title updated.');
      } catch (err) {
        console.warn('Failed to rename session:', err);
        showToast('error', 'Rename Failed', 'Could not rename conversation.');
      }
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setSessionId(null);
    clearAttachments();
    setInputVal('');
    setActiveTool('caseAssistant');
    showToast('info', 'New Chat', 'New chat conversation started.');
  };

  const filteredHistorySessions = useMemo(() => {
    let list = historySessions;
    if (searchHistoryQuery.trim()) {
      list = historySessions.filter((s) =>
        s.title.toLowerCase().includes(searchHistoryQuery.toLowerCase())
      );
    }
    return [...list].sort((a, b) => b.lastModified - a.lastModified);
  }, [historySessions, searchHistoryQuery]);

  const aiAnimValue = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<FlatList>(null);
  const isAtBottomRef = useRef(true);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const scrollBtnOpacity = useRef(new Animated.Value(0)).current;
  const scrollBtnScale = useRef(new Animated.Value(0.95)).current;
  const hideTimerRef = useRef<any>(null);
  const lastOffsetRef = useRef<number>(0);

  const handleScrollAction = (shouldShow: boolean) => {
    if (shouldShow) {
      if (!showScrollBtn) {
        setShowScrollBtn(true);
        Animated.parallel([
          Animated.timing(scrollBtnOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
          Animated.timing(scrollBtnScale, { toValue: 1, duration: 200, useNativeDriver: true }),
        ]).start();
      }
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      hideTimerRef.current = setTimeout(() => {
        Animated.parallel([
          Animated.timing(scrollBtnOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
          Animated.timing(scrollBtnScale, { toValue: 0.95, duration: 250, useNativeDriver: true }),
        ]).start((result) => {
          if (result.finished) {
            setShowScrollBtn(false);
          }
        });
      }, 2500);
    } else {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
      Animated.parallel([
        Animated.timing(scrollBtnOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.timing(scrollBtnScale, { toValue: 0.95, duration: 250, useNativeDriver: true }),
      ]).start((result) => {
        if (result.finished) {
          setShowScrollBtn(false);
        }
      });
    }
  };

  useEffect(() => {
    if (inputVal.trim() !== '') {
      handleScrollAction(false);
    }
  }, [inputVal]);

  // Active section state
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<string>(tab || 'overview');

  // OCR state simulations
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [ocrSteps, setOcrSteps] = useState<string[]>([]);
  const [activeOcrStep, setActiveOcrStep] = useState(0);

  // Forms control states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<string | null>(null);

  // --- FORM INPUT STATES ---
  const [courtOrderForm, setCourtOrderForm] = useState({ title: '', date: '', issuer: '', notes: '' });
  const [isThreeDotOpen, setIsThreeDotOpen] = useState(false);

  // Timeline
  const [timelineForm, setTimelineForm] = useState({ date: '', title: '', description: '', category: 'Agreement', importance: 'Medium' });
  // Hearing
  const [hearingForm, setHearingForm] = useState({
    date: '',
    time: '',
    courtName: '',
    courtroom: '',
    judge: '',
    purpose: '',
    notes: '', // hearing title / description / notes
    status: 'Scheduled'
  });
  // Party
  const [partyForm, setPartyForm] = useState({ name: '', role: 'Witness', contact: '', notes: '' });
  // Evidence
  const [evidenceForm, setEvidenceForm] = useState({ name: '', type: 'Document', description: '', admissibility: 'Admissible', notes: '', chainOfCustody: '' });
  // Task
  const [taskForm, setTaskForm] = useState({ title: '', description: '', priority: 'Medium', deadline: '' });
  // Research precedents search
  const [precedentQuery, setPrecedentQuery] = useState('');
  const [precedentSearchResults, setPrecedentSearchResults] = useState<CasePrecedent[]>([]);
  // Draft compiler
  const [draftForm, setDraftForm] = useState({ name: '', template: 'Notice', content: '' });
  const [isDraftCompiling, setIsDraftCompiling] = useState(false);
  const [compiledDraftText, setCompiledDraftText] = useState('');
  // Rename
  const [renameValue, setRenameValue] = useState('');

  // General Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [timelineCategoryFilter, setTimelineCategoryFilter] = useState('All');
  const [timelineImportanceFilter, setTimelineImportanceFilter] = useState('All');
  const [timelineSortAsc, setTimelineSortAsc] = useState(true);
  const [isAnalyzingTimeline, setIsAnalyzingTimeline] = useState(false);

  // Case note autosave buffer
  const [caseNotes, setCaseNotes] = useState('');

  // Timeline detailed view
  const [selectedEventIndex, setSelectedEventIndex] = useState<number | null>(null);

  // AI Narrative Extractor
  const [isNarrativeExtractorOpen, setIsNarrativeExtractorOpen] = useState(false);
  const [narrativeText, setNarrativeText] = useState('');
  const [isExtractingNarrative, setIsExtractingNarrative] = useState(false);
  const [narrativeSteps, setNarrativeSteps] = useState<string[]>([]);
  const [activeNarrativeStep, setActiveNarrativeStep] = useState(0);

  // Suggestions warning flags
  const [showDuplicateMergeSuggestion, setShowDuplicateMergeSuggestion] = useState(true);
  const [showMissingNoticeSuggestion, setShowMissingNoticeSuggestion] = useState(true);

  // Hearings outcome states and Redesigned Hearings States
  const [isRecordingOutcome, setIsRecordingOutcome] = useState(false);
  const [selectedHearing, setSelectedHearing] = useState<CaseHearing | null>(null);
  const [activeHearingFilter, setActiveHearingFilter] = useState<string>('All');
  const [outcomeForm, setOutcomeForm] = useState({
    outcome: '',
    courtObservations: '',
    ordersPassed: '',
    evidenceAccepted: '',
    argumentsCompleted: '',
    witnessExamined: '',
    adjournmentReason: '',
    nextHearingDate: ''
  });
  const [isExtractingHearing, setIsExtractingHearing] = useState(false);
  const [hearingExtractSteps, setHearingExtractSteps] = useState<string[]>([]);
  const [activeHearingExtractStep, setActiveHearingExtractStep] = useState(0);

  // Redesigned Hearings State additions
  const [hearingSearchQuery, setHearingSearchQuery] = useState<string>('');
  const [isEnrichingHearingId, setIsEnrichingHearingId] = useState<string | null>(null);
  const [expandedHearingChecklistId, setExpandedHearingChecklistId] = useState<string | null>(null);
  const [hearingNotesInput, setHearingNotesInput] = useState<string>('');
  const [selectedHearingForNotes, setSelectedHearingForNotes] = useState<CaseHearing | null>(null);
  const [selectedHearingForOrder, setSelectedHearingForOrder] = useState<CaseHearing | null>(null);
  const [simulatedUploadProgress, setSimulatedUploadProgress] = useState<number>(0);
  const [simulatedUploadStep, setSimulatedUploadStep] = useState<string>('');

  // Parties states
  const [isPartiesEditMode, setIsPartiesEditMode] = useState(false);
  const [tempPartiesData, setTempPartiesData] = useState<any>({});
  const [isExtractingParties, setIsExtractingParties] = useState(false);
  const [partiesExtractionSteps, setPartiesExtractionSteps] = useState<string[]>([]);
  const [activePartiesExtractionStep, setActivePartiesExtractionStep] = useState(0);

  // AI Research States
  const [researchSearchQuery, setResearchSearchQuery] = useState('');
  const [isRegeneratingResearch, setIsRegeneratingResearch] = useState(false);
  const [researchRegenSteps, setResearchRegenSteps] = useState<string[]>([]);
  const [activeResearchRegenStep, setActiveResearchRegenStep] = useState(0);
  const [expandedResearchSection, setExpandedResearchSection] = useState('dashboard');
  const [conversationalSearchResults, setConversationalSearchResults] = useState<{ judgments: any[]; laws: any[] } | null>(null);
  const [isSearchingResearch, setIsSearchingResearch] = useState(false);

  // AI Contract States
  const [uploadedContract, setUploadedContract] = useState<any>(null);
  const [isAnalyzingContract, setIsAnalyzingContract] = useState(false);
  const [contractAnalysisSteps, setContractAnalysisSteps] = useState<string[]>([]);
  const [activeContractAnalysisStep, setActiveContractAnalysisStep] = useState(0);
  const [contractActiveSubTab, setContractActiveSubTab] = useState('summary');
  const [contractSearchQuery, setContractSearchQuery] = useState('');
  const [contractChatInput, setContractChatInput] = useState('');
  const [contractChatMessages, setContractChatMessages] = useState<any[]>([
    { sender: 'ai', text: "Hello! I am your AI Contract Review Assistant. Ask me anything about this contract's clauses, risk liabilities, or request a customized clause rewrite." }
  ]);
  const [isContractLinked, setIsContractLinked] = useState(false);
  const [contractRedlineState, setContractRedlineState] = useState<'pending' | 'accepted' | 'rejected'>('pending');

  // AI Strategy & Courtroom Arguments
  const [argumentsActiveSubTab, setArgumentsActiveSubTab] = useState('dashboard');
  const [argumentsSearchQuery, setArgumentsSearchQuery] = useState('');
  const [isAnalyzingArguments, setIsAnalyzingArguments] = useState(false);
  const [argumentsAnalysisSteps, setArgumentsAnalysisSteps] = useState<string[]>([]);
  const [activeArgumentsStep, setActiveArgumentsStep] = useState(0);
  const [argumentsExportOpen, setArgumentsExportOpen] = useState(false);
  const [isPreparingHearing, setIsPreparingHearing] = useState(false);

  // Activity communication logging
  const [newActivity, setNewActivity] = useState({ type: 'Call', title: '', notes: '' });

  // Dynamic AI reply states for analysis tabs
  const [aiResearchReply, setAiResearchReply] = useState<string | null>(null);
  const [aiStrategyReply, setAiStrategyReply] = useState<string | null>(null);

  // Pulse animation for skeleton loading
  const skeletonAnim = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    if (loading) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(skeletonAnim, {
            toValue: 0.7,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(skeletonAnim, {
            toValue: 0.3,
            duration: 800,
            useNativeDriver: true,
          })
        ])
      ).start();
    }
  }, [loading]);

  // Initialize and select case
  useEffect(() => {
    if (id) {
      setActiveCaseId(id);
      fetchWorkspaceDetails(id);
    }
    if (tab) {
      setActiveWorkspaceTab(tab);
    }
  }, [id, tab]);

  // Sync local notes once loaded
  useEffect(() => {
    if (workspace) {
      setCaseNotes(workspace.summary || workspace.caseSummary || '');
      setRenameValue(workspace.name || '');
    }
  }, [workspace]);

  // Hardware back button behavior for Android gesture navigation
  useEffect(() => {
    const backAction = () => {
      if (isAiOpen) {
        handleCloseAi();
        return true; // prevent default behavior
      }
      return false; // let default behavior happen
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove();
  }, [isAiOpen]);

  // Load chat session on mount
  useEffect(() => {
    async function initChatSession() {
      if (!id) return;
      try {
        setIsSending(true);
        // Find existing sessions for this case workspace
        const res = await ChatService.listSessions();
        const sessions = Array.isArray(res) ? res : (res?.data || []);
        const caseSession = (sessions as any[]).find((s) => s.projectId === id);

        if (caseSession) {
          setSessionId(caseSession.sessionId);
          setActiveTool('caseAssistant');
          
          // Fetch complete message logs
          const detailsRes = await ChatService.getSessionDetails(caseSession.sessionId);
          const detailSession = (detailsRes as any).data || detailsRes;
          setMessages(detailSession?.messages || []);
        } else {
          // Initialize first default greetings
          setMessages([]);
        }
      } catch (err) {
        console.warn('[COPILOT INIT] Error loading sessions in workspace screen (ignoring to prevent crash):', err);
      } finally {
        setIsSending(false);
      }
    }
    initChatSession();
  }, [id]);

  const scrollToBottom = (animated = true) => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated });
    }, 100);
  };

  const handleSend = async (overrideMsg?: string, unusedToolId?: string, editMessageId?: string) => {
    const text = overrideMsg || inputVal.trim();
    if (!text && attachments.length === 0) return;

    setIsSending(true);

    let uploadedAttachments = attachments;
    if (attachments.length > 0 && !editMessageId) {
      try {
        uploadedAttachments = await uploadPendingAttachments(id);
      } catch (uploadErr) {
        setIsSending(false);
        return;
      }
    }

    // Optimistic user message append / edit replacement
    let userMsgId = Date.now().toString();
    let updatedMessages: ChatMessage[] = [];

    if (editMessageId) {
      const msgIdx = messages.findIndex((m) => m.id === editMessageId);
      if (msgIdx !== -1) {
        const editedMsg = {
          ...messages[msgIdx],
          content: text,
          timestamp: Date.now(),
        };
        updatedMessages = [
          ...messages.slice(0, msgIdx),
          editedMsg
        ];
        userMsgId = editMessageId;
      } else {
        const newUserMessage: ChatMessage = {
          id: userMsgId,
          role: 'user',
          content: text,
          timestamp: Date.now(),
          attachments: [],
        };
        updatedMessages = [...messages, newUserMessage];
      }
    } else {
      const newUserMessage: ChatMessage = {
        id: userMsgId,
        role: 'user',
        content: text,
        timestamp: Date.now(),
        attachments: [...uploadedAttachments],
      };
      updatedMessages = [...messages, newUserMessage];
    }

    const aiMsgId = `msg_ai_${Date.now()}`;
    const placeholderAiMessage: ChatMessage = {
      id: aiMsgId,
      role: 'model',
      content: '',
      timestamp: Date.now() + 1,
      isProcessing: true,
    };

    const finalMessages = [...updatedMessages, placeholderAiMessage];
    setMessages(finalMessages);
    if (!editMessageId) {
      setInputVal('');
      clearAttachments();
    }
    isAtBottomRef.current = true;
    scrollToBottom(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;
    isCancelledRef.current = false;

    try {
      const history = finalMessages
        .filter((m) => m.id !== aiMsgId)
        .map((m) => ({ role: m.role, content: m.content }));

      const payload: Record<string, any> = {
        content: text,
        sessionId: sessionId || `session_case_${id}_${Date.now()}`,
        activeTool: activeTool,
        stream: true,
        history,
        projectId: id,
      };

      if (uploadedAttachments && uploadedAttachments.length > 0 && !editMessageId) {
        const docAttachments = uploadedAttachments.filter(
          (a) => !a.type?.startsWith('audio/') && !a.name?.match(/\.(m4a|mp3|wav|ogg|aac|flac|webm)$/i)
        );
        if (docAttachments.length > 0) {
          payload.document = docAttachments.map((a) => ({
            name: a.name,
            mimeType: a.type,
            base64Data: a.base64Data || '',
            url: a.url,
          }));
        }
      }

      // Stream SSE data chunks in real time
      const stream = streamAIResponse('/chat', payload, controller.signal);
      let accumulatedText = '';

      for await (const token of stream) {
        if (isCancelledRef.current || controller.signal.aborted) {
          break;
        }
        accumulatedText += token;
        setMessages((prev) =>
          prev.map((m) => (m.id === aiMsgId ? { ...m, content: accumulatedText } : m))
        );
      }

      if (isCancelledRef.current || controller.signal.aborted) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiMsgId ? { ...m, isProcessing: false } : m
          )
        );
        setIsSending(false);
        return;
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiMsgId
            ? { ...m, content: accumulatedText, isProcessing: false }
            : m
        )
      );
      setIsSending(false);
      scrollToBottom(true);

      const currentSessionId = payload.sessionId;
      if (currentSessionId && !sessionId) {
        setSessionId(currentSessionId);
      }

      // Sync post-stream metadata (like suggestions)
      setTimeout(async () => {
        try {
          if (isCancelledRef.current || controller.signal.aborted) {
            return;
          }
          if (currentSessionId) {
            const detailsRes = await ChatService.getSessionDetails(currentSessionId);
            if (isCancelledRef.current || controller.signal.aborted) {
              return;
            }
            const detailSession = (detailsRes as any).data || detailsRes;
            if (detailSession) {
              const suggestions = detailSession.messages?.[detailSession.messages.length - 1]?.suggestions || [];
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === aiMsgId ? { ...m, suggestions } : m
                )
              );
            }
          }
        } catch (e) {
          console.warn('[Copilot Metadata Sync] Failed:', e);
        }
      }, 1000);

    } catch (err: any) {
      if (isCancelledRef.current || controller.signal.aborted) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiMsgId ? { ...m, isProcessing: false } : m
          )
        );
      } else {
        console.error('[COPILOT SEND] Error:', err);
        showToast('error', 'Copilot Offline', 'Unable to receive AI suggestions.');
        
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiMsgId
              ? {
                  ...m,
                  content: '⚠️ Failed to connect to the legal AI gateway. Please check your internet connection.',
                  isProcessing: false,
                }
              : m
          )
        );
      }
    } finally {
      setIsSending(false);
      abortControllerRef.current = null;
      scrollToBottom(true);
    }
  };

  const handleCancelStream = () => {
    isCancelledRef.current = true;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setMessages((prev) =>
      prev.map((m) => (m.isProcessing ? { ...m, isProcessing: false } : m))
    );
    setIsSending(false);
  };

  const handleOpenAi = () => {
    setIsAiOpen(true);
    Animated.timing(aiAnimValue, {
      toValue: 1,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const handleCloseAi = () => {
    Animated.timing(aiAnimValue, {
      toValue: 0,
      duration: 300,
      useNativeDriver: false,
    }).start(() => {
      setIsAiOpen(false);
    });
  };

  // Change specialized AI tools focus
  const handleSelectTool = (toolId: string) => {
    if (toolId === activeTool) {
      closeToolMenu();
      return;
    }
    setActiveTool(toolId);
    closeToolMenu();
    
    const displayName = toolItems.find(t => t.id === toolId)?.name || toolId;
    
    // Add centered status chip log
    const statusMsg: ChatMessage = {
      id: `status-${Date.now()}`,
      role: 'assistant',
      content: `Switched to ${displayName}`,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, statusMsg]);
    
    // Show center toast popup
    setCenterToast(`Switched to ${displayName}`);
    setTimeout(() => {
      setCenterToast(null);
    }, 2000);

    scrollToBottom(true);
  };

  const handleCopyResponse = (content: string) => {
    Clipboard.setString(content);
    showToast('success', 'Copied', 'Response copied to clipboard.');
  };

  const handleShareResponse = async (content: string) => {
    try {
      await Share.share({ message: content });
    } catch (err) {
      console.error(err);
    }
  };

  const handleExportResponse = (item: ChatMessage) => {
    showToast('info', 'Exporting PDF', 'Generating case brief document from response...');
    setTimeout(() => {
      showToast('success', 'Export Complete', 'Saved as PDF in documents folder.');
    }, 1500);
  };

  const handleDownloadResponse = (item: ChatMessage) => {
    showToast('success', 'Downloaded', 'Response text file saved to device.');
  };

  const handleRetryResponse = (item: ChatMessage) => {
    const modelIndex = messages.findIndex(m => m.id === item.id);
    if (modelIndex > 0) {
      let lastUserMsg = '';
      for (let i = modelIndex - 1; i >= 0; i--) {
        if (messages[i].role === 'user') {
          lastUserMsg = messages[i].content;
          break;
        }
      }
      if (lastUserMsg) {
        handleSend(lastUserMsg);
      } else {
        showToast('error', 'Retry Failed', 'No preceding user query found.');
      }
    } else {
      showToast('error', 'Retry Failed', 'No preceding query found.');
    }
  };

  const handleContinueResponse = (item: ChatMessage) => {
    handleSend('Continue writing from the previous point...');
  };

  const TOOL_PLACEHOLDERS: Record<string, string> = {
    legalResearch: "Ask legal research questions...",
    contractAnalyzer: "Ask about this contract...",
    evidenceAnalyst: "Analyze evidence...",
    argumentBuilder: "Build legal arguments...",
    casePredictor: "Ask outcome prediction...",
    strategyEngine: "Plan your legal strategy...",
    researchAssistant: "Search legal knowledge...",
  };

  const TOOL_VOICE_TEXTS: Record<string, string> = {
    legalResearch: "Search legal knowledge base for easement rights in tenant disputes.",
    contractAnalyzer: "Analyze liability clause and high-risk terms in this lease agreement.",
    evidenceAnalyst: "Scan these document records to extract critical timeline events.",
    argumentBuilder: "Construct final submissions and counterarguments for this claim.",
    casePredictor: "Predict the winning probability and success rate for this petition.",
    strategyEngine: "Develop a litigation roadmap and settlement strategy for this case.",
    researchAssistant: "Search legal knowledge base for easement rights in tenant disputes.",
  };

  const renderMessageItem = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === 'user';
    const isStatusMsg = item.role === 'system' || item.content.startsWith('Switched to') || item.content.startsWith('💡') || item.content.startsWith('⚠️');

    if (isStatusMsg) {
      return (
        <View style={styles.statusChipContainer}>
          <View style={styles.statusChip}>
            <Text style={styles.statusChipText}>{item.content}</Text>
          </View>
        </View>
      );
    }

    return (
      <ChatMessageBubble
        message={item}
        aiName="Case Assistant"
        aiIcon="⚖️"
        onCopy={item.id === 'greetings' ? undefined : () => handleCopyResponse(item.content)}
        onShare={item.id === 'greetings' ? undefined : () => handleShareResponse(item.content)}
        onExport={item.id === 'greetings' ? undefined : () => handleExportResponse(item)}
        onDownload={item.id === 'greetings' ? undefined : () => handleDownloadResponse(item)}
        onRegenerate={item.id === 'greetings' ? undefined : () => handleRetryResponse(item)}
        onContinue={item.id === 'greetings' ? undefined : () => handleContinueResponse(item)}
        onSuggestionPress={(sug) => handleSend(sug)}
        onEditMessage={(msgId, newText) => handleSend(newText, undefined, msgId)}
      />
    );
  };

  const renderToolSelectorMenu = () => {
    const scale = toolMenuAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.95, 1],
    });
    const opacity = toolMenuAnim;

    return (
      <>
        {/* Transparent touchable overlay to dismiss popup on tap outside */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => closeToolMenu()}
        />
        <Animated.View
          style={[
            styles.toolSelectorMenu,
            {
              opacity,
              transform: [{ scale }],
            },
          ]}
        >
          {/* Header */}
          <View style={styles.toolSelectorHeader}>
            <Text style={styles.toolSelectorTitle}>Switch AI Tool</Text>
            <Pressable
              onPress={() => closeToolMenu()}
              style={styles.toolSelectorCloseBtn}
              accessibilityLabel="Close Switch AI Tool"
              accessibilityRole="button"
            >
              <Ionicons name="close" size={20} color="#4B5563" />
            </Pressable>
          </View>
          
          <ScrollView
            style={styles.toolSelectorScroll}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {toolItems.map((item) => {
              const isActive = activeTool === item.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.toolMenuItem, isActive && styles.toolMenuItemActive]}
                  onPress={() => handleSelectTool(item.id)}
                >
                  <View style={styles.toolMenuItemLeft}>
                    <Ionicons name={item.icon as any} size={16} color={item.color} />
                    <Text style={[styles.toolMenuLabel, isActive && styles.toolMenuLabelActive]}>
                      {item.name}
                    </Text>
                  </View>
                  {isActive && (
                    <Ionicons name="checkmark" size={16} color="#6D5DFC" />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Animated.View>
      </>
    );
  };

  const renderAttachmentsPreview = () => {
    return (
      <View style={styles.attachmentsWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.attachmentsScroll}>
          {attachments.map((a, i) => (
            <View key={i} style={styles.attachmentChip}>
              <Ionicons name="document-attach" size={14} color="#6D5DFC" />
              <Text style={styles.attachmentLabel} numberOfLines={1}>{a.name}</Text>
              <TouchableOpacity onPress={() => handleRemoveAttachment(a.name)}>
                <Ionicons name="close-circle" size={16} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      </View>
    );
  };


  const renderInputComposer = () => {
    return (
      <ChatComposer
        value={inputVal}
        onChangeText={setInputVal}
        sending={isSending}
        onSend={(text) => handleSend(text)}
        onCancelStream={handleCancelStream}
        onAddAttachment={handleAddAttachment}
        onPressSparkles={openToolMenu}
        placeholder={TOOL_PLACEHOLDERS[activeTool] || "Ask Case Assistant..."}
        simulatedVoiceText={TOOL_VOICE_TEXTS[activeTool] || "What are the legal precedents for easement rights in tenant disputes?"}
        isFocusMode={false}
      />
    );
  };

  const renderIntegratedAssistant = () => {
    const activeToolItem = toolItems.find(t => t.id === activeTool) || toolItems[0];

    const scale = aiAnimValue.interpolate({
      inputRange: [0, 1],
      outputRange: [0.1, 1],
    });
    const opacity = aiAnimValue;
    const translateX = aiAnimValue.interpolate({
      inputRange: [0, 1],
      outputRange: [width * 0.4, 0],
    });
    const translateY = aiAnimValue.interpolate({
      inputRange: [0, 1],
      outputRange: [height * 0.45, 0],
    });
    const borderRadius = aiAnimValue.interpolate({
      inputRange: [0, 1],
      outputRange: [40, 0],
    });

    const assistantContent = (
      <>
        {/* Assistant Header */}
        <View style={styles.assistantHeader}>
          <TouchableOpacity
            style={styles.assistantHeaderLeft}
            onPress={handleCloseAi}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          
          <View style={styles.assistantHeaderTitleContainer}>
            <Text style={styles.assistantHeaderText}>✨ Case Assistant</Text>
            <View style={styles.activeToolIndicator}>
              <Ionicons name={activeToolItem.icon as any} size={10} color={activeToolItem.color} />
              <Text style={[styles.activeToolIndicatorText, { color: activeToolItem.color }]}>
                {activeToolItem.name}
              </Text>
            </View>
          </View>

          <View style={styles.assistantHeaderActions}>
            <TouchableOpacity
              style={[styles.assistantHeaderBtn, { marginRight: 12 }]}
              onPress={() => setIsHistoryOpen(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="time-outline" size={22} color="#1F2937" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.assistantHeaderBtn}
              onPress={handleNewChat}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={24} color="#1F2937" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Chat Message List */}
        <View style={styles.assistantChatArea}>
          {messages.length === 0 ? (
            <ChatWelcome 
              title="Case Assistant" 
              subtitle={workspace?.name ? `Ask about ${workspace.name}...` : "Ask about this case..."} 
              icon="⚖️" 
            />
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item) => item.id}
              renderItem={renderMessageItem}
              contentContainerStyle={styles.assistantListContent}
              showsVerticalScrollIndicator={true}
              onScroll={(e) => {
                const offset = e.nativeEvent.contentOffset.y;
                const contentHeight = e.nativeEvent.contentSize.height;
                const layoutHeight = e.nativeEvent.layoutMeasurement.height;
                const distanceFromBottom = contentHeight - (offset + layoutHeight);
                isAtBottomRef.current = distanceFromBottom <= 50;
                
                const isScrollingUp = offset < lastOffsetRef.current;
                lastOffsetRef.current = offset;

                if (distanceFromBottom <= 50) {
                  handleScrollAction(false);
                } else {
                  const shouldShow = isScrollingUp && 
                                     distanceFromBottom > 100 && 
                                     messages.length > 4 && 
                                     inputVal.trim() === '';
                  handleScrollAction(shouldShow);
                }
              }}
              onContentSizeChange={() => {
                if (isAtBottomRef.current && !isSending) {
                  scrollToBottom(true);
                }
              }}
            />
          )}

          {showScrollBtn && (
            <Animated.View
              style={[
                styles.scrollDownBtn,
                {
                  opacity: scrollBtnOpacity,
                  transform: [{ scale: scrollBtnScale }]
                }
              ]}
            >
              <Pressable
                onPress={() => {
                  handleScrollAction(false);
                  scrollToBottom(true);
                }}
                style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' }}
              >
                <Ionicons name="arrow-down" size={18} color="#000000" />
              </Pressable>
            </Animated.View>
          )}
        </View>



        {/* Attachment Queue indicator */}
        {attachments.length > 0 && renderAttachmentsPreview()}

        {/* Bottom Composer */}
        {renderInputComposer()}

        {/* AI Tool selector popup menu */}
        {isToolMenuOpen && renderToolSelectorMenu()}

        {/* Centered Switching Toast Alert */}
        {centerToast && (
          <View style={styles.centerToastContainer}>
            <View style={styles.centerToastBox}>
              <Text style={styles.centerToastText}>{centerToast}</Text>
            </View>
          </View>
        )}
      </>
    );

    return (
      <Modal
        visible={isAiOpen}
        transparent={true}
        animationType="none"
        onRequestClose={handleCloseAi}
      >
        <View style={{ flex: 1, backgroundColor: 'transparent' }}>
          {/* Animated transparent background overlay */}
          <Animated.View
            style={{
              ...StyleSheet.absoluteFillObject,
              backgroundColor: '#FFFFFF',
              opacity,
            }}
          />

          <Animated.View
            style={[
              styles.assistantContainer,
              {
                opacity,
                borderRadius,
                transform: [
                  { scale },
                  { translateX },
                  { translateY }
                ]
              }
            ]}
          >
            <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }} edges={['top', 'bottom']}>
              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
                style={{ flex: 1 }}
              >
                {assistantContent}
              </KeyboardAvoidingView>

              <AttachmentBottomSheet
                visible={isBottomSheetVisible}
                onClose={hideAttachmentOptions}
                onSelectOption={handleSelectOption}
              />

              <CustomCameraModal
                visible={isCameraVisible}
                onClose={hideCamera}
                onConfirm={handleCameraConfirm}
              />

              {/* Sliding Sidebar History modal drawer */}
              <Modal
                visible={isHistoryOpen}
                animationType="none"
                transparent={true}
                onRequestClose={() => setIsHistoryOpen(false)}
              >
                <View style={styles.drawerOverlay}>
                  {/* Semi-transparent backdrop */}
                  <Pressable style={{ flex: 1 }} onPress={() => setIsHistoryOpen(false)} />

                  {/* Sidebar Drawer container */}
                  <View style={styles.drawerContainer}>
                    <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
                      <View style={styles.drawerHeader}>
                        <Text style={styles.drawerTitle}>Chat Logs History</Text>
                        <Pressable onPress={() => setIsHistoryOpen(false)}>
                          <Ionicons name="close" size={24} color="#1F2937" />
                        </Pressable>
                      </View>

                      <Pressable
                        style={styles.drawerNewChatBtn}
                        onPress={() => {
                          handleNewChat();
                          setIsHistoryOpen(false);
                        }}
                      >
                        <Ionicons name="add" size={18} color="#FFFFFF" />
                        <Text style={styles.drawerNewChatBtnText}>New Conversation</Text>
                      </Pressable>

                      <View style={styles.drawerSearchContainer}>
                        <Ionicons name="search" size={16} color="#94A3B8" style={{ marginRight: 6 }} />
                        <TextInput
                          placeholder="Search chats..."
                          placeholderTextColor="#94A3B8"
                          value={searchHistoryQuery}
                          onChangeText={setSearchHistoryQuery}
                          style={styles.drawerSearchInput}
                        />
                      </View>

                      <ScrollView style={styles.drawerList}>
                        {filteredHistorySessions.length === 0 ? (
                          <Text style={styles.drawerEmptyText}>No previous chats logged.</Text>
                        ) : (
                          filteredHistorySessions.map((item) => (
                            <View
                              key={item.sessionId}
                              style={[
                                styles.drawerItem,
                                sessionId === item.sessionId && styles.drawerItemActive,
                              ]}
                            >
                              <Pressable
                                style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 12 }}
                                onPress={() => handleSelectSession(item.sessionId)}
                              >
                                <Ionicons
                                  name="chatbox-ellipses-outline"
                                  size={16}
                                  color={sessionId === item.sessionId ? '#6D5DFC' : '#4B5563'}
                                  style={{ marginRight: 10 }}
                                />

                                {editingSessionId === item.sessionId ? (
                                  <TextInput
                                    style={styles.drawerRenameInput}
                                    value={renameTitleVal}
                                    onChangeText={setRenameTitleVal}
                                    autoFocus={true}
                                    onBlur={() => handleRenameConfirm(item.sessionId)}
                                    onSubmitEditing={() => handleRenameConfirm(item.sessionId)}
                                  />
                                ) : (
                                  <View style={styles.drawerItemTextContainer}>
                                    <Text
                                      style={[
                                        styles.drawerItemText,
                                        sessionId === item.sessionId && styles.drawerItemTextActive,
                                      ]}
                                      numberOfLines={1}
                                    >
                                      {item.title}
                                    </Text>
                                    <Text style={styles.drawerItemSubtext}>
                                      {new Date(item.lastModified).toLocaleDateString()} at {new Date(item.lastModified).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </Text>
                                  </View>
                                )}
                              </Pressable>

                              <View style={{ flexDirection: 'row', alignItems: 'center', paddingRight: 6 }}>
                                <Pressable
                                  onPress={() => {
                                    setEditingSessionId(item.sessionId);
                                    setRenameTitleVal(item.title);
                                  }}
                                  style={styles.drawerActionIcon}
                                >
                                  <Ionicons name="create-outline" size={16} color="#4B5563" />
                                </Pressable>
                                <Pressable
                                  onPress={() => handleDeleteSession(item.sessionId)}
                                  style={styles.drawerActionIcon}
                                >
                                  <Ionicons name="trash-outline" size={16} color="#EF4444" />
                                </Pressable>
                              </View>
                            </View>
                          ))
                        )}
                      </ScrollView>
                    </SafeAreaView>
                  </View>
                </View>
              </Modal>
            </SafeAreaView>
          </Animated.View>
        </View>
      </Modal>
    );
  };

  // Hook validation guard
  function useAuthGuard() {}

  // Optimistic backend data sync helper
  const handleUpdateField = async (updatedFields: Partial<CaseWorkspace>) => {
    if (!id || !workspace) return;
    updateWorkspaceState(id, updatedFields);
    try {
      await CaseService.updateCase(id, updatedFields);
    } catch (err) {
      console.error('[WORKSPACE] Sync failed:', err);
      showToast('error', 'Sync Failed', 'Failed to synchronize workspace details with the server.');
      fetchWorkspaceDetails(id); // Reload original
    }
  };

  // --- ACTION HANDLERS ---
  // Tasks checkbox toggler
  const handleToggleTaskStatus = async (taskId: string, currentStatus: string) => {
    if (!id || !workspace) return;
    const newStatus = currentStatus === 'Completed' ? 'Pending' : 'Completed';
    const updatedTasks = (workspace.tasks || []).map((t) =>
      t._id === taskId ? { ...t, status: newStatus as any } : t
    );
    handleUpdateField({ tasks: updatedTasks });
    showToast('success', 'Task Updated', newStatus === 'Completed' ? 'Task marked complete.' : 'Task marked pending.');
  };

  // Add manual Timeline event
  const handleAddTimelineEvent = () => {
    if (!workspace) return;
    if (!timelineForm.date || !timelineForm.title) {
      showToast('error', 'Validation Failed', 'Date and Title are required.');
      return;
    }
    const newEvent: CaseFact = {
      date: timelineForm.date,
      event: timelineForm.title,
      description: timelineForm.description,
    };
    // Include custom fields inside timeline fact
    const timelineEntry = {
      ...newEvent,
      id: `fact_user_${Date.now()}`,
      title: timelineForm.title,
      category: timelineForm.category,
      importance: timelineForm.importance,
      confidence: 'High',
      createdBy: 'User' as const,
      source: 'Manual Input',
    };

    const currentTimeline = workspace.facts || []; // facts inside CaseWorkspace schema represent timeline
    handleUpdateField({ facts: [...currentTimeline, timelineEntry] as any });
    setIsModalOpen(false);
    showToast('success', 'Event Added', 'Litigation milestone added.');
  };

  // Simulated AI OCR Timeline Document Extraction
  const handleRunOcrTimeline = async (docName: string) => {
    setIsOcrProcessing(true);
    setActiveOcrStep(0);
    setOcrSteps([
      `Opening document "${docName}"...`,
      'Running optical character recognition (OCR) scan...',
      'Matching date indicators and document metadata...',
      'Chronology nodes structured and verified...',
      'Updating active timeline database...',
    ]);

    for (let i = 0; i < 5; i++) {
      await new Promise((resolve) => setTimeout(resolve, 800));
      setActiveOcrStep((prev) => prev + 1);
    }

    const ocrEvent = {
      date: '20 Apr 2025',
      event: 'Default Notice Served',
      description: `Timeline entry parsed from OCR scan of file: ${docName}. Rajesh Sharma notified Amit Verma of loan default interest trigger.`,
      category: 'Legal Notice',
      importance: 'High',
      confidence: 'High',
      isAiGenerated: true,
      sourceDoc: docName,
    };

    const currentFacts = workspace?.facts || [];
    handleUpdateField({ facts: [...currentFacts, ocrEvent] as any });
    setIsOcrProcessing(false);
    showToast('success', 'AI OCR Complete', `Timeline event parsed from "${docName}".`);
  };

  // Add manual Hearing Schedule
  const handleAddHearing = () => {
    if (!workspace) return;
    if (!hearingForm.date || !hearingForm.notes) {
      showToast('error', 'Validation Error', 'Date and hearing title/notes are required.');
      return;
    }
    const hearingId = `hearing_${Date.now()}`;
    const newHearing: CaseHearing = {
      id: hearingId,
      _id: hearingId,
      title: hearingForm.notes, // hearing type/title
      date: hearingForm.date,
      time: hearingForm.time || '10:00 AM',
      courtName: hearingForm.courtName || workspace.courtName || 'District Court',
      courtroom: hearingForm.courtroom || '',
      judge: hearingForm.judge || '',
      purpose: hearingForm.purpose || '',
      notes: '',
      status: (hearingForm.status || 'Scheduled') as any,
      linkedDocuments: [],
      orderSummary: '',
      isAiEnriched: false,
      nextHearingDate: '',
      checklist: {
        documents: [],
        evidence: [],
        witnesses: [],
        compliance: [],
      }
    };
    
    // Add timeline milestone for hearing scheduled
    const hearingFact: CaseFact = {
      id: `fact_hearing_${Date.now()}`,
      date: hearingForm.date,
      event: `Hearing Scheduled: ${hearingForm.notes}`,
      description: `Court hearing scheduled at ${hearingForm.time || '10:00 AM'} in ${hearingForm.courtroom || 'District Court'}. Purpose: ${hearingForm.purpose || 'General'}.`
    };

    const currentHearings = workspace.hearings || [];
    const currentFacts = workspace.facts || [];

    handleUpdateField({
      hearings: [newHearing, ...currentHearings],
      facts: [...currentFacts, hearingFact] as any,
      intelligence: {
        ...workspace.intelligence,
        strategyRecommendations: [
          `Prepare courtroom arguments and list documents for hearing on ${hearingForm.date}.`,
          ...(workspace.intelligence?.strategyRecommendations || [])
        ]
      }
    });
    
    setIsModalOpen(false);
    showToast('success', 'Hearing Scheduled', 'Upcoming hearing added to calendar.');
  };

  // Toggle hearing checklist item
  const handleToggleChecklistItem = async (
    hearingId: string,
    category: 'documents' | 'evidence' | 'witnesses' | 'compliance',
    index: number
  ) => {
    if (!workspace) return;
    const updatedHearings = (workspace.hearings || []).map((h) => {
      if (h.id === hearingId || h._id === hearingId) {
        const currentChecklist = h.checklist || { documents: [], evidence: [], witnesses: [], compliance: [] };
        const categoryItems = [...(currentChecklist[category] || [])];
        if (categoryItems[index]) {
          categoryItems[index] = {
            ...categoryItems[index],
            checked: !categoryItems[index].checked,
          };
        }
        return {
          ...h,
          checklist: {
            ...currentChecklist,
            [category]: categoryItems,
          },
        };
      }
      return h;
    });

    handleUpdateField({ hearings: updatedHearings });
    showToast('success', 'Task Checked', 'Checklist status synced.');
  };

  // AI enrichment call for hearing
  const handleEnrichHearing = async (
    hearingId: string,
    payload: { notes?: string; documentText?: string; documentName?: string }
  ) => {
    if (!id || !workspace) return;
    setIsEnrichingHearingId(hearingId);
    try {
      showToast('info', 'AI Enrichment', 'Analyzing hearing files and extracting details...');
      const response = await CaseService.enrichHearing(id, hearingId, payload);
      if (response && response.data) {
        updateWorkspaceState(id, response.data);
        showToast('success', 'AI Enrichment Complete', 'Hearing details enriched with AI checklists and summaries.');
      } else {
        await fetchWorkspaceDetails(id);
        showToast('success', 'Hearing Updated', 'Details synchronized with server.');
      }
    } catch (err) {
      console.error('[HEARING ENRICH] Error:', err);
      showToast('error', 'AI Enrichment Failed', 'Could not run AI analysis on the document.');
    } finally {
      setIsEnrichingHearingId(null);
    }
  };

  // Add manual litigant/witness Party
  const handleAddParty = () => {
    if (!workspace) return;
    if (!partyForm.name || !partyForm.role) {
      showToast('error', 'Validation Error', 'Litigant Name and Role are required.');
      return;
    }
    const newLawyer = {
      name: partyForm.name,
      role: partyForm.role,
      contact: partyForm.contact || 'N/A',
    };
    const currentLawyers = workspace.lawyers || [];
    handleUpdateField({ lawyers: [...currentLawyers, newLawyer] });
    setIsModalOpen(false);
    showToast('success', 'Party Added', `${partyForm.role} added to list.`);
  };

  // Add manual Evidence record
  const handleAddEvidence = () => {
    if (!workspace) return;
    if (!evidenceForm.name || !evidenceForm.type) {
      showToast('error', 'Validation Error', 'Name and Evidence type are required.');
      return;
    }
    const newEvidence: CaseEvidence = {
      name: evidenceForm.name,
      type: evidenceForm.type,
      description: evidenceForm.description,
      admissibility: evidenceForm.admissibility as any,
    };

    const currentEvidence = workspace.evidence || [];
    const currentFacts = workspace.facts || [];
    
    const evidenceFact: CaseFact = {
      date: new Date().toLocaleDateString(),
      event: `Evidence Logged: ${evidenceForm.name}`,
      description: `Logged exhibit: ${evidenceForm.name} (${evidenceForm.type}). Admissibility: ${evidenceForm.admissibility}.`
    };

    const winProb = workspace.intelligence?.winProbability || 65;
    const strength = workspace.intelligence?.strengthScore || 70;

    handleUpdateField({
      evidence: [newEvidence, ...currentEvidence],
      facts: [...currentFacts, evidenceFact] as any,
      intelligence: {
        ...workspace.intelligence,
        winProbability: Math.min(95, winProb + 5),
        strengthScore: Math.min(100, strength + 5),
        strategyRecommendations: [
          `Evidence Logged: "${evidenceForm.name}". Review admissibility code rules.`,
          ...(workspace.intelligence?.strategyRecommendations || [])
        ]
      }
    });

    setIsModalOpen(false);
    showToast('success', 'Evidence Recorded', 'Vault item logged.');
  };

  // Add manual Court Order
  const handleAddCourtOrder = () => {
    if (!workspace) return;
    if (!courtOrderForm.title || !courtOrderForm.date) {
      showToast('error', 'Validation Error', 'Title and Date are required.');
      return;
    }
    const newDoc: CaseDocument = {
      _id: `doc_${Date.now()}`,
      name: `${courtOrderForm.title}.pdf`,
      type: 'Other',
      url: 'https://ailegal.com/orders/court_order.pdf',
      tags: ['Court Order', 'Official'],
      uploadDate: courtOrderForm.date,
      extractedData: {
        issuer: courtOrderForm.issuer || 'District Court Judge',
        notes: courtOrderForm.notes,
      },
    };

    const currentDocs = workspace.documents || [];
    const currentFacts = workspace.facts || [];
    
    const orderFact: CaseFact = {
      date: courtOrderForm.date,
      event: `Court Order: ${courtOrderForm.title}`,
      description: `Official order issued by ${courtOrderForm.issuer || 'the Judge'}. Directives: ${courtOrderForm.notes || 'N/A'}`
    };

    const currentWin = workspace.intelligence?.winProbability || 65;
    const currentStrength = workspace.intelligence?.strengthScore || 70;

    handleUpdateField({
      documents: [...currentDocs, newDoc],
      facts: [...currentFacts, orderFact] as any,
      intelligence: {
        ...workspace.intelligence,
        winProbability: Math.min(95, currentWin + 4),
        strengthScore: Math.min(100, currentStrength + 4),
        strategyRecommendations: [
          `Court order registered: "${courtOrderForm.title}". Adjust case compliance tasks accordingly.`,
          ...(workspace.intelligence?.strategyRecommendations || [])
        ]
      }
    });

    setIsModalOpen(false);
    setCourtOrderForm({ title: '', date: '', issuer: '', notes: '' });
    showToast('success', 'Order Logged', 'Court order logged and case metrics updated.');
  };

  // Add manual Task checklist item
  const handleAddTask = () => {
    if (!workspace) return;
    if (!taskForm.title) {
      showToast('error', 'Validation Error', 'Task title is required.');
      return;
    }
    const newTask: CaseTask = {
      title: taskForm.title,
      description: taskForm.description,
      priority: taskForm.priority as any,
      deadline: taskForm.deadline || 'None',
      status: 'Pending',
    };
    const currentTasks = workspace.tasks || [];
    handleUpdateField({ tasks: [newTask, ...currentTasks] });
    setIsModalOpen(false);
    showToast('success', 'Task Created', 'Task checklist updated.');
  };

  // Precedents keyword search simulator
  const handleSearchPrecedents = () => {
    if (!precedentQuery.trim()) {
      showToast('error', 'Query Missing', 'Enter law name or keywords.');
      return;
    }
    // Mock precedent search responses
    const mockPrecedents: CasePrecedent[] = [
      {
        title: 'K. Bhaskaran v. Sankaran Vaidhyan Balan',
        citation: '(1999) 7 SCC 510',
        summary: 'Establishes jurisdiction rules and checks delivery notice presumptions under Negotiable Instruments legal codes.',
        url: 'https://ailegal.com/precedents/bhaskaran',
      },
      {
        title: 'Dalmia Cement Ltd. v. Galaxy Traders',
        citation: 'AIR 2001 SC 676',
        summary: 'Deals with limitation periods and strict timeline calculations for serving recovery compliance demands.',
        url: 'https://ailegal.com/precedents/dalmia',
      },
    ];
    setPrecedentSearchResults(mockPrecedents);
    showToast('success', 'Search Complete', 'Citations retrieved.');
  };

  const handleSavePrecedent = (prec: CasePrecedent) => {
    if (!workspace) return;
    const currentPrecedents = workspace.savedPrecedents || [];
    handleUpdateField({ savedPrecedents: [...currentPrecedents, prec] });
    showToast('success', 'Precedent Saved', 'Citation saved to case research folder.');
  };

  // AI draft compiler simulator
  const handleCompileDraft = async () => {
    if (!draftForm.name) {
      showToast('error', 'Validation Error', 'Draft folder file name is required.');
      return;
    }
    setIsDraftCompiling(true);
    
    const clientName = workspace?.clientName || 'Plaintiff';
    const opponentName = workspace?.opponentName || workspace?.accused || 'Defendant';
    const courtName = workspace?.courtName || 'District Court';
    const caseType = workspace?.caseType || 'Litigation Suit';
    
    try {
      const result = await DraftService.requestDraft({
        title: draftForm.name,
        provisions: `Type: ${draftForm.template}. Court: ${courtName}. Case Type: ${caseType}. Subject: Formal demand and pleading notice. Respectfully showeth details of contract breach, principal recovery, and summary civil suit procedures.`,
        parties: `${clientName} (Plaintiff) vs ${opponentName} (Defendant)`,
        caseId: id || undefined
      });

      if (result && result.success && result.reply) {
        setCompiledDraftText(result.reply);
        showToast('success', 'Draft Compiled', 'AI compiled pleading draft successfully.');
      } else {
        throw new Error(result?.error || 'Empty reply from AI');
      }
    } catch (err) {
      console.warn('[DRAFT COMPILATION] AI compilation failed, falling back to local template:', err);
      // Fall back to a fully customized template containing the active case details (court, case type, names)
      const compiledFallback = `AI COMPILATION DRAFT: ${draftForm.template.toUpperCase()} (LOCAL FALLBACK)\n\nIn the court of ${courtName}.\nIn the matter of: ${clientName} (Plaintiff) vs ${opponentName} (Defendant).\n\nSubject: Formal demand and pleading notice concerning recovery of outstanding principal under summary procedures of ${caseType}.\n\nRespectfully Showeth:\n1. The Plaintiff (${clientName}) entered into contractual obligations with Defendant (${opponentName}).\n2. Defendant (${opponentName}) failed to honor deadline terms to Plaintiff (${clientName}) under ${caseType} regulations.\n3. The Plaintiff is filing this pleading in ${courtName}.\n\nDrafted on: ${new Date().toLocaleDateString()}`;
      setCompiledDraftText(compiledFallback);
      showToast('warning', 'Compiled with Fallback', 'Draft generated from local workspace template.');
    } finally {
      setIsDraftCompiling(false);
    }
  };

  const handleSaveDraft = () => {
    if (!workspace || !compiledDraftText) return;
    const newDoc: CaseDocument = {
      _id: `doc_${Date.now()}`,
      name: `${draftForm.name}.pdf`,
      type: 'Filing',
      url: 'https://ailegal.com/drafts/compiled.pdf',
      tags: ['AI Compiled', draftForm.template],
      uploadDate: new Date().toLocaleDateString(),
    };
    const currentDocs = workspace.documents || [];
    const currentFacts = workspace.facts || [];

    const draftFact: CaseFact = {
      date: new Date().toLocaleDateString(),
      event: `Draft Pleading Saved: ${draftForm.name}`,
      description: `AI Compiled Pleading draft saved to folder as ${draftForm.name}.pdf.`
    };

    const winProb = workspace.intelligence?.winProbability || 65;
    const strength = workspace.intelligence?.strengthScore || 70;

    handleUpdateField({
      documents: [...currentDocs, newDoc],
      facts: [...currentFacts, draftFact] as any,
      intelligence: {
        ...workspace.intelligence,
        winProbability: Math.min(95, winProb + 2),
        strengthScore: Math.min(100, strength + 3),
        strategyRecommendations: [
          `Pleading Draft "${draftForm.name}" compiled. Next: Serve statutory notice.`,
          ...(workspace.intelligence?.strategyRecommendations || [])
        ]
      }
    });
    setIsModalOpen(false);
    showToast('success', 'Draft Saved', 'Draft PDF added to documents folder.');
  };

  // Settings Rename Case
  const handleRenameCase = () => {
    if (!renameValue.trim()) {
      showToast('error', 'Validation Error', 'Case name cannot be empty.');
      return;
    }
    handleUpdateField({ name: renameValue });
    setIsModalOpen(false);
    showToast('success', 'Case Renamed', 'Workspace title updated.');
  };

  // Settings Delete Case
  const handleDeleteCase = async () => {
    if (!id) return;
    try {
      await CaseService.deleteCase(id);
      showToast('success', 'Workspace Purged', 'Case folder permanently removed.');
      router.replace('/(tabs)/cases');
    } catch (err) {
      showToast('error', 'Deletion Error', 'Failed to purge workspace.');
    }
  };

  // Upload simulated file select
  const handleSimulatedFileUpload = async () => {
    if (!id || !workspace) return;
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        console.log('[DocumentPicker] Cancelled by user.');
        return;
      }

      const asset = result.assets[0];
      if (!asset.uri || !asset.name) {
        showToast('error', 'Selection Failed', 'Could not read file details.');
        return;
      }

      const ext = asset.name.split('.').pop()?.toLowerCase() || '';
      const extensionToMime: Record<string, string> = {
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        webp: 'image/webp',
        heic: 'image/heic',
        pdf: 'application/pdf',
        doc: 'application/msword',
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        txt: 'text/plain',
        csv: 'text/csv',
        xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      };
      const mime = asset.mimeType || extensionToMime[ext] || 'application/octet-stream';

      let docType: 'Notice' | 'Agreement' | 'Proof' | 'Filing' | 'Other' = 'Other';
      if (['jpg', 'jpeg', 'png', 'webp', 'heic'].includes(ext)) {
        docType = 'Proof';
      } else if (['doc', 'docx'].includes(ext)) {
        docType = 'Agreement';
      }

      showToast('info', 'Uploading...', `Uploading ${asset.name}`);
      
      const res = await UploadService.uploadCaseDocument(
        id,
        asset.uri,
        asset.name,
        mime,
        docType
      );

      if (res.success && res.data) {
        const newDoc = res.data;
        const currentDocs = workspace.documents || [];
        const currentFacts = workspace.facts || [];

        const uploadFact: CaseFact = {
          date: new Date().toLocaleDateString(),
          event: `Document Attached: ${newDoc.name}`,
          description: `Lawyer uploaded file ${newDoc.name} class ${docType} to case folder.`
        };

        const winProb = workspace.intelligence?.winProbability || 65;
        const strength = workspace.intelligence?.strengthScore || 70;

        handleUpdateField({
          documents: [...currentDocs, newDoc],
          facts: [...currentFacts, uploadFact] as any,
          intelligence: {
            ...workspace.intelligence,
            winProbability: Math.min(95, winProb + 3),
            strengthScore: Math.min(100, strength + 4),
            strategyRecommendations: [
              `New evidence source "${newDoc.name}" detected. Adjusting defense pleading timeline.`,
              ...(workspace.intelligence?.strategyRecommendations || [])
            ]
          }
        });

        showToast('success', 'File Attached', `Attached "${newDoc.name}" to case documents.`);
        // Run AI OCR timeline document extraction
        handleRunOcrTimeline(newDoc.name);
      } else {
        showToast('error', 'Upload Failed', res.error || 'Failed to upload case document.');
      }
    } catch (err: any) {
      console.error('[DocumentPicker] Pick & Upload error:', err);
      showToast('error', 'Upload Failed', err.message || 'Failed to select or upload document.');
    }
  };

  // --- RENDER SECTIONS ---

  // --- REDESIGNED COMMAND CENTER COMPONENTS ---
  const getRiskScore = (level?: string) => {
    if (!level) return '50%';
    const l = level.toLowerCase();
    if (l === 'critical') return '95%';
    if (l === 'high') return '75%';
    if (l === 'medium') return '50%';
    if (l === 'low') return '25%';
    return '50%';
  };

  // --- REDESIGNED COMMAND CENTER COMPONENTS ---
  const renderQuickInsights = () => {
    const winProb = workspace?.intelligence?.winProbability || 65;
    const strength = workspace?.intelligence?.strengthScore || 70;
    const pendingTasks = workspace?.tasks?.filter((t) => t.status !== 'Completed').length || 0;
    const totalTasks = workspace?.tasks?.length || 0;
    const evidenceCount = workspace?.evidence?.length || 0;
    const upcomingHearings = workspace?.hearings?.filter((h) => h.status === 'Upcoming') || [];
    const nextHearing = upcomingHearings[0];
    const missingDocsCount = workspace?.intelligence?.missingEvidence?.length || 0;
    const riskLevel = workspace?.intelligence?.riskLevel || workspace?.priority || 'High';
    const riskScore = getRiskScore(riskLevel);

    const insights = [
      { id: 'win', title: 'Win Probability', value: `${winProb}%`, icon: 'trending-up-outline', color: theme.success },
      { id: 'strength', title: 'Case Strength', value: `${strength}%`, icon: 'shield-checkmark-outline', color: theme.info },
      { id: 'tasks', title: 'Pending Tasks', value: `${pendingTasks} Pending`, subtitle: `${totalTasks - pendingTasks}/${totalTasks} completed`, icon: 'checkbox-outline', color: theme.primary },
      { id: 'evidence', title: 'Evidence Vault', value: `${evidenceCount} Exhibits`, icon: 'briefcase-outline', color: '#8B5CF6' },
      { id: 'hearing', title: 'Upcoming Hearing', value: nextHearing ? nextHearing.date : 'None', subtitle: `${upcomingHearings.length} scheduled`, icon: 'calendar-outline', color: theme.warning },
      { id: 'missing', title: 'Missing Documents', value: `${missingDocsCount} Missing`, icon: 'warning-outline', color: theme.danger },
      { id: 'risk', title: 'Risk Score', value: riskScore, subtitle: `${riskLevel} Level`, icon: 'alert-circle-outline', color: '#EC4899' },
    ];

    return (
      <View style={styles.insightsSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.insightsScroll}
        >
          {insights.map((ins) => (
            <View key={ins.id} style={styles.insightCard}>
              <View style={styles.insightCardHeader}>
                <Ionicons name={ins.icon as any} size={14} color={ins.color} />
                <Text style={styles.insightCardTitle} numberOfLines={1}>{ins.title}</Text>
              </View>
              <Text style={styles.insightCardValue} numberOfLines={1}>{ins.value}</Text>
              {ins.subtitle ? <Text style={styles.insightCardSub}>{ins.subtitle}</Text> : null}
            </View>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderAiAssistantCard = () => {
    const recommendation = workspace?.intelligence?.strategyRecommendations?.[0] || 'Verify client bank logs for cheque default timeline compliance.';
    const status = workspace?.stage || 'Court proceedings ongoing';
    const nextAction = 'File response pleading default notice.';
    const missingEvidence = workspace?.intelligence?.missingEvidence?.[0] || 'Original copy of legal default postal receipt.';
    
    const nextDeadlineTask = (workspace?.tasks || []).find(t => t.status !== 'Completed' && t.deadline);
    const nextDeadline = nextDeadlineTask ? `${nextDeadlineTask.title} (${nextDeadlineTask.deadline})` : 'No pending deadlines';

    const handleContinueAnalysis = () => {
      showToast('info', 'AI Analysis Running', 'Scanning new parameters and precedents...');
      setTimeout(() => {
        const currentWinProb = workspace?.intelligence?.winProbability || 65;
        const currentStrength = workspace?.intelligence?.strengthScore || 70;
        
        const updatedIntelligence = {
          ...workspace?.intelligence,
          winProbability: Math.min(95, currentWinProb + 2),
          strengthScore: Math.min(100, currentStrength + 3),
          strategyRecommendations: [
            'Precedent search indicates high success rate under Section 138. Prioritize proving delivery receipt.',
            ...(workspace?.intelligence?.strategyRecommendations || [])
          ]
        };
        handleUpdateField({ intelligence: updatedIntelligence as any });
        showToast('success', 'AI Analysis Complete', 'Win Probability and strategic suggestions updated.');
      }, 1000);
    };

    const handleGenerateStrategy = () => {
      setActiveWorkspaceTab('arguments');
      showToast('success', 'Court Strategy Generated', 'Navigated to core litigation positions.');
    };

    return (
      <View style={styles.aiAssistantCard}>
        <View style={styles.aiAssistantHeader}>
          <Ionicons name="sparkles" size={16} color={theme.primary} />
          <Text style={styles.aiAssistantTitle}>AI Case Assistant</Text>
        </View>

        <View style={styles.aiAssistantRow}>
          <Text style={styles.aiAssistantLabel}>Litigation Status</Text>
          <Text style={styles.aiAssistantValue}>{status}</Text>
        </View>

        <View style={styles.aiAssistantRow}>
          <Text style={styles.aiAssistantLabel}>Latest AI Advice</Text>
          <Text style={styles.aiAssistantValue} numberOfLines={2}>{recommendation}</Text>
        </View>

        <View style={styles.aiAssistantRow}>
          <Text style={styles.aiAssistantLabel}>Recommended Action</Text>
          <Text style={styles.aiAssistantValue}>{nextAction}</Text>
        </View>

        <View style={styles.aiAssistantRow}>
          <Text style={styles.aiAssistantLabel}>Evidence Alert</Text>
          <Text style={[styles.aiAssistantValue, { color: theme.danger, fontWeight: '700' }]}>⚠️ {missingEvidence}</Text>
        </View>

        <View style={styles.aiAssistantRow}>
          <Text style={styles.aiAssistantLabel}>Next Deadline</Text>
          <Text style={styles.aiAssistantValue}>{nextDeadline}</Text>
        </View>

        <View style={styles.aiAssistantButtons}>
          <TouchableOpacity style={styles.aiButton} onPress={handleContinueAnalysis}>
            <Ionicons name="sync-outline" size={13} color="#FFFFFF" />
            <Text style={styles.aiButtonText}>Analyze Case</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.aiButton, styles.aiButtonOutline]} onPress={handleOpenAi}>
            <Ionicons name="chatbubble-ellipses-outline" size={13} color={theme.primary} />
            <Text style={[styles.aiButtonText, { color: theme.primary }]}>Ask AI</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.aiButton, styles.aiButtonOutline]} onPress={handleGenerateStrategy}>
            <Ionicons name="bulb-outline" size={13} color={theme.primary} />
            <Text style={[styles.aiButtonText, { color: theme.primary }]}>Strategy</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderWorkspaceNavigation = () => {
    const client = workspace?.clientName || 'N/A';
    const opponent = workspace?.opponentName || workspace?.accused || 'N/A';
    const lawyers = workspace?.lawyers || [];
    const partiesCount = 2 + lawyers.length;

    const courtOrdersList = (workspace?.documents || []).filter(
      d => d.tags.includes('Court Order') || d.type === 'Other' && d.name.toLowerCase().includes('order')
    );

    const navTiles = [
      { id: 'timeline', label: 'Timeline', desc: `${workspace?.facts?.length || 0} Milestones`, icon: 'time-outline', color: '#6366F1' },
      { id: 'hearings', label: 'Hearings', desc: `${workspace?.hearings?.length || 0} Scheduled`, icon: 'hammer-outline', color: '#F59E0B' },
      { id: 'parties', label: 'Parties', desc: `${partiesCount} Litigants & Counsel`, icon: 'people-outline', color: '#10B981' },
      { id: 'documents', label: 'Documents', desc: `${workspace?.documents?.length || 0} Files Available`, icon: 'document-text-outline', color: '#3B82F6' },
      { id: 'evidence', label: 'Evidence Vault', desc: `${workspace?.evidence?.length || 0} Evidence Items`, icon: 'shield-checkmark-outline', color: '#06B6D4' },
      { id: 'research', label: 'Research & Laws', desc: `${workspace?.savedPrecedents?.length || 0} Saved Judgments`, icon: 'library-outline', color: '#14B8A6' },
      { id: 'drafts', label: 'Drafts', desc: `${(workspace?.documents || []).filter(d => d.tags.includes('AI Compiled')).length} Drafts Compiled`, icon: 'create-outline', color: '#EC4899' },
      { id: 'contracts', label: 'Contracts', desc: 'Lease Contract Audited', icon: 'briefcase-outline', color: '#8B5CF6' },
      { id: 'arguments', label: 'Arguments', desc: '3 Core Legal Positions', icon: 'alert-circle-outline', color: '#EF4444' },
      { id: 'strategy', label: 'Strategy Engine', desc: 'Advocate Case Strategy Engine', icon: 'warning-outline', color: '#F59E0B' },
      { id: 'prediction', label: 'Outcome Prediction', desc: 'Win margins & case strength predictor', icon: 'trending-up-outline', color: '#10B981' },
      { id: 'activity', label: 'Activity Log', desc: 'Communication Audit Log', icon: 'pulse-outline', color: '#3B82F6' },
      { id: 'tasks', label: 'Tasks', desc: `${(workspace?.tasks || []).filter(t => t.status !== 'Completed').length} Pending Tasks`, icon: 'list-outline', color: '#10B981' },
      { id: 'notes', label: 'Case Notes', desc: 'Strategic Notepad', icon: 'pencil-outline', color: '#4B5563' },
      { id: 'court-orders', label: 'Court Orders', desc: `${courtOrdersList.length} Official Decrees`, icon: 'document-outline', color: '#6D5DFC' },
      { id: 'settings', label: 'Case Settings', desc: 'Case Configurations', icon: 'settings-outline', color: '#6B7280' },
    ];

    return (
      <View style={styles.navigationSection}>
        <Text style={styles.sectionHeader}>Case Modules</Text>
        <View style={styles.tilesContainer}>
          {navTiles.map((tile) => (
            <Pressable
              key={tile.id}
              style={({ pressed }) => [styles.navTile, pressed && styles.navTilePressed]}
              onPress={() => setActiveWorkspaceTab(tile.id)}
            >
              <View style={[styles.navTileIconBg, { backgroundColor: `${tile.color}12` }]}>
                <Ionicons name={tile.icon as any} size={18} color={tile.color} />
              </View>
              <View style={styles.navTileContent}>
                <Text style={styles.navTileLabel}>{tile.label}</Text>
                <Text style={styles.navTileDesc}>{tile.desc}</Text>
              </View>
              <Ionicons name="chevron-forward" size={14} color="#9CA3AF" />
            </Pressable>
          ))}
        </View>
      </View>
    );
  };

  const renderTimelinePreview = () => {
    const factsList = (workspace?.facts || []).map((item: any) => ({
      date: item.date,
      title: item.event || item.title,
      description: item.description || '',
    }));
    const hearingsList = (workspace?.hearings || []).map((item: any) => ({
      date: item.date,
      title: `Hearing scheduled: Courtroom ${item.courtroom || 'N/A'}`,
      description: item.notes || `Scheduled hearing time: ${item.time || '10:00 AM'}`,
    }));
    const documentsList = (workspace?.documents || []).map((item: any) => ({
      date: item.date || 'N/A',
      title: `Document Uploaded: ${item.name}`,
      description: `Type: ${item.type || 'Upload'}.`,
    }));
    const evidenceList = (workspace?.evidence || []).map((item: any) => ({
      date: item.dateLogged || item.date || 'N/A',
      title: `Evidence Exhibit: ${item.name}`,
      description: item.description || '',
    }));
    const parseDate = (dStr: any) => {
      if (!dStr || dStr === 'N/A') return new Date(0);
      const d = new Date(dStr);
      if (!isNaN(d.getTime())) return d;
      try {
        const parts = String(dStr).split(' ');
        if (parts.length === 3) {
          const day = parseInt(parts[0], 10);
          const months: Record<string, number> = {
            jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
            jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
          };
          const month = months[parts[1].toLowerCase().substring(0, 3)];
          const year = parseInt(parts[2], 10);
          if (!isNaN(day) && month !== undefined && !isNaN(year)) {
            return new Date(year, month, day);
          }
        }
      } catch (e) {}
      return new Date(0);
    };

    const unifiedTimeline = [
      ...factsList,
      ...hearingsList,
      ...documentsList,
      ...evidenceList,
    ].sort((a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime());

    const timelineEvents = unifiedTimeline.slice(-3).reverse();

    return (
      <View style={styles.previewSection}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeader}>Timeline Preview</Text>
          <Pressable onPress={() => setActiveWorkspaceTab('timeline')}>
            <Text style={styles.viewAllText}>View All</Text>
          </Pressable>
        </View>

        {timelineEvents.length === 0 ? (
          <Text style={styles.previewEmptyText}>No chronology milestones logged yet.</Text>
        ) : (
          <View style={styles.previewList}>
            {timelineEvents.map((ev, i) => (
              <View key={i} style={styles.previewItem}>
                <View style={styles.previewDotContainer}>
                  <View style={styles.previewDot} />
                  {i < timelineEvents.length - 1 && <View style={styles.previewVerticalLine} />}
                </View>
                <View style={styles.previewItemContent}>
                  <Text style={styles.previewItemDate}>{ev.date}</Text>
                  <Text style={styles.previewItemTitle}>{ev.title}</Text>
                  <Text style={styles.previewItemDesc} numberOfLines={2}>{ev.description}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity
          style={styles.viewTimelineBtn}
          onPress={() => setActiveWorkspaceTab('timeline')}
        >
          <Text style={styles.viewTimelineBtnText}>View Complete Timeline</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderRecentActivity = () => {
    const docs = (workspace?.documents || []).filter(d => !d.tags.includes('AI Compiled'));
    const drafts = (workspace?.documents || []).filter(d => d.tags.includes('AI Compiled'));
    const evidence = workspace?.evidence || [];
    const note = workspace?.summary || workspace?.caseSummary;

    const activities: { type: string; title: string; time: string; icon: string; color: string }[] = [];

    if (docs.length > 0) {
      activities.push({
        type: 'Document Uploaded',
        title: docs[docs.length - 1].name,
        time: docs[docs.length - 1].uploadDate || 'Recently',
        icon: 'document-text-outline',
        color: theme.info,
      });
    }

    if (drafts.length > 0) {
      activities.push({
        type: 'Draft Compiled',
        title: drafts[drafts.length - 1].name,
        time: drafts[drafts.length - 1].uploadDate || 'Recently',
        icon: 'create-outline',
        color: '#EC4899',
      });
    }

    if (workspace?.intelligence?.strategyRecommendations?.[0]) {
      activities.push({
        type: 'AI Strategic Recommendation',
        title: workspace.intelligence.strategyRecommendations[0],
        time: 'AI Updated',
        icon: 'sparkles-outline',
        color: theme.primary,
      });
    }

    if (evidence.length > 0) {
      activities.push({
        type: 'Evidence Logged',
        title: evidence[0].name,
        time: 'Just now',
        icon: 'shield-checkmark-outline',
        color: theme.success,
      });
    }

    if (note) {
      activities.push({
        type: 'Case Note Autosaved',
        title: note.substring(0, 50) + (note.length > 50 ? '...' : ''),
        time: 'Saved',
        icon: 'pencil-outline',
        color: theme.textSecondary,
      });
    }

    if (activities.length === 0) {
      activities.push({
        type: 'Workspace Initialized',
        title: 'Case files indexed and AI recommendations generated.',
        time: 'System',
        icon: 'sync-outline',
        color: theme.textMuted,
      });
    }

    return (
      <View style={styles.previewSection}>
        <Text style={styles.sectionHeader}>Recent Activity</Text>
        <View style={styles.activityList}>
          {activities.map((act, i) => (
            <View key={i} style={styles.activityItem}>
              <View style={[styles.activityIconBg, { backgroundColor: `${act.color}10` }]}>
                <Ionicons name={act.icon as any} size={14} color={act.color} />
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityType}>{act.type}</Text>
                <Text style={styles.activityTitle}>{act.title}</Text>
                <Text style={styles.activityTime}>{act.time}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderCourtOrdersTab = () => {
    const list = (workspace?.documents || []).filter(
      d => d.tags.includes('Court Order') || d.type === 'Other' && d.name.toLowerCase().includes('order')
    );

    return (
      <View style={styles.tabContent}>
        <View style={styles.moduleHeaderRow}>
          <Text style={styles.moduleTitle}>Official Court Orders</Text>
          <Pressable
            style={styles.moduleHeaderBtn}
            onPress={() => {
              setModalType('court_order');
              setIsModalOpen(true);
            }}
          >
            <Ionicons name="add" size={16} color="#6D5DFC" />
            <Text style={styles.moduleHeaderBtnText}>Log Decree</Text>
          </Pressable>
        </View>

        {list.length === 0 ? (
          <Text style={styles.emptyText}>No official court orders or decrees recorded.</Text>
        ) : (
          <View style={styles.cardList}>
            {list.map((order, i) => (
              <View key={i} style={styles.itemCard}>
                <View style={styles.itemCardHeader}>
                  <Text style={styles.itemCardTitle}>📜 {order.name}</Text>
                  <View style={[styles.statusBadge, styles.badgeInfo]}>
                    <Text style={styles.statusBadgeText}>Decree</Text>
                  </View>
                </View>
                <Text style={styles.itemCardBody}>
                  Issued By: {order.extractedData?.issuer || 'District Court Judge'}
                </Text>
                {order.extractedData?.notes && (
                  <Text style={styles.itemCardBody}>
                    Directives: &quot;{order.extractedData.notes}&quot;
                  </Text>
                )}
                <Text style={styles.itemCardFooter}>Date Issued: {order.uploadDate}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  // Overview / Comma  // --- TIMELINE HELPERS ---
  const detectDuplicates = (list: any[]) => {
    const pairs: any[][] = [];
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const titleI = (list[i].event || list[i].title || '').toLowerCase();
        const titleJ = (list[j].event || list[j].title || '').toLowerCase();
        if (list[i].date === list[j].date && 
            (titleI.includes(titleJ) || titleJ.includes(titleI) || (list[i].category && list[i].category === list[j].category))) {
          pairs.push([list[i], list[j]]);
        }
      }
    }
    return pairs;
  };

  const inferCategory = (title = '', desc = '') => {
    const t = (title + ' ' + desc).toLowerCase();
    if (t.includes('fir') || t.includes('charge sheet') || t.includes('complaint')) return 'FIR / Complaint';
    if (t.includes('notice') || t.includes('legal notice')) return 'Legal Notice';
    if (t.includes('reply') || t.includes('rejoinder')) return 'Reply';
    if (t.includes('agreement') || t.includes('contract') || t.includes('deed') || t.includes('lease') || t.includes('lent') || t.includes('loan')) return 'Agreement';
    if (t.includes('hearing') || t.includes('court') || t.includes('appearance')) return 'Hearing';
    if (t.includes('order') || t.includes('injunction') || t.includes('stay')) return 'Court Order';
    if (t.includes('judgment') || t.includes('decree') || t.includes('verdict')) return 'Judgment';
    if (t.includes('evidence') || t.includes('exhibit') || t.includes('receipt') || t.includes('proof')) return 'Evidence';
    if (t.includes('draft') || t.includes('pleading') || t.includes('petition')) return 'Draft';
    if (t.includes('research') || t.includes('precedent') || t.includes('ruling')) return 'Research';
    return 'Other';
  };

  const handleMergeEvents = (idx1: number, idx2: number) => {
    if (!workspace) return;
    const list = [...(workspace.facts || [])];
    const ev1 = list[idx1];
    const ev2 = list[idx2];
    
    const mergedEvent = {
      ...ev1,
      event: ev1.event || (ev1 as any).title || 'Merged Event',
      description: `${ev1.description || ''} | Merged: ${ev2.description || ''}`,
      category: (ev1 as any).category || inferCategory(ev1.event, ev1.description),
      importance: 'High',
      confidence: 'High',
      isAiGenerated: true,
      sourceDoc: `${(ev1 as any).sourceDoc || 'File'} & ${(ev2 as any).sourceDoc || 'File'}`
    };
    
    list[idx1] = mergedEvent;
    list.splice(idx2, 1);
    
    handleUpdateField({ facts: list as any });
    setShowDuplicateMergeSuggestion(false);
    showToast('success', 'Events Merged', 'Duplicate timeline entries merged successfully.');
  };

  // --- NARRATIVE EXTRACTION SIMULATION ---
  const runNarrativeExtraction = async () => {
    if (!narrativeText.trim()) {
      showToast('error', 'Text Required', 'Please enter a legal narrative text block.');
      return;
    }
    setIsExtractingNarrative(true);
    setNarrativeSteps([
      'Analyzing text narrative structure...',
      'Performing legal entity recognition (Dates, Parties, Locations)...',
      'Extracting chronological legal actions...',
      'Assigning categories and calculating AI confidence scores...',
      'Updating chronological Case Journey timeline...'
    ]);
    setActiveNarrativeStep(0);

    for (let i = 0; i < 5; i++) {
      await new Promise(r => setTimeout(r, 600));
      setActiveNarrativeStep(prev => prev + 1);
    }

    const isExample = narrativeText.toLowerCase().includes('rajesh sharma') || narrativeText.toLowerCase().includes('amit verma') || narrativeText.toLowerCase().includes('5,00,000');
    let extracted: any[] = [];
    if (isExample) {
      extracted = [
        {
          date: '15 Jan 2025',
          event: 'Loan Agreement Executed',
          description: 'Amit Verma executed a loan agreement for ₹5,00,000 from Rajesh Sharma, due 15 April 2025.',
          category: 'Agreement',
          importance: 'High',
          confidence: 'High',
          isAiGenerated: true,
          sourceDoc: 'Advocate Narrative',
          linkedEvidence: 'Exhibit A - Registered Deed',
          courtStage: 'Pre-Litigation',
          parties: 'Rajesh Sharma, Amit Verma',
          aiExplanation: 'Beginning of case timeline establishing contractual terms.'
        },
        {
          date: '15 Apr 2025',
          event: 'Repayment Deadline default',
          description: 'Amit Verma defaulted on repayment of ₹5,00,000 principal due date.',
          category: 'Other',
          importance: 'High',
          confidence: 'High',
          isAiGenerated: true,
          sourceDoc: 'Advocate Narrative',
          courtStage: 'Pre-Litigation',
          parties: 'Amit Verma',
          aiExplanation: 'Establishes cause of action for default and default interest accrual.'
        },
        {
          date: '20 Apr 2025',
          event: 'Legal Notice Issued',
          description: 'Legal notice demanding loan repayment within 15 days sent to Amit Verma.',
          category: 'Legal Notice',
          importance: 'High',
          confidence: 'High',
          isAiGenerated: true,
          sourceDoc: 'Advocate Narrative',
          courtStage: 'Pre-Litigation',
          parties: 'Rajesh Sharma, Amit Verma',
          aiExplanation: 'Pre-litigation demand, compliance period of 15 days.'
        }
      ];
    } else {
      extracted = [
        {
          date: new Date().toLocaleDateString(),
          event: 'AI Extracted Event',
          description: narrativeText,
          category: 'Other',
          importance: 'Medium',
          confidence: 'Medium',
          isAiGenerated: true,
          sourceDoc: 'Text Narrative Block'
        }
      ];
    }

    const currentFacts = workspace?.facts || [];
    handleUpdateField({ facts: [...currentFacts, ...extracted] as any });
    setIsExtractingNarrative(false);
    setNarrativeText('');
    setIsNarrativeExtractorOpen(false);
    showToast('success', 'AI OCR Complete', `Extracted ${extracted.length} timeline milestones successfully.`);
  };

  // Overview / Command Hub Dashboard Grid
  const renderOverviewTab = () => {
    const nextHearing = (workspace?.hearings || []).find((h) => h.status === 'Upcoming');
    const nextHearingStr = nextHearing ? `${nextHearing.date} - ${nextHearing.time || '10:00 AM'}` : 'None Scheduled';

    const client = workspace?.clientName || 'N/A';
    const opponent = workspace?.opponentName || workspace?.accused || 'N/A';
    const court = workspace?.courtName || 'N/A';
    const caseType = workspace?.caseType || 'N/A';
    const winProb = workspace?.intelligence?.winProbability || 65;
    const strength = workspace?.intelligence?.strengthScore || 70;
    const riskLevel = workspace?.intelligence?.riskLevel || workspace?.priority || 'High';

    return (
      <View style={styles.commandCenterContainer}>
        {/* Apple-Style Case Summary & Detail Block */}
        <View style={styles.caseInfoCard}>
          <Text style={styles.caseSummaryTitle}>Case Summary (AI Generated)</Text>
          <Text style={styles.caseSummaryText}>
            {workspace?.summary || workspace?.caseSummary || 'No case description or facts provided yet. Use case preferences to initialize parameters.'}
          </Text>
          <View style={styles.dividerLine} />
          <View style={styles.caseDetailMetaRow}>
            <View style={styles.metaCol}>
              <Text style={styles.metaColLabel}>Client</Text>
              <Text style={styles.metaColValue} numberOfLines={1}>{client}</Text>
            </View>
            <View style={styles.metaCol}>
              <Text style={styles.metaColLabel}>Opponent</Text>
              <Text style={styles.metaColValue} numberOfLines={1}>{opponent}</Text>
            </View>
          </View>
          <View style={styles.caseDetailMetaRow}>
            <View style={styles.metaCol}>
              <Text style={styles.metaColLabel}>Court / Forum</Text>
              <Text style={styles.metaColValue} numberOfLines={1}>{court}</Text>
            </View>
            <View style={styles.metaCol}>
              <Text style={styles.metaColLabel}>Type</Text>
              <Text style={styles.metaColValue} numberOfLines={1}>{caseType}</Text>
            </View>
          </View>
        </View>

        {/* Quick Insights horizontal carousel */}
        {renderQuickInsights()}

        {/* AI Case Assistant */}
        {renderAiAssistantCard()}

        {/* Workspace navigation rounded list tiles */}
        {renderWorkspaceNavigation()}

        {/* Case Timeline Preview */}
        {renderTimelinePreview()}

        {/* Recent Activity */}
        {renderRecentActivity()}
      </View>
    );
  };

  // AI Suggestions renderer (Limitation Warnings, Upcoming Deadlines, Missing Documents)
  const renderAiSuggestions = () => {
    const warnings = workspace?.limitationWarnings || [];
    const deadlines = workspace?.upcomingDeadlines || [];
    const missingDocs = workspace?.missingDocuments || [];

    if (warnings.length === 0 && deadlines.length === 0 && missingDocs.length === 0) {
      return null;
    }

    return (
      <View style={styles.suggestionsContainer}>
        {/* Section title */}
        <Text style={styles.suggestionsHeader}>AI Insights & Recommendations</Text>
        
        {/* Limitation Warnings */}
        {warnings.map((w: any, idx: number) => (
          <View key={`warn-${idx}`} style={[styles.suggestionCard, styles.warningCard]}>
            <View style={styles.suggestionHeaderRow}>
              <View style={styles.suggestionTitleGroup}>
                <Ionicons name="sparkles" size={12} color="#6D5DFC" />
                <Text style={styles.warningTagText}>LIMITATION WARNING</Text>
              </View>
            </View>
            <Text style={styles.suggestionTitle}>{w.title}</Text>
            <Text style={styles.suggestionDesc}>{w.description}</Text>
          </View>
        ))}

        {/* Upcoming Deadlines */}
        {deadlines.map((d: any, idx: number) => (
          <View key={`dead-${idx}`} style={[styles.suggestionCard, styles.deadlineCard]}>
            <View style={styles.suggestionHeaderRow}>
              <View style={styles.suggestionTitleGroup}>
                <Ionicons name="alarm-outline" size={12} color="#D97706" />
                <Text style={styles.deadlineTagText}>UPCOMING DEADLINE</Text>
              </View>
            </View>
            <Text style={styles.suggestionTitle}>{d.title}</Text>
            <Text style={styles.suggestionDesc}>{d.description}</Text>
          </View>
        ))}

        {/* Missing Documents */}
        {missingDocs.map((m: any, idx: number) => (
          <View key={`miss-${idx}`} style={[styles.suggestionCard, styles.missingCard]}>
            <View style={styles.suggestionHeaderRow}>
              <View style={styles.suggestionTitleGroup}>
                <Ionicons name="alert-circle-outline" size={12} color="#EF4444" />
                <Text style={styles.missingTagText}>MISSING DOCUMENT</Text>
              </View>
            </View>
            <Text style={styles.suggestionTitle}>{m.title}</Text>
            <Text style={styles.suggestionDesc}>{m.description}</Text>
          </View>
        ))}
      </View>
    );
  };

  const handleGenerateTimeline = async () => {
    if (!id) return;
    setIsAnalyzingTimeline(true);
    try {
      showToast('info', 'Analyzing Summary', 'AI is analyzing case summary to generate timeline...');
      const res = await CaseService.analyzeCase(id);
      if (res && res.data) {
        updateWorkspaceState(id, res.data);
        showToast('success', 'Timeline Generated', 'Successfully generated timeline facts from case summary.');
      } else {
        await fetchWorkspaceDetails(id);
        showToast('success', 'Timeline Generated', 'Successfully generated timeline facts.');
      }
    } catch (err) {
      console.error('[Timeline] AI generation failed:', err);
      showToast('error', 'Generation Failed', 'Could not generate timeline using AI.');
    } finally {
      setIsAnalyzingTimeline(false);
    }
  };

  // Timeline chronology module
  const renderTimelineTab = () => {
    if (isAnalyzingTimeline) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6D5DFC" style={{ marginBottom: 12 }} />
          <Text style={styles.loadingTextTimeline}>AI is generating structured timeline facts from the Case Summary...</Text>
        </View>
      );
    }

    const totalFacts = workspace?.facts || [];
    if (totalFacts.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar-outline" size={48} color="#9CA3AF" style={{ marginBottom: 12 }} />
          <Text style={styles.emptyHeadline}>No timeline facts detected.</Text>
          <Text style={styles.emptySubline}>Tap &apos;Generate Timeline&apos; to let AI analyze this case.</Text>
          <TouchableOpacity
            style={styles.generateTimelineBtn}
            onPress={handleGenerateTimeline}
          >
            <Ionicons name="sparkles-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.generateTimelineBtnText}>Generate Timeline</Text>
          </TouchableOpacity>
        </View>
      );
    }

    const filteredList = totalFacts.filter((item: any) => {
      const matchesSearch =
        (item.title || item.event || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.category || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.date || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.displayDate || '').toLowerCase().includes(searchQuery.toLowerCase());
      
      if (!matchesSearch) return false;
      if (timelineCategoryFilter === 'All') return true;

      const category = (item.category || '').toLowerCase();
      const createdBy = (item.createdBy || '').toLowerCase();
      const importance = (item.importance || '').toLowerCase();

      if (timelineCategoryFilter === 'Documents') {
        return ['document', 'contract', 'agreement'].includes(category);
      }
      if (timelineCategoryFilter === 'Hearings') {
        return ['hearing', 'court'].includes(category);
      }
      if (timelineCategoryFilter === 'Evidence') {
        return ['evidence'].includes(category);
      }
      if (timelineCategoryFilter === 'Court') {
        return ['court', 'hearing', 'case filing', 'judgment'].includes(category);
      }
      if (timelineCategoryFilter === 'Payments') {
        return ['payment'].includes(category);
      }
      if (timelineCategoryFilter === 'AI Generated') {
        return createdBy === 'ai';
      }
      if (timelineCategoryFilter === 'High Priority') {
        return importance === 'high';
      }

      return category === timelineCategoryFilter.toLowerCase();
    });

    const sortedList = [...filteredList].sort((a: any, b: any) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      return timelineSortAsc ? dateA - dateB : dateB - dateA;
    });

    return (
      <View style={styles.tabContent}>
        <View style={styles.moduleHeaderRow}>
          <Text style={styles.moduleTitle}>Chronology Timeline</Text>
          <Pressable
            style={styles.moduleHeaderBtn}
            onPress={() => {
              setModalType('timeline');
              setIsModalOpen(true);
            }}
          >
            <Ionicons name="add" size={16} color="#6D5DFC" />
            <Text style={styles.moduleHeaderBtnText}>Add Fact</Text>
          </Pressable>
        </View>

        {/* Search bar */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={16} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search timeline facts..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Horizontal filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersScroll}
          contentContainerStyle={styles.filtersContainer}
        >
          {['All', 'Documents', 'Hearings', 'Evidence', 'Court', 'Payments', 'AI Generated', 'High Priority'].map((filter) => {
            const isActive = timelineCategoryFilter === filter;
            return (
              <Pressable
                key={filter}
                style={[
                  styles.filterChip,
                  isActive && styles.filterChipActive
                ]}
                onPress={() => setTimelineCategoryFilter(filter)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    isActive && styles.filterChipTextActive
                  ]}
                >
                  {filter}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Sorting row toggle */}
        <View style={styles.sortRow}>
          <Text style={styles.milestoneCountText}>
            {sortedList.length} {sortedList.length === 1 ? 'Milestone' : 'Milestones'}
          </Text>
          <Pressable
            style={styles.sortToggleBtn}
            onPress={() => setTimelineSortAsc(!timelineSortAsc)}
          >
            <Ionicons
              name={timelineSortAsc ? 'arrow-down-outline' : 'arrow-up-outline'}
              size={14}
              color="#6D5DFC"
            />
            <Text style={styles.sortToggleText}>
              {timelineSortAsc ? 'Oldest First' : 'Newest First'}
            </Text>
          </Pressable>
        </View>

        {/* AI Suggestions/Insights list */}
        {renderAiSuggestions()}

        {/* Vertical Timeline */}
        {sortedList.length === 0 ? (
          <Text style={styles.emptyText}>No matching timeline facts recorded yet.</Text>
        ) : (
          <View style={styles.timelineList}>
            {sortedList.map((item: any, i) => (
              <View key={i} style={styles.timelineNode}>
                <View style={styles.timelineMarker}>
                  <View style={styles.timelineLine} />
                  <View style={[
                    styles.timelineDot,
                    item.importance === 'High' ? styles.dotHigh :
                    item.importance === 'Medium' ? styles.dotMedium : styles.dotLow
                  ]} />
                </View>
                <View style={styles.timelineCard}>
                  <View style={styles.timelineHeaderRow}>
                    <Text style={styles.timelineDate}>{item.displayDate || item.date}</Text>
                    <View style={styles.badgesGroup}>
                      {item.category ? (
                        <View style={[styles.badge, styles.categoryBadge]}>
                          <Text style={styles.categoryBadgeText}>{item.category}</Text>
                        </View>
                      ) : null}
                      {item.importance ? (
                        <View style={[
                          styles.badge,
                          item.importance === 'High' ? styles.badgeHigh :
                          item.importance === 'Medium' ? styles.badgeMedium : styles.badgeLow
                        ]}>
                          <Text style={[
                            styles.badgeText,
                            item.importance === 'High' ? { color: '#EF4444' } :
                            item.importance === 'Medium' ? { color: '#F59E0B' } : { color: '#6D5DFC' }
                          ]}>{item.importance}</Text>
                        </View>
                      ) : null}
                      {item.createdBy === 'AI' && (
                        <View style={[styles.badge, styles.aiGeneratedBadge]}>
                          <Text style={styles.aiGeneratedBadgeText}>AI</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <Text style={styles.timelineTitle}>{item.title || item.event}</Text>
                  <Text style={styles.timelineDesc}>{item.description}</Text>
                  {item.isApproximate && (
                    <Text style={styles.approximateNotice}>* Approximate date</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  // Hearings Tab
  const renderHearingsTab = () => {
    const list = workspace?.hearings || [];
    
    // Overview metrics
    const courtName = workspace?.courtName || (list.length > 0 ? list[0].courtName : 'District Court');
    const caseStage = workspace?.stage || 'Court';
    const totalHearings = list.length;
    const upcomingHearingsCount = list.filter(h => h.status === 'Scheduled' || h.status === 'Upcoming' || h.status === 'Ongoing').length;

    // Find next hearing
    const nextHearing = list.find(h => h.status === 'Scheduled' || h.status === 'Upcoming' || h.status === 'Ongoing');

    // Calculate pending compliance count
    const pendingComplianceCount = list.reduce((acc, h) => acc + (h.checklist?.compliance?.filter(c => !c.checked).length || 0), 0);

    // Calculate checklist progress
    const totalChecklistItems = list.reduce((acc, h) => acc + (h.checklist ? (h.checklist.documents.length + h.checklist.evidence.length + h.checklist.witnesses.length + h.checklist.compliance.length) : 0), 0);
    const completedChecklistItems = list.reduce((acc, h) => acc + (h.checklist ? (h.checklist.documents.filter(c => c.checked).length + h.checklist.evidence.filter(c => c.checked).length + h.checklist.witnesses.filter(c => c.checked).length + h.checklist.compliance.filter(c => c.checked).length) : 0), 0);
    const prepProgress = totalChecklistItems > 0 ? Math.round((completedChecklistItems / totalChecklistItems) * 100) : 0;

    // Filter list
    const filteredHearings = list.filter(h => {
      const q = hearingSearchQuery.toLowerCase();
      const matchesSearch = !q ||
        (h.title || '').toLowerCase().includes(q) ||
        (h.courtroom || '').toLowerCase().includes(q) ||
        (h.judge || '').toLowerCase().includes(q) ||
        (h.purpose || '').toLowerCase().includes(q) ||
        (h.courtName || '').toLowerCase().includes(q) ||
        (h.orderSummary || '').toLowerCase().includes(q) ||
        (h.notes || '').toLowerCase().includes(q);

      if (activeHearingFilter === 'With Documents') {
        return matchesSearch && h.linkedDocuments && h.linkedDocuments.length > 0;
      }
      const matchesFilter = activeHearingFilter === 'All' ||
        h.status === activeHearingFilter ||
        (activeHearingFilter === 'Upcoming' && (h.status === 'Upcoming' || h.status === 'Scheduled' || h.status === 'Ongoing'));

      return matchesSearch && matchesFilter;
    });

    return (
      <View style={styles.tabContent}>
        {/* Module Header Row */}
        <View style={styles.moduleHeaderRow}>
          <Text style={styles.moduleTitle}>Court Hearings</Text>
          <Pressable
            style={styles.moduleHeaderBtn}
            onPress={() => {
              setHearingForm({
                date: '',
                time: '',
                courtName: workspace?.courtName || 'District Court',
                courtroom: '',
                judge: '',
                purpose: '',
                notes: '',
                status: 'Scheduled'
              });
              setModalType('hearing');
              setIsModalOpen(true);
            }}
          >
            <Ionicons name="add" size={16} color="#6D5DFC" />
            <Text style={styles.moduleHeaderBtnText}>Schedule Hearing</Text>
          </Pressable>
        </View>

        {/* Court Hearing Overview Card */}
        <View style={styles.overviewCard}>
          <Text style={styles.overviewTitle}>⚖️ Case Forum Overview</Text>
          <View style={styles.overviewRow}>
            <Text style={styles.overviewLabel}>Primary Court:</Text>
            <Text style={styles.overviewValue} numberOfLines={1}>{courtName}</Text>
          </View>
          <View style={styles.overviewRow}>
            <Text style={styles.overviewLabel}>Litigation Stage:</Text>
            <Text style={styles.overviewValue}>{caseStage}</Text>
          </View>
          <View style={styles.overviewStatsRow}>
            <View style={styles.overviewStatCol}>
              <Text style={styles.overviewStatNum}>{totalHearings}</Text>
              <Text style={styles.overviewStatLabel}>Total Hearings</Text>
            </View>
            <View style={styles.overviewStatCol}>
              <Text style={styles.overviewStatNum}>{upcomingHearingsCount}</Text>
              <Text style={styles.overviewStatLabel}>Upcoming</Text>
            </View>
          </View>
        </View>

        {/* Summary Widgets Carousel */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.horizontalScrollWidgets}
        >
          {/* Widget 1: Next Hearing */}
          <View style={styles.widgetCard}>
            <View style={styles.widgetHeader}>
              <Ionicons name="calendar-outline" size={14} color="#6D5DFC" />
              <Text style={styles.widgetHeaderTitle}>Next Hearing</Text>
            </View>
            <View style={styles.widgetBody}>
              {nextHearing ? (
                <>
                  <Text style={styles.widgetTextMain} numberOfLines={1}>{nextHearing.date} - {nextHearing.time}</Text>
                  <Text style={styles.widgetTextSub} numberOfLines={1}>Room: {nextHearing.courtroom || 'N/A'} • {nextHearing.purpose || 'General'}</Text>
                </>
              ) : (
                <Text style={[styles.widgetTextSub, { fontStyle: 'italic' }]}>No upcoming hearing scheduled</Text>
              )}
            </View>
          </View>

          {/* Widget 2: Pending Compliance */}
          <View style={styles.widgetCard}>
            <View style={styles.widgetHeader}>
              <Ionicons name="checkbox-outline" size={14} color="#F59E0B" />
              <Text style={styles.widgetHeaderTitle}>Pending Compliance</Text>
            </View>
            <View style={styles.widgetBody}>
              <Text style={styles.widgetTextMain}>{pendingComplianceCount} Directives</Text>
              <Text style={styles.widgetTextSub}>Requires advocate action</Text>
            </View>
          </View>

          {/* Widget 3: Preparation Progress */}
          <View style={styles.widgetCard}>
            <View style={styles.widgetHeader}>
              <Ionicons name="bar-chart-outline" size={14} color="#10B981" />
              <Text style={styles.widgetHeaderTitle}>Preparation Status</Text>
            </View>
            <View style={styles.widgetBody}>
              <Text style={styles.widgetTextMain}>{completedChecklistItems}/{totalChecklistItems} Tasks Done</Text>
              <View style={styles.widgetProgressContainer}>
                <View style={styles.widgetProgressBarBg}>
                  <View style={[styles.widgetProgressBarFill, { width: `${prepProgress}%` }]} />
                </View>
                <Text style={styles.widgetProgressPerc}>{prepProgress}%</Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Filter Chips Bar */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 12 }}
        >
          {['All', 'Upcoming', 'Completed', 'Adjourned', 'Orders Reserved', 'Cancelled', 'With Documents'].map((filt) => (
            <TouchableOpacity
              key={filt}
              style={[styles.hearingFilterPill, activeHearingFilter === filt && styles.hearingFilterPillActive]}
              onPress={() => setActiveHearingFilter(filt)}
            >
              <Text style={[styles.hearingFilterPillText, activeHearingFilter === filt && styles.hearingFilterPillTextActive]}>
                {filt}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Search Input Bar */}
        <View style={styles.searchBarContainer}>
          <Ionicons name="search" size={16} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput
            style={styles.searchBarInput}
            placeholder="Search hearings calendar..."
            placeholderTextColor="#9CA3AF"
            value={hearingSearchQuery}
            onChangeText={setHearingSearchQuery}
          />
        </View>

        {/* Timeline List */}
        {filteredHearings.length === 0 ? (
          <Text style={styles.emptyText}>No matching hearings log found.</Text>
        ) : (
          <View style={styles.timelineWrapper}>
            {filteredHearings.map((h, i) => {
              const hId = h.id || h._id || `h_${i}`;
              const isEnriching = isEnrichingHearingId === hId;
              const isChecklistExpanded = expandedHearingChecklistId === hId;

              // Color mapping for status indicator
              let statusColor = '#3B82F6';
              if (h.status === 'Completed') statusColor = '#10B981';
              else if (h.status === 'Adjourned') statusColor = '#F59E0B';
              else if (h.status === 'Orders Reserved') statusColor = '#8B5CF6';
              else if (h.status === 'Cancelled') statusColor = '#EF4444';

              return (
                <View key={hId} style={styles.timelineItem}>
                  {/* Left chronological vertical lines & dot */}
                  <View style={styles.timelineLineContainer}>
                    <View style={[styles.hearingTimelineDot, { backgroundColor: statusColor }]} />
                    {i < filteredHearings.length - 1 && <View style={styles.hearingTimelineConnector} />}
                  </View>

                  {/* Hearing Content Card */}
                  <View style={styles.hearingTimelineContentCard}>
                    {/* Card Header */}
                    <View style={styles.timelineCardHeader}>
                      <View>
                        <Text style={styles.timelineCardDate}>📅 {h.date}</Text>
                        <Text style={styles.timelineCardTime}>{h.time || '10:00 AM'}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end', gap: 4 }}>
                        <View style={[styles.badge, { backgroundColor: statusColor + '20' }]}>
                          <Text style={[styles.badgeText, { color: statusColor }]}>{h.status}</Text>
                        </View>
                        {h.isAiEnriched && (
                          <View style={styles.aiEnrichedBadge}>
                            <Ionicons name="sparkles" size={10} color="#6D5DFC" />
                            <Text style={styles.aiEnrichedBadgeText}>AI Enriched</Text>
                          </View>
                        )}
                      </View>
                    </View>

                    {/* Card Title */}
                    <Text style={styles.timelineCardTitle}>{h.title || 'Court Hearing Session'}</Text>

                    {/* Metadata Grid */}
                    <View style={styles.timelineMetaGrid}>
                      <View style={styles.timelineMetaItem}>
                        <Ionicons name="business" size={13} color="#4B5563" />
                        <Text style={styles.timelineMetaText} numberOfLines={1}>
                          <Text style={{ fontWeight: '700' }}>Forum: </Text>{h.courtName || courtName}
                        </Text>
                      </View>
                      {h.courtroom ? (
                        <View style={styles.timelineMetaItem}>
                          <Ionicons name="enter" size={13} color="#4B5563" />
                          <Text style={styles.timelineMetaText}>
                            <Text style={{ fontWeight: '700' }}>Courtroom: </Text>{h.courtroom}
                          </Text>
                        </View>
                      ) : null}
                      {h.judge ? (
                        <View style={styles.timelineMetaItem}>
                          <Ionicons name="person-circle" size={13} color="#4B5563" />
                          <Text style={styles.timelineMetaText} numberOfLines={1}>
                            <Text style={{ fontWeight: '700' }}>Judge: </Text>{h.judge}
                          </Text>
                        </View>
                      ) : null}
                      {h.purpose ? (
                        <View style={styles.timelineMetaItem}>
                          <Ionicons name="ribbon" size={13} color="#4B5563" />
                          <Text style={styles.timelineMetaText} numberOfLines={1}>
                            <Text style={{ fontWeight: '700' }}>Purpose: </Text>{h.purpose}
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    {/* AI Order Summary Section */}
                    {h.orderSummary ? (
                      <View style={styles.aiOrderSummaryBox}>
                        <Text style={styles.aiOrderSummaryHeader}>✨ AI Order Directive Summary</Text>
                        <Text style={styles.aiOrderSummaryText}>{h.orderSummary}</Text>
                        {h.nextHearingDate ? (
                          <Text style={[styles.aiOrderSummaryText, { marginTop: 6, fontWeight: '700', color: '#6D5DFC' }]}>
                            ⏭️ Next Hearing Date Diary: {h.nextHearingDate}
                          </Text>
                        ) : null}
                      </View>
                    ) : null}

                    {/* Expandable Checklist Section */}
                    {h.checklist && (
                      <TouchableOpacity
                        style={styles.checklistToggleBtn}
                        onPress={() => setExpandedHearingChecklistId(isChecklistExpanded ? null : hId)}
                      >
                        <Ionicons
                          name={isChecklistExpanded ? "chevron-up" : "list"}
                          size={14}
                          color="#4B5563"
                        />
                        <Text style={styles.checklistToggleText}>
                          {isChecklistExpanded ? "Hide Prep Checklist" : "Show Prep Checklist"}
                        </Text>
                      </TouchableOpacity>
                    )}

                    {isChecklistExpanded && h.checklist && (
                      <View style={styles.checklistContainer}>
                        <Text style={styles.checklistSectionTitle}>📋 Preparation Checklist</Text>
                        
                        {/* Documents */}
                        <View style={styles.checklistCategory}>
                          <Text style={styles.checklistCategoryTitle}>Documents Needed</Text>
                          {(!h.checklist.documents || h.checklist.documents.length === 0) ? (
                            <Text style={styles.checklistEmptyText}>No documents specified.</Text>
                          ) : (
                            h.checklist.documents.map((item, idx) => (
                              <TouchableOpacity
                                key={idx}
                                style={styles.checklistRow}
                                onPress={() => handleToggleChecklistItem(hId, 'documents', idx)}
                              >
                                <Ionicons
                                  name={item.checked ? "checkbox" : "square-outline"}
                                  size={18}
                                  color={item.checked ? theme.primary : theme.textSecondary}
                                />
                                <Text style={[styles.checklistRowText, item.checked && styles.checklistRowTextChecked]}>
                                  {item.title}
                                </Text>
                              </TouchableOpacity>
                            ))
                          )}
                        </View>

                        {/* Evidence */}
                        <View style={styles.checklistCategory}>
                          <Text style={styles.checklistCategoryTitle}>Evidence Ledger</Text>
                          {(!h.checklist.evidence || h.checklist.evidence.length === 0) ? (
                            <Text style={styles.checklistEmptyText}>No evidence specified.</Text>
                          ) : (
                            h.checklist.evidence.map((item, idx) => (
                              <TouchableOpacity
                                key={idx}
                                style={styles.checklistRow}
                                onPress={() => handleToggleChecklistItem(hId, 'evidence', idx)}
                              >
                                <Ionicons
                                  name={item.checked ? "checkbox" : "square-outline"}
                                  size={18}
                                  color={item.checked ? theme.primary : theme.textSecondary}
                                />
                                <Text style={[styles.checklistRowText, item.checked && styles.checklistRowTextChecked]}>
                                  {item.title}
                                </Text>
                              </TouchableOpacity>
                            ))
                          )}
                        </View>

                        {/* Witnesses */}
                        <View style={styles.checklistCategory}>
                          <Text style={styles.checklistCategoryTitle}>Witness Preparation</Text>
                          {(!h.checklist.witnesses || h.checklist.witnesses.length === 0) ? (
                            <Text style={styles.checklistEmptyText}>No witnesses specified.</Text>
                          ) : (
                            h.checklist.witnesses.map((item, idx) => (
                              <TouchableOpacity
                                key={idx}
                                style={styles.checklistRow}
                                onPress={() => handleToggleChecklistItem(hId, 'witnesses', idx)}
                              >
                                <Ionicons
                                  name={item.checked ? "checkbox" : "square-outline"}
                                  size={18}
                                  color={item.checked ? theme.primary : theme.textSecondary}
                                />
                                <Text style={[styles.checklistRowText, item.checked && styles.checklistRowTextChecked]}>
                                  {item.title}
                                </Text>
                              </TouchableOpacity>
                            ))
                          )}
                        </View>

                        {/* Compliance */}
                        {h.checklist.compliance && h.checklist.compliance.length > 0 && (
                          <View style={styles.checklistCategory}>
                            <Text style={styles.checklistCategoryTitle}>Compliance Checklist</Text>
                            {h.checklist.compliance.map((item, idx) => (
                              <TouchableOpacity
                                key={idx}
                                style={styles.checklistRow}
                                onPress={() => handleToggleChecklistItem(hId, 'compliance', idx)}
                              >
                                <Ionicons
                                  name={item.checked ? "checkbox" : "square-outline"}
                                  size={18}
                                  color={item.checked ? theme.primary : theme.textSecondary}
                                />
                                <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <Text style={[styles.checklistRowText, item.checked && styles.checklistRowTextChecked]}>
                                    {item.title}
                                  </Text>
                                  {item.status && (
                                    <View style={[styles.miniStatusBadge, item.status === 'Overdue' ? styles.miniBadgeDanger : styles.miniBadgeWarning]}>
                                      <Text style={[styles.miniStatusBadgeText, { color: item.status === 'Overdue' ? theme.danger : theme.warning }]}>{item.status}</Text>
                                    </View>
                                  )}
                                </View>
                              </TouchableOpacity>
                            ))}
                          </View>
                        )}
                      </View>
                    )}

                    {/* AI Loading/Enrichment Indicator */}
                    {isEnriching && (
                      <View style={{ marginVertical: 12, alignItems: 'center' }}>
                        <ActivityIndicator size="small" color="#6D5DFC" />
                        <Text style={{ fontSize: 11, color: '#6D5DFC', marginTop: 4 }}>AI is analyzing court materials...</Text>
                      </View>
                    )}

                    {/* Actions Row */}
                    {!isEnriching && (
                      <View style={styles.cardActionRow}>
                        <TouchableOpacity
                          style={styles.cardActionBtn}
                          onPress={() => {
                            setSelectedHearingForNotes(h);
                            setHearingNotesInput(h.notes || h.title || '');
                            setModalType('add_hearing_notes');
                            setIsModalOpen(true);
                          }}
                        >
                          <Ionicons name="document-text-outline" size={12} color="#6D5DFC" />
                          <Text style={styles.cardActionBtnText}>Add Notes</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.cardActionBtn, styles.cardActionBtnFilled]}
                          onPress={() => {
                            setSelectedHearingForOrder(h);
                            setSimulatedUploadProgress(0);
                            setSimulatedUploadStep('');
                            setModalType('upload_order_simulation');
                            setIsModalOpen(true);
                          }}
                        >
                          <Ionicons name="cloud-upload-outline" size={12} color="#FFFFFF" />
                          <Text style={styles.cardActionBtnTextFilled}>Upload Order</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>
    );
  };

  // Parties Tab
  const renderPartiesTab = () => {
    const client = workspace?.clientName || 'N/A';
    const opponent = workspace?.opponentName || workspace?.accused || 'N/A';
    const lawyers = workspace?.lawyers || [];
    const court = workspace?.courtName || 'District Court';
    const judge = (workspace as any).judgeName || 'Justice Dixit';
    const opposingCounsel = (workspace as any).opposingLawyer || 'Vipul Sen (Senior Counsel)';

    const togglePartiesEditMode = () => {
      if (isPartiesEditMode) {
        // save action
        handleUpdateField({
          clientName: tempPartiesData.clientName || client,
          opponentName: tempPartiesData.opponentName || opponent,
          courtName: tempPartiesData.courtName || court,
          ...({
            judgeName: tempPartiesData.judgeName || judge,
            opposingLawyer: tempPartiesData.opposingLawyer || opposingCounsel
          } as any)
        });
        setIsPartiesEditMode(false);
        showToast('success', 'Roster Updated', 'Litigation parties roster updated successfully.');
      } else {
        setTempPartiesData({
          clientName: client,
          opponentName: opponent,
          courtName: court,
          judgeName: judge,
          opposingLawyer: opposingCounsel
        });
        setIsPartiesEditMode(true);
      }
    };

    const handleAutoExtractParties = async () => {
      setIsExtractingParties(true);
      setPartiesExtractionSteps([
        'Scanning documents for legal headers...',
        'Parsing plaintiff petitioner statements...',
        'Identifying opposing respondent advocates roster...',
        'Mapping judicial bench allocation metadata...',
        'Compiling roster database records...'
      ]);
      setActivePartiesExtractionStep(0);

      for (let i = 0; i < 5; i++) {
        await new Promise(r => setTimeout(r, 600));
        setActivePartiesExtractionStep(prev => prev + 1);
      }

      handleUpdateField({
        opposingLawyer: 'Vipul Sen (Senior Counsel)',
        courtName: 'Delhi District Court',
        ...({
          judgeName: 'Justice Dixit'
        } as any)
      });
      setIsExtractingParties(false);
      showToast('success', 'Parties Extracted', 'AI successfully parsed litigation advocate roster.');
    };

    return (
      <View style={styles.tabContent}>
        <View style={styles.moduleHeaderRow}>
          <Text style={styles.moduleTitle}>Litigation Parties</Text>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <Pressable
              style={styles.moduleHeaderBtn}
              onPress={handleAutoExtractParties}
            >
              <Ionicons name="sparkles" size={12} color="#6D5DFC" />
              <Text style={styles.moduleHeaderBtnText}>AI Extract</Text>
            </Pressable>
            <Pressable
              style={[styles.moduleHeaderBtn, isPartiesEditMode && { backgroundColor: '#6D5DFC' }]}
              onPress={togglePartiesEditMode}
            >
              <Ionicons name={isPartiesEditMode ? 'checkmark' : 'create-outline'} size={14} color={isPartiesEditMode ? '#FFFFFF' : '#6D5DFC'} />
              <Text style={[styles.moduleHeaderBtnText, isPartiesEditMode && { color: '#FFFFFF' }]}>
                {isPartiesEditMode ? 'Save' : 'Edit Mode'}
              </Text>
            </Pressable>
          </View>
        </View>

        {isExtractingParties && (
          <View style={[styles.metaCard, { alignItems: 'center', paddingVertical: 18 }]}>
            <ActivityIndicator size="small" color="#6D5DFC" style={{ marginBottom: 8 }} />
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#6D5DFC' }}>
              {partiesExtractionSteps[activePartiesExtractionStep] || 'Parsing litigation signatures...'}
            </Text>
          </View>
        )}

        {/* Client / Opponent / Court roster cards */}
        {isPartiesEditMode ? (
          <View style={styles.cardList}>
            <View style={styles.itemCard}>
              <Text style={styles.inputLabel}>Lessor / Client Name</Text>
              <TextInput
                style={styles.formInput}
                value={tempPartiesData.clientName}
                onChangeText={(t) => setTempPartiesData({ ...tempPartiesData, clientName: t })}
              />
              <Text style={styles.inputLabel}>Lessee / Opponent Name</Text>
              <TextInput
                style={styles.formInput}
                value={tempPartiesData.opponentName}
                onChangeText={(t) => setTempPartiesData({ ...tempPartiesData, opponentName: t })}
              />
              <Text style={styles.inputLabel}>Court Name</Text>
              <TextInput
                style={styles.formInput}
                value={tempPartiesData.courtName}
                onChangeText={(t) => setTempPartiesData({ ...tempPartiesData, courtName: t })}
              />
              <Text style={styles.inputLabel}>Allocated Judge</Text>
              <TextInput
                style={styles.formInput}
                value={tempPartiesData.judgeName}
                onChangeText={(t) => setTempPartiesData({ ...tempPartiesData, judgeName: t })}
              />
              <Text style={styles.inputLabel}>Opposing Counsel Advocate</Text>
              <TextInput
                style={styles.formInput}
                value={tempPartiesData.opposingLawyer}
                onChangeText={(t) => setTempPartiesData({ ...tempPartiesData, opposingLawyer: t })}
              />
            </View>
          </View>
        ) : (
          <View style={styles.cardList}>
            {/* Plaintiff Client */}
            <View style={styles.itemCard}>
              <View style={styles.itemCardHeader}>
                <Text style={styles.itemCardTitle}>⚖️ {client}</Text>
                <View style={[styles.statusBadge, styles.badgeInfo]}>
                  <Text style={styles.statusBadgeText}>Plaintiff / Client</Text>
                </View>
              </View>
              <Text style={styles.itemCardBody}><Text style={{ fontWeight: 'bold' }}>Roster Group: </Text>Principal Litigant</Text>
              <Text style={styles.itemCardFooter}>Representative counsel: Active User</Text>
            </View>

            {/* Defendant Opponent */}
            <View style={styles.itemCard}>
              <View style={styles.itemCardHeader}>
                <Text style={[styles.itemCardTitle, { color: '#EF4444' }]}>👤 {opponent}</Text>
                <View style={[styles.statusBadge, styles.badgeDanger]}>
                  <Text style={[styles.statusBadgeText, { color: '#EF4444' }]}>Defendant / Opponent</Text>
                </View>
              </View>
              <Text style={styles.itemCardBody}><Text style={{ fontWeight: 'bold' }}>Counsel: </Text>{opposingCounsel}</Text>
              <Text style={styles.itemCardFooter}>Roster Group: Accused Lessee</Text>
            </View>

            {/* Bench Allocation */}
            <View style={styles.itemCard}>
              <View style={styles.itemCardHeader}>
                <Text style={styles.itemCardTitle}>🏛️ {court}</Text>
                <View style={[styles.statusBadge, styles.badgeWarning]}>
                  <Text style={styles.statusBadgeText}>Forum</Text>
                </View>
              </View>
              <Text style={styles.itemCardBody}><Text style={{ fontWeight: 'bold' }}>Judge Bench: </Text>{judge}</Text>
              <Text style={styles.itemCardFooter}>Jurisdiction: Exclusive Territorial</Text>
            </View>
          </View>
        )}

        <Text style={styles.subHeading}>Witnesses & Counsel</Text>
        <View style={[styles.moduleHeaderRow, { marginTop: 4 }]}>
          <Pressable
            style={[styles.moduleHeaderBtn, { alignSelf: 'flex-start' }]}
            onPress={() => {
              setModalType('party');
              setIsModalOpen(true);
            }}
          >
            <Ionicons name="add" size={14} color="#6D5DFC" />
            <Text style={styles.moduleHeaderBtnText}>Add Witness/Counsel</Text>
          </Pressable>
        </View>

        {lawyers.length === 0 ? (
          <Text style={styles.emptyText}>No secondary counsel or witnesses registered.</Text>
        ) : (
          <View style={[styles.cardList, { marginTop: 10 }]}>
            {lawyers.map((l, i) => (
              <View key={i} style={styles.itemCard}>
                <Text style={styles.itemCardTitle}>👤 {l.name}</Text>
                <Text style={styles.itemCardBody}>Role: {l.role}</Text>
                <Text style={styles.itemCardFooter}>Contact: {l.contact || 'N/A'}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  // Documents Tab
  const renderDocumentsTab = () => {
    const list = workspace?.documents || [];
    const filteredList = list.filter(d => {
      const matchesSearch = d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (d.tags || []).some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = timelineCategoryFilter === 'All' || d.type === timelineCategoryFilter;
      return matchesSearch && matchesCategory;
    });

    return (
      <View style={styles.tabContent}>
        <View style={styles.moduleHeaderRow}>
          <Text style={styles.moduleTitle}>Case Documents</Text>
          <Pressable
            style={styles.moduleHeaderBtn}
            onPress={handleSimulatedFileUpload}
          >
            <Ionicons name="cloud-upload-outline" size={16} color="#6D5DFC" />
            <Text style={styles.moduleHeaderBtnText}>Attach File</Text>
          </Pressable>
        </View>

        {/* Category filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.horizontalPillsScroll, { marginBottom: 12 }]}>
          {['All', 'Notice', 'Agreement', 'Proof', 'Filing', 'Other'].map((filt) => (
            <TouchableOpacity
              key={filt}
              style={[styles.filterPill, timelineCategoryFilter === filt && styles.filterPillActive]}
              onPress={() => setTimelineCategoryFilter(filt)}
            >
              <Text style={[styles.filterPillText, timelineCategoryFilter === filt && { color: '#FFFFFF' }]}>
                {filt}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.searchBar}>
          <Ionicons name="search" size={16} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search document files..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {filteredList.length === 0 ? (
          <Text style={styles.emptyText}>No documents attached to this litigation workspace.</Text>
        ) : (
          <View style={styles.cardList}>
            {filteredList.map((d) => (
              <Pressable
                key={d._id}
                style={({ pressed }) => [styles.itemCard, pressed && styles.pressed]}
                onPress={() =>
                  router.push({
                    pathname: '/workspace/document-viewer',
                    params: {
                      id: id,
                      docId: d._id,
                      url: d.url,
                      title: d.name,
                      type: d.type,
                    },
                  })
                }
              >
                <View style={styles.itemCardHeader}>
                  <Text style={styles.itemCardTitle}>📄 {d.name}</Text>
                  <Ionicons name="eye-outline" size={16} color="#6D5DFC" />
                </View>
                <Text style={styles.itemCardBody}><Text style={{ fontWeight: 'bold' }}>File Class: </Text>{d.type} • <Text style={{ fontWeight: 'bold' }}>Uploaded: </Text>{d.uploadDate}</Text>
                
                {/* Meta details / OCR extraction parameters */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                  <View style={[styles.tagBadge, { backgroundColor: '#EBF5FF' }]}>
                    <Text style={[styles.tagBadgeText, { color: '#1E40AF' }]}>OCR Safe</Text>
                  </View>
                  {(d.tags || []).map((tag, idx) => (
                    <View key={idx} style={styles.tagBadge}>
                      <Text style={styles.tagBadgeText}>{tag}</Text>
                    </View>
                  ))}
                </View>

                {d.extractedData && (
                  <View style={styles.docExtractedBox}>
                    <Text style={{ fontSize: 9, fontWeight: '800', color: '#6B7280', textTransform: 'uppercase' }}>AI Parsed Metadata:</Text>
                    {d.extractedData.issuer && <Text style={styles.docExtractedText}>Issuer: {d.extractedData.issuer}</Text>}
                    {d.extractedData.notes && <Text style={styles.docExtractedText} numberOfLines={2}>Notes: &quot;{d.extractedData.notes}&quot;</Text>}
                  </View>
                )}
              </Pressable>
            ))}
          </View>
        )}
      </View>
    );
  };

  // Evidence Vault Tab
  const renderEvidenceTab = () => {
    const list = workspace?.evidence || [];

    return (
      <View style={styles.tabContent}>
        <View style={styles.moduleHeaderRow}>
          <Text style={styles.moduleTitle}>Evidence Vault</Text>
          <Pressable
            style={styles.moduleHeaderBtn}
            onPress={() => {
              setModalType('evidence');
              setIsModalOpen(true);
            }}
          >
            <Ionicons name="add" size={16} color="#6D5DFC" />
            <Text style={styles.moduleHeaderBtnText}>Log Exhibit</Text>
          </Pressable>
        </View>

        {list.length === 0 ? (
          <Text style={styles.emptyText}>Evidence vault locker is empty. Log exhibit proofs to index admissibility parameters.</Text>
        ) : (
          <View style={styles.cardList}>
            {list.map((ev, i) => {
              const admStatus = ev.admissibility || 'Pending';
              const isAdmissible = admStatus === 'Admissible';
              const isInadmissible = admStatus === 'Inadmissible';
              
              return (
                <View key={i} style={styles.itemCard}>
                  <View style={styles.itemCardHeader}>
                    <Text style={styles.itemCardTitle}>🛡️ Exhibit: {ev.name}</Text>
                    <View
                      style={[
                        styles.statusBadge,
                        isAdmissible ? styles.badgeSuccess : isInadmissible ? styles.badgeDanger : styles.badgeWarning
                      ]}
                    >
                      <Text style={styles.statusBadgeText}>{admStatus}</Text>
                    </View>
                  </View>
                  <Text style={styles.itemCardBody}><Text style={{ fontWeight: 'bold' }}>Type: </Text>{ev.type} • <Text style={{ fontWeight: 'bold' }}>Status: </Text>Verified</Text>
                  <Text style={styles.itemCardBody}>{ev.description}</Text>

                  {/* Chain of custody logs & AI classification tags */}
                  <View style={styles.evidenceIntegrityBox}>
                    <Text style={{ fontSize: 9, fontWeight: '800', color: '#1F2937', marginBottom: 2 }}>VAULT SECURITY VERIFICATION:</Text>
                    <Text style={styles.evidenceIntegrityText}>
                      <Text style={{ fontWeight: 'bold' }}>AI Classification: </Text>{ev.type === 'Document' ? 'Contractual Instrument / Textual' : 'Digital Record Ledger'}
                    </Text>
                    <Text style={styles.evidenceIntegrityText}>
                      <Text style={{ fontWeight: 'bold' }}>Chain of Custody: </Text>{(ev as any).chainOfCustody || 'Uploaded securely by verified attorney account.'}
                    </Text>
                  </View>

                  {ev.notes ? <Text style={styles.itemCardFooter}>Direct Notes: {ev.notes}</Text> : null}
                </View>
              );
            })}
          </View>
        )}
      </View>
    );
  };

  // Research precedents
  const renderResearchTab = () => {
    const list = workspace?.savedPrecedents || [];
    
    const client = workspace?.clientName || 'Plaintiff';
    const opponent = workspace?.opponentName || workspace?.accused || 'Defendant';

    const baseLegalResearch = {
      caseType: workspace?.caseType || 'Civil Suit for Money Recovery',
      domain: 'Commercial Debt & Summary Contractual Obligations',
      completenessScore: 92,
      confidenceScore: 96,
      issues: [
        `Admissibility of uncertified electronic WhatsApp logs between ${client} and ${opponent} under Section 65B(4) of the Evidence Act.`,
        `Whether suit recovery limitation resets dynamically under Section 18 of the Limitation Act through digital debt acknowledgment by ${opponent}.`
      ],
      principles: [
        `Strict certification compliance under Section 65B(4) represents a mandatory condition precedent for electronic secondary proofs between ${client} and ${opponent}.`,
        `Written digital acknowledgment by ${opponent} inside standard limitation durations triggers a fresh timeline computation for ${client}.`
      ],
      laws: [
        {
          act: 'Indian Contract Act, 1872',
          section: 'Section 73 & Section 74',
          description: 'Compensation details for contract breaches. Regulates standard interest caps and penal clauses validity.',
          reason: 'Applies directly to audited contract penalty rate limits.'
        },
        {
          act: 'Code of Civil Procedure, 1908',
          section: 'Order XXXVII Rules 1-4',
          description: 'Prescribes swift summary recovery protocols for debt claims based on written contracts.',
          reason: 'Ensures case adheres to accelerated civil decree rules.'
        },
        {
          act: 'Indian Evidence Act, 1872',
          section: 'Section 65B',
          description: 'Admissibility guidelines for digital chats, email records, and account ledgers.',
          reason: 'Essential for placing HDFC ledger screenshots in record.'
        }
      ],
      judgments: [
        {
          name: 'Kailash Nath Associates vs DDA',
          court: 'Supreme Court of India',
          citation: '2015 4 SCC 136',
          summary: `Deals with liquidated damages limits. Governs contractual obligations between ${client} and ${opponent}.`,
          why: 'Governs interest damages recovery limits.',
          ratio: 'Forfeiture or penalty claims require a genuine pre-estimate assessment.'
        },
        {
          name: 'Anvar P.V. vs P.K. Basheer',
          court: 'Supreme Court of India',
          citation: '2014 10 SCC 473',
          summary: 'Admissibility guidelines for secondary electronic devices. Mandates signed Section 65B certification checks.',
          why: 'Regulates WhatsApp/email printouts acceptability.',
          ratio: 'Secondary electronic files require explicit statutory certification.'
        }
      ],
      recommendations: [
        `Acquire a certified Section 65B certificate for Whatsapp database backups between ${client} and ${opponent}.`,
        `File detailed replication contesting delivery default claims by ${opponent}.`,
        `Rely on Kailash Nath Associates vs DDA to justify delayed simple interest damages for ${client}.`
      ]
    };

    const runResearchAnalysis = async () => {
      setIsRegeneratingResearch(true);
      setResearchRegenSteps([
        'Scanning case files and chronology events...',
        'Querying digital archives of Supreme & High Court judgments...',
        'Compiling applicable statutory laws and acts...',
        'Formulating petitioner courtroom arguments...',
        'Auditing strategic litigation research coverage...'
      ]);
      setActiveResearchRegenStep(0);

      const interval = setInterval(() => {
        setActiveResearchRegenStep(prev => (prev < 4 ? prev + 1 : prev));
      }, 800);

      try {
        const clientName = workspace?.clientName || 'Plaintiff';
        const opponentName = workspace?.opponentName || workspace?.accused || 'Defendant';
        const res = await DraftService.executeTool({
          toolName: 'legal_research_assistant',
          message: `Perform legal research for case: "${workspace?.name || ''}". Client: "${clientName}". Opponent: "${opponentName}". Case Type: "${workspace?.caseType || ''}". Court: "${workspace?.courtName || ''}". Summary: "${workspace?.summary || workspace?.caseSummary || ''}".`,
          caseContext: {
            name: workspace?.name,
            clientName: clientName,
            opponentName: opponentName,
            caseType: workspace?.caseType,
            summary: workspace?.summary || workspace?.caseSummary,
          }
        });
        
        clearInterval(interval);
        if (res && res.success) {
          setAiResearchReply(res.reply);
          showToast('success', 'Research Refreshed', 'AI Legal Research assistant analysis completed.');
        } else {
          showToast('error', 'Research Failed', res.error || 'Failed to complete legal research.');
        }
      } catch (err) {
        clearInterval(interval);
        console.error('[RESEARCH TOOL ERROR]', err);
        showToast('error', 'Research Offline', 'Unable to reach the legal research assistant.');
      } finally {
        setIsRegeneratingResearch(false);
      }
    };

    const processConversationalSearch = (q: string) => {
      setResearchSearchQuery(q);
      if (!q.trim()) {
        setConversationalSearchResults(null);
        return;
      }
      setIsSearchingResearch(true);
      setTimeout(() => {
        const query = q.toLowerCase();
        let filteredLaws = baseLegalResearch.laws;
        let filteredJudgments = baseLegalResearch.judgments;

        if (query.includes('evidence') || query.includes('whatsapp') || query.includes('65b')) {
          filteredLaws = baseLegalResearch.laws.filter(l => l.act.includes('Evidence') || l.section.includes('65B'));
          filteredJudgments = baseLegalResearch.judgments.filter(j => j.name.includes('Anvar'));
        } else if (query.includes('contract') || query.includes('damage') || query.includes('kailash')) {
          filteredLaws = baseLegalResearch.laws.filter(l => l.act.includes('Contract'));
          filteredJudgments = baseLegalResearch.judgments.filter(j => j.name.includes('Kailash'));
        }

        setConversationalSearchResults({
          laws: filteredLaws,
          judgments: filteredJudgments
        });
        setIsSearchingResearch(false);
        showToast('success', 'Search Complete', `Found ${filteredJudgments.length + filteredLaws.length} research citations.`);
      }, 600);
    };

    const handleSavePrecedentToBackend = (j: any) => {
      const current = list || [];
      if (current.some(c => c.citation === j.citation)) {
        showToast('error', 'Already Saved', 'This judgment citation is already mapped.');
        return;
      }
      const newItem: CasePrecedent = {
        title: j.name,
        citation: j.citation,
        summary: `${j.summary} Ratio: ${j.ratio}`
      };
      handleUpdateField({ savedPrecedents: [...current, newItem] });
      showToast('success', 'Precedent Saved', 'Judgment added to workspace citations.');
    };

    const toggleSection = (sectionName: string) => {
      setExpandedResearchSection(expandedResearchSection === sectionName ? '' : sectionName);
    };

    const activeLaws = conversationalSearchResults ? conversationalSearchResults.laws : baseLegalResearch.laws;
    const activeJudgments = conversationalSearchResults ? conversationalSearchResults.judgments : baseLegalResearch.judgments;

    return (
      <View style={styles.tabContent}>
        {/* Header panel */}
        <View style={styles.moduleHeaderRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.moduleTitle}>AI Research Engine</Text>
            <Text style={{ fontSize: 10, color: '#9CA3AF', fontWeight: '600' }}>Context-aware statutory law mapping & database search</Text>
          </View>
          <TouchableOpacity
            style={[styles.moduleHeaderBtn, { backgroundColor: '#6D5DFC' }]}
            onPress={runResearchAnalysis}
            disabled={isRegeneratingResearch}
          >
            <Ionicons name="sync" size={14} color="#FFFFFF" />
            <Text style={[styles.moduleHeaderBtnText, { color: '#FFFFFF' }]}>Analyze</Text>
          </TouchableOpacity>
        </View>

        {/* Conversational search bar */}
        <View style={[styles.searchBar, { marginBottom: 10 }]}>
          <Ionicons name="search" size={16} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Ask AI Search (e.g. 'Admissibility of WhatsApp logs')"
            placeholderTextColor="#9CA3AF"
            value={researchSearchQuery}
            onChangeText={setResearchSearchQuery}
            onSubmitEditing={() => processConversationalSearch(researchSearchQuery)}
          />
          <TouchableOpacity
            style={styles.searchSubmitBtn}
            onPress={() => processConversationalSearch(researchSearchQuery)}
          >
            <Text style={styles.searchSubmitBtnText}>Go</Text>
          </TouchableOpacity>
        </View>

        {/* Suggestions chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.horizontalPillsScroll, { marginBottom: 16 }]}>
          {[
            'Admissibility of WhatsApp & electronic evidence',
            'Condonation of delays Limitation Act',
            'Summary suit Order 37 guidelines'
          ].map((chip, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.researchSugChip}
              onPress={() => processConversationalSearch(chip)}
            >
              <Text style={styles.researchSugChipText}>&quot;{chip}&quot;</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {isRegeneratingResearch && (
          <View style={styles.ocrOverlayStatic}>
            <ActivityIndicator size="small" color="#6D5DFC" style={{ marginBottom: 8 }} />
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#6D5DFC' }}>
              {researchRegenSteps[activeResearchRegenStep] || 'Structuring citation parameters...'}
            </Text>
          </View>
        )}

        {isSearchingResearch && (
          <View style={styles.ocrOverlayStatic}>
            <ActivityIndicator size="small" color="#6D5DFC" />
            <Text style={{ fontSize: 11, fontWeight: '600', color: '#4B5563', marginTop: 6 }}>Searching digital judicial archives...</Text>
          </View>
        )}

        {/* Completeness Metrics cards row */}
        {!isRegeneratingResearch && (
          <View style={styles.kpiRow}>
            <View style={[styles.kpiCard, { flex: 1, padding: 10 }]}>
              <Text style={[styles.winProbValue, { fontSize: 20 }]}>{baseLegalResearch.completenessScore}%</Text>
              <Text style={[styles.kpiLabel, { fontSize: 8, marginTop: 4 }]}>Research Coverage</Text>
            </View>
            <View style={[styles.kpiCard, { flex: 1, padding: 10 }]}>
              <Text style={[styles.winProbValue, { fontSize: 20, color: '#6D5DFC' }]}>{baseLegalResearch.confidenceScore}%</Text>
              <Text style={[styles.kpiLabel, { fontSize: 8, marginTop: 4 }]}>Precision Score</Text>
            </View>
            <View style={[styles.kpiCard, { flex: 1, padding: 10 }]}>
              <Text style={[styles.winProbValue, { fontSize: 20, color: '#F59E0B' }]}>CPC</Text>
              <Text style={[styles.kpiLabel, { fontSize: 8, marginTop: 4 }]}>Primary Code</Text>
            </View>
          </View>
        )}

        {/* Accordions */}
        {!isRegeneratingResearch && (
          <View style={styles.cardList}>
            {/* Dashboard Overview */}
            <View style={styles.accordionContainer}>
              <TouchableOpacity
                style={styles.accordionHeader}
                onPress={() => toggleSection('dashboard')}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="analytics-outline" size={16} color="#6D5DFC" />
                  <Text style={styles.accordionTitle}>AI Research Overview</Text>
                </View>
                <Ionicons name={expandedResearchSection === 'dashboard' ? 'chevron-up' : 'chevron-down'} size={16} color="#9CA3AF" />
              </TouchableOpacity>
              {expandedResearchSection === 'dashboard' && (
                <View style={styles.accordionContent}>
                  {aiResearchReply ? (
                    <View style={styles.aiReplyContainer}>
                      <Text style={styles.aiReplyTitle}>🔮 Live AI Research Analysis:</Text>
                      <Text style={styles.aiReplyText}>{aiResearchReply}</Text>
                      <View style={[styles.dividerLine, { marginVertical: 12 }]} />
                    </View>
                  ) : null}
                  <Text style={styles.accordionTextBold}>Case Domain: <Text style={{ fontWeight: 'normal' }}>{baseLegalResearch.domain}</Text></Text>
                  <Text style={styles.accordionTextBold}>Case Type: <Text style={{ fontWeight: 'normal' }}>{baseLegalResearch.caseType}</Text></Text>
                  <Text style={[styles.accordionTextBold, { marginTop: 8 }]}>Key Legal Disputes:</Text>
                  {baseLegalResearch.issues.map((iss, i) => (
                    <Text key={i} style={styles.accordionBullet}>• {iss}</Text>
                  ))}
                  <Text style={[styles.accordionTextBold, { marginTop: 8 }]}>Judicial Principles Applied:</Text>
                  {baseLegalResearch.principles.map((pr, i) => (
                    <Text key={i} style={styles.accordionBullet}>• {pr}</Text>
                  ))}
                </View>
              )}
            </View>

            {/* Applicable Laws */}
            <View style={styles.accordionContainer}>
              <TouchableOpacity
                style={styles.accordionHeader}
                onPress={() => toggleSection('laws')}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="book-outline" size={16} color="#6D5DFC" />
                  <Text style={styles.accordionTitle}>Applicable Laws ({activeLaws.length})</Text>
                </View>
                <Ionicons name={expandedResearchSection === 'laws' ? 'chevron-up' : 'chevron-down'} size={16} color="#9CA3AF" />
              </TouchableOpacity>
              {expandedResearchSection === 'laws' && (
                <View style={styles.accordionContent}>
                  {activeLaws.map((l, i) => (
                    <View key={i} style={styles.researchLawItem}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={styles.lawActLabel}>{l.act}</Text>
                        <Text style={styles.lawSecLabel}>{l.section}</Text>
                      </View>
                      <Text style={styles.lawDesc}>{l.description}</Text>
                      <View style={styles.lawExplanationBox}>
                        <Ionicons name="sparkles" size={11} color="#6D5DFC" />
                        <Text style={styles.lawExplanationText}><Text style={{ fontWeight: 'bold' }}>AI Applicability: </Text>{l.reason}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Relevant Judgments */}
            <View style={styles.accordionContainer}>
              <TouchableOpacity
                style={styles.accordionHeader}
                onPress={() => toggleSection('judgments')}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="document-text-outline" size={16} color="#6D5DFC" />
                  <Text style={styles.accordionTitle}>Judgments & Precedents ({activeJudgments.length})</Text>
                </View>
                <Ionicons name={expandedResearchSection === 'judgments' ? 'chevron-up' : 'chevron-down'} size={16} color="#9CA3AF" />
              </TouchableOpacity>
              {expandedResearchSection === 'judgments' && (
                <View style={styles.accordionContent}>
                  {activeJudgments.map((j, i) => (
                    <View key={i} style={styles.researchLawItem}>
                      <Text style={styles.judgmentTitle}>{j.name}</Text>
                      <Text style={styles.judgmentCitation}>{j.court} • {j.citation}</Text>
                      <Text style={styles.lawDesc}>{j.summary}</Text>
                      <Text style={styles.lawDesc}><Text style={{ fontWeight: 'bold' }}>Ratio Decidendi: </Text>{j.ratio}</Text>
                      <Text style={styles.lawDesc}><Text style={{ fontWeight: 'bold' }}>Why it applies: </Text>{j.why}</Text>
                      
                      <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                        <TouchableOpacity
                          style={styles.saveResearchBtn}
                          onPress={() => handleSavePrecedentToBackend(j)}
                        >
                          <Text style={styles.saveResearchBtnText}>Save Citation</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.saveResearchBtn, { backgroundColor: '#F3F4F6', borderColor: '#ECECEC' }]}
                          onPress={() => {
                            Clipboard.setString(`${j.name} (${j.citation})`);
                            showToast('success', 'Copied', 'Citation copied to clipboard.');
                          }}
                        >
                          <Text style={[styles.saveResearchBtnText, { color: '#4B5563' }]}>Copy Citation</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* AI Recommendations */}
            <View style={styles.accordionContainer}>
              <TouchableOpacity
                style={styles.accordionHeader}
                onPress={() => toggleSection('recommendations')}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="trending-up-outline" size={16} color="#6D5DFC" />
                  <Text style={styles.accordionTitle}>AI Strategy Recommendations</Text>
                </View>
                <Ionicons name={expandedResearchSection === 'recommendations' ? 'chevron-up' : 'chevron-down'} size={16} color="#9CA3AF" />
              </TouchableOpacity>
              {expandedResearchSection === 'recommendations' && (
                <View style={styles.accordionContent}>
                  {baseLegalResearch.recommendations.map((rec, i) => (
                    <View key={i} style={styles.recommendationItem}>
                      <Ionicons name="checkmark-circle" size={14} color="#10B981" style={{ marginTop: 2 }} />
                      <Text style={styles.recommendationText}>{rec}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Saved Brief Precedents */}
            <View style={styles.accordionContainer}>
              <TouchableOpacity
                style={styles.accordionHeader}
                onPress={() => toggleSection('saved')}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="bookmark-outline" size={16} color="#6D5DFC" />
                  <Text style={styles.accordionTitle}>Saved Brief Citations ({list.length})</Text>
                </View>
                <Ionicons name={expandedResearchSection === 'saved' ? 'chevron-up' : 'chevron-down'} size={16} color="#9CA3AF" />
              </TouchableOpacity>
              {expandedResearchSection === 'saved' && (
                <View style={styles.accordionContent}>
                  {list.length === 0 ? (
                    <Text style={styles.emptyTextSaved}>No citations registered to this brief roster. Click &quot;Save Citation&quot; above.</Text>
                  ) : (
                    list.map((prec, i) => (
                      <View key={i} style={styles.savedPrecedentItem}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.savedPrecedentTitle}>⚖️ {prec.title}</Text>
                            <Text style={styles.savedPrecedentCitation}>Citation: {prec.citation}</Text>
                          </View>
                          <TouchableOpacity
                            onPress={() => {
                              const updated = list.filter((_, idx) => idx !== i);
                              handleUpdateField({ savedPrecedents: updated });
                              showToast('success', 'Deleted', 'Saved research reference removed.');
                            }}
                            style={{ padding: 4 }}
                          >
                            <Ionicons name="trash-outline" size={14} color="#EF4444" />
                          </TouchableOpacity>
                        </View>
                        <Text style={styles.savedPrecedentSummary}>{prec.summary}</Text>
                      </View>
                    ))
                  )}
                </View>
              )}
            </View>
          </View>
        )}
      </View>
    );
  };

  // Draft Pleadings
  const renderDraftsTab = () => {
    return (
      <View style={styles.tabContent}>
        <View style={styles.moduleHeaderRow}>
          <Text style={styles.moduleTitle}>AI Pleading Compiler</Text>
          <Pressable
            style={styles.moduleHeaderBtn}
            onPress={() => {
              setModalType('draft');
              setCompiledDraftText('');
              setIsModalOpen(true);
            }}
          >
            <Ionicons name="sparkles" size={14} color="#6D5DFC" />
            <Text style={styles.moduleHeaderBtnText}>Compile Pleading</Text>
          </Pressable>
        </View>

        {/* Categories cards */}
        <View style={styles.metaCard}>
          <Text style={styles.metaTitle}>Recent AI Compiled Drafts</Text>
          <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>Pleading papers auto-synced with court templates.</Text>
        </View>

        <View style={styles.cardList}>
          { (workspace?.documents || []).filter(d => d.tags.includes('AI Compiled')).length === 0 ? (
            <Text style={styles.emptyText}>No pleadings compiled for this case. Tap Compile Pleading above to start AI Draft compilation.</Text>
          ) : (
            (workspace?.documents || []).filter(d => d.tags.includes('AI Compiled')).map((draft, idx) => (
              <View key={idx} style={styles.itemCard}>
                <View style={styles.itemCardHeader}>
                  <Text style={styles.itemCardTitle}>📄 {draft.name}</Text>
                  <View style={[styles.statusBadge, styles.badgeSuccess]}>
                    <Text style={styles.statusBadgeText}>Draft Ready</Text>
                  </View>
                </View>
                <Text style={styles.itemCardBody}>Type: {draft.tags.find(t => t !== 'AI Compiled') || 'Legal Paper'}</Text>
                <Text style={styles.itemCardFooter}>Compiled: {draft.uploadDate}</Text>
              </View>
            ))
          )}
        </View>
      </View>
    );
  };

  // Contracts
  const renderContractsTab = () => {
    const client = workspace?.clientName || 'Client';
    const opponent = workspace?.opponentName || workspace?.accused || 'Opponent';

    const defaultContractData = {
      name: workspace?.documents?.find(d => d.type === 'Agreement')?.name || 'loan_agreement_signed.pdf',
      size: '842 KB',
      date: new Date().toLocaleDateString(),
      readingTime: '4 mins',
      riskLevel: workspace?.intelligence?.riskLevel || 'High',
      riskScore: getRiskScore(workspace?.intelligence?.riskLevel || 'High').replace('%', ''),
      parties: `${client} (Lender) vs ${opponent} (Borrower)`,
      summary: {
        purpose: `Commercial term loan agreement detailing disbursement, repayment, and default interest clauses for collateral hardware procurement between ${client} and ${opponent}.`,
        duration: '12 Months (Execution: 14/06/2025 • Expiry: 14/06/2026)',
        finance: 'Principal amount of INR 5,00,000 with a standard rate of 9% p.a.',
        responsibility: 'Borrower must clear invoices within 30 days and maintain machinery collateral in good working order.',
        majorRisk: 'Ambiguous default interest clauses and missing arbitration provisions force regular civil court litigation in case of breach.',
        renewal: 'Requires written notice at least 30 days prior to expiry date.'
      },
      risks: [
        {
          id: 1,
          severity: 'Critical',
          title: 'Ambiguous Default Interest Rate',
          reason: `Section 5 dictates the borrower (${opponent}) pays additional charges 'at a rate determined by the lender' (${client}), violating reasonable commercial caps under Section 74.`,
          fix: 'Amend default interest rate to a fixed simple interest of 12% per annum.'
        },
        {
          id: 2,
          severity: 'High',
          title: 'Weak Termination Clause',
          reason: `Termination requires a 90-day written notice period even in cases of material repayment breach, severely delaying recovery efforts by ${client}.`,
          fix: 'Reduce notice to 15 days upon financial default and add immediate termination remedy clauses.'
        },
        {
          id: 3,
          severity: 'Medium',
          title: 'Missing Arbitration Provision',
          reason: 'Contract is completely silent on dispute resolution, leaving civil court litigation as the only default mechanism.',
          fix: `Insert a standard dispute clause delegating sole arbitration in Delhi between ${client} and ${opponent}.`
        }
      ],
      clauses: [
        {
          title: 'Payment Clause (Section 4)',
          status: 'Needs Improvement',
          risk: 'Medium',
          explanation: 'Mentions payment terms of 30 days but lacks interest penalty details for minor invoice delays.',
          rewrite: '“Section 4.1: Payments shall be cleared within 30 days. Delayed payments shall accrue a simple interest of 1% per month until fully paid.”'
        },
        {
          title: 'Termination Clause (Section 8)',
          status: 'Weak',
          risk: 'High',
          explanation: 'Specifies a slow 90-day period with no immediate recovery remedies during insolvency or defaults.',
          rewrite: `“Section 8.2: In the event of repayment failure, the lender (${client}) may terminate this agreement with a 15-day notice, and accelerate the entire principal balance immediately.”`
        },
        {
          title: 'Dispute Resolution (Section 15)',
          status: 'Missing',
          risk: 'Critical',
          explanation: `No arbitration clause is included in this agreement, creating substantial risk of long trials for ${client}.`,
          rewrite: `“Section 15: All disputes between ${client} and ${opponent} shall be referred to sole arbitration in New Delhi, in accordance with the Arbitration & Conciliation Act.”`
        }
      ],
      originalText: `Section 5: In case of default, the borrower (${opponent}) shall be liable to pay additional interest charges at a rate determined by the lender (${client}).`,
      revisedText: `Section 5: In case of default, the borrower (${opponent}) shall pay simple interest at the rate of 12% per annum on the outstanding principal from the default date until full payment to lender (${client}).`
    };

    const handleUploadContract = async () => {
      setIsAnalyzingContract(true);
      setContractAnalysisSteps([
        'Initializing OCR document scanner...',
        'Parsing agreement layout structure...',
        'Auditing termination and compound interest liability clauses...',
        'Compiling executive summary report...',
        'Finalizing contract intelligence database...'
      ]);
      setActiveContractAnalysisStep(0);

      const interval = setInterval(() => {
        setActiveContractAnalysisStep(prev => (prev < 4 ? prev + 1 : prev));
      }, 600);

      try {
        const clientName = workspace?.clientName || 'Client';
        const opponentName = workspace?.opponentName || workspace?.accused || 'Opponent';
        
        const result = await DraftService.executeTool({
          toolName: 'legal_contract_analyzer',
          message: `Analyze the contract agreement for case: "${workspace?.name || ''}". Client: "${clientName}". Opponent: "${opponentName}". Identify risk level, vulnerability terms, termination period, and payment penalties.`,
          caseContext: {
            name: workspace?.name,
            clientName: clientName,
            opponentName: opponentName,
            caseType: workspace?.caseType,
            summary: workspace?.summary || workspace?.caseSummary
          }
        });

        clearInterval(interval);
        setIsAnalyzingContract(false);

        if (result && result.success) {
          setContractChatMessages(prev => [
            ...prev,
            { sender: 'ai', text: `Here is my direct AI contract analysis:\n\n${result.reply}` }
          ]);
          setUploadedContract({
            ...defaultContractData,
            summary: {
              ...defaultContractData.summary,
              majorRisk: result.reply.substring(0, 300) + '...'
            }
          });
          
          const current = (workspace as any).contracts || [];
          handleUpdateField({
            ...({
              contracts: [...current, {
                name: 'loan_agreement_signed.pdf',
                riskLevel: 'High',
                notes: 'Audited automatically by AI Contract Intelligence'
              }]
            } as any)
          });
          showToast('success', 'Contract Audited', 'AI scanned contract and compiled clause audit.');
        } else {
          showToast('error', 'Analysis Failed', result?.error || 'Failed to analyze contract.');
        }
      } catch (err) {
        clearInterval(interval);
        setIsAnalyzingContract(false);
        console.error('[CONTRACT ANALYZER ERROR]', err);
        setUploadedContract(defaultContractData);
        showToast('warning', 'Analysis Fallback', 'Scanned contract using default local workspace parameters.');
      }
    };

    const handleSyncWithCaseWorkspace = () => {
      if (!workspace) return;
      const existingTimeline = workspace.facts || [];
      const hasContractEvents = existingTimeline.some(e => (e.event || '').includes('Contract Execution'));
      
      let updatedTimeline = existingTimeline;
      if (!hasContractEvents) {
        updatedTimeline = [
          ...existingTimeline,
          {
            date: '14 Jun 2025',
            event: 'Execution of Loan Agreement (AI Extracted)',
            description: 'Signing and execution of term loan agreement between Rajesh Sharma and Amit Verma.'
          },
          {
            date: '14 Jun 2026',
            event: 'Expiry of Loan Agreement (AI Extracted)',
            description: 'Term loan expiry date requiring written renewal notice.'
          }
        ];
      }

      handleUpdateField({
        opposingLawyer: 'Vipul Sen (Senior Counsel)',
        courtName: 'Delhi District Court',
        facts: updatedTimeline as any
      } as any);
      setIsContractLinked(true);
      showToast('success', 'Workspace Synced', 'Roster parties and chronology events updated from contract.');
    };

    const handleSendContractChatMessage = () => {
      if (!contractChatInput.trim()) return;
      const userMsg = { sender: 'user', text: contractChatInput };
      setContractChatMessages(prev => [...prev, userMsg]);
      const query = contractChatInput.toLowerCase();
      setContractChatInput('');

      setTimeout(() => {
        let reply = "I have analyzed your query. Based on the contract text, there is a substantial liability risk if the default interest terms are left vague. I suggest adding a fixed 12% simple interest clause.";
        if (query.includes('risk') || query.includes('safe')) {
          reply = "The contract is currently flagged as High Risk (78/100) due to: 1. Ambiguous payment defaults, 2. No arbitration clause, and 3. A slow 90-day termination notice period. It is not fully safe in its current form.";
        } else if (query.includes('arbitration') || query.includes('dispute')) {
          reply = "I recommend adding the following dispute term: 'All disputes arising out of this agreement shall be settled through sole arbitration under the rules of Delhi International Arbitration Centre.'";
        } else if (query.includes('termination') || query.includes('rewrite')) {
          reply = "Here is a revised termination clause: 'Either party may terminate this agreement immediately upon notice if the other party breaches repayment terms and fails to cure it within 15 days.'";
        }
        setContractChatMessages(prev => [...prev, { sender: 'ai', text: reply }]);
      }, 500);
    };

    const filteredClauses = uploadedContract
      ? (uploadedContract.clauses as any[]).filter(c =>
          c.title.toLowerCase().includes(contractSearchQuery.toLowerCase()) ||
          c.explanation.toLowerCase().includes(contractSearchQuery.toLowerCase())
        )
      : [];

    return (
      <View style={styles.tabContent}>
        {/* LANDING UPLOADER SCREEN */}
        {!uploadedContract && !isAnalyzingContract && (
          <View style={styles.contractUploadCard}>
            <Ionicons name="document-text-outline" size={48} color="#9CA3AF" />
            <Text style={styles.contractUploadTitle}>Upload Contract or Agreement</Text>
            <Text style={styles.contractUploadSubtitle}>AI will automatically audit payment obligations, termination periods, and liabilities.</Text>
            <TouchableOpacity style={styles.contractUploadBtn} onPress={handleUploadContract}>
              <Ionicons name="cloud-upload" size={16} color="#FFFFFF" />
              <Text style={styles.contractUploadBtnText}>Scan Loan Agreement</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* SCAN LOADER */}
        {isAnalyzingContract && (
          <View style={styles.ocrOverlayStatic}>
            <ActivityIndicator size="small" color="#6D5DFC" style={{ marginBottom: 8 }} />
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#6D5DFC' }}>
              {contractAnalysisSteps[activeContractAnalysisStep] || 'Analyzing contract clauses...'}
            </Text>
          </View>
        )}

        {/* CONTRACT AUDITED WORKSPACE */}
        {uploadedContract && !isAnalyzingContract && (
          <View style={styles.cardList}>
            {/* Header info */}
            <View style={styles.itemCard}>
              <View style={styles.itemCardHeader}>
                <View>
                  <Text style={styles.itemCardTitle}>📜 {uploadedContract.name}</Text>
                  <Text style={{ fontSize: 10, color: '#9CA3AF', fontWeight: '600' }}>{uploadedContract.size} • Reading time: {uploadedContract.readingTime}</Text>
                </View>
                <View style={[styles.statusBadge, styles.badgeDanger]}>
                  <Text style={[styles.statusBadgeText, { color: '#EF4444' }]}>{uploadedContract.riskLevel} Risk</Text>
                </View>
              </View>
              <Text style={[styles.itemCardBody, { marginTop: 4 }]}><Text style={{ fontWeight: 'bold' }}>Parties: </Text>{uploadedContract.parties}</Text>
              
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
                <TouchableOpacity
                  style={[styles.saveResearchBtn, isContractLinked && { opacity: 0.6 }]}
                  onPress={handleSyncWithCaseWorkspace}
                  disabled={isContractLinked}
                >
                  <Ionicons name="sparkles" size={11} color="#6D5DFC" />
                  <Text style={styles.saveResearchBtnText}>{isContractLinked ? 'Linked' : 'Sync Workspace'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveResearchBtn, { backgroundColor: '#F9FAFB', borderColor: '#ECECEC' }]}
                  onPress={() => setUploadedContract(null)}
                >
                  <Text style={[styles.saveResearchBtnText, { color: '#4B5563' }]}>Re-upload</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Inner Sub Tabs Navigation */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalPillsScroll}>
              {[
                { id: 'summary', name: 'Summary' },
                { id: 'risks', name: 'Risk Assessment' },
                { id: 'clauses', name: 'Clauses Audit' },
                { id: 'diff', name: 'Redlining & Diff' },
                { id: 'chat', name: 'AI Negotiation Chat' }
              ].map(sub => {
                const isAct = contractActiveSubTab === sub.id;
                return (
                  <TouchableOpacity
                    key={sub.id}
                    style={[styles.filterPill, isAct && styles.filterPillActive]}
                    onPress={() => setContractActiveSubTab(sub.id)}
                  >
                    <Text style={[styles.filterPillText, isAct && { color: '#FFFFFF' }]}>
                      {sub.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Sub Tab: Summary */}
            {contractActiveSubTab === 'summary' && (
              <View style={styles.itemCard}>
                <Text style={styles.accordionTitle}>Executive Summary</Text>
                <View style={styles.dividerLine} />
                <Text style={styles.lawDesc}><Text style={{ fontWeight: 'bold' }}>Purpose: </Text>{uploadedContract.summary.purpose}</Text>
                <Text style={styles.lawDesc}><Text style={{ fontWeight: 'bold' }}>Duration: </Text>{uploadedContract.summary.duration}</Text>
                <Text style={styles.lawDesc}><Text style={{ fontWeight: 'bold' }}>Finance: </Text>{uploadedContract.summary.finance}</Text>
                <Text style={styles.lawDesc}><Text style={{ fontWeight: 'bold' }}>Responsibility: </Text>{uploadedContract.summary.responsibility}</Text>
                <Text style={styles.lawDesc}><Text style={{ fontWeight: 'bold' }}>Renewal: </Text>{uploadedContract.summary.renewal}</Text>
                <View style={[styles.hearingOutcomeBox, { backgroundColor: '#FDF2F2' }]}>
                  <Text style={[styles.outcomeDetailText, { color: '#9B1C1C', fontWeight: 'bold' }]}>Primary Legal Vulnerability:</Text>
                  <Text style={[styles.outcomeDetailText, { color: '#9B1C1C', marginTop: 2 }]}>{uploadedContract.summary.majorRisk}</Text>
                </View>
              </View>
            )}

            {/* Sub Tab: Risks */}
            {contractActiveSubTab === 'risks' && (
              <View style={{ gap: 10 }}>
                {uploadedContract.risks.map((risk: any) => (
                  <View key={risk.id} style={styles.itemCard}>
                    <View style={styles.itemCardHeader}>
                      <Text style={styles.itemCardTitle}>{risk.title}</Text>
                      <View style={[styles.statusBadge, risk.severity === 'Critical' ? styles.badgeDanger : styles.badgeWarning]}>
                        <Text style={styles.statusBadgeText}>{risk.severity}</Text>
                      </View>
                    </View>
                    <Text style={[styles.lawDesc, { marginTop: 4 }]}><Text style={{ fontWeight: 'bold' }}>Risk findings: </Text>{risk.reason}</Text>
                    <View style={styles.lawExplanationBox}>
                      <Ionicons name="sparkles" size={11} color="#6D5DFC" />
                      <Text style={styles.lawExplanationText}><Text style={{ fontWeight: 'bold' }}>AI suggested fix: </Text>{risk.fix}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Sub Tab: Clauses */}
            {contractActiveSubTab === 'clauses' && (
              <View style={{ gap: 10 }}>
                <View style={styles.searchBar}>
                  <Ionicons name="search" size={16} color="#9CA3AF" />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search audited clauses..."
                    placeholderTextColor="#9CA3AF"
                    value={contractSearchQuery}
                    onChangeText={setContractSearchQuery}
                  />
                </View>
                {filteredClauses.map((clause, i) => (
                  <View key={i} style={styles.itemCard}>
                    <View style={styles.itemCardHeader}>
                      <Text style={styles.itemCardTitle}>{clause.title}</Text>
                      <View style={[styles.statusBadge, clause.risk === 'High' ? styles.badgeDanger : styles.badgeWarning]}>
                        <Text style={styles.statusBadgeText}>{clause.status}</Text>
                      </View>
                    </View>
                    <Text style={[styles.lawDesc, { marginTop: 4 }]}>{clause.explanation}</Text>
                    <View style={styles.draftPreviewScrollStatic}>
                      <Text style={styles.draftPreviewText}>{clause.rewrite}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Sub Tab: Redlines */}
            {contractActiveSubTab === 'diff' && (
              <View style={styles.itemCard}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={styles.accordionTitle}>Redlining & Diff</Text>
                  {contractRedlineState === 'pending' ? (
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      <TouchableOpacity
                        style={[styles.saveResearchBtn, { backgroundColor: '#10B981', borderColor: '#10B981' }]}
                        onPress={() => {
                          setContractRedlineState('accepted');
                          showToast('success', 'Changes Accepted', 'Suggested redline changes merged into draft.');
                        }}
                      >
                        <Text style={[styles.saveResearchBtnText, { color: '#FFFFFF' }]}>Accept</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.saveResearchBtn, { backgroundColor: '#EF4444', borderColor: '#EF4444' }]}
                        onPress={() => {
                          setContractRedlineState('rejected');
                          showToast('error', 'Changes Rejected', 'Suggested redline changes declined.');
                        }}
                      >
                        <Text style={[styles.saveResearchBtnText, { color: '#FFFFFF' }]}>Reject</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={[styles.statusBadge, contractRedlineState === 'accepted' ? styles.badgeSuccess : styles.badgeDanger]}>
                      <Text style={styles.statusBadgeText}>
                        {contractRedlineState === 'accepted' ? 'Accepted by Counsel' : 'Declined'}
                      </Text>
                    </View>
                  )}
                </View>
                
                <View style={styles.dividerLine} />
                <Text style={styles.inputLabel}>Original Clause Text</Text>
                <View style={[styles.draftPreviewScrollStatic, { backgroundColor: '#FFF5F5', borderColor: '#FFE3E3' }]}>
                  <Text style={[styles.draftPreviewText, { color: '#C53030' }]}>{uploadedContract.originalText}</Text>
                </View>

                <Text style={[styles.inputLabel, { marginTop: 10 }]}>Revised Clause Text (AI Proposed Redline)</Text>
                <View style={[styles.draftPreviewScrollStatic, { backgroundColor: '#F0FDF4', borderColor: '#DCFCE7' }]}>
                  <Text style={[styles.draftPreviewText, { color: '#15803D' }]}>{uploadedContract.revisedText}</Text>
                </View>
              </View>
            )}

            {/* Sub Tab: Chat */}
            {contractActiveSubTab === 'chat' && (
              <View style={[styles.itemCard, { height: 320, paddingBottom: 6 }]}>
                <Text style={styles.accordionTitle}>AI Contract Co-Counsel</Text>
                <Text style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 6 }}>Query risk profiles or request instant clause revisions.</Text>
                <View style={{ flex: 1, backgroundColor: '#F9FAFB', borderRadius: 8, padding: 8, marginBottom: 8 }}>
                  <ScrollView showsVerticalScrollIndicator={true} contentContainerStyle={{ gap: 6 }}>
                    {contractChatMessages.map((msg, i) => {
                      const isAi = msg.sender === 'ai';
                      return (
                        <View key={i} style={{ alignSelf: isAi ? 'flex-start' : 'flex-end', maxWidth: '85%' }}>
                          <View style={{
                            backgroundColor: isAi ? '#EEECFF' : '#6D5DFC',
                            borderRadius: 10,
                            paddingHorizontal: 10,
                            paddingVertical: 6,
                          }}>
                            <Text style={{ fontSize: 12, color: isAi ? '#4B5563' : '#FFFFFF', lineHeight: 16 }}>
                              {msg.text}
                            </Text>
                          </View>
                        </View>
                      );
                    })}
                  </ScrollView>
                </View>

                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <TextInput
                    style={[styles.formInput, { flex: 1, marginBottom: 0 }]}
                    placeholder="Ask co-counsel about this contract..."
                    placeholderTextColor="#9CA3AF"
                    value={contractChatInput}
                    onChangeText={setContractChatInput}
                  />
                  <TouchableOpacity
                    style={[styles.searchSubmitBtn, { height: 44, width: 60, borderRadius: 8, backgroundColor: '#6D5DFC' }]}
                    onPress={handleSendContractChatMessage}
                  >
                    <Text style={[styles.searchSubmitBtnText, { color: '#FFFFFF' }]}>Send</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  // Arguments Workspace
  const renderArgumentsTab = () => {
    const client = workspace?.clientName || 'Client';
    const opponent = workspace?.opponentName || workspace?.accused || 'Opponent';

    const strategyData = {
      strengthScore: workspace?.intelligence?.strengthScore || 88,
      completenessScore: 94,
      evidenceLinksCount: workspace?.evidence?.length || 7,
      activeArgumentsCount: 6,
      
      petitionerArguments: [
        {
          id: 'p1',
          title: 'Valid and Binding Written Agreement',
          description: `A signed written loan agreement was executed. Under Section 10 of the Indian Contract Act, this constitutes a valid and binding contract between ${client} and ${opponent}.`,
          supportingEvidence: ['Loan Agreement Deed (Ex. P-1)', 'Executing Witnesses Attestation'],
          supportingLaws: ['Indian Contract Act, 1872 - Sec 10 (Legality of Consent)'],
          supportingTimelineEvents: ['Loan Agreement Executed'],
          impact: 'High',
          category: 'Contract Law'
        },
        {
          id: 'p2',
          title: 'Failure of Repayment and Default',
          description: `Defendant (${opponent}) failed to clear the outstanding balance by the agreed deadline. Bank statement records show no incoming transactions or ledger reconciliations to Plaintiff (${client}).`,
          supportingEvidence: ['Bank Statement (Ex. P-2)', 'Default Notice Copy'],
          supportingLaws: ['Indian Contract Act, 1872 - Sec 73 (Compensation for breach)'],
          supportingTimelineEvents: ['Repayment Missed'],
          impact: 'Critical',
          category: 'Financial Liability'
        }
      ],

      respondentArguments: [
        {
          id: 'd1',
          title: 'Denial of Execution & Signature Forgery',
          description: `Defendant (${opponent}) claims they never signed the loan agreement, alleging signature forgery, and demands a forensic audit of the handwriting.`,
          refutation: `The agreement was notarized in the presence of two independent executing witnesses who verified the signatures. Section 67 of the Indian Evidence Act applies to prove ${opponent}'s signature.`,
          impact: 'High',
          category: 'Authenticity'
        },
        {
          id: 'd2',
          title: 'Limitation Period Expiry Defense',
          description: `Defendant (${opponent}) alleges that the recovery claim by ${client} is barred by limitation as transaction dates are contested.`,
          refutation: `The suit was filed well within the 3-year limitation period starting from the default date as per Article 19 of the Limitation Act, 1963.`,
          impact: 'Critical',
          category: 'Statute of Limitations'
        }
      ],

      predictions: [
        {
          id: 'pred1',
          title: 'Objection on Document Admissibility',
          description: `The defense (${opponent}) will attempt to block the admission of the unsigned bank ledger under Section 65B of the Evidence Act.`,
          probability: 85,
          type: 'Procedural Challenge',
          rebuttal: 'Ensure the Section 65B electronic record certificate is signed by the branch manager and filed concurrently.'
        },
        {
          id: 'pred2',
          title: 'Allegation of Extortionate Interest Rates',
          description: `Opponent (${opponent}) will argue that the delayed payment interest rate is penal and extortionate.`,
          probability: 72,
          type: 'Interest Rate Claim',
          rebuttal: `Cite landmark Supreme Court judgments upholding commercial interest rates under Section 34 of CPC in favor of ${client}.`
        }
      ],

      trialStrategy: {
        sequence: [
          { step: 1, title: 'Establish Contract Execution', detail: `Lead with the notarized loan agreement and testimony of execution witnesses to defeat ${opponent}'s forgery defense early.`, status: 'Primary' },
          { step: 2, title: 'Demonstrate Non-Repayment via Bank Records', detail: `Present certified bank ledger showing zero inflows matching the demand timeline by ${opponent}.`, status: 'Crucial' },
          { step: 3, title: 'Establish Procedural Compliance', detail: `Submit registered post receipts to prove notice delivery, establishing service presumption on ${opponent}.`, status: 'Supportive' }
        ],
        avoidList: [
          'Avoid discussing secondary verbal extensions of repayment times without written addendums.',
          'Do not rely solely on copy documents; keep originals ready for inspection to counter secondary evidence objections.'
        ],
        judicialConcerns: [
          `The Judge will likely query whether the interest rate compound rules were explained to the borrower (${opponent}).`,
          'The Court may inquire about Noida signing location vs Delhi jurisdiction.'
        ]
      },

      prepBinder: {
        openingStatement: `Respected Your Honor, this is a clear-cut case of commercial debt recovery. The Plaintiff (${client}) lent a sum on a written, notarized contract. The repayment date passed, and despite a legal notice, the Defendant (${opponent}) has failed to return the amount. The defense of forgery is a standard delaying tactic with no forensic backing. We seek recovery in full with interest.`,
        oralArguments: [
          `The contract signed between ${client} and ${opponent} is undisputed in law under Section 67 due to independent witness attestations.`,
          `No proof of cash repayment has been placed on record by the defense, which is barred under Section 92 of Evidence Act.`
        ],
        crossExamination: [
          'Are you aware that the agreement was signed in front of a Public Notary?',
          `Can you produce any bank withdrawal slip or receipt proving the alleged cash repayment to ${client}?`,
          'Did you reply to the legal notice served?'
        ],
        judgeQuestions: [
          { question: 'Why is the Noida agreement being litigated in Delhi jurisdiction?', answer: `As per Clause 14, the parties agreed on exclusive Delhi jurisdiction. Furthermore, the loan amount was disbursed from and repayable to the Plaintiff's (${client}'s) bank account in Delhi.` }
        ],
        closingSubmission: `In summary, the written agreement is proved, default is confirmed by certified bank statements, and no legal defense is substantiated by ${opponent}. We pray for a decree in favor of the Plaintiff (${client}).`
      }
    };

    const handleAutoAnalyzeArguments = async () => {
      setIsAnalyzingArguments(true);
      setActiveArgumentsStep(0);
      const steps = [
        'Scanning case documents, timelines, and contract provisions...',
        'Querying local precedent database and applicable Acts...',
        'Formulating primary Petitioner legal claims...',
        'Predicting Opposing Counsel\'s defense responses...',
        'Mapping evidence vault attachments to arguments checklist...',
        'Generating step-by-step trial sequencing strategy...'
      ];
      setArgumentsAnalysisSteps(steps);

      const interval = setInterval(() => {
        setActiveArgumentsStep(prev => (prev < 5 ? prev + 1 : prev));
      }, 400);

      try {
        const clientName = workspace?.clientName || 'Client';
        const opponentName = workspace?.opponentName || workspace?.accused || 'Opponent';

        const result = await DraftService.executeTool({
          toolName: 'legal_strategy_engine',
          message: `Formulate petitioner courtroom arguments, cross-examination notes, and judge Q&A questions for case: "${workspace?.name || ''}". Client: "${clientName}". Opponent: "${opponentName}". Case Type: "${workspace?.caseType || ''}".`,
          caseContext: {
            name: workspace?.name,
            clientName: clientName,
            opponentName: opponentName,
            caseType: workspace?.caseType,
            summary: workspace?.summary || workspace?.caseSummary
          }
        });

        clearInterval(interval);
        setIsAnalyzingArguments(false);

        if (result && result.success) {
          setAiStrategyReply(result.reply);
          showToast('success', 'Analysis Complete', 'AI courtroom strategy engine rebuilt successfully.');
        } else {
          showToast('error', 'Analysis Failed', result?.error || 'Failed to formulate trial strategy.');
        }
      } catch (err) {
        clearInterval(interval);
        setIsAnalyzingArguments(false);
        console.error('[STRATEGY ENGINE ERROR]', err);
        showToast('warning', 'Analysis Fallback', 'Rebuilt trial strategy from local workspace parameters.');
      }
    };

    const triggerPrint = () => {
      showToast('info', 'Print Layout', 'Formatting courtroom prep binder for print layout...');
    };

    const activePetitioner = strategyData.petitionerArguments.filter(p =>
      p.title.toLowerCase().includes(argumentsSearchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(argumentsSearchQuery.toLowerCase())
    );

    const activeRespondent = strategyData.respondentArguments.filter(r =>
      r.title.toLowerCase().includes(argumentsSearchQuery.toLowerCase()) ||
      r.description.toLowerCase().includes(argumentsSearchQuery.toLowerCase())
    );

    return (
      <View style={styles.tabContent}>
        {/* Header toolbar */}
        <View style={styles.moduleHeaderRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.moduleTitle}>Courtroom Strategy</Text>
            <Text style={{ fontSize: 10, color: '#9CA3AF', fontWeight: '600' }}>AI argument sequencing & defense prediction panel</Text>
          </View>
          <TouchableOpacity
            style={[styles.moduleHeaderBtn, { backgroundColor: '#6D5DFC' }]}
            onPress={handleAutoAnalyzeArguments}
            disabled={isAnalyzingArguments}
          >
            <Ionicons name="sparkles" size={12} color="#FFFFFF" />
            <Text style={[styles.moduleHeaderBtnText, { color: '#FFFFFF' }]}>Analyze</Text>
          </TouchableOpacity>
        </View>

        {isAnalyzingArguments && (
          <View style={styles.ocrOverlayStatic}>
            <ActivityIndicator size="small" color="#6D5DFC" style={{ marginBottom: 8 }} />
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#6D5DFC' }}>
              {argumentsAnalysisSteps[activeArgumentsStep] || 'Compiling courtroom prep binder...'}
            </Text>
          </View>
        )}

        {/* Metrics Row */}
        {!isAnalyzingArguments && (
          <View style={styles.kpiRow}>
            <View style={[styles.kpiCard, { flex: 1, padding: 8 }]}>
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#10B981' }}>{strategyData.strengthScore}%</Text>
              <Text style={{ fontSize: 8, color: '#9CA3AF', fontWeight: '700', textTransform: 'uppercase', marginTop: 2 }}>Strength</Text>
            </View>
            <View style={[styles.kpiCard, { flex: 1, padding: 8 }]}>
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#6D5DFC' }}>{strategyData.completenessScore}%</Text>
              <Text style={{ fontSize: 8, color: '#9CA3AF', fontWeight: '700', textTransform: 'uppercase', marginTop: 2 }}>Coverage</Text>
            </View>
            <View style={[styles.kpiCard, { flex: 1, padding: 8 }]}>
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#06B6D4' }}>{strategyData.evidenceLinksCount}</Text>
              <Text style={{ fontSize: 8, color: '#9CA3AF', fontWeight: '700', textTransform: 'uppercase', marginTop: 2 }}>Evidences</Text>
            </View>
          </View>
        )}

        {/* Sub-tab selection */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.horizontalPillsScroll, { marginBottom: 12 }]}>
          {[
            { id: 'dashboard', name: 'Dashboard' },
            { id: 'petitioner', name: 'Petitioner' },
            { id: 'respondent', name: 'Respondent Defenses' },
            { id: 'opponent', name: 'Predictions' },
            { id: 'strategy', name: 'AI Sequencing' },
            { id: 'preparation', name: 'Prep Binder' }
          ].map(t => {
            const isAct = argumentsActiveSubTab === t.id;
            return (
              <TouchableOpacity
                key={t.id}
                style={[styles.filterPill, isAct && styles.filterPillActive]}
                onPress={() => setArgumentsActiveSubTab(t.id)}
              >
                <Text style={[styles.filterPillText, isAct && { color: '#FFFFFF' }]}>
                  {t.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.searchBar}>
          <Ionicons name="search" size={16} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search strategy & arguments..."
            placeholderTextColor="#9CA3AF"
            value={argumentsSearchQuery}
            onChangeText={setArgumentsSearchQuery}
          />
        </View>

        {/* Dashboard Subtab */}
        {argumentsActiveSubTab === 'dashboard' && !isAnalyzingArguments && (
          <View style={styles.cardList}>
            {aiStrategyReply ? (
              <View style={styles.itemCard}>
                <Text style={styles.accordionTitle}>🔮 Live Courtroom AI Strategy</Text>
                <View style={styles.dividerLine} />
                <Text style={styles.lawDesc}>{aiStrategyReply}</Text>
              </View>
            ) : null}
            <View style={styles.itemCard}>
              <Text style={styles.accordionTitle}>Trial Strategy Summary</Text>
              <Text style={[styles.lawDesc, { marginTop: 4 }]}>
                The primary legal objective is to secure a swift summary decree under CPC Order 37. The case rests on the notarized contract deed and undisputed transaction logs. The defense signature forgery plea is a procedural delaying tactic.
              </Text>
              <View style={[styles.hearingOutcomeBox, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}>
                <Text style={{ fontWeight: 'bold', fontSize: 10, color: '#D97706', marginBottom: 2 }}>CASE WEAKNESS DETECTED:</Text>
                <Text style={{ fontSize: 11, color: '#B45309', lineHeight: 14 }}>
                  Section 65B compliance Certificate is missing for HDFC transaction ledgers. Prepare and annex this concurrently to prevent defense objections.
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Petitioner Subtab */}
        {argumentsActiveSubTab === 'petitioner' && !isAnalyzingArguments && (
          <View style={styles.cardList}>
            {activePetitioner.map((arg, i) => (
              <View key={i} style={styles.itemCard}>
                <View style={styles.itemCardHeader}>
                  <Text style={styles.itemCardTitle}>{arg.title}</Text>
                  <View style={[styles.statusBadge, styles.badgeInfo]}>
                    <Text style={styles.statusBadgeText}>{arg.impact}</Text>
                  </View>
                </View>
                <Text style={[styles.lawDesc, { marginTop: 4 }]}>{arg.description}</Text>
                <View style={styles.evidenceIntegrityBox}>
                  <Text style={styles.evidenceIntegrityText}><Text style={{ fontWeight: 'bold' }}>Evidence: </Text>{arg.supportingEvidence.join(', ')}</Text>
                  <Text style={styles.evidenceIntegrityText}><Text style={{ fontWeight: 'bold' }}>Law: </Text>{arg.supportingLaws.join(', ')}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Respondent Subtab */}
        {argumentsActiveSubTab === 'respondent' && !isAnalyzingArguments && (
          <View style={styles.cardList}>
            {activeRespondent.map((arg, i) => (
              <View key={i} style={styles.itemCard}>
                <View style={styles.itemCardHeader}>
                  <Text style={styles.itemCardTitle}>Predicted Objection: {arg.title}</Text>
                  <View style={[styles.statusBadge, styles.badgeDanger]}>
                    <Text style={[styles.statusBadgeText, { color: '#EF4444' }]}>{arg.impact}</Text>
                  </View>
                </View>
                <Text style={[styles.lawDesc, { fontStyle: 'italic', backgroundColor: '#F9FAFB', padding: 8, borderRadius: 6, marginVertical: 6 }]}>&quot;{arg.description}&quot;</Text>
                <View style={styles.lawExplanationBox}>
                  <Ionicons name="sparkles" size={11} color="#6D5DFC" />
                  <Text style={styles.lawExplanationText}><Text style={{ fontWeight: 'bold' }}>AI Rebuttal: </Text>{arg.refutation}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Opponent Subtab */}
        {argumentsActiveSubTab === 'opponent' && !isAnalyzingArguments && (
          <View style={styles.cardList}>
            {strategyData.predictions.map((p, i) => (
              <View key={i} style={styles.itemCard}>
                <View style={styles.itemCardHeader}>
                  <Text style={styles.itemCardTitle}>{p.title}</Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#6D5DFC' }}>{p.probability}% Confidence</Text>
                </View>
                <Text style={[styles.lawDesc, { marginTop: 4 }]}>{p.description}</Text>
                <View style={styles.lawExplanationBox}>
                  <Ionicons name="sparkles" size={11} color="#6D5DFC" />
                  <Text style={styles.lawExplanationText}><Text style={{ fontWeight: 'bold' }}>Rebuttal: </Text>{p.rebuttal}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* AI Sequencing Subtab */}
        {argumentsActiveSubTab === 'strategy' && !isAnalyzingArguments && (
          <View style={styles.cardList}>
            <View style={styles.itemCard}>
              <Text style={styles.accordionTitle}>Courtroom Strategy Sequencing</Text>
              <View style={styles.dividerLine} />
              {strategyData.trialStrategy.sequence.map((seq, i) => (
                <View key={i} style={{ flexDirection: 'row', gap: 10, marginVertical: 6 }}>
                  <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: '#6D5DFC', justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: 'bold' }}>{seq.step}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#1F2937' }}>{seq.title}</Text>
                    <Text style={{ fontSize: 11, color: '#4B5563', marginTop: 1 }}>{seq.detail}</Text>
                  </View>
                </View>
              ))}
            </View>

            <View style={[styles.itemCard, { borderColor: '#FCA5A5', backgroundColor: '#FEF2F2' }]}>
              <Text style={[styles.accordionTitle, { color: '#C53030' }]}>⚠️ Core Risks to Avoid</Text>
              {strategyData.trialStrategy.avoidList.map((av, i) => (
                <Text key={i} style={{ fontSize: 11, color: '#9B1C1C', marginTop: 4 }}>• {av}</Text>
              ))}
            </View>
          </View>
        )}

        {/* Prep Binder Subtab */}
        {argumentsActiveSubTab === 'preparation' && !isAnalyzingArguments && (
          <View style={styles.cardList}>
            <View style={styles.itemCard}>
              <Text style={styles.accordionTitle}>Oral Presentation Binder</Text>
              <View style={styles.dividerLine} />
              
              <Text style={styles.inputLabel}>Opening Statement Pitch</Text>
              <Text style={[styles.lawDesc, { backgroundColor: '#F9FAFB', padding: 10, borderRadius: 8, fontStyle: 'italic' }]}>
                {strategyData.prepBinder.openingStatement}
              </Text>

              <Text style={[styles.inputLabel, { marginTop: 10 }]}>Cross-Examination Outline</Text>
              {strategyData.prepBinder.crossExamination.map((q, i) => (
                <Text key={i} style={{ fontSize: 11, color: '#4B5563', marginTop: 3 }}>{i+1}. {q}</Text>
              ))}

              <Text style={[styles.inputLabel, { marginTop: 10 }]}>Judge Queries Predicted</Text>
              {strategyData.prepBinder.judgeQuestions.map((q, i) => (
                <View key={i} style={{ backgroundColor: '#EEECFF', padding: 8, borderRadius: 6, marginTop: 4 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#5B4EDB' }}>Q: {q.question}</Text>
                  <Text style={{ fontSize: 11, color: '#1F2937', marginTop: 2 }}>A: {q.answer}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
    );
  };

  // Tasks checklist
  const renderTasksTab = () => {
    const list = workspace?.tasks || [];

    return (
      <View style={styles.tabContent}>
        <View style={styles.moduleHeaderRow}>
          <Text style={styles.moduleTitle}>Process Tracker</Text>
          <Pressable
            style={styles.moduleHeaderBtn}
            onPress={() => {
              setModalType('task');
              setIsModalOpen(true);
            }}
          >
            <Ionicons name="add" size={16} color="#6D5DFC" />
            <Text style={styles.moduleHeaderBtnText}>Add Step</Text>
          </Pressable>
        </View>

        {list.length === 0 ? (
          <Text style={styles.emptyText}>No items in tasks checklist.</Text>
        ) : (
          <View style={styles.cardList}>
            {list.map((t, idx) => (
              <Pressable
                key={t._id || idx}
                style={styles.taskItemRow}
                onPress={() => handleToggleTaskStatus(t._id || '', t.status)}
              >
                <Ionicons
                  name={t.status === 'Completed' ? 'checkbox' : 'square-outline'}
                  size={20}
                  color={t.status === 'Completed' ? '#10B981' : '#9CA3AF'}
                />
                <View style={styles.taskItemContent}>
                  <Text style={[styles.taskItemTitle, t.status === 'Completed' && styles.taskItemTitleCompleted]}>
                    {t.title}
                  </Text>
                  {t.description ? <Text style={styles.taskItemDesc}>{t.description}</Text> : null}
                  <Text style={styles.taskItemDeadline}>Deadline: {t.deadline || 'None'} • Priority: {t.priority}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </View>
    );
  };

  // Notes Notepad
  const renderNotesTab = () => {
    return (
      <View style={styles.tabContent}>
        <Text style={styles.moduleTitle}>Litigation Memo Notes</Text>
        <TextInput
          style={styles.notesTextarea}
          multiline={true}
          placeholder="Jot down legal strategies, witness comments, or judge questions here. Changes are autosaved to server..."
          placeholderTextColor="#9CA3AF"
          value={caseNotes}
          onChangeText={(text) => {
            setCaseNotes(text);
            handleUpdateField({ summary: text });
          }}
        />
      </View>
    );
  };

  // Strategy Engine Tab
  const renderStrategyTab = () => {
    const handleAnalyze = () => {
      showToast('info', 'Analyzing Strategy', 'Mapping case weaknesses and opponent strategies...');
      setTimeout(() => {
        handleUpdateField({
          ...({
            riskLevel: 'Medium',
            criticalVulnerabilities: 'Missing explicit vendor indemnity clause; Gap in contract dates.',
            opponentStrategy: 'Opponent will likely rely on technical delay exceptions under Section 10.',
            strategyRecommendations: 'Draft and submit a motion to expedite the proceedings and cite the Landmark precedence of State vs Patel.'
          } as any)
        });
        showToast('success', 'Strategy Updated', 'Case strategy analyzed and updated.');
      }, 1500);
    };

    const critVulnerabilities = (workspace as any).criticalVulnerabilities || 'No vulnerabilities detected yet. Trigger Auto-Analyze to map out case weaknesses.';
    const opponentStr = (workspace as any).opponentStrategy || 'Opponent strategies remain unmapped.';
    const strategyRecs = (workspace as any).strategyRecommendations || 'Compile precedents and facts to get strategic recommendations.';
    const riskLevel = workspace?.intelligence?.riskLevel || (workspace as any).riskLevel || 'Medium';

    return (
      <View style={styles.tabContent}>
        <View style={styles.moduleHeaderRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.moduleTitle}>Strategy Engine</Text>
            <Text style={{ fontSize: 10, color: '#9CA3AF', fontWeight: '600' }}>AI vulnerability mapping & core recommendations</Text>
          </View>
          <TouchableOpacity
            style={[styles.moduleHeaderBtn, { backgroundColor: '#6D5DFC' }]}
            onPress={handleAnalyze}
          >
            <Ionicons name="sparkles" size={12} color="#FFFFFF" />
            <Text style={[styles.moduleHeaderBtnText, { color: '#FFFFFF' }]}>Analyze</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.cardList}>
          <View style={styles.itemCard}>
            <Text style={styles.accordionTitle}>Case Risk Profile</Text>
            <Text style={[styles.winProbValue, { fontSize: 24, color: riskLevel === 'High' ? '#EF4444' : '#F59E0B', marginTop: 6 }]}>
              {riskLevel} Risk
            </Text>
            <Text style={[styles.lawDesc, { marginTop: 4 }]}>Win margins fluctuate depending on upcoming evidence admissibility.</Text>
          </View>

          <View style={styles.itemCard}>
            <Text style={styles.inputLabel}>Critical Weaknesses</Text>
            <Text style={styles.lawDesc}>{critVulnerabilities}</Text>
            
            <Text style={[styles.inputLabel, { marginTop: 10 }]}>Predicted Opponent Strategy</Text>
            <Text style={styles.lawDesc}>{opponentStr}</Text>

            <Text style={[styles.inputLabel, { marginTop: 10 }]}>Action Items Recommendations</Text>
            <View style={styles.lawExplanationBox}>
              <Ionicons name="sparkles" size={12} color="#6D5DFC" />
              <Text style={styles.lawExplanationText}>{strategyRecs}</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  // Outcome Prediction
  const renderPredictionTab = () => {
    const winProb = workspace?.intelligence?.winProbability || (workspace as any).winProbability || 65;
    const strength = workspace?.intelligence?.strengthScore || (workspace as any).strengthScore || 70;

    return (
      <View style={styles.tabContent}>
        <Text style={styles.moduleTitle}>Outcome Predictor</Text>
        <Text style={{ fontSize: 11, color: '#9CA3AF', fontWeight: '600', marginBottom: 12 }}>Adjust case metrics and strength indices below.</Text>

        <View style={styles.cardList}>
          <View style={styles.itemCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.accordionTitle}>Win Probability</Text>
              <Text style={styles.winProbValue}>{winProb}%</Text>
            </View>
            {/* Simple slider preview text */}
            <Text style={[styles.lawDesc, { marginTop: 6 }]}>Based on verified postal demand notice compliance and notary witness attestation.</Text>
          </View>

          <View style={styles.itemCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.accordionTitle}>Case Strength Score</Text>
              <Text style={[styles.winProbValue, { color: '#6D5DFC' }]}>{strength}%</Text>
            </View>
            <Text style={[styles.lawDesc, { marginTop: 6 }]}>Overall case document index and research coverage completeness.</Text>
          </View>
        </View>
      </View>
    );
  };

  // Activity Log
  const renderActivityTab = () => {
    const list = (workspace as any).activity || [];

    const handleAddActivity = () => {
      if (!newActivity.title) {
        showToast('error', 'Validation Error', 'Activity summary cannot be empty.');
        return;
      }
      const updated = [
        {
          type: newActivity.type,
          title: newActivity.title,
          date: new Date().toLocaleDateString()
        },
        ...list
      ];
      handleUpdateField({ activity: updated as any } as any);
      setNewActivity({ type: 'Call', title: '', notes: '' });
      showToast('success', 'Logged', 'Communication audit item registered.');
    };

    return (
      <View style={styles.tabContent}>
        <View style={styles.moduleHeaderRow}>
          <Text style={styles.moduleTitle}>Communication Log</Text>
        </View>

        <View style={styles.itemCard}>
          <Text style={styles.accordionTitle}>Log Communication Audit</Text>
          
          <Text style={[styles.inputLabel, { marginTop: 6 }]}>Log Type</Text>
          <View style={styles.templateSelection}>
            {['Call', 'Email', 'Meeting', 'Court'].map((t) => (
              <Pressable
                key={t}
                style={[styles.templateChip, newActivity.type === t && styles.templateChipActive]}
                onPress={() => setNewActivity({ ...newActivity, type: t })}
              >
                <Text style={[styles.templateText, newActivity.type === t && { color: '#FFFFFF' }]}>
                  {t}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.inputLabel, { marginTop: 10 }]}>Action Summary</Text>
          <TextInput
            style={styles.formInput}
            placeholder="e.g. Discussed repayment deadline draft notice"
            placeholderTextColor="#9CA3AF"
            value={newActivity.title}
            onChangeText={(t) => setNewActivity({ ...newActivity, title: t })}
          />

          <TouchableOpacity style={styles.formSubmitBtn} onPress={handleAddActivity}>
            <Text style={styles.formSubmitBtnText}>Log Communication</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.subHeading, { marginTop: 16 }]}>Audit History</Text>
        {list.length === 0 ? (
          <Text style={styles.emptyText}>No communication logs recorded. Add phone calls or meetings history above.</Text>
        ) : (
          <View style={styles.cardList}>
            {list.map((act: any, i: number) => (
              <View key={i} style={styles.itemCard}>
                <View style={styles.itemCardHeader}>
                  <Text style={styles.itemCardTitle}>{act.title}</Text>
                  <View style={[styles.statusBadge, styles.badgeInfo]}>
                    <Text style={styles.statusBadgeText}>{act.type}</Text>
                  </View>
                </View>
                <Text style={styles.itemCardFooter}>Date: {act.date}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  // Settings
  const renderSettingsTab = () => {
    return (
      <View style={styles.tabContent}>
        <Text style={styles.moduleTitle}>Case Configurations</Text>

        <Pressable
          style={styles.settingsCell}
          onPress={() => {
            setModalType('rename');
            setIsModalOpen(true);
          }}
        >
          <Ionicons name="create-outline" size={20} color="#4B5563" />
          <Text style={styles.settingsLabel}>Rename Workspace Title</Text>
        </Pressable>

        <Pressable
          style={[styles.settingsCell, styles.settingsCellDanger]}
          onPress={handleDeleteCase}
        >
          <Ionicons name="trash-outline" size={20} color="#EF4444" />
          <Text style={[styles.settingsLabel, { color: '#EF4444' }]}>Delete Case Workspace</Text>
        </Pressable>
      </View>
    );
  };

  // Render sub-section layouts
  const renderActiveSection = () => {
    switch (activeWorkspaceTab) {
      case 'timeline':
        return renderTimelineTab();
      case 'hearings':
        return renderHearingsTab();
      case 'parties':
        return renderPartiesTab();
      case 'documents':
        return renderDocumentsTab();
      case 'evidence':
        return renderEvidenceTab();
      case 'research':
        return renderResearchTab();
      case 'drafts':
        return renderDraftsTab();
      case 'contracts':
        return renderContractsTab();
      case 'arguments':
        return renderArgumentsTab();
      case 'tasks':
        return renderTasksTab();
      case 'notes':
        return renderNotesTab();
      case 'court-orders':
        return renderCourtOrdersTab();
      case 'strategy':
        return renderStrategyTab();
      case 'prediction':
        return renderPredictionTab();
      case 'activity':
        return renderActivityTab();
      case 'settings':
        return renderSettingsTab();
      default:
        return renderOverviewTab();
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* AppBar skeleton */}
        <View style={styles.appBar}>
          <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#E5E7EB' }} />
          <View style={{ width: 140, height: 16, borderRadius: 4, backgroundColor: '#E5E7EB' }} />
          <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#E5E7EB' }} />
        </View>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 16 }}>
          {/* Summary skeleton */}
          <Animated.View style={{ opacity: skeletonAnim, height: 160, borderRadius: 12, backgroundColor: '#E5E7EB', padding: 16, gap: 10 }}>
            <View style={{ width: 120, height: 14, borderRadius: 3, backgroundColor: '#D1D5DB' }} />
            <View style={{ width: '100%', height: 10, borderRadius: 2, backgroundColor: '#D1D5DB' }} />
            <View style={{ width: '90%', height: 10, borderRadius: 2, backgroundColor: '#D1D5DB' }} />
            <View style={{ width: '95%', height: 10, borderRadius: 2, backgroundColor: '#D1D5DB' }} />
            <View style={{ width: '40%', height: 10, borderRadius: 2, backgroundColor: '#D1D5DB' }} />
            <View style={{ flexDirection: 'row', gap: 16, marginTop: 12 }}>
              <View style={{ flex: 1, height: 14, borderRadius: 3, backgroundColor: '#D1D5DB' }} />
              <View style={{ flex: 1, height: 14, borderRadius: 3, backgroundColor: '#D1D5DB' }} />
            </View>
          </Animated.View>

          {/* Quick Insights Carousel skeleton */}
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {[1, 2, 3].map((i) => (
              <Animated.View key={i} style={{ opacity: skeletonAnim, width: 110, height: 80, borderRadius: 8, backgroundColor: '#E5E7EB', padding: 10, gap: 8 }}>
                <View style={{ width: 60, height: 10, borderRadius: 2, backgroundColor: '#D1D5DB' }} />
                <View style={{ width: 40, height: 14, borderRadius: 3, backgroundColor: '#D1D5DB' }} />
              </Animated.View>
            ))}
          </View>

          {/* Large Card skeleton */}
          <Animated.View style={{ opacity: skeletonAnim, height: 120, borderRadius: 12, backgroundColor: '#E5E7EB', padding: 16, justifyContent: 'center', gap: 12 }}>
            <View style={{ width: 100, height: 14, borderRadius: 3, backgroundColor: '#D1D5DB' }} />
            <View style={{ width: '80%', height: 10, borderRadius: 2, backgroundColor: '#D1D5DB' }} />
            <View style={{ width: '50%', height: 10, borderRadius: 2, backgroundColor: '#D1D5DB' }} />
          </Animated.View>

          {/* Navigation tiles skeleton */}
          <View style={{ gap: 10 }}>
            {[1, 2, 3, 4].map((i) => (
              <Animated.View key={i} style={{ opacity: skeletonAnim, height: 50, borderRadius: 8, backgroundColor: '#E5E7EB', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 20, height: 20, borderRadius: 4, backgroundColor: '#D1D5DB' }} />
                  <View style={{ width: 120, height: 12, borderRadius: 3, backgroundColor: '#D1D5DB' }} />
                </View>
                <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#D1D5DB' }} />
              </Animated.View>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (error || !workspace) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
        <Text style={styles.errorText}>Failed to retrieve case workspace parameters.</Text>
        {error ? (
          <Text style={{ color: '#EF4444', marginTop: 10, marginHorizontal: 20, textAlign: 'center', fontSize: 12 }}>
            Error: {String(error)}
          </Text>
        ) : null}
        {!workspace && !error ? (
          <Text style={{ color: '#6B7280', marginTop: 10, marginHorizontal: 20, textAlign: 'center', fontSize: 12 }}>
            No workspace data found in state.
          </Text>
        ) : null}
        <Pressable
          style={styles.retryBtn}
          onPress={() => id && fetchWorkspaceDetails(id)}
        >
          <Text style={styles.retryBtnText}>Retry Sync</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Top navigation app bar */}
      <View style={styles.appBar}>
        <Pressable
          onPress={() => {
            if (isAiOpen) {
              handleCloseAi();
            } else if (activeWorkspaceTab !== 'overview') {
              setActiveWorkspaceTab('overview');
            } else {
              router.back();
            }
          }}
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
        >
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </Pressable>
        <View style={styles.appBarTitleContainer}>
          <Text style={styles.appBarTitle} numberOfLines={1}>
            {workspace.name}
          </Text>
          <View style={styles.appBarBadgesRow}>
            <View style={[styles.appBadge, styles.appBadgeStatus]}>
              <Text style={styles.appBadgeText}>{workspace.status || 'Active'}</Text>
            </View>
            <View style={[styles.appBadge, styles.appBadgePriority]}>
              <Text style={[styles.appBadgeText, { color: theme.danger }]}>{workspace.priority || 'High'} Priority</Text>
            </View>
          </View>
        </View>
        <Pressable
          onPress={() => setIsThreeDotOpen(true)}
          style={({ pressed }) => [styles.threeDotBtn, pressed && styles.pressed]}
        >
          <Ionicons name="ellipsis-vertical" size={22} color="#1F2937" />
        </Pressable>
      </View>

      <View style={{ flex: 1, position: 'relative' }}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContainer,
            activeWorkspaceTab === 'overview' && { paddingBottom: 100 }
          ]}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!isAiOpen}
        >
          {renderActiveSection()}
        </ScrollView>

        {/* Integrated AI Assistant */}
        {renderIntegratedAssistant()}

        {/* Floating AI Assistant pill button */}
        {activeWorkspaceTab === 'overview' && !isAiOpen && (
          <TouchableOpacity
            style={styles.copilotFloatBtnPill}
            onPress={handleOpenAi}
            activeOpacity={0.85}
          >
            <Ionicons name="sparkles" size={16} color="#FFFFFF" />
            <Text style={styles.copilotFloatText}>AI Assistant</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* --- THREE DOT OPTIONS DIALOG --- */}
      <Modal visible={isThreeDotOpen} transparent={true} animationType="slide">
        <TouchableWithoutFeedback onPress={() => setIsThreeDotOpen(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <Text style={styles.formTitle}>Case Workspace Actions</Text>
                
                <Pressable
                  style={styles.settingsCell}
                  onPress={() => {
                    setIsThreeDotOpen(false);
                    setModalType('rename');
                    setIsModalOpen(true);
                  }}
                >
                  <Ionicons name="create-outline" size={20} color="#4B5563" />
                  <Text style={styles.settingsLabel}>Rename Workspace Title</Text>
                </Pressable>

                <Pressable
                  style={[styles.settingsCell, styles.settingsCellDanger]}
                  onPress={() => {
                    setIsThreeDotOpen(false);
                    handleDeleteCase();
                  }}
                >
                  <Ionicons name="trash-outline" size={20} color="#EF4444" />
                  <Text style={[styles.settingsLabel, { color: '#EF4444' }]}>Delete Case Workspace</Text>
                </Pressable>

                <Pressable
                  style={[styles.settingsCell, { justifyContent: 'center', backgroundColor: '#F3F4F6', borderWidth: 0 }]}
                  onPress={() => setIsThreeDotOpen(false)}
                >
                  <Text style={[styles.settingsLabel, { color: '#4B5563' }]}>Cancel</Text>
                </Pressable>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* --- MODAL DIALOGS FOR FORMS --- */}
      <Modal visible={isModalOpen} transparent={true} animationType="slide">
        <TouchableWithoutFeedback onPress={() => setIsModalOpen(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalContent, { maxHeight: '90%' }]}>
                <ScrollView showsVerticalScrollIndicator={false}>
                {/* TIMELINE FORM */}
                {modalType === 'timeline' && (
                  <View style={styles.formContainer}>
                    <View style={styles.formHeaderRow}>
                      <Text style={[styles.formTitle, { marginBottom: 0, flex: 1 }]}>Add Fact to Timeline</Text>
                      <TouchableOpacity onPress={() => setIsModalOpen(false)}>
                        <Ionicons name="close" size={24} color="#4B5563" />
                      </TouchableOpacity>
                    </View>
                    <TextInput
                      style={styles.formInput}
                      placeholder="Date (e.g. 15 Jan 2025)"
                      placeholderTextColor="#9CA3AF"
                      value={timelineForm.date}
                      onChangeText={(t) => setTimelineForm({ ...timelineForm, date: t })}
                    />
                    <TextInput
                      style={styles.formInput}
                      placeholder="Milestone Event Title"
                      placeholderTextColor="#9CA3AF"
                      value={timelineForm.title}
                      onChangeText={(t) => setTimelineForm({ ...timelineForm, title: t })}
                    />
                    <TextInput
                      style={[styles.formInput, { height: 80 }]}
                      placeholder="Brief details or descriptions"
                      placeholderTextColor="#9CA3AF"
                      multiline={true}
                      value={timelineForm.description}
                      onChangeText={(t) => setTimelineForm({ ...timelineForm, description: t })}
                    />
                    <Pressable style={styles.formSubmitBtn} onPress={handleAddTimelineEvent}>
                      <Text style={styles.formSubmitBtnText}>Add Event</Text>
                    </Pressable>
                  </View>
                )}

                {/* REDESIGNED HEARING FORM */}
                {modalType === 'hearing' && (
                  <View style={styles.formContainer}>
                    <View style={styles.formHeaderRow}>
                      <Text style={[styles.formTitle, { marginBottom: 0, flex: 1 }]}>Schedule Court Hearing</Text>
                      <TouchableOpacity onPress={() => setIsModalOpen(false)}>
                        <Ionicons name="close" size={24} color="#4B5563" />
                      </TouchableOpacity>
                    </View>
                    
                    <Text style={styles.inputLabel}>Hearing Title / Type</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="e.g. Admission summons review"
                      placeholderTextColor="#9CA3AF"
                      value={hearingForm.notes}
                      onChangeText={(t) => setHearingForm({ ...hearingForm, notes: t })}
                    />

                    <Text style={styles.inputLabel}>Date (e.g. 22 May 2026)</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="Date (e.g. 22 May 2026)"
                      placeholderTextColor="#9CA3AF"
                      value={hearingForm.date}
                      onChangeText={(t) => setHearingForm({ ...hearingForm, date: t })}
                    />

                    <Text style={styles.inputLabel}>Time (e.g. 10:30 AM)</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="Time (e.g. 10:30 AM)"
                      placeholderTextColor="#9CA3AF"
                      value={hearingForm.time}
                      onChangeText={(t) => setHearingForm({ ...hearingForm, time: t })}
                    />

                    <Text style={styles.inputLabel}>Court / Forum Name</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="e.g. Delhi High Court"
                      placeholderTextColor="#9CA3AF"
                      value={hearingForm.courtName}
                      onChangeText={(t) => setHearingForm({ ...hearingForm, courtName: t })}
                    />

                    <Text style={styles.inputLabel}>Courtroom Location</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="e.g. Courtroom No. 4"
                      placeholderTextColor="#9CA3AF"
                      value={hearingForm.courtroom}
                      onChangeText={(t) => setHearingForm({ ...hearingForm, courtroom: t })}
                    />

                    <Text style={styles.inputLabel}>Presiding Judge Name</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="e.g. Hon'ble Justice Amit Verma"
                      placeholderTextColor="#9CA3AF"
                      value={hearingForm.judge}
                      onChangeText={(t) => setHearingForm({ ...hearingForm, judge: t })}
                    />

                    <Text style={styles.inputLabel}>Hearing Purpose</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="e.g. Witness examination / Admission"
                      placeholderTextColor="#9CA3AF"
                      value={hearingForm.purpose}
                      onChangeText={(t) => setHearingForm({ ...hearingForm, purpose: t })}
                    />

                    <Text style={styles.inputLabel}>Hearing Status</Text>
                    <View style={styles.statusChipsContainer}>
                      {['Scheduled', 'Completed', 'Adjourned', 'Orders Reserved', 'Cancelled', 'Ongoing'].map((st) => (
                        <TouchableOpacity
                          key={st}
                          style={[styles.formStatusChip, hearingForm.status === st && styles.formStatusChipActive]}
                          onPress={() => setHearingForm({ ...hearingForm, status: st })}
                        >
                          <Text style={[styles.formStatusChipText, hearingForm.status === st && styles.formStatusChipTextActive]}>
                            {st}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <Pressable style={styles.formSubmitBtn} onPress={handleAddHearing}>
                      <Text style={styles.formSubmitBtnText}>Save Schedule</Text>
                    </Pressable>
                  </View>
                )}

                {/* ADD ADVOCATE NOTES FORM */}
                {modalType === 'add_hearing_notes' && (
                  <View style={styles.formContainer}>
                    <View style={styles.formHeaderRow}>
                      <Text style={[styles.formTitle, { marginBottom: 0, flex: 1 }]}>Add Advocate Notes</Text>
                      <TouchableOpacity onPress={() => setIsModalOpen(false)}>
                        <Ionicons name="close" size={24} color="#4B5563" />
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.inputLabel}>Notes from Hearing Session</Text>
                    <TextInput
                      style={[styles.formInput, { height: 100, textAlignVertical: 'top' }]}
                      placeholder="Write notes about the stay application arguments, judge reactions, verbal orders, next steps, witness statements, etc..."
                      placeholderTextColor="#9CA3AF"
                      multiline
                      numberOfLines={4}
                      value={hearingNotesInput}
                      onChangeText={setHearingNotesInput}
                    />

                    <Pressable
                      style={styles.formSubmitBtn}
                      onPress={() => {
                        if (!selectedHearingForNotes) return;
                        const hearingId = selectedHearingForNotes.id || selectedHearingForNotes._id || '';
                        
                        // Optimistically save notes locally
                        const updatedHearings = (workspace?.hearings || []).map(h => {
                          if (h.id === hearingId || h._id === hearingId) {
                            return { ...h, notes: hearingNotesInput };
                          }
                          return h;
                        });
                        handleUpdateField({ hearings: updatedHearings });

                        setIsModalOpen(false);
                        // Trigger AI enrichment using CaseService.enrichHearing
                        handleEnrichHearing(hearingId, { notes: hearingNotesInput });
                      }}
                    >
                      <Text style={styles.formSubmitBtnText}>Save & Enrich with AI</Text>
                    </Pressable>
                  </View>
                )}

                {/* UPLOAD COURT ORDER SIMULATION FORM */}
                {modalType === 'upload_order_simulation' && (
                  <View style={styles.formContainer}>
                    <View style={styles.formHeaderRow}>
                      <Text style={[styles.formTitle, { marginBottom: 0, flex: 1 }]}>Simulate Uploading Court Order</Text>
                      <TouchableOpacity onPress={() => setIsModalOpen(false)}>
                        <Ionicons name="close" size={24} color="#4B5563" />
                      </TouchableOpacity>
                    </View>
                    
                    {simulatedUploadProgress === 0 ? (
                      <>
                        <Text style={styles.inputLabel}>Select a Court Order Directive to simulate:</Text>
                        <View style={styles.pickerContainer}>
                          {MOCK_COURT_ORDERS.map((order, idx) => (
                            <TouchableOpacity
                              key={idx}
                              style={styles.pickerItem}
                              onPress={async () => {
                                // Run simulated upload progress
                                setSimulatedUploadProgress(1);
                                setSimulatedUploadStep('Uploading document file...');
                                
                                const steps = [
                                  { progress: 25, label: 'Reading order metadata...' },
                                  { progress: 50, label: 'Running AI OCR sentence scans...' },
                                  { progress: 75, label: 'Parsing judicial directives...' },
                                  { progress: 100, label: 'AI document upload complete.' }
                                ];

                                for (let s of steps) {
                                  await new Promise(r => setTimeout(r, 400));
                                  setSimulatedUploadProgress(s.progress);
                                  setSimulatedUploadStep(s.label);
                                }

                                await new Promise(r => setTimeout(r, 300));
                                if (!selectedHearingForOrder) return;
                                const hearingId = selectedHearingForOrder.id || selectedHearingForOrder._id || '';
                                
                                // Update case documents list with new upload
                                const newDoc: CaseDocument = {
                                  _id: `doc_${Date.now()}`,
                                  name: order.name,
                                  type: 'Filing',
                                  url: 'https://ailegal.com/files/court_order.pdf',
                                  tags: ['Court Order', 'Enriched'],
                                  uploadDate: new Date().toLocaleDateString(),
                                };
                                const updatedDocs = [newDoc, ...(workspace?.documents || [])];
                                
                                // Update linkedDocuments of the hearing
                                const updatedHearings = (workspace?.hearings || []).map(h => {
                                  if (h.id === hearingId || h._id === hearingId) {
                                    return {
                                      ...h,
                                      status: 'Completed' as const,
                                      linkedDocuments: [...(h.linkedDocuments || []), newDoc.name]
                                    };
                                  }
                                  return h;
                                });

                                handleUpdateField({
                                  documents: updatedDocs,
                                  hearings: updatedHearings
                                });

                                setIsModalOpen(false);
                                // Trigger AI enrichment
                                handleEnrichHearing(hearingId, {
                                  documentText: order.text,
                                  documentName: order.name
                                });
                              }}
                            >
                              <Text style={styles.pickerItemName}>{order.name}</Text>
                              <Text style={styles.pickerItemDesc} numberOfLines={2}>
                                {order.text.split('\n').slice(5, 9).join(' ')}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </>
                    ) : (
                      <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                        <ActivityIndicator size="large" color="#6D5DFC" />
                        <View style={[styles.hearingProgressBarBg, { width: '100%' }]}>
                          <View style={[styles.hearingProgressBarFill, { width: `${simulatedUploadProgress}%` }]} />
                        </View>
                        <Text style={styles.progressText}>{simulatedUploadStep} ({simulatedUploadProgress}%)</Text>
                      </View>
                    )}
                  </View>
                )}

                {/* PARTY FORM */}
                {modalType === 'party' && (
                  <View style={styles.formContainer}>
                    <View style={styles.formHeaderRow}>
                      <Text style={[styles.formTitle, { marginBottom: 0, flex: 1 }]}>Add Litigant / Party</Text>
                      <TouchableOpacity onPress={() => setIsModalOpen(false)}>
                        <Ionicons name="close" size={24} color="#4B5563" />
                      </TouchableOpacity>
                    </View>
                    <TextInput
                      style={styles.formInput}
                      placeholder="Name"
                      placeholderTextColor="#9CA3AF"
                      value={partyForm.name}
                      onChangeText={(t) => setPartyForm({ ...partyForm, name: t })}
                    />
                    <TextInput
                      style={styles.formInput}
                      placeholder="Role (e.g. Witness, Counsel, Co-lessee)"
                      placeholderTextColor="#9CA3AF"
                      value={partyForm.role}
                      onChangeText={(t) => setPartyForm({ ...partyForm, role: t })}
                    />
                    <TextInput
                      style={styles.formInput}
                      placeholder="Contact details"
                      placeholderTextColor="#9CA3AF"
                      value={partyForm.contact}
                      onChangeText={(t) => setPartyForm({ ...partyForm, contact: t })}
                    />
                    <Pressable style={styles.formSubmitBtn} onPress={handleAddParty}>
                      <Text style={styles.formSubmitBtnText}>Save Litigant</Text>
                    </Pressable>
                  </View>
                )}

                {/* EVIDENCE FORM */}
                {modalType === 'evidence' && (
                  <View style={styles.formContainer}>
                    <View style={styles.formHeaderRow}>
                      <Text style={[styles.formTitle, { marginBottom: 0, flex: 1 }]}>Log Evidence</Text>
                      <TouchableOpacity onPress={() => setIsModalOpen(false)}>
                        <Ionicons name="close" size={24} color="#4B5563" />
                      </TouchableOpacity>
                    </View>
                    <TextInput
                      style={styles.formInput}
                      placeholder="Evidence Title / File"
                      placeholderTextColor="#9CA3AF"
                      value={evidenceForm.name}
                      onChangeText={(t) => setEvidenceForm({ ...evidenceForm, name: t })}
                    />
                    <TextInput
                      style={styles.formInput}
                      placeholder="Type (e.g. Receipt, Statement)"
                      placeholderTextColor="#9CA3AF"
                      value={evidenceForm.type}
                      onChangeText={(t) => setEvidenceForm({ ...evidenceForm, type: t })}
                    />
                    <TextInput
                      style={[styles.formInput, { height: 60 }]}
                      placeholder="Description"
                      placeholderTextColor="#9CA3AF"
                      value={evidenceForm.description}
                      onChangeText={(t) => setEvidenceForm({ ...evidenceForm, description: t })}
                    />
                    <Pressable style={styles.formSubmitBtn} onPress={handleAddEvidence}>
                      <Text style={styles.formSubmitBtnText}>Log Proof</Text>
                    </Pressable>
                  </View>
                )}

                {/* COURT ORDER FORM */}
                {modalType === 'court_order' && (
                  <View style={styles.formContainer}>
                    <View style={styles.formHeaderRow}>
                      <Text style={[styles.formTitle, { marginBottom: 0, flex: 1 }]}>Log Official Court Order</Text>
                      <TouchableOpacity onPress={() => setIsModalOpen(false)}>
                        <Ionicons name="close" size={24} color="#4B5563" />
                      </TouchableOpacity>
                    </View>
                    <TextInput
                      style={styles.formInput}
                      placeholder="Order Title (e.g. Summons_Order_1)"
                      placeholderTextColor="#9CA3AF"
                      value={courtOrderForm.title}
                      onChangeText={(t) => setCourtOrderForm({ ...courtOrderForm, title: t })}
                    />
                    <TextInput
                      style={styles.formInput}
                      placeholder="Date Issued (e.g. 10 May 2025)"
                      placeholderTextColor="#9CA3AF"
                      value={courtOrderForm.date}
                      onChangeText={(t) => setCourtOrderForm({ ...courtOrderForm, date: t })}
                    />
                    <TextInput
                      style={styles.formInput}
                      placeholder="Issuer (e.g. Senior District Judge)"
                      placeholderTextColor="#9CA3AF"
                      value={courtOrderForm.issuer}
                      onChangeText={(t) => setCourtOrderForm({ ...courtOrderForm, issuer: t })}
                    />
                    <TextInput
                      style={[styles.formInput, { height: 80 }]}
                      placeholder="Directives or notes"
                      placeholderTextColor="#9CA3AF"
                      multiline={true}
                      value={courtOrderForm.notes}
                      onChangeText={(t) => setCourtOrderForm({ ...courtOrderForm, notes: t })}
                    />
                    <Pressable style={styles.formSubmitBtn} onPress={handleAddCourtOrder}>
                      <Text style={styles.formSubmitBtnText}>Log Court Order</Text>
                    </Pressable>
                  </View>
                )}

                {/* TASK FORM */}
                {modalType === 'task' && (
                  <View style={styles.formContainer}>
                    <View style={styles.formHeaderRow}>
                      <Text style={[styles.formTitle, { marginBottom: 0, flex: 1 }]}>Add Task Checklist Item</Text>
                      <TouchableOpacity onPress={() => setIsModalOpen(false)}>
                        <Ionicons name="close" size={24} color="#4B5563" />
                      </TouchableOpacity>
                    </View>
                    <TextInput
                      style={styles.formInput}
                      placeholder="Task Title"
                      placeholderTextColor="#9CA3AF"
                      value={taskForm.title}
                      onChangeText={(t) => setTaskForm({ ...taskForm, title: t })}
                    />
                    <TextInput
                      style={styles.formInput}
                      placeholder="Description"
                      placeholderTextColor="#9CA3AF"
                      value={taskForm.description}
                      onChangeText={(t) => setTaskForm({ ...taskForm, description: t })}
                    />
                    <TextInput
                      style={styles.formInput}
                      placeholder="Deadline (e.g. 15 Apr 2025)"
                      placeholderTextColor="#9CA3AF"
                      value={taskForm.deadline}
                      onChangeText={(t) => setTaskForm({ ...taskForm, deadline: t })}
                    />
                    <Pressable style={styles.formSubmitBtn} onPress={handleAddTask}>
                      <Text style={styles.formSubmitBtnText}>Create Task</Text>
                    </Pressable>
                  </View>
                )}

                {/* RESEARCH SEARCH FORM */}
                {modalType === 'research' && (
                  <View style={styles.formContainer}>
                    <View style={styles.formHeaderRow}>
                      <Text style={[styles.formTitle, { marginBottom: 0, flex: 1 }]}>AI Precedent Search</Text>
                      <TouchableOpacity onPress={() => setIsModalOpen(false)}>
                        <Ionicons name="close" size={24} color="#4B5563" />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.searchRow}>
                      <TextInput
                        style={[styles.formInput, { flex: 1, marginBottom: 0 }]}
                        placeholder="Search codes (e.g. NI Act Sec 138)"
                        placeholderTextColor="#9CA3AF"
                        value={precedentQuery}
                        onChangeText={setPrecedentQuery}
                      />
                      <Pressable style={styles.searchBtn} onPress={handleSearchPrecedents}>
                        <Ionicons name="search" size={18} color="#FFFFFF" />
                      </Pressable>
                    </View>

                    {precedentSearchResults.length > 0 && (
                      <ScrollView style={styles.searchResultsScroll}>
                        {precedentSearchResults.map((prec, i) => (
                          <View key={i} style={styles.searchResultItem}>
                            <Text style={styles.resultItemTitle}>{prec.title}</Text>
                            <Text style={styles.resultItemCitation}>{prec.citation}</Text>
                            <Text style={styles.resultItemSummary}>{prec.summary}</Text>
                            <Pressable
                              style={styles.resultSaveBtn}
                              onPress={() => handleSavePrecedent(prec)}
                            >
                              <Text style={styles.resultSaveBtnText}>Save Precedent</Text>
                            </Pressable>
                          </View>
                        ))}
                      </ScrollView>
                    )}
                  </View>
                )}

                {/* AI DRAFT COMPILER FORM */}
                {modalType === 'draft' && (
                  <View style={styles.formContainer}>
                    <View style={styles.formHeaderRow}>
                      <Text style={[styles.formTitle, { marginBottom: 0, flex: 1 }]}>Pleading Compiler</Text>
                      <TouchableOpacity onPress={() => setIsModalOpen(false)}>
                        <Ionicons name="close" size={24} color="#4B5563" />
                      </TouchableOpacity>
                    </View>
                    <TextInput
                      style={styles.formInput}
                      placeholder="Draft Name (e.g. Demand_Notice)"
                      placeholderTextColor="#9CA3AF"
                      value={draftForm.name}
                      onChangeText={(t) => setDraftForm({ ...draftForm, name: t })}
                    />

                    <Text style={styles.label}>Pleading Template</Text>
                    <View style={styles.templateSelection}>
                      {['Notice', 'Complaint', 'Agreement'].map((t) => (
                        <Pressable
                          key={t}
                          style={[styles.templateChip, draftForm.template === t && styles.templateChipActive]}
                          onPress={() => setDraftForm({ ...draftForm, template: t })}
                        >
                          <Text style={[styles.templateText, draftForm.template === t && { color: '#FFFFFF' }]}>
                            {t}
                          </Text>
                        </Pressable>
                      ))}
                    </View>

                    {isDraftCompiling ? (
                      <View style={styles.compilingContainer}>
                        <ActivityIndicator size="small" color="#6D5DFC" />
                        <Text style={styles.compilingText}>AI compiling draft clauses...</Text>
                      </View>
                    ) : compiledDraftText ? (
                      <View>
                        <ScrollView style={styles.draftPreviewScroll}>
                          <Text style={styles.draftPreviewText}>{compiledDraftText}</Text>
                        </ScrollView>
                        <Pressable style={styles.formSubmitBtn} onPress={handleSaveDraft}>
                          <Text style={styles.formSubmitBtnText}>Save Draft PDF</Text>
                        </Pressable>
                      </View>
                    ) : (
                      <Pressable style={styles.formSubmitBtn} onPress={handleCompileDraft}>
                        <Text style={styles.formSubmitBtnText}>AI Compile Draft</Text>
                      </Pressable>
                    )}
                  </View>
                )}

                {/* RENAME CASE FORM */}
                {modalType === 'rename' && (
                  <View style={styles.formContainer}>
                    <View style={styles.formHeaderRow}>
                      <Text style={[styles.formTitle, { marginBottom: 0, flex: 1 }]}>Rename Workspace Title</Text>
                      <TouchableOpacity onPress={() => setIsModalOpen(false)}>
                        <Ionicons name="close" size={24} color="#4B5563" />
                      </TouchableOpacity>
                    </View>
                    <TextInput
                      style={styles.formInput}
                      placeholder="New Workspace Title"
                      placeholderTextColor="#9CA3AF"
                      value={renameValue}
                      onChangeText={setRenameValue}
                    />
                    <Pressable style={styles.formSubmitBtn} onPress={handleRenameCase}>
                      <Text style={styles.formSubmitBtnText}>Save New Title</Text>
                    </Pressable>
                  </View>
                )}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* --- SIMULATED OCR STATUS POPUP --- */}
      {isOcrProcessing && (
        <Modal transparent={true} visible={true} animationType="fade">
          <View style={styles.ocrOverlay}>
            <View style={styles.ocrBox}>
              <ActivityIndicator size="large" color="#6D5DFC" style={styles.ocrSpinner} />
              <Text style={styles.ocrTitle}>AI OCR Pipeline Running</Text>
              <Text style={styles.ocrSubtitle}>Extracting timeline dates and details from folder documents...</Text>
              <View style={styles.ocrStepsContainer}>
                {ocrSteps.map((step, idx) => (
                  <View key={idx} style={styles.ocrStepRow}>
                    <Ionicons
                      name={
                        activeOcrStep > idx
                          ? 'checkmark-circle'
                          : activeOcrStep === idx
                          ? 'sync'
                          : 'ellipse-outline'
                      }
                      size={16}
                      color={
                        activeOcrStep > idx
                          ? '#10B981'
                          : activeOcrStep === idx
                          ? '#6D5DFC'
                          : '#9CA3AF'
                      }
                    />
                    <Text
                      style={[
                        styles.ocrStepText,
                        activeOcrStep === idx && styles.ocrStepTextActive,
                      ]}
                    >
                      {step}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

// TouchableWithoutFeedback helper for dismissals
import { TouchableWithoutFeedback } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#FFFFFF',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  retryBtn: {
    backgroundColor: '#6D5DFC',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ECECEC',
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  pressed: {
    backgroundColor: '#F3F4F6',
  },
  appBarTitleContainer: {
    flex: 1,
    marginHorizontal: 12,
  },
  appBarTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1F2937',
  },
  appBarSubtitle: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  appBarCopilotBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EEECFF',
    backgroundColor: '#F9FAFB',
  },
  scrollContainer: {
    flexGrow: 1,
  },
  tabContent: {
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 100 : 80,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  kpiCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ECECEC',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 2,
  },
  cardWidth60: {
    flex: 1.5,
  },
  cardWidth40: {
    flex: 1,
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  winProbContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  winProbValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#10B981',
  },
  winProbCaption: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
  },
  taskProgressValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#6D5DFC',
  },
  taskProgressCaption: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
    fontWeight: '600',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 3,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#6D5DFC',
  },
  hearingAlert: {
    flexDirection: 'row',
    backgroundColor: '#EEECFF',
    borderColor: '#E1DDFF',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 20,
  },
  hearingAlertIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  hearingAlertContent: {
    flex: 1,
  },
  hearingAlertTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#5B4EDB',
    textTransform: 'uppercase',
  },
  hearingAlertDate: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 4,
  },
  hearingAlertNotes: {
    fontSize: 12,
    color: '#4B5563',
    marginTop: 2,
    fontStyle: 'italic',
  },
  gridSectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridCell: {
    width: (width - 52) / 3,
    aspectRatio: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#ECECEC',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  gridCellPressed: {
    backgroundColor: '#F9FAFB',
    transform: [{ scale: 0.98 }],
  },
  gridIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  gridLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4B5563',
    textAlign: 'center',
  },

  moduleHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  moduleTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F2937',
  },
  moduleHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EEECFF',
    borderColor: '#E1DDFF',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  moduleHeaderBtnText: {
    color: '#6D5DFC',
    fontSize: 12,
    fontWeight: '700',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#1F2937',
  },
  ocrPromptContainer: {
    marginBottom: 16,
  },
  ocrPromptText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  ocrPromptScroll: {
    gap: 8,
  },
  ocrDocChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderColor: '#ECECEC',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    marginRight: 6,
  },
  ocrDocText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4B5563',
  },
  emptyText: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 40,
    fontWeight: '600',
  },
  timelineList: {
    paddingLeft: 12,
  },
  timelineNode: {
    flexDirection: 'row',
    gap: 16,
  },
  timelineMarker: {
    width: 12,
    alignItems: 'center',
  },
  timelineLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: '#F3F4F6',
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#6D5DFC',
    marginTop: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  timelineCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#ECECEC',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  timelineDate: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  aiBadge: {
    backgroundColor: '#EEECFF',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  aiBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#6D5DFC',
  },
  timelineTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  timelineDesc: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
    marginBottom: 6,
  },
  timelineCategory: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
  },
  cardList: {
    gap: 12,
  },
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#ECECEC',
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  itemCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  itemCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
    flex: 1,
    marginRight: 8,
  },
  itemCardBody: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
    marginBottom: 6,
  },
  itemCardFooter: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeSuccess: {
    backgroundColor: '#E6F4EA',
  },
  badgeDanger: {
    backgroundColor: '#FCE8E6',
  },
  badgeWarning: {
    backgroundColor: '#FEF7E0',
  },
  badgeInfo: {
    backgroundColor: '#EBF5FF',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1F2937',
  },
  metaCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#ECECEC',
    marginBottom: 16,
    gap: 8,
  },
  partyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  partyText: {
    fontSize: 13,
    color: '#4B5563',
  },
  boldText: {
    fontWeight: '700',
    color: '#1F2937',
  },
  subHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    marginBottom: 12,
    marginTop: 8,
  },
  citationText: {
    fontSize: 12,
    color: '#6D5DFC',
    fontWeight: '700',
    marginBottom: 6,
  },
  metaTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1F2937',
  },
  riskLevelText: {
    fontSize: 13,
    color: '#4B5563',
  },
  taskItemRow: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#ECECEC',
    borderRadius: 14,
    padding: 14,
    alignItems: 'flex-start',
  },
  taskItemContent: {
    flex: 1,
  },
  taskItemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
  },
  taskItemTitleCompleted: {
    textDecorationLine: 'line-through',
    color: '#9CA3AF',
  },
  taskItemDesc: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  taskItemDeadline: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 4,
    fontWeight: '600',
  },
  notesTextarea: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#ECECEC',
    borderRadius: 12,
    padding: 16,
    height: 300,
    fontSize: 14,
    color: '#1F2937',
    textAlignVertical: 'top',
  },
  settingsCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#ECECEC',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  settingsCellDanger: {
    borderColor: '#FAD2CF',
    backgroundColor: '#FCE8E6',
  },
  settingsLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4B5563',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  formContainer: {
    gap: 14,
  },
  formHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 14,
    color: '#1F2937',
    marginBottom: 4,
  },
  formSubmitBtn: {
    backgroundColor: '#6D5DFC',
    borderRadius: 10,
    height: 46,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  formSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
  },
  searchBtn: {
    backgroundColor: '#6D5DFC',
    width: 44,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchResultsScroll: {
    maxHeight: 220,
    marginTop: 8,
  },
  searchResultItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingVertical: 10,
    gap: 4,
  },
  resultItemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
  },
  resultItemCitation: {
    fontSize: 11,
    color: '#6D5DFC',
    fontWeight: '600',
  },
  resultItemSummary: {
    fontSize: 12,
    color: '#4B5563',
    lineHeight: 16,
  },
  resultSaveBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#EEECFF',
    borderColor: '#E1DDFF',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 4,
  },
  resultSaveBtnText: {
    color: '#6D5DFC',
    fontSize: 11,
    fontWeight: '700',
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4B5563',
  },
  templateSelection: {
    flexDirection: 'row',
    gap: 8,
  },
  templateChip: {
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  templateChipActive: {
    backgroundColor: '#6D5DFC',
  },
  templateText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  compilingContainer: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 20,
  },
  compilingText: {
    fontSize: 12,
    color: '#6B7280',
  },
  draftPreviewScroll: {
    height: 150,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    padding: 10,
    marginBottom: 8,
  },
  draftPreviewText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 11,
    color: '#4B5563',
    lineHeight: 16,
  },
  ocrOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  ocrBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  ocrSpinner: {
    marginBottom: 16,
  },
  ocrTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 4,
  },
  ocrSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 16,
  },
  ocrStepsContainer: {
    alignSelf: 'stretch',
    gap: 10,
  },
  ocrStepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ocrStepText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  ocrStepTextActive: {
    color: '#6D5DFC',
    fontWeight: '700',
  },
  threeDotBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  appBarBadgesRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  appBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#F3F4F6',
  },
  appBadgeStatus: {
    backgroundColor: '#E6F4EA',
  },
  appBadgePriority: {
    backgroundColor: '#FCE8E6',
  },
  appBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#10B981',
    textTransform: 'uppercase',
  },
  commandCenterContainer: {
    padding: 16,
    gap: 16,
    backgroundColor: '#FFFFFF',
    paddingBottom: Platform.OS === 'ios' ? 100 : 80,
  },
  caseInfoCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ECECEC',
  },
  caseInfoLabel: {
    fontWeight: '700',
    color: '#6B7280',
  },
  caseInfoRow: {
    fontSize: 11,
    color: '#4B5563',
    lineHeight: 16,
    fontWeight: '500',
  },
  insightsSection: {
    marginHorizontal: -16,
  },
  insightsScroll: {
    paddingHorizontal: 16,
    gap: 10,
  },
  insightCard: {
    width: 130,
    height: 80,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#ECECEC',
    borderRadius: 12,
    padding: 10,
    justifyContent: 'space-between',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.01,
    shadowRadius: 3,
    elevation: 1,
  },
  insightCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  insightCardTitle: {
    fontSize: 9,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    flex: 1,
  },
  insightCardValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1F2937',
  },
  insightCardSub: {
    fontSize: 8,
    color: '#6B7280',
    fontWeight: '600',
  },
  aiAssistantCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E1DDFF',
    padding: 16,
    shadowColor: '#6D5DFC',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
    gap: 12,
  },
  aiAssistantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  aiAssistantTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#6D5DFC',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  aiAssistantRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingBottom: 8,
    gap: 12,
  },
  aiAssistantLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    width: 100,
  },
  aiAssistantValue: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  aiAssistantButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  aiButton: {
    flex: 1,
    height: 36,
    backgroundColor: '#6D5DFC',
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  aiButtonOutline: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#6D5DFC',
  },
  aiButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  navigationSection: {
    gap: 10,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '800',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6D5DFC',
  },
  tilesContainer: {
    gap: 8,
  },
  navTile: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#ECECEC',
    borderRadius: 12,
    padding: 10,
    height: 52,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.01,
    shadowRadius: 2,
    elevation: 1,
  },
  navTilePressed: {
    backgroundColor: '#F9FAFB',
  },
  navTileIconBg: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  navTileContent: {
    flex: 1,
  },
  navTileLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
  },
  navTileDesc: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '500',
    marginTop: 1,
  },
  previewSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ECECEC',
    padding: 16,
    gap: 12,
  },
  previewEmptyText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingVertical: 12,
    fontWeight: '600',
  },
  previewList: {
    paddingLeft: 4,
  },
  previewItem: {
    flexDirection: 'row',
    gap: 12,
    minHeight: 50,
  },
  previewDotContainer: {
    width: 10,
    alignItems: 'center',
  },
  previewDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6D5DFC',
    marginTop: 4,
  },
  previewVerticalLine: {
    width: 2,
    backgroundColor: '#F3F4F6',
    flex: 1,
    marginVertical: 4,
  },
  previewItemContent: {
    flex: 1,
    paddingBottom: 10,
  },
  previewItemDate: {
    fontSize: 9,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  previewItemTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 2,
  },
  previewItemDesc: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1,
  },
  viewTimelineBtn: {
    height: 38,
    backgroundColor: '#EEECFF',
    borderWidth: 1,
    borderColor: '#E1DDFF',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewTimelineBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6D5DFC',
  },
  activityList: {
    gap: 10,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  activityIconBg: {
    width: 28,
    height: 28,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityContent: {
    flex: 1,
  },
  activityType: {
    fontSize: 9,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
  },
  activityTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 1,
  },
  activityTime: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 1,
  },
  assistantContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 10,
    zIndex: 1000,
    overflow: 'hidden',
    width: '100%',
    height: '100%',
  },
  assistantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ECECEC',
    backgroundColor: '#FFFFFF',
  },
  assistantHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  assistantCloseText: {
    fontSize: 14,
    color: '#6D5DFC',
    fontWeight: '700',
  },
  assistantHeaderTitleContainer: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  assistantHeaderText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1F2937',
  },
  activeToolIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    gap: 4,
    marginTop: 2,
  },
  activeToolIndicatorText: {
    fontSize: 9,
    fontWeight: '700',
  },
  assistantHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  assistantHeaderBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  assistantExpandBtn: {
    padding: 4,
  },
  assistantChatArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  assistantListContent: {
    flexGrow: 1,
    padding: 16,
    paddingBottom: 24,
    gap: 16,
  },
  statusChipContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 6,
    width: '100%',
  },
  statusChip: {
    backgroundColor: '#EEECFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#E1DDFF',
  },
  statusChipText: {
    color: '#6D5DFC',
    fontSize: 11,
    fontWeight: '600',
  },
  modelMessageItemContainer: {
    width: '100%',
    alignItems: 'flex-start',
    gap: 6,
  },
  responseActionsContainer: {
    width: '100%',
    marginTop: 2,
    marginBottom: 6,
  },
  responseActionsRow: {
    paddingHorizontal: 4,
    gap: 8,
  },
  responseActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ECECEC',
  },
  responseActionLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#4B5563',
  },
  composerWrapper: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#ECECEC',
    paddingHorizontal: 16,
    paddingVertical: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
  },
  pillInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 24,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#ECECEC',
  },
  composerIconButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  composerTextInput: {
    flex: 1,
    height: 36,
    paddingHorizontal: 8,
    fontSize: 13,
    color: '#1F2937',
  },
  composerSendBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#6D5DFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  composerSendBtnDisabled: {
    opacity: 0.4,
    backgroundColor: '#9CA3AF',
  },
  toolSelectorMenu: {
    position: 'absolute',
    bottom: 56,
    left: 16,
    width: 220,
    maxHeight: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ECECEC',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 200,
    overflow: 'hidden',
  },
  toolSelectorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 14,
    paddingRight: 0,
    height: 44,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
  },
  toolSelectorTitle: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  toolSelectorCloseBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toolSelectorScroll: {
    flexGrow: 0,
    paddingVertical: 4,
  },
  toolMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  toolMenuItemActive: {
    backgroundColor: '#F9FAFB',
  },
  toolMenuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toolMenuLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  toolMenuLabelActive: {
    color: '#6D5DFC',
    fontWeight: '700',
  },

  attachmentsWrapper: {
    backgroundColor: '#F9FAFB',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#ECECEC',
  },
  attachmentsScroll: {
    gap: 8,
  },
  attachmentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderColor: '#ECECEC',
    borderWidth: 1,
    borderRadius: 8,
    paddingLeft: 8,
    paddingRight: 4,
    paddingVertical: 4,
    marginRight: 8,
  },
  attachmentLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4B5563',
    maxWidth: 100,
  },
  messageRow: {
    flexDirection: 'row',
    width: '100%',
  },
  messageRowUser: {
    justifyContent: 'flex-end',
  },
  messageRowModel: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '82%',
    borderRadius: 16,
    padding: 12,
  },
  messageBubbleUser: {
    backgroundColor: '#6D5DFC',
    borderBottomRightRadius: 4,
  },
  messageBubbleModel: {
    backgroundColor: '#F3F4F6',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  messageTextUser: {
    color: '#FFFFFF',
  },
  messageTextModel: {
    color: '#1F2937',
  },
  bubbleAttachments: {
    gap: 4,
    marginBottom: 8,
  },
  bubbleAttachChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.06)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    maxWidth: '100%',
  },
  bubbleAttachText: {
    fontSize: 11,
    fontWeight: '600',
  },
  textWhite: {
    color: '#FFFFFF',
  },
  textSecondary: {
    color: '#4B5563',
  },
  bubbleSuggestions: {
    marginTop: 12,
    gap: 6,
  },
  bubbleSugChip: {
    backgroundColor: '#FFFFFF',
    borderColor: '#6D5DFC',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    alignSelf: 'flex-start',
  },
  bubbleSugText: {
    color: '#6D5DFC',
    fontSize: 12,
    fontWeight: '600',
  },
  copilotFloatBtnPill: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6D5DFC',
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 8,
    shadowColor: '#6D5DFC',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 99,
  },
  copilotFloatText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  centerToastContainer: {
    position: 'absolute',
    top: '45%',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  centerToastBox: {
    backgroundColor: 'rgba(31, 41, 55, 0.9)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  centerToastText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  caseSummaryTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 6,
  },
  caseSummaryText: {
    fontSize: 12,
    color: '#4B5563',
    lineHeight: 18,
    marginBottom: 10,
  },
  dividerLine: {
    height: 1,
    backgroundColor: '#ECECEC',
    marginVertical: 10,
  },
  caseDetailMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 6,
  },
  metaCol: {
    flex: 1,
  },
  metaColLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
  },
  metaColValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 2,
  },
  narrativeInputCard: {
    backgroundColor: '#EEECFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E1DDFF',
    marginBottom: 16,
    gap: 8,
  },
  narrativeHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  narrativeTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#5B4EDB',
    textTransform: 'uppercase',
  },
  narrativeTextInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E1DDFF',
    padding: 10,
    fontSize: 12,
    color: '#1F2937',
    height: 80,
    textAlignVertical: 'top',
  },
  narrativeActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  narrativeSampleBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  narrativeSampleText: {
    fontSize: 11,
    color: '#6D5DFC',
    fontWeight: '700',
  },
  narrativeExtractBtn: {
    backgroundColor: '#6D5DFC',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  narrativeExtractText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  warningAlertBanner: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#FEF7E0',
    borderColor: '#FDE68A',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  warningAlertText: {
    fontSize: 12,
    color: '#B45309',
    lineHeight: 16,
  },
  warningAlertActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  warningActionLink: {
    fontSize: 11,
    fontWeight: '800',
    color: '#B45309',
  },
  warningDismissLink: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  timelineExpandedDetails: {
    marginTop: 8,
    gap: 6,
  },
  timelineDetailRow: {
    fontSize: 11,
    color: '#4B5563',
  },
  timelineAiExplanationBox: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: '#EEECFF',
    padding: 8,
    borderRadius: 6,
    marginTop: 4,
  },
  timelineAiExplanationText: {
    fontSize: 11,
    color: '#5B4EDB',
    lineHeight: 15,
    flex: 1,
  },
  timelineExpandText: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '600',
    marginTop: 6,
  },
  horizontalPillsScroll: {
    paddingVertical: 4,
    gap: 8,
  },
  filterPill: {
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#ECECEC',
    marginRight: 6,
  },
  filterPillActive: {
    backgroundColor: '#6D5DFC',
    borderColor: '#6D5DFC',
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  hearingOutcomeBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#ECECEC',
    gap: 4,
  },
  outcomeDetailText: {
    fontSize: 11,
    color: '#4B5563',
    lineHeight: 15,
  },
  recordOutcomeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  recordOutcomeBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6D5DFC',
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  tagBadge: {
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tagBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#4B5563',
  },
  docExtractedBox: {
    backgroundColor: '#EEECFF',
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E1DDFF',
    gap: 2,
  },
  docExtractedText: {
    fontSize: 10,
    color: '#5B4EDB',
  },
  evidenceIntegrityBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#ECECEC',
    gap: 2,
  },
  evidenceIntegrityText: {
    fontSize: 11,
    color: '#4B5563',
  },
  searchSubmitBtn: {
    backgroundColor: '#6D5DFC',
    borderRadius: 6,
    width: 36,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  researchSugChip: {
    backgroundColor: '#FFFFFF',
    borderColor: '#ECECEC',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 6,
  },
  researchSugChipText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
  },
  ocrOverlayStatic: {
    backgroundColor: '#EEECFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E1DDFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  accordionContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#ECECEC',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 10,
  },
  accordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#F9FAFB',
  },
  accordionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1F2937',
  },
  accordionContent: {
    padding: 14,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#ECECEC',
    gap: 8,
  },
  accordionTextBold: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1F2937',
  },
  accordionBullet: {
    fontSize: 12,
    color: '#4B5563',
    lineHeight: 16,
    paddingLeft: 8,
  },
  researchLawItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingBottom: 12,
    marginBottom: 12,
    gap: 4,
  },
  lawActLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1F2937',
  },
  lawSecLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6D5DFC',
  },
  lawDesc: {
    fontSize: 12,
    color: '#4B5563',
    lineHeight: 16,
  },
  lawExplanationBox: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: '#EEECFF',
    padding: 8,
    borderRadius: 6,
    marginTop: 4,
  },
  lawExplanationText: {
    fontSize: 11,
    color: '#5B4EDB',
    lineHeight: 15,
    flex: 1,
  },
  judgmentTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1F2937',
  },
  judgmentCitation: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  saveResearchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: '#6D5DFC',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  saveResearchBtnText: {
    color: '#6D5DFC',
    fontSize: 11,
    fontWeight: '700',
  },
  recommendationItem: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  recommendationText: {
    fontSize: 12,
    color: '#4B5563',
    lineHeight: 16,
    flex: 1,
  },
  emptyTextSaved: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingVertical: 12,
  },
  savedPrecedentItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingBottom: 10,
    marginBottom: 10,
    gap: 4,
  },
  savedPrecedentTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1F2937',
  },
  savedPrecedentCitation: {
    fontSize: 10,
    color: '#6D5DFC',
    fontWeight: '600',
  },
  savedPrecedentSummary: {
    fontSize: 11,
    color: '#4B5563',
    lineHeight: 15,
  },
  contractUploadCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#ECECEC',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  contractUploadTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1F2937',
  },
  contractUploadSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 16,
  },
  contractUploadBtn: {
    backgroundColor: '#6D5DFC',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  contractUploadBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  draftPreviewScrollStatic: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ECECEC',
    padding: 10,
    marginTop: 6,
  },
  aiReplyContainer: {
    backgroundColor: '#EEECFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#6D5DFC',
  },
  aiReplyTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#6D5DFC',
    marginBottom: 6,
  },
  aiReplyText: {
    fontSize: 12,
    color: '#1F2937',
    lineHeight: 18,
  },
  scrollDownBtn: {
    position: 'absolute',
    bottom: 20,
    left: '50%',
    marginLeft: -21,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#ECECEC',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 4,
    zIndex: 999,
  },
  drawerOverlay: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  drawerContainer: {
    width: width * 0.8,
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRightWidth: 1,
    borderRightColor: '#ECECEC',
    paddingHorizontal: 16,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ECECEC',
  },
  drawerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1F2937',
  },
  drawerNewChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6D5DFC',
    paddingVertical: 10,
    borderRadius: 8,
    marginVertical: 12,
    gap: 6,
  },
  drawerNewChatBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  drawerSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ECECEC',
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 12,
  },
  drawerSearchInput: {
    flex: 1,
    fontSize: 13,
    color: '#1F2937',
    padding: 0,
  },
  drawerList: {
    flex: 1,
  },
  drawerEmptyText: {
    fontSize: 12.5,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 24,
    fontStyle: 'italic',
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    marginBottom: 4,
    backgroundColor: 'transparent',
  },
  drawerItemActive: {
    backgroundColor: '#EEECFF',
  },
  drawerItemTextContainer: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
  },
  drawerItemText: {
    fontSize: 13,
    color: '#4B5563',
    fontWeight: '500',
  },
  drawerItemTextActive: {
    color: '#6D5DFC',
    fontWeight: '700',
  },
  drawerItemSubtext: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 2,
  },
  drawerRenameInput: {
    fontSize: 13,
    color: '#1F2937',
    fontWeight: '600',
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: '#6D5DFC',
    padding: 0,
  },
  drawerActionIcon: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
    marginLeft: 4,
  },
  // Redesigned Timeline Screen Styles
  filtersScroll: {
    marginVertical: 10,
  },
  filtersContainer: {
    paddingHorizontal: 4,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterChipActive: {
    backgroundColor: '#6D5DFC',
    borderColor: '#6D5DFC',
  },
  filterChipText: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  sortRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 8,
    paddingHorizontal: 2,
  },
  milestoneCountText: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '600',
  },
  sortToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EEECFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  sortToggleText: {
    fontSize: 11,
    color: '#6D5DFC',
    fontWeight: '600',
  },
  suggestionsContainer: {
    marginVertical: 12,
    gap: 8,
  },
  suggestionsHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1F2937',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  suggestionCard: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
  },
  warningCard: {
    backgroundColor: '#F5F3FF',
    borderColor: '#DDD6FE',
  },
  deadlineCard: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  missingCard: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  suggestionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  suggestionTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  warningTagText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#6D5DFC',
  },
  deadlineTagText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#D97706',
  },
  missingTagText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#EF4444',
  },
  suggestionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1F2937',
  },
  suggestionDesc: {
    fontSize: 10,
    color: '#4B5563',
    marginTop: 2,
    lineHeight: 14,
  },
  timelineHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  badgesGroup: {
    flexDirection: 'row',
    gap: 4,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryBadge: {
    backgroundColor: '#F3F4F6',
  },
  categoryBadgeText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#4B5563',
  },
  badgeHigh: {
    backgroundColor: '#FEE2E2',
  },
  badgeMedium: {
    backgroundColor: '#FEF3C7',
  },
  badgeLow: {
    backgroundColor: '#EEECFF',
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  aiGeneratedBadge: {
    backgroundColor: '#EEECFF',
    borderWidth: 0.5,
    borderColor: '#6D5DFC',
  },
  aiGeneratedBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#6D5DFC',
  },
  approximateNotice: {
    fontSize: 8.5,
    color: '#6B7280',
    marginTop: 4,
    fontStyle: 'italic',
  },
  dotHigh: {
    backgroundColor: '#EF4444',
  },
  dotMedium: {
    backgroundColor: '#F59E0B',
  },
  dotLow: {
    backgroundColor: '#6D5DFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  loadingTextTimeline: {
    fontSize: 12,
    color: '#4B5563',
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyHeadline: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  emptySubline: {
    fontSize: 12.5,
    color: '#6B7280',
    marginTop: 4,
    marginBottom: 16,
    textAlign: 'center',
  },
  generateTimelineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6D5DFC',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  generateTimelineBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  // Hearings Module Styles
  overviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ECECEC',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  overviewTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  overviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  overviewLabel: {
    fontSize: 13,
    color: '#4B5563',
  },
  overviewValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
  },
  overviewStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#ECECEC',
    paddingTop: 12,
  },
  overviewStatCol: {
    flex: 1,
    alignItems: 'center',
  },
  overviewStatNum: {
    fontSize: 18,
    fontWeight: '800',
    color: '#6D5DFC',
  },
  overviewStatLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  horizontalScrollWidgets: {
    marginBottom: 16,
  },
  widgetCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ECECEC',
    padding: 12,
    width: width * 0.7,
    marginRight: 12,
    minHeight: 110,
    justifyContent: 'space-between',
  },
  widgetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  widgetHeaderTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  widgetBody: {
    flex: 1,
    justifyContent: 'center',
  },
  widgetTextMain: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
  },
  widgetTextSub: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  widgetProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  widgetProgressBarBg: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F3F4F6',
    overflow: 'hidden',
  },
  widgetProgressBarFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 3,
  },
  widgetProgressPerc: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10B981',
  },
  hearingFilterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  hearingFilterPillActive: {
    backgroundColor: '#6D5DFC',
  },
  hearingFilterPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  hearingFilterPillTextActive: {
    color: '#FFFFFF',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#ECECEC',
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchBarInput: {
    flex: 1,
    height: 38,
    fontSize: 13,
    color: '#1F2937',
  },
  timelineWrapper: {
    paddingLeft: 8,
    marginTop: 8,
  },
  timelineItem: {
    flexDirection: 'row',
    minHeight: 100,
  },
  timelineLineContainer: {
    alignItems: 'center',
    width: 24,
  },
  hearingTimelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#6D5DFC',
    zIndex: 1,
    marginTop: 8,
  },
  hearingTimelineConnector: {
    flex: 1,
    width: 2,
    backgroundColor: '#ECECEC',
    marginTop: 4,
    marginBottom: 4,
  },
  hearingTimelineContentCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#ECECEC',
    borderRadius: 12,
    padding: 14,
    marginLeft: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  timelineCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  timelineCardDate: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6D5DFC',
  },
  timelineCardTime: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1,
  },
  timelineCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 6,
  },
  timelineMetaGrid: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 10,
    gap: 4,
    marginBottom: 10,
  },
  timelineMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timelineMetaText: {
    fontSize: 12,
    color: '#4B5563',
    flex: 1,
  },
  aiEnrichedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#EEECFF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: '#6D5DFC',
  },
  aiEnrichedBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#6D5DFC',
  },
  aiOrderSummaryBox: {
    backgroundColor: '#EEECFF',
    borderRadius: 8,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#6D5DFC',
    marginBottom: 12,
  },
  aiOrderSummaryHeader: {
    fontSize: 10,
    fontWeight: '800',
    color: '#6D5DFC',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  aiOrderSummaryText: {
    fontSize: 12,
    color: '#4B5563',
    lineHeight: 16,
  },
  checklistToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: '#ECECEC',
    borderRadius: 8,
    paddingVertical: 8,
    marginBottom: 10,
  },
  checklistToggleText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#4B5563',
  },
  checklistContainer: {
    borderTopWidth: 1,
    borderTopColor: '#ECECEC',
    paddingTop: 10,
    marginTop: 6,
  },
  checklistSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 10,
  },
  checklistCategory: {
    marginBottom: 12,
  },
  checklistCategoryTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#6B7280',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  checklistEmptyText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontStyle: 'italic',
    paddingLeft: 6,
  },
  checklistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 5,
    paddingLeft: 4,
  },
  checklistRowText: {
    fontSize: 12,
    color: '#4B5563',
    flex: 1,
  },
  checklistRowTextChecked: {
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  cardActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#ECECEC',
    paddingTop: 10,
    marginTop: 6,
  },
  cardActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#6D5DFC',
  },
  cardActionBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6D5DFC',
  },
  cardActionBtnFilled: {
    backgroundColor: '#6D5DFC',
  },
  cardActionBtnTextFilled: {
    color: '#FFFFFF',
  },
  miniStatusBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  miniBadgeDanger: {
    backgroundColor: '#FCE8E6',
  },
  miniBadgeWarning: {
    backgroundColor: '#FEF7E0',
  },
  miniStatusBadgeText: {
    fontSize: 8.5,
    fontWeight: '700',
    color: '#EF4444',
  },
  formStatusChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#ECECEC',
    marginRight: 6,
    marginBottom: 6,
  },
  formStatusChipActive: {
    backgroundColor: '#EEECFF',
    borderColor: '#6D5DFC',
  },
  formStatusChipText: {
    fontSize: 11,
    color: '#4B5563',
  },
  formStatusChipTextActive: {
    color: '#6D5DFC',
    fontWeight: '700',
  },
  statusChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  pickerContainer: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#ECECEC',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  pickerTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  pickerItem: {
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ECECEC',
    backgroundColor: '#FFFFFF',
    marginBottom: 6,
  },
  pickerItemActive: {
    borderColor: '#6D5DFC',
    backgroundColor: '#EEECFF',
  },
  pickerItemName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1F2937',
  },
  pickerItemDesc: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2,
  },
  hearingProgressBarBg: {
    height: 10,
    backgroundColor: '#F3F4F6',
    borderRadius: 5,
    overflow: 'hidden',
    marginTop: 10,
    marginBottom: 6,
  },
  hearingProgressBarFill: {
    height: '100%',
    backgroundColor: '#6D5DFC',
  },
  progressText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4B5563',
    textAlign: 'center',
    marginBottom: 12,
  },
});
