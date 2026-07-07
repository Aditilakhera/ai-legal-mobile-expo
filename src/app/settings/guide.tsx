import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Modal,
  ActivityIndicator,
  Animated,
  Keyboard,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
// @ts-ignore
// eslint-disable-next-line import/no-unresolved
import { Ionicons } from '@expo/vector-icons';
import { useToastContext, useThemeContext } from '@/providers';
import { useAuthGuard } from '@/navigation/guards';
import { GuideService, GuideResponse } from '@/services/guide.service';
import { useSpeechRecognition, SpeechLanguage } from '@/hooks/use-speech-recognition';
import { useUserStore } from '@/store/user';


const { width, height } = Dimensions.get('window');

interface Message {
  id: string;
  sender: 'user' | 'guide';
  text: string;
  timestamp: Date;
  suggestions?: string[];
}

const CONTEXTS = [
  'General',
  'Dashboard',
  'My Cases',
  'Case Workspace',
  'Evidence Vault',
  'Draft Maker',
  'Contract Analyzer',
  'Legal Research',
  'Timeline',
  'Hearings',
  'OCR Scanner',
  'Settings',
];

const QUICK_ACTIONS = [
  'Create New Case',
  'Upload Evidence',
  'Generate Draft',
  'Analyze Contract',
  'Research Case Law',
  'View Timeline',
  'Manage Hearings',
  'Open Settings',
];

const STATIC_HEIGHTS = [8, 14, 18, 12, 6, 16, 22, 28, 20, 10, 14, 24, 18, 8, 12, 22, 16, 10, 14, 8];

function VoiceWaveform({
  isRecording,
  isPlaying,
  playbackPosition = 0,
  duration = 0,
  theme,
}: {
  isRecording: boolean;
  isPlaying: boolean;
  playbackPosition?: number;
  duration?: number;
  theme: any;
}) {
  const [time, setTime] = useState(0);

  useEffect(() => {
    if (!isRecording && !isPlaying) return;
    const interval = setInterval(() => {
      setTime((t) => t + 1);
    }, 100);
    return () => clearInterval(interval);
  }, [isRecording, isPlaying]);

  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 3,
      height: 32,
      flex: 1,
      marginHorizontal: 12
    }}>
      {Array.from({ length: 20 }).map((_, i) => {
        let barHeight = 8;
        if (isRecording) {
          barHeight = Math.abs(Math.sin((time + i) * 0.4)) * 20 + 4;
        } else if (isPlaying) {
          barHeight = STATIC_HEIGHTS[i] + Math.abs(Math.sin((time + i) * 0.3)) * 6 - 3;
          barHeight = Math.max(4, Math.min(30, barHeight));
        } else {
          barHeight = STATIC_HEIGHTS[i];
        }

        const progress = duration > 0 ? playbackPosition / duration : 0;
        const barProgress = i / 20;
        const barColor = !isRecording && barProgress <= progress ? theme.primary : '#D1D5DB';

        return (
          <View
            key={i}
            style={{
              width: 3,
              borderRadius: 1.5,
              height: barHeight,
              backgroundColor: barColor,
            }}
          />
        );
      })}
    </View>
  );
}

