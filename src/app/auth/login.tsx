/**
 * AI Legal Mobile - Premium Login Screen
 * Minimal, modern visual form with validation controls and animated entries.
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
  Image,
  Modal,
  ActivityIndicator,
  TouchableWithoutFeedback,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useGuestGuard } from '@/navigation/guards';
import { Button, TextInput, PasswordInput, Slide, Fade } from '@/components/ui';
import { useAuthStore } from '@/store/auth';
import { useUserStore } from '@/store/user';
import { AuthService } from '@/services/auth.service';
import { ProfileService } from '@/services/profile.service';
import { StorageService } from '@/services/storage.service';
import { StorageKeys } from '@/constants/app-constants';
import { useToastContext } from '@/providers';

export default function LoginScreen() {
  useGuestGuard();
  const router = useRouter();
  const { showToast } = useToastContext();
  const setCredentials = useAuthStore((s) => s.setCredentials);
  const setProfile = useUserStore((s) => s.setProfile);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [loading, setLoading] = useState(false);

  // Social Login Dialog States
  const [socialModalVisible, setSocialModalVisible] = useState(false);
  const [socialProvider, setSocialProvider] = useState<'google' | 'apple'>('google');
  const [socialEmail, setSocialEmail] = useState('');
  const [socialEmailError, setSocialEmailError] = useState('');
  const [isSocialSubmitting, setIsSocialSubmitting] = useState(false);

  // Load remembered email on startup
  useEffect(() => {
    async function loadRememberedEmail() {
      try {
        const rememberedEmail = await StorageService.getItem('ai_legal_remembered_email');
        if (rememberedEmail) {
          setEmail(rememberedEmail);
          setRememberMe(true);
        }
      } catch (err) {
        console.warn('[LOGIN] Failed to load remembered email:', err);
      }
    }
    loadRememberedEmail();
  }, []);

  const validate = (): boolean => {
    let isValid = true;
    setEmailError('');
    setPasswordError('');

    if (!email.trim()) {
      setEmailError('Email address is required.');
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError('Please enter a valid email address.');
      isValid = false;
    }

    if (!password.trim()) {
      setPasswordError('Password is required.');
      isValid = false;
    }

    return isValid;
  };

  const handleLogin = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      console.log('[LOGIN] Requesting login API...');
      const response = await AuthService.login({ email, password });

      if (response.success && response.data) {
        const { token } = response.data;

        // Save access token securely
        await StorageService.saveSecret(StorageKeys.AuthToken, token);

        // Save/Remove Remember Me email preferences
        if (rememberMe) {
          await StorageService.setItem('ai_legal_remembered_email', email);
        } else {
          await StorageService.removeItem('ai_legal_remembered_email');
        }

        // Fetch full profile from DB
        console.log('[LOGIN] Requesting full profile synchronization...');
        const profileRes = await ProfileService.getProfile();

        if (profileRes.success && profileRes.data) {
          // Cache user profile details in AsyncStorage
          await StorageService.setItem(StorageKeys.UserSession, JSON.stringify(profileRes.data));

          // Load into stores (will trigger auto-redirection via GuestGuard)
          setCredentials(token, '');
          setProfile(profileRes.data);

          showToast('success', 'Welcome Back', 'Logged in successfully.');
        } else {
          throw new Error('Could not retrieve user profile from server.');
        }
      } else {
        throw new Error(response.message || 'Login failed.');
      }
    } catch (err: any) {
      console.error('[LOGIN ERROR]', err);
      const errMsg = err.error || err.message || 'Invalid credentials or connection error.';
      showToast('error', 'Login Failed', errMsg);
    } finally {
      setLoading(false);
    }
  };

  const triggerSocialAuth = (provider: 'google' | 'apple') => {
    setSocialProvider(provider);
    setSocialEmail('');
    setSocialEmailError('');
    setSocialModalVisible(true);
  };

  const handleSocialSubmit = async () => {
    if (!socialEmail.trim()) {
      setSocialEmailError('Email is required.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(socialEmail)) {
      setSocialEmailError('Please enter a valid email address.');
      return;
    }
    setSocialEmailError('');
    setIsSocialSubmitting(true);

    try {
      const name = socialEmail.split('@')[0].replace(/[^a-zA-Z]/g, ' ');
      const nameFormatted = name.trim().split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ') || 'Social User';
      const providerId = `${socialProvider}_${Date.now()}`;
      const picture = `https://ui-avatars.com/api/?name=${encodeURIComponent(nameFormatted)}&background=random&color=fff&size=256`;

      console.log(`[SOCIAL LOGIN] Requesting JIT-provision login for ${socialEmail} via ${socialProvider}...`);
      const res = await AuthService.socialLogin({
        email: socialEmail.trim().toLowerCase(),
        name: nameFormatted,
        picture,
        provider: socialProvider,
        providerId
      });

      if (res.success && res.data) {
        const { token } = res.data;
        // Save access token securely
        await StorageService.saveSecret(StorageKeys.AuthToken, token);
        
        // Fetch full profile from DB
        console.log('[SOCIAL LOGIN] Requesting user profile synchronization...');
        const profileRes = await ProfileService.getProfile();
        
        if (profileRes.success && profileRes.data) {
          // Cache user profile details in AsyncStorage
          await StorageService.setItem(StorageKeys.UserSession, JSON.stringify(profileRes.data));
          
          // Load into stores (will trigger auto-redirection via GuestGuard)
          setCredentials(token, '');
          setProfile(profileRes.data);
          
          showToast('success', 'Social Login Success', `Welcome back, ${profileRes.data.name}!`);
          setSocialModalVisible(false);
        } else {
          throw new Error('Could not retrieve user profile from server.');
        }
      } else {
        throw new Error(res.message || 'Social login failed.');
      }
    } catch (err: any) {
      console.error('[SOCIAL LOGIN ERROR]', err);
      const errMsg = err.error || err.message || 'Failed to authenticate social profile.';
      showToast('error', 'Authentication Failed', errMsg);
    } finally {
      setIsSocialSubmitting(false);
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
            <View style={styles.header}>
              <Image 
                source={require('../../../assets/images/premium_black_scales_3d.png')} 
                style={{ width: 68, height: 68, marginBottom: 16 }} 
                resizeMode="contain" 
              />
              <Text style={styles.title}>Welcome to AI LEGAL</Text>
              <Text style={styles.subtitle}>Enter credentials to access your secure workspace</Text>
            </View>

            {/* Inputs Block */}
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
                accessibilityLabel="Email Input"
              />

              <PasswordInput
                label="Password"
                placeholder="Enter password"
                value={password}
                onChangeText={setPassword}
                error={passwordError}
                autoComplete="password"
                accessibilityLabel="Password Input"
              />

              {/* Extra toggles row */}
              <View style={styles.optionsRow}>
                <Pressable
                  style={styles.rememberMeContainer}
                  onPress={() => setRememberMe(!rememberMe)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: rememberMe }}
                  accessibilityLabel="Remember Me checkbox"
                >
                  <View
                    style={[
                      styles.checkbox,
                      { borderColor: rememberMe ? '#6D5DFC' : '#CBD5E1', backgroundColor: rememberMe ? '#6D5DFC' : '#FFF' },
                    ]}
                  >
                    {rememberMe && <Text style={styles.checkboxTick}>✓</Text>}
                  </View>
                  <Text style={styles.optionLabel}>Remember me</Text>
                </Pressable>

                <Pressable
                  onPress={() => router.push('/auth/forgot-password')}
                  accessibilityRole="link"
                  accessibilityLabel="Forgot Password link"
                >
                  <Text style={[styles.forgotPasswordText, { color: '#6D5DFC' }]}>Forgot Password?</Text>
                </Pressable>
              </View>

              {/* Form submit button */}
              <Button
                title="Log In"
                variant="primary"
                onPress={handleLogin}
                loading={loading}
                disabled={loading}
                style={[styles.actionBtn, { backgroundColor: '#6D5DFC' }]}
              />
            </View>

            {/* Social Oauth options */}
            <Fade duration={500} delay={200} style={styles.socialBlock}>
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR CONTINUE WITH</Text>
                <View style={styles.dividerLine} />
              </View>

              <View style={styles.socialButtonsRow}>
                <Pressable 
                  style={styles.socialBtn} 
                  onPress={() => triggerSocialAuth('google')}
                  accessibilityLabel="Log in with Google" 
                  accessibilityRole="button"
                >
                  <Image 
                    source={require('../../../assets/images/official_google_g_logo.png')} 
                    style={{ width: 22, height: 22 }} 
                    resizeMode="contain" 
                  />
                  <Text style={styles.socialBtnText}>Google</Text>
                </Pressable>

                <Pressable 
                  style={styles.socialBtn} 
                  onPress={() => triggerSocialAuth('apple')}
                  accessibilityLabel="Log in with Apple" 
                  accessibilityRole="button"
                >
                  <Image 
                    source={require('../../../assets/images/official_black_apple_logo.png')} 
                    style={{ width: 22, height: 22 }} 
                    resizeMode="contain" 
                  />
                  <Text style={styles.socialBtnText}>Apple</Text>
                </Pressable>
              </View>
            </Fade>

            {/* Account registration footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>New to AI LEGAL?</Text>
              <Pressable
                onPress={() => router.push('/auth/signup')}
                accessibilityRole="link"
                accessibilityLabel="Navigate to signup"
              >
                <Text style={[styles.footerLink, { color: '#6D5DFC' }]}>Create Account</Text>
              </Pressable>
            </View>
          </Slide>
        </SafeAreaView>
      </ScrollView>

      {/* Premium Social Sign-In Modal */}
      <Modal
        visible={socialModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSocialModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setSocialModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContainer}>
                {/* Header branding */}
                <View style={styles.modalHeader}>
                  <Image 
                    source={
                      socialProvider === 'google' 
                        ? require('../../../assets/images/official_google_g_logo.png')
                        : require('../../../assets/images/official_black_apple_logo.png')
                    }
                    style={{ width: 44, height: 44, marginBottom: 12 }}
                    resizeMode="contain"
                  />
                  <Text style={styles.modalTitle}>
                    Sign in with {socialProvider === 'google' ? 'Google' : 'Apple'}
                  </Text>
                  <Text style={styles.modalSubtitle}>
                    Enter your {socialProvider === 'google' ? 'Google' : 'Apple ID'} email to establish secure handshake
                  </Text>
                </View>

                {/* Input block */}
                <View style={styles.modalForm}>
                  <TextInput
                    label="Email Address"
                    placeholder="name@example.com"
                    value={socialEmail}
                    onChangeText={setSocialEmail}
                    error={socialEmailError}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    accessibilityLabel="Social Email Input"
                  />

                  {/* Submit / Cancel buttons */}
                  <View style={styles.modalButtonsRow}>
                    <TouchableOpacity 
                      style={[styles.modalBtn, styles.modalCancelBtn]} 
                      onPress={() => setSocialModalVisible(false)}
                      disabled={isSocialSubmitting}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.modalCancelBtnText}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={[styles.modalBtn, styles.modalSubmitBtn, { backgroundColor: '#6D5DFC' }]} 
                      onPress={handleSocialSubmit}
                      disabled={isSocialSubmitting}
                      activeOpacity={0.7}
                    >
                      {isSocialSubmitting ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={styles.modalSubmitBtnText}>Continue</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
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
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
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
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
  rememberMeContainer: {
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
  optionLabel: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '600',
  },
  forgotPasswordText: {
    fontSize: 13,
    fontWeight: '700',
  },
  actionBtn: {
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    marginTop: 12,
  },
  socialBlock: {
    marginTop: 32,
    width: '100%',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '700',
    marginHorizontal: 12,
    letterSpacing: 1,
  },
  socialButtonsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  socialBtn: {
    flex: 1,
    flexDirection: 'row',
    height: 48,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
  },
  socialIcon: {
    fontSize: 18,
  },
  socialBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 32,
    marginBottom: 16,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  modalForm: {
    gap: 16,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalBtn: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCancelBtn: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: 'transparent',
  },
  modalSubmitBtn: {
    backgroundColor: '#6D5DFC',
  },
  modalCancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  modalSubmitBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
