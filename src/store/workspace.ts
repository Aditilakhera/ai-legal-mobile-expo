/**
 * AI Legal Mobile - Case Workspace State Store
 * Mirror of CaseWorkspaceState from the Web React application.
 * Manages active case datasets, research briefs, schedulers, and document uploads.
 */

import { create } from 'zustand';
import { CaseWorkspace, CaseDocument, CaseTask, CaseHearing, CaseEvidence } from '../types';

interface WorkspaceStoreState {
  workspaces: Record<string, CaseWorkspace>; // Mapped by caseId
  activeCaseId: string | null;
  setActiveCaseId: (caseId: string | null) => void;
  setWorkspace: (caseId: string, workspace: CaseWorkspace) => void;
  updateWorkspace: (caseId: string, updates: Partial<CaseWorkspace>) => void;
  addDocument: (caseId: string, doc: CaseDocument) => void;
  addTask: (caseId: string, task: CaseTask) => void;
  updateTask: (caseId: string, taskId: string, updates: Partial<CaseTask>) => void;
  addHearing: (caseId: string, hearing: CaseHearing) => void;
  addEvidence: (caseId: string, evidence: CaseEvidence) => void;
  clearWorkspace: (caseId: string) => void;
}

export const useWorkspaceStore = create<WorkspaceStoreState>((set) => ({
  workspaces: {},
  activeCaseId: null,

  setActiveCaseId: (caseId) => set({ activeCaseId: caseId }),

  setWorkspace: (caseId, workspace) =>
    set((state) => ({
      workspaces: {
        ...state.workspaces,
        [caseId]: workspace,
      },
    })),

  updateWorkspace: (caseId, updates) =>
    set((state) => {
      const current = state.workspaces[caseId];
      if (!current) return state;
      return {
        workspaces: {
          ...state.workspaces,
          [caseId]: {
            ...current,
            ...updates,
          },
        },
      };
    }),

  addDocument: (caseId, doc) =>
    set((state) => {
      const current = state.workspaces[caseId];
      if (!current) return state;
      return {
        workspaces: {
          ...state.workspaces,
          [caseId]: {
            ...current,
            documents: [...current.documents, doc],
          },
        },
      };
    }),

  addTask: (caseId, task) =>
    set((state) => {
      const current = state.workspaces[caseId];
      if (!current) return state;
      return {
        workspaces: {
          ...state.workspaces,
          [caseId]: {
            ...current,
            tasks: [task, ...current.tasks],
          },
        },
      };
    }),

  updateTask: (caseId, taskId, updates) =>
    set((state) => {
      const current = state.workspaces[caseId];
      if (!current) return state;
      return {
        workspaces: {
          ...state.workspaces,
          [caseId]: {
            ...current,
            tasks: current.tasks.map((t) => (t._id === taskId ? { ...t, ...updates } : t)),
          },
        },
      };
    }),

  addHearing: (caseId, hearing) =>
    set((state) => {
      const current = state.workspaces[caseId];
      if (!current) return state;
      return {
        workspaces: {
          ...state.workspaces,
          [caseId]: {
            ...current,
            hearings: [hearing, ...current.hearings],
          },
        },
      };
    }),

  addEvidence: (caseId, evidence) =>
    set((state) => {
      const current = state.workspaces[caseId];
      if (!current) return state;
      return {
        workspaces: {
          ...state.workspaces,
          [caseId]: {
            ...current,
            evidence: [evidence, ...current.evidence],
          },
        },
      };
    }),

  clearWorkspace: (caseId) =>
    set((state) => {
      const remainingWorkspaces = { ...state.workspaces };
      delete remainingWorkspaces[caseId];
      return {
        workspaces: remainingWorkspaces,
        activeCaseId: state.activeCaseId === caseId ? null : state.activeCaseId,
      };
    }),
}));
