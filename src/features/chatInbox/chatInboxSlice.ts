// src/features/chatInbox/chatInboxSlice.ts
// 10-item fix: (5) addRealtimeMessage dedupe by _id to prevent image showing 3x

import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { api } from "@/api/axios";
import { normalizeApiMediaUrl } from "@/lib/audioUrlNormalize";

// --- INTERFACES ---

export interface ConversationInList {
    id: string;
    customer: {
        id: string;
        name: string;
        phone?: string;
    };
    preview: string;
    latestMessageTimestamp?: string;
    status: 'live' | 'ticket' | 'ai_only' | 'closed';
    assignedAgentId?: string;
    aiReplyDisabled?: boolean;
    platformInfo?: {
        platform: 'whatsapp' | 'instagram' | 'telegram' | 'email' | 'website';
        connectionId?: string;
        platformUserId?: string;
        platformUserName?: string;
        platformUserAvatar?: string;
    };
    source?: string; // 🔧 FIX: Fallback for platform if platformInfo is missing
    // 🔧 NEW: Enhanced features
    unreadCount?: number;
    priority?: 'low' | 'normal' | 'high' | 'urgent';
    tags?: string[];
    notes?: string;
    firstResponseAt?: string | null;
    lastAgentResponseAt?: string | null;
    customerLastSeenAt?: string | null;
    createdAt?: string; // Conversation creation date for response time calculation
    country?: {
        code: string;
        name: string;
    } | null; // Customer country for display
    /** Which WhatsApp connection this chat is under (for chat list display) */
    whatsappConnection?: {
        id: string;
        displayName: string | null;
        provider?: 'whapi' | 'unipile' | 'meta';
    };
}

export interface CustomerTableRow {
    id: string;
    name: string;
    email: string;
    phone: string;
    createdAt: string;
}

export interface Message {
    _id: string;
    text: string;
    time: string;
    // 'ai' is used when backend emits AI replies distinctly (for correct reporting + UI alignment)
    sentBy: "customer" | "agent" | "human" | "system" | "ai";
    status?: 'sending' | 'failed';
    // 🔧 NEW: Media message support
    messageType?: 'text' | 'image' | 'video' | 'audio' | 'document';
    mediaUrl?: string | null;
    cloudinaryUrl?: string | null;
    originalMediaUrl?: string | null;
    proxyUrl?: string | null;
    attachmentId?: string | null;
    /** Backend sets for audio messages — use in <audio src> for playback */
    audioUrl?: string | null;
    audioSrc?: string | null;
    audioPlayUrl?: string | null;
    metadata?: {
        messageType?: 'text' | 'image' | 'video' | 'audio' | 'document';
        mediaUrl?: string | null;
        cloudinaryUrl?: string | null;
        proxyUrl?: string | null;
        attachmentId?: string | null;
        audioSrc?: string | null;
        audioPlayUrl?: string | null;
        isInternalNote?: boolean;
        [key: string]: any;
    };
    /** When true, render as internal note bubble in the message flow (agent-only, chronological) */
    isInternalNote?: boolean;
}

// --- STATE INTERFACE ---

interface ChatInboxState {
    conversations: ConversationInList[];
    // Corrected: chatData now holds pagination state for each message list
    chatData: {
        [customerId: string]: {
            list: Message[],
            currentPage: number,
            totalPages: number,
            hasMore: boolean,
            status: 'idle' | 'loading' | 'succeeded',
        }
    };
    customerTable: {
        list: CustomerTableRow[],
        totalPages: number,
        currentPage: number,
        status: "idle" | "loading" | "succeeded" | "failed";
        error: string | null;
    },
    status: "idle" | "loading" | "succeeded" | "failed";
    error: string | null;
    currentPage: number;
    totalPages: number;
}

// --- INITIAL STATE ---

const initialState: ChatInboxState = {
    conversations: [],
    chatData: {},
    customerTable: { list: [], totalPages: 1, currentPage: 1, status: "idle", error: null },
    status: "idle",
    error: null,
    currentPage: 1,
    totalPages: 1,
};

// --- ASYNC THUNKS ---

