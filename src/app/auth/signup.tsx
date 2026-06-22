/**
 * AI Legal Mobile - Premium Registration Screen
 * Standard client-side inputs, safety validations, and terms checkbox.
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
import { useRouter } from 'expo-router';
import { useGuestGuard } from '@/navigation/guards';
import { Button, TextInput, PasswordInput, PhoneInput, Slide } from '@/components/ui';
import { AuthService } from '@/services/auth.service';
import { useToastContext } from '@/providers';

export default function SignupScreen() {
  useGuestGuard();
  const router = useRouter();
  const { showToast } = useToastContext();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);

  // Error States
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [termsError, setTermsError] = useState('');
  const [loading, setLoading] = useState(false);

  const validate = (): boolean => {
    let isValid = true;
    setNameError('');
    setEmailError('');
    setPhoneError('');
    setPasswordError('');
    setConfirmPasswordError('');
    setTermsError('');

    if (!name.trim()) {
      setNameError('Full name is required.');
      isValid = false;
    }

    if (!email.trim()) {
      setEmailError('Email address is required.');
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError('Please enter a valid email address.');
      isValid = false;
    }

    if (!phone.trim()) {
      setPhoneError('Phone number is required.');
      isValid = false;
    }

    // Password strength check (aligned with Express backend regex requirement)
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!password.trim()) {
      setPasswordError('Password is required.');
      isValid = false;
    } else if (!passwordRegex.test(password)) {
      setPasswordError('Must be at least 8 characters with 1 uppercase, 1 lowercase, 1 number, and 1 special character.');
      isValid = false;
    }

    if (!confirmPassword.trim()) {
      setConfirmPasswordError('Please confirm your password.');
      isValid = false;
    } else if (password !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match.');
      isValid = false;
    }

    if (!acceptTerms) {
      setTermsError('You must accept the terms & conditions.');
      isValid = false;
    }

    return isValid;
  };

  const handleSignup = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      console.log('[SIGNUP] Requesting signup API...');
      const response = await AuthService.signup({ name, email, password });

      if (response.success && response.data) {
        showToast('success', 'Account Created', response.message || 'Verification code sent successfully.');
        // Route to verification OTP screen
        router.push({
          pathname: '/auth/verification' as any,
          params: { email, reason: 'signup' },
        });
      } else {
        throw new Error(response.message || 'Signup failed.');
      }
    } catch (err: any) {
      console.error('[SIGNUP ERROR]', err);
      const errMsg = err.error || err.message || 'An error occurred during registration. Email might be in use.';
      showToast('error', 'Registration Failed', errMsg);
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
              <Text style={styles.title}>Create Account</Text>
              <Text style={styles.subtitle}>Get started with your Artificial Intelligence Super Assistant</Text>
            </View>

            {/* Registration Form */}
            <View style={styles.form}>
              <TextInput
                label="Full Name"
                placeholder="e.g. John Doe"
                value={name}
                onChangeText={setName}
                error={nameError}
                accessibilityLabel="Full Name Input"
              />

              <TextInput
                label="Email Address"
                placeholder="name@company.com"
                value={email}
                onChangeText={setEmail}
                error={emailError}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                accessibilityLabel="Email Input"
              />

              <PhoneInput
                label="Phone Number"
                value={phone}
                onChangeText={setPhone}
                error={phoneError}
                accessibilityLabel="Phone Number Input"
              />

              <PasswordInput
                label="Password"
                placeholder="Choose password"
                value={password}
                onChangeText={setPassword}
                error={passwordError}
                accessibilityLabel="Password Choice Input"
              />

              <PasswordInput
                label="Confirm Password"
                placeholder="Confirm password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                error={confirmPasswordError}
                accessibilityLabel="Confirm Password Input"
              />

              {/* Checkbox for terms */}
              <View style={styles.termsBlock}>
                <Pressable
                  style={styles.termsContainer}
                  onPress={() => setAcceptTerms(!acceptTerms)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: acceptTerms }}
                  accessibilityLabel="Accept Terms and Conditions checkbox"
                >
                  <View
                    style={[
                      styles.checkbox,
                      { borderColor: acceptTerms ? '#6D5DFC' : '#CBD5E1', backgroundColor: acceptTerms ? '#6D5DFC' : '#FFF' },
                    ]}
                  >
                    {acceptTerms && <Text style={styles.checkboxTick}>✓</Text>}
                  </View>
                  <Text style={styles.termsLabel}>
                    I accept the <Text style={{ color: '#6D5DFC', fontWeight: '700' }}>Terms of Service</Text> & <Text style={{ color: '#6D5DFC', fontWeight: '700' }}>Privacy Policy</Text>
                  </Text>
                </Pressable>
                {termsError && <Text style={[styles.errorText, { color: '#EF4444' }]}>{termsError}</Text>}
              </View>

              {/* Submit button */}
              <Button
                title="Create Account"
                variant="primary"
                onPress={handleSignup}
                loading={loading}
                disabled={loading}
                style={[styles.actionBtn, { backgroundColor: '#6D5DFC' }]}
              />
            </View>

            {/* Login redirect footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account?</Text>
              <Pressable
                onPress={() => router.push('/auth/login')}
                accessibilityRole="link"
                accessibilityLabel="Navigate to login"
              >
                <Text style={[styles.footerLink, { color: '#6D5DFC' }]}>Log In</Text>
              </Pressable>
            </View>
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
    paddingVertical: 24,
    justifyContent: 'center',
  },
  content: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
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
    fontSize: 13,
    color: '#475569',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  form: {
    gap: 12,
    width: '100%',
  },
  termsBlock: {
    marginVertical: 4,
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxTick: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  termsLabel: {
    fontSize: 13,
    color: '#475569',
    flex: 1,
    lineHeight: 18,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  actionBtn: {
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    marginTop: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 24,
  },
  footerText: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '500',
  },
  footerLink: {
    fontSize: 14,
    fontWeight: '700',
  },
});
