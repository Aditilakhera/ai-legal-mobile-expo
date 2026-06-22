/**
 * AI Legal Mobile - useNetwork Custom Hook
 * Interfaces with NetworkProvider to check connection status.
 */

import { useNetworkContext } from '../providers/network-provider';

export function useNetwork() {
  const context = useNetworkContext();
  
  return {
    isConnected: context.isConnected,
    isInternetReachable: context.isInternetReachable,
    isOfflineModeEnabled: context.isOfflineModeEnabled,
  };
}