export const fetchCustomersByBusiness = createAsyncThunk<
    { page: number; conversations: ConversationInList[]; totalPages: number },
    { businessId: string; page: number; searchQuery?: string; status: 'open' | 'closed'; platform?: 'whatsapp' | 'instagram' | 'telegram' | 'email' | 'website' | 'all' },
    { rejectValue: string }
>(
    "chatInbox/fetchCustomersByBusiness",
    async ({ businessId, page, searchQuery, status, platform }, thunkAPI) => {
        try {
            // Fetch from chat-inbox (same as /api/v1/customer/by-business; includes Unipile/WhatsApp)
            const params: any = { businessId, page, limit: 15, search: searchQuery || "", status };
            if (platform && platform !== 'all') {
                params.platform = platform;
            }
            const res = await api.get("/api/v1/chat-inbox/conversations", { params });
            const responsePayload = res.data.data;
            const rawList = responsePayload?.data || [];
            // Normalize so id and customer.id are always strings (backend may send ObjectId)
            const normWaProv = (p: unknown): 'whapi' | 'unipile' | 'meta' | undefined => {
                const s = String(p ?? '').toLowerCase();
                if (s === 'whapi' || s === 'unipile' || s === 'meta') return s;
                return undefined;
            };
            const conversations: ConversationInList[] = rawList.map((c: any) => ({
                ...c,
                id: c.id != null ? String(c.id) : c._id != null ? String(c._id) : '',
                customer: c.customer
                    ? {
                          id:
                              c.customer.id != null
                                  ? String(c.customer.id)
                                  : c.customer._id != null
                                    ? String(c.customer._id)
                                    : '',
                          name: c.customer.name ?? '',
                          ...(c.customer.phone != null && String(c.customer.phone).trim() !== ''
                              ? { phone: String(c.customer.phone).trim() }
                              : {}),
                      }
                    : { id: '', name: '' },
                ...(c.whatsappConnection
                    ? {
                          whatsappConnection: {
                              id: String(c.whatsappConnection.id ?? '').trim(),
                              displayName: c.whatsappConnection.displayName ?? null,
                              ...(normWaProv(c.whatsappConnection.provider)
                                  ? { provider: normWaProv(c.whatsappConnection.provider)! }
                                  : {}),
                          },
                      }
                    : {}),
            }));

            const totalPages = responsePayload?.pagination?.totalPages ?? 1;

            return { page, conversations, totalPages };
        } catch (error: any) {
            return thunkAPI.rejectWithValue(error.response?.data?.message || "Failed to fetch conversations");
        }
    }
);


export const fetchCustomersForTable = createAsyncThunk<
    { customers: CustomerTableRow[], totalPages: number, currentPage: number },
    { businessId: string; page: number; limit?: number, searchQuery?: string },
    { rejectValue: string }
>(
    "chatInbox/fetchCustomersForTable",
    async ({ businessId, page, limit = 10, searchQuery }, thunkAPI) => {
        try {
            const res = await api.get('/api/v1/customer/all-customers', {
                params: { businessId, page, limit, search: searchQuery },
            });
            const responsePayload = res.data.data;
            const customers: CustomerTableRow[] = responsePayload.data.map((c: any) => ({
                id: c._id, name: c.name, email: c.email, phone: c.phone, createdAt: c.createdAt,
            }));
            return {
                customers,
                totalPages: responsePayload.pagination.totalPages,
                currentPage: responsePayload.pagination.currentPage
            };
        } catch (error: any) {
            return thunkAPI.rejectWithValue(error.response?.data?.message || "Failed to fetch customer table data");
        }
    }
);

// Corrected: Now returns full pagination data for messages
export const fetchMessagesByCustomer = createAsyncThunk<
    { customerId: string; messages: Message[], page: number, totalPages: number },
    { customerId: string; page?: number },
    { rejectValue: string }
