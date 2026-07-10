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
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
// @ts-ignore
// eslint-disable-next-line import/no-unresolved
import { Ionicons } from '@expo/vector-icons';
import { useToastContext, useThemeContext } from '@/providers';
import { CaseWorkspace } from '@/types';

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

  // Main Screen States: 'DASHBOARD' | 'WIZARD' | 'MODE_SELECTION' | 'LAUNCHING' | 'COURTROOM' | 'VERDICT' | 'PRACTICE_RECORDING' | 'PRACTICE_REPORT'
  const [screenState, setScreenState] = useState<'DASHBOARD' | 'WIZARD' | 'MODE_SELECTION' | 'LAUNCHING' | 'COURTROOM' | 'VERDICT' | 'PRACTICE_RECORDING' | 'PRACTICE_REPORT'>('DASHBOARD');

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

  // Performance scoring state variables
  const [advocacyScore, setAdvocacyScore] = useState(85);
  const [judgeSatisfaction, setJudgeSatisfaction] = useState(80);
  const [evidenceUsage, setEvidenceUsage] = useState(78);
  const [persuasiveness, setPersuasiveness] = useState(82);

  // Active AI Coach suggestions
  const [coachTip, setCoachTip] = useState('State Cheque execution details. Reference Rangappa.');
  const [isCoachModalVisible, setIsCoachModalVisible] = useState(false);

  // Voice Interaction States
  const [isListening, setIsListening] = useState(false);
  const [speechTranscript, setSpeechTranscript] = useState('');
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);

  // Waveform Bar Animations
  const animValue = useRef(new Animated.Value(1)).current;
  const pulseValue = useRef(new Animated.Value(1)).current;

  // Practice Recording States
  const [practiceSeconds, setPracticeSeconds] = useState(0);
  const [isPracticeRecording, setIsPracticeRecording] = useState(false);
  const practiceTimerRef = useRef<any>(null);

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
      setPracticeSeconds(0);
      setIsPracticeRecording(true);
      practiceTimerRef.current = setInterval(() => {
        setPracticeSeconds((prev) => prev + 1);
      }, 1000);
      return;
    }

    setScreenState('LAUNCHING');
    setRoundNumber(1);
    setActiveStage('Opening Statement');
    setAdvocacyScore(85);
    setJudgeSatisfaction(80);
    setEvidenceUsage(78);
    setPersuasiveness(82);

    setTimeout(() => {
      setScreenState('COURTROOM');
      setMessages([
        {
          id: '1',
          sender: 'clerk',
          senderName: '📋 Clerk of Court',
          text: 'Order, Order. Delhi Sessions Court is now taking up Supreme Fabrics v. Modern Outfitters under Section 138. Presiding: Hon\'ble Justice R. K. Shrivastava. Complainant Counsel, please begin your opening arguments.',
          timestamp: '13:30'
        }
      ]);
      if (mode === 'voice') {
        speakResponse('Order, Order. Delhi Sessions Court is now taking up Supreme Fabrics v. Modern Outfitters. Counsel, please begin.');
      }
    }, 1800);
  };

  // Simulated Speech Output
  const speakResponse = (text: string) => {
    setIsAiSpeaking(true);
    // Simulate speaking duration
    setTimeout(() => {
      setIsAiSpeaking(false);
    }, 4500);
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
      senderName: '👤 Advocate (You)',
      text: speechText,
      timestamp: '13:31',
      coachFeedback: {
        accuracy: Math.floor(82 + Math.random() * 15),
        logic: Math.floor(84 + Math.random() * 14),
        evidence: Math.floor(78 + Math.random() * 20),
        persuasion: Math.floor(80 + Math.random() * 15),
        suggestion: 'Focus on statutory timeline and postal delivery logs next.'
      }
    };

    setMessages((prev) => [...prev, userMsg]);
    triggerAiResponse(speechText);
  };

  // Microphone toggle button action (Speech-to-Text mock simulation)
  const handlePressMicrophone = () => {
    if (isListening) {
      setIsListening(false);
      // Simulate speech recognized successfully
      if (speechTranscript) {
        handleSendAdvocateSpeech(speechTranscript);
      } else {
        const simulatedSpeech = actionChips[0]?.val || 'My Lord, we submit statutory notices are fully complied.';
        handleSendAdvocateSpeech(simulatedSpeech);
      }
      setSpeechTranscript('');
    } else {
      setIsListening(true);
      setSpeechTranscript('Transcribing: "My Lord, I submit invoice P-1 matching the cheque amount..."');
      // Automatically finish listening after 3s
      setTimeout(() => {
        setIsListening(false);
        const finalSpeechText = 'My Lord, I submit invoice P-1 matching the cheque amount.';
        handleSendAdvocateSpeech(finalSpeechText);
        setSpeechTranscript('');
      }, 3000);
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

  // Stop Practice Recording
  const handleStopPracticeRecording = () => {
    if (practiceTimerRef.current) {
      clearInterval(practiceTimerRef.current);
    }
    setIsPracticeRecording(false);
    setScreenState('LAUNCHING');
    setTimeout(() => {
      setScreenState('PRACTICE_REPORT');
    }, 1800);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
      
      {/* IMMERSIVE COMPACT HEADER */}
      <View style={[styles.headerContainer, { backgroundColor: theme.surface, borderColor: theme.border, paddingVertical: 10 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color={theme.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={{ fontSize: 10, fontWeight: '800', color: '#8A5CF5', textTransform: 'uppercase' }}>
              Delhi Sessions Court • Simulator Room
            </Text>
            <Text style={{ fontSize: 13, fontWeight: '900', color: theme.textPrimary }} numberOfLines={1}>
              Apex Fabrics v. Modern Outfitters
            </Text>
          </View>
          <View style={styles.liveBadge}>
            <View style={styles.greenDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>

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

      {/* DASHBOARD SCREEN */}
      {screenState === 'DASHBOARD' && (
        <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border, marginTop: 12 }]}>
            <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>AI virtual courtroom room</Text>
            <Text style={[styles.cardDesc, { color: theme.textSecondary }]}>
              Enter a voice-first simulation presenting arguments, cross-examining witness logs, and defending objections.
            </Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => setScreenState('MODE_SELECTION')}>
              <Text style={styles.primaryBtnText}>Launch Simulation Room</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* 11. CHOOSE SIMULATION MODE SCREEN */}
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
          <Text style={[styles.loaderText, { color: theme.textPrimary }]}>Configuring Simulated Courtroom...</Text>
        </View>
      )}

      {/* IMMERSIVE VOICE / TEXT COURTROOM INTERFACE */}
      {screenState === 'COURTROOM' && (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          
          {/* SLIM STEP PROGRESS INDICATOR */}
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

          {/* CHAT DISPLAY PORT AREA */}
          <ScrollView
            ref={chatScrollRef}
            style={styles.chatScroll}
            contentContainerStyle={{ padding: 14, gap: 12, flexGrow: 1, justifyContent: 'center' }}
          >
            {/* Show only active speaker bubble in voice mode to keep clean layout */}
            {hearingMode === 'voice' ? (
              <View style={{ gap: 12, alignItems: 'center' }}>
                
                {/* 8. Pulse Animation Avatar for active speaker */}
                <Animated.View style={{
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  backgroundColor: isAiSpeaking ? '#8A5CF5' : '#3B82F6',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transform: [{ scale: pulseValue }],
                  ...Platform.select({
                    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4 },
                    android: { elevation: 4 }
                  })
                }}>
                  <Ionicons name={isAiSpeaking ? 'scale-outline' : 'mic-outline'} size={32} color="#FFFFFF" />
                </Animated.View>

                {/* Subtitle Transcript block */}
                <View style={{ backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: 14, padding: 14, width: '92%' }}>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: isAiSpeaking ? '#8A5CF5' : '#3B82F6', textTransform: 'uppercase', marginBottom: 4 }}>
                    {isAiSpeaking ? 'Hon\'ble Judge (Speaking)' : 'Advocate Counsel'}
                  </Text>
                  <Text style={{ fontSize: 13, lineHeight: 18, color: theme.textPrimary, textAlign: 'center' }}>
                    {isListening ? speechTranscript : (messages[messages.length - 1]?.text || 'Hearing initiated. Submit your opening argument statement.')}
                  </Text>
                </View>
              </View>
            ) : (
              // Text mode shows scrollable list
              messages.map((m) => {
                const isUser = m.sender === 'advocate';
                const isJudge = m.sender === 'judge';
                const accentColor = isUser ? '#8A5CF5' : isJudge ? '#8A5CF5' : '#3B82F6';
                return (
                  <View key={m.id} style={{ alignSelf: isUser ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                    <View style={{ backgroundColor: theme.card, borderRadius: 12, borderLeftWidth: 4, borderLeftColor: accentColor, padding: 10, elevation: 1 }}>
                      <Text style={{ fontSize: 9.5, fontWeight: '800', color: accentColor, marginBottom: 2 }}>{m.senderName}</Text>
                      <Text style={{ fontSize: 12.5, color: theme.textPrimary }}>{m.text}</Text>
                    </View>
                  </View>
                );
              })
            )}

            {isAiThinking && (
              <ActivityIndicator size="small" color="#8A5CF5" style={{ marginVertical: 10 }} />
            )}
          </ScrollView>

          {/* 6. FLOATING AI COACH FLOATING CARD BUTTON */}
          <View style={{ position: 'absolute', right: 16, top: 70, zIndex: 30 }}>
            <TouchableOpacity 
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: '#FAF5FF',
                borderWidth: 1.5,
                borderColor: '#E9D5FF',
                alignItems: 'center',
                justifyContent: 'center',
                elevation: 3
              }}
              onPress={() => setIsCoachModalVisible(true)}
            >
              <Ionicons name="bulb-outline" size={22} color="#8A5CF5" />
            </TouchableOpacity>
          </View>

          {/* AI Coach Overlay Bottom Sheet Modal */}
          <Modal
            animationType="slide"
            transparent={true}
            visible={isCoachModalVisible}
            onRequestClose={() => setIsCoachModalVisible(false)}
          >
            <View style={styles.modalBg}>
              <View style={[styles.coachBottomSheet, { backgroundColor: theme.surface }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <Text style={{ fontSize: 15, fontWeight: '900', color: '#8A5CF5' }}>🧠 AI Coach Workspace Assistant</Text>
                  <TouchableOpacity onPress={() => setIsCoachModalVisible(false)}>
                    <Ionicons name="close" size={20} color={theme.textPrimary} />
                  </TouchableOpacity>
                </View>
                <Text style={{ fontSize: 13, color: theme.textSecondary, marginBottom: 8 }}>
                  • Suggested citation: <Text style={{ fontWeight: '700' }}>Rangappa v. Sri Mohan (2010) 11 SCC 441</Text>
                </Text>
                <Text style={{ fontSize: 13, color: theme.textSecondary, marginBottom: 8 }}>
                  • Missing evidence: Present HDFC bank return memo slip.
                </Text>
                <Text style={{ fontSize: 13, color: theme.textSecondary, marginBottom: 8 }}>
                  • Recommendation: {coachTip}
                </Text>
                <TouchableOpacity style={styles.primaryBtn} onPress={() => setIsCoachModalVisible(false)}>
                  <Text style={styles.primaryBtnText}>Resume Court Hearing</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          {/* Suggestions row above Microphone/Input */}
          <View style={{ paddingHorizontal: 12, paddingVertical: 4 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {actionChips.map((chip, cIdx) => (
                <TouchableOpacity
                  key={cIdx}
                  style={{ backgroundColor: '#FAF5FF', borderWidth: 1, borderColor: '#E9D5FF', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5 }}
                  onPress={() => handleSendAdvocateSpeech(chip.val)}
                >
                  <Text style={{ fontSize: 11, color: '#8A5CF5', fontWeight: '700' }}>💡 {chip.text}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Objections panel row */}
          <View style={{ paddingHorizontal: 12, paddingVertical: 4 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {['Hearsay', 'Relevance', 'Leading Question'].map((obj) => (
                <TouchableOpacity
                  key={obj}
                  style={{ backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FCA5A5', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5, flexDirection: 'row', alignItems: 'center' }}
                  onPress={() => handleRaiseObjection(obj)}
                >
                  <Ionicons name="shield-outline" size={11} color="#EF4444" style={{ marginRight: 3 }} />
                  <Text style={{ fontSize: 10.5, color: '#EF4444', fontWeight: '700' }}>{obj}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* VOICE MODE COMPOSER (MICROPHONE) OR TEXT FALLBACK BOX */}
          {hearingMode === 'voice' && !showKeyboardFallback ? (
            <View style={{ alignItems: 'center', paddingVertical: 14, borderTopWidth: 1, borderTopColor: theme.border, backgroundColor: theme.surface }}>
              
              {/* Voice waveforms */}
              {(isListening || isAiSpeaking) && (
                <View style={{ flexDirection: 'row', gap: 4, height: 16, marginBottom: 8, alignItems: 'center' }}>
                  {[1, 2, 3, 4, 5, 4, 3, 2, 1].map((bar, bIdx) => (
                    <View key={bIdx} style={{ width: 3, height: bar * 3, backgroundColor: '#8A5CF5', borderRadius: 1.5 }} />
                  ))}
                </View>
              )}

              {/* Glowing Mic button */}
              <TouchableOpacity
                style={{
                  width: 66,
                  height: 66,
                  borderRadius: 33,
                  backgroundColor: isListening ? '#EF4444' : '#8A5CF5',
                  alignItems: 'center',
                  justifyContent: 'center',
                  elevation: 4
                }}
                onPress={handlePressMicrophone}
              >
                <Ionicons name={isListening ? 'mic-off' : 'mic'} size={28} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 6 }}>
                {isListening ? 'Listening... Tap to send speech' : 'Tap to speak argument verbally'}
              </Text>

              {/* Text Fallback Toggle button */}
              <TouchableOpacity 
                style={{ marginTop: 8 }} 
                onPress={() => setShowKeyboardFallback(true)}
              >
                <Text style={{ fontSize: 11, color: '#8A5CF5', fontWeight: '800' }}>Keyboard Fallback</Text>
              </TouchableOpacity>
            </View>
          ) : (
            // Text fallback/composer
            <View style={[styles.inputBar, { borderTopColor: theme.border, backgroundColor: theme.surface }]}>
              <TextInput
                style={[styles.inputField, { color: theme.textPrimary }]}
                value={userReply}
                onChangeText={setUserReply}
                placeholder="Submit text arguments..."
                placeholderTextColor={theme.placeholder}
              />
              <TouchableOpacity
                style={[styles.sendBtn, { backgroundColor: '#8A5CF5' }]}
                onPress={() => {
                  handleSendAdvocateSpeech(userReply);
                  setUserReply('');
                  if (hearingMode === 'voice') setShowKeyboardFallback(false);
                }}
              >
                <Ionicons name="send" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          )}

        </KeyboardAvoidingView>
      )}

      {/* PRACTICE RECORDING RUNNING PAGE */}
      {screenState === 'PRACTICE_RECORDING' && (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20 }}>
          <Text style={{ fontSize: 18, fontWeight: '900', color: theme.textPrimary }}>
            Advocacy Audition Recording
          </Text>
          <Text style={{ fontSize: 12, color: theme.textSecondary }}>
            Present your uninterrupted oral submissions now.
          </Text>

          <View style={{ width: 120, height: 120, borderRadius: 60, backgroundColor: '#EF4444', alignItems: 'center', alignSelf: 'center', justifyContent: 'center', elevation: 4 }}>
            <Ionicons name="videocam" size={48} color="#FFFFFF" />
          </View>

          <Text style={{ fontSize: 24, fontWeight: '800', color: theme.textPrimary }}>
            {formatTimer(practiceSeconds)}
          </Text>

          <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: '#EF4444', width: '80%' }]} onPress={handleStopPracticeRecording}>
            <Text style={styles.primaryBtnText}>Stop & Analyze Submissions</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* PRACTICE REPORT SCREEN */}
      {screenState === 'PRACTICE_REPORT' && (
        <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={[styles.verdictCard, { borderColor: '#8A5CF5', backgroundColor: theme.surface }]}>
            <Text style={{ fontSize: 11, fontWeight: '800', color: '#8A5CF5' }}>🎥 Practice Recording Analysis</Text>
            <Text style={[styles.verdictTitle, { color: theme.textPrimary }]}>Evaluation: 88 / 100</Text>
            <Text style={{ fontSize: 12.5, color: theme.textSecondary, marginTop: 4 }}>
              Advocacy rating is Excellent. Speech pacing is correct at 135 words/minute.filler words usage: 2 (like, um).
            </Text>
          </View>

          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Core Score Indicators</Text>
            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 12.5 }}>• Legal Accuracy: 89%</Text>
              <Text style={{ fontSize: 12.5 }}>• Confidence & Pace: 92%</Text>
              <Text style={{ fontSize: 12.5 }}>• Citation usage: 82%</Text>
              <Text style={{ fontSize: 12.5 }}>• speaking Clarity: 90%</Text>
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={{ fontSize: 13, fontWeight: '800', color: '#10B981', marginBottom: 4 }}>✓ Strong arguments</Text>
            <Text style={{ fontSize: 12.5, color: theme.textSecondary }}>
              Good logic linking invoice dates with delivery speed post receipts.
            </Text>
          </View>

          <View style={{ gap: 10, marginVertical: 20 }}>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => setScreenState('MODE_SELECTION')}>
              <Text style={styles.primaryBtnText}>Practice Again</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

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
});
