import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { api } from "@/api/axios";
import { HumanAgent } from "../humanAgent/humanAgentSlice"; // Re-use the agent type

/**
 * Interface for a Channel, matching the populated backend response.
 * displayLabel: translated name for UI (en/es/bn from backend by user language).
 */
export interface Channel {
  _id: string;
  name: string;
  displayLabel?: string; // Use this for UI; name is for API/edit
  members: HumanAgent[]; // Backend populates members with agent details
  businessId: string;
}

/**
 * Interface for the state of this slice.
 */
interface ChannelState {
  channels: Channel[];
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
}

/**
 * The initial state for the channel slice.
 */
const initialState: ChannelState = {
  channels: [],
  status: "idle",
  error: null,
};

//==============================================================================
// ASYNC THUNKS (API Calls)
//==============================================================================

/**
 * Fetches all channels for the logged-in business.
 * Corresponds to: GET /api/channels
 */
export const fetchChannels = createAsyncThunk<Channel[], void, { rejectValue: string }>(
  "channel/fetchChannels",
  async (_, thunkAPI) => {
    try {
      const response = await api.get("/api/v1/channels");
      return response.data.data;
    } catch (err: any) {
      return thunkAPI.rejectWithValue(err.response?.data?.message || "Failed to fetch channels");
    }
  }
);

/**
 * Creates a new channel.
 * Corresponds to: POST /api/channels
 */
export const createChannel = createAsyncThunk<
  Channel,
  { name: string; members?: string[] }, // `members` are agent IDs
  { rejectValue: string }
>(
  "channel/createChannel",
  async (channelData, thunkAPI) => {
    try {
      const response = await api.post("/api/v1/channels", channelData);
      return response.data.data;
    } catch (err: any) {
      return thunkAPI.rejectWithValue(err.response?.data?.message || "Failed to create channel");
    }
  }
);

/**
 * Updates an existing channel's details.
 * Corresponds to: PUT /api/channels/:channelId
 */
export const updateChannel = createAsyncThunk<
  Channel,
  { channelId: string; name: string; members: string[] }, // `members` are agent IDs
  { rejectValue: string }
>(
  "channel/updateChannel",
  async ({ channelId, ...updateData }, thunkAPI) => {
    try {
      const response = await api.put(`/api/v1/channels/${channelId}`, updateData);
      return response.data.data;
    } catch (err: any) {
      return thunkAPI.rejectWithValue(err.response?.data?.message || "Failed to update channel");
    }
  }
);

/**
 * Deletes a channel.
 * Corresponds to: DELETE /api/channels/:channelId
 */
export const deleteChannel = createAsyncThunk<string, string, { rejectValue: string }>(
  "channel/deleteChannel",
  async (channelId, thunkAPI) => {
    try {
      await api.delete(`/api/v1/channels/${channelId}`);
      return channelId; // Return the ID for removal from state
    } catch (err: any) {
      return thunkAPI.rejectWithValue(err.response?.data?.message || "Failed to delete channel");
    }
  }
);

//==============================================================================
// THE SLICE
//==============================================================================
const channelSlice = createSlice({
  name: "channel",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Reducers for fetchChannels
      .addCase(fetchChannels.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchChannels.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.channels = action.payload;
      })
      .addCase(fetchChannels.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload ?? "Failed to fetch channels";
      })

      // Reducers for createChannel
      .addCase(createChannel.pending, (state) => {
        state.status = "loading";
      })
      .addCase(createChannel.fulfilled, (state) => {
        // No optimistic update. The component will refetch the complete list.
        state.status = "succeeded";
      })
      .addCase(createChannel.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload ?? "Failed to create channel";
      })

      // Reducer for updateChannel
      .addCase(updateChannel.fulfilled, (state) => {
        // No optimistic update. The component will refetch for consistency.
        state.status = "succeeded";
      })
      .addCase(updateChannel.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload ?? "Failed to update channel";
      })

      // Reducer for deleteChannel
      .addCase(deleteChannel.fulfilled, (state, action) => {
        state.channels = state.channels.filter((ch) => ch._id !== action.payload);
        state.status = "succeeded";
      })
      .addCase(deleteChannel.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload ?? "Failed to delete channel";
      });
  },
});

export default channelSlice.reducer;