import React from 'react';
import { StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui';
import { useRouter } from 'expo-router';

export default function PrivacyScreen() {
  const router = useRouter();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ThemedText type="title">Privacy Policy</ThemedText>
          <ThemedText style={styles.date}>Effective Date: June 18, 2026</ThemedText>

          <ThemedText style={styles.text}>
            We take your privacy seriously. This document outlines how AI LEGAL processes, secures, and handles client or attorney work product data. All case briefs, research materials, and user files remain strictly confidential and encrypted in transit and at rest.
          </ThemedText>

          <ThemedText type="subtitle" style={styles.sectionTitle}>1. Data Collection</ThemedText>
          <ThemedText style={styles.text}>
            AI LEGAL retrieves documents, text briefs, and conversational details strictly to perform requested analysis and evidence searches.
          </ThemedText>

          <ThemedText type="subtitle" style={styles.sectionTitle}>2. Model Training Exclusions</ThemedText>
          <ThemedText style={styles.text}>
            No enterprise attorney data, documents, or research queries are utilized to train public underlying models without explicit attorney consent.
          </ThemedText>

          <Button
            title="Go Back"
            variant="outlined"
            onPress={() => router.back()}
            style={styles.btn}
          />
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
  },
  date: {
    opacity: 0.5,
    marginTop: 4,
    marginBottom: 24,
  },
  sectionTitle: {
    marginTop: 24,
    marginBottom: 8,
  },
  text: {
    lineHeight: 22,
    opacity: 0.8,
  },
  btn: {
    marginTop: 40,
    marginBottom: 20,
  },
});
