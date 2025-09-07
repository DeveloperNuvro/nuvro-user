// src/features/humanAgent/humanAgentInboxSlice.ts

import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { api } from "@/api/axios";
import { ConversationInList } from "../chatInbox/chatInboxSlice";

// --- STATE INTERFACE ---
interface AgentInboxState {
    conversations: ConversationInList[];
    status: "idle" | "loading" | "succeeded" | "failed";
    error: string | null;
    currentPage: number;
    totalPages: number;
}

// --- INITIAL STATE ---
const initialState: AgentInboxState = {
    conversations: [],
    status: "idle",
    error: null,
    currentPage: 1,
    totalPages: 1,
};

// --- ASYNC THUNKS ---
export const fetchAgentConversations = createAsyncThunk<
    { page: number; conversations: ConversationInList[]; totalPages: number },
    { page: number; searchQuery?: string; status: 'open' | 'closed' },
    { rejectValue: string }
>(
    "agentInbox/fetchAgentConversations",
    async ({ page, searchQuery, status }, thunkAPI) => {
        try {
            const response = await api.get("/api/v1/agents/my-conversations", {
                params: { page, limit: 15, search: searchQuery || "", status }
            });

            const responsePayload = response.data.data;
            const conversations: ConversationInList[] = responsePayload.data;
            const totalPages = responsePayload.pagination?.totalPages || 1;

            return { page, conversations, totalPages };
        } catch (error: any) {
            return thunkAPI.rejectWithValue(error.response?.data?.message || "Failed to fetch agent conversations");
        }
    }
);

const agentInboxSlice = createSlice({
    name: "agentInbox",
    initialState,
    reducers: {
        resetAgentConversations: (state) => {
            state.conversations = [];
            state.currentPage = 1;
            state.totalPages = 1;
            state.status = 'idle';
        },
        addAssignedConversation: (state, action: PayloadAction<ConversationInList>) => {
            const exists = state.conversations.some(c => c.id === action.payload.id);
            if (!exists) {
                state.conversations.unshift(action.payload);
            }
        },
        removeConversation: (state, action: PayloadAction<{ conversationId: string }>) => {
            state.conversations = state.conversations.filter(c => c.id !== action.payload.conversationId);
        },
  
        updateConversationPreview: (state, action: PayloadAction<{ conversationId: string; preview: string; latestMessageTimestamp: string }>) => {
            const { conversationId, preview, latestMessageTimestamp } = action.payload;
            const conversationIndex = state.conversations.findIndex(c => c.id === conversationId);

            if (conversationIndex !== -1) {
            
                const conversationToUpdate = {
                    ...state.conversations[conversationIndex],
                    preview,
                    latestMessageTimestamp,
                };
                
          
                const filteredConversations = state.conversations.filter(c => c.id !== conversationId);
                
                
                state.conversations = [conversationToUpdate, ...filteredConversations];
            }
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchAgentConversations.pending, (state) => {
                state.status = "loading";
            })
            .addCase(fetchAgentConversations.fulfilled, (state, action) => {
                const { conversations, page, totalPages } = action.payload;
                state.conversations = conversations;
                state.currentPage = page;
                state.totalPages = totalPages;
                state.status = "succeeded";
            })
            .addCase(fetchAgentConversations.rejected, (state, action) => {
                state.status = "failed";
                state.error = action.payload || "An error occurred";
            });
    },
});

// --- EXPORT THE NEW ACTION ---
export const {
    addAssignedConversation,
    removeConversation,
    resetAgentConversations,
    updateConversationPreview, // <-- Exported
} = agentInboxSlice.actions;

export default agentInboxSlice.reducer;