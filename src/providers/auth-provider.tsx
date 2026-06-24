/**
 * AI Legal Mobile - Authentication Context Provider
 * Bootstraps sessions, loads tokens, manages biometric login configurations,
 * and schedules refresh token sync loops.
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';
import { useAuthStore } from '../store/auth';
import { useUserStore } from '../store/user';
import { registerAuthHandlers } from '../api/client';
import { StorageService } from '../services/storage.service';
import { ProfileService } from '../services/profile.service';
import { StorageKeys } from '../constants/app-constants';

interface AuthContextType {
  isHydrated: boolean;
  biometricSupported: boolean;
  biometricEnabled: boolean;
  enableBiometricLogin: () => Promise<boolean>;
  authenticateBiometrics: () => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isHydrated, setIsHydrated] = useState(false);
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const setCredentials = useAuthStore((s) => s.setCredentials);
  const clearCredentials = useAuthStore((s) => s.clearCredentials);
  const clearProfile = useUserStore((s) => s.clearProfile);
  const setProfile = useUserStore((s) => s.setProfile);

  const logout = useCallback(async () => {
    console.log('[AUTH PROVIDER] Wiping local session and secrets...');
    try {
      await StorageService.deleteSecret(StorageKeys.AuthToken);
      await StorageService.deleteSecret(StorageKeys.RefreshToken);
      await StorageService.removeItem(StorageKeys.UserSession);
    } catch (e) {
      console.warn('[AUTH PROVIDER] Local session wipe error:', e);
    } finally {
      clearCredentials();
      clearProfile();
    }
  }, [clearCredentials, clearProfile]);

  // Hydrate session from secure storage
  useEffect(() => {
    async function bootstrapSession() {
      try {
        console.log('[AUTH PROVIDER] Checking for persistent session...');
        const storedToken = await StorageService.getSecret(StorageKeys.AuthToken);
        const cachedSessionStr = await StorageService.getItem(StorageKeys.UserSession);

        if (storedToken && cachedSessionStr) {
          console.log('[AUTH PROVIDER] Restoring cached local session...');
          const cachedSession = JSON.parse(cachedSessionStr);
          
          // Instantly restore session using local cache for smooth user transition
          setCredentials(storedToken, '');
          setProfile(cachedSession);

          // Perform background check to sync/verify with backend DB
          console.log('[AUTH PROVIDER] Background verifying session against server...');
          ProfileService.getProfile()
            .then(async (response) => {
              if (response.success && response.data) {
                console.log('[AUTH PROVIDER] Session verified successfully.');
                setProfile(response.data);
                await StorageService.setItem(StorageKeys.UserSession, JSON.stringify(response.data));
              }
            })
            .catch(async (error) => {
              console.error('[AUTH PROVIDER] Background validation failed:', error);
              // If unauthorized (401), force logout
              if (error.statusCode === 401 || error.message?.includes('401') || error.error?.includes('401')) {
                console.warn('[AUTH PROVIDER] Token invalid or expired, clearing session.');
                await logout();
              }
              // If network error, retain offline mode (do nothing)
            });
        }
      } catch (err) {
        console.error('[AUTH PROVIDER] Failed to hydrate authentication tokens', err);
      } finally {
        try {
          const hardware = await LocalAuthentication.hasHardwareAsync();
          const enrolled = await LocalAuthentication.isEnrolledAsync();
          setBiometricSupported(hardware && enrolled);
        } catch (e) {
          console.warn('[AUTH PROVIDER] Failed to detect biometric hardware:', e);
          setBiometricSupported(false);
        }
        // Delay hydration callback slightly to sync with splash screens
        setTimeout(() => {
          setIsHydrated(true);
        }, 500);
      }
    }

    bootstrapSession();

    // Register Axios HTTP handlers to fetch JWT tokens dynamically
    registerAuthHandlers({
      getAccessToken: async () => useAuthStore.getState().token,
      refreshAccessToken: async () => {
        console.log('[AUTH CLIENT] Refresh token requested. Not supported by Express backend.');
        return null; // Triggers session expired flow
      },
      onSessionExpired: () => {
        console.warn('[AUTH CLIENT] Session expired. Redirecting to login.');
        logout();
      },
    });
  }, [logout, setCredentials, setProfile]);

  const enableBiometricLogin = async (): Promise<boolean> => {
    try {
      console.log('[BIOMETRIC] Requesting biometric authentication opt-in');
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hasHardware || !isEnrolled) {
        return false;
      }
      setBiometricEnabled(true);
      return true;
    } catch (err) {
      console.error('[BIOMETRIC] Failed to enable biometric login', err);
      return false;
    }
  };

  const authenticateBiometrics = async (): Promise<boolean> => {
    try {
      console.log('[BIOMETRIC] Prompting biometric verification (FaceID/TouchID)');
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      
      if (!hasHardware || !isEnrolled) {
        console.warn('[BIOMETRIC] Hardware not available or no biometrics enrolled');
        return false;
      }
      
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to unlock AI LEGAL',
        fallbackLabel: 'Use PIN',
        disableDeviceFallback: true,
      });
      
      return result.success;
    } catch (err) {
      console.error('[BIOMETRIC] Biometric validation failed', err);
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isHydrated,
        biometricSupported,
        biometricEnabled,
        enableBiometricLogin,
        authenticateBiometrics,
        logout,
      }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};
