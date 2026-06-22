import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  LayoutAnimation,
  UIManager,
  Modal,
  Dimensions,
  TouchableWithoutFeedback,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useChatStore } from '@/store/chat';
import { useRouter } from 'expo-router';
// @ts-ignore
// eslint-disable-next-line import/no-unresolved
import { Ionicons } from '@expo/vector-icons';
import { useToastContext } from '@/providers';
import { ChatService } from '@/services/chat.service';
import { ChatMessage, ChatAttachment } from '@/types';
import { ChatMessageBubble, TypingIndicator } from '../chat';
import { useThemeContext, useBottomSheetContext } from '@/providers';
import { Spacing, Radius, Shadows } from '@/theme';
import { Button } from '../buttons';
import { AttachmentBottomSheet } from '../bottomSheets/AttachmentBottomSheet';
import { CustomCameraModal } from './CustomCameraModal';
import { useAttachmentHandler } from '@/hooks/use-attachment-handler';
import { streamAIResponse } from '@/api/client';
import { useSpeechRecognition, SpeechLanguage } from '@/hooks/use-speech-recognition';

const { height } = Dimensions.get('window');


const WELCOME_MESSAGES: Record<string, string> = {
  draftMaker: "Welcome to Draft Maker. I can generate FIRs, notices, affidavits, agreements, petitions, and other legal documents.",
  contractAnalyzer: "Upload a contract or ask me to review clauses, identify risks, and suggest improvements.",
  legalResearch: "Ask about laws, judgments, precedents, Bare Acts, or legal concepts.",
  evidenceAnalyst: "Upload evidence to identify inconsistencies, extract information, and strengthen your case.",
  argumentBuilder: "Welcome to Argument Builder. Map prosecution claims side-by-side with defense counterpoints to isolate points of contention and generate compelling court pleadings.",
  casePredictor: "Welcome to Case Predictor. Analyze historical court patterns to predict legal outcomes, calculate probability rates, and list liabilities.",
  strategyEngine: "Welcome to Strategy Engine. Formulate active trial plans, settlement compromises, hearing steps, and evidence discovery plans.",
  researchAssistant: "Welcome to Research Assistant. Perform deep semantic indexing to research topics, compare statutes, and summarize precedents.",
  legal_my_case: "Welcome to AI Assistant. I can help you with legal research, contract auditing, strategy building, and drafting.",
};

const QUICK_ACTIONS_DATA: Record<string, string[]> = {
  draftMaker: [
    'FIR',
    'Legal Notice',
    'Affidavit',
    'Rent Agreement',
    'Sale Agreement',
    'Employment Agreement',
    'Consumer Complaint',
    'Power of Attorney',
    'Partnership Deed',
    'Will',
    'Divorce Petition',
    'Bail Application',
    'RTI Application',
    'Legal Reply',
    'Custom Draft',
  ],
  contractAnalyzer: [
    'Analyze Contract',
    'Employment Agreement Review',
    'NDA Review',
    'Lease Agreement Review',
    'Vendor Agreement Review',
    'Risk Assessment',
    'Clause Explanation',
    'Missing Clauses',
    'Compliance Check',
  ],
  legalResearch: [
    'Supreme Court Judgments',
    'High Court Judgments',
    'Bare Acts',
    'IPC / BNS Sections',
    'Constitution Articles',
    'Recent Case Law',
    'Landmark Cases',
    'Legal Concepts',
  ],
  evidenceAnalyst: [
    'Analyze PDF',
    'Analyze Images',
    'OCR Extraction',
    'Timeline Generation',
    'Witness Statement Review',
    'Document Comparison',
    'Metadata Analysis',
  ],
  argumentBuilder: [
    'Generate Arguments',
    'Counter Arguments',
    'Cross Examination Questions',
    'Final Submissions',
    'Legal Strategy',
  ],
  casePredictor: [
    'Predict Outcome',
    'Strength Analysis',
    'Weakness Detection',
    'Success Probability',
    'Risk Factors',
  ],
  strategyEngine: [
    'Litigation Strategy',
    'Settlement Strategy',
    'Evidence Planning',
    'Hearing Preparation',
    'Next Legal Steps',
  ],
  researchAssistant: [
    'Research Topic',
    'Explain Legal Concept',
    'Compare Laws',
    'Summarize Judgment',
    'Find Precedents',
  ],
  legal_my_case: [
    'Explain legal query',
    'Draft a document',
    'Review a contract',
    'Find case laws',
    'Analyze court filings',
    'Litigation advice',
  ],
};

