// 🔧 NEW: Chat API functions for Unipile features
import { api } from './axios';

// Chat Inbox API
export const getConversationsForInbox = async (params?: {
  businessId?: string;
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  platform?: string;
}) => {
  const response = await api.get('/api/v1/chat-inbox/conversations', { params });
  return response.data.data;
};

export const getMessagesByCustomer = async (
  customerId: string,
  params?: {
    page?: number;
    limit?: number;
  }
) => {
  const response = await api.get(`/api/v1/chat-inbox/messages/${customerId}`, { params });
  return response.data.data;
};

export const sendMessageViaConversation = async (data: {
  conversationId: string;
  message: string;
  businessId: string;
  imageUrl?: string;
  audioUrl?: string;
  mediaUrl?: string;
  messageType?: 'text' | 'image' | 'video' | 'audio' | 'document';
  platform?: 'whatsapp' | 'unipile' | 'whatsapp-business';
}) => {
  // 🔧 META OFFICIAL: Use chat-inbox endpoint for WhatsApp Business API
  // This endpoint automatically detects WhatsApp conversations and uses Meta's API
  const endpoint = '/api/v1/chat-inbox/conversations/send-message';
  
  const response = await api.post(endpoint, data);
  return response.data.data;
};

export const markConversationAsRead = async (conversationId: string) => {
  const response = await api.post(`/api/v1/chat-inbox/conversations/${conversationId}/mark-read`);
  return response.data.data;
};

export const updateConversationPriority = async (
  conversationId: string,
  priority: 'low' | 'normal' | 'high' | 'urgent'
) => {
  const response = await api.patch(`/api/v1/chat-inbox/conversations/${conversationId}/priority`, { priority });
  return response.data.data;
};

export const updateConversationTags = async (
  conversationId: string,
  tags: string[]
) => {
  const response = await api.patch(`/api/v1/chat-inbox/conversations/${conversationId}/tags`, { tags });
  return response.data.data;
};

export const updateConversationNotes = async (
  conversationId: string,
  notes: string
) => {
  const response = await api.patch(`/api/v1/chat-inbox/conversations/${conversationId}/notes`, { notes });
  return response.data.data;
};

export const assignConversation = async (
  conversationId: string,
  agentId: string
) => {
  const response = await api.post(`/api/v1/chat-inbox/conversations/${conversationId}/assign`, { agentId });
  return response.data.data;
};

// 🔧 NEW: Unipile Chat Management API
export const listUnipileChats = async (params?: {
  unread?: boolean;
  cursor?: string;
  before?: string;
  after?: string;
  limit?: number;
  account_type?: string;
  account_id?: string;
}) => {
  const response = await api.get('/api/v1/unipile/chats', { params });
  return response.data.data;
};

export const getUnipileChat = async (chatId: string, accountId?: string) => {
  const params = accountId ? { account_id: accountId } : {};
  const response = await api.get(`/api/v1/unipile/chats/${chatId}`, { params });
  return response.data.data;
};

export const performChatAction = async (
  chatId: string,
  action: 'setReadStatus' | 'setMuteStatus' | 'setArchiveStatus' | 'setPinnedStatus' | 'addParticipant',
  value: any
) => {
  const response = await api.patch(`/api/v1/unipile/chats/${chatId}`, { action, value });
  return response.data.data;
};

export const getChatMessages = async (
  chatId: string,
  params?: {
    cursor?: string;
    before?: string;
    after?: string;
    limit?: number;
    sender_id?: string;
  }
) => {
  const response = await api.get(`/api/v1/unipile/chats/${chatId}/messages`, { params });
  return response.data.data;
};

export const getChatAttendees = async (chatId: string) => {
  const response = await api.get(`/api/v1/unipile/chats/${chatId}/attendees`);
  return response.data.data;
};

export const forwardMessage = async (messageId: string, chatId: string) => {
  const response = await api.post(`/api/v1/unipile/messages/${messageId}/forward`, { chat_id: chatId });
  return response.data.data;
};

export const getAttendee = async (attendeeId: string) => {
  const response = await api.get(`/api/v1/unipile/chat-attendees/${attendeeId}`);
  return response.data.data;
};

export const getAttendeePicture = async (attendeeId: string): Promise<Blob> => {
  const response = await api.get(`/api/v1/unipile/chat-attendees/${attendeeId}/picture`, {
    responseType: 'blob'
  });
  return response.data;
};

export const getAttendeeChats = async (
  attendeeId: string,
  params?: {
    cursor?: string;
    limit?: number;
  }
) => {
  const response = await api.get(`/api/v1/unipile/chat-attendees/${attendeeId}/chats`, { params });
  return response.data.data;
};

export const getAttendeeMessages = async (
  attendeeId: string,
  params?: {
    cursor?: string;
    before?: string;
    after?: string;
    limit?: number;
    account_id?: string;
  }
) => {
  const response = await api.get(`/api/v1/unipile/chat-attendees/${attendeeId}/messages`, { params });
  return response.data.data;
};

// 🔧 NEW: Image Upload API
export const uploadImage = async (file: File): Promise<{ url: string }> => {
  const formData = new FormData();
  formData.append('image', file);
  const response = await api.post('/api/v1/upload/image', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data.data;
};

// 🔧 META OFFICIAL: Audio Upload API
// Supports: AAC, MP4, MPEG, AMR, OGG (max 16MB)
export const uploadAudio = async (file: File): Promise<{ url: string }> => {
  const formData = new FormData();
  formData.append('audio', file);
  const response = await api.post('/api/v1/upload/audio', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data.data;
};

// 🔧 NEW: Get customer platforms
export const getCustomerPlatforms = async (customerId: string) => {
  const response = await api.get(`/api/v1/unipile/customers/${customerId}/platforms`);
  return response.data.data;
};

