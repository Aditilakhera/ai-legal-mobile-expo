/**
 * AI Legal Mobile - useChat Custom Hook
 * Handles general copilot messaging flows, streaming response assembly, and session logs history.
 */

import { useState, useCallback, useRef } from 'react';
import { useChatStore } from '../store/chat';
import { ChatService } from '../services/chat.service';
import { streamAIResponse } from '../api/client';
import { ChatMessage, ChatSession } from '../types';

export function useChat() {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const sessions = useChatStore((s) => s.sessions);
  const activeSessionId = useChatStore((s) => s.activeSessionId);
  const setActiveSessionId = useChatStore((s) => s.setActiveSessionId);
  const addMessage = useChatStore((s) => s.addMessage);
  const updateMessage = useChatStore((s) => s.updateMessage);
  const addSession = useChatStore((s) => s.addSession);
  const setSessions = useChatStore((s) => s.setSessions);
  const updateSession = useChatStore((s) => s.updateSession);
  const deleteSession = useChatStore((s) => s.deleteSession);
  const loading = useChatStore((s) => s.loading);
  const setLoading = useChatStore((s) => s.setLoading);

  const getActiveSession = useCallback((): ChatSession | null => {
    return sessions.find((s) => s.sessionId === activeSessionId) || null;
  }, [sessions, activeSessionId]);

  /**
   * Loads all previous chat sessions list for the current active user.
   */
  const fetchSessions = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await ChatService.listSessions();
      const sessionList = Array.isArray(res) ? res : (res?.data || []);
      setSessions(sessionList as ChatSession[]);
    } catch (err: any) {
      console.error('[useChat] listSessions error:', err);
      setError(err.message || 'Failed to retrieve conversation history.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Fetches the complete message log detail for a specific session ID.
   */
  const fetchSessionDetails = async (sessionId: string) => {
    const localSession = sessions.find((s) => s.sessionId === sessionId);
    
    // If it's a local-only session that hasn't been saved on the server yet, don't attempt to fetch it
    if (localSession && !localSession._id && !localSession.createdAt) {
      return;
    }

    // If we already have messages in memory, don't fetch them again
    if (localSession && localSession.messages && localSession.messages.length > 0) {
      return;
    }

    setError(null);
    try {
      const res = await ChatService.getSessionDetails(sessionId);
      const detailSession = (res as any).data || res;
      if (detailSession) {
        updateSession(sessionId, {
          messages: detailSession.messages || [],
        });
      }
    } catch (err: any) {
      console.warn('[useChat] getSessionDetails sync warning (ignoring for potential local sessions):', err);
    }
  };

  /**
   * Start a brand new workspace session.
   */
  const startNewSession = (title = 'New Legal Query', activeTool = 'legal_my_case') => {
    const newSessionId = `session_${Date.now()}`;
    const newSession: ChatSession = {
      sessionId: newSessionId,
      title,
      messages: [],
      lastModified: Date.now(),
      activeTool,
    };
    addSession(newSession);
    setActiveSessionId(newSessionId);
    return newSessionId;
  };

  /**
   * Delete a conversation session permanently.
   */
  const deleteChatSession = async (sessionId: string) => {
    setError(null);
    try {
      await ChatService.deleteSession(sessionId);
      deleteSession(sessionId);
    } catch (err: any) {
      console.error('[useChat] deleteSession error:', err);
      setError(err.message || 'Failed to delete session.');
    }
  };

  /**
   * Rename a conversation session.
   */
  const renameChatSession = async (sessionId: string, newTitle: string) => {
    setError(null);
    try {
      await ChatService.renameSession(sessionId, newTitle);
      updateSession(sessionId, { title: newTitle });
    } catch (err: any) {
      console.error('[useChat] renameSession error:', err);
      setError(err.message || 'Failed to update title.');
    }
  };

  /**
   * Cancel the current streaming session.
   */
  const cancelMessageStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setSending(false);

    // Stop processing spinner on the active session's messages immediately
    const currentSessionId = useChatStore.getState().activeSessionId;
    if (currentSessionId) {
      const activeSession = useChatStore.getState().sessions.find((s) => s.sessionId === currentSessionId);
      if (activeSession && activeSession.messages) {
        const updatedMessages = activeSession.messages.map((m) =>
          m.isProcessing ? { ...m, isProcessing: false } : m
        );
        useChatStore.getState().updateSession(currentSessionId, {
          messages: updatedMessages,
        });
      }
    }
  }, []);

  /**
   * Dispatch a new user message query, invoking backend SSE streaming channels.
   */
  const dispatchMessageStream = async (
    content: string, 
    activeTool = 'legal_my_case', 
    attachments: any[] = [], 
    editMessageId?: string
  ) => {
    if (!content.trim() && attachments.length === 0) return;

    let currentSessionId = activeSessionId;
    if (!currentSessionId) {
      currentSessionId = startNewSession(content.trim().slice(0, 32) || 'New Query', activeTool);
    }

    let userMessageId = `msg_${Date.now()}`;
    
    if (editMessageId) {
      const activeSession = useChatStore.getState().sessions.find((s) => s.sessionId === currentSessionId);
      if (activeSession && activeSession.messages) {
        const msgIdx = activeSession.messages.findIndex((m) => m.id === editMessageId);
        if (msgIdx !== -1) {
          const editedMsg = {
            ...activeSession.messages[msgIdx],
            content,
            timestamp: Date.now(),
          };
          const trimmedMessages = [
            ...activeSession.messages.slice(0, msgIdx),
            editedMsg
          ];
          useChatStore.getState().updateSession(currentSessionId, {
            messages: trimmedMessages,
          });
          userMessageId = editMessageId;
        }
      }
    } else {
      const userMessage: ChatMessage = {
        id: userMessageId,
        role: 'user',
        content,
        timestamp: Date.now(),
        attachments,
      };
      // Add user message to active session
      useChatStore.getState().addMessage(currentSessionId, userMessage);
    }

    const placeholderAiMessageId = `msg_ai_${Date.now()}`;
    const placeholderAiMessage: ChatMessage = {
      id: placeholderAiMessageId,
      role: 'model',
      content: '',
      timestamp: Date.now() + 1,
      isProcessing: true,
    };

    // Add model processing placeholder
    useChatStore.getState().addMessage(currentSessionId, placeholderAiMessage);
    setSending(true);
    setError(null);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      // Find the active session using store to get historical turns
      const currentSessions = useChatStore.getState().sessions;
      const activeSession = currentSessions.find((s) => s.sessionId === currentSessionId);
      
      const history = activeSession
        ? (activeSession.messages || [])
            .filter((m) => m.id !== placeholderAiMessageId)
            .map((m) => ({ role: m.role, content: m.content }))
        : [];

      // Build unified chat query payload
      const payload: Record<string, any> = {
        content,
        sessionId: currentSessionId,
        activeTool,
        stream: true,
        history,
      };

      if (attachments.length > 0) {
        const docAttachments = attachments.filter(
          (a) => !a.type?.startsWith('audio/') && !a.name?.match(/\.(m4a|mp3|wav|ogg|aac|flac|webm)$/i)
        );
        if (docAttachments.length > 0) {
          payload.document = docAttachments.map((a) => ({
            name: a.name,
            mimeType: a.type,
            base64Data: a.base64Data || '',
            url: a.url,
          }));
        }
      }

      // Stream SSE data chunks in real time
      const stream = streamAIResponse('/chat', payload, controller.signal);
      let accumulatedText = '';
      
      for await (const token of stream) {
        if (controller.signal.aborted) {
          break;
        }
        accumulatedText += token;
        updateMessage(currentSessionId, placeholderAiMessageId, {
          content: accumulatedText,
        });
      }

      if (controller.signal.aborted) {
        updateMessage(currentSessionId, placeholderAiMessageId, {
          isProcessing: false,
        });
        return;
      }

      // Stop processing spinner
      updateMessage(currentSessionId, placeholderAiMessageId, {
        isProcessing: false,
      });

      // Background-sync metadata fields like generated titles and follow-up prompts
      setTimeout(async () => {
        try {
          if (controller.signal.aborted) {
            return;
          }
          if (currentSessionId) {
            const detailsRes = await ChatService.getSessionDetails(currentSessionId);
            if (controller.signal.aborted) {
              return;
            }
            const detailSession = (detailsRes as any).data || detailsRes;
            if (detailSession) {
              updateSession(currentSessionId, {
                title: detailSession.title,
                messages: detailSession.messages || [],
                _id: detailSession._id,
                createdAt: detailSession.createdAt,
              });
            }
          }
        } catch (e) {
          console.warn('[useChat] Failed to sync post-stream metadata:', e);
        }
      }, 1000);

    } catch (err: any) {
      if (controller.signal.aborted) {
        updateMessage(currentSessionId, placeholderAiMessageId, {
          isProcessing: false,
        });
      } else {
        console.error('[useChat] dispatchMessageStream catch block:', err);
        setError(err.message || String(err));
        updateMessage(currentSessionId, placeholderAiMessageId, {
          content: '⚠️ Sorry, failed to connect to the legal AI gateway. Please verify network access and try again.',
          isProcessing: false,
        });
      }
    } finally {
      setSending(false);
      abortControllerRef.current = null;
    }
  };

  return {
    sessions,
    activeSessionId,
    activeSession: getActiveSession(),
    sending,
    error,
    loading,
    setActiveSessionId,
    fetchSessions,
    fetchSessionDetails,
    startNewSession,
    deleteChatSession,
    renameChatSession,
    dispatchMessageStream,
    cancelMessageStream,
  };
}
