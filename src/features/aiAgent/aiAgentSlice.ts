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

/** Structured details returned by GET /ai-agent/:id for the dashboard details page. */
export interface AgentDetailsPayload {
  basic: {
    id: string;
    name: string;
    active: boolean;
    statusLabel: string;
    workflowEnabled: boolean;
    createdAt: string;
    updatedAt: string;
  };
  personality: {
    tone: string;
    toneLabel: string;
    instruction: string | null;
  };
  fallback: {
    enabled: boolean;
    forwardToHuman: boolean;
    fallbackMessage: string;
  };
  analytics: {
    totalConversations: number;
    avgResponseTime: number;
    customerSatisfaction: number;
  };
  integrations: {
    options: string[];
    domains: string[];
    whatsApps: string[];
  };
  languageSupport: string[];
  responseTemplates: string[];
  aiModel: {
    id: string;
    name: string;
    modelType: string | null;
    status: string | null;
    vectorStore: string | null;
  } | null;
  widget: {
    apiKey: string | null;
    hasApiKey: boolean;
  };
}

/**
 * The shape of the API response when fetching a single agent by its ID.
 */
interface FetchAgentByIdResponse {
  agent: AIAgent;
  apiKey: string;
  details?: AgentDetailsPayload;
}

/**
 * The complete state for the AI Agent feature.
 */
interface AIAgentState {
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
  aiAgents: AIAgent[];
  selectedAgent: AIAgent | null;
  selectedAgentDetails: AgentDetailsPayload | null;
  apiKey: string | null;
}

// --- Initial State ---

const initialState: AIAgentState = {
  status: "idle",
  error: null,
  aiAgents: [],
  selectedAgent: null,
  selectedAgentDetails: null,
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

/** Get widget API key for business (no agent). Used when embedding with "Business workflow only". */
export const fetchWidgetApiKey = createAsyncThunk<{ apiKey: string }, void, { rejectValue: string }>(
  'aiAgent/fetchWidgetApiKey',
  async (_, thunkAPI) => {
    try {
      const res = await api.get('/api/v1/ai-agent/widget-api-key');
      return res.data.data;
    } catch (err: any) {
      return thunkAPI.rejectWithValue(err.response?.data?.message || 'Failed to fetch widget API key');
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

export const toggleAIAgentStatus = createAsyncThunk<AIAgent, string, { rejectValue: string }>(
    "aiAgent/toggleAIAgentStatus",
    async (agentId, thunkAPI) => {
        try {
            const response = await api.patch(`/api/v1/ai-agent/${agentId}/toggle-status`);
            return response.data.data.agent;
        } catch (err: any) {
            return thunkAPI.rejectWithValue(err.response?.data?.message || "Failed to toggle agent status");
        }
    }
);

export const updateAIAgentStatus = createAsyncThunk<AIAgent, { agentId: string; active: boolean }, { rejectValue: string }>(
    "aiAgent/updateAIAgentStatus",
    async (payload, thunkAPI) => {
        try {
            const { agentId, active } = payload;
            const response = await api.patch(`/api/v1/ai-agent/${agentId}/status`, { active });
            return response.data.data.agent;
        } catch (err: any) {
            return thunkAPI.rejectWithValue(err.response?.data?.message || "Failed to update agent status");
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
      state.selectedAgentDetails = null;
      state.apiKey = null;
    },
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
        state.selectedAgentDetails = action.payload.details ?? null;
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
            state.selectedAgentDetails = null;
            state.apiKey = null;
        }
      })
      .addCase(deleteAIAgent.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload ?? "An unknown error occurred";
      })

      // Toggle Agent Status
      .addCase(toggleAIAgentStatus.pending, (state) => { state.status = "loading"; })
      .addCase(toggleAIAgentStatus.fulfilled, (state, action: PayloadAction<AIAgent>) => {
        state.status = "succeeded";
        const index = state.aiAgents.findIndex(agent => agent._id === action.payload._id);
        if (index !== -1) {
            state.aiAgents[index] = action.payload;
        }
        if (state.selectedAgent?._id === action.payload._id) {
            state.selectedAgent = action.payload;
        }
      })
      .addCase(toggleAIAgentStatus.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload ?? "An unknown error occurred";
      })

      // Update Agent Status
      .addCase(updateAIAgentStatus.pending, (state) => { state.status = "loading"; })
      .addCase(updateAIAgentStatus.fulfilled, (state, action: PayloadAction<AIAgent>) => {
        state.status = "succeeded";
        const index = state.aiAgents.findIndex(agent => agent._id === action.payload._id);
        if (index !== -1) {
            state.aiAgents[index] = action.payload;
        }
        if (state.selectedAgent?._id === action.payload._id) {
            state.selectedAgent = action.payload;
        }
      })
      .addCase(updateAIAgentStatus.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload ?? "An unknown error occurred";
      });
  },
});

export const { clearSelectedAgent } = aiAgentSlice.actions;
export default aiAgentSlice.reducer;