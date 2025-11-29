// src/lib/socket.ts
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const initSocket = (user: any, accessToken?: string): Socket => {
  if (socket) {
    socket.disconnect();
  }
  
  if (user?._id && user?.businessId) {
    // 🔧 NEW: Support both JWT token (new) and userId/businessId (backward compatible)
    const authConfig: any = {
      query: {
        userId: user._id,
        businessId: user.businessId,
      },
      transports: ['websocket'],
      withCredentials: true,
    };
    
    // If accessToken is provided, use it for authentication (preferred method)
    if (accessToken) {
      authConfig.auth = {
        token: accessToken
      };
      // Also include token in query as fallback
      authConfig.query.token = accessToken;
    }
    
    socket = io(API_BASE_URL, authConfig);

    console.log('[Socket] Initialized for user:', user._id, accessToken ? '(with JWT token)' : '(legacy mode)');
    return socket;
  }

  throw new Error("Cannot initialize socket without a valid user.");
};

export const disconnectSocket = () => {
  if (socket) {
    console.log('[Socket] Disconnecting.');
    socket.disconnect();
    socket = null;
  }
};

export const getSocket = (): Socket | null => {
  return socket;
};