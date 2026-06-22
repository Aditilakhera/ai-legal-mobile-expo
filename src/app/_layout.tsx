import { Slot, useRouter, useSegments } from 'expo-router';
import { AppProvider, useAuthContext } from '@/providers';
import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { GlobalBottomSheetModal, ErrorBoundary } from '@/components/ui';
import { useAuthStore } from '@/store/auth';
import { useEffect, useState } from 'react';
import * as NavigationBar from 'expo-navigation-bar';
import { Platform } from 'react-native';
import { useNotificationsManager } from '@/hooks';

function RootLayoutContent() {
  useNotificationsManager();
  const { isHydrated } = useAuthContext();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const segments = useSegments();
  const router = useRouter();
  const [fontsLoaded, setFontsLoaded] = useState(false);

  // Configure Android Immersive Navigation Bar
  useEffect(() => {
    if (Platform.OS === 'android') {
      async function setupImmersiveMode() {
        try {
          await NavigationBar.setBehaviorAsync('overlay-swipe');
          await NavigationBar.setVisibilityAsync('hidden');
          await NavigationBar.setBackgroundColorAsync('transparent');
        } catch (err) {
          console.warn('[BOOTSTRAP] Failed to configure immersive navigation bar:', err);
        }
      }
      setupImmersiveMode();
    }
  }, []);

  // Load custom fonts and assets on cold start
  useEffect(() => {
    async function loadAssets() {
      try {
        // Simulating font loading / initialization delays
        await new Promise((resolve) => setTimeout(resolve, 1500));
      } catch (err) {
        console.warn('[BOOTSTRAP] Asset loading error:', err);
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
      console.log('[AUTH REDIRECT] User authenticated: routing to dashboard');
      router.replace('/(tabs)/dashboard');
    }
  }, [isHydrated, fontsLoaded, isAuthenticated, segments]);

  const showSplash = !isHydrated || !fontsLoaded;

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