>("chatInbox/fetchMessagesByCustomer", async ({ customerId, page = 1 }, thunkAPI) => {
    try {
        const res = await api.get(`/api/v1/customer/messages/${customerId}`, {
            params: { page, limit: 20 },
        });
        // Backend sends: res.data = { status, message, data: { success?, data: messages[], pagination } }
        const payload = res.data?.data;
        const messagesArray = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : null;
        const pagination = payload?.pagination || { currentPage: 1, totalPages: 1 };
        if (!Array.isArray(messagesArray)) {
            return thunkAPI.rejectWithValue("Message data from API was not an array");
        }
        // 🔧 CRITICAL: Preserve media URLs and audioSrc so document/image/audio preview works after refresh
        const formatted = messagesArray.map((msg: any) => {
           const meta = msg.metadata || {};
           const mediaUrl = msg.mediaUrl ?? meta.mediaUrl ?? meta.cloudinaryUrl ?? null;
           const cloudinaryUrl = msg.cloudinaryUrl ?? meta.cloudinaryUrl ?? (mediaUrl && !String(mediaUrl).startsWith('att://') ? mediaUrl : null);
           const audioUrl = msg.audioUrl ?? meta.audioUrl ?? null;
           const audioSrc = normalizeApiMediaUrl(msg.audioSrc ?? meta.audioSrc ?? null);
           const audioPlayUrl = normalizeApiMediaUrl(msg.audioPlayUrl ?? meta.audioPlayUrl ?? null);
           const proxyNorm = normalizeApiMediaUrl(msg.proxyUrl ?? meta.proxyUrl ?? null);
           return {
             ...msg,
             _id: msg._id,
             text: msg.text ?? msg.message ?? '',
             time: msg.time ?? msg.timestamp ?? new Date().toISOString(),
             sentBy: msg.sentBy ?? msg.sender ?? 'customer',
             messageType: msg.messageType || meta.messageType || 'text',
             mediaUrl: mediaUrl || msg.mediaUrl,
             cloudinaryUrl: cloudinaryUrl || msg.cloudinaryUrl,
             originalMediaUrl: msg.originalMediaUrl ?? meta.originalMediaUrl ?? null,
             proxyUrl: proxyNorm ?? msg.proxyUrl ?? meta.proxyUrl ?? null,
             attachmentId: msg.attachmentId ?? meta.attachmentId ?? null,
             audioUrl: audioUrl ?? msg.audioUrl,
             audioSrc: audioSrc ?? msg.audioSrc,
             audioPlayUrl: audioPlayUrl ?? msg.audioPlayUrl,
             metadata: { ...meta, mediaUrl: mediaUrl || meta.mediaUrl, cloudinaryUrl: cloudinaryUrl || meta.cloudinaryUrl, audioUrl, audioSrc, audioPlayUrl, proxyUrl: proxyNorm ?? meta.proxyUrl },
             isInternalNote: !!(msg.isInternalNote ?? meta.isInternalNote),
           };
        }).reverse();
        return {
            customerId,
            messages: formatted,
            page: pagination.currentPage ?? 1,
            totalPages: pagination.totalPages ?? 1,
        };
    } catch (error: any) {
        return thunkAPI.rejectWithValue(error.response?.data?.message || "Failed to fetch messages");
    }
});

export type SendHumanMessagePayload = {
    businessId: string;
    customerId: string;
    message: string;
    senderSocketId: string;
    /** Matches active thread — required for correct WhatsApp relay when customer has multiple open conversations. */
    conversationId?: string;
};

export const sendHumanMessage = createAsyncThunk<Message, SendHumanMessagePayload, { rejectValue: string }>(
    "chatInbox/sendHumanMessage",
    async (payload, thunkAPI) => {
        try {
            const body: Record<string, string> = {
                businessId: payload.businessId,
                customerId: payload.customerId,
                message: payload.message,
                senderSocketId: payload.senderSocketId,
            };
            if (payload.conversationId?.trim()) {
                body.conversationId = payload.conversationId.trim();
            }
            const { data } = await api.post('/api/v1/messages/send-human', body);
            return data.data.message;
        } catch (error: any) {
            const d = error.response?.data;
            const msg =
                (typeof d?.message === 'string' && d.message) ||
                (d?.error && typeof d.error === 'object' && typeof (d.error as { message?: string }).message === 'string'
                    ? (d.error as { message: string }).message
                    : null) ||
                "Failed to send message";
            return thunkAPI.rejectWithValue(msg);
        }
    }
);

export const closeConversation = createAsyncThunk<
    string,
    { conversationId: string; businessId: string },
    { rejectValue: string }
