// src/features/aiAgent/aiAgentSlice.ts
import { createSlice, createAsyncThunk} from "@reduxjs/toolkit";
import { api } from "@/api/axios";

export interface AIAgent {
  _id?: string;
  name: string;
  aiModel: string;
  tone: "friendly" | "formal" | "neutral";
  instruction?: string;
  responseTemplates: string[];
}

interface AIAgentState {
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
  aiAgents: AIAgent[];
  selectedAgent: null | any,
  apiKey: null | any
}

const initialState: AIAgentState = {
  status: "idle",
  error: null,
  aiAgents: [],
  selectedAgent: null,
  apiKey: null
};


export const createAIAgent = createAsyncThunk<AIAgent, AIAgent, { rejectValue: string }>(
  "aiAgent/createAIAgent",
  async (payload, thunkAPI) => {
    try {
      const response = await api.post("/api/v1/ai-agent", payload);
      return response.data;
    } catch (err: any) {
      return thunkAPI.rejectWithValue(err.response?.data?.message || "Failed to create agent");
    }
  }
);

//fetch Ai agent by business id
export const fetchAiAgentsByBusinessId = createAsyncThunk<
  AIAgent[],
  void,
  { rejectValue: string }
>('aiAgent/fetchAiAgentsByBusinessId', async (_, thunkAPI) => {
  try {
    const res = await api.get('/api/v1/ai-agent/by-business'); 
    return res.data.data;
  } catch (error: any) {
    console.log(error)
    return thunkAPI.rejectWithValue(error.response?.data?.message || 'Failed to fetch AI models');
  }
});


export const fetchAIAgentById = createAsyncThunk<
  AIAgent,
  string, // ID
  { rejectValue: string }
>("aiAgent/fetchAIAgentById", async (id, thunkAPI) => {
  try {
    const res = await api.get(`/api/v1/ai-agent/${id}`);
    return res.data;
  } catch (err: any) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || "Failed to fetch agent");
  }
});


// ⚙️ Slice
const aiAgentSlice = createSlice({
  name: "aiAgent",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(createAIAgent.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(createAIAgent.fulfilled, (state) => {
        state.status = "succeeded";
        state.error = null;
      })
      .addCase(createAIAgent.rejected, (state, action: any) => {
        state.status = "failed";
        state.error = action.payload.error || "An unknown error occurred";
      })

      .addCase(fetchAiAgentsByBusinessId.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchAiAgentsByBusinessId.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.aiAgents = action.payload;
        state.error = null;
      })
      .addCase(fetchAiAgentsByBusinessId.rejected, (state, action: any) => {
        state.status = "failed";
        state.error = action.payload.error || "An unknown error occurred";
      })

      .addCase(fetchAIAgentById.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchAIAgentById.fulfilled, (state, action: any) => {
        console.log(action.payload);
        state.status = "succeeded";
        state.selectedAgent = action.payload.data.agent;
        state.apiKey = action.payload.data.apiKey;
      })
      .addCase(fetchAIAgentById.rejected, (state, action: any) => {
        state.status = "failed";
        state.error = action.payload || "An unknown error occurred";
      })
      

  },
});

export default aiAgentSlice.reducer;
