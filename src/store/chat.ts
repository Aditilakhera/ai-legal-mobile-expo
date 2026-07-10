/**
 * AI Legal Mobile - Chat State Store
 * Manages active messaging sessions, histories, and assistant configurations.
 */

import { create } from 'zustand';
import { ChatSession, ChatMessage } from '../types';

interface ChatStoreState {
  sessions: ChatSession[];
  activeSessionIdByTool: Record<string, string | null>;
  activeSessionId: string | null;
  loading: boolean;
  isFocusMode: boolean;
  setActiveSessionId: (sessionId: string | null) => void;
  setActiveSessionIdForTool: (tool: string, sessionId: string | null) => void;
  setSessions: (sessions: ChatSession[]) => void;
  addSession: (session: ChatSession) => void;
  updateSession: (sessionId: string, updates: Partial<ChatSession>) => void;
  deleteSession: (sessionId: string) => void;
  addMessage: (sessionId: string, message: ChatMessage) => void;
  updateMessage: (sessionId: string, messageId: string, updates: Partial<ChatMessage>) => void;
  setLoading: (loading: boolean) => void;
  setFocusMode: (enabled: boolean) => void;
  clearChat: () => void;
}

export const useChatStore = create<ChatStoreState>((set) => ({
  sessions: [],
  activeSessionIdByTool: {},
  activeSessionId: null,
  loading: false,
  isFocusMode: false,

  setActiveSessionId: (sessionId) => set({ activeSessionId: sessionId }),
  setActiveSessionIdForTool: (tool, sessionId) =>
    set((state) => ({
      activeSessionIdByTool: {
        ...state.activeSessionIdByTool,
        [tool]: sessionId,
      },
      activeSessionId: sessionId,
    })),
  setSessions: (sessions) =>
    set((state) => {
      const localOnly = state.sessions.filter(
        (s) =>
          (!s._id && !s.createdAt) ||
          (s.sessionId.startsWith('session_') && !sessions.some((x) => x.sessionId === s.sessionId))
      );
      return {
        sessions: [...localOnly, ...sessions],
        loading: false,
      };
    }),
  setFocusMode: (enabled) => set({ isFocusMode: enabled }),

  addSession: (session) =>
    set((state) => ({
      sessions: [session, ...state.sessions],
      activeSessionIdByTool: {
        ...state.activeSessionIdByTool,
        [session.activeTool || 'legal_my_case']: session.sessionId,
      },
      activeSessionId: session.sessionId,
    })),

  updateSession: (sessionId, updates) =>
    set((state) => ({
      sessions: state.sessions.map((s) => (s.sessionId === sessionId ? { ...s, ...updates } : s)),
    })),

  deleteSession: (sessionId) =>
    set((state) => {
      const nextActiveByTool = { ...state.activeSessionIdByTool };
      Object.keys(nextActiveByTool).forEach((tool) => {
        if (nextActiveByTool[tool] === sessionId) {
          nextActiveByTool[tool] = null;
        }
      });
      return {
        sessions: state.sessions.filter((s) => s.sessionId !== sessionId),
        activeSessionIdByTool: nextActiveByTool,
        activeSessionId: state.activeSessionId === sessionId ? null : state.activeSessionId,
      };
    }),

  addMessage: (sessionId, message) =>
    set((state) => ({
      sessions: state.sessions.map((s) => {
        if (s.sessionId !== sessionId) return s;
        return {
          ...s,
          messages: [...(s.messages || []), message],
          lastModified: Date.now(),
        };
      }),
    })),

  updateMessage: (sessionId, messageId, updates) =>
    set((state) => ({
      sessions: state.sessions.map((s) => {
        if (s.sessionId !== sessionId) return s;
        return {
          ...s,
          messages: (s.messages || []).map((m) => (m.id === messageId ? { ...m, ...updates } : m)),
        };
      }),
    })),

  setLoading: (loading) => set({ loading }),

  clearChat: () => set({ sessions: [], activeSessionIdByTool: {}, activeSessionId: null, loading: false }),
}));