>(
    "chatInbox/closeConversation",
    async ({ conversationId, businessId }, thunkAPI) => {
        try {
            await api.patch(`/api/v1/customer/conversations/${conversationId}/close`, { businessId });
            return conversationId;
        } catch (error: any) {
            return thunkAPI.rejectWithValue(error.response?.data?.message || "Failed to close conversation");
        }
    }
);

export type CloseAllOpenPayload = {
    closed: number;
    alreadyClosed: number;
    failed: number;
    totalCandidates: number;
};

/** Business Chat Inbox: closes every open conversation for this business (backend cap CLOSE_ALL_OPEN_MAX). */
export const closeAllOpenConversations = createAsyncThunk<
    CloseAllOpenPayload,
    { businessId: string },
    { rejectValue: string }
>(
    "chatInbox/closeAllOpenConversations",
    async ({ businessId }, thunkAPI) => {
        try {
            const res = await api.post("/api/v1/chat-inbox/conversations/close-all-open", { businessId });
            const d = res.data?.data ?? res.data;
            return {
                closed: Number(d?.closed) || 0,
                alreadyClosed: Number(d?.alreadyClosed) || 0,
                failed: Number(d?.failed) || 0,
                totalCandidates: Number(d?.totalCandidates) || 0,
            };
        } catch (error: any) {
            return thunkAPI.rejectWithValue(
                error.response?.data?.message || "Failed to close all open conversations"
            );
        }
    }
);


