// src/features/notifications/notificationService.ts
import { api } from '../../api/axios'; // Assuming you export your configured axios instance as 'api'

interface PushTokenPayload {
  token: string;
  platform: 'web' | 'ios' | 'android';
}

/**
 * Registers the user's push notification token with the backend.
 * @param payload - The token and platform information.
 */
export const registerPushToken = async (payload: PushTokenPayload): Promise<void> => {
  try {
    await api.post('/api/v1/users/push-token', payload);
    console.log('Push token registered successfully with the backend.');
  } catch (error) {
    console.error('Failed to register push token with the backend:', error);
    // You might want to add more robust error handling here,
    // like not retrying if the error is a 4xx client error.
  }
};