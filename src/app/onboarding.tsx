/**
 * AI Legal Mobile - Premium Onboarding Slideshow Screen
 * Presents a 3-page slideshow displaying key capabilities with interactive controls.
 */

import React, { useState } from 'react';
import { StyleSheet, Text, View, Pressable, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Button, Fade, Slide } from '@/components/ui';

interface SlideData {
  title: string;
  description: string;
  renderIllustration: () => React.ReactNode;
}

export default function OnboardingScreen() {
  const router = useRouter();
  const [currentSlide, setCurrentSlide] = useState(0);
  const { width } = useWindowDimensions();

  const slides: SlideData[] = [
    {
      title: 'AI Legal Assistant',
      description: 'Your intelligent legal partner. Ask questions, construct brief reviews, and summarize documents in seconds.',
      renderIllustration: () => (
        <View style={styles.illContainer}>
          <View style={[styles.glowCircle, { backgroundColor: 'rgba(109, 93, 252, 0.08)' }]} />
          <View style={[styles.mainCircle, { borderColor: '#6D5DFC' }]}>
            <Text style={{ fontSize: 40 }}>⚖️</Text>
          </View>
          <View style={[styles.floatingBubble, { top: 40, left: 40, backgroundColor: '#4F8CFF' }]}>
            <Text style={{ fontSize: 14, color: '#FFF' }}>⚡</Text>
          </View>
          <View style={[styles.floatingBubble, { bottom: 30, right: 30, backgroundColor: '#10B981' }]}>
            <Text style={{ fontSize: 14, color: '#FFF' }}>✓</Text>
          </View>
        </View>
      ),
    },
    {
      title: 'Manage Cases',
      description: 'Organize every case, calendar hearing, and critical timeline event in one unified secure workspace.',
      renderIllustration: () => (
        <View style={styles.illContainer}>
          <View style={[styles.caseCard, { borderColor: '#E2E8F0', backgroundColor: '#FFF' }]}>
            <View style={styles.caseHeader}>
              <View style={[styles.dot, { backgroundColor: '#6D5DFC' }]} />
              <View style={[styles.line, { width: 80, backgroundColor: '#E2E8F0' }]} />
            </View>
            <View style={[styles.line, { width: '100%', height: 6, marginVertical: 6, backgroundColor: '#F1F5F9' }]} />
            <View style={[styles.line, { width: '80%', height: 6, backgroundColor: '#F1F5F9' }]} />
            <View style={styles.caseFooter}>
              <View style={[styles.chip, { backgroundColor: 'rgba(79, 140, 255, 0.1)' }]}>
                <Text style={{ fontSize: 10, color: '#4F8CFF', fontWeight: '700' }}>Active</Text>
              </View>
            </View>
          </View>
        </View>
      ),
    },
    {
      title: 'AI-Powered Legal Tools',
      description: 'Draft legal agreements, perform contract audits, retrieve precedents, and analyze admissibility in one app.',
      renderIllustration: () => (
        <View style={styles.illContainer}>
          <View style={styles.toolsGrid}>
            <View style={[styles.toolItem, { backgroundColor: 'rgba(109, 93, 252, 0.08)' }]}>
              <Text style={{ fontSize: 24 }}>📝</Text>
            </View>
            <View style={[styles.toolItem, { backgroundColor: 'rgba(79, 140, 255, 0.08)' }]}>
              <Text style={{ fontSize: 24 }}>🔍</Text>
            </View>
            <View style={[styles.toolItem, { backgroundColor: 'rgba(16, 185, 129, 0.08)' }]}>
              <Text style={{ fontSize: 24 }}>🛡️</Text>
            </View>
            <View style={[styles.toolItem, { backgroundColor: 'rgba(245, 158, 11, 0.08)' }]}>
              <Text style={{ fontSize: 24 }}>📊</Text>
            </View>
          </View>
        </View>
      ),
    },
  ];

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide((prev) => prev + 1);
    } else {
      router.push('/auth/login');
    }
  };

  const handleBack = () => {
    if (currentSlide > 0) {
      setCurrentSlide((prev) => prev - 1);
    }
  };

  const currentData = slides[currentSlide];

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Onboarding Header */}
        <View style={styles.header}>
          {currentSlide > 0 ? (
            <Pressable onPress={handleBack} accessibilityLabel="Go back to previous slide" accessibilityRole="button">
              <Text style={styles.navText}>Back</Text>
            </Pressable>
          ) : (
            <View />
          )}

          {currentSlide < slides.length - 1 ? (
            <Pressable onPress={() => router.push('/auth/login')} accessibilityLabel="Skip onboarding" accessibilityRole="button">
              <Text style={styles.navText}>Skip</Text>
            </Pressable>
          ) : (
            <View />
          )}
        </View>

        {/* Content Slides Block */}
        <View style={styles.slideBlock}>
          <Fade duration={400} key={`ill-${currentSlide}`}>
            <View style={styles.illWrapper}>
              {currentData.renderIllustration()}
            </View>
          </Fade>

          <Slide duration={500} key={`text-${currentSlide}`} style={styles.textContainer}>
            <Text style={styles.title}>{currentData.title}</Text>
            <Text style={styles.description}>{currentData.description}</Text>
          </Slide>
        </View>

        {/* Footer Actions */}
        <View style={styles.footer}>
          {/* Pagination Indicators */}
          <View style={styles.dotsContainer}>
            {slides.map((_, idx) => (
              <View
                key={idx}
                style={[
                  styles.dotIndicator,
                  {
                    backgroundColor: idx === currentSlide ? '#6D5DFC' : '#E2E8F0',
                    width: idx === currentSlide ? 24 : 8,
                  },
                ]}
              />
            ))}
          </View>

          {/* Action Trigger button */}
          <Button
            title={currentSlide === slides.length - 1 ? 'Get Started' : 'Next'}
            variant="primary"
            onPress={handleNext}
            style={styles.actionBtn}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  safeArea: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 48,
  },
  navText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  slideBlock: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  illWrapper: {
    height: 220,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    alignItems: 'center',
    marginTop: 32,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 22,
  },
  footer: {
    alignItems: 'center',
    gap: 24,
    marginTop: 16,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  dotIndicator: {
    height: 8,
    borderRadius: 4,
  },
  actionBtn: {
    width: '100%',
    height: 48,
  },

  // Geometric Illustrations Style assets
  illContainer: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  glowCircle: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
  },
  mainCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 4,
  },
  floatingBubble: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  caseCard: {
    width: 180,
    height: 110,
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  caseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  line: {
    height: 8,
    borderRadius: 4,
  },
  caseFooter: {
    marginTop: 14,
    alignItems: 'flex-start',
  },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  toolsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    width: 120,
    justifyContent: 'center',
  },
  toolItem: {
    width: 50,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
