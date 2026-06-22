/**
 * AI Legal Mobile - Reset Password Screen
 * Custom token validation page with security strength metrics, mismatch checks, and a SuccessDialog overlay.
 */

import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useGuestGuard } from '@/navigation/guards';
import { Button, PasswordInput, SuccessDialog, Slide } from '@/components/ui';
import { AuthService } from '@/services/auth.service';
import { useToastContext } from '@/providers';

export default function ResetPasswordScreen() {
  useGuestGuard();
  const router = useRouter();
  const { showToast } = useToastContext();
  const params = useLocalSearchParams<{ token: string; email: string }>();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // Password strength calculation utility
  const getStrengthMetrics = (pass: string) => {
    if (!pass) return { score: 0, label: '', color: '#E2E8F0', width: '0%' };
    
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;

    switch (score) {
      case 0:
      case 1:
        return { score, label: 'Weak', color: '#EF4444', width: '25%' };
      case 2:
        return { score, label: 'Fair', color: '#F59E0B', width: '50%' };
      case 3:
        return { score, label: 'Good', color: '#3B82F6', width: '75%' };
      case 4:
      default:
        return { score, label: 'Strong', color: '#10B981', width: '100%' };
    }
  };

  const strength = getStrengthMetrics(password);

  const validate = (): boolean => {
    let isValid = true;
    setPasswordError('');
    setConfirmError('');

    // Ensure password matches backend rules (min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char)
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

    if (!password) {
      setPasswordError('New password is required.');
      isValid = false;
    } else if (!passwordRegex.test(password)) {
      setPasswordError('Must be at least 8 characters with 1 uppercase, 1 lowercase, 1 number, and 1 special character.');
      isValid = false;
    }

    if (!confirmPassword) {
      setConfirmError('Please confirm your password.');
      isValid = false;
    } else if (password !== confirmPassword) {
      setConfirmError('Passwords do not match.');
      isValid = false;
    }

    return isValid;
  };

  const handleReset = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      console.log('[RESET PASSWORD] Requesting resetPassword API...');
      const response = await AuthService.resetPassword({
        email: params.email,
        otp: params.token,
        newPassword: password,
      });

      if (response.success) {
        showToast('success', 'Password Updated', 'Your password has been successfully updated.');
        setShowSuccess(true);
      } else {
        throw new Error(response.message || 'Failed to reset password.');
      }
    } catch (err: any) {
      console.error('[RESET PASSWORD ERROR]', err);
      const errMsg = err.error || err.message || 'Invalid/Expired verification code or connection error.';
      showToast('error', 'Reset Failed', errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleSuccessConfirm = () => {
    setShowSuccess(false);
    router.replace('/auth/login' as any);
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
            {/* Header branding */}
            <View style={styles.header}>
              <Text style={styles.brandIcon}>🔒</Text>
              <Text style={styles.title}>New Password</Text>
              <Text style={styles.subtitle}>
                Create a secure password to protect your legal case workspace
              </Text>
            </View>

            {/* Form inputs */}
            <View style={styles.form}>
              <PasswordInput
                label="New Password"
                placeholder="Enter new password"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (passwordError) setPasswordError('');
                }}
                error={passwordError}
                accessibilityLabel="New Password Input"
              />

              {/* Password strength visual meter */}
              {password.length > 0 && (
                <View style={styles.strengthContainer}>
                  <View style={styles.strengthTextRow}>
                    <Text style={styles.strengthLabel}>Password Strength:</Text>
                    <Text style={[styles.strengthValue, { color: strength.color }]}>
                      {strength.label}
                    </Text>
                  </View>
                  <View style={styles.strengthBarBackground}>
                    <View
                      style={[
                        styles.strengthBarActive,
                        { backgroundColor: strength.color, width: strength.width as any },
                      ]}
                    />
                  </View>
                  <Text style={styles.strengthHint}>
                    Tip: Use uppercase letters, numbers, and symbols for better security.
                  </Text>
                </View>
              )}

              <PasswordInput
                label="Confirm New Password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  if (confirmError) setConfirmError('');
                }}
                error={confirmError}
                accessibilityLabel="Confirm Password Input"
              />

              <Button
                title="Reset Password"
                variant="primary"
                onPress={handleReset}
                loading={loading}
                disabled={loading}
                style={[styles.actionBtn, { backgroundColor: '#6D5DFC' }]}
              />
            </View>
          </Slide>
        </SafeAreaView>
      </ScrollView>

      {/* Success Dialog overlay */}
      <SuccessDialog
        visible={showSuccess}
        title="Password Updated"
        description="Your password has been successfully reset. You can now use your new password to sign in."
        confirmLabel="Continue to Login"
        onConfirm={handleSuccessConfirm}
      />
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
  strengthContainer: {
    marginVertical: 4,
  },
  strengthTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  strengthLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  strengthValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  strengthBarBackground: {
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  strengthBarActive: {
    height: '100%',
    borderRadius: 3,
  },
  strengthHint: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 6,
    lineHeight: 15,
  },
  actionBtn: {
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    marginTop: 12,
  },
});
