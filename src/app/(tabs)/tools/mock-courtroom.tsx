import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Platform,
  TouchableOpacity,
  Dimensions,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
// @ts-ignore
// eslint-disable-next-line import/no-unresolved
import { Ionicons } from '@expo/vector-icons';
import { useToastContext, useThemeContext } from '@/providers';
import { CaseWorkspace } from '@/types';
import { CaseService } from '@/services/case.service';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import * as Speech from 'expo-speech';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useSpeechRecognition } from '@/hooks/use-speech-recognition';
import { apiClient } from '@/api/client';

const { width, height } = Dimensions.get('window');

interface Message {
  id: string;
  sender: 'judge' | 'opponent' | 'witness' | 'advocate' | 'clerk' | 'objection' | 'system';
  senderName: string;
  text: string;
  timestamp: string;
  coachFeedback?: {
    accuracy: number;
    logic: number;
    evidence: number;
    persuasion: number;
    suggestion: string;
  };
}

const STAGES = [
  'Opening',
  'Evidence',
  'Witness',
  'Cross',
  'Arguments',
  'Verdict'
];

export default function MockCourtroomScreen() {
  const { showToast } = useToastContext();
  const { theme } = useThemeContext();
  const router = useRouter();
  const params = useLocalSearchParams<{ caseId?: string }>();

  // Main Screen States: 'INITIAL_CHOICE' | 'EXISTING_SELECTION' | 'DASHBOARD' | 'WIZARD' | 'MODE_SELECTION' | 'LAUNCHING' | 'COURTROOM' | 'VERDICT' | 'PRACTICE_RECORDING' | 'PRACTICE_REPORT'
  const [screenState, setScreenState] = useState<'INITIAL_CHOICE' | 'EXISTING_SELECTION' | 'DASHBOARD' | 'WIZARD' | 'MODE_SELECTION' | 'LAUNCHING' | 'COURTROOM' | 'VERDICT' | 'PRACTICE_RECORDING' | 'PRACTICE_REPORT'>('INITIAL_CHOICE');

  // Cases and practice states
  const [savedCases, setSavedCases] = useState<any[]>([]);
  const [isLoadingCases, setIsLoadingCases] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [practiceTitle, setPracticeTitle] = useState('');
  const [practiceCourt, setPracticeCourt] = useState('');
  const [practiceBrief, setPracticeBrief] = useState('');
  const [isGatheringPracticeDetails, setIsGatheringPracticeDetails] = useState(false);
  const [launchingStep, setLaunchingStep] = useState(0);

  // Chosen Simulator Mode: 'voice' | 'text' | 'practice'
  const [hearingMode, setHearingMode] = useState<'voice' | 'text' | 'practice'>('voice');

  // Case Context State
  const [activeCase, setActiveCase] = useState<CaseWorkspace | null>(null);

  // Keyboard Fallback toggle in Voice Mode
  const [showKeyboardFallback, setShowKeyboardFallback] = useState(false);

  // Setup Wizard States (Mode 2)
  const [selectedCourt, setSelectedCourt] = useState('Delhi District Court');
  const [selectedDifficulty, setSelectedDifficulty] = useState('Medium');
  const [selectedStyle, setSelectedStyle] = useState('Complete Trial');

  // Simulation Active states
  const [messages, setMessages] = useState<Message[]>([]);
  const [userReply, setUserReply] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [roundNumber, setRoundNumber] = useState(1);
  const [activeStage, setActiveStage] = useState('Opening Statement');
  const [timerSeconds, setTimerSeconds] = useState(0);

  // Dynamic AI Voice Hearing states
  const [currentSpeaker, setCurrentSpeaker] = useState<'judge' | 'opponent' | 'witness' | 'advocate' | 'clerk' | 'objection' | 'system'>('judge');
  const [aiStatusText, setAiStatusText] = useState('Ready');
  const [showTranscriptSheet, setShowTranscriptSheet] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [isVoiceReportLoading, setIsVoiceReportLoading] = useState(false);
  const [voiceReport, setVoiceReport] = useState<any>(null);

  // Strategy Assistant states
  const [isStrategyAssistantVisible, setIsStrategyAssistantVisible] = useState(false);
  const [strategySuggestions, setStrategySuggestions] = useState<any>({
    strongArgument: 'Mandatory statutory presumption under Sec 139 NI Act holds unless standard of proof rebuts it.',
    relevantSection: 'Negotiable Instruments Act, Section 138 & Section 139 (Presumption in favour of holder).',
    possibleObjection: 'Object if opposing counsel attempts to introduce oral defense without written reply/evidence.',
    missingEvidence: 'Original cheque leaf Exhibit P-1 and speed post acknowledgment card copy.',
    crossExaminationIdea: 'Question the accused on the source of funds and the existence of the security transaction.',
    weaknessOpponent: 'Accused failed to reply to the statutory demand notice within 15 days of service.',
    suggestedResponse: 'My Lord, under Section 139, the law mandates a presumption of legal debt. The signature is admitted; thus, the trial must proceed to evidence.'
  });

  const updateStrategySuggestions = (stage: string) => {
    if (stage.includes('Opening')) {
      setStrategySuggestions({
        strongArgument: 'Reference the dishonoured cheque and the signature admission to invoke Section 139.',
        relevantSection: 'Section 138 of Negotiable Instruments Act (Dishonour of cheque for insufficiency of funds).',
        possibleObjection: 'Object to defense trying to argue lack of notice before notice proof is shown.',
        missingEvidence: 'Bank memo showing insufficient funds code 02.',
        crossExaminationIdea: 'Verify the date of service of demand notice in post logs.',
        weaknessOpponent: 'Opponent did not reply to the statutory demand notice.',
        suggestedResponse: 'My Lord, I submit that the statutory notice was duly served and the cheque dishonour is verified by the bank memo.'
      });
    } else if (stage.includes('Evidence')) {
      setStrategySuggestions({
        strongArgument: 'Present Exhibit P-1 original cheque and ledger showing pending invoices.',
        relevantSection: 'Section 146 of Negotiable Instruments Act (Bank slip is prima facie evidence).',
        possibleObjection: 'Object to opposing counsel disputing signatures without an expert opinion request.',
        missingEvidence: 'Bank return memo and postal receipt with track report.',
        crossExaminationIdea: 'Examine post officer regarding delivery of legal notice.',
        weaknessOpponent: 'Signatures are admitted, so the presumption of consideration applies.',
        suggestedResponse: 'We present the original dishonoured cheque as Exhibit P-1 and the bank memo showing low balance.'
      });
    } else if (stage.includes('Witness')) {
      setStrategySuggestions({
        strongArgument: 'Confirm from the witness that the cheque was issued in discharge of invoice 104.',
        relevantSection: 'Indian Evidence Act, Section 65B (Electronic records authentication for ledger logs).',
        possibleObjection: 'Object to leading questions asked by opposing counsel to witness Roy.',
        missingEvidence: 'Roy\'s bank transaction statement matching ledger logs.',
        crossExaminationIdea: 'Ask the witness to confirm the delivery receipt details.',
        weaknessOpponent: 'Witness corroborates complainant ledger showing transaction consistency.',
        suggestedResponse: 'Witness Roy, please confirm if the transaction was done in regular business course.'
      });
    } else {
      setStrategySuggestions({
        strongArgument: 'Reiterate that the defense failed to rebut the Section 139 statutory presumption.',
        relevantSection: 'Section 139 NI Act and Supreme Court decision in Rangappa vs Sri Mohan.',
        possibleObjection: 'Object to counsel introducing new defense arguments during closing remarks.',
        missingEvidence: 'Summary details of transaction ledger corroboration.',
        crossExaminationIdea: 'Focus closing on lack of probable defense from the accused.',
        weaknessOpponent: 'No standard of proof met by the defense to disprove consideration.',
        suggestedResponse: 'My Lord, the complainant has proved execution, service, and low funds. The accused has raised no probable defense.'
      });
    }
  };

  // Performance scoring state variables
  const [advocacyScore, setAdvocacyScore] = useState(85);
  const [judgeSatisfaction, setJudgeSatisfaction] = useState(80);
  const [evidenceUsage, setEvidenceUsage] = useState(78);
  const [persuasiveness, setPersuasiveness] = useState(82);

  // Active AI Coach suggestions
  const [coachTip, setCoachTip] = useState('State Cheque execution details. Reference Rangappa.');
  const [isCoachModalVisible, setIsCoachModalVisible] = useState(false);

  // Voice Interaction States
  const soundRef = useRef<Audio.Sound | null>(null);

  // Hook for voice speech recognition
  const {
    isRecording: isListening,
    partialText: speechTranscript,
    startRecording: startSpeechToText,
    stopRecording: stopSpeechToText,
    cancelRecording: cancelSpeechToText,
  } = useSpeechRecognition((transcribedText) => {
    if (transcribedText && transcribedText.trim()) {
      if (screenState === 'PRACTICE_RECORDING' || screenState === 'PRACTICE_REPORT') {
        handleProcessPracticeRecording(transcribedText);
      } else if (isGatheringPracticeDetails) {
        handlePracticeDetailsInput(transcribedText);
      } else {
        handleSendAdvocateSpeech(transcribedText);
      }
    }
  });

  // Courtroom turn state machine
  type CourtTurnState = 'JUDGE_TURN' | 'OPPONENT_TURN' | 'WITNESS_TURN' | 'LAWYER_TURN' | 'AI_THINKING';
  const [courtTurnState, setCourtTurnState] = useState<CourtTurnState>('JUDGE_TURN');

  const [isAiSpeaking, setIsAiSpeaking] = useState(false);

  // Automatic silence detection: automatically stop recording 2 seconds after user stops speaking
  const silenceTimeoutRef = useRef<any>(null);

  useEffect(() => {
    if (isListening && speechTranscript && speechTranscript.trim()) {
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
      silenceTimeoutRef.current = setTimeout(() => {
        stopSpeechToText();
      }, 2000);
    }
    return () => {
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
    };
  }, [speechTranscript, isListening]);

  const computedSpeakerName = useMemo(() => {
    switch (courtTurnState) {
      case 'JUDGE_TURN':
        return 'Judge Shrivastava';
      case 'OPPONENT_TURN':
        return 'Opposing Counsel';
      case 'WITNESS_TURN':
        return 'Witness Roy';
      case 'LAWYER_TURN':
        return 'Your Turn';
      case 'AI_THINKING':
        return 'Court is thinking...';
      default:
        return 'Courtroom';
    }
  }, [courtTurnState]);

  const computedDialogueText = useMemo(() => {
    if (courtTurnState === 'LAWYER_TURN') {
      return isListening ? (speechTranscript || 'Speak your argument now...') : 'Tap the microphone and present your argument.';
    }
    if (courtTurnState === 'AI_THINKING') {
      return 'Analyzing legal arguments and preparing response...';
    }
    const lastMsg = messages[messages.length - 1];
    return lastMsg ? lastMsg.text : 'Hearing initiated. Speak when ready.';
  }, [courtTurnState, speechTranscript, isListening, messages]);

  // Dynamic status text computed helper
  const computedStatusText = useMemo(() => {
    if (isListening) return 'Listening...';
    if (isAiThinking) return 'Analyzing...';
    if (isAiSpeaking) return 'Responding...';
    return 'Ready';
  }, [isListening, isAiThinking, isAiSpeaking]);

  // Waveform Bar Animations
  const animValue = useRef(new Animated.Value(1)).current;
  const pulseValue = useRef(new Animated.Value(1)).current;
  const skeletonPulseValue = useRef(new Animated.Value(1)).current;

  // Practice Recording States
  const [practiceSeconds, setPracticeSeconds] = useState(0);
  const [isPracticeRecording, setIsPracticeRecording] = useState(false);
  const practiceTimerRef = useRef<any>(null);

  const [practiceStatus, setPracticeStatus] = useState<'idle' | 'countdown' | 'recording' | 'paused'>('idle');
  const [countdownCount, setCountdownCount] = useState(3);
  const [practiceReport, setPracticeReport] = useState<any>(null);
  const [isPracticeLoading, setIsPracticeLoading] = useState(false);
  const [practiceHistory, setPracticeHistory] = useState<any[]>([]);
  const [isHistoryModalVisible, setIsHistoryModalVisible] = useState(false);
  const [practiceStatusMessage, setPracticeStatusMessage] = useState('Analyzing courtroom presentation...');
  const [lastPracticeTranscript, setLastPracticeTranscript] = useState('');
  const [practiceError, setPracticeError] = useState(false);

  // Scroll ref for chat
  const chatScrollRef = useRef<ScrollView>(null);
  // Live timer interval ref
  const timerRef = useRef<any>(null);

  // Setup animations for speaker pulse
  useEffect(() => {
    if (isListening || isAiSpeaking) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(animValue, {
            toValue: 2.2,
            duration: 900,
            useNativeDriver: true,
          }),
          Animated.timing(animValue, {
            toValue: 1.0,
            duration: 900,
            useNativeDriver: true,
          })
        ])
      ).start();
    } else {
      animValue.setValue(1);
    }
  }, [isListening, isAiSpeaking]);

  useEffect(() => {
    if (isAiSpeaking) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseValue, {
            toValue: 1.15,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseValue, {
            toValue: 1.0,
            duration: 600,
            useNativeDriver: true,
          })
        ])
      ).start();
    } else {
      pulseValue.setValue(1);
    }
  }, [isAiSpeaking]);

  // Pulse animation for Skeleton UI placeholders
  useEffect(() => {
    if (isPracticeLoading) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(skeletonPulseValue, {
            toValue: 0.35,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(skeletonPulseValue, {
            toValue: 0.8,
            duration: 800,
            useNativeDriver: true,
          })
        ])
      ).start();
    } else {
      skeletonPulseValue.setValue(1);
    }
  }, [isPracticeLoading]);

  // Load current case context if routed with ID
  useEffect(() => {
    if (params?.caseId) {
      setScreenState('MODE_SELECTION');
      setActiveCase({
        _id: params.caseId || 'current',
        id: params.caseId || 'current',
        name: 'Supreme Fabrics v. Modern Outfitters',
        userId: 'dummy_user_id',
        clientName: 'Supreme Fabrics Corp',
        opponentName: 'Modern Outfitters Retail',
        caseType: 'NI Act Cheque Bounce',
        courtName: 'Delhi Sessions Court',
        status: 'Active',
        stage: 'Court',
        priority: 'High',
        lawyers: [],
        facts: [],
        legalIssues: [],
        documents: [],
        evidence: [],
        savedPrecedents: [],
        tasks: [],
        communicationLogs: [],
        research: [],
        hearings: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      } as any);
    }
  }, [params?.caseId]);

  // Live timer tick for hearing duration
  useEffect(() => {
    if (screenState === 'COURTROOM') {
      timerRef.current = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      setTimerSeconds(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [screenState]);

  // Synchronize partial speech recognition transcript to input field during text dictation
  useEffect(() => {
    if (hearingMode === 'text' && isListening && speechTranscript) {
      setUserReply(speechTranscript);
    }
  }, [speechTranscript, isListening, hearingMode]);

  // Scroll helper
  useEffect(() => {
    if (chatScrollRef.current) {
      setTimeout(() => {
        chatScrollRef.current?.scrollToEnd({ animated: true });
      }, 200);
    }
  }, [messages, isAiThinking]);

  // Format seconds into MM:SS
  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const secs = (totalSeconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  // Launch Court Simulator
  const launchCourtroomMode = (mode: 'voice' | 'text' | 'practice') => {
    setHearingMode(mode);

    if (mode === 'practice') {
      setScreenState('PRACTICE_RECORDING');
      setPracticeStatus('idle');
      setPracticeSeconds(0);
      return;
    }

    setScreenState('LAUNCHING');
    setRoundNumber(1);
    setActiveStage('Opening Statement');
    setAdvocacyScore(85);
    setJudgeSatisfaction(80);
    setEvidenceUsage(78);
    setPersuasiveness(82);

    if (activeCase) {
      setIsGatheringPracticeDetails(false);
      
      // Load progress indicator sequence
      setLaunchingStep(0);
      setTimeout(() => setLaunchingStep(1), 500);
      setTimeout(() => setLaunchingStep(2), 1000);
      setTimeout(() => setLaunchingStep(3), 1500);
      setTimeout(() => setLaunchingStep(4), 2000);

      const caseName = activeCase.name;
      const courtName = activeCase.courtName || 'District Court';
      const briefText = activeCase.summary || '';
      const docTitles = (activeCase.documents || []).map((d: any) => d.title || d.name).join(', ');
      const evidenceList = (activeCase.evidence || []).map((e: any) => e.name || e.title).join(', ');
      const timelineStr = (activeCase.facts || []).map((f: any) => `Fact on ${f.date || f.displayDate}: ${f.title} (${f.description})`).join('; ');
      const legalIssuesStr = (activeCase.legalIssues || []).join('; ');
      
      const fullCaseBriefDetails = `Case Name: ${caseName}. Court: ${courtName}. Summary: ${briefText}. Documents Available: ${docTitles || 'None'}. Key Evidence: ${evidenceList || 'None'}. Timeline of Facts: ${timelineStr || 'None'}. Legal Issues: ${legalIssuesStr || 'None'}.`;

      setTimeout(async () => {
        setScreenState('COURTROOM');
        setCurrentSpeaker('judge');
        setCourtTurnState('JUDGE_TURN');
        setAiStatusText('Responding...');
        setIsAiThinking(true);

        try {
          const payload = {
            caseContext: {
              name: caseName,
              courtName: courtName,
              brief: fullCaseBriefDetails
            },
            conversationHistory: [],
            lastUserSpeech: `[INITIALIZE_TRIAL] Introduce the case, name the parties, state the central legal dispute and ask Complainant Counsel for their opening statement.`,
            currentRole: 'system',
            stage: 'Opening Statement'
          };
          const res = await CaseService.getCourtroomResponse(payload) as any;
          if (res && res.success) {
            const startMsg: Message = {
              id: '1',
              sender: 'judge',
              senderName: '⚖️ Judge Shrivastava',
              text: res.responseText || 'Good morning Counsel. The Court is now in session. Please introduce yourself and present your opening statement.',
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
            setMessages([startMsg]);
            if (mode === 'voice') {
              speakResponse(res.responseText || 'Good morning Counsel. The Court is now in session. Please introduce yourself and present your opening statement.', 'judge');
            }
          } else {
            throw new Error('Initial case fetch failed');
          }
        } catch (e) {
          console.error(e);
          const fallbackText = `Good morning Counsel. We are today hearing the case of ${caseName}. Please introduce yourself and present your opening statement.`;
          setMessages([{
            id: '1',
            sender: 'judge',
            senderName: '⚖️ Judge Shrivastava',
            text: fallbackText,
            timestamp: '13:30'
          }]);
          if (mode === 'voice') {
            speakResponse(fallbackText, 'judge');
          }
        } finally {
          setIsAiThinking(false);
          setAiStatusText('Listening...');
        }
      }, 2500);

    } else {
      // Practice Case Setup
      setIsGatheringPracticeDetails(true);
      setLaunchingStep(0);
      setTimeout(() => setLaunchingStep(1), 500);
      setTimeout(() => setLaunchingStep(2), 1000);
      setTimeout(() => setLaunchingStep(3), 1500);
      setTimeout(() => setLaunchingStep(4), 2000);

      setTimeout(() => {
        setScreenState('COURTROOM');
        setCurrentSpeaker('judge');
        setCourtTurnState('JUDGE_TURN');
        const initialText = 'Welcome, Counsel. This is a practice courtroom session. Before we begin, please briefly describe the case you would like to argue today. You may either speak using the microphone or type your case summary.';
        setMessages([
          {
            id: 'init_judge',
            sender: 'judge',
            senderName: '⚖️ Hon\'ble Judge',
            text: initialText,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
        if (mode === 'voice') {
          speakResponse(initialText, 'judge');
        }
        setAiStatusText('Listening...');
      }, 2500);
    }
  };

  // Real Speech Output via local device Speech TTS API with retry fallback
  const speakResponse = async (text: string, forceRole?: string, onFinished?: () => void, isRetry = false) => {
    // If text mode, immediately run finished callback and return without speech synthesis
    if (hearingMode === 'text') {
      setIsAiSpeaking(false);
      if (onFinished) {
        onFinished();
      } else {
        setCourtTurnState('LAWYER_TURN');
        setCurrentSpeaker('advocate');
      }
      return;
    }

    setIsAiSpeaking(true);
    
    // Stop any current speaking queue
    try {
      await Speech.stop();
    } catch (e) {
      console.warn('[speakResponse] Stop speech error:', e);
    }

    // Configure different voice profiles for Judge, Opposing Counsel, Witness
    const role = forceRole || currentSpeaker;
    let rate = 1.0;
    let pitch = 1.0;

    if (role === 'judge') {
      rate = 0.85; // Authoritative slower pace
      pitch = 0.8; // Lower tone
    } else if (role === 'opponent') {
      rate = 1.15; // Fast confident pace
      pitch = 1.2; // Higher tone
    } else if (role === 'witness') {
      rate = 1.0;
      pitch = 1.0;
    }

    // Clean Markdown formatting from speech
    const cleanText = text
      .replace(/[\*_`~>#-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const handleSpeechFinish = () => {
      setIsAiSpeaking(false);
      if (onFinished) {
        onFinished();
      } else {
        setCourtTurnState('LAWYER_TURN');
        setCurrentSpeaker('advocate');
        startSpeechToText('en');
      }
    };

    try {
      await Speech.speak(cleanText, {
        language: 'en-US',
        pitch,
        rate,
        onDone: handleSpeechFinish,
        onStopped: handleSpeechFinish,
        onError: (error) => {
          console.warn('[speakResponse] local Speech.speak error:', error);
          if (!isRetry) {
            console.log('[speakResponse] Retrying speech synthesis once...');
            setTimeout(() => {
              speakResponse(text, forceRole, onFinished, true);
            }, 500);
          } else {
            setIsAiSpeaking(false);
            showToast('error', 'Voice Playback Failed', 'Voice playback unavailable. Continue with text.');
            // Auto fallback to allow user to continue
            if (onFinished) {
              onFinished();
            } else {
              setCourtTurnState('LAWYER_TURN');
              setCurrentSpeaker('advocate');
              startSpeechToText('en');
            }
          }
        }
      });
    } catch (err) {
      console.error('[speakResponse] expo-speech invocation failed:', err);
      if (!isRetry) {
        setTimeout(() => {
          speakResponse(text, forceRole, onFinished, true);
        }, 500);
      } else {
        setIsAiSpeaking(false);
        showToast('error', 'Voice Playback Failed', 'Voice playback unavailable. Continue with text.');
        if (onFinished) {
          onFinished();
        } else {
          setCourtTurnState('LAWYER_TURN');
          setCurrentSpeaker('advocate');
          startSpeechToText('en');
        }
      }
    }
  };

  // Transcript Actions: Copy, Export PDF, Save
  const copyTranscriptText = () => {
    const text = messages.map(m => `[${m.timestamp}] ${m.senderName}: ${m.text}`).join('\n\n');
    require('react-native').Clipboard.setString(text);
    showToast('success', 'Transcript Copied', 'Transcript copied to clipboard.');
  };

  const exportTranscriptPDF = async () => {
    try {
      const rows = messages.map(m => `
        <div style="margin-bottom: 15px; border-bottom: 1px solid #f3f4f6; padding-bottom: 10px;">
          <strong style="color: #4B5563; font-size: 12px;">${m.senderName} (${m.timestamp})</strong>
          <p style="color: #1F2937; font-size: 14px; margin: 4px 0 0 0; line-height: 1.5;">${m.text}</p>
        </div>
      `).join('');
      
      const htmlContent = `
        <html>
          <head>
            <style>
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 20px; }
              h1 { color: #111827; font-size: 20px; margin-bottom: 2px; }
              h2 { color: #4B5563; font-size: 14px; margin-top: 0; margin-bottom: 20px; font-weight: normal; }
            </style>
          </head>
          <body>
            <h1>Courtroom Hearing Transcript</h1>
            <h2>Case: ${activeCase ? activeCase.name : 'Practice Case'} | Date: ${new Date().toLocaleDateString()}</h2>
            <hr style="border: 0; border-top: 1px solid #d1d5db; margin-bottom: 20px;" />
            ${rows}
          </body>
        </html>
      `;
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      await Sharing.shareAsync(uri);
      showToast('success', 'Export Completed', 'Transcript PDF exported successfully.');
    } catch (e) {
      console.error(e);
      showToast('error', 'Export Failed', 'Unable to generate PDF.');
    }
  };

  const saveTranscript = async () => {
    try {
      const text = messages.map(m => `[${m.timestamp}] ${m.senderName}: ${m.text}`).join('\n\n');
      const filename = `transcript_${Date.now()}.txt`;
      const fileUri = `${(FileSystem as any).cacheDirectory}${filename}`;
      await FileSystem.writeAsStringAsync(fileUri, text);
      await Sharing.shareAsync(fileUri);
      showToast('success', 'Transcript Saved', 'Transcript saved successfully.');
    } catch (e) {
      console.error(e);
      showToast('error', 'Save Failed', 'Unable to save transcript file.');
    }
  };

  // Stage-aware suggestions array
  const actionChips = useMemo(() => {
    switch (activeStage) {
      case 'Opening Statement':
        return [
          { text: 'Fabric supplied on credit.', val: 'My Lord, Apex Fabrics supplied fabric on credit.' },
          { text: 'Cheque sum is Rs. 5,00,000.', val: 'Cheque amount is INR 5,00,000.' },
          { text: 'Statutory notice delivered.', val: 'Demand Notice was sent within 15 days.' }
        ];
      case 'Evidence Presentation':
        return [
          { text: 'Present Cheque Ex P-1.', val: 'Present original cheque Exhibit P-1.' },
          { text: 'Show bank bounce memo.', val: 'Present bank memo showing low funds.' },
          { text: 'Show delivery receipt.', val: 'Present speed post delivery tracking.' }
        ];
      default:
        return [
          { text: 'Cite Sec 139 presumption.', val: 'Presumption under Sec 139 is mandatory.' },
          { text: 'No defense was raised.', val: 'No defense was raised to statutory notice.' }
        ];
    }
  }, [activeStage]);

  // AI Response generator
  const triggerAiResponse = (advocateText: string) => {
    setIsAiThinking(true);

    setTimeout(() => {
      // Simulate real-time grading updates
      const scoreDelta = Math.floor(Math.random() * 6) - 1;
      setAdvocacyScore((prev) => Math.min(100, Math.max(50, prev + scoreDelta)));
      setJudgeSatisfaction((prev) => Math.min(100, Math.max(50, prev + (scoreDelta + 1))));

      let responseText = '';
      let nextStage = activeStage;

      if (activeStage === 'Opening Statement') {
        responseText = 'Objection overruled. The defense claims security cheque, but signatures are fully admitted. Complainant, present your delivery logs.';
        nextStage = 'Evidence Presentation';
        setCoachTip('Present Exhibit P-1 bank clearing report.');
        setRoundNumber(2);
      } else if (activeStage === 'Evidence Presentation') {
        responseText = 'I note the ledger. Call bank officer Roy to confirm clearance timestamps.';
        nextStage = 'Witness Examination';
        setCoachTip('Ask Roy to clarify transaction code 02 details.');
        setRoundNumber(3);
      } else {
        responseText = 'Final arguments received. The Bench will now formulate the verdict report.';
        nextStage = 'Verdict';
        setRoundNumber(6);
      }

      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          sender: 'judge',
          senderName: '⚖️ Judge Shrivastava',
          text: responseText,
          timestamp: '13:35'
        }
      ]);

      setActiveStage(nextStage);
      updateStrategySuggestions(nextStage);
      setIsAiThinking(false);

      if (hearingMode === 'voice') {
        speakResponse(responseText);
      }

      if (nextStage === 'Verdict') {
        setTimeout(() => {
          setScreenState('VERDICT');
        }, 1200);
      }
    }, 1800);
  };

  // Submit advocate text speech
  const handleSendAdvocateSpeech = (speechText: string) => {
    if (!speechText.trim()) return;

    const userMsg: Message = {
      id: Math.random().toString(),
      sender: 'advocate',
      senderName: '🎤 You',
      text: speechText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    
    if (isGatheringPracticeDetails) {
      handlePracticeDetailsInput(speechText);
    } else {
      setCurrentSpeaker('advocate');
      setCourtTurnState('AI_THINKING');
      setAiStatusText('Analyzing...');
      triggerVoiceHearingResponse(speechText);
    }
  };

  // Microphone toggle button action
  const handlePressMicrophone = () => {
    if (isListening) {
      stopSpeechToText();
    } else {
      startSpeechToText('en');
    }
  };

  // Trigger raised objection
  const handleRaiseObjection = (objectionType: string) => {
    const objMsg: Message = {
      id: Math.random().toString(),
      sender: 'objection',
      senderName: '🚫 Objection Raised',
      text: `Objection! ${objectionType}.`,
      timestamp: '13:32'
    };

    setMessages((prev) => [...prev, objMsg]);
    setIsAiThinking(true);

    setTimeout(() => {
      const sustain = Math.random() > 0.4;
      const judgeResponse = sustain 
        ? 'Sustained. Complainant must direct arguments to the ledger details.' 
        : 'Overruled. The query directly addresses transaction clearance logs.';

      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          sender: 'judge',
          senderName: '⚖️ Judge Shrivastava',
          text: judgeResponse,
          timestamp: '13:33'
        }
      ]);
      setIsAiThinking(false);
      if (hearingMode === 'voice') {
        speakResponse(judgeResponse);
      }
    }, 1200);
  };

  // Start countdown & recording
  const handleStartPracticeRecording = () => {
    setPracticeStatus('countdown');
    setCountdownCount(3);
    
    let count = 3;
    const interval = setInterval(() => {
      count -= 1;
      if (count > 0) {
        setCountdownCount(count);
      } else {
        clearInterval(interval);
        setPracticeStatus('recording');
        setPracticeSeconds(0);
        startSpeechToText('en');
        
        practiceTimerRef.current = setInterval(() => {
          setPracticeSeconds((prev) => prev + 1);
        }, 1000);
      }
    }, 1000);
  };

  // Pause practice recording
  const handlePausePracticeRecording = () => {
    if (practiceTimerRef.current) {
      clearInterval(practiceTimerRef.current);
    }
    setPracticeStatus('paused');
    stopSpeechToText();
  };

  // Resume practice recording
  const handleResumePracticeRecording = () => {
    setPracticeStatus('recording');
    startSpeechToText('en');
    practiceTimerRef.current = setInterval(() => {
      setPracticeSeconds((prev) => prev + 1);
    }, 1000);
  };

  // Stop & Trigger evaluation
  const handleStopPracticeRecording = () => {
    if (practiceTimerRef.current) {
      clearInterval(practiceTimerRef.current);
    }
    setPracticeStatus('idle');
    setScreenState('PRACTICE_REPORT');
    setPracticeReport(null);
    setPracticeError(false);
    setIsPracticeLoading(true);
    setPracticeStatusMessage('Preparing your courtroom feedback...');
    stopSpeechToText();
  };

  // Process text transcript via Coach AI
  const handleProcessPracticeRecording = async (transcriptText: string) => {
    setLastPracticeTranscript(transcriptText);
    setIsPracticeLoading(true);
    setPracticeError(false);
    setPracticeStatusMessage('Processing...');
    
    const t1 = setTimeout(() => setPracticeStatusMessage('Analyzing courtroom presentation...'), 1200);
    const t2 = setTimeout(() => setPracticeStatusMessage('Evaluating advocacy...'), 2400);
    
    try {
      const payload = {
        transcript: transcriptText,
        caseContext: activeCase ? {
          name: activeCase.name,
          courtName: activeCase.courtName,
          summary: activeCase.summary || activeCase.caseType
        } : {
          name: 'Practice Case',
          courtName: 'Simulated Courtroom',
          summary: practiceBrief
        },
        speakingTimeSeconds: practiceSeconds
      };
      
      const res = await CaseService.getPracticeReport(payload) as any;
      if (res && res.error === 'LIMIT_EXCEEDED') {
        setPracticeError(true);
        Alert.alert(
          "Limit Exceeded",
          "You've used your 2 free AI Mock Courtroom simulations. Upgrade to Professional for unlimited courtroom practice.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Upgrade Now", onPress: () => router.push('/profile/billing' as any) }
          ]
        );
        setScreenState('INITIAL_CHOICE');
        return;
      }
      if (res && res.success && res.report) {
        setPracticeReport(res.report);
        setScreenState('PRACTICE_REPORT');
        setPracticeError(false);
        
        // Save to local practice history
        const newHistoryItem = {
          caseName: activeCase ? activeCase.name : 'Practice Case',
          date: new Date().toLocaleDateString('en-IN', { dateStyle: 'medium' }),
          duration: formatTimer(practiceSeconds),
          score: res.report.overallScore || 80,
          report: res.report
        };
        setPracticeHistory(prev => [newHistoryItem, ...prev]);
      } else {
        setPracticeError(true);
        showToast('error', 'Evaluation Failed', 'Coaching analysis returned invalid details.');
      }
    } catch (e) {
      console.error(e);
      setPracticeError(true);
      showToast('error', 'Error', 'Failed to request practice report evaluation.');
    } finally {
      clearTimeout(t1);
      clearTimeout(t2);
      setIsPracticeLoading(false);
    }
  };

  // Export Practice Evaluation Report to PDF
  const exportPracticePDF = async () => {
    if (!practiceReport) return;
    try {
      const htmlContent = `
        <html>
          <head>
            <style>
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 25px; color: #1F2937; }
              h1 { color: #4F46E5; font-size: 24px; margin-bottom: 5px; }
              h2 { color: #6B7280; font-size: 14px; margin-top: 0; margin-bottom: 25px; font-weight: normal; }
              .score-box { background-color: #EEF2FF; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 5px solid #4F46E5; }
              .section-title { font-size: 16px; font-weight: bold; color: #374151; margin-top: 20px; border-bottom: 1px solid #E5E7EB; padding-bottom: 5px; }
              .bullet-list { margin: 8px 0; padding-left: 20px; }
              .bullet-list li { margin-bottom: 6px; font-size: 14px; }
              .summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; }
              .summary-item { background: #F9FAFB; padding: 10px; border-radius: 6px; font-size: 13px; }
              .improved-box { background-color: #F5F3FF; border: 1px solid #DDD6FE; padding: 15px; border-radius: 8px; font-style: italic; font-size: 14px; line-height: 1.6; margin-top: 15px; }
            </style>
          </head>
          <body>
            <h1>Advocacy Practice Evaluation</h1>
            <h2>Case: ${activeCase ? activeCase.name : 'Practice Case'} | Date: ${new Date().toLocaleDateString()}</h2>
            
            <div class="score-box">
              <strong>Overall Score: ${practiceReport.overallScore || 80}/100</strong>
            </div>

            <div class="section-title">Practice Summary</div>
            <div class="summary-grid">
              <div class="summary-item">Speaking Time: ${practiceReport.summary?.speakingTime || 'N/A'}</div>
              <div class="summary-item">Word Count: ${practiceReport.summary?.words || '0'}</div>
              <div class="summary-item">Average Pace: ${practiceReport.summary?.averagePace || 'N/A'}</div>
              <div class="summary-item">Confidence: ${practiceReport.summary?.confidence || 'N/A'}</div>
              <div class="summary-item">Long Pauses: ${practiceReport.summary?.longPauses || '0'}</div>
              <div class="summary-item">Filler Words: ${practiceReport.summary?.fillerWords || '0'}</div>
            </div>

            <div class="section-title">Strengths</div>
            <ul class="bullet-list">
              ${(practiceReport.strengths || []).map((s: string) => `<li>${s}</li>`).join('')}
            </ul>

            <div class="section-title">Weaknesses</div>
            <ul class="bullet-list">
              ${(practiceReport.weaknesses || []).map((w: string) => `<li>${w}</li>`).join('')}
            </ul>

            <div class="section-title">Suggestions for Improvement</div>
            <ul class="bullet-list">
              ${(practiceReport.suggestions || []).map((s: string) => `<li>${s}</li>`).join('')}
            </ul>

            <div class="section-title">Improved Version (Suggested Rewrite)</div>
            <div class="improved-box">
              "${practiceReport.improvedVersion || ''}"
            </div>
          </body>
        </html>
      `;
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      await Sharing.shareAsync(uri);
      showToast('success', 'PDF Exported', 'Practice evaluation report exported successfully.');
    } catch (e) {
      console.error(e);
      showToast('error', 'Export Failed', 'Unable to export practice PDF.');
    }
  };

  // Share Practice Evaluation Report text summary
  const sharePracticeReport = async () => {
    if (!practiceReport) return;
    try {
      const summaryText = `Advocacy Practice Report Summary:\n\n` +
        `Overall Score: ${practiceReport.overallScore || 80}/100\n` +
        `Duration: ${practiceReport.summary?.speakingTime || 'N/A'}\n` +
        `Words: ${practiceReport.summary?.words || '0'}\n` +
        `Pace: ${practiceReport.summary?.averagePace || 'N/A'}\n` +
        `Confidence: ${practiceReport.summary?.confidence || 'N/A'}\n\n` +
        `Check out AI Legal Practice Coach for detailed advocacy training!`;
      
      const fileUri = `${(FileSystem as any).cacheDirectory}practice_summary_${Date.now()}.txt`;
      await FileSystem.writeAsStringAsync(fileUri, summaryText);
      await Sharing.shareAsync(fileUri);
      showToast('success', 'Report Shared', 'Shared successfully.');
    } catch (e) {
      console.error(e);
      showToast('error', 'Share Failed', 'Unable to share report.');
    }
  };

  // Handle header back action
  const handleBackPress = () => {
    if (screenState === 'COURTROOM' || screenState === 'LAUNCHING' || screenState === 'VERDICT' || screenState === 'PRACTICE_RECORDING' || screenState === 'PRACTICE_REPORT') {
      setScreenState('MODE_SELECTION');
    } else if (screenState === 'MODE_SELECTION' || screenState === 'EXISTING_SELECTION') {
      setScreenState('INITIAL_CHOICE');
    } else {
      router.back();
    }
  };

  // Change active case folder
  const handleChangeCase = () => {
    setMessages([]);
    setTimerSeconds(0);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setIsGatheringPracticeDetails(false);
    setScreenState('INITIAL_CHOICE');
  };

  // Select existing case logic
  const handleSelectExistingChoice = async () => {
    setIsLoadingCases(true);
    setScreenState('EXISTING_SELECTION');
    try {
      const res = await CaseService.listCases();
      const casesData = Array.isArray(res) ? res : (res?.data || []);
      const filtered = (casesData as any[]).filter((p) => p.isLegalCase);
      setSavedCases(filtered);
    } catch (e) {
      console.error(e);
      showToast('error', 'Fetch Failed', 'Failed to retrieve case folders.');
      setSavedCases([]);
    } finally {
      setIsLoadingCases(false);
    }
  };

  // Fetch full details
  const handleSelectCaseFolder = async (caseSummary: any) => {
    setSelectedCaseId(caseSummary._id);
    setIsLoadingCases(true);
    try {
      const res = await CaseService.getCaseDetails(caseSummary._id);
      const caseData = (res as any)?.data ?? res;
      if (caseData && caseData._id) {
        setTimeout(() => {
          setActiveCase(caseData);
          setPracticeCourt('');
          setPracticeTitle('');
          setPracticeBrief('');
          setScreenState('MODE_SELECTION');
          setSelectedCaseId(null);
        }, 250);
      } else {
        showToast('error', 'Load Failed', 'Failed to fetch case details.');
        setSelectedCaseId(null);
      }
    } catch (e) {
      console.error(e);
      showToast('error', 'Load Failed', 'Failed to load case data.');
      setSelectedCaseId(null);
    } finally {
      setIsLoadingCases(false);
    }
  };

  // Practice Case choice (direct selection)
  const handlePracticeCaseChoice = () => {
    setActiveCase(null);
    setPracticeCourt('Practice Simulation');
    setPracticeTitle('Practice Case');
    setPracticeBrief('');
    setScreenState('MODE_SELECTION');
  };

  // Practice Details Input process
  const handlePracticeDetailsInput = async (speechText: string) => {
    setIsAiThinking(true);
    setAiStatusText('Preparing response...');
    setPracticeBrief(speechText);
    setIsGatheringPracticeDetails(false);
    setCourtTurnState('AI_THINKING');

    try {
      const payload = {
        caseContext: {
          name: 'Practice Case',
          courtName: 'Simulated Courtroom',
          brief: speechText
        },
        conversationHistory: [],
        lastUserSpeech: `[INITIALIZE_TRIAL] Complainant Counsel has presented the case brief: '${speechText}'. Introduce the trial and call upon Complainant Counsel to begin their arguments.`,
        currentRole: 'system',
        stage: 'Opening Statement'
      };

      const res = await CaseService.getCourtroomResponse(payload) as any;
      if (res && res.success) {
        setMessages((prev) => [
          ...prev,
          {
            id: 'understood_judge',
            sender: 'judge',
            senderName: '⚖️ Hon\'ble Judge',
            text: res.responseText || 'Thank you, Counsel. The Court has understood the facts presented. You may now proceed with your opening submissions.',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
        setCourtTurnState('JUDGE_TURN');
        if (hearingMode === 'voice') {
          speakResponse(res.responseText || 'Thank you, Counsel. The Court has understood the facts presented. You may now proceed with your opening submissions.', 'judge');
        }
      } else {
        throw new Error('Practice initialize failed');
      }
    } catch (e) {
      console.error(e);
      const fallback = 'Thank you, Counsel. The Court has understood the facts presented. You may now proceed with your opening submissions.';
      setMessages((prev) => [
        ...prev,
        {
          id: 'understood_judge',
          sender: 'judge',
          senderName: '⚖️ Hon\'ble Judge',
          text: fallback,
          timestamp: '13:32'
        }
      ]);
      setCourtTurnState('JUDGE_TURN');
      if (hearingMode === 'voice') {
        speakResponse(fallback, 'judge');
      }
    } finally {
      setIsAiThinking(false);
      setAiStatusText('Listening...');
    }
  };

  // AI Voice Hearing response logic connecting backend GPT pipeline
  const triggerVoiceHearingResponse = async (speechText: string) => {
    setIsAiThinking(true);
    setAiStatusText('Responding...');
    
    try {
      const payload = {
        caseContext: activeCase ? {
          name: activeCase.name,
          courtName: activeCase.courtName,
          summary: activeCase.summary || activeCase.caseType
        } : {
          name: 'Practice Case',
          courtName: 'Simulated Courtroom',
          summary: practiceBrief
        },
        conversationHistory: messages.concat([{
          id: 'temp_user',
          sender: 'advocate',
          senderName: '🎤 You',
          text: speechText,
          timestamp: '13:30'
        }]),
        lastUserSpeech: speechText,
        currentRole: currentSpeaker,
        stage: activeStage
      };

      const res = await CaseService.getCourtroomResponse(payload) as any;
      if (res && res.error === 'LIMIT_EXCEEDED') {
        setIsAiThinking(false);
        setAiStatusText('Ready');
        Alert.alert(
          "Limit Exceeded",
          "You've used your 2 free AI Mock Courtroom simulations. Upgrade to Professional for unlimited courtroom practice.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Upgrade Now", onPress: () => router.push('/profile/billing' as any) }
          ]
        );
        setScreenState('INITIAL_CHOICE');
        return;
      }
      if (res && res.success) {
        const { responseText, speakerRole, speakerName, nextStage, objection } = res;
        
        if (nextStage) {
          setActiveStage(nextStage);
          updateStrategySuggestions(nextStage);
        }

        if (objection && objection.raised) {
          setAiStatusText('Analyzing...');
          setCurrentSpeaker('opponent');
          setCourtTurnState('OPPONENT_TURN');
          
          const objectionText = `Objection! ${objection.type}. ${responseText.split('.')[0] || 'Argumentative statements.'}`;
          const opponentMsg: Message = {
            id: Math.random().toString(),
            sender: 'opponent',
            senderName: '👔 Opposing Counsel',
            text: objectionText,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };

          setMessages((prev) => [...prev, opponentMsg]);
          speakResponse(objectionText, 'opponent', () => {
            setCurrentSpeaker('judge');
            setCourtTurnState('JUDGE_TURN');
            const rulingText = `${objection.decision || 'Overruled'}. ${responseText.slice(responseText.indexOf('.') + 1) || 'Please proceed, Counsel.'}`;
            const judgeMsg: Message = {
              id: Math.random().toString(),
              sender: 'judge',
              senderName: '⚖️ Hon\'ble Judge',
              text: rulingText,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };

            setMessages((prev) => [...prev, judgeMsg]);
            speakResponse(rulingText, 'judge');
            setAiStatusText('Listening...');
            setIsAiThinking(false);
          });

        } else {
          setCurrentSpeaker(speakerRole || 'judge');
          const turnRole = speakerRole === 'opponent' ? 'OPPONENT_TURN' : speakerRole === 'witness' ? 'WITNESS_TURN' : 'JUDGE_TURN';
          setCourtTurnState(turnRole);
          const finalMsg: Message = {
            id: Math.random().toString(),
            sender: speakerRole || 'judge',
            senderName: speakerName || '⚖️ Hon\'ble Judge',
            text: responseText,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };

          setMessages((prev) => [...prev, finalMsg]);
          speakResponse(responseText, speakerRole || 'judge');
          setAiStatusText('Listening...');
          setIsAiThinking(false);
        }

      } else {
        throw new Error('Invalid endpoint response status');
      }
    } catch (err) {
      console.error(err);
      setAiStatusText('Listening...');
      setIsAiThinking(false);
      setCurrentSpeaker('judge');
      setCourtTurnState('JUDGE_TURN');
      const fallbackMsg: Message = {
        id: Math.random().toString(),
        sender: 'judge',
        senderName: '⚖️ Hon\'ble Judge',
        text: 'AI service unavailable. Please try again.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, fallbackMsg]);
      speakResponse('AI service unavailable. Please try again.');
    }
  };

  // Generate Voice Hearing final report
  const generateHearingReport = async () => {
    setIsVoiceReportLoading(true);
    setScreenState('LAUNCHING');
    
    try {
      const payload = {
        caseContext: activeCase ? {
          name: activeCase.name,
          courtName: activeCase.courtName,
          summary: activeCase.summary || activeCase.caseType
        } : {
          name: 'Practice Case',
          courtName: 'Simulated Courtroom',
          summary: practiceBrief
        },
        conversationHistory: messages
      };

      const res = await CaseService.getCourtroomReport(payload) as any;
      if (res && res.success && res.report) {
        setVoiceReport(res.report);
        setAdvocacyScore(res.report.overallScore || 85);
        setJudgeSatisfaction(res.report.etiquette || 80);
        setEvidenceUsage(res.report.legalAccuracy || 78);
        setPersuasiveness(res.report.argumentStrength || 82);
        
        setScreenState('VERDICT');
      } else {
        throw new Error('Report generation returned failure');
      }
    } catch (e) {
      console.error(e);
      showToast('error', 'Report Failed', 'Failed to generate performance evaluation.');
      setVoiceReport({
        overallScore: 84,
        legalAccuracy: 80,
        argumentStrength: 82,
        etiquette: 88,
        communication: 85,
        confidence: 86,
        strongArgs: ["Presented cheque signature admission arguments clearly."],
        weakArgs: ["Could emphasize bank returned memo ledger timestamps more."],
        missedPoints: ["Statutory delivery log citation presumption reference."],
        suggestions: ["Prepare statutory notice evidence first before verbal submissions."],
        judgeComment: "Overall counsel demonstrated good courtroom etiquette and legal reasoning. Continued practice will enhance confidence."
      });
      setScreenState('VERDICT');
    } finally {
      setIsVoiceReportLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
      
      {/* ENTERPRISE TEXT COURTROOM HEADER OR STANDARD IMMERSIVE HEADER */}
      {screenState === 'COURTROOM' && hearingMode === 'text' ? (
        <View style={{ backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 16, paddingVertical: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#4B5563' }}>AI Mock Courtroom</Text>
              <Text style={{ fontSize: 16, fontWeight: '900', color: '#111827', marginTop: 2 }}>
                {activeCase ? activeCase.name : 'Practice Case'}
              </Text>
              <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
                Stage: <Text style={{ fontWeight: '700', color: '#8A5CF5' }}>{activeStage}</Text>
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF2F2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, gap: 4 }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#EF4444' }} />
                <Text style={{ fontSize: 10, fontWeight: '800', color: '#EF4444' }}>LIVE • {formatTimer(timerSeconds)}</Text>
              </View>
              <TouchableOpacity 
                style={{ paddingVertical: 3, paddingHorizontal: 6, backgroundColor: '#F3F4F6', borderRadius: 4, borderWidth: 1, borderColor: '#E5E7EB' }}
                onPress={handleBackPress}
              >
                <Text style={{ fontSize: 10, fontWeight: '800', color: '#4B5563' }}>Exit Simulator</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : (
        <View style={[styles.headerContainer, { backgroundColor: theme.surface, borderColor: theme.border, paddingVertical: 10 }]}>
          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.backBtn} onPress={handleBackPress}>
              <Ionicons name="arrow-back" size={20} color={theme.textPrimary} />
            </TouchableOpacity>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={{ fontSize: 10, fontWeight: '800', color: '#8A5CF5', textTransform: 'uppercase' }}>
                {screenState === 'INITIAL_CHOICE' ? 'Simulator Setup' :
                 screenState === 'EXISTING_SELECTION' ? 'Choose Case Folder' :
                 (activeCase ? (activeCase.courtName || 'District Court') : 'Practice Simulation')}
              </Text>
              <Text style={{ fontSize: 13, fontWeight: '900', color: theme.textPrimary }} numberOfLines={1}>
                {screenState === 'INITIAL_CHOICE' ? 'AI Mock Courtroom' :
                 screenState === 'EXISTING_SELECTION' ? 'Select Case Folder' :
                 (activeCase ? activeCase.name : 'Practice Case')}
              </Text>
            </View>
            <View style={styles.liveBadge}>
              <View style={styles.greenDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>

            {/* Change Case folder button */}
            {(screenState === 'COURTROOM' || screenState === 'MODE_SELECTION' || screenState === 'PRACTICE_RECORDING' || screenState === 'VERDICT') && (
              <TouchableOpacity 
                style={{ marginLeft: 8, padding: 6, backgroundColor: '#FAF5FF', borderRadius: 8, borderWidth: 1, borderColor: '#E9D5FF', flexDirection: 'row', alignItems: 'center', gap: 4 }}
                onPress={handleChangeCase}
              >
                <Ionicons name="folder-open-outline" size={15} color="#8A5CF5" />
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#8A5CF5' }}>Change Case</Text>
              </TouchableOpacity>
            )}

            {/* Practice History button */}
            {screenState === 'PRACTICE_RECORDING' && (
              <TouchableOpacity 
                style={{ marginLeft: 8, padding: 6, backgroundColor: '#FAF5FF', borderRadius: 8, borderWidth: 1, borderColor: '#E9D5FF', flexDirection: 'row', alignItems: 'center', gap: 4 }}
                onPress={() => setIsHistoryModalVisible(true)}
              >
                <Ionicons name="time-outline" size={15} color="#8A5CF5" />
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#8A5CF5' }}>History</Text>
              </TouchableOpacity>
            )}

            {/* Top Right Mode Switch Trigger Button */}
            {screenState === 'COURTROOM' && (
              <TouchableOpacity 
                style={{ marginLeft: 8, padding: 6, backgroundColor: '#FAF5FF', borderRadius: 8, borderWidth: 1, borderColor: '#E9D5FF' }}
                onPress={() => setScreenState('MODE_SELECTION')}
              >
                <Ionicons name="swap-horizontal" size={16} color="#8A5CF5" />
              </TouchableOpacity>
            )}
          </View>

          {/* Compact Horizontal Statistics Row */}
          {screenState === 'COURTROOM' && (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, paddingHorizontal: 4 }}>
              <Text style={{ fontSize: 11, color: theme.textSecondary }}>Judge: <Text style={{ fontWeight: '700', color: theme.textPrimary }}>R.K. Shrivastava</Text></Text>
              <Text style={{ fontSize: 11, color: theme.textSecondary }}>Stage: <Text style={{ fontWeight: '700', color: '#8A5CF5' }}>{activeStage}</Text></Text>
              <Text style={{ fontSize: 11, color: theme.textSecondary }}>Duration: <Text style={{ fontWeight: '700', color: theme.textPrimary }}>{formatTimer(timerSeconds)}</Text></Text>
            </View>
          )}
        </View>
      )}

      {/* 1. INITIAL SETUP CHOICE SCREEN */}
      {screenState === 'INITIAL_CHOICE' && (
        <ScrollView style={styles.scrollContent} contentContainerStyle={{ paddingVertical: 20 }}>
          <Text style={{ fontSize: 16, fontWeight: '800', color: theme.textPrimary, textAlign: 'center', marginBottom: 6 }}>
            Welcome to AI Mock Courtroom
          </Text>
          <Text style={{ fontSize: 12, color: theme.textSecondary, textAlign: 'center', marginBottom: 24, paddingHorizontal: 10 }}>
            Practice realistic hearings, cross-examinations, and objections in a fully interactive simulated courtroom environment.
          </Text>

          {/* Card Option 1: Use Existing Case */}
          <TouchableOpacity
            style={[styles.setupChoiceCard, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={handleSelectExistingChoice}
          >
            <View style={[styles.choiceIconBg, { backgroundColor: '#E0F2FE' }]}>
              <Ionicons name="folder" size={24} color="#0284C7" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '800', color: theme.textPrimary }}>Use Existing Case</Text>
              <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 3 }}>
                Simulate courtroom arguments for one of your real client case folders.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
          </TouchableOpacity>

          {/* Card Option 2: Practice Case */}
          <TouchableOpacity
            style={[styles.setupChoiceCard, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={handlePracticeCaseChoice}
          >
            <View style={[styles.choiceIconBg, { backgroundColor: '#F3E8FF' }]}>
              <Ionicons name="hammer" size={24} color="#8B5CF6" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '800', color: theme.textPrimary }}>Practice Case</Text>
              <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 3 }}>
                Set up a temporary simulation instantly without long forms.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* 2. EXISTING CASES SELECTION SCREEN */}
      {screenState === 'EXISTING_SELECTION' && (
        <ScrollView style={styles.scrollContent} contentContainerStyle={{ paddingVertical: 20 }}>
          {isLoadingCases && !selectedCaseId ? (
            <ActivityIndicator size="large" color="#8A5CF5" style={{ marginTop: 40 }} />
          ) : savedCases.length === 0 ? (
            /* Empty State */
            <View style={{ alignItems: 'center', marginTop: 40, paddingHorizontal: 20 }}>
              <Ionicons name="folder-open-outline" size={64} color={theme.textMuted} style={{ marginBottom: 12 }} />
              <Text style={{ fontSize: 16, fontWeight: '800', color: theme.textPrimary, marginBottom: 6 }}>
                No Cases Found
              </Text>
              <Text style={{ fontSize: 12, color: theme.textSecondary, textAlign: 'center', marginBottom: 20 }}>
                Create a new case or use Practice Case to continue.
              </Text>
              <TouchableOpacity
                style={[styles.primaryBtn, { width: '100%', backgroundColor: theme.primary, marginBottom: 10 }]}
                onPress={() => {
                  router.push('/(tabs)/cases');
                }}
              >
                <Text style={styles.primaryBtnText}>Create New Case</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.outlineBtn, { width: '100%', borderColor: theme.border }]}
                onPress={handlePracticeCaseChoice}
              >
                <Text style={[styles.outlineBtnText, { color: theme.textPrimary }]}>Practice Case</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* Cases List */
            <View>
              <Text style={{ fontSize: 13, fontWeight: '700', color: theme.textPrimary, marginBottom: 10 }}>
                Choose Saved Case Folder ({savedCases.length})
              </Text>
              {savedCases.map((c) => {
                const isSelected = selectedCaseId === c._id;
                return (
                  <TouchableOpacity
                    key={c._id}
                    style={[
                      styles.caseRowItem,
                      {
                        backgroundColor: isSelected ? '#FAF5FF' : theme.card,
                        borderColor: isSelected ? '#8A5CF5' : theme.border,
                        borderWidth: isSelected ? 2 : 1.5
                      }
                    ]}
                    onPress={() => handleSelectCaseFolder(c)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: isSelected ? '#8A5CF5' : theme.textPrimary }}>{c.name}</Text>
                      <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 2 }}>
                        {c.courtName || 'District Court'} • {c.caseType || 'NI Act'}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={isSelected ? '#8A5CF5' : theme.textMuted} />
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}

      {/* 3. CHOOSE SIMULATION MODE SCREEN */}
      {screenState === 'MODE_SELECTION' && (
        <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={{ fontSize: 16, fontWeight: '900', color: theme.textPrimary, marginBottom: 4, textAlign: 'center' }}>
            Choose Simulation Mode
          </Text>
          <Text style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 16, textAlign: 'center' }}>
            Select how you would like to proceed with the courtroom simulation.
          </Text>

          {/* 1. Voice Hearing Card */}
          <TouchableOpacity 
            style={[styles.modeCard, { borderColor: '#8A5CF5', backgroundColor: '#FAF5FF' }]}
            onPress={() => launchCourtroomMode('voice')}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#8A5CF5' }}>🎤 Voice Hearing</Text>
              <View style={{ backgroundColor: '#8A5CF5', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                <Text style={{ fontSize: 9, fontWeight: '900', color: '#FFFFFF' }}>RECOMMENDED</Text>
              </View>
            </View>
            <Text style={{ fontSize: 11, color: theme.textSecondary, marginVertical: 4 }}>
              Experience a real AI courtroom using voice conversations.
            </Text>
            <View style={{ gap: 3, marginTop: 4 }}>
              <Text style={styles.bulletItem}>• Speak arguments verbally</Text>
              <Text style={styles.bulletItem}>• Realistic Text-to-Speech playback</Text>
              <Text style={styles.bulletItem}>• Live transcription of speech</Text>
            </View>
            <TouchableOpacity style={[styles.primaryBtn, { marginTop: 12, backgroundColor: '#8A5CF5' }]} onPress={() => launchCourtroomMode('voice')}>
              <Text style={styles.primaryBtnText}>Start Voice Hearing</Text>
            </TouchableOpacity>
          </TouchableOpacity>

          {/* 2. Text Hearing Card */}
          <TouchableOpacity 
            style={[styles.modeCard, { borderColor: theme.border, backgroundColor: theme.surface }]}
            onPress={() => launchCourtroomMode('text')}
          >
            <Text style={{ fontSize: 14, fontWeight: '800', color: theme.textPrimary }}>⌨️ Text Hearing</Text>
            <Text style={{ fontSize: 11, color: theme.textSecondary, marginVertical: 4 }}>
              Participate in the courtroom entirely through text.
            </Text>
            <View style={{ gap: 3, marginTop: 4 }}>
              <Text style={styles.bulletItem}>• Traditional chat-based workspace</Text>
              <Text style={styles.bulletItem}>• Same legal intelligence engine</Text>
              <Text style={styles.bulletItem}>• Keyboard input interface</Text>
            </View>
            <TouchableOpacity style={[styles.primaryBtn, { marginTop: 12, backgroundColor: '#6B7280' }]} onPress={() => launchCourtroomMode('text')}>
              <Text style={styles.primaryBtnText}>Start Text Hearing</Text>
            </TouchableOpacity>
          </TouchableOpacity>

          {/* 3. Practice Recording Card */}
          <TouchableOpacity 
            style={[styles.modeCard, { borderColor: theme.border, backgroundColor: theme.surface }]}
            onPress={() => launchCourtroomMode('practice')}
          >
            <Text style={{ fontSize: 14, fontWeight: '800', color: theme.textPrimary }}>🎥 Practice Recording</Text>
            <Text style={{ fontSize: 11, color: theme.textSecondary, marginVertical: 4 }}>
              Practice your courtroom advocacy and receive AI feedback.
            </Text>
            <View style={{ gap: 3, marginTop: 4 }}>
              <Text style={styles.bulletItem}>• Record uninterrupted speech</Text>
              <Text style={styles.bulletItem}>• Complete performance grading report</Text>
              <Text style={styles.bulletItem}>• Critique legal accuracy and fluency</Text>
            </View>
            <TouchableOpacity style={[styles.primaryBtn, { marginTop: 12, backgroundColor: '#6B7280' }]} onPress={() => launchCourtroomMode('practice')}>
              <Text style={styles.primaryBtnText}>Start Practice Recording</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* LAUNCHING LOADER */}
      {screenState === 'LAUNCHING' && (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#8A5CF5" />
          <Text style={[styles.loaderText, { color: theme.textPrimary, marginTop: 16, textAlign: 'center' }]}>
            {isVoiceReportLoading ? 'Analyzing Hearing Transcript...\nGenerating Performance Report...' : (
              activeCase ? 'Configuring Simulated Courtroom...' : (
                launchingStep === 0 ? 'Preparing Courtroom...\nInitializing AI Judge...' :
                launchingStep === 1 ? 'Initializing AI Judge...\nPreparing Practice Session...' :
                launchingStep === 2 ? 'Preparing Practice Session...\nAlmost Ready...' : 'Almost Ready...\nStarting...'
              )
            )}
          </Text>
        </View>
      )}

      {/* IMMERSIVE VOICE / TEXT COURTROOM INTERFACE */}
      {screenState === 'COURTROOM' && (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          
          {/* SLIM STEP PROGRESS INDICATOR */}
          {hearingMode !== 'voice' && (
            <View style={{ height: 26, backgroundColor: theme.surface, borderBottomWidth: 1, borderColor: theme.border, justifyContent: 'center' }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, gap: 10, alignItems: 'center' }}>
                {STAGES.map((stg, sIdx) => {
                  const isActive = activeStage.startsWith(stg);
                  return (
                    <View key={stg} style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                      <Text style={{ fontSize: 10.5, fontWeight: isActive ? '800' : '500', color: isActive ? '#8A5CF5' : theme.textMuted }}>
                        {stg} {isActive ? '●' : ''}
                      </Text>
                      {sIdx < STAGES.length - 1 && <Text style={{ color: theme.textMuted, fontSize: 10 }}>|</Text>}
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {hearingMode === 'voice' ? (
            /* Minimal voice hearing layout */
            <View style={{ flex: 1, justifyContent: 'space-between', paddingVertical: 14 }}>
              
              {/* Speaker Indicator Badge */}
              <View style={{ alignItems: 'center', marginTop: 10 }}>
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#FAF5FF',
                  borderWidth: 1.5,
                  borderColor: '#E9D5FF',
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 20,
                  gap: 6
                }}>
                  <Text style={{ fontSize: 18 }}>
                    {courtTurnState === 'JUDGE_TURN' ? '👨‍⚖️' :
                     courtTurnState === 'OPPONENT_TURN' ? '⚖️' :
                     courtTurnState === 'WITNESS_TURN' ? '👤' : '🎤'}
                  </Text>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#8A5CF5' }}>
                    {computedSpeakerName} {courtTurnState !== 'LAWYER_TURN' && courtTurnState !== 'AI_THINKING' ? 'Speaking...' : ''}
                  </Text>
                </View>
              </View>

              {/* Central text dialogue block */}
              <View style={{ alignSelf: 'center', width: '90%', flex: 1, justifyContent: 'center', marginVertical: 20 }}>
                <View style={{
                  backgroundColor: theme.surface,
                  borderWidth: 1.5,
                  borderColor: theme.border,
                  borderRadius: 20,
                  padding: 24,
                  minHeight: 160,
                  justifyContent: 'center',
                  ...Platform.select({
                    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6 },
                    android: { elevation: 2 }
                  })
                }}>
                  <Text style={{
                    fontSize: 14.5,
                    lineHeight: 22,
                    color: theme.textPrimary,
                    textAlign: 'center',
                    fontStyle: courtTurnState === 'LAWYER_TURN' ? 'italic' : 'normal'
                  }}>
                    {computedDialogueText}
                  </Text>
                </View>

                {/* status text labels */}
                <Text style={{
                  fontSize: 11,
                  fontWeight: '700',
                  color: theme.textMuted,
                  textAlign: 'center',
                  marginTop: 12,
                  textTransform: 'uppercase',
                  letterSpacing: 1
                }}>
                  {computedStatusText}
                </Text>
              </View>

              {/* Large Mic button composer & control items */}
              <View style={{ alignItems: 'center', gap: 14 }}>
                
                {/* Waveforms feedback indicators */}
                {isListening && (
                  <View style={{ flexDirection: 'row', gap: 4, height: 16, alignItems: 'center', marginBottom: 4 }}>
                    {[1, 2, 3, 4, 3, 2, 1].map((bar, bIdx) => (
                      <View key={bIdx} style={{ width: 3, height: bar * 4, backgroundColor: '#8A5CF5', borderRadius: 1.5 }} />
                    ))}
                  </View>
                )}

                {/* Microphone button */}
                <TouchableOpacity
                  disabled={courtTurnState !== 'LAWYER_TURN'}
                  style={{
                    width: 76,
                    height: 76,
                    borderRadius: 38,
                    backgroundColor: courtTurnState !== 'LAWYER_TURN' ? '#D1D5DB' : isListening ? '#EF4444' : '#8A5CF5',
                    alignItems: 'center',
                    justifyContent: 'center',
                    elevation: 4,
                    opacity: courtTurnState !== 'LAWYER_TURN' ? 0.6 : 1.0,
                    shadowColor: '#8A5CF5',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: courtTurnState !== 'LAWYER_TURN' ? 0 : 0.25,
                    shadowRadius: 6
                  }}
                  onPress={handlePressMicrophone}
                >
                  <Ionicons name={isListening ? 'mic-off' : 'mic'} size={32} color={courtTurnState !== 'LAWYER_TURN' ? '#9CA3AF' : '#FFFFFF'} />
                </TouchableOpacity>

                <Text style={{ fontSize: 11, color: theme.textSecondary }}>
                  {courtTurnState !== 'LAWYER_TURN' ? 'Wait for your turn' : isListening ? 'Listening... Speak naturally' : 'Tap to speak argument verbally'}
                </Text>

                {/* End Hearing & Transcript button triggers */}
                <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: '#FEF2F2',
                      borderWidth: 1,
                      borderColor: '#FCA5A5',
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      borderRadius: 10,
                      gap: 6
                    }}
                    onPress={() => setShowEndConfirm(true)}
                  >
                    <Ionicons name="stop" size={16} color="#EF4444" />
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#EF4444' }}>End Hearing</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: '#F3F4F6',
                      borderWidth: 1,
                      borderColor: '#D1D5DB',
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      borderRadius: 10,
                      gap: 6
                    }}
                    onPress={() => setShowTranscriptSheet(true)}
                  >
                    <Ionicons name="document-text" size={16} color="#4B5563" />
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#4B5563' }}>View Transcript</Text>
                  </TouchableOpacity>
                </View>
              </View>

            </View>
          ) : (
            /* Clean minimal professional courtroom transcript UI */
            <>
              {/* COURTROOM TRANSCRIPT LIST AREA */}
              <ScrollView
                ref={chatScrollRef}
                style={{ flex: 1, backgroundColor: '#FFFFFF' }}
                contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 20 }}
              >
                {messages.map((m, idx) => {
                  let speakerLabel = m.senderName;
                  let emoji = '👤';
                  if (m.sender === 'judge') {
                    speakerLabel = 'Judge Shrivastava';
                    emoji = '👨‍⚖️';
                  } else if (m.sender === 'opponent') {
                    speakerLabel = 'Opposing Counsel';
                    emoji = '👔';
                  } else if (m.sender === 'advocate') {
                    speakerLabel = 'You';
                    emoji = '🎤';
                  } else if (m.sender === 'witness') {
                    speakerLabel = 'Witness Roy';
                    emoji = '👤';
                  } else if (m.sender === 'clerk') {
                    speakerLabel = 'Court Clerk';
                    emoji = '📋';
                  }
                  
                  return (
                    <View key={m.id || idx} style={{ width: '100%', marginBottom: 16 }}>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: '#4B5563', marginBottom: 6 }}>
                        {emoji} {speakerLabel}
                      </Text>
                      <Text style={{ fontSize: 14.5, lineHeight: 22, color: '#111827', paddingLeft: 4 }}>
                        {m.text}
                      </Text>
                      {idx < messages.length - 1 && (
                        <View style={{ height: 1, backgroundColor: '#E5E7EB', marginTop: 16 }} />
                      )}
                    </View>
                  );
                })}
              </ScrollView>

              {/* SIMPLIFIED ENTERPRISE COMPOSER & ACTIONS */}
              <View style={{ borderTopWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#FFFFFF', padding: 12 }}>
                
                {isAiThinking && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 8, gap: 6 }}>
                    <ActivityIndicator size="small" color="#8A5CF5" />
                    <Text style={{ fontSize: 12, color: '#8A5CF5', fontWeight: '700' }}>
                      AI is analyzing courtroom arguments...
                    </Text>
                  </View>
                )}

                <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, backgroundColor: isAiThinking ? '#F3F4F6' : '#FFFFFF', paddingHorizontal: 10, height: 48, gap: 8 }}>
                  <TextInput
                    style={{
                      flex: 1,
                      height: '100%',
                      fontSize: 14,
                      color: '#111827',
                    }}
                    value={userReply}
                    onChangeText={setUserReply}
                    placeholder={isListening ? "Listening..." : "Type or speak your argument..."}
                    placeholderTextColor="#9CA3AF"
                    editable={!isAiThinking}
                  />
                  
                  {/* Embedded ChatGPT-style dictation microphone */}
                  {isListening ? (
                    <TouchableOpacity
                      disabled={isAiThinking}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        backgroundColor: '#EF4444',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      onPress={handlePressMicrophone}
                    >
                      <Ionicons name="mic-off" size={18} color="#FFFFFF" />
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      disabled={isAiThinking}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      onPress={handlePressMicrophone}
                    >
                      <Ionicons name="mic" size={20} color={isAiThinking ? '#9CA3AF' : '#8A5CF5'} />
                    </TouchableOpacity>
                  )}

                  {/* Send Button */}
                  <TouchableOpacity
                    disabled={isAiThinking || !userReply.trim()}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      backgroundColor: isAiThinking || !userReply.trim() ? 'transparent' : '#8A5CF5',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    onPress={() => {
                      if (isListening) stopSpeechToText();
                      handleSendAdvocateSpeech(userReply);
                      setUserReply('');
                    }}
                  >
                    <Ionicons 
                      name="send" 
                      size={16} 
                      color={isAiThinking || !userReply.trim() ? '#9CA3AF' : '#FFFFFF'} 
                    />
                  </TouchableOpacity>
                </View>

                {/* Footer Controls: Strategy, Transcript, End Hearing */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, borderTopWidth: 1, borderColor: '#F3F4F6', paddingTop: 10 }}>
                  <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6, backgroundColor: '#FAF5FF', borderWidth: 1, borderColor: '#E9D5FF' }}
                    onPress={() => setIsStrategyAssistantVisible(true)}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#8A5CF5' }}>⚖️ Strategy</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#D1D5DB' }}
                    onPress={() => setShowTranscriptSheet(true)}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#4B5563' }}>📄 Transcript</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6, backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FCA5A5' }}
                    onPress={() => setShowEndConfirm(true)}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#EF4444' }}>🟥 End Hearing</Text>
                  </TouchableOpacity>
                </View>

              </View>
            </>
          )}

        </KeyboardAvoidingView>
      )}

      {/* End Hearing Confirmation Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showEndConfirm}
        onRequestClose={() => setShowEndConfirm(false)}
      >
        <View style={styles.modalBg}>
          <View style={[styles.coachBottomSheet, { backgroundColor: theme.surface, padding: 20 }]}>
            <Text style={{ fontSize: 16, fontWeight: '900', color: theme.textPrimary, textAlign: 'center', marginBottom: 6 }}>
              End Hearing?
            </Text>
            <Text style={{ fontSize: 12, color: theme.textSecondary, textAlign: 'center', marginBottom: 20 }}>
              Are you sure you want to end this courtroom session and generate your performance report?
            </Text>
            
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity 
                style={[styles.outlineBtn, { flex: 1, borderColor: theme.border }]} 
                onPress={() => setShowEndConfirm(false)}
              >
                <Text style={[styles.outlineBtnText, { color: theme.textPrimary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.primaryBtn, { flex: 1, backgroundColor: '#EF4444' }]} 
                onPress={() => {
                  setShowEndConfirm(false);
                  generateHearingReport();
                }}
              >
                <Text style={styles.primaryBtnText}>End Session</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* View Transcript Bottom Sheet Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showTranscriptSheet}
        onRequestClose={() => setShowTranscriptSheet(false)}
      >
        <View style={styles.modalBg}>
          <View style={[styles.coachBottomSheet, { backgroundColor: '#FFFFFF', height: '75%', paddingBottom: 24 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontSize: 15, fontWeight: '900', color: '#8A5CF5' }}>📋 Court Hearing Transcript</Text>
              <TouchableOpacity onPress={() => setShowTranscriptSheet(false)}>
                <Ionicons name="close" size={20} color="#111827" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
              {messages.map((m, idx) => {
                const isUser = m.sender === 'advocate';
                const isJudge = m.sender === 'judge';
                const color = isUser ? '#10B981' : isJudge ? '#8A5CF5' : '#F59E0B';
                return (
                  <View key={m.id || idx} style={{ borderBottomWidth: 1, borderColor: '#F3F4F6', paddingBottom: 8 }}>
                    <Text style={{ fontSize: 10, fontWeight: '800', color, textTransform: 'uppercase', marginBottom: 2 }}>
                      {m.senderName} (${m.timestamp})
                    </Text>
                    <Text style={{ fontSize: 12.5, color: '#1F2937', lineHeight: 18 }}>
                      {m.text}
                    </Text>
                  </View>
                );
              })}
            </ScrollView>

            {/* Actions Panel */}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <TouchableOpacity 
                style={{ flex: 1, backgroundColor: '#FAF5FF', borderWidth: 1, borderColor: '#E9D5FF', padding: 10, borderRadius: 8, alignItems: 'center' }} 
                onPress={copyTranscriptText}
              >
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#8A5CF5' }}>Copy Text</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={{ flex: 1, backgroundColor: '#FAF5FF', borderWidth: 1, borderColor: '#E9D5FF', padding: 10, borderRadius: 8, alignItems: 'center' }} 
                onPress={exportTranscriptPDF}
              >
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#8A5CF5' }}>Export PDF</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={{ flex: 1, backgroundColor: '#FAF5FF', borderWidth: 1, borderColor: '#E9D5FF', padding: 10, borderRadius: 8, alignItems: 'center' }} 
                onPress={saveTranscript}
              >
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#8A5CF5' }}>Save Transcript</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={[styles.primaryBtn, { marginTop: 12, backgroundColor: '#8A5CF5' }]} 
              onPress={() => setShowTranscriptSheet(false)}
            >
              <Text style={styles.primaryBtnText}>Close Transcript</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Strategy Assistant Bottom Sheet Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isStrategyAssistantVisible}
        onRequestClose={() => setIsStrategyAssistantVisible(false)}
      >
        <View style={styles.modalBg}>
          <View style={[styles.coachBottomSheet, { backgroundColor: '#FFFFFF', height: '75%', paddingBottom: 24 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontSize: 15, fontWeight: '900', color: '#8A5CF5' }}>⚖️ Legal Strategy Suggestions</Text>
              <TouchableOpacity onPress={() => setIsStrategyAssistantVisible(false)}>
                <Ionicons name="close" size={20} color="#111827" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 14 }}>
              <View style={{ backgroundColor: '#F9FAFB', borderLeftWidth: 3, borderLeftColor: '#8A5CF5', padding: 10, borderRadius: 6 }}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#6B7280', textTransform: 'uppercase' }}>Strong legal argument</Text>
                <Text style={{ fontSize: 13, color: '#1F2937', marginTop: 4 }}>{strategySuggestions.strongArgument}</Text>
              </View>

              <View style={{ backgroundColor: '#F9FAFB', borderLeftWidth: 3, borderLeftColor: '#8A5CF5', padding: 10, borderRadius: 6 }}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#6B7280', textTransform: 'uppercase' }}>Relevant section</Text>
                <Text style={{ fontSize: 13, color: '#1F2937', marginTop: 4 }}>{strategySuggestions.relevantSection}</Text>
              </View>

              <View style={{ backgroundColor: '#F9FAFB', borderLeftWidth: 3, borderLeftColor: '#8A5CF5', padding: 10, borderRadius: 6 }}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#6B7280', textTransform: 'uppercase' }}>Possible objection</Text>
                <Text style={{ fontSize: 13, color: '#1F2937', marginTop: 4 }}>{strategySuggestions.possibleObjection}</Text>
              </View>

              <View style={{ backgroundColor: '#F9FAFB', borderLeftWidth: 3, borderLeftColor: '#8A5CF5', padding: 10, borderRadius: 6 }}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#6B7280', textTransform: 'uppercase' }}>Missing evidence</Text>
                <Text style={{ fontSize: 13, color: '#1F2937', marginTop: 4 }}>{strategySuggestions.missingEvidence}</Text>
              </View>

              <View style={{ backgroundColor: '#F9FAFB', borderLeftWidth: 3, borderLeftColor: '#8A5CF5', padding: 10, borderRadius: 6 }}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#6B7280', textTransform: 'uppercase' }}>Cross-examination idea</Text>
                <Text style={{ fontSize: 13, color: '#1F2937', marginTop: 4 }}>{strategySuggestions.crossExaminationIdea}</Text>
              </View>

              <View style={{ backgroundColor: '#F9FAFB', borderLeftWidth: 3, borderLeftColor: '#8A5CF5', padding: 10, borderRadius: 6 }}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#6B7280', textTransform: 'uppercase' }}>Weakness in opponent's argument</Text>
                <Text style={{ fontSize: 13, color: '#1F2937', marginTop: 4 }}>{strategySuggestions.weaknessOpponent}</Text>
              </View>

              <View style={{ backgroundColor: '#F5F3FF', borderLeftWidth: 3, borderLeftColor: '#8B5CF6', padding: 10, borderRadius: 6 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#8B5CF6', textTransform: 'uppercase' }}>Suggested next response</Text>
                  <TouchableOpacity 
                    style={{ backgroundColor: '#8B5CF6', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}
                    onPress={() => {
                      setUserReply(strategySuggestions.suggestedResponse);
                      setIsStrategyAssistantVisible(false);
                      showToast('success', 'Inserted', 'Strategy draft placed in argument input.');
                    }}
                  >
                    <Text style={{ fontSize: 9, fontWeight: '900', color: '#FFFFFF' }}>INSERT DRAFT</Text>
                  </TouchableOpacity>
                </View>
                <Text style={{ fontSize: 13, color: '#4C1D95', marginTop: 6, fontStyle: 'italic' }}>{strategySuggestions.suggestedResponse}</Text>
              </View>
            </ScrollView>

            <TouchableOpacity 
              style={[styles.primaryBtn, { marginTop: 12, backgroundColor: '#8A5CF5' }]} 
              onPress={() => setIsStrategyAssistantVisible(false)}
            >
              <Text style={styles.primaryBtnText}>Back to Hearing</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* PRACTICE RECORDING RUNNING PAGE */}
      {screenState === 'PRACTICE_RECORDING' && (
        <View style={{ flex: 1, backgroundColor: theme.background, padding: 24, justifyContent: 'center', alignItems: 'center' }}>
          
          {/* Header Case Details Card */}
          <View style={{ width: '100%', backgroundColor: theme.surface, borderRadius: 12, padding: 20, borderWidth: 1, borderColor: theme.border, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1, alignItems: 'center', marginBottom: 30 }}>
            <Text style={{ fontSize: 13, fontWeight: '800', color: '#8A5CF5', textTransform: 'uppercase', letterSpacing: 0.5 }}>Practice Recording</Text>
            <Text style={{ fontSize: 18, fontWeight: '900', color: theme.textPrimary, marginTop: 8, textAlign: 'center' }}>
              {activeCase ? activeCase.name : 'Practice Case'}
            </Text>
            <Text style={{ fontSize: 13, color: theme.textSecondary, marginTop: 6, textAlign: 'center' }}>
              Practice your oral submissions.
            </Text>
            
            <View style={{ width: '100%', height: 1, backgroundColor: theme.border, marginVertical: 16 }} />
            
            <Text style={{ fontSize: 11, fontWeight: '800', color: theme.textSecondary, textTransform: 'uppercase' }}>Estimated Duration</Text>
            <Text style={{ fontSize: 15, fontWeight: '700', color: theme.textPrimary, marginTop: 4 }}>3–5 Minutes</Text>
          </View>

          {/* Interactive Mic/Recording Area */}
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 250 }}>
            {practiceStatus === 'idle' && (
              <View style={{ alignItems: 'center', gap: 20 }}>
                <TouchableOpacity 
                  style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: '#8A5CF5', alignItems: 'center', justifyContent: 'center', shadowColor: '#8A5CF5', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6 }}
                  onPress={handleStartPracticeRecording}
                >
                  <Ionicons name="mic" size={44} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={{ fontSize: 16, fontWeight: '700', color: theme.textPrimary }}>Start Recording</Text>
              </View>
            )}

            {practiceStatus === 'countdown' && (
              <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 72, fontWeight: '900', color: '#8A5CF5' }}>{countdownCount}</Text>
              </View>
            )}

            {practiceStatus === 'recording' && (
              <View style={{ alignItems: 'center', gap: 20 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FEE2E2', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444' }} />
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#EF4444', textTransform: 'uppercase' }}>Recording</Text>
                </View>
                <Text style={{ fontSize: 44, fontWeight: '900', color: theme.textPrimary, fontVariant: ['tabular-nums'] }}>
                  {formatTimer(practiceSeconds)}
                </Text>
                
                <View style={{ flexDirection: 'row', gap: 16, marginTop: 10 }}>
                  <TouchableOpacity 
                    style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E5E7EB' }}
                    onPress={handlePausePracticeRecording}
                  >
                    <Ionicons name="pause" size={24} color="#4B5563" />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center', shadowColor: '#EF4444', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 4 }}
                    onPress={handleStopPracticeRecording}
                  >
                    <Ionicons name="stop" size={24} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {practiceStatus === 'paused' && (
              <View style={{ alignItems: 'center', gap: 20 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F3F4F6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#E5E7EB' }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#4B5563', textTransform: 'uppercase' }}>Paused</Text>
                </View>
                <Text style={{ fontSize: 44, fontWeight: '900', color: '#9CA3AF', fontVariant: ['tabular-nums'] }}>
                  {formatTimer(practiceSeconds)}
                </Text>
                
                <View style={{ flexDirection: 'row', gap: 16, marginTop: 10 }}>
                  <TouchableOpacity 
                    style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#8A5CF5', alignItems: 'center', justifyContent: 'center', shadowColor: '#8A5CF5', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 4 }}
                    onPress={handleResumePracticeRecording}
                  >
                    <Ionicons name="play" size={24} color="#FFFFFF" style={{ marginLeft: 3 }} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center', shadowColor: '#EF4444', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 4 }}
                    onPress={handleStopPracticeRecording}
                  >
                    <Ionicons name="stop" size={24} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      )}

      {/* PRACTICE REPORT SCREEN */}
      {screenState === 'PRACTICE_REPORT' && (
        <ScrollView style={[styles.scrollContent, { backgroundColor: theme.background }]} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          
          {/* Header Case Details / Recorded duration */}
          <View style={{ width: '100%', backgroundColor: theme.surface, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: theme.border, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1, alignItems: 'center', marginBottom: 20 }}>
            <Text style={{ fontSize: 13, fontWeight: '800', color: '#8A5CF5', textTransform: 'uppercase', letterSpacing: 0.5 }}>Practice Analysis</Text>
            <Text style={{ fontSize: 18, fontWeight: '900', color: theme.textPrimary, marginTop: 8, textAlign: 'center' }}>
              {activeCase ? activeCase.name : 'Practice Case'}
            </Text>
            <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 4 }}>
              Recorded Duration: {formatTimer(practiceSeconds)}
            </Text>
            
            {/* Inline loader bar */}
            {isPracticeLoading && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, backgroundColor: '#FAF5FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: '#E9D5FF' }}>
                <ActivityIndicator size="small" color="#8A5CF5" />
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#8A5CF5' }}>🟣 Preparing your courtroom feedback...</Text>
              </View>
            )}
          </View>

          {/* ERROR RETRY CARD */}
          {practiceError && (
            <View style={{ width: '100%', backgroundColor: '#FEF2F2', borderRadius: 12, padding: 20, borderWidth: 1, borderColor: '#FCA5A5', alignItems: 'center', marginBottom: 20, gap: 12 }}>
              <Ionicons name="alert-circle" size={32} color="#EF4444" />
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#EF4444', textAlign: 'center' }}>Analysis couldn't be completed.</Text>
              <Text style={{ fontSize: 12, color: '#7F1D1D', textAlign: 'center', lineHeight: 18 }}>Please verify your network connection and retry generating the evaluation report.</Text>
              <TouchableOpacity 
                style={[styles.primaryBtn, { backgroundColor: '#EF4444', paddingHorizontal: 20, width: '60%' }]} 
                onPress={() => handleProcessPracticeRecording(lastPracticeTranscript)}
              >
                <Text style={styles.primaryBtnText}>Retry Analysis</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* SKELETON PLACEHOLDER */}
          {!practiceReport && !practiceError && (
            <View style={{ gap: 16 }}>
              {/* Overall Score Skeleton */}
              <View style={{ width: '100%', backgroundColor: theme.surface, borderRadius: 16, padding: 24, borderWidth: 1, borderColor: theme.border, alignItems: 'center' }}>
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#9CA3AF', textTransform: 'uppercase' }}>Overall Score</Text>
                <Animated.View style={{ opacity: skeletonPulseValue, width: 100, height: 36, backgroundColor: '#E5E7EB', borderRadius: 6, marginTop: 12 }} />
              </View>

              {/* Stats Grid Skeleton */}
              <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border, padding: 18 }]}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#9CA3AF', borderBottomWidth: 1, borderBottomColor: theme.border, paddingBottom: 8, marginBottom: 12 }}>Practice Summary</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <View key={i} style={{ width: '48%', backgroundColor: '#F9FAFB', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#F3F4F6', gap: 6 }}>
                      <Animated.View style={{ opacity: skeletonPulseValue, width: '60%', height: 10, backgroundColor: '#E5E7EB', borderRadius: 2 }} />
                      <Animated.View style={{ opacity: skeletonPulseValue, width: '40%', height: 14, backgroundColor: '#E5E7EB', borderRadius: 3 }} />
                    </View>
                  ))}
                </View>
              </View>

              {/* Skills Breakdown Skeleton */}
              <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border, padding: 18 }]}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#9CA3AF', borderBottomWidth: 1, borderBottomColor: theme.border, paddingBottom: 8, marginBottom: 12 }}>Advocacy Skills Breakdown</Text>
                <View style={{ gap: 12 }}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <View key={i} style={{ gap: 6 }}>
                      <Animated.View style={{ opacity: skeletonPulseValue, width: '40%', height: 10, backgroundColor: '#E5E7EB', borderRadius: 2 }} />
                      <Animated.View style={{ opacity: skeletonPulseValue, width: '100%', height: 6, backgroundColor: '#E5E7EB', borderRadius: 3 }} />
                    </View>
                  ))}
                </View>
              </View>

              {/* Bullets Skeleton */}
              <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border, padding: 18, gap: 10 }]}>
                <Animated.View style={{ opacity: skeletonPulseValue, width: '30%', height: 14, backgroundColor: '#E5E7EB', borderRadius: 3 }} />
                {[1, 2, 3].map((i) => (
                  <Animated.View key={i} style={{ opacity: skeletonPulseValue, width: '90%', height: 10, backgroundColor: '#E5E7EB', borderRadius: 2 }} />
                ))}
              </View>
            </View>
          )}

          {/* COMPLETED REPORT CARD */}
          {practiceReport && (
            <View style={{ gap: 16 }}>
              {/* Header Score Card */}
              <View style={{ width: '100%', backgroundColor: theme.surface, borderRadius: 16, padding: 24, borderWidth: 1, borderColor: theme.border, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2, alignItems: 'center' }}>
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#8A5CF5', textTransform: 'uppercase', letterSpacing: 0.5 }}>Practice Evaluation</Text>
                <Text style={{ fontSize: 48, fontWeight: '900', color: '#8A5CF5', marginTop: 12 }}>
                  {practiceReport.overallScore || 80}/100
                </Text>
                <Text style={{ fontSize: 14, color: theme.textSecondary, marginTop: 4, textAlign: 'center' }}>
                  Keep practicing to master your courtroom delivery!
                </Text>
              </View>

              {/* Practice Summary Stats Card */}
              <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border, padding: 18 }]}>
                <Text style={[styles.cardTitle, { color: theme.textPrimary, fontSize: 14, fontWeight: '800', borderBottomWidth: 1, borderBottomColor: theme.border, paddingBottom: 8, marginBottom: 12 }]}>Practice Summary</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                  <View style={{ width: '48%', backgroundColor: '#F9FAFB', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#F3F4F6' }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase' }}>Speaking Time</Text>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: theme.textPrimary, marginTop: 4 }}>{practiceReport.summary?.speakingTime || '02:15'}</Text>
                  </View>
                  <View style={{ width: '48%', backgroundColor: '#F9FAFB', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#F3F4F6' }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase' }}>Word Count</Text>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: theme.textPrimary, marginTop: 4 }}>{practiceReport.summary?.words || 0}</Text>
                  </View>
                  <View style={{ width: '48%', backgroundColor: '#F9FAFB', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#F3F4F6' }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase' }}>Average Pace</Text>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: theme.textPrimary, marginTop: 4 }}>{practiceReport.summary?.averagePace || 'N/A'}</Text>
                  </View>
                  <View style={{ width: '48%', backgroundColor: '#F9FAFB', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#F3F4F6' }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase' }}>Confidence</Text>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: theme.textPrimary, marginTop: 4 }}>{practiceReport.summary?.confidence || 'High'}</Text>
                  </View>
                  <View style={{ width: '48%', backgroundColor: '#F9FAFB', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#F3F4F6' }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase' }}>Long Pauses</Text>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: theme.textPrimary, marginTop: 4 }}>{practiceReport.summary?.longPauses || 0}</Text>
                  </View>
                  <View style={{ width: '48%', backgroundColor: '#F9FAFB', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#F3F4F6' }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase' }}>Filler Words</Text>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: theme.textPrimary, marginTop: 4 }}>{practiceReport.summary?.fillerWords || 0}</Text>
                  </View>
                </View>
              </View>

              {/* Scores Evaluation Grid */}
              <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border, padding: 18 }]}>
                <Text style={[styles.cardTitle, { color: theme.textPrimary, fontSize: 14, fontWeight: '800', borderBottomWidth: 1, borderBottomColor: theme.border, paddingBottom: 8, marginBottom: 12 }]}>Advocacy Skills Breakdown</Text>
                <View style={{ gap: 10 }}>
                  {practiceReport.scores && Object.entries(practiceReport.scores).map(([key, val]) => {
                    const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                    const numVal = Number(val) || 0;
                    return (
                      <View key={key} style={{ gap: 4 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={{ fontSize: 12, fontWeight: '700', color: theme.textPrimary }}>{label}</Text>
                          <Text style={{ fontSize: 12, fontWeight: '800', color: '#8A5CF5' }}>{numVal}/10</Text>
                        </View>
                        <View style={{ width: '100%', height: 6, backgroundColor: '#E5E7EB', borderRadius: 3, overflow: 'hidden' }}>
                          <View style={{ width: `${numVal * 10}%`, height: '100%', backgroundColor: '#8A5CF5', borderRadius: 3 }} />
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>

              {/* Strengths Card */}
              <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border, borderLeftWidth: 4, borderLeftColor: '#10B981', padding: 18 }]}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#10B981', marginBottom: 10 }}>✓ Key Strengths</Text>
                <View style={{ gap: 6 }}>
                  {(practiceReport.strengths || []).map((s: string, idx: number) => (
                    <Text key={idx} style={{ fontSize: 13, color: theme.textSecondary, lineHeight: 18 }}>• {s}</Text>
                  ))}
                </View>
              </View>

              {/* Weaknesses Card */}
              <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border, borderLeftWidth: 4, borderLeftColor: '#F59E0B', padding: 18 }]}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#F59E0B', marginBottom: 10 }}>⚠ Areas for Improvement</Text>
                <View style={{ gap: 6 }}>
                  {(practiceReport.weaknesses || []).map((w: string, idx: number) => (
                    <Text key={idx} style={{ fontSize: 13, color: theme.textSecondary, lineHeight: 18 }}>• {w}</Text>
                  ))}
                </View>
              </View>

              {/* Suggestions Card */}
              <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border, borderLeftWidth: 4, borderLeftColor: '#4F46E5', padding: 18 }]}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#4F46E5', marginBottom: 10 }}>💡 Coach Recommendations</Text>
                <View style={{ gap: 6 }}>
                  {(practiceReport.suggestions || []).map((s: string, idx: number) => (
                    <Text key={idx} style={{ fontSize: 13, color: theme.textSecondary, lineHeight: 18 }}>• {s}</Text>
                  ))}
                </View>
              </View>

              {/* Improved Version Card */}
              <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border, padding: 18, marginBottom: 4 }]}>
                <Text style={[styles.cardTitle, { color: theme.textPrimary, fontSize: 14, fontWeight: '800', borderBottomWidth: 1, borderBottomColor: theme.border, paddingBottom: 8, marginBottom: 10 }]}>Suggested Rewrite (Courtroom Ready)</Text>
                <Text style={{ fontSize: 13.5, color: '#4C1D95', fontStyle: 'italic', lineHeight: 20, backgroundColor: '#FAF5FF', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#F3E8FF' }}>
                  "{practiceReport.improvedVersion}"
                </Text>
              </View>
            </View>
          )}

          {/* Action Buttons (visible only when report is ready or in error state) */}
          {(practiceReport || practiceError) && (
            <View style={{ gap: 12, marginTop: 12, marginBottom: 20 }}>
              <TouchableOpacity style={styles.primaryBtn} onPress={() => setScreenState('MODE_SELECTION')}>
                <Text style={styles.primaryBtnText}>Practice Again</Text>
              </TouchableOpacity>
              
              {practiceReport && (
                <>
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <TouchableOpacity style={[styles.outlineBtn, { flex: 1, borderColor: '#8A5CF5', borderWidth: 1, paddingVertical: 12, borderRadius: 8 }]} onPress={exportPracticePDF}>
                      <Text style={{ color: '#8A5CF5', fontWeight: '800', fontSize: 13, textAlign: 'center' }}>📄 Download Report</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.outlineBtn, { flex: 1, borderColor: '#8A5CF5', borderWidth: 1, paddingVertical: 12, borderRadius: 8 }]} onPress={sharePracticeReport}>
                      <Text style={{ color: '#8A5CF5', fontWeight: '800', fontSize: 13, textAlign: 'center' }}>🔗 Share Report</Text>
                    </TouchableOpacity>
                  </View>
                  
                  <TouchableOpacity 
                    style={[styles.outlineBtn, { backgroundColor: '#F3F4F6', borderColor: '#E5E7EB', borderWidth: 1, paddingVertical: 12, borderRadius: 8 }]} 
                    onPress={() => {
                      showToast('success', 'Practice Saved', 'Evaluation report successfully saved to history.');
                    }}
                  >
                    <Text style={{ color: '#4B5563', fontWeight: '800', fontSize: 13, textAlign: 'center' }}>💾 Save Practice</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}

        </ScrollView>
      )}

      {/* Practice Recording History Modal */}
      <Modal visible={isHistoryModalVisible} transparent={true} animationType="slide">
        <View style={styles.modalBg}>
          <View style={[styles.coachBottomSheet, { backgroundColor: '#FFFFFF', height: '70%', paddingBottom: 24 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#111827' }}>Practice History</Text>
              <TouchableOpacity onPress={() => setIsHistoryModalVisible(false)}>
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {practiceHistory.length === 0 ? (
                <Text style={{ color: '#6B7280', textAlign: 'center', marginTop: 40 }}>No practice history found.</Text>
              ) : (
                practiceHistory.map((item, idx) => (
                  <TouchableOpacity 
                    key={idx} 
                    style={{ borderBottomWidth: 1, borderBottomColor: '#F3F4F6', paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
                    onPress={() => {
                      setPracticeReport(item.report);
                      setPracticeSeconds(parseInt(item.duration.split(':')[0]) * 60 + parseInt(item.duration.split(':')[1]));
                      setScreenState('PRACTICE_REPORT');
                      setIsHistoryModalVisible(false);
                    }}
                  >
                    <View style={{ gap: 4 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827' }}>{item.caseName}</Text>
                      <Text style={{ fontSize: 11, color: '#6B7280' }}>{item.date} • {item.duration}</Text>
                    </View>
                    <View style={{ backgroundColor: '#EEF2FF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: '#4F46E5' }}>{item.score}/100</Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* VERDICT SUMMARY */}
      {screenState === 'VERDICT' && (
        <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={[styles.verdictCard, { borderColor: '#8A5CF5', backgroundColor: theme.surface }]}>
            <Text style={styles.verdictLabel}>⚖️ AI Verdict Decision</Text>
            <Text style={[styles.verdictTitle, { color: theme.textPrimary }]}>Complaint Allowed</Text>
            <Text style={{ fontSize: 13, color: theme.textSecondary, lineHeight: 18, marginTop: 6 }}>
              The Complainant successfully established signature execution. The defense failed to rebut the legal presumption of outstanding debt under Section 139 of the NI Act.
            </Text>
          </View>

          <View style={[styles.gradeOverallCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={{ fontSize: 12, color: theme.textSecondary }}>Final Advocacy Grade</Text>
            <Text style={{ fontSize: 36, fontWeight: '900', color: '#8A5CF5', marginTop: 4 }}>{advocacyScore} / 100</Text>
          </View>

          <TouchableOpacity style={styles.primaryBtn} onPress={() => setScreenState('MODE_SELECTION')}>
            <Text style={styles.primaryBtnText}>Return to Mode Selector</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    padding: 10,
    borderBottomWidth: 1.5,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    padding: 4,
  },
  headerCourt: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  headerCase: {
    fontSize: 13,
    fontWeight: '900',
    marginTop: 2,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
    marginRight: 4,
  },
  liveText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#EF4444',
  },
  timelineBar: {
    paddingVertical: 8,
    borderBottomWidth: 1.5,
  },
  scrollContent: {
    flex: 1,
    padding: 14,
  },
  card: {
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    marginBottom: 6,
  },
  cardDesc: {
    fontSize: 12.5,
    lineHeight: 18,
    marginBottom: 14,
  },
  modeCard: {
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  bulletItem: {
    fontSize: 11,
    color: '#4B5563',
  },
  primaryBtn: {
    backgroundColor: '#8A5CF5',
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  chatScroll: {
    flex: 1,
  },
  inputBar: {
    flexDirection: 'row',
    padding: 10,
    borderTopWidth: 1.5,
    alignItems: 'center',
    gap: 8,
  },
  inputField: {
    flex: 1,
    height: 38,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  sendBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verdictCard: {
    borderWidth: 2,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  verdictLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8A5CF5',
    textTransform: 'uppercase',
  },
  verdictTitle: {
    fontSize: 18,
    fontWeight: '900',
    marginTop: 4,
  },
  gradeOverallCard: {
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 14,
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  coachBottomSheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    paddingBottom: 24,
    gap: 12,
  },
  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loaderText: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: 12,
  },
  setupChoiceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  choiceIconBg: {
    width: 46,
    height: 46,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caseRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  outlineBtn: {
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  outlineBtnText: {
    fontWeight: '700',
    fontSize: 13,
  },
});
