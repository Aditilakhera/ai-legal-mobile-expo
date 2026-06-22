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

  // --- FORM INPUT STATES ---
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

  // Hearings filter/search & actions states
  const [activeHearingFilter, setActiveHearingFilter] = useState<string>('All');
  const [hearingSearchQuery, setHearingSearchQuery] = useState<string>('');
  const [isEnrichingHearingId, setIsEnrichingHearingId] = useState<string | null>(null);
  const [expandedHearingChecklistId, setExpandedHearingChecklistId] = useState<string | null>(null);
  const [hearingNotesInput, setHearingNotesInput] = useState<string>('');
  const [selectedHearingForNotes, setSelectedHearingForNotes] = useState<CaseHearing | null>(null);
  const [selectedHearingForOrder, setSelectedHearingForOrder] = useState<CaseHearing | null>(null);
  const [simulatedUploadProgress, setSimulatedUploadProgress] = useState<number>(0);
  const [simulatedUploadStep, setSimulatedUploadStep] = useState<string>('');
  // Party
  const [partyForm, setPartyForm] = useState({ name: '', role: 'Witness', contact: '', notes: '' });
  // Evidence
  const [evidenceForm, setEvidenceForm] = useState({ name: '', type: 'Document', description: '', admissibility: 'Admissible' });
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
        isFocusMode={true}
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
  const handleCompileDraft = () => {
    if (!draftForm.name) {
      showToast('error', 'Validation Error', 'Draft folder file name is required.');
      return;
    }
    setIsDraftCompiling(true);
    setTimeout(() => {
      const compiled = `AI COMPILATION DRAFT: ${draftForm.template.toUpperCase()}\n\nIn the court of Senior District Magistrate at New Delhi.\nIn the matter of: Rajesh Sharma (Plaintiff) vs Amit Verma (Defendant).\n\nSubject: Formal demand and pleading notice concerning recovery of outstanding principal amounting to INR 5,00,000 under summary procedures of CPC.\n\nRespectfully Showeth:\n1. The Plaintiff disbursed loan sum on 15 January 2025...\n2. Defendant failed to honor deadline terms...\n\nDrafted on: ${new Date().toLocaleDateString()}`;
      setCompiledDraftText(compiled);
      setIsDraftCompiling(false);
      showToast('success', 'Draft Compiled', 'AI compiled pleading draft successfully.');
    }, 1800);
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
  const renderQuickInsights = () => {
    const winProb = workspace?.intelligence?.winProbability || 65;
    const strength = workspace?.intelligence?.strengthScore || 70;
    const totalTasks = workspace?.tasks?.length || 0;
    const completedTasks = workspace?.tasks?.filter((t) => t.status === 'Completed').length || 0;
    const taskPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const nextHearing = (workspace?.hearings || []).find((h) => h.status === 'Upcoming');
    
    const docCount = workspace?.documents?.length || 0;
    const lastDoc = docCount > 0 ? workspace?.documents[docCount - 1] : null;
    const recentActivityStr = lastDoc ? `Uploaded ${lastDoc.name}` : 'No recent uploads';

    const insights = [
      { id: 'win', title: 'Win Probability', value: `${winProb}%`, icon: 'trending-up-outline', color: theme.success },
      { id: 'strength', title: 'Case Strength', value: `${strength}%`, icon: 'shield-checkmark-outline', color: theme.info },
      { id: 'tasks', title: 'Task Progress', value: `${taskPercent}%`, subtitle: `${completedTasks}/${totalTasks} done`, icon: 'checkbox-outline', color: theme.primary },
      { id: 'hearing', title: 'Upcoming Hearing', value: nextHearing ? nextHearing.date : 'None Scheduled', icon: 'calendar-outline', color: theme.warning },
      { id: 'activity', title: 'Recent Activity', value: recentActivityStr, icon: 'time-outline', color: theme.textSecondary },
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
      { id: 'tasks', label: 'Tasks', desc: `${(workspace?.tasks || []).filter(t => t.status !== 'Completed').length} Pending Tasks`, icon: 'list-outline', color: '#10B981' },
      { id: 'notes', label: 'Case Notes', desc: 'Strategic Notepad', icon: 'pencil-outline', color: '#4B5563' },
      { id: 'court-orders', label: 'Court Orders', desc: `${courtOrdersList.length} Official Decrees`, icon: 'document-outline', color: '#6D5DFC' },
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
    const timelineEvents = (workspace?.facts || []).slice(-3).reverse();

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
                  <Text style={styles.previewItemTitle}>{ev.event || (ev as any).title}</Text>
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

  // Overview / Command Hub Dashboard Grid
  const renderOverviewTab = () => {
    const nextHearing = (workspace?.hearings || []).find((h) => h.status === 'Upcoming');
    const nextHearingStr = nextHearing ? `${nextHearing.date} - ${nextHearing.time || '10:00 AM'}` : 'None Scheduled';

    const client = workspace?.clientName || 'N/A';
    const opponent = workspace?.opponentName || workspace?.accused || 'N/A';
    const court = workspace?.courtName || 'N/A';
    const caseType = workspace?.caseType || 'N/A';

    return (
      <View style={styles.commandCenterContainer}>
        {/* Case Information summary block */}
        <View style={styles.caseInfoCard}>
          <Text style={styles.caseInfoRow} numberOfLines={1}>
            <Text style={styles.caseInfoLabel}>Client: </Text>{client}  •  
            <Text style={styles.caseInfoLabel}> Opponent: </Text>{opponent}  •  
            <Text style={styles.caseInfoLabel}> Court: </Text>{court}
          </Text>
          <Text style={styles.caseInfoRow} numberOfLines={1}>
            <Text style={styles.caseInfoLabel}>Type: </Text>{caseType}  •  
            <Text style={styles.caseInfoLabel}> Next Hearing: </Text>{nextHearingStr}
          </Text>
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
              style={[styles.filterPill, activeHearingFilter === filt && styles.filterPillActive]}
              onPress={() => setActiveHearingFilter(filt)}
            >
              <Text style={[styles.filterPillText, activeHearingFilter === filt && styles.filterPillTextActive]}>
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

    return (
      <View style={styles.tabContent}>
        <View style={styles.moduleHeaderRow}>
          <Text style={styles.moduleTitle}>Litigation Parties</Text>
          <Pressable
            style={styles.moduleHeaderBtn}
            onPress={() => {
              setModalType('party');
              setIsModalOpen(true);
            }}
          >
            <Ionicons name="add" size={16} color="#6D5DFC" />
            <Text style={styles.moduleHeaderBtnText}>Add Litigant</Text>
          </Pressable>
        </View>

        {/* Client / Opponent summary card */}
        <View style={styles.metaCard}>
          <View style={styles.partyRow}>
            <Ionicons name="person" size={18} color="#6D5DFC" />
            <Text style={styles.partyText}>Lessor / Client: <Text style={styles.boldText}>{client}</Text></Text>
          </View>
          <View style={styles.partyRow}>
            <Ionicons name="person" size={18} color="#EF4444" />
            <Text style={styles.partyText}>Lessee / Opponent: <Text style={styles.boldText}>{opponent}</Text></Text>
          </View>
        </View>

        <Text style={styles.subHeading}>Witnesses & Counsel</Text>
        {lawyers.length === 0 ? (
          <Text style={styles.emptyText}>No secondary counsel or witnesses registered.</Text>
        ) : (
          <View style={styles.cardList}>
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

        {list.length === 0 ? (
          <Text style={styles.emptyText}>No documents attached to this litigation workspace.</Text>
        ) : (
          <View style={styles.cardList}>
            {list.map((d) => (
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
                <Text style={styles.itemCardBody}>File Class: {d.type} • Uploaded: {d.uploadDate}</Text>
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
            <Text style={styles.moduleHeaderBtnText}>Log Proof</Text>
          </Pressable>
        </View>

        {list.length === 0 ? (
          <Text style={styles.emptyText}>Evidence vault is empty.</Text>
        ) : (
          <View style={styles.cardList}>
            {list.map((ev, i) => (
              <View key={i} style={styles.itemCard}>
                <View style={styles.itemCardHeader}>
                  <Text style={styles.itemCardTitle}>🛡️ {ev.name}</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      ev.admissibility === 'Admissible'
                        ? styles.badgeSuccess
                        : ev.admissibility === 'Inadmissible'
                        ? styles.badgeDanger
                        : styles.badgeWarning,
                    ]}
                  >
                    <Text style={styles.statusBadgeText}>{ev.admissibility}</Text>
                  </View>
                </View>
                <Text style={styles.itemCardBody}>{ev.description}</Text>
                {ev.notes && <Text style={styles.itemCardFooter}>Notes: {ev.notes}</Text>}
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  // Research precedents
  const renderResearchTab = () => {
    const list = workspace?.savedPrecedents || [];

    return (
      <View style={styles.tabContent}>
        <View style={styles.moduleHeaderRow}>
          <Text style={styles.moduleTitle}>Case Precedents</Text>
          <Pressable
            style={styles.moduleHeaderBtn}
            onPress={() => {
              setModalType('research');
              setIsModalOpen(true);
            }}
          >
            <Ionicons name="search" size={14} color="#6D5DFC" />
            <Text style={styles.moduleHeaderBtnText}>Search citations</Text>
          </Pressable>
        </View>

        {list.length === 0 ? (
          <Text style={styles.emptyText}>No citations saved to brief portfolio.</Text>
        ) : (
          <View style={styles.cardList}>
            {list.map((prec, i) => (
              <View key={i} style={styles.itemCard}>
                <Text style={styles.itemCardTitle}>⚖️ {prec.title}</Text>
                <Text style={styles.citationText}>Citation: {prec.citation}</Text>
                <Text style={styles.itemCardBody}>{prec.summary}</Text>
              </View>
            ))}
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
              setIsModalOpen(true);
            }}
          >
            <Ionicons name="sparkles" size={14} color="#6D5DFC" />
            <Text style={styles.moduleHeaderBtnText}>Compile Pleading</Text>
          </Pressable>
        </View>

        <Text style={styles.emptyText}>Use the pleading compiler to generate complaints, legal demand notices, or power of attorney papers.</Text>
      </View>
    );
  };

  // Contracts
  const renderContractsTab = () => {
    return (
      <View style={styles.tabContent}>
        <Text style={styles.moduleTitle}>Clause Risk Auditor</Text>
        <View style={styles.metaCard}>
          <Text style={styles.metaTitle}>Registered Lease Contract</Text>
          <Text style={styles.riskLevelText}>Risk Assessment: <Text style={[styles.boldText, { color: theme.warning }]}>Medium Risk</Text></Text>
        </View>

        <Text style={styles.subHeading}>Audited Contract Clauses</Text>
        {[
          { title: 'Payment Terms Section 4', text: 'Lessee shall disburse rent on the 5th day of every calendar month.', risk: 'Low' },
          { title: 'Forfeiture Clause Section 11', text: 'Failure to disburse rent for 2 consecutive periods allows Lessor to terminate immediately.', risk: 'Medium' },
          { title: 'Dispute Resolution Clause', text: 'Arbitration in Mumbai jurisdiction.', risk: 'High' },
        ].map((c, i) => (
          <View key={i} style={styles.itemCard}>
            <View style={styles.itemCardHeader}>
              <Text style={styles.itemCardTitle}>{c.title}</Text>
              <View style={[styles.statusBadge, c.risk === 'High' ? styles.badgeDanger : c.risk === 'Medium' ? styles.badgeWarning : styles.badgeSuccess]}>
                <Text style={styles.statusBadgeText}>{c.risk} Risk</Text>
              </View>
            </View>
            <Text style={styles.itemCardBody}>{c.text}</Text>
          </View>
        ))}
      </View>
    );
  };

  // Arguments
  const renderArgumentsTab = () => {
    return (
      <View style={styles.tabContent}>
        <Text style={styles.moduleTitle}>Core Litigation Positions</Text>
        <View style={styles.cardList}>
          {[
            { title: 'Prima Facie Contract Validation', text: 'Plaintiff holds registered contract deed signed by Defendant Amit Verma.' },
            { title: 'Summons Service Affirmation', text: 'SUMMONS notice delivered on Defendant; tracking slip uploaded.' },
            { title: 'Default Acknowledgment', text: 'Defendant defaulted on payment due on 15 April 2025.' },
          ].map((arg, i) => (
            <View key={i} style={styles.itemCard}>
              <Text style={styles.itemCardTitle}>💡 Argument {i + 1}: {arg.title}</Text>
              <Text style={styles.itemCardBody}>{arg.text}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  // Tasks checklist
  const renderTasksTab = () => {
    const list = workspace?.tasks || [];

    return (
      <View style={styles.tabContent}>
        <View style={styles.moduleHeaderRow}>
          <Text style={styles.moduleTitle}>Task checklist</Text>
          <Pressable
            style={styles.moduleHeaderBtn}
            onPress={() => {
              setModalType('task');
              setIsModalOpen(true);
            }}
          >
            <Ionicons name="add" size={16} color="#6D5DFC" />
            <Text style={styles.moduleHeaderBtnText}>Add Task</Text>
          </Pressable>
        </View>

        {list.length === 0 ? (
          <Text style={styles.emptyText}>No items in tasks checklist.</Text>
        ) : (
          <View style={styles.cardList}>
            {list.map((t) => (
              <Pressable
                key={t._id}
                style={styles.taskItemRow}
                onPress={() => handleToggleTaskStatus(t._id!, t.status)}
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
                  <Text style={styles.taskItemDeadline}>Deadline: {t.deadline || 'None'}</Text>
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
      case 'settings':
        return renderSettingsTab();
      default:
        return renderOverviewTab();
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6D5DFC" />
        <Text style={styles.loadingText}>Synchronizing case workspace...</Text>
      </View>
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
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterPillActive: {
    backgroundColor: '#6D5DFC',
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  filterPillTextActive: {
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
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
    marginTop: 10,
    marginBottom: 4,
  },
});
