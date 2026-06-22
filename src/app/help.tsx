import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { useAuthGuard } from '@/navigation/guards';
import { Button } from '@/components/ui';
import { useRouter } from 'expo-router';

export default function HelpScreen() {
  useAuthGuard();
  const router = useRouter();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title">Help & Support</ThemedText>
        <ThemedText style={styles.subtitle}>Frequently Asked Questions and customer relations desk.</ThemedText>

        <View style={styles.content}>
          <ThemedText style={styles.info}>
            Need assistance with model citations or billing queries? Contact support@ailegal.com
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
