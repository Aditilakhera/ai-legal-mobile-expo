/**
 * AI Legal Mobile - useStreaming Custom Hook
 * Subscribes to backend SSE stream channels to assemble text tokens in real time.
 */

import { useState, useCallback, useRef } from 'react';
import { streamAIResponse } from '../api/client';

export function useStreaming() {
  const [streamingContent, setStreamingContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const startStream = useCallback(async (endpoint: string, payload: Record<string, any>) => {
    setIsStreaming(true);
    setStreamingContent('');
    setError(null);

    // Cancel any current stream before starting a new one
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const tokenStream = streamAIResponse(endpoint, payload, abortController.signal);
      
      for await (const token of tokenStream) {
        setStreamingContent((prev) => prev + token);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('[STREAMING] Stream cancelled by user.');
      } else {
        setError(err.message || 'Stream processing failed');
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  }, []);

  const cancelStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
    }
  }, []);

  return {
    streamingContent,
    isStreaming,
    error,
    startStream,
    cancelStream,
  };
}
