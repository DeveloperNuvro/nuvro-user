import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { api } from "@/api/axios";
import { ConversationInList} from "../chatInbox/chatInboxSlice"; 



interface AgentInboxState {
    conversations: ConversationInList[];
    status: "idle" | "loading" | "succeeded" | "failed";
    error: string | null;
}

const initialState: AgentInboxState = {
    conversations: [],
    status: "idle",
    error: null,
};

// --- ASYNC THUNKS ---

export const fetchAgentConversations = createAsyncThunk<
    ConversationInList[],
    void, 
    { rejectValue: string }
>(
    "agentInbox/fetchAgentConversations",
    async (_, thunkAPI) => {
        try {
          
            const response = await api.get("/api/v1/agents/my-conversations");
            return response.data.data; 
        } catch (error: any) {
            return thunkAPI.rejectWithValue(error.response?.data?.message || "Failed to fetch conversations");
        }
    }
);



const agentInboxSlice = createSlice({
    name: "agentInbox",
    initialState,
    reducers: {
        addAssignedConversation: (state, action: PayloadAction<ConversationInList>) => {
            const exists = state.conversations.some(c => c.id === action.payload.id);
            if (!exists) {
                state.conversations.unshift(action.payload);
            }
        },
        
        removeConversation: (state, action: PayloadAction<{ conversationId: string }>) => {
            state.conversations = state.conversations.filter(c => c.id !== action.payload.conversationId);
        },

    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchAgentConversations.pending, (state) => {
                state.status = "loading";
            })
            .addCase(fetchAgentConversations.fulfilled, (state, action) => {
                state.status = "succeeded";
                state.conversations = action.payload;
            })
            .addCase(fetchAgentConversations.rejected, (state, action) => {
                state.status = "failed";
                state.error = action.payload || "An error occurred";
            });
    },
});

export const { addAssignedConversation,  removeConversation } = agentInboxSlice.actions;
export default agentInboxSlice.reducer;