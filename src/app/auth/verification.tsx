/**
 * AI Legal Mobile - OTP Verification Screen
 * Premium verification layout using OtpInput, resend timers, and clipboard integrations.
 */

import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Clipboard,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useGuestGuard } from '@/navigation/guards';
import { Button, OtpInput, Slide, Fade } from '@/components/ui';
import { AuthService } from '@/services/auth.service';
import { ProfileService } from '@/services/profile.service';
import { StorageService } from '@/services/storage.service';
import { StorageKeys } from '@/constants/app-constants';
import { useAuthStore } from '@/store/auth';
import { useUserStore } from '@/store/user';
import { useToastContext } from '@/providers';

export default function VerificationScreen() {
  useGuestGuard();
  const router = useRouter();
  const { showToast } = useToastContext();
  const params = useLocalSearchParams<{ email: string; reason: 'signup' | 'reset' }>();
  
  const setCredentials = useAuthStore((s) => s.setCredentials);
  const setProfile = useUserStore((s) => s.setProfile);

  const targetEmail = params.email || 'your email';
  const reason = params.reason || 'signup';

  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(60);
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Handle resend countdown timer
  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => {
      setResendTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleVerify = async () => {
    setError('');
    setSuccessMessage('');

    if (otp.length < 6) {
      setError('Please enter the complete 6-digit verification code.');
      return;
    }

    setLoading(true);
    try {
      if (reason === 'signup') {
        console.log('[VERIFICATION] Requesting verifyEmail API...');
        const response = await AuthService.verifyEmail({ email: targetEmail, code: otp });

        if (response.success && response.data) {
          const { token } = response.data;

          // Save access token securely
          await StorageService.saveSecret(StorageKeys.AuthToken, token);

          // Fetch full profile from DB
          console.log('[VERIFICATION] Fetching full profile synchronization...');
          const profileRes = await ProfileService.getProfile();

          if (profileRes.success && profileRes.data) {
            // Cache user profile details in AsyncStorage
            await StorageService.setItem(StorageKeys.UserSession, JSON.stringify(profileRes.data));

            // Load into stores (will trigger auto-redirection via GuestGuard)
            setCredentials(token, '');
            setProfile(profileRes.data);

            showToast('success', 'Email Verified', 'Your account has been successfully verified and logged in.');
          } else {
            throw new Error('Could not retrieve user profile from server.');
          }
        } else {
          throw new Error(response.message || 'Verification failed.');
        }
      } else {
        // reason === 'reset'
        // No standalone verify reset OTP backend endpoint; we pass code to reset page
        console.log('[VERIFICATION] Verification code stored, redirecting to reset page.');
        router.push({
          pathname: `/auth/reset-password/${otp}` as any,
          params: { email: targetEmail },
        });
      }
    } catch (err: any) {
      console.error('[VERIFICATION ERROR]', err);
      const errMsg = err.error || err.message || 'Verification failed. Please check the code.';
      setError(errMsg);
      showToast('error', 'Verification Failed', errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setOtp('');
    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      console.log('[VERIFICATION] Requesting resendCode API...');
      const response = await AuthService.resendCode(targetEmail);

      if (response.success) {
        setSuccessMessage('A new 6-digit verification code has been sent.');
        setResendTimer(60);
        showToast('success', 'Code Resent', 'Verification code resent successfully.');
      } else {
        throw new Error(response.message || 'Failed to resend code.');
      }
    } catch (err: any) {
      console.error('[VERIFICATION RESEND ERROR]', err);
      const errMsg = err.error || err.message || 'Could not resend verification code.';
      setError(errMsg);
      showToast('error', 'Resend Failed', errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await Clipboard.getString();
      if (text) {
        const cleaned = text.replace(/[^0-9]/g, '').slice(0, 6);
        if (cleaned.length > 0) {
          setOtp(cleaned);
          setError('');
          setSuccessMessage(`Pasted code: ${cleaned}`);
        } else {
          setError('Clipboard does not contain a numeric verification code.');
        }
      } else {
        setError('Clipboard is empty.');
      }
    } catch (err) {
      console.warn('Failed to read from clipboard:', err);
      setError('Could not access clipboard.');
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
              <Text style={styles.title}>Verify Email</Text>
              <Text style={styles.subtitle}>
                We sent a 6-digit verification code to
              </Text>
              <Text style={styles.emailHighlight}>{targetEmail}</Text>
            </View>

            {/* OTP Cell Block */}
            <View style={styles.form}>
              <OtpInput
                codeLength={6}
                value={otp}
                onChangeValue={(val) => {
                  setOtp(val);
                  if (error) setError('');
                  if (successMessage) setSuccessMessage('');
                }}
                error={error}
              />

              {/* Paste helper option */}
              <Pressable
                onPress={handlePasteFromClipboard}
                style={styles.pasteBtn}
                accessibilityRole="button"
                accessibilityLabel="Paste verification code from clipboard"
              >
                <Text style={styles.pasteBtnText}>Paste from Clipboard</Text>
              </Pressable>

              {successMessage ? (
                <Fade duration={300} style={styles.successContainer}>
                  <Text style={styles.successText}>✓ {successMessage}</Text>
                </Fade>
              ) : null}

              <Button
                title="Verify Code"
                variant="primary"
                onPress={handleVerify}
                loading={loading}
                disabled={otp.length < 6 || loading}
                style={[styles.actionBtn, { backgroundColor: '#6D5DFC' }]}
              />
            </View>

            {/* Resend actions */}
            <View style={styles.resendContainer}>
              {resendTimer > 0 ? (
                <Text style={styles.timerText}>
                  Resend code in <Text style={styles.timerCount}>{resendTimer}s</Text>
                </Text>
              ) : (
                <View style={styles.resendRow}>
                  <Text style={styles.footerText}>{"Didn't receive the code? "}</Text>
                  <Pressable
                    onPress={handleResend}
                    accessibilityRole="button"
                    accessibilityLabel="Resend verification code"
                  >
                    <Text style={styles.resendLinkText}>Resend</Text>
                  </Pressable>
                </View>
              )}
            </View>

            {/* Back to login option */}
            <Pressable
              onPress={() => router.push('/auth/login')}
              style={styles.backBtn}
              accessibilityRole="link"
              accessibilityLabel="Navigate back to login"
            >
              <Text style={styles.backBtnText}>Back to Log In</Text>
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
  },
  emailHighlight: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 2,
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  pasteBtn: {
    alignSelf: 'center',
    marginVertical: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  pasteBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6D5DFC',
  },
  successContainer: {
    marginVertical: 8,
    alignItems: 'center',
  },
  successText: {
    fontSize: 13,
    color: '#10B981',
    fontWeight: '600',
    textAlign: 'center',
  },
  actionBtn: {
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    marginTop: 16,
  },
  resendContainer: {
    marginTop: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 24,
  },
  timerText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  timerCount: {
    color: '#6D5DFC',
    fontWeight: '700',
  },
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  resendLinkText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6D5DFC',
  },
  backBtn: {
    alignSelf: 'center',
    marginTop: 24,
    padding: 8,
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6D5DFC',
  },
});
