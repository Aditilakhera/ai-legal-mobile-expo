/**
 * AI Legal Mobile - Client WebSocket Service
 * Handles live synchronization and connection parameters with the Express WebSocket gateway.
 */

import { io, Socket } from 'socket.io-client';
import { AppConfig } from '@/config';

let socket: Socket | null = null;

export const initSocket = (token: string, userId: string): Socket => {
  if (socket && socket.connected) {
    return socket;
  }

  // Socket base url is the API host url without '/api' path
  const socketUrl = AppConfig.apiUrl.replace('/api', '').replace(/\/$/, '');

  console.log('[Socket] Initializing client connection to:', socketUrl);

  socket = io(socketUrl, {
    path: '/api/socket.io',
    auth: {
      token: token,
    },
    transports: ['polling', 'websocket'], // Prioritize polling first for compatibility, then upgrade to websocket
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 2000,
    reconnectionDelayMax: 10000,
    timeout: 20000,
  });

  socket.on('connect', () => {
    console.log('[Socket] Connected to gateway server. Client ID:', socket?.id);
    if (userId) {
      socket?.emit('join', userId);
      console.log(`[Socket] Joined user room ${userId}`);
    }
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected from gateway server. Reason:', reason);
  });

  socket.on('connect_error', (err) => {
    console.error('[Socket] Connection failed:', err.message);
  });

  return socket;
};

export const getSocket = (): Socket | null => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    console.log('[Socket] Connection closed manually.');
  }
};
