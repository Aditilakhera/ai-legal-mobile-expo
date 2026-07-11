/**
 * AI Legal Mobile - Premium Cinematic Light Theme Onboarding Screen
 * Features a completely redesigned high-fidelity female chibi Virtual Legal Advisor
 * modeled 100% exactly after the target cartoon advocate in the reference image:
 * - Cute chibi proportions (large head, small balanced rounded body, soft curves).
 * - Thick black outlines on all body, hair, and clothing elements for a premium cartoon feel.
 * - Hands naturally joined/crossed in front of the body at all times (polite greeting posture).
 * - Sweeping forehead hair bangs framing the round face, side ear peeks, and blush cheeks.
 * - Grey/Black coat suit with crossover white shirt collar and double advocate neck bands.
 * - High performance isolated typewriter text and clean idle animations (blinking, breathing, swaying).
 * Shshifted slightly downwards and floating panels moved closer to the mascot.
 * Features an expanded Roadmap Nodes card size (height: 95px, width: 105px) to prevent text clipping.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Animated,
  Dimensions,
  Easing,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
// @ts-ignore
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

interface SpeechToken {
  text: string;
  bold?: boolean;
}

interface SlideInfo {
  topic: string;
  tokens: SpeechToken[];
  icon: string;
  accentGlow: string;
}

// ─── High Performance Isolated Typewriter Sub-component ───────────────────
// TypewriterText removed to handle typing, cursor, and speech state directly within OnboardingScreen.

export default function OnboardingScreen() {
  const router = useRouter();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [visibleCount, setVisibleCount] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isBlinkingCursor, setIsBlinkingCursor] = useState(false);

  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextSlideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speakEndTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cursorOpacity = useRef(new Animated.Value(1)).current;

  const slides: SlideInfo[] = [
    {
      topic: 'Welcome',
      tokens: [
        { text: 'Welcome to ' },
        { text: 'AI Legal', bold: true },
        { text: '. I will show you how AI Legal helps ' },
        { text: 'advocates and law firms', bold: true },
        { text: ' work ' },
        { text: 'faster and smarter', bold: true },
        { text: '.' }
      ],
      icon: 'sparkles-outline',
      accentGlow: '#6D5DFC',
    },
    {
      topic: 'Contract Analyzer',
      tokens: [
        { text: 'Upload ' },
        { text: 'any agreement', bold: true },
        { text: ' and receive an ' },
        { text: 'AI-powered legal review', bold: true },
        { text: ', clause analysis, compliance checks and risk detection.' }
      ],
      icon: 'document-text-outline',
      accentGlow: '#3B82F6',
    },
    {
      topic: 'My Cases · Legal CRM',
      tokens: [
        { text: 'Organise ' },
        { text: 'cases', bold: true },
        { text: ', ' },
        { text: 'clients', bold: true },
        { text: ', documents, ' },
        { text: 'evidence', bold: true },
        { text: ', hearings, notes, timelines and ' },
        { text: 'AI insights', bold: true },
        { text: ' in one unified legal workspace.' }
      ],
      icon: 'briefcase-outline',
      accentGlow: '#0EA5E9',
    },
    {
      topic: 'Case Predictor',
      tokens: [
        { text: 'Analyze ' },
        { text: 'evidence', bold: true },
        { text: ', estimate ' },
        { text: 'litigation outcomes', bold: true },
        { text: ' and identify strengths, weaknesses and courtroom scenarios.' }
      ],
      icon: 'stats-chart-outline',
      accentGlow: '#EF4444',
    },
    {
      topic: 'Strategy Engine',
      tokens: [
        { text: 'Generate complete ' },
        { text: 'litigation strategy', bold: true },
        { text: ' including arguments, ' },
        { text: 'evidence roadmap', bold: true },
        { text: ', negotiation tactics and court prep.' }
      ],
      icon: 'trail-sign-outline',
      accentGlow: '#10B981',
    },
    {
      topic: 'AI Drafting',
      tokens: [
        { text: 'Draft ' },
        { text: 'professional legal documents', bold: true },
        { text: ' instantly with AI while maintaining legal ' },
        { text: 'formatting and structure', bold: true },
        { text: '.' }
      ],
      icon: 'create-outline',
      accentGlow: '#F59E0B',
    },
    {
      topic: 'Ready',
      tokens: [
        { text: 'You are now ready to ' },
        { text: 'experience AI Legal', bold: true },
        { text: '. Let\'s get started with your ' },
        { text: 'litigation dashboard', bold: true },
        { text: '.' }
      ],
      icon: 'shield-checkmark-outline',
      accentGlow: '#6366F1',
    },
  ];

  // ─── Animation Values ──────────────────────────────────────────────────
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  // Character Base Animations
  const breathing = useRef(new Animated.Value(0)).current;
  const blinking = useRef(new Animated.Value(1)).current;
  const mouthSpeech = useRef(new Animated.Value(1)).current;
  const bodyWeightShift = useRef(new Animated.Value(0)).current;

  // Position shifts between slides (shifted downwards by 35px)
  const charX = useRef(new Animated.Value(0)).current;
  const charY = useRef(new Animated.Value(45)).current;

  // Looking direction sequence values (programmed eyes & head tilt)
  const eyeOffsetX = useRef(new Animated.Value(0)).current;
  const eyeOffsetY = useRef(new Animated.Value(0)).current;
  const headTurn = useRef(new Animated.Value(0)).current;
  const hairTilt = useRef(new Animated.Value(0)).current;

  // Background Hologram aura pulse
  const holoPulse = useRef(new Animated.Value(1)).current;
  const floatIcons = useRef(new Animated.Value(0)).current;

  // Feature animation values
  const laserScannerY = useRef(new Animated.Value(0)).current;
  const outcomeDialProgress = useRef(new Animated.Value(0)).current;
  const roadFilingProgress = useRef(new Animated.Value(0)).current;
  const documentTyping = useRef(new Animated.Value(0)).current;

  // Looking target state selector: 'user' | 'text' | 'feature'
  const [lookTarget, setLookTarget] = useState<'user' | 'text' | 'feature'>('user');

  // ─── Play Continuous Idle Animations ─────────────────────────────────────
  useEffect(() => {
    // 1. Natural Breathing loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(breathing, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(breathing, {
          toValue: 0,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // 2. Weight shifting / organic sway
    Animated.loop(
      Animated.sequence([
        Animated.timing(bodyWeightShift, {
          toValue: 1,
          duration: 3500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(bodyWeightShift, {
          toValue: 0,
          duration: 3500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // 3. Floating legal elements loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatIcons, {
          toValue: 1,
          duration: 2800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(floatIcons, {
          toValue: 0,
          duration: 2800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // 4. Background Hologram Glow Pulsing
    Animated.loop(
      Animated.sequence([
        Animated.timing(holoPulse, {
          toValue: 1.12,
          duration: 1900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(holoPulse, {
          toValue: 0.9,
          duration: 2100,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  // Eye blinking loops
  useEffect(() => {
    let blinkTimer: any;
    const triggerBlink = () => {
      Animated.sequence([
        Animated.timing(blinking, {
          toValue: 0.1,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.timing(blinking, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();

      const nextTime = 2800 + Math.random() * 2200;
      blinkTimer = setTimeout(triggerBlink, nextTime);
    };

    triggerBlink();
    return () => clearTimeout(blinkTimer);
  }, []);

  const startTyping = (slideIndex: number) => {
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (nextSlideTimeoutRef.current) clearTimeout(nextSlideTimeoutRef.current);
    if (speakEndTimeoutRef.current) clearTimeout(speakEndTimeoutRef.current);

    const tokens = slides[slideIndex].tokens;
    const chars: { char: string; bold?: boolean }[] = [];
    tokens.forEach((t) => {
      for (let i = 0; i < t.text.length; i++) {
        chars.push({ char: t.text[i], bold: t.bold });
      }
    });

    setVisibleCount(0);
    setIsSpeaking(true);
    setIsBlinkingCursor(true);

    let currentIndex = 0;

    const typeNextChar = () => {
      if (currentIndex < chars.length) {
        currentIndex++;
        setVisibleCount(currentIndex);

        const lastChar = chars[currentIndex - 1].char;
        let delay = 20 + Math.random() * 15; // 20-35ms

        if (lastChar === '.' || lastChar === '?' || lastChar === '!') {
          delay = 400; // Punctuation pause
        } else if (lastChar === ',') {
          delay = 200; // Comma pause
        }

        typingTimeoutRef.current = setTimeout(typeNextChar, delay);
      } else {
        // Typing complete — stop animations, wait for user to press Next
        speakEndTimeoutRef.current = setTimeout(() => {
          setIsSpeaking(false);
          setIsBlinkingCursor(false);
        }, 400);
      }
    };

    typingTimeoutRef.current = setTimeout(typeNextChar, 100);
  };

  // Blinking cursor opacity loop
  useEffect(() => {
    let cursorSequence: Animated.CompositeAnimation | null = null;
    if (isBlinkingCursor) {
      cursorOpacity.setValue(1);
      cursorSequence = Animated.loop(
        Animated.sequence([
          Animated.timing(cursorOpacity, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(cursorOpacity, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      );
      cursorSequence.start();
    } else {
      cursorOpacity.setValue(0);
    }
    return () => {
      if (cursorSequence) cursorSequence.stop();
    };
  }, [isBlinkingCursor]);

  // Speaking mouth movement loop
  useEffect(() => {
    let mouthSequence: Animated.CompositeAnimation | null = null;
    if (isSpeaking) {
      mouthSpeech.setValue(1);
      mouthSequence = Animated.loop(
        Animated.sequence([
          Animated.timing(mouthSpeech, {
            toValue: 0.3,
            duration: 80,
            useNativeDriver: true,
          }),
          Animated.timing(mouthSpeech, {
            toValue: 1,
            duration: 90,
            useNativeDriver: true,
          }),
        ])
      );
      mouthSequence.start();
    } else {
      mouthSpeech.setValue(1);
    }
    return () => {
      if (mouthSequence) mouthSequence.stop();
    };
  }, [isSpeaking]);

  // Dialogue look sequences
  useEffect(() => {
    const totalSlideChars = slides[currentSlide].tokens.reduce((acc, t) => acc + t.text.length, 0);
    const typingDuration = totalSlideChars * 30;

    setLookTarget('user');

    const lookFeatureTimer = setTimeout(() => {
      setLookTarget('feature');
    }, typingDuration * 0.25);

    const lookTextTimer = setTimeout(() => {
      setLookTarget('text');
    }, typingDuration * 0.65);

    const lookUserTimer = setTimeout(() => {
      setLookTarget('user');
    }, typingDuration * 0.85);

    return () => {
      clearTimeout(lookFeatureTimer);
      clearTimeout(lookTextTimer);
      clearTimeout(lookUserTimer);
    };
  }, [currentSlide]);

  // Start typing on mount
  useEffect(() => {
    startTyping(0);
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (nextSlideTimeoutRef.current) clearTimeout(nextSlideTimeoutRef.current);
      if (speakEndTimeoutRef.current) clearTimeout(speakEndTimeoutRef.current);
    };
  }, []);

  // Animate head, eye pupils, and hair based on looking target state
  useEffect(() => {
    let eyeX = 0;
    let eyeY = 0;
    let turnX = 0;
    let hairAngle = 0;

    if (lookTarget === 'text') {
      eyeX = -1.8;
      eyeY = 1.5;
      turnX = -2.5;
      hairAngle = -1.0;
    } else if (lookTarget === 'feature') {
      // Slides 1 (Contract) and 5 (AI Drafting) have panels on the left of character
      const isRight = currentSlide === 1 || currentSlide === 5;
      eyeX = isRight ? 2.0 : -2.0;
      eyeY = -0.5;
      turnX = isRight ? 4 : -4;
      hairAngle = isRight ? 1.5 : -1.5;
    } else {
      eyeX = 0;
      eyeY = 0;
      turnX = 0;
      hairAngle = 0;
    }

    Animated.parallel([
      Animated.timing(eyeOffsetX, { toValue: eyeX, duration: 250, useNativeDriver: true }),
      Animated.timing(eyeOffsetY, { toValue: eyeY, duration: 250, useNativeDriver: true }),
      Animated.timing(headTurn, { toValue: turnX, duration: 300, useNativeDriver: true }),
      Animated.timing(hairTilt, { toValue: hairAngle, duration: 300, useNativeDriver: true }),
    ]).start();
  }, [lookTarget, currentSlide]);

  // Coordinator transitions (Baseline Y values shifted down by 35px)
  useEffect(() => {
    // Reset view entry transitions
    fadeAnim.setValue(0);
    slideAnim.setValue(15);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 450,
        useNativeDriver: true,
      }),
    ]).start();

    // Reset feature parameters
    laserScannerY.setValue(0);
    outcomeDialProgress.setValue(0);
    roadFilingProgress.setValue(0);
    documentTyping.setValue(0);

    // Dynamic waist-up pose adjustments per slide context
    let targetX = 0;
    let targetY = 45; // baseline target Y shifted down to 45 (was 10)

    if (currentSlide === 0) {
      // Welcome
      targetX = 0;
      targetY = 50;
    } else if (currentSlide === 1) {
      // Contract Analyzer — laser scan card on left
      targetX = 25;
      targetY = 40;
      Animated.loop(
        Animated.sequence([
          Animated.timing(laserScannerY, { toValue: 1, duration: 2000, useNativeDriver: true }),
          Animated.timing(laserScannerY, { toValue: 0, duration: 0, useNativeDriver: true }),
        ])
      ).start();
    } else if (currentSlide === 2) {
      // My Cases — centred, slight lean right
      targetX = 10;
      targetY = 45;
    } else if (currentSlide === 3) {
      // Case Predictor — outcome dial on right
      targetX = -25;
      targetY = 40;
      Animated.timing(outcomeDialProgress, {
        toValue: 0.85,
        duration: 1500,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false,
      }).start();
    } else if (currentSlide === 4) {
      // Strategy Engine
      targetX = 0;
      targetY = 50;
      Animated.timing(roadFilingProgress, {
        toValue: 1,
        duration: 2000,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
    } else if (currentSlide === 5) {
      // AI Drafting
      targetX = 25;
      targetY = 40;
      Animated.timing(documentTyping, { toValue: 1, duration: 1800, useNativeDriver: true }).start();
    } else if (currentSlide === 6) {
      // Ready
      targetX = 0;
      targetY = 35;
    }

    Animated.parallel([
      Animated.timing(charX, {
        toValue: targetX,
        duration: 650,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(charY, {
        toValue: targetY,
        duration: 650,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [currentSlide]);

  const handleNext = () => {
    // While still typing: "Skip Typing" — complete text instantly, stay on this card
    if (isSpeaking) {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (nextSlideTimeoutRef.current) clearTimeout(nextSlideTimeoutRef.current);
      if (speakEndTimeoutRef.current) clearTimeout(speakEndTimeoutRef.current);
      const totalChars = slides[currentSlide].tokens.reduce((acc, t) => acc + t.text.length, 0);
      setVisibleCount(totalChars);
      setIsSpeaking(false);
      setIsBlinkingCursor(false);
      return; // ← stay on this card, do NOT advance
    }

    // Typing finished: "Next" — fade out, slide in next card
    if (currentSlide < slides.length - 1) {
      const nextIndex = currentSlide + 1;
      setCurrentSlide(nextIndex);
      startTyping(nextIndex);
    } else {
      router.push('/auth/login');
    }
  };

  const handleSkip = () => {
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (nextSlideTimeoutRef.current) clearTimeout(nextSlideTimeoutRef.current);
    if (speakEndTimeoutRef.current) clearTimeout(speakEndTimeoutRef.current);
    router.push('/auth/login');
  };

  // Interpolate breathing transforms (Chibi body sway & head bounce)
  const breathingScaleY = breathing.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.018],
  });

  const breathingTranslateY = breathing.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -2.5],
  });

  const weightShiftTranslateX = bodyWeightShift.interpolate({
    inputRange: [0, 1],
    outputRange: [-1.2, 1.2],
  });

  const floatTranslateY = floatIcons.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -12],
  });

  // Slice tokens based on typewriter progress (visibleCount)
  const currentTokens = slides[currentSlide].tokens;
  let tokenCharCount = 0;
  const renderedTokens: { text: string; bold?: boolean }[] = [];
  for (const token of currentTokens) {
    if (tokenCharCount >= visibleCount) break;
    const remaining = visibleCount - tokenCharCount;
    if (token.text.length <= remaining) {
      renderedTokens.push(token);
      tokenCharCount += token.text.length;
    } else {
      renderedTokens.push({ text: token.text.substring(0, remaining), bold: token.bold });
      tokenCharCount += remaining;
    }
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      {/* LIGHT THEME Backdrops & Courthouse outlines */}
      <View style={styles.backdropBackground}>
        {/* Courthouse architectural outline wireframe */}
        <View style={styles.courthouseSilhouette}>
          <View style={styles.roofTriangle} />
          <View style={styles.topFrieze} />
          <View style={styles.pillarsRow}>
            <View style={styles.pillarLine} />
            <View style={styles.pillarLine} />
            <View style={styles.pillarLine} />
            <View style={styles.pillarLine} />
            <View style={styles.pillarLine} />
          </View>
          <View style={styles.pillarSteps} />
        </View>

        {/* Purple/Blue glowing accents */}
        <Animated.View
          style={[
            styles.glowCore,
            {
              backgroundColor: '#6D5DFC',
              opacity: 0.08,
              top: height * 0.15,
              right: 20,
              transform: [{ scale: holoPulse }],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.glowCore,
            {
              backgroundColor: '#3B82F6',
              opacity: 0.06,
              bottom: height * 0.35,
              left: 10,
              transform: [{ scale: holoPulse }],
            },
          ]}
        />
      </View>

      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        
        {/* Header navigation bar skip btn */}
        <View style={styles.header}>
          {currentSlide < slides.length - 1 ? (
            <Pressable style={styles.skipBtn} onPress={handleSkip}>
              <Text style={styles.skipText}>Skip</Text>
            </Pressable>
          ) : (
            <View />
          )}
        </View>

        {/* Half-body Senior Counsel Workspace (Top 42% screen portion) */}
        <View style={styles.workspace}>
          
          {/* Animated Female Chibi Advisor (Waist-up, exactly like first reference image) */}
          <Animated.View
            style={[
              styles.characterWrapper,
              {
                transform: [
                  { translateX: charX },
                  { translateY: charY },
                  { scale: 1.15 }
                ],
              },
            ]}
          >
            <View style={styles.waistShadow} />

            {/* Back hair block (flows down behind head to shoulders - exactly like first reference illustration) */}
            <Animated.View
              style={[
                styles.hairBackPanel,
                {
                  transform: [
                    { translateY: breathingTranslateY },
                    { translateX: weightShiftTranslateX }
                  ]
                }
              ]}
            />

            {/* Torso, Dress & Crossed Arms (Hands remain naturally joined in front of body at all times) */}
            <Animated.View
              style={[
                styles.torso,
                {
                  transform: [
                    { translateY: breathingTranslateY },
                    { translateX: weightShiftTranslateX },
                    { scaleY: breathingScaleY }
                  ]
                }
              ]}
            >
              {/* White crossover shirt collar (Exact crossover design) */}
              <View style={styles.shirtCrossoverWrapper}>
                <View style={styles.shirtCollarLeft} />
                <View style={styles.shirtCollarRight} />
              </View>

              {/* Slender advocate coat (Grey/black chibi suit blazer with V-neck shape) */}
              <View style={styles.coatBlazer}>
                <View style={styles.coatLapelLeft} />
                <View style={styles.coatLapelRight} />
              </View>

              {/* Advocate double neck bands */}
              <View style={styles.advocateBandsRow}>
                <View style={styles.legalNeckBand} />
                <View style={styles.legalNeckBand} />
              </View>

              {/* LEFT ARM & SLEEVE (Sleeves curve inward to meet at center - exactly like first reference) */}
              <View style={styles.sleeveLeft} />

              {/* RIGHT ARM & SLEEVE (Sleeves curve inward to meet at center - exactly like first reference) */}
              <View style={styles.sleeveRight} />

              {/* JOINED HANDS (Hands resting politely over each other in front of body) */}
              <View style={styles.joinedHandsOverlay}>
                <View style={styles.joinedPalmBack} />
                <View style={styles.joinedPalmFront}>
                  {/* Natural overlapping finger markings */}
                  <View style={styles.joinedFingerMark} />
                  <View style={styles.joinedFingerMark} />
                  <View style={styles.joinedFingerMark} />
                </View>
              </View>
            </Animated.View>

            {/* Head / Face features (No glasses, blush cheeks, dark oval eyes with white highlight reflection points) */}
            <Animated.View
              style={[
                styles.head,
                {
                  transform: [
                    {
                      rotate: headTurn.interpolate({
                        inputRange: [-10, 10],
                        outputRange: ['-10deg', '10deg'],
                      })
                    },
                    { translateY: breathingTranslateY },
                    { translateX: weightShiftTranslateX },
                  ]
                }
              ]}
            >
              {/* Cute Chibi side ears peeking out from hair */}
              <View style={styles.sideEarLeft} />
              <View style={styles.sideEarRight} />

              {/* Face Panel (Light skin tone, soft rounded cheek boundaries) */}
              <View style={styles.facePanel}>
                
                {/* Subtle curve nose bridge */}
                <View style={styles.facialNose} />

                {/* Cute Pink Blush Circles on cheeks (exactly like first reference) */}
                <View style={styles.blushCheekLeft} />
                <View style={styles.blushCheekRight} />

                {/* Expressive dark eyes (Proper scaleY blinking + eyelashes curves + white light highlights) */}
                <View style={styles.eyesRow}>
                  <View style={styles.eyeContainer}>
                    <Animated.View 
                      style={[
                        styles.eyeGlobe, 
                        { 
                          transform: [
                            { scaleY: blinking },
                            { translateX: eyeOffsetX },
                            { translateY: eyeOffsetY }
                          ] 
                        }
                      ]} 
                    >
                      <View style={styles.eyePupilDark}>
                        <View style={styles.eyeReflectionDot} />
                      </View>
                    </Animated.View>
                    {/* Eyelash curve detail */}
                    <View style={styles.eyeLashCurveLeft} />
                  </View>

                  <View style={styles.eyeContainer}>
                    <Animated.View 
                      style={[
                        styles.eyeGlobe, 
                        { 
                          transform: [
                            { scaleY: blinking },
                            { translateX: eyeOffsetX },
                            { translateY: eyeOffsetY }
                          ] 
                        }
                      ]} 
                    >
                      <View style={styles.eyePupilDark}>
                        <View style={styles.eyeReflectionDot} />
                      </View>
                    </Animated.View>
                    {/* Eyelash curve detail */}
                    <View style={styles.eyeLashCurveRight} />
                  </View>
                </View>

                {/* Thin high curved eyebrows */}
                <View style={styles.eyebrowsRow}>
                  <View style={styles.eyebrowLeft} />
                  <View style={styles.eyebrowRight} />
                </View>

                {/* Gentle smiling curved mouth (curved line - exactly like first reference) */}
                <View style={styles.smileHolder}>
                  <Animated.View style={[styles.smilingMouthCurve, { transform: [{ scaleY: mouthSpeech }] }]}>
                    <View style={styles.smilingMouthLine} />
                  </Animated.View>
                </View>

              </View>
              
              {/* Premium hair front bangs (Soft sweeping forehead locks - exactly like first reference) */}
              <Animated.View 
                style={[
                  styles.professionalHair,
                  {
                    transform: [
                      {
                        rotate: hairTilt.interpolate({
                          inputRange: [-10, 10],
                          outputRange: ['-10deg', '10deg'],
                        })
                      }
                    ]
                  }
                ]}
              >
                {/* Hair cap layer */}
                <View style={styles.hairCapDome} />
                
                {/* Sweeping forehead bang strands slanting from upper right down to left forehead */}
                <View style={styles.sweepingBangStrand1} />
                <View style={styles.sweepingBangStrand2} />
                <View style={styles.sweepingBangStrand3} />

                {/* Left/Right hair framing sides overlapping onto cheeks */}
                <View style={styles.hairFrameSideLeft} />
                <View style={styles.hairFrameSideRight} />
              </Animated.View>
            </Animated.View>

          </Animated.View>

          {/* Interactive Feature Animations floating next to guide character (Shifted closer to character) */}
          <View style={styles.overlayIllustration} pointerEvents="none">
            
            {/* Slide 2 (index 1): Contract page scanner */}
            {currentSlide === 1 && (
              <Animated.View style={[styles.miniAppCard, { transform: [{ translateY: floatTranslateY }], right: '47%', top: '26%' }]}>
                <View style={styles.docMiniLayout}>
                  <View style={styles.docHeader}>
                    <Ionicons name="document-text" size={13} color="#6D5DFC" />
                    <Text style={styles.docTitleText}>NDA_Review.pdf</Text>
                  </View>
                  <View style={[styles.miniTextLine, { width: '85%' }]} />
                  <View style={[styles.miniTextLine, { width: '70%' }]} />
                  <View style={styles.glowClauseBadge}>
                    <Text style={styles.glowClauseText}>Indemnity: High Risk</Text>
                  </View>
                  <Animated.View
                    style={[styles.laserLine, { transform: [{ translateY: laserScannerY.interpolate({ inputRange: [0, 1], outputRange: [0, 75] }) }] }]}
                  />
                </View>
              </Animated.View>
            )}

            {/* Slide 3 (index 2): My Cases — Legal CRM workspace mini-card */}
            {currentSlide === 2 && (
              <Animated.View style={[styles.miniAppCard, { transform: [{ translateY: floatTranslateY }], left: '48%', top: '22%' }]}>
                <View style={[styles.docMiniLayout, { backgroundColor: '#F0F9FF', borderColor: '#BAE6FD', width: 105, height: 118 }]}>
                  <View style={styles.docHeader}>
                    <Ionicons name="briefcase" size={12} color="#0EA5E9" />
                    <Text style={[styles.docTitleText, { color: '#0369A1' }]}>Case #047</Text>
                  </View>
                  {/* Client row */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 4 }}>
                    <Ionicons name="person-circle-outline" size={10} color="#0EA5E9" />
                    <Text style={{ fontSize: 7.5, fontWeight: '700', color: '#0369A1' }}>Sharma vs. State</Text>
                  </View>
                  {/* Mini stat badges */}
                  <View style={{ flexDirection: 'row', gap: 3, flexWrap: 'wrap', marginBottom: 4 }}>
                    <View style={[styles.miniBadge, { backgroundColor: '#DCFCE7' }]}>
                      <Text style={[styles.miniBadgeText, { color: '#16A34A' }]}>6 Docs</Text>
                    </View>
                    <View style={[styles.miniBadge, { backgroundColor: '#FEE2E2' }]}>
                      <Text style={[styles.miniBadgeText, { color: '#DC2626' }]}>3 Ev.</Text>
                    </View>
                    <View style={[styles.miniBadge, { backgroundColor: '#EDE9FE' }]}>
                      <Text style={[styles.miniBadgeText, { color: '#7C3AED' }]}>AI ✦</Text>
                    </View>
                  </View>
                  {/* Next hearing */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                    <Ionicons name="calendar-outline" size={9} color="#64748B" />
                    <Text style={{ fontSize: 6.5, color: '#64748B', fontWeight: '600' }}>Hearing: 18 Jul</Text>
                  </View>
                </View>
              </Animated.View>
            )}

            {/* Slide 4 (index 3): Case Estimator meter */}
            {currentSlide === 3 && (
              <Animated.View style={[styles.miniAppCard, { transform: [{ translateY: floatTranslateY }], left: '47%', top: '26%' }]}>
                <View style={styles.predictMiniLayout}>
                  <Text style={styles.cardHeaderSmall}>Win Probability</Text>
                  <View style={styles.arcContainer}>
                    <View style={styles.arcOuterBack} />
                    <View style={styles.arcOuterFill} />
                    <View style={styles.arcCenterTextBlock}>
                      <Text style={styles.arcValue}>85%</Text>
                      <Text style={styles.arcLabel}>Success rate</Text>
                    </View>
                  </View>
                  <View style={styles.badgeRow}>
                    <View style={[styles.miniBadge, { backgroundColor: '#ECFDF5' }]}><Text style={styles.miniBadgeText}>Strong Fact</Text></View>
                  </View>
                </View>
              </Animated.View>
            )}

            {/* Slide 5 (index 4): Strategy Roadmap */}
            {currentSlide === 4 && (
              <Animated.View style={[styles.miniAppCard, { transform: [{ translateY: floatTranslateY }], top: '24%', right: '20%' }]}>
                <View style={styles.roadmapMiniLayout}>
                  <Text style={styles.cardHeaderSmall}>Roadmap Nodes</Text>
                  <View style={{ gap: 6, marginTop: 4 }}>
                    {[
                      { icon: 'checkmark-circle', t: 'Legal Notice Sent', col: '#10B981' },
                      { icon: 'time-outline', t: 'Reply Written Statement', col: '#6D5DFC' },
                      { icon: 'arrow-forward-circle', t: 'Trial Evidence Audit', col: '#94A3B8' },
                    ].map((stepItem, idx) => (
                      <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Ionicons name={stepItem.icon as any} size={11} color={stepItem.col} />
                        <Text style={{ fontSize: 9, fontWeight: '700', color: '#1E293B' }}>{stepItem.t}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </Animated.View>
            )}

            {/* Slide 6 (index 5): AI Drafting document */}
            {currentSlide === 5 && (
              <Animated.View style={[styles.miniAppCard, { transform: [{ translateY: floatTranslateY }], right: '47%', top: '26%' }]}>
                <View style={styles.docMiniLayout}>
                  <View style={styles.docHeader}>
                    <Ionicons name="create-outline" size={13} color="#F59E0B" />
                    <Text style={styles.docTitleText}>Legal_Notice.docx</Text>
                  </View>
                  <View style={[styles.miniTextLine, { width: '80%', backgroundColor: '#F59E0B' }]} />
                  <View style={[styles.miniTextLine, { width: '90%' }]} />
                  <View style={[styles.miniTextLine, { width: '60%' }]} />
                  <View style={[styles.glowClauseBadge, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}>
                    <Text style={[styles.glowClauseText, { color: '#D97706' }]}>Draft Formatted: OK</Text>
                  </View>
                </View>
              </Animated.View>
            )}

            {/* Slide 7 (index 6): Ready — success check */}
            {currentSlide === 6 && (
              <View style={[styles.miniAppCard, { right: '42%', top: '24%' }]}>
                <View style={styles.successCheckGlow}>
                  <Ionicons name="checkmark-sharp" size={28} color="#FFFFFF" />
                </View>
              </View>
            )}

          </View>
        </View>

        {/* Guided Dialogue Bubble Card (HIGH-CONTRAST READABILITY & PERFORMANCE REDESIGN) */}
        <Animated.View
          style={[
            styles.dialogContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Header indicator category label */}
          <View style={styles.slideHeader}>
            <Ionicons name={slides[currentSlide].icon as any} size={18} color={slides[currentSlide].accentGlow} style={{ marginRight: 6 }} />
            <Text style={[styles.topicLabel, { color: slides[currentSlide].accentGlow }]}>{slides[currentSlide].topic}</Text>
          </View>

          {/* High Contrast, Large Readable Text Bubble (Automatic wraps - Isolated rendering to avoid main thread recursion) */}
          <View style={styles.speechTextWrapper}>
            <Text key="stable-typewriter-text" style={styles.speechTextContainer}>
              {renderedTokens.map((token, idx) => (
                <Text
                  key={`token-${idx}`}
                  style={[
                    styles.speechBaseText,
                    token.bold && styles.speechBoldText
                  ]}
                >
                  {token.text}
                </Text>
              ))}
              {isBlinkingCursor && (
                <Animated.Text style={[styles.speechBaseText, { opacity: cursorOpacity, color: '#6D5DFC' }]}>
                  ▌
                </Animated.Text>
              )}
            </Text>
          </View>

          {/* Action Row & Pagination slide indices */}
          <View style={styles.controlsRow}>
            
            {/* Pagination dots indicators */}
            <View style={styles.dotsIndicator}>
              {slides.map((_, sIdx) => (
                <View
                  key={sIdx}
                  style={[
                    styles.indicatorDot,
                    {
                      backgroundColor: sIdx === currentSlide ? '#6D5DFC' : '#E2E8F0',
                      width: sIdx === currentSlide ? 18 : 6,
                    },
                  ]}
                />
              ))}
            </View>

            {/* Action flow routing buttons */}
            {currentSlide < slides.length - 1 ? (
              <Pressable style={styles.nextBtn} onPress={handleNext}>
                <Text style={styles.nextBtnText}>{isSpeaking ? 'Skip Typing ›' : 'Next'}</Text>
                {!isSpeaking && <Ionicons name="arrow-forward" size={14} color="#FFFFFF" style={{ marginLeft: 4 }} />}
              </Pressable>
            ) : (
              <View style={styles.finalButtonsRow}>
                <Pressable style={[styles.outlineBtn, { flex: 1.2 }]} onPress={() => router.push('/auth/signup')}>
                  <Text style={styles.outlineBtnText}>Register</Text>
                </Pressable>
                <Pressable style={[styles.fillBtn, { flex: 1.8 }]} onPress={handleNext}>
                  <Text style={styles.fillBtnText}>Get Started</Text>
                </Pressable>
              </View>
            )}

          </View>
        </Animated.View>

      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC', // Off-white clean layout
  },
  backdropBackground: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
    backgroundColor: '#F8FAFC',
    overflow: 'hidden',
  },
  glowCore: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
  },

  // Courthouse Outline Background wireframe structure
  courthouseSilhouette: {
    position: 'absolute',
    bottom: height * 0.45,
    alignSelf: 'center',
    width: width * 0.85,
    height: 120,
    opacity: 0.12,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  roofTriangle: {
    width: 0,
    height: 0,
    borderLeftWidth: 150,
    borderRightWidth: 150,
    borderBottomWidth: 32,
    borderStyle: 'solid',
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#64748B',
  },
  topFrieze: {
    width: 290,
    height: 8,
    backgroundColor: '#64748B',
    marginVertical: 2,
  },
  pillarsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: 270,
    height: 60,
  },
  pillarLine: {
    width: 8,
    height: '100%',
    backgroundColor: '#64748B',
  },
  pillarSteps: {
    width: 300,
    height: 10,
    backgroundColor: '#64748B',
  },

  safeArea: {
    flex: 1,
    zIndex: 10,
  },
  header: {
    height: 48,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  skipBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  skipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  workspace: {
    flex: 1.1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  overlayIllustration: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 40,
  },

  // ─── Slender Chibi Character Composition (Clean outlines, rounded forms) ───
  characterWrapper: {
    width: 140,
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginTop: 45, // Shifted down for perfect layout integration
  },
  waistShadow: {
    position: 'absolute',
    bottom: -10,
    width: 90,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.05)',
    transform: [{ scaleX: 0.8 }],
    zIndex: 1,
  },
  hairBackPanel: {
    position: 'absolute',
    bottom: 40,
    width: 76,
    height: 95,
    backgroundColor: '#1E293B', // Voluminous back hair plate wrapping head
    borderRadius: 25,
    borderColor: '#0F172A',
    borderWidth: 2,
    zIndex: 9,
  },
  torso: {
    width: 82, // Balanced small body proportions
    height: 80,
    position: 'absolute',
    bottom: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  shirtCrossoverWrapper: {
    width: 24,
    height: 14,
    position: 'absolute',
    top: -2,
    zIndex: 15,
    flexDirection: 'row',
  },
  shirtCollarLeft: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 10,
    transform: [{ rotate: '30deg' }],
    borderColor: '#0F172A',
    borderRightWidth: 2,
    borderBottomWidth: 2,
  },
  shirtCollarRight: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderBottomRightRadius: 10,
    transform: [{ rotate: '-30deg' }],
    borderColor: '#0F172A',
    borderLeftWidth: 2,
    borderBottomWidth: 2,
  },
  coatBlazer: {
    width: 68, // Chibi small torso width
    height: 72,
    backgroundColor: '#27272A', // Chibi grey/black coat suit
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    position: 'absolute',
    bottom: 0,
    zIndex: 12,
    borderColor: '#0F172A',
    borderWidth: 2,
  },
  coatLapelLeft: {
    position: 'absolute',
    top: 0,
    left: 10,
    width: 10,
    height: 40,
    backgroundColor: '#18181B',
    borderColor: '#0F172A',
    borderRightWidth: 1.5,
    transform: [{ rotate: '12deg' }],
  },
  coatLapelRight: {
    position: 'absolute',
    top: 0,
    right: 10,
    width: 10,
    height: 40,
    backgroundColor: '#18181B',
    borderColor: '#0F172A',
    borderLeftWidth: 1.5,
    transform: [{ rotate: '-12deg' }],
  },
  advocateBandsRow: {
    position: 'absolute',
    top: 10,
    zIndex: 16,
    flexDirection: 'row',
    gap: 1.5,
  },
  legalNeckBand: {
    width: 4.5,
    height: 18,
    backgroundColor: '#FFFFFF',
    borderColor: '#0F172A',
    borderWidth: 1.5,
    borderBottomLeftRadius: 1,
    borderBottomRightRadius: 1,
  },

  // ─── Folded/Crossed Sleeves (Joint/Connected naturally to chest - no awkward pivots) ───
  sleeveLeft: {
    position: 'absolute',
    top: 16,
    left: -2,
    width: 22,
    height: 38,
    backgroundColor: '#27272A',
    borderColor: '#0F172A',
    borderWidth: 2,
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 6,
    transform: [{ rotate: '32deg' }],
    zIndex: 13,
  },
  sleeveRight: {
    position: 'absolute',
    top: 16,
    right: -2,
    width: 22,
    height: 38,
    backgroundColor: '#27272A',
    borderColor: '#0F172A',
    borderWidth: 2,
    borderTopRightRadius: 10,
    borderBottomRightRadius: 12,
    borderBottomLeftRadius: 6,
    transform: [{ rotate: '-32deg' }],
    zIndex: 13,
  },

  // ─── Joined Hands Overlay (Resting politely in front of body at all times) ───
  joinedHandsOverlay: {
    position: 'absolute',
    bottom: 12,
    width: 28,
    height: 18,
    zIndex: 20,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
  },
  joinedPalmBack: {
    position: 'absolute',
    width: 22,
    height: 12,
    backgroundColor: '#FCD5BE', // Skin color
    borderRadius: 6,
    borderColor: '#0F172A',
    borderWidth: 2,
    transform: [{ rotate: '-12deg' }],
  },
  joinedPalmFront: {
    position: 'absolute',
    width: 22,
    height: 12,
    backgroundColor: '#FCD5BE', // Overlapping skin palm
    borderRadius: 6,
    borderColor: '#0F172A',
    borderWidth: 2,
    transform: [{ rotate: '12deg' }],
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 2,
  },
  joinedFingerMark: {
    width: 1.5,
    height: 4,
    backgroundColor: '#EAA882',
    borderRadius: 0.5,
    marginTop: 2,
  },

  // ─── Chibi Head Composition ───
  head: {
    width: 60,
    height: 64,
    position: 'absolute',
    bottom: 74,
    alignItems: 'center',
    zIndex: 22,
  },
  sideEarLeft: {
    position: 'absolute',
    left: 2,
    top: 26,
    width: 8,
    height: 12,
    backgroundColor: '#FCD5BE',
    borderColor: '#0F172A',
    borderWidth: 2,
    borderTopLeftRadius: 5,
    borderBottomLeftRadius: 5,
    zIndex: 19,
  },
  sideEarRight: {
    position: 'absolute',
    right: 2,
    top: 26,
    width: 8,
    height: 12,
    backgroundColor: '#FCD5BE',
    borderColor: '#0F172A',
    borderWidth: 2,
    borderTopRightRadius: 5,
    borderBottomRightRadius: 5,
    zIndex: 19,
  },
  facePanel: {
    width: 50, // Large cute expressive head proportions
    height: 52,
    backgroundColor: '#FCD5BE',
    borderRadius: 24, // Rounded soft curves
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderColor: '#0F172A',
    borderWidth: 2,
    zIndex: 22,
  },
  facialNose: {
    position: 'absolute',
    top: 26,
    width: 2.2,
    height: 4,
    backgroundColor: '#EAA882',
    borderRadius: 1,
    zIndex: 34,
  },
  blushCheekLeft: {
    position: 'absolute',
    left: 6,
    bottom: 15,
    width: 9,
    height: 7,
    backgroundColor: '#FCA5A5', // Blush circles under the eyes
    borderRadius: 4.5,
    opacity: 0.75,
    zIndex: 28,
  },
  blushCheekRight: {
    position: 'absolute',
    right: 6,
    bottom: 15,
    width: 9,
    height: 7,
    backgroundColor: '#FCA5A5',
    borderRadius: 4.5,
    opacity: 0.75,
    zIndex: 28,
  },
  eyesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 28,
    position: 'absolute',
    top: 18,
    zIndex: 30,
  },
  eyeContainer: {
    width: 9,
    height: 10,
    position: 'relative',
  },
  eyeGlobe: {
    width: 9,
    height: 9,
    backgroundColor: '#FFFFFF',
    borderRadius: 4.5,
    borderColor: '#0F172A',
    borderWidth: 2,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  eyePupilDark: {
    width: 6,
    height: 6,
    backgroundColor: '#1E293B',
    borderRadius: 3,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  eyeReflectionDot: {
    position: 'absolute',
    top: 0.8,
    left: 0.8,
    width: 2,
    height: 2,
    backgroundColor: '#FFFFFF', // High-fidelity reflection
    borderRadius: 1,
  },
  eyeLashCurveLeft: {
    position: 'absolute',
    top: -1,
    left: -1.5,
    width: 11,
    height: 3,
    borderTopWidth: 2,
    borderColor: '#0F172A',
    borderTopLeftRadius: 5,
    borderTopRightRadius: 2,
  },
  eyeLashCurveRight: {
    position: 'absolute',
    top: -1,
    right: -1.5,
    width: 11,
    height: 3,
    borderTopWidth: 2,
    borderColor: '#0F172A',
    borderTopRightRadius: 5,
    borderTopLeftRadius: 2,
  },
  eyebrowsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 30,
    position: 'absolute',
    top: 10,
    zIndex: 32,
  },
  eyebrowLeft: {
    width: 9,
    height: 2,
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 1,
    borderTopRightRadius: 1,
    transform: [{ rotate: '5deg' }],
  },
  eyebrowRight: {
    width: 9,
    height: 2,
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 1,
    borderTopRightRadius: 1,
    transform: [{ rotate: '-5deg' }],
  },
  smileHolder: {
    position: 'absolute',
    bottom: 9,
    width: 16,
    height: 8,
    alignItems: 'center',
  },
  smilingMouthCurve: {
    width: 12,
    height: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  smilingMouthLine: {
    width: 10,
    height: 4,
    borderBottomWidth: 2,
    borderColor: '#0F172A',
    borderBottomLeftRadius: 5,
    borderBottomRightRadius: 5,
  },
  
  // ─── High Fidelity Hair Sweeping Bangs & Frame (Exactly like first reference) ───
  professionalHair: {
    position: 'absolute',
    top: -6,
    width: 60,
    height: 28,
    zIndex: 21,
  },
  hairCapDome: {
    position: 'absolute',
    width: '100%',
    height: 20,
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
    borderWidth: 2,
    borderColor: '#0F172A',
  },
  sweepingBangStrand1: {
    position: 'absolute',
    left: 14,
    top: 12,
    width: 22,
    height: 14,
    backgroundColor: '#1E293B', // Forehead sweeping lock 1
    borderBottomRightRadius: 8,
    borderColor: '#0F172A',
    borderBottomWidth: 2,
    borderRightWidth: 2,
    transform: [{ rotate: '18deg' }],
  },
  sweepingBangStrand2: {
    position: 'absolute',
    left: 4,
    top: 9,
    width: 18,
    height: 11,
    backgroundColor: '#1E293B', // Forehead sweeping lock 2
    borderBottomRightRadius: 6,
    borderColor: '#0F172A',
    borderBottomWidth: 1.5,
    borderRightWidth: 1.5,
    transform: [{ rotate: '24deg' }],
  },
  sweepingBangStrand3: {
    position: 'absolute',
    right: 4,
    top: 8,
    width: 16,
    height: 10,
    backgroundColor: '#111827', // Darker backdrop strand
    borderBottomLeftRadius: 6,
    transform: [{ rotate: '-18deg' }],
  },
  hairFrameSideLeft: {
    position: 'absolute',
    left: -2,
    top: 6,
    width: 12,
    height: 32,
    backgroundColor: '#1E293B', // Side lock framing cheeks down to shoulder
    borderTopLeftRadius: 8,
    borderBottomRightRadius: 8,
    borderColor: '#0F172A',
    borderWidth: 2,
    zIndex: 25,
  },
  hairFrameSideRight: {
    position: 'absolute',
    right: -2,
    top: 6,
    width: 12,
    height: 32,
    backgroundColor: '#1E293B', // Side lock framing cheeks down to shoulder
    borderTopRightRadius: 8,
    borderBottomLeftRadius: 8,
    borderColor: '#0F172A',
    borderWidth: 2,
    zIndex: 25,
  },

  // ─── Floating Illustration Card Panels ──────────────────────────────────
  miniAppCard: {
    position: 'absolute',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  docMiniLayout: {
    width: 95,
    height: 105,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderWidth: 1.5,
    padding: 6,
    position: 'relative',
    overflow: 'hidden',
  },
  docHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginBottom: 6,
  },
  docTitleText: {
    fontSize: 7.5,
    fontWeight: '800',
    color: '#1E293B',
  },
  miniTextLine: {
    height: 3,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    marginVertical: 2,
  },
  glowClauseBadge: {
    marginTop: 8,
    backgroundColor: '#FEE2E2',
    borderRadius: 4,
    padding: 3,
    borderWidth: 0.5,
    borderColor: '#FCA5A5',
  },
  glowClauseText: {
    fontSize: 6,
    fontWeight: '800',
    color: '#EF4444',
  },
  laserLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1.5,
    backgroundColor: '#6D5DFC',
  },
  predictMiniLayout: {
    width: 100,
    height: 110,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderWidth: 1.5,
    padding: 6,
  },
  cardHeaderSmall: {
    fontSize: 7.5,
    fontWeight: '800',
    color: '#64748B',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  arcContainer: {
    height: 48,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  arcOuterBack: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 3,
    borderColor: '#F1F5F9',
  },
  arcOuterFill: {
    position: 'absolute',
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 3,
    borderColor: '#EF4444',
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
    transform: [{ rotate: '45deg' }],
  },
  arcCenterTextBlock: {
    position: 'absolute',
    alignItems: 'center',
  },
  arcValue: {
    fontSize: 10,
    fontWeight: '900',
    color: '#1E293B',
  },
  arcLabel: {
    fontSize: 4.5,
    color: '#64748B',
  },
  badgeRow: {
    marginTop: 6,
    alignItems: 'center',
  },
  miniBadge: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 3,
  },
  miniBadgeText: {
    fontSize: 6,
    fontWeight: '800',
  },
  roadmapMiniLayout: {
    width: 105, // slightly wider to fit text wrapping
    height: 95, // expanded height to encapsulate "Trial Evidence Audit" node inside white border
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderWidth: 1.5,
    padding: 6,
  },
  successCheckGlow: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#6D5DFC',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ─── Guided Dialogue Bubble Card (CRITICAL READABILITY DESIGN) ─────────────────
  dialogContainer: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.92)', // High Contrast premium glassmorphism
    borderColor: '#E2E8F0',
    borderWidth: 1.5,
    padding: 24, // Generous padding
    gap: 12,
    shadowColor: '#6D5DFC', // Subtle glow around the panel
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 18,
    elevation: 5,
  },
  slideHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  topicLabel: {
    fontSize: 12,
    fontWeight: '900',
    color: '#6D5DFC',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  speechTextWrapper: {
    minHeight: 110, // stable height prevents layout jumps as text grows
    justifyContent: 'center',
  },
  speechTextContainer: {
    fontSize: 18, // Increased font size for maximum legibility
    lineHeight: 28, // Apple/Linear level line spacing
    letterSpacing: 0.2, // Improved letter spacing
    color: '#0F172A', // Crisp dark text
  },
  speechBaseText: {
    fontSize: 18,
    lineHeight: 28,
    color: '#0F172A',
    fontWeight: '500',
  },
  speechBoldText: {
    fontWeight: '800',
    color: '#6D5DFC', // Bold keywords highlighted in deep purple accent
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  dotsIndicator: {
    flexDirection: 'row',
    gap: 5,
  },
  indicatorDot: {
    height: 6,
    borderRadius: 3,
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6D5DFC',
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 12,
  },
  nextBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  finalButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    flex: 1,
    marginLeft: 24,
    justifyContent: 'flex-end',
  },
  fillBtn: {
    backgroundColor: '#6D5DFC',
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fillBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  outlineBtn: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineBtnText: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '800',
  },
});
