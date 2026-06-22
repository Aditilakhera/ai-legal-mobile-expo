/**
 * AI Legal Mobile - Authentication State Store
 * Handles credentials and verification flags.
 */

import { create } from 'zustand';

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isVerifying: boolean;
  setCredentials: (token: string, refreshToken: string) => void;
  setVerifying: (isVerifying: boolean) => void;
  clearCredentials: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  refreshToken: null,
  isAuthenticated: false,
  isVerifying: false,

  setCredentials: (token, refreshToken) =>
    set({
      token,
      refreshToken,
      isAuthenticated: true,
    }),

  setVerifying: (isVerifying) => set({ isVerifying }),

  clearCredentials: () =>
    set({
      token: null,
      refreshToken: null,
      isAuthenticated: false,
    }),
}));
