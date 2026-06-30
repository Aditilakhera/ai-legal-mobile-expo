import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { useAuthGuard } from '@/navigation/guards';
import { Button } from '@/components/ui';
import { useRouter } from 'expo-router';
import { useTranslation } from '@/localization';

export default function BillingScreen() {
  useAuthGuard();
  const router = useRouter();
  const { t } = useTranslation();

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/profile');
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title">{t('profile.billingTitle')}</ThemedText>
        <ThemedText style={styles.subtitle}>{t('profile.billingSubtitle')}</ThemedText>

        <View style={styles.content}>
          <ThemedText style={styles.info}>
            {t('profile.billingInfo')}
          </ThemedText>
        </View>

        <Button
          title={t('common.back')}
          variant="outlined"
          onPress={handleBack}
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
