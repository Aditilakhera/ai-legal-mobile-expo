/**
 * AI Legal Mobile - Case Index State Store
 * Manages listings, loading cycles, and summaries for My Cases dashboard views.
 */

import { create } from 'zustand';
import { CaseSummary } from '../types';

interface CasesStoreState {
  cases: CaseSummary[];
  loading: boolean;
  error: string | null;
  setCases: (cases: CaseSummary[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  addCase: (newCase: CaseSummary) => void;
  updateCaseSummary: (caseId: string, updates: Partial<CaseSummary>) => void;
  removeCase: (caseId: string) => void;
  clearCases: () => void;
}

export const useCasesStore = create<CasesStoreState>((set) => ({
  cases: [],
  loading: false,
  error: null,

  setCases: (cases) => set({ cases, error: null }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  addCase: (newCase) =>
    set((state) => ({
      cases: [newCase, ...state.cases],
    })),

  updateCaseSummary: (caseId, updates) =>
    set((state) => ({
      cases: state.cases.map((c) => (c._id === caseId ? { ...c, ...updates } : c)),
    })),

  removeCase: (caseId) =>
    set((state) => ({
      cases: state.cases.filter((c) => c._id !== caseId),
    })),

  clearCases: () => set({ cases: [], loading: false, error: null }),
}));
