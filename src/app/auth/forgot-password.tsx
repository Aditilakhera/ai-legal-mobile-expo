/**
 * AI Legal Mobile - Forgot Password Screen
 * Captures email address for password reset OTP dispatch.
 */

import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useGuestGuard } from '@/navigation/guards';
import { Button, TextInput, Slide } from '@/components/ui';
import { AuthService } from '@/services/auth.service';
import { useToastContext } from '@/providers';

export default function ForgotPasswordScreen() {
  useGuestGuard();
  const router = useRouter();
  const { showToast } = useToastContext();
  const params = useLocalSearchParams<{ email?: string }>();
  
  const [email, setEmail] = useState(params.email || '');
  const [emailError, setEmailError] = useState('');
  const [loading, setLoading] = useState(false);

  const validate = (): boolean => {
    setEmailError('');
    if (!email.trim()) {
      setEmailError('Email address is required.');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError('Please enter a valid email address.');
      return false;
    }
    return true;
  };

  const handleForgotPassword = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      console.log('[FORGOT PASSWORD] Requesting forgotPassword API...');
      const response = await AuthService.forgotPassword(email);

      if (response.success) {
        showToast('success', 'OTP Sent', response.message || 'OTP Sent Successfully.');
        // Navigate to OTP verification for password reset
        router.push({
          pathname: '/auth/verification' as any,
          params: { email, reason: 'reset' },
        });
      } else {
        throw new Error(response.message || 'Failed to dispatch reset code.');
      }
    } catch (err: any) {
      console.error('[FORGOT PASSWORD ERROR]', err);
      const errMsg = err.error || err.message || 'Could not send reset code. Verify your email is registered.';
      showToast('error', 'Request Failed', errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.keyboardView}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <SafeAreaView style={styles.safeArea}>
          <Slide duration={400} from="bottom" style={styles.content}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.brandIcon}>⚖️</Text>
              <Text style={styles.title}>Reset Password</Text>
              <Text style={styles.subtitle}>
                {"Enter your email and we'll send a 6-digit verification code to reset your password."}
              </Text>
            </View>

            {/* Email form */}
            <View style={styles.form}>
              <TextInput
                label="Email Address"
                placeholder="name@company.com"
                value={email}
                onChangeText={setEmail}
                error={emailError}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                accessibilityLabel="Recovery Email Input"
              />

              <Button
                title="Send Verification Code"
                variant="primary"
                onPress={handleForgotPassword}
                loading={loading}
                disabled={loading}
                style={[styles.actionBtn, { backgroundColor: '#6D5DFC' }]}
              />
            </View>

            {/* Back button */}
            <Pressable
              onPress={() => router.push('/auth/login')}
              style={styles.backBtn}
              accessibilityRole="link"
              accessibilityLabel="Navigate back to login"
            >
              <Text style={[styles.backBtnText, { color: '#6D5DFC' }]}>Back to Log In</Text>
            </Pressable>
          </Slide>
        </SafeAreaView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContainer: {
    flexGrow: 1,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  content: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  brandIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  form: {
    gap: 16,
    width: '100%',
  },
  actionBtn: {
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    marginTop: 8,
  },
  backBtn: {
    alignSelf: 'center',
    marginTop: 24,
    padding: 8,
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
