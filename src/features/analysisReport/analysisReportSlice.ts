// src/features/analysisReport/analysisReportSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { api } from "@/api/axios"; // Your configured axios instance

// --- 1. INTERFACES to match your Mongoose Schema ---

// Interface for a single analyzed conversation within a report
export interface ConversationFeedback {
    conversationId: string; // Keep as string on frontend
    customerName: string;
    overallScore: number;
    scoreReasoning: string;
    improvementSuggestions: string;
}

// Interface for a full daily analysis report
export interface AnalysisReport {
    _id: string;
    businessId: string;
    reportDate: string; // Dates are typically strings in JSON
    overallAccuracyScore: number;
    positiveFeedbackSummary: string;
    criticalFeedbackSummary: string;
    suggestedKnowledgeUpdates: string;
    analyzedConversations: ConversationFeedback[];
    createdAt: string;
    updatedAt: string;
}

// Interface for the slice's state
interface AnalysisReportState {
    status: "idle" | "loading" | "succeeded" | "failed";
    error: string | null;
    reports: AnalysisReport[]; // An array to hold all fetched reports
}

// --- 2. INITIAL STATE ---

const initialState: AnalysisReportState = {
    status: "idle",
    error: null,
    reports: [],
};


// --- 3. ASYNC THUNK for fetching reports ---

/**
 * Fetches all analysis reports for a given business ID.
 * The businessId will be passed as an argument when dispatching this thunk.
 */
export const fetchAnalysisReports = createAsyncThunk<
  AnalysisReport[],        // Type of the successful return value
  string,                  // Type of the argument passed to the thunk (businessId)
  { rejectValue: string }  // Type for rejection payload
>(
  "analysisReport/fetchReports",
  async (businessId, thunkAPI) => {
    // Check if businessId is provided before making the call
    if (!businessId) {
      return thunkAPI.rejectWithValue("No Business ID provided.");
    }
    try {
      // The endpoint matches your route: /api/v1/analysis-reports/:businessId
      const response = await api.get(`/api/v1/analysis-reports/${businessId}`);
      // Assuming your sendSuccess function puts the data in a `data` property
      return response.data.data; 
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || "Failed to fetch analysis reports";
      return thunkAPI.rejectWithValue(errorMessage);
    }
  }
);


// --- 4. THE SLICE itself ---
const analysisReportSlice = createSlice({
  name: "analysisReport",
  initialState,
  reducers: {
    // You could add reducers here to clear reports on logout, etc.
    clearReports: (state) => {
        state.reports = [];
        state.status = 'idle';
        state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Cases for fetching the reports
      .addCase(fetchAnalysisReports.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchAnalysisReports.fulfilled, (state, action: PayloadAction<AnalysisReport[]>) => {
        state.status = "succeeded";
        state.reports = action.payload; // Replace existing reports with the new ones
      })
      .addCase(fetchAnalysisReports.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload ?? "An unknown error occurred while fetching reports.";
      });
  },
});

// Export any actions and the reducer
export const { clearReports } = analysisReportSlice.actions;
export default analysisReportSlice.reducer;