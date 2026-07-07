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

const isExpoGoEnv = Constants.appOwnership === 'expo' || Constants.executionEnvironment === 'storeClient';

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

  // Initialize native Google Sign-In SDK conditionally and load remembered email
  useEffect(() => {
    if (GoogleSignin) {
      try {
        GoogleSignin.configure({
          webClientId: '764086051850-6qr4p6gpi6hn506pt8ejuq83di341hur.apps.googleusercontent.com',
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
      const isExpoGo = Constants.appOwnership === 'expo';
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
          const idToken = userInfo.data?.idToken;

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
          // Expo Go Sandbox Fallback
          showToast('info', 'Sandbox Mode', 'Expo Go Fallback: Using sandbox simulation.');
          console.log('[GOOGLE SANDBOX LOGIN] Simulating Google Sign-In...');
          const testEmail = 'google_sandbox_user@example.com';
          const res = await AuthService.socialLogin({
            email: testEmail,
            name: 'Google Sandbox User',
            picture: 'https://ui-avatars.com/api/?name=Google+Sandbox&background=0284c7&color=fff',
            provider: 'google',
            providerId: 'sandbox_google_123456',
          });

          if (res.success && res.data) {
            const { token } = res.data;
            await StorageService.saveSecret(StorageKeys.AuthToken, token);
            if (rememberMe) {
              await StorageService.setItem('ai_legal_remembered_email', testEmail);
            }
            const profileRes = await ProfileService.getProfile();
            if (profileRes.success && profileRes.data) {
              await StorageService.setItem(StorageKeys.UserSession, JSON.stringify(profileRes.data));
              setCredentials(token, '');
              setProfile(profileRes.data);
              showToast('success', 'Social Login Success (Sandbox)', `Welcome back, ${profileRes.data.name}!`);
            } else {
              throw new Error('Could not retrieve user profile from server.');
            }
          } else {
            throw new Error(res.message || 'Sandbox login failed.');
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
          // Expo Go Sandbox Fallback
          showToast('info', 'Sandbox Mode', 'Expo Go Fallback: Using sandbox simulation.');
          console.log('[APPLE SANDBOX LOGIN] Simulating Apple Sign-In...');
          const testEmail = 'apple_sandbox_user@example.com';
          const res = await AuthService.socialLogin({
            email: testEmail,
            name: 'Apple Sandbox User',
            picture: 'https://ui-avatars.com/api/?name=Apple+Sandbox&background=000&color=fff',
            provider: 'apple',
            providerId: 'sandbox_apple_123456',
          });

          if (res.success && res.data) {
            const { token } = res.data;
            await StorageService.saveSecret(StorageKeys.AuthToken, token);
            if (rememberMe) {
              await StorageService.setItem('ai_legal_remembered_email', testEmail);
            }
            const profileRes = await ProfileService.getProfile();
            if (profileRes.success && profileRes.data) {
              await StorageService.setItem(StorageKeys.UserSession, JSON.stringify(profileRes.data));
              setCredentials(token, '');
              setProfile(profileRes.data);
              showToast('success', 'Social Login Success (Sandbox)', `Welcome back, ${profileRes.data.name}!`);
            } else {
              throw new Error('Could not retrieve user profile from server.');
            }
          } else {
            throw new Error(res.message || 'Sandbox login failed.');
          }
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

                <Pressable 
                  style={[styles.socialBtn, loading && { opacity: 0.5 }]} 
                  onPress={() => !loading && triggerSocialAuth('apple')}
                  disabled={loading}
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
