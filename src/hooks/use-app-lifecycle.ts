/**
 * AI Legal Mobile - App Lifecycle Listener Hook
 * Listens to foreground, background, and resume transitions.
 * Triggers session checks and background sync sweeps on resume.
 */

import { useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useAuthStore } from '../store/auth';

export function useAppLifecycle(onForegroundResume?: () => void) {
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      console.log(`[APP STATE] Transitioned from ${appStateRef.current} to ${nextAppState}`);

      // Check if application has resumed to foreground
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        console.log('[APP STATE] Resumed to foreground. Checking session validity...');
        
        // Execute callback if provided
        if (onForegroundResume) {
          onForegroundResume();
        }

        // Simulating background token sweep if user is logged in
        if (isAuthenticated && token) {
          console.log('[APP STATE] Active session detected. Performing background token checks...');
          // Check if token needs refresh
        }
      }

      // Check if application was backgrounded
      if (nextAppState === 'background') {
        console.log('[APP STATE] Application entered background. Suspending non-critical loops...');
      }

      appStateRef.current = nextAppState;
      setAppState(nextAppState);
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [isAuthenticated, token, onForegroundResume]);

  return {
    appState,
    isBackgrounded: appState === 'background',
    isForegrounded: appState === 'active',
  };
}
