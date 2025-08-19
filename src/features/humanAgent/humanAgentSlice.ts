import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { api } from "@/api/axios";

export interface HumanAgent {
  _id: string;
  name: string;
  email: string;
  role: 'agent';
  status: 'online' | 'offline';
  businessId: string;
}

interface HumanAgentState {
  agents: HumanAgent[];
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
}

const initialState: HumanAgentState = {
  agents: [],
  status: "idle",
  error: null,
};

export const fetchHumanAgents = createAsyncThunk<HumanAgent[], void, { rejectValue: string }>(
  "humanAgent/fetchHumanAgents",
  async (_, thunkAPI) => {
    try {
      const response = await api.get("/api/v1/agents");
      return response.data.data;
    } catch (err: any) {
      return thunkAPI.rejectWithValue(err.response?.data?.message || "Failed to fetch agents");
    }
  }
);

export const createHumanAgent = createAsyncThunk<HumanAgent, { name: string; email: string; password: string; channelIds: string[] }, { rejectValue: string }>(
  "humanAgent/createHumanAgent",
  async (agentData, thunkAPI) => {
    try {
      const response = await api.post("/api/v1/agents", agentData);
      return response.data.data;
    } catch (err: any) {
      return thunkAPI.rejectWithValue(err.response?.data?.message || "Failed to create agent");
    }
  }
);

export const updateHumanAgent = createAsyncThunk<HumanAgent, { agentId: string; name?: string; channelIds?: string[] }, { rejectValue: string }>(
  "humanAgent/updateHumanAgent",
  async ({ agentId, ...updateData }, thunkAPI) => {
    try {
      const response = await api.patch(`/api/v1/agents/${agentId}`, updateData);
      return response.data.data;
    } catch (err: any) {
      return thunkAPI.rejectWithValue(err.response?.data?.message || "Failed to update agent");
    }
  }
);

export const deleteHumanAgent = createAsyncThunk<string, string, { rejectValue: string }>(
  "humanAgent/deleteHumanAgent",
  async (agentId, thunkAPI) => {
    try {
      await api.delete(`/api/v1/agents/${agentId}`);
      return agentId;
    } catch (err: any) {
      return thunkAPI.rejectWithValue(err.response?.data?.message || "Failed to delete agent");
    }
  }
);

const humanAgentSlice = createSlice({
  name: "humanAgent",
  initialState,
  reducers: {
    updateAgentStatus: (state, action: PayloadAction<{ userId: string; status: 'online' | 'offline' }>) => {
      const { userId, status } = action.payload;
      const agentIndex = state.agents.findIndex(agent => agent._id === userId);
      if (agentIndex !== -1) {
        state.agents[agentIndex].status = status;
      }
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchHumanAgents.pending, (state) => { state.status = "loading"; state.error = null; })
      .addCase(fetchHumanAgents.fulfilled, (state, action) => { state.status = "succeeded"; state.agents = action.payload; })
      .addCase(fetchHumanAgents.rejected, (state, action) => { state.status = "failed"; state.error = action.payload ?? "Failed to fetch agents"; })
      
      .addCase(createHumanAgent.pending, (state) => { state.status = "loading"; })
      .addCase(createHumanAgent.fulfilled, (state) => {
        // --- THE CORE SLICE FIX ---
        // REMOVED: state.agents.push(action.payload);
        // The component will refetch the list to ensure all data is consistent.
        state.status = "succeeded";
      })
      .addCase(createHumanAgent.rejected, (state, action) => { state.status = "failed"; state.error = action.payload ?? "Failed to create agent"; })
      
      .addCase(updateHumanAgent.fulfilled, (state) => {
        // No optimistic update needed; the component refetches.
        state.status = "succeeded";
      })
      .addCase(updateHumanAgent.rejected, (state, action) => { state.status = "failed"; state.error = action.payload ?? "Failed to update agent"; })
      
      .addCase(deleteHumanAgent.fulfilled, (state, action) => {
        state.agents = state.agents.filter((agent) => agent._id !== action.payload);
        state.status = "succeeded";
      })
      .addCase(deleteHumanAgent.rejected, (state, action) => { state.status = "failed"; state.error = action.payload ?? "Failed to delete agent"; });
  },
});


export const { updateAgentStatus } = humanAgentSlice.actions;
export default humanAgentSlice.reducer;