import { Slot, useRouter, useSegments } from 'expo-router';
import { AppProvider, useAuthContext, useToastContext } from '@/providers';
import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { GlobalBottomSheetModal, ErrorBoundary } from '@/components/ui';
import { useAuthStore } from '@/store/auth';
import { useEffect, useState } from 'react';
import * as NavigationBar from 'expo-navigation-bar';
import { Platform, AppState, AppStateStatus, StyleSheet, View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// @ts-ignore
import { Ionicons } from '@expo/vector-icons';
import { useNotificationsManager } from '@/hooks';
import { StorageService } from '@/services/storage.service';
import { useUserStore } from '@/store/user';
import { useTranslation, useLocalLanguageStore } from '../utils/localization';

function RootLayoutContent() {
  useNotificationsManager();
  const { isHydrated, authenticateBiometrics, logout } = useAuthContext();
  const { showToast } = useToastContext();
  const { t, language } = useTranslation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const profile = useUserStore((s) => s.profile);
  const segments = useSegments();
  const router = useRouter();
  const [fontsLoaded, setFontsLoaded] = useState(false);

  // Sync profile language changes to local/secure storage and local language store
  const profileLanguage = profile?.personalizations?.general?.language;
  useEffect(() => {
    if (profileLanguage) {
      StorageService.setItem('@local_language', profileLanguage);
      StorageService.saveSecret('ai_legal_secure_language', profileLanguage);
      useLocalLanguageStore.getState().setLocalLanguage(profileLanguage);
    }
  }, [profileLanguage]);

  // Secure PIN Lock Overlay States
  const [isLocked, setIsLocked] = useState(false);
  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [backgroundTime, setBackgroundTime] = useState<number | null>(null);

  // Track active routes to support "Last Opened Screen" configuration
  useEffect(() => {
    if (!isAuthenticated || !isHydrated) return;
    const firstSegment = segments[0];
    if (firstSegment === '(tabs)' && segments.length > 1) {
      const path = `/(tabs)/${segments.slice(1).join('/')}`;
      if (!path.includes('settings') && !path.includes('notifications')) {
        StorageService.setItem('@last_opened_screen', path);
      }
    }
  }, [segments, isAuthenticated, isHydrated]);

  // Check if PIN/Biometric lock is active on cold start
  useEffect(() => {
    async function checkLockOnBoot() {
      if (isAuthenticated) {
        const security = profile?.personalizations?.security || {};
        const lockEnabled = security.pinEnabled;
        if (lockEnabled) {
          const hasPin = await StorageService.getSecret('ai_legal_secure_pin');
          if (hasPin) {
            setIsLocked(true);
            setEnteredPin('');
            setPinError('');
          }
        }
      }
    }
    checkLockOnBoot();
  }, [isAuthenticated, profile]);

  // Listen to AppState to trigger lock overlay when app resumes from background
  useEffect(() => {
    if (!isAuthenticated) return;
    const subscription = AppState.addEventListener('change', async (nextStatus: AppStateStatus) => {
      if (nextStatus === 'background') {
        setBackgroundTime(Date.now());
      } else if (nextStatus === 'active') {
        const profile = useUserStore.getState().profile;
        const security = profile?.personalizations?.security || {};
        const lockEnabled = security.pinEnabled;
        if (lockEnabled) {
          const autoLockInterval = security.autoLockInterval || 'Immediately';
          
          let shouldLock = false;
          if (autoLockInterval === 'Immediately') {
            shouldLock = true;
          } else if (autoLockInterval === 'Never') {
            shouldLock = false;
          } else if (backgroundTime) {
            const timeElapsed = Date.now() - backgroundTime;
            let limitMs = 0;
            if (autoLockInterval === '30s') limitMs = 30 * 1000;
            else if (autoLockInterval === '1m') limitMs = 60 * 1000;
            else if (autoLockInterval === '5m') limitMs = 5 * 60 * 1000;
            
            if (timeElapsed >= limitMs) {
              shouldLock = true;
            }
          } else {
            shouldLock = true;
          }

          if (shouldLock) {
            const hasPin = await StorageService.getSecret('ai_legal_secure_pin');
            if (hasPin) {
              setIsLocked(true);
              setEnteredPin('');
              setPinError('');
            }
          }
        }
        setBackgroundTime(null);
      }
    });
    return () => subscription.remove();
  }, [isAuthenticated, backgroundTime]);

  // Automatically trigger biometric unlock when lock screen is shown
  useEffect(() => {
    if (isLocked && isHydrated && fontsLoaded) {
      const fingerprintEnabled = profile?.personalizations?.security?.fingerprintEnabled;
      const faceUnlockEnabled = profile?.personalizations?.security?.faceUnlockEnabled;
      if (fingerprintEnabled || faceUnlockEnabled) {
        const triggerAutoBiometric = async () => {
          await new Promise((resolve) => setTimeout(resolve, 300));
          const success = await authenticateBiometrics();
          if (success) {
            setIsLocked(false);
            setEnteredPin('');
            showToast('success', t('unlocked'), t('biometricAccepted'));
          }
        };
        triggerAutoBiometric();
      }
    }
  }, [isLocked, isHydrated, fontsLoaded]);

  // Configure Android Navigation Bar Background on boot
  useEffect(() => {
    if (Platform.OS === 'android') {
      NavigationBar.setBackgroundColorAsync('transparent').catch((err) => {
        console.warn('[BOOTSTRAP] Failed to set navigation bar background:', err);
      });
    }
  }, []);

  // Dynamically control Android Navigation Bar Immersive Mode
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    async function updateNavigationBar() {
      try {
        const inWorkspace = (segments as string[]).includes('workspace');
        if (inWorkspace) {
          await NavigationBar.setBehaviorAsync('overlay-swipe' as any);
          await NavigationBar.setVisibilityAsync('hidden');
        } else {
          await NavigationBar.setBehaviorAsync('default' as any);
          await NavigationBar.setVisibilityAsync('visible');
        }
      } catch (err) {
        console.warn('[NAVIGATION BAR] Failed to update visibility:', err);
      }
    }

    updateNavigationBar();
  }, [segments]);

  // Load custom fonts, assets, and language preference on cold start
  useEffect(() => {
    async function loadAssets() {
      try {
        let savedLang = await StorageService.getSecret('ai_legal_secure_language');
        if (!savedLang) {
          savedLang = await StorageService.getItem('@local_language');
        }
        if (savedLang) {
          useLocalLanguageStore.getState().setLocalLanguage(savedLang);
        }
        // Simulating font loading / initialization delays
        await new Promise((resolve) => setTimeout(resolve, 1500));
      } catch (err) {
        console.warn('[BOOTSTRAP] Asset/Language loading error:', err);
      } finally {
        setFontsLoaded(true);
      }
    }
    loadAssets();
  }, []);

  // Global Auth Guard Redirect Controller
  useEffect(() => {
    if (!isHydrated || !fontsLoaded) return;

    const firstSegment = segments[0];
    const inAuthGroup = firstSegment === 'auth';
    const inPublicRoute = 
      firstSegment === 'auth' || 
      firstSegment === 'onboarding' || 
      firstSegment === 'privacy' || 
      firstSegment === 'terms' ||
      firstSegment === undefined; // Root index / splash

    if (!isAuthenticated && !inPublicRoute) {
      console.log('[AUTH REDIRECT] Guest restricted: routing to login');
      router.replace('/auth/login');
    } else if (isAuthenticated && (inAuthGroup || firstSegment === 'onboarding' || firstSegment === undefined)) {
      console.log('[AUTH REDIRECT] User authenticated: routing to default workspace...');
      const profile = useUserStore.getState().profile;
      const defaultDashboard = profile?.personalizations?.general?.defaultDashboard || 'Main Dashboard';
      
      const routeUser = async () => {
        let targetRoute = '/(tabs)/dashboard';
        if (defaultDashboard === 'My Cases' || defaultDashboard === '/dashboard/cases') {
          targetRoute = '/(tabs)/cases';
        } else if (defaultDashboard === 'AI Assistant' || defaultDashboard === '/dashboard/chat/new') {
          targetRoute = '/(tabs)/chat';
        } else if (defaultDashboard === 'AI Tools') {
          targetRoute = '/(tabs)/tools';
        } else if (defaultDashboard === 'Last Opened Screen') {
          const cachedRoute = await StorageService.getItem('@last_opened_screen');
          if (cachedRoute) {
            targetRoute = cachedRoute;
          }
        }
        router.replace(targetRoute as any);
      };
      
      routeUser();
    }
  }, [isHydrated, fontsLoaded, isAuthenticated, segments]);

  const handleKeyPress = async (num: string) => {
    setPinError('');
    if (enteredPin.length >= 4) return;
    const nextPin = enteredPin + num;
    setEnteredPin(nextPin);
    
    if (nextPin.length === 4) {
      const savedPin = await StorageService.getSecret('ai_legal_secure_pin');
      if (nextPin === savedPin) {
        setIsLocked(false);
        setEnteredPin('');
      } else {
        setPinError(t('incorrectPin'));
        setEnteredPin('');
      }
    }
  };

  const handleBackspace = () => {
    setEnteredPin((prev) => prev.slice(0, -1));
  };

  const showSplash = !isHydrated || !fontsLoaded;

  // Render Secure Lock Screen overlay if locked and authenticated
  if (isLocked && !showSplash) {
    const fingerprintEnabled = profile?.personalizations?.security?.fingerprintEnabled;
    const faceUnlockEnabled = profile?.personalizations?.security?.faceUnlockEnabled;
    
    return (
      <SafeAreaView style={[styles.lockContainer, { backgroundColor: '#0B0F19' }]}>
        <View style={styles.lockHeader}>
          <Ionicons name="shield-checkmark" size={48} color="#8A5CF5" style={{ marginBottom: 16 }} />
          <Text style={styles.lockTitle}>{t('workspaceLock')}</Text>
          <Text style={styles.lockSubtitle}>{t('enterPinToUnlock')}</Text>
        </View>

        <View style={styles.dotsRow}>
          {[0, 1, 2, 3].map((index) => {
            const hasChar = enteredPin.length > index;
            return (
              <View
                key={index}
                style={[
                  styles.pinDot,
                  hasChar ? { backgroundColor: '#8A5CF5' } : { backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#475569' },
                ]}
              />
            );
          })}
        </View>

        {pinError ? <Text style={styles.errorText}>{pinError}</Text> : null}

        <View style={styles.padContainer}>
          {[
            ['1', '2', '3'],
            ['4', '5', '6'],
            ['7', '8', '9'],
          ].map((row, rIdx) => (
            <View key={rIdx} style={styles.padRow}>
              {row.map((num) => (
                <Pressable
                  key={num}
                  style={styles.padButton}
                  onPress={() => handleKeyPress(num)}
                >
                  <Text style={styles.padButtonText}>{num}</Text>
                </Pressable>
              ))}
            </View>
          ))}
          <View style={styles.padRow}>
            {/* Biometrics button */}
            <Pressable
              style={[styles.padButton, { backgroundColor: 'transparent', borderColor: 'transparent' }]}
              onPress={async () => {
                if (fingerprintEnabled || faceUnlockEnabled) {
                  const success = await authenticateBiometrics();
                  if (success) {
                    setIsLocked(false);
                    setEnteredPin('');
                    showToast('success', t('unlocked'), t('biometricAccepted'));
                  }
                } else {
                  showToast('info', 'Not Enabled', t('biometricDisabled'));
                }
              }}
            >
              <Ionicons name="finger-print" size={26} color="#8A5CF5" />
            </Pressable>
            
            <Pressable
              style={styles.padButton}
              onPress={() => handleKeyPress('0')}
            >
              <Text style={styles.padButtonText}>0</Text>
            </Pressable>

            <Pressable
              style={[styles.padButton, { backgroundColor: 'transparent', borderColor: 'transparent' }]}
              onPress={handleBackspace}
            >
              <Ionicons name="backspace-outline" size={24} color="#EF4444" />
            </Pressable>
          </View>
        </View>

        <Pressable
          style={styles.lockLogoutBtn}
          onPress={async () => {
            await logout();
            setIsLocked(false);
            router.replace('/auth/login');
          }}
        >
          <Text style={styles.lockLogoutText}>{t('logOutAccount')}</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <>
      {showSplash ? <AnimatedSplashOverlay /> : <Slot />}
      <GlobalBottomSheetModal />
    </>
  );
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <RootLayoutContent />
      </AppProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  lockContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockHeader: {
    alignItems: 'center',
    marginBottom: 30,
  },
  lockTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 6,
  },
  lockSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    paddingHorizontal: 30,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  pinDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 20,
  },
  padContainer: {
    width: 260,
    gap: 16,
  },
  padRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  padButton: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: '#151F32',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  padButtonText: {
    color: '#F8FAFC',
    fontSize: 24,
    fontWeight: '700',
  },
  lockLogoutBtn: {
    marginTop: 40,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  lockLogoutText: {
    color: '#94A3B8',
    fontSize: 12.5,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
