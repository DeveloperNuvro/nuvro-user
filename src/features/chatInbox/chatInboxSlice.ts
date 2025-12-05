// src/features/chatInbox/chatInboxSlice.ts

import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { api } from "@/api/axios";

// --- INTERFACES ---

export interface ConversationInList {
    id: string;
    customer: {
        id: string;
        name: string;
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
    sentBy: "customer" | "agent" | "human" | "system";
    status?: 'sending' | 'failed';
    // 🔧 NEW: Media message support
    messageType?: 'text' | 'image' | 'video' | 'audio' | 'document';
    mediaUrl?: string | null;
    cloudinaryUrl?: string | null;
    originalMediaUrl?: string | null;
    proxyUrl?: string | null;
    attachmentId?: string | null;
    metadata?: {
        messageType?: 'text' | 'image' | 'video' | 'audio' | 'document';
        mediaUrl?: string | null;
        cloudinaryUrl?: string | null;
        proxyUrl?: string | null;
        attachmentId?: string | null;
        [key: string]: any;
    };
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
            // Fetch conversations from the existing endpoint (now includes Unipile conversations)
            const params: any = { businessId, page, limit: 15, search: searchQuery || "", status };
            if (platform && platform !== 'all') {
                params.platform = platform;
            }
            const res = await api.get("/api/v1/customer/by-business", { params });
            const responsePayload = res.data.data;
            const conversations: ConversationInList[] = responsePayload.data || [];
            const totalPages = responsePayload.pagination?.totalPages || 1;

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
        const responsePayload = res.data.data;
        const messagesArray = responsePayload.data;
        if (!Array.isArray(messagesArray)) {
            return thunkAPI.rejectWithValue("Message data from API was not an array");
        }
        const formatted = messagesArray.map((msg: any) => ({
           _id: msg._id, 
           text: msg.message, 
           time: msg.timestamp, 
           sentBy: msg.sender,
           // 🔧 NEW: Include media metadata
           messageType: msg.messageType || msg.metadata?.messageType || 'text',
           mediaUrl: msg.mediaUrl || msg.metadata?.mediaUrl || msg.metadata?.cloudinaryUrl || null,
           cloudinaryUrl: msg.cloudinaryUrl || msg.metadata?.cloudinaryUrl || null,
           originalMediaUrl: msg.originalMediaUrl || msg.metadata?.originalMediaUrl || null,
           proxyUrl: msg.proxyUrl || msg.metadata?.proxyUrl || null,
           attachmentId: msg.attachmentId || msg.metadata?.attachmentId || null,
           metadata: msg.metadata || {}
        })).reverse();
        return {
            customerId,
            messages: formatted,
            page: responsePayload.pagination.currentPage,
            totalPages: responsePayload.pagination.totalPages,
        };
    } catch (error: any) {
        return thunkAPI.rejectWithValue(error.response?.data?.message || "Failed to fetch messages");
    }
});

export const sendHumanMessage = createAsyncThunk<Message, { businessId: string; customerId: string; message: string; senderSocketId: string; }, { rejectValue: string }>("chatInbox/sendHumanMessage", async (payload, thunkAPI) => {
    try {

        const { data } = await api.post('/api/v1/messages/send-human', payload);
        return data.data.message;
    } catch (error: any) {
        return thunkAPI.rejectWithValue(error.response?.data?.message || "Failed to send message");
    }
});

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
                // 🔧 NEW: Include media metadata from socket message
                messageType: rawMessage.messageType || rawMessage.metadata?.messageType || 'text',
                mediaUrl: rawMessage.mediaUrl || rawMessage.metadata?.mediaUrl || rawMessage.metadata?.cloudinaryUrl || null,
                cloudinaryUrl: rawMessage.cloudinaryUrl || rawMessage.metadata?.cloudinaryUrl || null,
                originalMediaUrl: rawMessage.originalMediaUrl || rawMessage.metadata?.originalMediaUrl || null,
                proxyUrl: rawMessage.proxyUrl || rawMessage.metadata?.proxyUrl || null,
                attachmentId: rawMessage.attachmentId || rawMessage.metadata?.attachmentId || null,
                metadata: rawMessage.metadata || {}
            };
            
            if (state.chatData[customerId]) {
                state.chatData[customerId].list.push(transformedMessage);
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