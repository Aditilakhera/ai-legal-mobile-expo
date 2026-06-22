/**
 * AI Legal Mobile - Custom Bottom Sheet Context Provider
 * Coordinates display of dynamic modal bottom sheets (e.g. document filter sheets, case details).
 */

import React, { createContext, useContext, useState, useCallback } from 'react';

interface BottomSheetConfig {
  content: React.ReactNode;
  snapPoints?: string[] | number[];
  onDismiss?: () => void;
}

interface BottomSheetContextType {
  isOpen: boolean;
  openBottomSheet: (config: BottomSheetConfig) => void;
  closeBottomSheet: () => void;
  snapPoints: string[] | number[];
  sheetContent: React.ReactNode | null;
}

const BottomSheetContext = createContext<BottomSheetContextType | undefined>(undefined);

export const BottomSheetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [snapPoints, setSnapPoints] = useState<string[] | number[]>(['50%']);
  const [sheetContent, setSheetContent] = useState<React.ReactNode | null>(null);
  const [onDismissCallback, setOnDismissCallback] = useState<(() => void) | null>(null);

  const openBottomSheet = useCallback((config: BottomSheetConfig) => {
    setSheetContent(config.content);
    if (config.snapPoints) {
      setSnapPoints(config.snapPoints);
    } else {
      setSnapPoints(['50%']);
    }
    if (config.onDismiss) {
      setOnDismissCallback(() => config.onDismiss);
    } else {
      setOnDismissCallback(null);
    }
    setIsOpen(true);
  }, []);

  const closeBottomSheet = useCallback(() => {
    setIsOpen(false);
    setSheetContent(null);
    if (onDismissCallback) {
      onDismissCallback();
    }
  }, [onDismissCallback]);

  return (
    <BottomSheetContext.Provider
      value={{
        isOpen,
        openBottomSheet,
        closeBottomSheet,
        snapPoints,
        sheetContent,
      }}>
      {children}
    </BottomSheetContext.Provider>
  );
};

export const useBottomSheetContext = () => {
  const context = useContext(BottomSheetContext);
  if (!context) {
    throw new Error('useBottomSheetContext must be used within a BottomSheetProvider');
  }
  return context;
};