const chatInboxSlice = createSlice({
    name: "chatInbox",
    initialState,
    reducers: {
        resetConversations: (state) => {
            state.conversations = [];
            state.currentPage = 1;
            state.totalPages = 1;
            state.status = 'idle';
        },
        addRealtimeMessage: (state, action: PayloadAction<{ customerId: string; message: any }>) => {
            const { customerId, message: rawMessage } = action.payload;
            
            // 🔧 FIX: Transform socket message to match expected Message format
            // Socket messages might have different field names (message vs text, sender vs sentBy, createdAt vs time)
            const transformedMessage: Message = {
                _id: rawMessage._id || rawMessage.id || `msg_${Date.now()}`,
                text: rawMessage.text || rawMessage.message || '',
                time: rawMessage.time || rawMessage.createdAt || rawMessage.timestamp || new Date().toISOString(),
                sentBy: rawMessage.sentBy || rawMessage.sender || 'customer',
                status: rawMessage.status,
                // 🔧 Include media metadata so WhatsApp/Unipile images show in inbox
                messageType: rawMessage.messageType || rawMessage.metadata?.messageType || 'text',
                mediaUrl: rawMessage.mediaUrl ?? rawMessage.metadata?.mediaUrl ?? rawMessage.cloudinaryUrl ?? rawMessage.metadata?.cloudinaryUrl ?? null,
                cloudinaryUrl: rawMessage.cloudinaryUrl ?? rawMessage.metadata?.cloudinaryUrl ?? null,
                originalMediaUrl: rawMessage.originalMediaUrl ?? rawMessage.metadata?.originalMediaUrl ?? null,
                proxyUrl: rawMessage.proxyUrl ?? rawMessage.metadata?.proxyUrl ?? null,
                attachmentId: rawMessage.attachmentId ?? rawMessage.metadata?.attachmentId ?? null,
                audioUrl: rawMessage.audioUrl ?? rawMessage.metadata?.audioUrl ?? null,
                audioSrc: rawMessage.audioSrc ?? rawMessage.metadata?.audioSrc ?? null,
                audioPlayUrl: rawMessage.audioPlayUrl ?? rawMessage.metadata?.audioPlayUrl ?? null,
                metadata: rawMessage.metadata || {}
            };
            
            // 🔧 Ensure chatData[customerId] exists so realtime message is never dropped (e.g. image from WhatsApp)
            if (!state.chatData[customerId]) {
                state.chatData[customerId] = {
                    list: [],
                    currentPage: 1,
                    totalPages: 1,
                    hasMore: false,
                    status: 'succeeded',
                };
            }
            const list = state.chatData[customerId].list;
            const existingIndex = list.findIndex((m) => m._id === transformedMessage._id);
            if (existingIndex !== -1) {
                // Dedupe: same message already in list (e.g. from optimistic + socket, or multiple socket listeners) – update in place with any extra fields
                list[existingIndex] = { ...list[existingIndex], ...transformedMessage, _id: list[existingIndex]._id };
            } else {
                list.push(transformedMessage);
            }
            const convoIndex = state.conversations.findIndex(c => c.customer.id === customerId);
            if (convoIndex !== -1) {
                const conversationToMove = state.conversations[convoIndex];
                conversationToMove.preview = transformedMessage.text;
                conversationToMove.latestMessageTimestamp = transformedMessage.time;
                state.conversations.splice(convoIndex, 1);
                state.conversations.unshift(conversationToMove);
            }
        },
        removeConversation: (state, action: PayloadAction<{ conversationId: string }>) => {
            state.conversations = state.conversations.filter(c => c.id !== action.payload.conversationId);
        },
        addNewCustomer: (state, action: PayloadAction<ConversationInList>) => {
            const conversation = action.payload;
            const exists = state.conversations.some((c) => c.id === conversation.id);
            if (!exists) {
                state.conversations.unshift(conversation);
            } else {
                // If exists, update it (might have new platformInfo)
                const index = state.conversations.findIndex((c) => c.id === conversation.id);
                if (index !== -1) {
                    // Merge the new data with existing, preserving platformInfo
                    state.conversations[index] = { ...state.conversations[index], ...conversation };
                }
            }
        },
        updateConversationStatus: (state, action: PayloadAction<{ customerId: string; status: ConversationInList['status']; assignedAgentId?: string; aiReplyDisabled?: boolean }>) => {
            const { customerId, status, assignedAgentId, aiReplyDisabled } = action.payload;
            const convoIndex = state.conversations.findIndex(c => c.customer.id === customerId);
            if (convoIndex !== -1) {
                state.conversations[convoIndex].status = status;
                if (assignedAgentId !== undefined) {
                    state.conversations[convoIndex].assignedAgentId = assignedAgentId;
                }
                if (aiReplyDisabled !== undefined) {
                    state.conversations[convoIndex].aiReplyDisabled = aiReplyDisabled;
                }
            }
        },
        // 🔧 NEW: Update enhanced conversation fields
        updateConversationEnhanced: (state, action: PayloadAction<{ conversationId: string; unreadCount?: number; priority?: string; tags?: string[]; notes?: string; assignedAgentId?: string; status?: ConversationInList['status'] }>) => {
            const { conversationId, unreadCount, priority, tags, notes, assignedAgentId, status } = action.payload;
            const convoIndex = state.conversations.findIndex(c => c.id === conversationId);
            if (convoIndex !== -1) {
                if (unreadCount !== undefined) state.conversations[convoIndex].unreadCount = unreadCount;
                if (priority) state.conversations[convoIndex].priority = priority as any;
                if (tags) state.conversations[convoIndex].tags = tags;
                if (notes !== undefined) state.conversations[convoIndex].notes = notes;
                if (assignedAgentId !== undefined) state.conversations[convoIndex].assignedAgentId = assignedAgentId;
                if (status) state.conversations[convoIndex].status = status;
            }
        }
    },
    extraReducers: (builder) => {
        builder
            // --- Handlers for Admin Inbox Conversations (Classic Pagination) ---
            .addCase(fetchCustomersByBusiness.pending, (state) => {
                state.status = "loading";
            })
            .addCase(fetchCustomersByBusiness.fulfilled, (state, action) => {
                const { conversations, page, totalPages } = action.payload;
                // ALWAYS replace the list for classic pagination
                state.conversations = conversations;
                state.currentPage = page;
                state.totalPages = totalPages;
                state.status = "succeeded";
            })
            .addCase(fetchCustomersByBusiness.rejected, (state, action) => {
                state.status = "failed";
                state.error = action.payload || "An unknown error occurred";
            })

            // --- Handlers for Messages ("Load More" Pagination) ---
            .addCase(fetchMessagesByCustomer.pending, (state, action) => {
                const { customerId } = action.meta.arg;
                if (!state.chatData[customerId]) {
                    state.chatData[customerId] = { list: [], currentPage: 1, totalPages: 1, hasMore: true, status: 'loading' };
                } else {
                    state.chatData[customerId].status = 'loading';
                }
            })
            .addCase(fetchMessagesByCustomer.fulfilled, (state, action) => {
                const { customerId, messages, page, totalPages } = action.payload;
                const chat = state.chatData[customerId];
                if (page === 1) {
                    // Replace list on first page load of a chat
                    chat.list = messages;
                } else {
                    // Prepend older messages for "Load More" functionality
                    chat.list.unshift(...messages);
                }
                chat.currentPage = page;
                chat.totalPages = totalPages;
                chat.hasMore = page < totalPages;
                chat.status = 'succeeded';
            })
            .addCase(fetchMessagesByCustomer.rejected, (state, action) => {
                const { customerId } = action.meta.arg;
                if (state.chatData[customerId]) {
                    state.chatData[customerId].status = 'idle';
                }
                state.error = action.payload || "Failed to fetch messages";
            })

            // --- Handlers for Customer Table (Unchanged) ---
            .addCase(fetchCustomersForTable.pending, (state) => {
                state.customerTable.status = "loading";
                state.customerTable.error = null;
            })
            .addCase(fetchCustomersForTable.fulfilled, (state, action) => {
                state.customerTable.status = "succeeded";
                state.customerTable.list = action.payload.customers;
                state.customerTable.currentPage = action.payload.currentPage;
                state.customerTable.totalPages = action.payload.totalPages;
            })
            .addCase(fetchCustomersForTable.rejected, (state, action) => {
                state.customerTable.status = "failed";
                state.customerTable.error = action.payload || "Failed to load customers";
            })

            // --- Handlers for Sending Human Messages with Optimistic UI Updates ---
            .addCase(sendHumanMessage.pending, (state, action) => {
                const { customerId, message } = action.meta.arg;

                
                if (!state.chatData[customerId]) {
                    state.chatData[customerId] = {
                        list: [], currentPage: 1, totalPages: 1, hasMore: true, status: 'idle'
                    };
                }

              
                const optimisticMessage: Message = {
                    _id: `temp_${Date.now()}`, 
                    text: message,
                    sentBy: 'human', 
                    time: new Date().toISOString(),
                    status: 'sending' 
                };
                state.chatData[customerId].list.push(optimisticMessage);
            })
            .addCase(sendHumanMessage.fulfilled, (state, action) => {
                const finalMessage: any = action.payload; 
                const customerId = finalMessage.customerId;

                if (state.chatData[customerId]) {
                  
                    const optimisticMessageIndex = state.chatData[customerId].list.findIndex(
                        msg => msg._id && msg._id.startsWith('temp_')
                    );

                    if (optimisticMessageIndex !== -1) {
                       
                        state.chatData[customerId].list[optimisticMessageIndex] = {
                            _id: finalMessage._id,
                            text: finalMessage.message,
                            sentBy: finalMessage.sender,
                            time: finalMessage.createdAt,
                        };
                    }
                }

              
                const convoIndex = state.conversations.findIndex(c => c.customer.id === customerId);
                if (convoIndex !== -1) {
                    state.conversations[convoIndex].preview = finalMessage.message;
                    state.conversations[convoIndex].latestMessageTimestamp = finalMessage.createdAt;
                }
            })
            .addCase(sendHumanMessage.rejected, (state, action) => {
                const { customerId } = action.meta.arg;
                if (state.chatData[customerId]) {
               
                    const optimisticMessageIndex = state.chatData[customerId].list.findIndex(
                        msg => msg._id && msg._id.startsWith('temp_')
                    );
                    if (optimisticMessageIndex !== -1) {
                     
                        state.chatData[customerId].list[optimisticMessageIndex].status = 'failed';
                    }
                }
            })


            .addCase(closeConversation.fulfilled, (state, action) => {
                state.conversations = state.conversations.filter(c => c.id !== action.payload);
            })
            .addCase(closeConversation.rejected, (state, action) => {
                state.error = action.payload || "Failed to close conversation.";
            });
    },
});

export const { addRealtimeMessage, addNewCustomer, updateConversationStatus, updateConversationEnhanced, removeConversation, resetConversations } = chatInboxSlice.actions;
export default chatInboxSlice.reducer;