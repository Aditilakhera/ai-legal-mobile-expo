/**
 * AI Legal Mobile - Network Status Provider
 * Monitors connectivity states and alerts components on connection dropouts or slow network.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { useSettingsStore } from '../store/settings';

interface NetworkContextType {
  isConnected: boolean;
  isInternetReachable: boolean;
  isOfflineModeEnabled: boolean;
  isSlowConnection: boolean;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

export const NetworkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(true);
  const [isInternetReachable, setIsInternetReachable] = useState(true);
  const [isSlowConnection, setIsSlowConnection] = useState(false);
  const offlineMode = useSettingsStore((s) => s.offlineMode);

  const triggerBackgroundSync = () => {
    // Placeholder function for executing background offline requests queues
  };

  useEffect(() => {
    // NetInfo listener to monitor real connectivity states
    const unsubscribe = NetInfo.addEventListener((state) => {
      const connected = !!state.isConnected;
      const reachable = state.isInternetReachable !== null ? !!state.isInternetReachable : connected;
      
      setIsConnected(connected);
      setIsInternetReachable(reachable);

      // Detect slow connections (e.g., 2G/3G or poor connection latency)
      const cellularGen = (state.details as any)?.cellularGeneration;
      const slow = cellularGen === '2g' || cellularGen === '3g';
      setIsSlowConnection(slow);

      if (connected && !offlineMode) {
        console.log('[NETWORK] Connection restored. Triggering background sync queue...');
        // Hook for background sync queue execution
        triggerBackgroundSync();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [offlineMode]);

  return (
    <NetworkContext.Provider
      value={{
        isConnected: isConnected && !offlineMode,
        isInternetReachable: isInternetReachable && !offlineMode,
        isOfflineModeEnabled: offlineMode,
        isSlowConnection: isSlowConnection && !offlineMode,
      }}>
      {children}
    </NetworkContext.Provider>
  );
};

export const useNetworkContext = () => {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error('useNetworkContext must be used within a NetworkProvider');
  }
  return context;
};
