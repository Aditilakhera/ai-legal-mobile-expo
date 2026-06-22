/**
 * AI Legal Mobile - User Profile State Store
 * Manages user metadata, settings, personalizations, and credit counts.
 */

import { create } from 'zustand';
import { UserProfile, UserPersonalizations, UserSettings } from '../types';

interface UserStoreState {
  profile: UserProfile | null;
  setProfile: (profile: UserProfile) => void;
  updateSettings: (settings: Partial<UserSettings>) => void;
  updatePersonalizations: (personalizations: Partial<UserPersonalizations>) => void;
  deductCredits: (amount: number) => void;
  clearProfile: () => void;
}

export const useUserStore = create<UserStoreState>((set) => ({
  profile: null,

  setProfile: (profile) => set({ profile }),

  updateSettings: (settings) =>
    set((state) => {
      if (!state.profile) return state;
      return {
        profile: {
          ...state.profile,
          settings: { ...state.profile.settings, ...settings },
        },
      };
    }),

  updatePersonalizations: (personalizations) =>
    set((state) => {
      if (!state.profile) return state;
      return {
        profile: {
          ...state.profile,
          personalizations: { ...state.profile.personalizations, ...personalizations },
        },
      };
    }),

  deductCredits: (amount) =>
    set((state) => {
      if (!state.profile) return state;
      return {
        profile: {
          ...state.profile,
          credits: Math.max(0, state.profile.credits - amount),
        },
      };
    }),

  clearProfile: () => set({ profile: null }),
}));
