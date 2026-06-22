import React from 'react';
import { StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui';
import { useRouter } from 'expo-router';

export default function TermsScreen() {
  const router = useRouter();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ThemedText type="title">Terms of Service</ThemedText>
          <ThemedText style={styles.date}>Last Updated: June 18, 2026</ThemedText>

          <ThemedText style={styles.text}>
            By accessing or using AI LEGAL Mobile, you agree to comply with and be bound by these Terms.
          </ThemedText>

          <ThemedText type="subtitle" style={styles.sectionTitle}>1. Attorney Responsibility</ThemedText>
          <ThemedText style={styles.text}>
            AI LEGAL is an assistant tool. Attorneys remain fully responsible for verifying all citations, legal suggestions, drafts, and case predictors. The software does not provide direct legal advice.
          </ThemedText>

          <ThemedText type="subtitle" style={styles.sectionTitle}>2. Acceptable Use</ThemedText>
          <ThemedText style={styles.text}>
            Attorneys must confirm permissions and compliance before uploading any client materials containing PII or confidential information.
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
