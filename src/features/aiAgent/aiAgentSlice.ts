import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { api } from "@/api/axios";

// --- Interfaces ---

/**
 * Represents a configured AI Agent.
 * The `aiModel` field can be a simple string (ID) or a populated object.
 */
export interface AIAgent {
  _id: string;
  name: string;
  aiModel: string | { _id: string; name: string };
  tone: "friendly" | "formal" | "neutral";
  instruction?: string;
  responseTemplates?: string[];
  active?: boolean;
  business?: string;
  personality?: {
      tone: "friendly" | "formal" | "neutral";
      instruction?: string;
  };
}

// Type definitions for API payloads to ensure type safety
export type NewAIAgentPayload = Omit<AIAgent, '_id'>;
export type EditAIAgentPayload = Partial<Omit<AIAgent, '_id'>> & { _id: string };

/**
 * The shape of the API response when fetching a single agent by its ID.
 */
interface FetchAgentByIdResponse {
    agent: AIAgent;
    apiKey: string;
}

/**
 * The complete state for the AI Agent feature.
 */
interface AIAgentState {
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
  aiAgents: AIAgent[];
  selectedAgent: AIAgent | null;
  apiKey: string | null;
}

// --- Initial State ---

const initialState: AIAgentState = {
  status: "idle",
  error: null,
  aiAgents: [],
  selectedAgent: null,
  apiKey: null,
};

// --- Async Thunks (API Calls) ---

export const createAIAgent = createAsyncThunk<AIAgent, NewAIAgentPayload, { rejectValue: string }>(
  "aiAgent/createAIAgent",
  async (payload, thunkAPI) => {
    try {
      const response = await api.post("/api/v1/ai-agent", payload);
      return response.data.data;
    } catch (err: any) {
      return thunkAPI.rejectWithValue(err.response?.data?.message || "Failed to create agent");
    }
  }
);

export const fetchAiAgentsByBusinessId = createAsyncThunk<AIAgent[], void, { rejectValue: string }>(
  'aiAgent/fetchAiAgentsByBusinessId', 
  async (_, thunkAPI) => {
    try {
      const res = await api.get('/api/v1/ai-agent/by-business'); 
      return res.data.data;
    } catch (error: any) {
      return thunkAPI.rejectWithValue(error.response?.data?.message || 'Failed to fetch AI agents');
    }
  }
);

export const fetchAIAgentById = createAsyncThunk<FetchAgentByIdResponse, string, { rejectValue: string }>(
  "aiAgent/fetchAIAgentById", 
  async (id, thunkAPI) => {
    try {
      const res = await api.get(`/api/v1/ai-agent/${id}`);
      return res.data.data;
    } catch (err: any) {
      return thunkAPI.rejectWithValue(err.response?.data?.message || "Failed to fetch agent");
    }
  }
);

export const editAIAgent = createAsyncThunk<AIAgent, EditAIAgentPayload, { rejectValue: string }>(
    "aiAgent/editAIAgent",
    async (payload, thunkAPI) => {
        try {
            const { _id, ...updateData } = payload;
            const response = await api.patch(`/api/v1/ai-agent/${_id}`, updateData);
            return response.data.data;
        } catch (err: any) {
            return thunkAPI.rejectWithValue(err.response?.data?.message || "Failed to update agent");
        }
    }
);

export const deleteAIAgent = createAsyncThunk<string, string, { rejectValue: string }>(
    "aiAgent/deleteAIAgent",
    async (agentId, thunkAPI) => {
        try {
            await api.delete(`/api/v1/ai-agent/${agentId}`);
            return agentId; // Return the ID for removal from state
        } catch (err: any) {
            return thunkAPI.rejectWithValue(err.response?.data?.message || "Failed to delete agent");
        }
    }
);

// --- Slice Definition ---

const aiAgentSlice = createSlice({
  name: "aiAgent",
  initialState,
  reducers: {
    clearSelectedAgent: (state) => {
        state.selectedAgent = null;
        state.apiKey = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Create Agent
      .addCase(createAIAgent.pending, (state) => { state.status = "loading"; })
      .addCase(createAIAgent.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.aiAgents.push(action.payload);
      })
      .addCase(createAIAgent.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload ?? "An unknown error occurred";
      })

      // Fetch All Agents
      .addCase(fetchAiAgentsByBusinessId.pending, (state) => { state.status = "loading"; })
      .addCase(fetchAiAgentsByBusinessId.fulfilled, (state, action: PayloadAction<AIAgent[]>) => {
        state.status = "succeeded";
        state.aiAgents = action.payload;
      })
      .addCase(fetchAiAgentsByBusinessId.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload ?? "An unknown error occurred";
      })

      // Fetch Agent By ID
      .addCase(fetchAIAgentById.pending, (state) => { state.status = "loading"; })
      .addCase(fetchAIAgentById.fulfilled, (state, action: PayloadAction<FetchAgentByIdResponse>) => {
        state.status = "succeeded";
        state.selectedAgent = action.payload.agent;
        state.apiKey = action.payload.apiKey;
      })
      .addCase(fetchAIAgentById.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload ?? "An unknown error occurred";
      })

      // Edit Agent
      .addCase(editAIAgent.pending, (state) => { state.status = "loading"; })
      .addCase(editAIAgent.fulfilled, (state, action: PayloadAction<AIAgent>) => {
        state.status = "succeeded";
        const index = state.aiAgents.findIndex(agent => agent._id === action.payload._id);
        if (index !== -1) {
            state.aiAgents[index] = action.payload;
        }
        if (state.selectedAgent?._id === action.payload._id) {
            state.selectedAgent = action.payload;
        }
      })
      .addCase(editAIAgent.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload ?? "An unknown error occurred";
      })

      // Delete Agent
      .addCase(deleteAIAgent.pending, (state) => { state.status = "loading"; })
      .addCase(deleteAIAgent.fulfilled, (state, action: PayloadAction<string>) => {
        state.status = "succeeded";
        state.aiAgents = state.aiAgents.filter(agent => agent._id !== action.payload);
        if (state.selectedAgent?._id === action.payload) {
            state.selectedAgent = null;
            state.apiKey = null;
        }
      })
      .addCase(deleteAIAgent.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload ?? "An unknown error occurred";
      });
  },
});

export const { clearSelectedAgent } = aiAgentSlice.actions;
export default aiAgentSlice.reducer;