/**
 * AI Legal Mobile - Custom Toast Alert Provider
 * Coordinates presentation of non-blocking success, error, warning, or info feedback banners.
 */

import React, { createContext, useContext, useState, useCallback } from 'react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  durationMs?: number;
}

interface ToastContextType {
  toasts: ToastMessage[];
  showToast: (type: ToastType, title: string, message?: string, durationMs?: number) => void;
  hideToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const hideToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (type: ToastType, title: string, message?: string, durationMs = 3500) => {
      const id = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const newToast: ToastMessage = { id, type, title, message, durationMs };

      setToasts((prev) => [...prev, newToast]);

      setTimeout(() => {
        hideToast(id);
      }, durationMs);
    },
    [hideToast]
  );

  return (
    <ToastContext.Provider value={{ toasts, showToast, hideToast }}>
      {children}
    </ToastContext.Provider>
  );
};

export const useToastContext = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToastContext must be used within a ToastProvider');
  }
  return context;
};
