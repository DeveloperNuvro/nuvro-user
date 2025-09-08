// src/hooks/useGlobalPresenceSocket.tsx

import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { io, Socket } from 'socket.io-client';

import { AppDispatch, RootState } from '@/app/store';
import { setAgentStatus } from '@/features/humanAgent/humanAgentSlice';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
let presenceSocket: Socket | null = null;

/**
 * A dedicated hook to manage a persistent, site-wide socket connection for the sole purpose of
 * broadcasting and receiving agent online/offline presence status.
 * This should be used ONCE in a persistent layout component that wraps all authenticated routes.
 */
export const useGlobalPresenceSocket = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user }: any = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    // Connect only if we have a user and no existing presence socket
    if (user?._id && user?.businessId && !presenceSocket) {
      presenceSocket = io(API_BASE_URL, {
        query: {
          userId: user._id,
          businessId: user.businessId,
        },
        transports: ['websocket'],
        withCredentials: true,
      });

      console.log('✅ Global Presence Socket connected for site-wide status.');

      const handleAgentStatusChange = (data: { userId: string, status: 'online' | 'offline', lastSeen?: string | null }) => {
        // This is the ONLY event this socket listens to.
        dispatch(setAgentStatus(data));
      };

      presenceSocket.on('agentStatusChanged', handleAgentStatusChange);
    }
    
    // The cleanup function runs when the component using this hook unmounts (i.e., on logout).
    return () => {
      if (presenceSocket) {
        console.log('🛑 Disconnecting Global Presence Socket.');
        presenceSocket.disconnect();
        presenceSocket = null; // Allow reconnection on next login
      }
    };
  }, [user, dispatch]); // This effect re-runs only when the user logs in or out.
};