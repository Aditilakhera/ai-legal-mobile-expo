import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  Platform,
  LayoutAnimation,
  UIManager,
  Keyboard,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// @ts-ignore
// eslint-disable-next-line import/no-unresolved
import { Ionicons } from '@expo/vector-icons';
import { useThemeContext, useToastContext } from '@/providers';
import { useSpeechRecognition, SpeechLanguage } from '@/hooks/use-speech-recognition';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export interface ChatComposerProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: (text: string) => void | Promise<void>;
  sending: boolean;
  onCancelStream?: () => void;
  onAddAttachment?: () => void;
  onPressSparkles?: () => void;
  placeholder?: string;
  simulatedVoiceText?: string;
  hasAttachmentSupport?: boolean;
  hasSparklesSupport?: boolean;
  isFocusMode?: boolean;
  tabHeight?: number;
  autoFocus?: boolean;
  ref?: React.RefObject<TextInput> | React.Ref<TextInput>;
}

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
    <View style={styles.waveformBarsRow}>
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
            style={[
              styles.waveformBar,
              {
                height: barHeight,
                backgroundColor: barColor,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const ChatComposerComponent: React.FC<ChatComposerProps> = ({
  value,
  onChangeText,
  onSend,
  sending,
  onCancelStream,
  onAddAttachment,
  onPressSparkles,
  placeholder = 'Ask assistant...',
  simulatedVoiceText = 'What are the legal precedents for easement rights in tenant disputes?',
  hasAttachmentSupport = true,
  hasSparklesSupport = true,
  isFocusMode = false,
  tabHeight,
  autoFocus = false,
  ref,
}) => {
  const { theme } = useThemeContext();
  const { showToast } = useToastContext();
  const insets = useSafeAreaInsets();
  const localInputRef = useRef<TextInput>(null);
  const inputRef = (ref as React.RefObject<TextInput>) || localInputRef;

  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [inputHeight, setInputHeight] = useState(36);

  useEffect(() => {
    if (value.trim() === '') {
      setInputHeight(36);
    }
  }, [value]);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSubscription = Keyboard.addListener(showEvent, () => {
      setIsKeyboardVisible(true);
    });
    const showSubscriptionAndroidFallback = Keyboard.addListener('keyboardDidShow', () => {
      setIsKeyboardVisible(true);
    });

    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setIsKeyboardVisible(false);
    });

    return () => {
      showSubscription.remove();
      showSubscriptionAndroidFallback.remove();
      hideSubscription.remove();
    };
  }, []);

  const getBottomPadding = () => {
    if (isKeyboardVisible) return 8;
    if (tabHeight && tabHeight > 0) return 18;
    return Math.max(insets.bottom > 0 ? insets.bottom + 6 : 18, 18);
  };

  // Local Voice Recording States
  const [selectedLanguage, setSelectedLanguage] = useState<SpeechLanguage>('en');
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const savedTranscriptRef = useRef('');
  const shouldSendRef = useRef(false);

  const {
    isRecording,
    isTranscribing,
    partialText,
    duration,
    startRecording,
    stopRecording,
    cancelRecording,
  } = useSpeechRecognition((transcribedText) => {
    // LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (transcribedText) {
      const fullText = savedTranscriptRef.current
        ? savedTranscriptRef.current + ' ' + transcribedText
        : transcribedText;
      const cleanText = fullText.trim();
      setVoiceTranscript(cleanText);
      savedTranscriptRef.current = cleanText;

      // Update text input field
      onChangeText(cleanText);

      // Auto-send if Send was tapped
      if (shouldSendRef.current) {
        onSend(cleanText);
        shouldSendRef.current = false;
      }
    }
    setIsVoiceActive(false);
  });

  // Sync real-time transcription to voiceTranscript in background
  useEffect(() => {
    if (isRecording && isVoiceActive) {
      const currentText = savedTranscriptRef.current
        ? savedTranscriptRef.current + ' ' + partialText
        : partialText;
      setVoiceTranscript(currentText);
    }
  }, [partialText, isRecording, isVoiceActive]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleInputChange = (text: string) => {
    const wasEmpty = value.trim() === '';
    const isEmptyNow = text.trim() === '';
    if (wasEmpty !== isEmptyNow) {
      // LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    onChangeText(text);
  };

  // Inline Voice Input handlers
  const handleVoiceInputPress = () => {
    // LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    shouldSendRef.current = false;
    savedTranscriptRef.current = '';
    setVoiceTranscript('');
    setIsVoiceActive(true);
    startRecording(selectedLanguage);
  };

  const handleInlineCancel = () => {
    // LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    cancelRecording();
    setIsVoiceActive(false);
    setVoiceTranscript('');
    savedTranscriptRef.current = '';
    shouldSendRef.current = false;
  };

  const handleInlineStop = async () => {
    if (isRecording) {
      await stopRecording();
    }
  };

  const handleInlineSend = async () => {
    shouldSendRef.current = true;
    if (isRecording) {
      await stopRecording();
    } else {
      // If already stopped but transcribing or text exists in voiceTranscript
      const text = voiceTranscript.trim();
      if (text) {
        onSend(text);
        shouldSendRef.current = false;
        // LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setIsVoiceActive(false);
      }
    }
  };

  const handleSendClick = () => {
    if (!value.trim()) return;
    onSend(value.trim());
  };

  return (
    <View style={[styles.outerContainer, { paddingBottom: getBottomPadding(), backgroundColor: theme.background, borderTopColor: theme.border }]}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', width: '100%' }}>
        {isVoiceActive ? (
          <View style={[styles.recordingComposerWrapper, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}>
            {/* Left: Discard Cancel Button (X icon) */}
            <TouchableOpacity
              onPress={handleInlineCancel}
              style={styles.pillIconBtn}
              accessibilityLabel="Discard recording"
              accessibilityRole="button"
            >
              <Ionicons name="close" size={22} color={theme.textSecondary || '#6B7280'} />
            </TouchableOpacity>

            {/* Center: Waveform & Duration Timer */}
            <View style={styles.pillWaveformContainer}>
              <Text style={[styles.pillDurationText, { color: theme.textSecondary || '#6B7280' }]}>
                {formatTime(duration)}
              </Text>
              {isTranscribing ? (
                <ActivityIndicator size="small" color={theme.primary || '#6D5DFC'} />
              ) : (
                <View style={styles.pillWaveformWrapper}>
                  <VoiceWaveform isRecording={isRecording} isPlaying={false} duration={duration} theme={theme} />
                </View>
              )}
            </View>

            {/* Right: Stop Button [■] */}
            {isRecording ? (
              <TouchableOpacity
                onPress={handleInlineStop}
                style={styles.inlineStopBtn}
                accessibilityLabel="Stop recording"
                accessibilityRole="button"
              >
                <View style={styles.inlineStopSquare} />
              </TouchableOpacity>
            ) : null}

            {/* Right: Send Transcript [↑] */}
            <TouchableOpacity
              onPress={handleInlineSend}
              disabled={isTranscribing}
              style={[
                styles.inlineSendCircle,
                {
                  backgroundColor: theme.primary || '#6D5DFC',
                  opacity: isTranscribing ? 0.5 : 1
                }
              ]}
              accessibilityLabel="Send message"
              accessibilityRole="button"
            >
              <Ionicons name="arrow-up" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.composerWrapper, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}>
            <View style={styles.leftIconsContainer}>
              {hasAttachmentSupport && onAddAttachment && (
                <Pressable
                  onPress={onAddAttachment}
                  style={({ pressed }) => [styles.innerOptionBtn, pressed && styles.pressed]}
                  accessibilityLabel="Add attachment"
                  accessibilityRole="button"
                >
                  <Ionicons name="add-outline" size={24} color={theme.textSecondary} />
                </Pressable>
              )}

              {hasSparklesSupport && onPressSparkles && (
                <Pressable
                  onPress={onPressSparkles}
                  style={({ pressed }) => [styles.innerOptionBtn, pressed && styles.pressed]}
                  accessibilityLabel="AI Tools"
                  accessibilityRole="button"
                >
                  <Ionicons name="sparkles-outline" size={20} color={theme.primary} />
                </Pressable>
              )}
            </View>

            <TextInput
              ref={inputRef}
              style={[
                styles.composerInput, 
                { 
                  color: theme.textPrimary,
                  height: inputHeight,
                  paddingTop: Platform.OS === 'ios' ? 8 : 4,
                  paddingBottom: Platform.OS === 'ios' ? 8 : 4,
                  textAlignVertical: 'center',
                }
              ]}
              placeholder={sending ? 'Generating response...' : placeholder}
              placeholderTextColor={theme.textMuted || '#9CA3AF'}
              value={value}
              onChangeText={handleInputChange}
              editable={!sending}
              multiline={true}
              onContentSizeChange={(e) => {
                const contentHeight = e.nativeEvent.contentSize.height;
                // Limit height between 36dp (approx 1 line) and 96dp (approx 4 lines)
                const newHeight = Math.min(96, Math.max(36, contentHeight));
                setInputHeight(newHeight);
              }}
              onSubmitEditing={handleSendClick}
              accessibilityLabel="Message input field"
            />

            {/* Dynamic Actions side-by-side or stream cancellation control */}
            {sending ? (
              <Pressable
                onPress={onCancelStream}
                disabled={!onCancelStream}
                style={({ pressed }) => [
                  styles.innerActionBtnTouchTarget,
                  pressed && styles.pressed,
                ]}
                accessibilityLabel="Stop response generation"
                accessibilityRole="button"
              >
                <View style={[styles.innerStopCircle, { backgroundColor: theme.textPrimary }]}>
                  <View style={styles.stopSquare} />
                </View>
              </Pressable>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Pressable
                  onPress={handleVoiceInputPress}
                  style={({ pressed }) => [
                    styles.innerActionBtnTouchTarget,
                    pressed && styles.pressed,
                    value.trim() !== '' && { opacity: 0.4 }
                  ]}
                  accessibilityLabel="Voice input"
                  accessibilityRole="button"
                >
                  <Ionicons
                    name="mic-outline"
                    size={22}
                    color={theme.textSecondary}
                  />
                </Pressable>

                <Pressable
                  onPress={handleSendClick}
                  disabled={value.trim() === ''}
                  style={({ pressed }) => [
                    styles.innerActionBtnTouchTarget,
                    pressed && styles.pressed,
                  ]}
                  accessibilityLabel="Send message"
                  accessibilityRole="button"
                >
                  <View style={[
                    styles.innerSendCircle,
                    { backgroundColor: theme.primary },
                    value.trim() === '' && { backgroundColor: theme.border, opacity: 0.5 }
                  ]}>
                    <Ionicons 
                      name="arrow-up" 
                      size={18} 
                      color={value.trim() === '' ? (theme.textMuted || '#9CA3AF') : "#FFFFFF"} 
                    />
                  </View>
                </Pressable>
              </View>
            )}
          </View>
        )}
      </View>

    </View>
  );
};

const MemoizedChatComposer = React.memo(ChatComposerComponent, (prevProps, nextProps) => {
  return (
    prevProps.value === nextProps.value &&
    prevProps.sending === nextProps.sending &&
    prevProps.placeholder === nextProps.placeholder &&
    prevProps.autoFocus === nextProps.autoFocus &&
    prevProps.hasAttachmentSupport === nextProps.hasAttachmentSupport &&
    prevProps.hasSparklesSupport === nextProps.hasSparklesSupport &&
    prevProps.isFocusMode === nextProps.isFocusMode &&
    prevProps.tabHeight === nextProps.tabHeight
  );
});

export const ChatComposer: React.FC<ChatComposerProps> = (props) => {
  return <MemoizedChatComposer {...props} />;
};

const styles = StyleSheet.create({
  outerContainer: {
    borderTopWidth: 1,
    borderTopColor: '#ECECEC',
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: '#FFFFFF',
    flexDirection: 'column',
    alignItems: 'stretch',
    width: '100%',
  },
  composerWrapperFullWidth: {
    flex: 1,
  },
  composerWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 24,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 12,
    paddingVertical: 2,
    minHeight: 48,
    maxHeight: 120,
  },
  recordingComposerWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 24,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    height: 52,
  },
  previewComposerWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 24,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    height: 52,
  },
  leftIconsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 4,
  },
  innerOptionBtn: {
    width: 32,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  composerInput: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  innerActionBtnTouchTarget: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  innerSendCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#6D5DFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerStopCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1F2937',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopSquare: {
    width: 10,
    height: 10,
    borderRadius: 1.5,
    backgroundColor: '#FFFFFF',
  },
  pressed: {
    opacity: 0.7,
  },
  waveformBarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    height: 32,
    flex: 1,
    marginHorizontal: 12,
  },
  waveformBar: {
    width: 3,
    borderRadius: 1.5,
    backgroundColor: '#D1D5DB',
  },
  modalOverlayFull: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.98)',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 50,
    paddingHorizontal: 24,
  },
  modalHeaderFull: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  modalHeaderTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  langSelectorBtnModal: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 54,
  },
  langSelectorTextModal: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  modalOverlayTransparent: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  floatingVoicePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 30,
    height: 56,
    width: '92%',
    maxWidth: 380,
    paddingHorizontal: 12,
    justifyContent: 'space-between',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  pillIconBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pillIconBtnCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pillStopSquare: {
    width: 12,
    height: 12,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
  },
  pillSendCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pillWaveformContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
  },
  pillDurationText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
    marginRight: 8,
  },
  pillWaveformWrapper: {
    flex: 1,
    height: 24,
    justifyContent: 'center',
  },
  floatingTranscriptBubble: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 12,
    width: '92%',
    maxWidth: 380,
    maxHeight: 140,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  floatingTranscriptScroll: {
    alignSelf: 'stretch',
  },
  floatingTranscriptContent: {
    flexGrow: 1,
  },
  floatingTranscriptText: {
    fontSize: 15,
    lineHeight: 20,
    color: '#F8FAFC',
    textAlign: 'left',
  },
  pillTranscribingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inlineStopBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  inlineStopSquare: {
    width: 10,
    height: 10,
    borderRadius: 1.5,
    backgroundColor: '#FFFFFF',
  },
  inlineSendCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

