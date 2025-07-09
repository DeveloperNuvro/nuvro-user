import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { api } from "@/api/axios";


interface RecentTicket {
    _id: string;
    subject: string;
    status: 'open' | 'in-progress' | 'closed' | 'on-hold';
    createdAt: string;
}

interface RecentCustomer {
    _id: string;
    name: string;
    email?: string;
    createdAt: string;
}

interface DailyPerformanceData {
    date: string;
    score: number;
    conversationsAnalyzed: number;
}

// The main interface for the entire overview data payload
export interface BusinessOverview {
    totalCustomers: number;
    totalAgents: number;
    totalModels: number;
    totalChats: number;
    recentTickets: RecentTicket[];
    recentCustomers: RecentCustomer[];
    performanceAnalytics: {
        avgScoreLast30Days: number;
        avgScoreLast7Days: number;
        totalConversationsAnalyzed: number;
        dailyData: DailyPerformanceData[];
    };
}

interface OverviewState {
    status: "idle" | "loading" | "succeeded" | "failed";
    error: string | null;
    data: BusinessOverview | null;
}

const initialState: OverviewState = {
    status: "idle",
    error: null,
    data: null,
};

export const fetchBusinessOverview = createAsyncThunk<
  BusinessOverview,
  string,
  { rejectValue: string }
>(
  "overview/fetchBusinessOverview",
  async (businessId, thunkAPI) => {
    if (!businessId) {
      return thunkAPI.rejectWithValue("A Business ID is required to fetch the overview.");
    }
    try {
      const response = await api.get(`/api/v1/overview/${businessId}`);
      return response.data.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || "Failed to fetch business overview";
      return thunkAPI.rejectWithValue(errorMessage);
    }
  }
);

const overviewSlice = createSlice({
  name: "overview",
  initialState,
  reducers: {
    clearOverview: (state) => {
        state.data = null;
        state.status = 'idle';
        state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBusinessOverview.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchBusinessOverview.fulfilled, (state, action: PayloadAction<BusinessOverview>) => {
        state.status = "succeeded";
        state.data = action.payload;
      })
      .addCase(fetchBusinessOverview.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload ?? "An unknown error occurred while fetching the overview.";
      });
  },
});

export const { clearOverview } = overviewSlice.actions;
export default overviewSlice.reducer;