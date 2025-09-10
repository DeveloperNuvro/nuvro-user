// src/lib/socket.ts
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const initSocket = (user: any): Socket => {
  if (socket) {
    socket.disconnect();
  }
  
  if (user?._id && user?.businessId) {
    socket = io(API_BASE_URL, {
      query: {
        userId: user._id,
        businessId: user.businessId,
      },
      transports: ['websocket'],
      withCredentials: true,
    });

    console.log('[Socket] Initialized for user:', user._id);
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