const QUICK_ACTION_PROMPTS: Record<string, string> = {
  'FIR': 'Draft a First Information Report (FIR) for: ',
  'Legal Notice': 'Draft a professional Legal Notice for: ',
  'Affidavit': 'Draft an Affidavit stating: ',
  'Rent Agreement': 'Draft a Rent Agreement between: ',
  'Sale Agreement': 'Draft a Sale Agreement for: ',
  'Employment Agreement': 'Draft an Employment Agreement between: ',
  'Consumer Complaint': 'Draft a Consumer Complaint against: ',
  'Power of Attorney': 'Draft a Power of Attorney authorizing: ',
  'Partnership Deed': 'Draft a Partnership Deed between: ',
  'Will': 'Draft a Last Will and Testament for: ',
  'Divorce Petition': 'Draft a Mutual Divorce Petition on grounds of: ',
  'Bail Application': 'Draft a Bail Application for: ',
  'RTI Application': 'Draft an RTI Application requesting: ',
  'Legal Reply': 'Draft a Legal Reply to: ',
  'Custom Draft': 'Draft a custom legal document: ',

  'Analyze Contract': 'Analyze this contract and summarize the key clauses: ',
  'Employment Agreement Review': 'Review this Employment Agreement for risks and employee rights: ',
  'NDA Review': 'Review this Non-Disclosure Agreement (NDA) for exclusions and duration: ',
  'Lease Agreement Review': 'Review this Lease Agreement for escalation terms and lock-in period: ',
  'Vendor Agreement Review': 'Review this Vendor Agreement for payment terms and SLA breaches: ',
  'Risk Assessment': 'Perform a comprehensive risk assessment on this contract: ',
  'Clause Explanation': 'Explain the following contract clause: ',
  'Missing Clauses': 'Identify any missing or standard boilerplate clauses in this agreement: ',
  'Compliance Check': 'Verify if this agreement is compliant with local laws: ',

  'Supreme Court Judgments': 'Search for Supreme Court judgments related to: ',
  'High Court Judgments': 'Search for High Court judgments on the topic of: ',
  'Bare Acts': 'Provide the text and explanation of Bare Act provisions for: ',
  'IPC / BNS Sections': 'Explain the sections and penalties under IPC/BNS for: ',
  'Constitution Articles': 'Retrieve and explain Constitution Articles relating to: ',
  'Recent Case Law': 'Find recent case laws (last 2 years) regarding: ',
  'Landmark Cases': 'List landmark judicial precedents and ratios for: ',
  'Legal Concepts': 'Explain the legal concept of: ',

  'Analyze PDF': 'Analyze the contents of this PDF evidence file: ',
  'Analyze Images': 'Analyze this image evidence: ',
  'OCR Extraction': 'Perform OCR text extraction on this document: ',
  'Timeline Generation': 'Generate a chronological timeline of events based on this evidence: ',
  'Witness Statement Review': 'Review this witness statement for credibility: ',
  'Document Comparison': 'Compare these two evidence documents: ',
  'Metadata Analysis': 'Extract and analyze metadata of this file: ',

  'Generate Arguments': 'Generate a list of primary arguments supporting the claim: ',
  'Counter Arguments': 'Formulate counter-arguments and rebuttals to: ',
  'Cross Examination Questions': 'Generate cross-examination questions for: ',
  'Final Submissions': 'Draft final submissions and prayer for: ',
  'Legal Strategy': 'Propose a strong legal strategy to refute opposing claims: ',

  'Predict Outcome': 'Predict the outcome of this case based on: ',
  'Strength Analysis': 'List the strongest legal points of our position: ',
  'Weakness Detection': 'Identify the weakest points in our case file: ',
  'Success Probability': 'Calculate the success probability and risk factors: ',
  'Risk Factors': 'What are the high-risk legal liabilities or penalties we might face: ',

  'Litigation Strategy': 'Develop a litigation strategy, timeline, and key steps for: ',
  'Settlement Strategy': 'Propose a settlement draft and target compromises for: ',
  'Evidence Planning': 'Identify what evidence we need to procure or request for: ',
  'Hearing Preparation': 'Generate a checklist to prepare for the upcoming hearing on: ',
  'Next Legal Steps': 'What are the immediate next legal steps for: ',

  'Research Topic': 'Research and summarize all statutory provisions for: ',
  'Explain Legal Concept': 'Provide a detailed explanation and legal theory behind: ',
  'Compare Laws': 'Compare laws and rules across jurisdictions for: ',
  'Summarize Judgment': 'Summarize the facts, issues, and ratio of the following judgment: ',
  'Find Precedents': 'Find relevant binding precedents for: ',

  'Explain legal query': 'Can you explain: ',
  'Draft a document': 'Draft a document for: ',
  'Review a contract': 'Review a contract for: ',
  'Find case laws': 'Find case laws for: ',
  'Analyze court filings': 'Analyze court filings for: ',
  'Litigation advice': 'Give litigation advice for: ',
};

