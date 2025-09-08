// src/lib/socket.ts
import { io, Socket } from 'socket.io-client';


let socket: Socket | null = null;
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const initSocket = (user: any): Socket => {
  // If a socket already exists, disconnect it before creating a new one
  if (socket) {
    socket.disconnect();
  }
  
  // Connect only if we have a valid user
  if (user?._id && user?.businessId) {
    socket = io(API_BASE_URL, {
      query: {
        userId: user._id,
        businessId: user.businessId,
      },
      transports: ['websocket'],
      withCredentials: true,
    });

    console.log('Socket initialized for user:', user._id);
    return socket;
  }

  throw new Error("Cannot initialize socket without a valid user.");
};

export const disconnectSocket = () => {
  if (socket) {
    console.log('Disconnecting socket.');
    socket.disconnect();
    socket = null;
  }
};

export const getSocket = (): Socket | null => {
  return socket;
};