export default function GuideScreen() {
  useAuthGuard();
  const router = useRouter();
  const { showToast } = useToastContext();
  const { theme, isDark } = useThemeContext();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);

  // States
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [currentContext, setCurrentContext] = useState('General');
  const [isContextModalOpen, setIsContextModalOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [lastIntentId, setLastIntentId] = useState<string | null>(null);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSubscription = Keyboard.addListener(showEvent, () => {
      setIsKeyboardVisible(true);
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setIsKeyboardVisible(false);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  // User profile language detection
  const profile = useUserStore((s) => s.profile);
  const appLanguage = profile?.personalizations?.general?.language || 'English';

  const getSpeechLanguage = (): SpeechLanguage => {
    if (appLanguage === 'Hindi') return 'hi';
    if (appLanguage === 'Bilingual') return 'hinglish';
    return 'en';
  };

  // Voice States
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const preRecordTextRef = useRef('');
  const pulseAnim = useRef(new Animated.Value(1)).current;

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
      setInputText(transcribedText);
    }
    setIsVoiceActive(false);
  });

  // Sync real-time transcription to input text
  useEffect(() => {
    if (isRecording) {
      if (partialText) {
        setInputText(partialText);
      }
    }
  }, [partialText, isRecording]);

  // Pulse animation for recording microphone
  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.25,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1.0,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording]);

  const handleMicPress = () => {
    if (isRecording) {
      handleInlineStop();
    } else {
      preRecordTextRef.current = inputText;
      const speechLang = getSpeechLanguage();
      setIsVoiceActive(true);
      startRecording(speechLang);
    }
  };

  const handleInlineCancel = () => {
    cancelRecording();
    setIsVoiceActive(false);
    setInputText(preRecordTextRef.current);
  };

  const handleInlineStop = async () => {
    if (isRecording) {
      await stopRecording();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Initialize with welcome message
  useEffect(() => {
    setMessages([
      {
        id: 'welcome',
        sender: 'guide',
        text: `👋 Welcome to AI LEGAL Guide!

I'm your personal AI LEGAL assistant.

I can help you learn every feature of the application.

Ask me anything related to AI LEGAL.`,
        timestamp: new Date(),
        suggestions: [
          'How do I create a case?',
          'How do I upload evidence?',
          'Where is Draft Maker?',
          'How do reminders work?',
        ],
      },
    ]);
  }, []);

  const styles = React.useMemo(() => getStyles(theme, isDark), [theme, isDark]);

  // Scroll to bottom helper
  const scrollToBottom = () => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: textToSend,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);
    scrollToBottom();

    try {
      const guideRes = await GuideService.getResponse(textToSend, currentContext, lastIntentId);
      
      if (guideRes.intentId) {
        setLastIntentId(guideRes.intentId);
      } else {
        setLastIntentId(null);
      }

      const newGuideMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'guide',
        text: guideRes.reply,
        timestamp: new Date(),
        suggestions: guideRes.suggestions,
      };

      setMessages((prev) => [...prev, newGuideMessage]);
    } catch (error) {
      console.error(error);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'guide',
        text: "Sorry, I had trouble retrieving information. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
      scrollToBottom();
    }
  };

  // Renders the guide's reply as a parsed step flow or general callout
  const renderMessageContent = (msg: Message) => {
    const isGuide = msg.sender === 'guide';
    
    if (!isGuide) {
      return (
        <View style={[styles.userBubble, { backgroundColor: theme.primary }]}>
          <Text style={styles.userText}>{msg.text}</Text>
        </View>
      );
    }

    // Parse step-by-step divider (↓)
    const isStepFlow = msg.text.includes('↓');
    if (isStepFlow) {
      const steps = msg.text.split(/↓\n|↓/);
      
      return (
        <View style={styles.stepFlowContainer}>
          {/* Header intro line if present */}
          {steps[0] && !steps[0].toLowerCase().includes('step') && !steps[0].toLowerCase().includes('open') && (
            <Text style={[styles.guideText, { color: theme.textPrimary, marginBottom: 12, fontWeight: '700' }]}>
              {steps[0].trim()}
            </Text>
          )}

          {steps.map((step, idx) => {
            const trimmed = step.trim();
            // Skip the first element if it was just an intro header
            if (idx === 0 && !trimmed.toLowerCase().includes('step') && !trimmed.toLowerCase().includes('open') && !trimmed.toLowerCase().includes('check')) {
              return null;
            }

            const isChecklist = trimmed.toLowerCase().includes('check ');
            const isStepHeader = trimmed.toLowerCase().includes('step ');
            
            // Format check/step titles
            let title = '';
            let body = trimmed;
            
            if (isStepHeader || isChecklist) {
              const lines = trimmed.split('\n');
              title = lines[0];
              body = lines.slice(1).join('\n');
            }

            return (
              <View key={idx} style={styles.stepOuterRow}>
                {/* Visual line/bullet indicator */}
                <View style={styles.indicatorCol}>
                  <View style={[styles.stepBullet, { backgroundColor: theme.primary }]}>
                    <Text style={styles.bulletNumberText}>{idx + (steps[0].includes('Step') ? 1 : 0)}</Text>
                  </View>
                  {idx < steps.length - 1 && <View style={[styles.stepVerticalLine, { backgroundColor: theme.border }]} />}
                </View>

                {/* Content Box */}
                <View style={[styles.stepCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  {title ? (
                    <Text style={[styles.stepTitleText, { color: theme.primary }]}>{title}</Text>
                  ) : null}
                  <Text style={[styles.stepBodyText, { color: theme.textSecondary }]}>{body || trimmed}</Text>
                </View>
              </View>
            );
          })}
        </View>
      );
    }

    // Intercepted warnings or legal limitations
    const isIntercept = msg.text.includes('[GUIDE_LIMITATION]');
    
    return (
      <View style={[
        styles.guideCard, 
        { backgroundColor: theme.surfaceVariant, borderColor: theme.border },
        isIntercept && { borderLeftColor: '#F59E0B', borderLeftWidth: 4 }
      ]}>
        {isIntercept && (
          <View style={styles.interceptTitleRow}>
            <Ionicons name="warning-outline" size={16} color="#D97706" style={{ marginRight: 6 }} />
            <Text style={styles.interceptTitleText}>Guide Limitation</Text>
          </View>
        )}
        <Text style={[styles.guideText, { color: theme.textPrimary }]}>
          {msg.text.replace('[GUIDE_LIMITATION]', '').trim()}
        </Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* HEADER */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.primary} />
        </Pressable>
        <View style={styles.headerTitleContainer}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="sparkles" size={18} color="#8A5CF5" />
            <Text style={[styles.headerTitle, { color: theme.textPrimary, marginHorizontal: 0 }]}>AI Product Guide</Text>
          </View>
          <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>Interactive Application Coach</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.select({ ios: 90, android: 0 })}
      >
        {/* MESSAGE LIST */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={scrollToBottom}
          onLayout={scrollToBottom}
          renderItem={({ item }) => (
            <View style={[styles.messageRow, item.sender === 'user' ? styles.userRow : styles.guideRow]}>
              {/* Profile Icon for Guide */}
              {item.sender === 'guide' && (
                <View style={[styles.guideAvatar, { backgroundColor: theme.primaryLight }]}>
                  <Ionicons name="construct" size={14} color={theme.primary} />
                </View>
              )}
              
              <View style={styles.messageContentWrapper}>
                {renderMessageContent(item)}

                {/* Suggestions Pills */}
                {item.suggestions && item.suggestions.length > 0 && (
                  <View style={styles.suggestionsList}>
                    {item.suggestions.map((sug: string, sIdx: number) => {
                      const isLongText = sug.length > 28;
                      return (
                        <Pressable
                          key={sIdx}
                          style={[
                            styles.suggestionPill,
                            { backgroundColor: theme.surfaceVariant, borderColor: theme.border },
                            isLongText && { width: '100%' }
                          ]}
                          onPress={() => handleSend(sug)}
                          accessibilityLabel={`Suggested question: ${sug}`}
                          accessibilityRole="button"
                        >
                          <Text
                            style={[styles.suggestionText, { color: theme.primary }]}
                            numberOfLines={2}
                            ellipsizeMode="tail"
                          >
                            {sug}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </View>
            </View>
          )}
          ListFooterComponent={() =>
            isTyping ? (
              <View style={[styles.messageRow, styles.guideRow]}>
                <View style={[styles.guideAvatar, { backgroundColor: theme.primaryLight }]}>
                  <Ionicons name="construct" size={14} color={theme.primary} />
                </View>
                <View style={[styles.typingBubble, { backgroundColor: theme.surfaceVariant }]}>
                  <ActivityIndicator size="small" color={theme.primary} />
                </View>
              </View>
            ) : null
          }
        />


        {/* QUICK ACTIONS BAR */}
        <View style={[styles.quickActionsContainer, { borderTopColor: theme.border }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickActionsScroll}>
            {QUICK_ACTIONS.map((action: string, idx: number) => (
              <Pressable
                key={idx}
                style={[styles.quickActionPill, { backgroundColor: theme.surfaceVariant }]}
                onPress={() => handleSend(`How do I ${action.toLowerCase()}?`)}
              >
                <Ionicons name="rocket-outline" size={12} color={theme.primary} style={{ marginRight: 4 }} />
                <Text style={[styles.quickActionText, { color: theme.textSecondary }]}>{action}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* VOICE STATUS BAR */}
        {isVoiceActive && (
          <View style={[styles.voiceStatusBar, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}>
            {isTranscribing ? (
              <View style={styles.statusBarContent}>
                <ActivityIndicator size="small" color={theme.primary} style={{ marginRight: 8 }} />
                <Text style={[styles.transcribingText, { color: theme.textSecondary }]}>⌛ Converting speech...</Text>
              </View>
            ) : (
              <View style={styles.statusBarContent}>
                <Text style={[styles.statusText, { color: '#EF4444' }]}>🔴 Listening...</Text>
                <Text style={[styles.durationText, { color: theme.textSecondary }]}>{formatTime(duration)}</Text>
                <View style={styles.waveformContainer}>
                  <VoiceWaveform isRecording={isRecording} isPlaying={false} duration={duration} theme={theme} />
                </View>
                <Pressable
                  onPress={handleInlineCancel}
                  style={styles.statusBtn}
                  accessibilityLabel="Cancel recording"
                  accessibilityRole="button"
                >
                  <Ionicons name="close" size={18} color={theme.textSecondary} />
                </Pressable>
                {isRecording && (
                  <Pressable
                    onPress={handleInlineStop}
                    style={styles.statusBtn}
                    accessibilityLabel="Stop recording"
                    accessibilityRole="button"
                  >
                    <Ionicons name="square" size={12} color="#EF4444" style={{ marginHorizontal: 2 }} />
                  </Pressable>
                )}
              </View>
            )}
          </View>
        )}

        {/* INPUT COMPOSER */}
        <View style={[
          styles.composer,
          {
            borderTopColor: theme.border,
            backgroundColor: theme.background,
            paddingBottom: isKeyboardVisible ? 6 : 8
          }
        ]}>
          <View style={[styles.inputWrapper, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}>
            <TextInput
              style={[styles.composerInput, { color: theme.textPrimary }]}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Ask AI LEGAL Guide..."
              placeholderTextColor={theme.placeholder}
              onSubmitEditing={() => handleSend(inputText)}
              editable={!isTranscribing && !isRecording}
              accessibilityLabel="Ask AI LEGAL Guide input box"
            />
            {/* Permanently visible microphone icon */}
            <Animated.View style={{ transform: [{ scale: pulseAnim }], justifyContent: 'center', alignItems: 'center' }}>
              <Pressable
                onPress={handleMicPress}
                disabled={isTranscribing}
                style={styles.innerMicBtn}
                accessibilityLabel="Microphone input"
                accessibilityRole="button"
              >
                <Ionicons
                  name={isRecording ? "mic" : "mic-outline"}
                  size={20}
                  color={isRecording ? "#EF4444" : theme.textSecondary}
                />
              </Pressable>
            </Animated.View>
          </View>
          <Pressable
            style={[
              styles.sendBtn,
              { backgroundColor: theme.primary },
              (!inputText.trim() || isRecording || isTranscribing) && { opacity: 0.6 }
            ]}
            onPress={() => handleSend(inputText)}
            disabled={!inputText.trim() || isRecording || isTranscribing}
            accessibilityLabel="Send message"
            accessibilityRole="button"
          >
            <Ionicons name="send" size={16} color="#FFFFFF" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {/* CONTEXT SELECTOR MODAL */}
      <Modal
        visible={isContextModalOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsContextModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.modalDismissBg} onPress={() => setIsContextModalOpen(false)} />
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Choose App Context</Text>
              <Pressable onPress={() => setIsContextModalOpen(false)}>
                <Ionicons name="close" size={22} color={theme.textSecondary} />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              <Text style={[styles.modalInstruction, { color: theme.textSecondary }]}>
                Select the screen you are currently working on. The AI Product Guide will calibrate answers for this workspace location:
              </Text>
              {CONTEXTS.map((ctx) => {
                const isSelected = ctx === currentContext;
                return (
                  <Pressable
                    key={ctx}
                    style={[styles.pickerOptRow, { borderBottomColor: theme.divider }, isSelected && [styles.pickerOptRowSelected, { backgroundColor: theme.primaryLight }]]}
                    onPress={() => {
                      setCurrentContext(ctx);
                      setIsContextModalOpen(false);
                      showToast('info', 'Context Calibrated', `Guide context synchronized to ${ctx}`);
                    }}
                  >
                    <Text style={[styles.pickerOptText, { color: theme.textSecondary }, isSelected && [styles.pickerOptTextSelected, { color: theme.primary }]]}>
                      {ctx}
                    </Text>
                    {isSelected ? <Ionicons name="checkmark" size={18} color={theme.primary} /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
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
      paddingVertical: 12,
      borderBottomWidth: 1,
    },
    backBtn: {
      padding: 6,
    },
    headerTitleContainer: {
      flex: 1,
      marginLeft: 10,
    },
    headerMainRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 16,
      fontWeight: '800',
    },
    headerSubtitle: {
      fontSize: 10,
      marginTop: 2,
      fontWeight: '600',
    },
    contextPill: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 12,
    },
    contextPillText: {
      fontSize: 11,
      fontWeight: '700',
    },
    listContent: {
      padding: 16,
      paddingBottom: 24,
    },
    messageRow: {
      flexDirection: 'row',
      marginVertical: 8,
      alignItems: 'flex-start',
    },
    userRow: {
      justifyContent: 'flex-end',
    },
    guideRow: {
      justifyContent: 'flex-start',
    },
    guideAvatar: {
      width: 28,
      height: 28,
      borderRadius: 14,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 8,
      marginTop: 4,
    },
    messageContentWrapper: {
      flex: 1,
      maxWidth: width * 0.8,
    },
    userBubble: {
      padding: 12,
      borderRadius: 16,
      borderTopRightRadius: 2,
      alignSelf: 'flex-end',
    },
    userText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '600',
      lineHeight: 18,
    },
    guideCard: {
      padding: 14,
      borderRadius: 16,
      borderTopLeftRadius: 2,
      borderWidth: 1,
      alignSelf: 'flex-start',
      width: '100%',
    },
    guideText: {
      fontSize: 13,
      lineHeight: 19,
      fontWeight: '500',
    },
    typingBubble: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 16,
      borderTopLeftRadius: 2,
      alignSelf: 'flex-start',
    },
    interceptTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 6,
    },
    interceptTitleText: {
      fontSize: 11,
      fontWeight: '800',
      color: '#D97706',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    stepFlowContainer: {
      width: '100%',
    },
    stepOuterRow: {
      flexDirection: 'row',
      marginBottom: 8,
    },
    indicatorCol: {
      alignItems: 'center',
      width: 24,
      marginRight: 10,
    },
    stepBullet: {
      width: 22,
      height: 22,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
    },
    bulletNumberText: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '800',
    },
    stepVerticalLine: {
      width: 2,
      flex: 1,
      marginTop: 4,
    },
    stepCard: {
      flex: 1,
      borderWidth: 1,
      borderRadius: 10,
      padding: 10,
    },
    stepTitleText: {
      fontSize: 11.5,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 4,
    },
    stepBodyText: {
      fontSize: 12.5,
      lineHeight: 16.5,
      fontWeight: '600',
    },
    suggestionsList: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      gap: 8,
      marginTop: 10,
      width: '100%',
    },
    suggestionPill: {
      width: '48%',
      height: 38,
      borderWidth: 1,
      paddingHorizontal: 6,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    suggestionText: {
      fontSize: 10,
      fontWeight: '700',
      textAlign: 'center',
      lineHeight: 12,
    },
    quickActionsContainer: {
      borderTopWidth: 1,
      paddingVertical: 10,
    },
    quickActionsScroll: {
      paddingHorizontal: 16,
      gap: 8,
    },
    quickActionPill: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
    },
    quickActionText: {
      fontSize: 11.5,
      fontWeight: '700',
    },
    composer: {
      borderTopWidth: 1,
      paddingHorizontal: 16,
      paddingVertical: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    voiceStatusBar: {
      borderTopWidth: 1,
      paddingHorizontal: 16,
      paddingVertical: 8,
      minHeight: 44,
      justifyContent: 'center',
    },
    statusBarContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    statusText: {
      fontSize: 12,
      fontWeight: '700',
    },
    durationText: {
      fontSize: 12,
      fontWeight: '800',
      marginLeft: 8,
    },
    waveformContainer: {
      flex: 1,
      height: 28,
      justifyContent: 'center',
      alignItems: 'center',
    },
    statusBtn: {
      padding: 6,
    },
    inputWrapper: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      height: 40,
      borderRadius: 20,
      borderWidth: 1,
      paddingLeft: 12,
      paddingRight: 4,
    },
    composerInput: {
      flex: 1,
      height: '100%',
      fontSize: 13.5,
      fontWeight: '600',
      padding: 0,
    },
    innerMicBtn: {
      width: 32,
      height: 32,
      justifyContent: 'center',
      alignItems: 'center',
    },
    transcribingText: {
      fontSize: 12.5,
      fontWeight: '600',
      fontStyle: 'italic',
    },
    sendBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
      justifyContent: 'flex-end',
    },
    modalDismissBg: {
      ...StyleSheet.absoluteFillObject,
    },
    modalContent: {
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingTop: 16,
      paddingHorizontal: 20,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingBottom: 10,
      borderBottomWidth: 1,
    },
    modalTitle: {
      fontSize: 16,
      fontWeight: '800',
    },
    modalInstruction: {
      fontSize: 12,
      lineHeight: 16,
      marginVertical: 12,
      fontWeight: '500',
    },
    pickerOptRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
      borderBottomWidth: 1,
    },
    pickerOptRowSelected: {
      borderRadius: 8,
      paddingHorizontal: 10,
    },
    pickerOptText: {
      fontSize: 13.5,
      fontWeight: '600',
    },
    pickerOptTextSelected: {
      fontWeight: '800',
    },
  });
}
