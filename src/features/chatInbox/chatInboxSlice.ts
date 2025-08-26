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
}

export interface CustomerTableRow {
    id: string;
    name: string;
    email: string;
    phone: string;
    createdAt: string;
}

export interface Message {
    text: string;
    time: string;
    sentBy: "customer" | "agent" | "human" | "system";
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
    { businessId: string; page: number; searchQuery?: string; status: 'open' | 'closed' },
    { rejectValue: string }
>(
    "chatInbox/fetchCustomersByBusiness",
    async ({ businessId, page, searchQuery, status }, thunkAPI) => {
        try {
            const res = await api.get("/api/v1/customer/by-business", {
                params: { businessId, page, limit: 15, search: searchQuery || "", status },
            });
            const responsePayload = res.data.data;
            const conversations: ConversationInList[] = responsePayload.data;
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
            text: msg.message, time: msg.timestamp, sentBy: msg.sender,
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

export const sendHumanMessage = createAsyncThunk<void, { businessId: string; customerId: string; message: string; senderSocketId: string; }, { rejectValue: string }>("chatInbox/sendHumanMessage", async (payload, thunkAPI) => {
    try {
        await api.post('/api/v1/messages/send-human', payload);
    } catch (error: any) {
        return thunkAPI.rejectWithValue(error.response?.data?.message || "Failed to send message");
    }
});

// --- SLICE DEFINITION ---

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
        addRealtimeMessage: (state, action: PayloadAction<{ customerId: string; message: Message }>) => {
            const { customerId, message } = action.payload;
            if (state.chatData[customerId]) {
                state.chatData[customerId].list.push(message);
            }
            const convoIndex = state.conversations.findIndex(c => c.customer.id === customerId);
            if (convoIndex !== -1) {
                const conversationToMove = state.conversations[convoIndex];
                conversationToMove.preview = message.text;
                conversationToMove.latestMessageTimestamp = message.time;
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
            }
        },
        updateConversationStatus: (state, action: PayloadAction<{ customerId: string; status: ConversationInList['status']; assignedAgentId?: string }>) => {
            const { customerId, status, assignedAgentId } = action.payload;
            const convoIndex = state.conversations.findIndex(c => c.customer.id === customerId);
            if (convoIndex !== -1) {
                state.conversations[convoIndex].status = status;
                if (assignedAgentId !== undefined) {
                    state.conversations[convoIndex].assignedAgentId = assignedAgentId;
                }
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
            });
    },
});

export const { addRealtimeMessage, addNewCustomer, updateConversationStatus, removeConversation, resetConversations } = chatInboxSlice.actions;
export default chatInboxSlice.reducer;