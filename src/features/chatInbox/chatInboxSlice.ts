import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { api } from "@/api/axios";

// --- INTERFACES ---

// Represents a CONVERSATION in the inbox list. It contains a nested customer object.
export interface ConversationInList {
    id: string; // This is the Conversation ID
    customer: { // The customer is a nested object
        id: string;
        name: string;
    };
    preview: string;
    latestMessageTimestamp?: string;
    status: 'live' | 'ticket' | 'ai_only' | 'closed';
    assignedAgentId?: string;
}

// Represents a customer for the dedicated "All Customers" table/page.
export interface CustomerTableRow {
    id: string;
    name: string;
    email: string;
    phone: string;
    createdAt: string;
}

// Represents a single message within a chat.
export interface Message {
    text: string;
    time: string;
    sentBy: "customer" | "agent" | "human" | "system";
}

// --- STATE INTERFACE ---

interface ChatInboxState {
    conversations: ConversationInList[];
    chatData: { [customerId: string]: Message[] };
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
    hasMore: boolean;
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
    hasMore: true,
};

// --- ASYNC THUNKS ---

export const fetchCustomersByBusiness = createAsyncThunk<
    { page: number; conversations: ConversationInList[]; totalPages: number },
    { businessId: string; page: number; searchQuery?: string },
    { rejectValue: string }
>(
    "chatInbox/fetchCustomersByBusiness",
    async ({ businessId, page, searchQuery }, thunkAPI) => {
        try {
            // This now calls your new, correct backend endpoint
            const res = await api.get("/api/v1/customer/by-business", {
                params: { businessId, page, limit: 10, search: searchQuery || "" },
            });
            const rawData = res.data.data;
            // This mapping now perfectly matches the response from getConversationsForInbox
            const conversations = rawData.data.map((c: any) => ({
                id: c._id,
                customer: {
                    id: c.customerId._id,
                    name: c.customerId.name || "Unknown Customer",
                },
                preview: c.latestMessage,
                latestMessageTimestamp: c.lastMessageTimestamp || c.updatedAt,
                status: c.status,
                assignedAgentId: c.assignedAgentId,
            }));
            const totalPages = rawData.pagination?.totalPages || 1;
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

export const fetchMessagesByCustomer = createAsyncThunk<
    { customerId: string; messages: Message[] },
    { customerId: string; page?: number }, // Added optional page for future use
    { rejectValue: string }
>("chatInbox/fetchMessagesByCustomer", async ({ customerId, page = 1 }, thunkAPI) => {
    try {
        const res = await api.get(`/api/v1/customer/messages/${customerId}`, {
            params: { page, limit: 20 },
        });

        // --- THE DEFINITIVE FIX IS HERE ---
        // The array of messages is at res.data.data.data
        const messagesArray = res.data.data.data;

        // Ensure we are mapping over an actual array
        if (!Array.isArray(messagesArray)) {
            console.error("API response for messages was not an array:", messagesArray);
            return { customerId, messages: [] };
        }

        const formatted = messagesArray.map((msg: any) => ({
            text: msg.message, time: msg.timestamp, sentBy: msg.sender,
        })).reverse();

        return { customerId, messages: formatted };
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
        addRealtimeMessage: (state, action: PayloadAction<{ customerId: string; message: Message }>) => {
            const { customerId, message } = action.payload;
            if (!state.chatData[customerId]) { state.chatData[customerId] = []; }
            state.chatData[customerId].push(message);

            const convoIndex = state.conversations.findIndex(c => c.customer.id === customerId);
            if (convoIndex !== -1) {
                state.conversations[convoIndex].preview = message.text;
                state.conversations[convoIndex].latestMessageTimestamp = message.time;
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
                state.conversations[convoIndex].assignedAgentId = assignedAgentId;
            }
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchCustomersByBusiness.pending, (state) => {
                if (state.currentPage === 1) state.status = "loading";
            })
            .addCase(fetchCustomersByBusiness.fulfilled, (state, action) => {
                const { conversations, page, totalPages } = action.payload;
                if (page === 1) {
                    state.conversations = conversations;
                } else {
                    const existingIds = new Set(state.conversations.map(c => c.id));
                    const newConversations = conversations.filter(c => !existingIds.has(c.id));
                    state.conversations.push(...newConversations);
                }
                state.currentPage = page;
                state.totalPages = totalPages;
                state.hasMore = page < totalPages;
                state.status = "succeeded";
            })
            .addCase(fetchCustomersByBusiness.rejected, (state, action) => {
                state.status = "failed";
                state.error = action.payload || "An unknown error occurred";
            })
            .addCase(fetchMessagesByCustomer.pending, (state) => { state.status = "loading"; })
            .addCase(fetchMessagesByCustomer.fulfilled, (state, action) => {
                state.status = "succeeded";
                state.chatData[action.payload.customerId] = action.payload.messages;
            })
            .addCase(fetchMessagesByCustomer.rejected, (state, action) => {
                state.status = "failed";
                state.error = action.payload || "An unknown error occurred";
            })
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

export const { addRealtimeMessage, addNewCustomer, updateConversationStatus, removeConversation } = chatInboxSlice.actions;
export default chatInboxSlice.reducer;