interface ToolChatContainerProps {
  toolId: string;
  title: string;
  description: string;
  suggestions?: string[];
  placeholder?: string;
  renderCustomWidget?: (onSend: (text: string) => void, isSending: boolean) => React.ReactNode;
}

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export const ToolChatContainer: React.FC<ToolChatContainerProps> = ({
  toolId,
  title,
  description,
  suggestions = [],
  placeholder = 'Type your query here...',
  renderCustomWidget,
}) => {
  const router = useRouter();
  const { showToast } = useToastContext();
  const insets = useSafeAreaInsets();

  // Focus Mode State
  const isFocusMode = useChatStore((s) => s.isFocusMode);
  const setFocusMode = useChatStore((s) => s.setFocusMode);

  const toggleFocusMode = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setFocusMode(!isFocusMode);
  };

  const abortControllerRef = useRef<AbortController | null>(null);
  const isCancelledRef = useRef<boolean>(false);

  useEffect(() => {
    return () => {
      useChatStore.getState().setFocusMode(false);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [inputVal, setInputVal] = useState('');
  const [isSending, setIsSending] = useState(false);
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

  const isAtBottomRef = useRef(true);

  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false);

  // Real voice recording states and hook
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
      setInputVal(transcribedText);
    }
  });

  // Sync real-time transcription to text input
  useEffect(() => {
    if (isRecording && partialText) {
      setInputVal(partialText);
    }
  }, [partialText, isRecording]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const flatListRef = useRef<FlatList>(null);
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

  // Initialize a default greetings message on load
  useEffect(() => {
    const welcomeContent = WELCOME_MESSAGES[toolId] || `Welcome to **${title}**. ${description}`;
    setMessages([
      {
        id: 'welcome',
        role: 'model',
        content: welcomeContent,
        timestamp: Date.now(),
      },
    ]);
  }, [toolId, title, description]);

  const scrollToBottom = (animated = true) => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated });
    }, 100);
  };

  const handleSend = async (overrideText?: string, unusedToolId?: string, editMessageId?: string) => {
    const text = overrideText || inputVal.trim();
    if (!text && attachments.length === 0) return;

    setIsSending(true);

    let uploadedAttachments = attachments;
    if (attachments.length > 0 && !editMessageId) {
      try {
        uploadedAttachments = await uploadPendingAttachments();
      } catch (uploadErr) {
        setIsSending(false);
        return;
      }
    }

    // Optimistic user message append / edit replacement
    let userMsgId = `msg_${Date.now()}`;
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

    setMessages(updatedMessages);
    if (!editMessageId) {
      setInputVal('');
      clearAttachments();
    }
    isAtBottomRef.current = true;
    scrollToBottom(true);

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

    const controller = new AbortController();
    abortControllerRef.current = controller;
    isCancelledRef.current = false;

    try {
      // Setup payload for SSE stream
      const currentSessionId = sessionId || `session_tool_${toolId}_${Date.now()}`;
      setSessionId(currentSessionId);

      const history = finalMessages
        .filter((m) => m.id !== aiMsgId)
        .map((m) => ({ role: m.role, content: m.content }));

      const payload: Record<string, any> = {
        content: text,
        sessionId: currentSessionId,
        activeTool: toolId,
        stream: true,
        history,
      };

      if (uploadedAttachments.length > 0 && !editMessageId) {
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
          prev.map((m) => (m.id === aiMsgId ? { ...m, isProcessing: false } : m))
        );
        setIsSending(false);
        return;
      }

      setMessages((prev) =>
        prev.map((m) => (m.id === aiMsgId ? { ...m, isProcessing: false } : m))
      );

      // Sync final response from database (gives us suggestions, citations)
      setTimeout(async () => {
        try {
          if (isCancelledRef.current || controller.signal.aborted) {
            return;
          }
          const detailsRes = await ChatService.getSessionDetails(currentSessionId);
          if (isCancelledRef.current || controller.signal.aborted) {
            return;
          }
          const detailSession = (detailsRes as any).data || detailsRes;
          if (detailSession?.messages) {
            setMessages(detailSession.messages);
          }
        } catch (e) {
          console.warn('[ToolChatContainer] Post-stream metadata sync failed:', e);
        }
      }, 1000);

    } catch (err: any) {
      if (isCancelledRef.current || controller.signal.aborted) {
        setMessages((prev) =>
          prev.map((m) => (m.id === aiMsgId ? { ...m, isProcessing: false } : m))
        );
      } else {
        console.error(`[ToolChatContainer - ${toolId}] Error:`, err);
        showToast('error', 'Service Error', 'Failed to synchronize with legal AI engine.');

        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiMsgId
              ? {
                  ...m,
                  content: '⚠️ Unable to complete your request. Please check your network and try again.',
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

  const handleVoiceInputPress = () => {
    startRecording(selectedLanguage);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* AppBar navigation */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.headerBtn, pressed && styles.pressed]}
        >
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </Pressable>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>{title}</Text>
          <Text style={styles.headerSubtitle}>Legal Workspace Module</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Pressable
            onPress={toggleFocusMode}
            style={({ pressed }) => [styles.headerBtn, pressed && styles.pressed]}
            accessibilityLabel={isFocusMode ? "Exit Focus Mode" : "Enter Focus Mode"}
            accessibilityRole="button"
          >
            <Ionicons
              name={isFocusMode ? "contract" : "expand"}
              size={22}
              color="#1F2937"
            />
          </Pressable>
          <Pressable
            onPress={() => {
              setMessages([
                {
                  id: 'welcome',
                  role: 'model',
                  content: `Welcome to **${title}**. ${description}\n\nAsk me anything or use the widgets below to start.`,
                  timestamp: Date.now(),
                },
              ]);
              setSessionId(null);
              showToast('info', 'Chat Cleared', 'Active session reset.');
            }}
            style={({ pressed }) => [styles.headerBtn, pressed && styles.pressed]}
          >
            <Ionicons name="trash-outline" size={20} color="#EF4444" />
          </Pressable>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        style={{ flex: 1 }}
      >
        {/* Reusable Chat Area */}
        <View style={styles.chatArea}>
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            onLayout={() => {
              if (!isSending) {
                scrollToBottom(true);
              }
            }}
            ListHeaderComponent={() => null}
          renderItem={({ item }) => (
            <ChatMessageBubble
              message={item}
              onCopy={() => {
                // eslint-disable-next-line @typescript-eslint/no-require-imports
                require('react-native').Clipboard.setString(item.content);
                showToast('success', 'Copied', 'Text copied to clipboard.');
              }}
              onRegenerate={() => handleSend(item.content)}
              onCitationPress={(src) => showToast('info', 'Precedent citation', src.title)}
              onExport={() => showToast('success', 'Export', 'Transcript exported to PDF successfully.')}
              onDownload={() => showToast('success', 'Download', 'Document downloaded successfully.')}
              onEditMessage={(msgId, newText) => handleSend(newText, undefined, msgId)}
            />
          )}
          ListFooterComponent={null}
          contentContainerStyle={styles.listContent}
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

      {/* Suggested prompts list (Only shown initially) */}
      {!isSending && messages.length <= 1 && suggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sugScroll}>
            {suggestions.map((sug, idx) => (
              <Pressable
                key={idx}
                style={styles.suggestionChip}
                onPress={() => handleSend(sug)}
              >
                <Text style={styles.suggestionText}>{sug}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Attachments bar */}
      {attachments.length > 0 && (
        <View style={styles.attachmentBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {attachments.map((a, i) => (
              <View key={i} style={styles.attachChip}>
                <Ionicons name="document-attach" size={14} color="#6D5DFC" />
                <Text style={styles.attachLabel} numberOfLines={1}>{a.name}</Text>
                <Pressable onPress={() => handleRemoveAttachment(a.name)}>
                  <Ionicons name="close-circle" size={16} color="#EF4444" />
                </Pressable>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

        {/* Input Field Composer */}
        <View style={[
          styles.inputContainer,
          isFocusMode && { paddingBottom: insets.bottom > 0 ? insets.bottom : 12 }
        ]}>
          {isRecording || isTranscribing ? (
            <View style={styles.recordingWrapper}>
              {/* Cancel Button */}
              <TouchableOpacity
                onPress={cancelRecording}
                style={styles.voiceControlBtn}
                accessibilityLabel="Cancel recording"
                accessibilityRole="button"
              >
                <Ionicons name="close" size={24} color="#EF4444" />
              </TouchableOpacity>

              {/* Waveform / Status */}
              <View style={styles.waveformContainer}>
                {isTranscribing ? (
                  <View style={styles.transcribingLoader}>
                    <ActivityIndicator size="small" color="#6D5DFC" />
                    <Text style={styles.transcribingText}>Transcribing...</Text>
                  </View>
                ) : (
                  <View style={styles.liveRecordInfo}>
                    <View style={styles.liveRecordHeader}>
                      <Text style={styles.durationText}>{formatTime(duration)}</Text>
                      <Text style={{ fontSize: 13, color: '#9CA3AF', marginLeft: 8 }}>Listening...</Text>
                      <View style={styles.recordingIndicatorDot} />
                    </View>
                    {partialText ? (
                      <Text style={styles.liveTranscriptPreview} numberOfLines={1}>
                        {partialText}
                      </Text>
                    ) : null}
                  </View>
                )}
              </View>

              {/* Language Selector */}
              <TouchableOpacity
                onPress={() => {
                  const nextLang =
                    selectedLanguage === 'en'
                      ? 'hi'
                      : selectedLanguage === 'hi'
                      ? 'hinglish'
                      : 'en';
                  setSelectedLanguage(nextLang);
                  showToast('info', 'Language Changed', `Listening in ${
                    nextLang === 'en' ? 'English' : nextLang === 'hi' ? 'Hindi' : 'Hinglish'
                  }`);
                }}
                style={styles.langSelectorBtn}
                accessibilityLabel="Switch language"
                accessibilityRole="button"
              >
                <Text style={styles.langSelectorText}>
                  {selectedLanguage === 'en' ? 'EN' : selectedLanguage === 'hi' ? 'HI' : 'HING'}
                </Text>
              </TouchableOpacity>

              {/* Stop Button */}
              <TouchableOpacity
                onPress={stopRecording}
                style={styles.voiceStopBtn}
                accessibilityLabel="Stop recording"
                accessibilityRole="button"
              >
                <View style={styles.voiceStopCircle}>
                  <View style={styles.voiceStopSquare} />
                </View>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Pressable
                onPress={handleAddAttachment}
                style={({ pressed }) => [styles.inputOptionBtn, pressed && styles.pressed]}
              >
                <Ionicons name="add-circle-outline" size={24} color="#6B7280" />
              </Pressable>

              <Pressable
                onPress={() => setIsQuickActionsOpen(true)}
                style={({ pressed }) => [styles.inputOptionBtn, pressed && styles.pressed]}
                accessibilityLabel="Open Quick Actions"
                accessibilityRole="button"
              >
                <Ionicons name="sparkles-outline" size={22} color="#6D5DFC" />
              </Pressable>

              <TextInput
                style={styles.input}
                placeholder={isSending ? 'AI is executing analysis...' : placeholder}
                placeholderTextColor="#9CA3AF"
                value={inputVal}
                onChangeText={setInputVal}
                editable={!isSending}
                multiline={true}
                onSubmitEditing={() => handleSend()}
              />

              <Pressable
                onPress={handleVoiceInputPress}
                style={({ pressed }) => [
                  styles.inputOptionBtn,
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons
                  name="mic-outline"
                  size={22}
                  color="#6B7280"
                />
              </Pressable>

              {isSending ? (
                <View style={styles.sendIcon}>
                  <ActivityIndicator size="small" color="#6D5DFC" />
                </View>
              ) : (
                <Pressable
                  onPress={() => handleSend()}
                  style={({ pressed }) => [
                    styles.sendIcon,
                    pressed && styles.pressed,
                    !inputVal.trim() && attachments.length === 0 && styles.sendIconDisabled,
                  ]}
                  disabled={!inputVal.trim() && attachments.length === 0}
                >
                  <Ionicons name="send" size={18} color="#6D5DFC" />
                </Pressable>
              )}
            </>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* Quick Actions Bottom Sheet */}
      <Modal
        visible={isQuickActionsOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsQuickActionsOpen(false)}
      >
        <TouchableWithoutFeedback onPress={() => setIsQuickActionsOpen(false)}>
          <View style={styles.bottomSheetOverlay}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={[styles.bottomSheetContainer, Shadows.modal]}>
                <View style={styles.bottomSheetDragHandle} />
                <View style={styles.bottomSheetHeader}>
                  <Text style={styles.bottomSheetTitle}>{title} Actions</Text>
                  <TouchableOpacity onPress={() => setIsQuickActionsOpen(false)} style={styles.bottomSheetClose}>
                    <Ionicons name="close-circle" size={24} color="#6B7280" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.bottomSheetContent} showsVerticalScrollIndicator={false}>
                  <View style={styles.toolListContainer}>
                    {(QUICK_ACTIONS_DATA[toolId] || []).map((action) => (
                      <TouchableOpacity
                        key={action}
                        style={styles.toolListItem}
                        onPress={() => {
                          const prefilledText = QUICK_ACTION_PROMPTS[action] || `${action}: `;
                          setInputVal(prefilledText);
                          setIsQuickActionsOpen(false);
                        }}
                      >
                        <View style={styles.toolListIconContainer}>
                          <Text style={styles.toolListIcon}>⚡</Text>
                        </View>
                        <View style={styles.toolListItemContent}>
                          <Text style={styles.toolListItemTitle}>{action}</Text>
                          <Text style={styles.toolListItemDesc}>Pre-fill prompt template for {action}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                      </TouchableOpacity>
                    ))}
                  </View>
                  <View style={{ height: 30 }} />
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#ECECEC',
  },
  headerBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  headerTitleContainer: {
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1F2937',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 1,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chatArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  listContent: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    paddingBottom: 24,
  },
  customWidgetWrapper: {
    marginBottom: 8,
  },
  scrollDownBtn: {
    position: 'absolute',
    bottom: 96,
    left: '50%',
    marginLeft: -21,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 4,
  },
  suggestionsContainer: {
    backgroundColor: '#F9FAFB',
    borderTopWidth: 1,
    borderTopColor: '#ECECEC',
    paddingVertical: 10,
  },
  sugScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  suggestionChip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#ECECEC',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  suggestionText: {
    fontSize: 12.5,
    color: '#4B5563',
    fontWeight: '600',
  },
  attachmentBar: {
    borderTopWidth: 1,
    borderTopColor: '#ECECEC',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F9FAFB',
  },
  attachChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEECFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    marginRight: 8,
    gap: 6,
  },
  attachLabel: {
    fontSize: 11,
    color: '#5B4EDB',
    fontWeight: '600',
    maxWidth: 150,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#ECECEC',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    gap: 8,
  },
  inputOptionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  micBtnActive: {
    backgroundColor: '#EF4444',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ECECEC',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14,
    color: '#1F2937',
    backgroundColor: '#F9FAFB',
    maxHeight: 100,
  },
  sendIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendIconDisabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.7,
  },
  bottomSheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'flex-end',
  },
  bottomSheetContainer: {
    width: '100%',
    height: height * 0.75,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  bottomSheetDragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ECECEC',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 10,
  },
  bottomSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ECECEC',
    marginBottom: 16,
  },
  bottomSheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F2937',
  },
  bottomSheetClose: {
    padding: 4,
  },
  bottomSheetContent: {
    flex: 1,
  },
  toolListContainer: {
    gap: 10,
  },
  toolListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ECECEC',
    backgroundColor: '#F9FAFB',
  },
  toolListItemActive: {
    borderColor: '#6D5DFC',
    backgroundColor: '#EEECFF',
  },
  toolListIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ECECEC',
  },
  toolListIcon: {
    fontSize: 20,
  },
  toolListItemContent: {
    flex: 1,
    marginLeft: 12,
  },
  toolListItemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
  },
  toolListItemDesc: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  recordingWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
  },
  voiceControlBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  waveformContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  transcribingLoader: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  transcribingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6D5DFC',
  },
  liveRecordInfo: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  liveRecordHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  liveTranscriptPreview: {
    fontSize: 11,
    color: '#6B7280',
    fontStyle: 'italic',
    marginTop: 2,
    maxWidth: '90%',
    textAlign: 'center',
  },
  durationText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B7280',
    minWidth: 42,
  },
  recordingIndicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    marginLeft: 6,
  },
  langSelectorBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#EEECFF',
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 44,
  },
  langSelectorText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#6D5DFC',
  },
  voiceStopBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceStopCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceStopSquare: {
    width: 10,
    height: 10,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
  },
});
