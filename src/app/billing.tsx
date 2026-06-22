import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { useAuthGuard } from '@/navigation/guards';
import { Button } from '@/components/ui';
import { useRouter } from 'expo-router';

export default function BillingScreen() {
  useAuthGuard();
  const router = useRouter();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title">Billing & Credits</ThemedText>
        <ThemedText style={styles.subtitle}>Manage credit bounds and workspace subscriptions.</ThemedText>

        <View style={styles.content}>
          <ThemedText style={styles.info}>
            Your enterprise subscription tier: Premium Pro (Founder Status active).
          </ThemedText>
        </View>

        <Button
          title="Back"
          variant="outlined"
          onPress={() => router.back()}
          style={styles.backBtn}
        />
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
    padding: 24,
  },
  subtitle: {
    marginTop: 8,
    marginBottom: 32,
    opacity: 0.7,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    textAlign: 'center',
    opacity: 0.8,
  },
  backBtn: {
    alignSelf: 'stretch',
  },
});
