// 🔧 NEW: Chat API functions for Unipile features
// 10-item fix: (8) getConversationSummary, (9) improveMessage for AI Summary & Improve tone
import { api, absolutizeApiUrl } from './axios';

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
  const payload = response.data?.data;
  return payload?.data ?? payload ?? [];
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

/** Get a playable audio URL for a chat message (when message.audioSrc is missing). */
export const getAudioPlayUrl = async (chatMessageId: string): Promise<string | null> => {
  const response = await api.get('/api/v1/chat-inbox/audio-play-url', {
    params: { chatMessageId },
  });
  const url = response.data?.data?.url;
  if (typeof url !== 'string' || !url) return null;
  return absolutizeApiUrl(url) || url;
};

export type WhatsAppOptIn = {
  status: 'opted_in' | 'opted_out' | 'pending';
  optedInAt: string | null;
  optedOutAt: string | null;
  optInSource: string | null;
};

export type WhatsAppSessionInfo = {
  withinWindow: boolean;
  hoursRemaining: number;
  lastMessageTimestamp: string | null;
  requiresTemplate: boolean;
  optIn?: WhatsAppOptIn;
  /** 'unipile' = Unipile WhatsApp (no Meta 24h/opt-in UI); omit or 'meta' = Meta WhatsApp Business */
  source?: 'meta' | 'unipile';
};

export const getWhatsAppSessionByConversation = async (conversationId: string): Promise<WhatsAppSessionInfo> => {
  const response = await api.get(`/api/v1/chat-inbox/conversations/${conversationId}/whatsapp-session`);
  return response.data.data;
};

/** Set WhatsApp opt-in status (Meta policy – business-initiated/promotional). */
export const setWhatsAppOptIn = async (
  conversationId: string,
  payload: { status: 'opted_in' | 'opted_out'; optInSource?: string }
) => {
  const response = await api.patch(`/api/v1/chat-inbox/conversations/${conversationId}/whatsapp-opt-in`, payload);
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
  /** Whapi-linked WhatsApp only — forwarded to server for quote/reply on send */
  quotedWhapiMessageId?: string;
  /** Shown in inbox as “replying to …” (optional; server stores on ChatMessage.metadata). */
  quotedPreviewText?: string;
  replyToWhapiMessageId?: string;
  whapiAudioDelivery?: 'voice' | 'file';
  filename?: string;
  /** Whapi / inbox: original filename for document (PDF) messages */
  documentFilename?: string;
  useTemplate?: boolean;
  templateName?: string;
  templateLanguage?: string;
  templateComponents?: Array<{
    type: 'header' | 'body' | 'button';
    parameters?: Array<{
      type: 'text' | 'image' | 'video' | 'document' | 'currency' | 'date_time';
      text?: string;
      image?: { link?: string; id?: string };
      video?: { link?: string; id?: string };
      document?: { link?: string; id?: string };
      currency?: { fallback_value: string; code: string; amount_1000: number };
      date_time?: { fallback_value: string };
    }>;
  }>;
  /** Matches backend + socket outbound UX (`outboundMessagePending` / `metadata.clientRequestId`). */
  clientRequestId?: string;
}) => {
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

/** Send an internal note as a message so it appears in the chat flow (chronologically), not only at the top */
export const sendInternalNote = async (
  conversationId: string,
  message: string
): Promise<{ message: { _id: string; text: string; sentBy: string; time: string; metadata?: { isInternalNote: boolean } } }> => {
  const response = await api.post(`/api/v1/chat-inbox/conversations/${conversationId}/internal-notes`, { message });
  return response.data.data;
};

export const getConversationSummary = async (conversationId: string): Promise<{ summary: string }> => {
  const response = await api.get(`/api/v1/chat-inbox/conversations/${conversationId}/summary`);
  return response.data.data;
};

/** Improve message tone; pass language so the improved text stays in the same language (e.g. 'en' | 'es' | 'bn'). */
export const improveMessage = async (text: string, language?: string): Promise<{ improvedText: string }> => {
  const response = await api.post('/api/v1/chat-inbox/improve-message', { text, language });
  return response.data.data;
};

export const assignConversation = async (
  conversationId: string,
  agentId: string
) => {
  const response = await api.post(`/api/v1/chat-inbox/conversations/${conversationId}/assign`, { agentId });
  return response.data.data;
};

/** Return conversation to the team queue (clear assignee). */
export const releaseConversationToQueue = async (conversationId: string) => {
  const response = await api.post(`/api/v1/chat-inbox/conversations/${conversationId}/release`, {});
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

/** Chat inbox: images, video, or PDF (returns Cloudinary URL + messageType for send). */
export const uploadChatAttachment = async (
  file: File
): Promise<{ url: string; messageType: 'image' | 'video' | 'document'; fileName?: string }> => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post('/api/v1/upload/chat-attachment', formData, {
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

// 🔧 META: WhatsApp policy copy & compliance summary (for Integrations / Help / appeal)
export const getWhatsAppPolicyCopy = async () => {
  const response = await api.get('/api/v1/whatsapp-business/policy-copy');
  return response.data.data;
};

export const getWhatsAppComplianceSummary = async () => {
  const response = await api.get('/api/v1/whatsapp-business/compliance-summary');
  return response.data.data;
};

