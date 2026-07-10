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
import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { AppConfig } from '@/config';
// @ts-ignore
import { Ionicons } from '@expo/vector-icons';

const isExpoGoEnv = Constants.executionEnvironment === 'storeClient';

let GoogleSignin: any = null;
if (!isExpoGoEnv) {
  try {
    GoogleSignin = require('@react-native-google-signin/google-signin').GoogleSignin;
  } catch (e) {
    console.warn('[LOGIN] Native Google Sign-In SDK is not loaded in this environment.');
  }
}

let AppleAuthentication: any = null;
if (!isExpoGoEnv) {
  try {
    AppleAuthentication = require('expo-apple-authentication');
  } catch (e) {
    console.warn('[LOGIN] Native Apple Authentication SDK is not loaded in this environment.');
  }
}

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
  const [socialLoadingText, setSocialLoadingText] = useState<string | null>(null);

  // Sandbox OAuth simulation state
  const [sandboxModalVisible, setSandboxModalVisible] = useState(false);
  const [sandboxProvider, setSandboxProvider] = useState<'google' | 'apple'>('google');
  const [sandboxName, setSandboxName] = useState('');
  const [sandboxEmail, setSandboxEmail] = useState('');

  // Initialize native Google Sign-In SDK conditionally and load remembered email
  useEffect(() => {
    WebBrowser.maybeCompleteAuthSession();
    if (GoogleSignin) {
      try {
        GoogleSignin.configure({
          webClientId: '743928421487-34c5lpviupilrg1nn62eoccr5m3cek8c.apps.googleusercontent.com',
          offlineAccess: true,
        });
      } catch (err) {
        console.warn('[LOGIN] Failed to configure Google Sign-In:', err);
      }
    }

    async function loadRememberedEmail() {
      try {
        const rememberedEmail = await StorageService.getItem('ai_legal_remembered_email');
        if (rememberedEmail) {
          setEmail(rememberedEmail);
          setRememberMe(true);
          setSandboxEmail(rememberedEmail);
          setSandboxName('Aditi Sharma');
        } else {
          setSandboxEmail('aditi@uwo24.com');
          setSandboxName('Aditi Sharma');
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

  const triggerSocialAuth = async (provider: 'google' | 'apple') => {
    setLoading(true);
    setSocialLoadingText(`Signing in with ${provider === 'google' ? 'Google' : 'Apple'}...`);

    try {
      const isExpoGo = isExpoGoEnv;
      if (provider === 'google') {
        const isNativeGoogleAvailable = GoogleSignin && !isExpoGo;
        if (isNativeGoogleAvailable) {
          console.log('[GOOGLE NATIVE LOGIN] Starting Google Play services check and native sign-in...');
          await GoogleSignin.hasPlayServices();

          // Force clear cached Google session to always show account picker
          try {
            await GoogleSignin.signOut();
          } catch (signOutErr) {
            console.log('[GOOGLE NATIVE LOGIN] Pre-signin signOut (expected if not signed in):', signOutErr);
          }

          const userInfo = await GoogleSignin.signIn();
          const idToken = userInfo.data?.idToken || userInfo.idToken;

          if (!idToken) {
            throw new Error('Google ID Token was not returned.');
          }

          console.log(`[GOOGLE NATIVE LOGIN] Submitting verified ID token to backend...`);
          const res = await AuthService.googleLogin(idToken);

          if (res.success && res.data) {
            const { token } = res.data;
            await StorageService.saveSecret(StorageKeys.AuthToken, token);
            
            if (rememberMe) {
              await StorageService.setItem('ai_legal_remembered_email', res.data.user.email);
            }

            console.log('[GOOGLE NATIVE LOGIN] Syncing profile...');
            const profileRes = await ProfileService.getProfile();
            
            if (profileRes.success && profileRes.data) {
              await StorageService.setItem(StorageKeys.UserSession, JSON.stringify(profileRes.data));
              setCredentials(token, '');
              setProfile(profileRes.data);
              showToast('success', 'Social Login Success', `Welcome back, ${profileRes.data.name}!`);
            } else {
              throw new Error('Could not retrieve user profile from server.');
            }
          } else {
            throw new Error(res.message || 'Google login failed.');
          }
        } else {
          // Real Google Sign-In using WebBrowser redirection (Expo Go compatible)
          console.log('[GOOGLE WEB LOGIN] Opening Expo web browser auth session...');
          
          const baseApiUrl = AppConfig.apiUrl;
          const redirectUri = Linking.createURL('auth/login');
          const authUrl = `${baseApiUrl}/auth/google/expo-login?redirect_uri=${encodeURIComponent(redirectUri)}`;
          
          console.log('[GOOGLE WEB LOGIN] Auth URL:', authUrl);
          console.log('[GOOGLE WEB LOGIN] Redirect URI:', redirectUri);
          
          const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);
          
          if (result.type === 'success' && result.url) {
            const urlObj = Linking.parse(result.url);
            const credential = urlObj.queryParams?.credential as string;
            
            if (!credential) {
              throw new Error('Google identity token was not returned from web browser.');
            }
            
            console.log('[GOOGLE WEB LOGIN] Web login succeeded, submitting JWT to backend...');
            const res = await AuthService.googleLogin(credential);
            
            if (res.success && res.data) {
              const { token } = res.data;
              await StorageService.saveSecret(StorageKeys.AuthToken, token);
              
              if (rememberMe) {
                await StorageService.setItem('ai_legal_remembered_email', res.data.user.email);
              }
              
              const profileRes = await ProfileService.getProfile();
              if (profileRes.success && profileRes.data) {
                await StorageService.setItem(StorageKeys.UserSession, JSON.stringify(profileRes.data));
                setCredentials(token, '');
                setProfile(profileRes.data);
                showToast('success', 'Social Login Success', `Welcome back, ${profileRes.data.name}!`);
              } else {
                throw new Error('Could not retrieve user profile from server.');
              }
            } else {
              throw new Error(res.message || 'Google login verification failed.');
            }
          } else {
            console.log('[GOOGLE WEB LOGIN] WebBrowser session closed or cancelled:', result.type);
            showToast('info', 'Cancelled', 'Google sign-in was cancelled.');
          }
        }
      } else {
        const isAppleAvailable = AppleAuthentication && !isExpoGo;
        if (isAppleAvailable && await AppleAuthentication.isAvailableAsync()) {
          console.log('[APPLE NATIVE LOGIN] Starting Apple native authentication sheet...');
          const credential = await AppleAuthentication.signInAsync({
            requestedScopes: [
              AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
              AppleAuthentication.AppleAuthenticationScope.EMAIL,
            ],
          });

          if (!credential.identityToken) {
            throw new Error('Apple Identity Token was not returned.');
          }

          const fullName = credential.fullName;
          let displayName = undefined;
          if (fullName) {
            displayName = `${fullName.givenName || ''} ${fullName.familyName || ''}`.trim() || undefined;
          }

          console.log(`[APPLE NATIVE LOGIN] Submitting verified Identity token to backend...`);
          const res = await AuthService.appleLogin({
            identityToken: credential.identityToken,
            email: credential.email,
            name: displayName,
          });

          if (res.success && res.data) {
            const { token } = res.data;
            await StorageService.saveSecret(StorageKeys.AuthToken, token);
            
            if (rememberMe) {
              await StorageService.setItem('ai_legal_remembered_email', res.data.user.email);
            }

            console.log('[APPLE NATIVE LOGIN] Syncing profile...');
            const profileRes = await ProfileService.getProfile();
            
            if (profileRes.success && profileRes.data) {
              await StorageService.setItem(StorageKeys.UserSession, JSON.stringify(profileRes.data));
              setCredentials(token, '');
              setProfile(profileRes.data);
              showToast('success', 'Social Login Success', `Welcome back, ${profileRes.data.name}!`);
            } else {
              throw new Error('Could not retrieve user profile from server.');
            }
          } else {
            throw new Error(res.message || 'Apple login failed.');
          }
        } else {
          // Open Interactive Sandbox Dialog
          setSandboxProvider('apple');
          setSandboxName('');
          setSandboxEmail('');
          setSandboxModalVisible(true);
          setLoading(false);
          setSocialLoadingText(null);
        }
      }
    } catch (err: any) {
      console.error('[SOCIAL LOGIN ERROR]', err);
      // Native cancellation checks
      if (err.code === 'SIGN_IN_CANCELLED' || err.code === '1001' || err.message?.includes('cancel')) {
        showToast('info', 'Cancelled', 'Social sign-in cancelled.');
      } else {
        const errMsg = err.error || err.message || 'Failed to authenticate social profile.';
        showToast('error', 'Authentication Failed', errMsg);
      }
      setSocialLoadingText(null);
      setLoading(false);
    }
  };

  const handleSandboxSubmit = async () => {
    if (!sandboxEmail.trim()) {
      showToast('error', 'Required Field', 'Please enter a valid email address.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sandboxEmail)) {
      showToast('error', 'Invalid Email', 'Please enter a valid email address.');
      return;
    }

    setSandboxModalVisible(false);
    setLoading(true);
    setSocialLoadingText(`Simulating ${sandboxProvider === 'google' ? 'Google' : 'Apple'} Sign-in...`);

    try {
      const emailVal = sandboxEmail.toLowerCase().trim();
      const nameVal = sandboxName.trim() || `${sandboxProvider === 'google' ? 'Google' : 'Apple'} User`;

      const res = await AuthService.socialLogin({
        email: emailVal,
        name: nameVal,
        picture: `https://ui-avatars.com/api/?name=${encodeURIComponent(nameVal)}&background=random`,
        provider: sandboxProvider,
        providerId: `sandbox_${sandboxProvider}_${Date.now()}`,
      });

      if (res.success && res.data) {
        const { token } = res.data;
        await StorageService.saveSecret(StorageKeys.AuthToken, token);
        if (rememberMe) {
          await StorageService.setItem('ai_legal_remembered_email', emailVal);
        }

        const profileRes = await ProfileService.getProfile();
        if (profileRes.success && profileRes.data) {
          await StorageService.setItem(StorageKeys.UserSession, JSON.stringify(profileRes.data));
          setCredentials(token, '');
          setProfile(profileRes.data);
          showToast('success', 'Social Login Success (Simulated)', `Welcome, ${profileRes.data.name}!`);
        } else {
          throw new Error('Could not retrieve user profile from server.');
        }
      } else {
        throw new Error(res.message || 'Sandbox login failed.');
      }
    } catch (err: any) {
      console.error('[SANDBOX AUTH ERROR]', err);
      showToast('error', 'Authentication Failed', err.message || 'Sandbox authentication failed.');
    } finally {
      setSocialLoadingText(null);
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
                title={socialLoadingText || "Log In"}
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
                  style={[styles.socialBtn, loading && { opacity: 0.5 }]} 
                  onPress={() => !loading && triggerSocialAuth('google')}
                  disabled={loading}
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
            {/* Sandbox Simulation Auth Modal */}
            <Modal
              visible={sandboxModalVisible}
              transparent={true}
              animationType="fade"
              onRequestClose={() => setSandboxModalVisible(false)}
            >
              <View style={styles.sandboxOverlay}>
                <View style={styles.sandboxContainer}>
                  <View style={styles.sandboxHeader}>
                    <Text style={styles.sandboxTitle}>
                      {sandboxProvider === 'google' ? 'Google' : 'Apple'} Sign-In Simulation
                    </Text>
                    <Pressable onPress={() => setSandboxModalVisible(false)}>
                      <Ionicons name="close" size={24} color="#64748B" />
                    </Pressable>
                  </View>

                  <Text style={styles.sandboxSubtitle}>
                    Enter your real name and email address to simulate the OAuth authentication flow inside Expo Go.
                  </Text>

                  <View style={{ gap: 14 }}>
                    <View>
                      <Text style={styles.inputLabel}>Display Name</Text>
                      <TextInput
                        style={styles.sandboxInput}
                        value={sandboxName}
                        onChangeText={setSandboxName}
                        placeholder="e.g. Aditi Sharma"
                        placeholderTextColor="#94A3B8"
                      />
                    </View>

                    <View>
                      <Text style={styles.inputLabel}>Email Address</Text>
                      <TextInput
                        style={styles.sandboxInput}
                        value={sandboxEmail}
                        onChangeText={setSandboxEmail}
                        placeholder="e.g. aditi@uwo24.com"
                        placeholderTextColor="#94A3B8"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                    </View>

                    <TouchableOpacity 
                      style={[styles.sandboxSubmitBtn, { backgroundColor: '#6D5DFC' }]} 
                      onPress={handleSandboxSubmit}
                    >
                      <Text style={styles.sandboxSubmitBtnText}>Proceed with Sign-In</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Modal>

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
  sandboxOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  sandboxContainer: {
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
  sandboxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sandboxTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  sandboxSubtitle: {
    fontSize: 12.5,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  sandboxInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13.5,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  sandboxSubmitBtn: {
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  sandboxSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '800',
  },
});
